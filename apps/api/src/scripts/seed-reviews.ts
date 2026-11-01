import { createInterface } from 'node:readline';
import { createSequelize, generateId } from '@eleansphere/be-core';
import type { Sequelize } from '@eleansphere/be-core';
import { orderEntity, reviewEntity } from '@klotilda/domain';
import type { OrderItem, ReviewLocale, ReviewStatus } from '@klotilda/domain';
import { loadEnvFile, requireVariable } from '../env';

/**
 * Made-up reviews for a test shop, straight in the database the API uses (DATABASE_URL,
 * DATABASE_SSL), each on a made-up delivered order of the shop's own products:
 *
 *   pnpm --filter @klotilda/api seed:reviews                 add them (skipped when present)
 *   pnpm --filter @klotilda/api seed:reviews -- --remove     remove them and their orders
 *
 * The orders are told apart by their customers' e-mail domain, so removing touches nothing
 * real. No migrations run and no e-mail is sent. Before writing it shows the database and asks.
 */

const DEMO_EMAIL_DOMAIN = 'recenze-demo.example.com';
const ORDERS = `"${orderEntity.config.name}s"`;
const REVIEWS = `"${reviewEntity.config.name}s"`;
const YES = /^(a|ano|y|yes)$/i;
const DAY_MS = 24 * 60 * 60 * 1000;
/** The shop's products the orders are made of, the newest first. */
const PRODUCT_LIMIT = 8;

interface DemoReview {
  firstName: string;
  lastName: string;
  rating: number;
  body: string;
  locale: ReviewLocale;
  status: ReviewStatus;
  hiddenReason?: string;
  reply?: string;
  /** How long ago it was written. */
  daysAgo: number;
  /** Which of the shop's products the order held, by their position in the list read. */
  products: number[];
}

const DEMO_REVIEWS: DemoReview[] = [
  {
    firstName: 'Jana',
    lastName: 'Nováková',
    rating: 5,
    body: 'Miska je naživo ještě hezčí než na fotce, glazura se krásně leskne. Zabalené to bylo pečlivě, nic se nerozbilo.',
    locale: 'cs',
    status: 'published',
    reply: 'Moc děkuji, Jano! Ať vám dělá radost.',
    daysAgo: 3,
    products: [0],
  },
  {
    firstName: 'Petr',
    lastName: 'Svoboda',
    rating: 5,
    body: 'Kupoval jsem jako dárek pro mámu, měla obrovskou radost. Doručení rychlé, za dva dny bylo doma.',
    locale: 'cs',
    status: 'published',
    daysAgo: 9,
    products: [1, 2],
  },
  {
    firstName: 'Emma',
    lastName: 'Brown',
    rating: 4,
    body: 'Beautiful embroidery, the colours are lovely. Shipping abroad took a little longer than I hoped, but it was worth the wait.',
    locale: 'en',
    status: 'published',
    reply: 'Thank you, Emma! Sorry about the wait.',
    daysAgo: 16,
    products: [3],
  },
  {
    firstName: 'Lucie',
    lastName: 'Dvořáková',
    rating: 5,
    body: 'Linoryt visí v obýváku a každý se ptá, odkud je. Papír je krásně silný a tisk precizní.',
    locale: 'cs',
    status: 'published',
    daysAgo: 24,
    products: [4],
  },
  {
    firstName: 'Tomáš',
    lastName: 'Černý',
    rating: 3,
    body: 'Hrnek je pěkný, ale je menší, než jsem čekal. V popisu by se hodilo uvést i výšku.',
    locale: 'cs',
    status: 'published',
    reply: 'Díky za tip, rozměry k hrnkům doplním.',
    daysAgo: 38,
    products: [1],
  },
  {
    firstName: 'Martina',
    lastName: 'Horáková',
    rating: 2,
    body: 'Balík přišel o týden později, než bylo slíbeno, a nikdo mi nedal vědět. Samotná výšivka je ale pěkná.',
    locale: 'cs',
    status: 'published',
    daysAgo: 52,
    products: [3],
  },
  {
    firstName: 'Karel',
    lastName: 'Procházka',
    rating: 5,
    body: 'Všechno v pořádku, talířky jsou nádherné a každý je trochu jiný, přesně jak má být.',
    locale: 'cs',
    status: 'pending',
    daysAgo: 1,
    products: [2],
  },
  {
    firstName: 'Spam',
    lastName: 'Bot',
    rating: 1,
    body: 'Levné hodinky a kryptoměny na www.priklad-spam.cz, klikněte hned!',
    locale: 'cs',
    status: 'hidden',
    hiddenReason: 'spam',
    daysAgo: 5,
    products: [0],
  },
];

interface ShopProduct {
  id: string;
  name_cs: string;
  price: number;
}

function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/** `host:port/database`, never the password. */
function describeDatabase(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  return `${url.hostname}${url.port ? `:${url.port}` : ''}${url.pathname}`;
}

async function confirm(what: string, databaseUrl: string): Promise<void> {
  console.info(`Databáze: ${describeDatabase(databaseUrl)}`);
  const answer = await ask(`${what} Pokračovat? (ano/ne) `);
  if (!YES.test(answer)) throw new Error('Zrušeno.');
}

const demoEmail = (index: number) => `zakaznik-${index + 1}@${DEMO_EMAIL_DOMAIN}`;

async function countDemoOrders(database: Sequelize): Promise<number> {
  const [rows] = await database.query(
    `SELECT count(*)::int AS count FROM ${ORDERS} WHERE "customerEmail" LIKE $pattern`,
    { bind: { pattern: `%@${DEMO_EMAIL_DOMAIN}` } }
  );
  return (rows as { count: number }[])[0]?.count ?? 0;
}

async function readProducts(database: Sequelize): Promise<ShopProduct[]> {
  const [rows] = await database.query(
    `SELECT id, name_cs, price FROM "Products" ORDER BY active DESC, "createdAt" DESC LIMIT ${PRODUCT_LIMIT}`
  );
  const products = rows as ShopProduct[];
  if (products.length === 0) {
    throw new Error('V obchodě nejsou žádné produkty: nejdřív je přidejte (nebo seed:demo).');
  }
  return products;
}

/** The first method of each kind the shop has, as an order snapshots it. */
async function readMethods(database: Sequelize) {
  const [shipping] = await database.query(
    `SELECT code, name_cs, kind, price FROM "ShippingMethods" ORDER BY "sortOrder" LIMIT 1`
  );
  const [payment] = await database.query(
    `SELECT code, name_cs, kind, fee FROM "PaymentMethods" WHERE kind = 'bank_transfer' ORDER BY "sortOrder" LIMIT 1`
  );
  const ship = (shipping as { code: string; name_cs: string; kind: string; price: number }[])[0];
  const pay = (payment as { code: string; name_cs: string; kind: string; fee: number }[])[0];
  if (!ship || !pay) throw new Error('V obchodě chybí způsob dopravy nebo platby převodem.');
  return { ship, pay };
}

const pick = (products: ShopProduct[], index: number) => products[index % products.length];

/** The order's lines: each product once, named and priced as it is today. */
function orderItems(products: ShopProduct[], review: DemoReview): OrderItem[] {
  const chosen = new Map(
    review.products.map((index) => [pick(products, index).id, pick(products, index)])
  );
  return [...chosen.values()].map((product) => ({
    productId: product.id,
    name: product.name_cs,
    price: Number(product.price),
    quantity: 1,
  }));
}

async function addReviews(database: Sequelize, databaseUrl: string): Promise<void> {
  if ((await countDemoOrders(database)) > 0) {
    console.info('Ukázkové recenze už v databázi jsou, nic se nepřidává.');
    return;
  }
  const products = await readProducts(database);
  const { ship, pay } = await readMethods(database);
  await confirm(
    `Přidá se ${DEMO_REVIEWS.length} ukázkových doručených objednávek, každá s recenzí.`,
    databaseUrl
  );
  await database.transaction(async (transaction) => {
    for (const [index, review] of DEMO_REVIEWS.entries()) {
      const items = orderItems(products, review);
      const writtenAt = new Date(Date.now() - review.daysAgo * DAY_MS);
      const orderedAt = new Date(writtenAt.getTime() - 7 * DAY_MS);
      const orderId = generateId(orderEntity.config.prefix);
      const total =
        items.reduce((sum, item) => sum + item.price * item.quantity, 0) +
        Number(ship.price) +
        Number(pay.fee);
      await database.query(
        `INSERT INTO ${ORDERS} (id, "customerFirstName", "customerLastName", "customerEmail",
           street, city, zip, "shippingMethod", "paymentMethod", "shippingName", "shippingKind",
           "shippingPrice", "paymentName", "paymentKind", "paymentFee", items, "totalAmount",
           "variableSymbol", "paymentStatus", "orderStatus", history, "createdAt", "updatedAt")
         VALUES ($id, $firstName, $lastName, $email, 'Ukázková 1', 'Praha', '11000', $shipCode,
           $payCode, $shipName, $shipKind, $shipPrice, $payName, $payKind, $payFee, $items, $total,
           $vs, 'paid', 'delivered', '[]', $orderedAt, $writtenAt)`,
        {
          transaction,
          bind: {
            id: orderId,
            firstName: review.firstName,
            lastName: review.lastName,
            email: demoEmail(index),
            shipCode: ship.code,
            payCode: pay.code,
            shipName: ship.name_cs,
            shipKind: ship.kind,
            shipPrice: Number(ship.price),
            payName: pay.name_cs,
            payKind: pay.kind,
            payFee: Number(pay.fee),
            items: JSON.stringify(items),
            total,
            vs: String(9900000000 + index + 1),
            orderedAt,
            writtenAt,
          },
        }
      );
      await database.query(
        `INSERT INTO ${REVIEWS} (id, "orderId", rating, body, "authorName", locale, items, status,
           "hiddenReason", reply, "createdAt", "updatedAt")
         VALUES ($id, $orderId, $rating, $body, $authorName, $locale, $items, $status,
           $hiddenReason, $reply, $writtenAt, $writtenAt)`,
        {
          transaction,
          bind: {
            id: generateId(reviewEntity.config.prefix),
            orderId,
            rating: review.rating,
            body: review.body,
            authorName: `${review.firstName} ${review.lastName.charAt(0)}.`,
            locale: review.locale,
            items: JSON.stringify(items.map(({ productId, name }) => ({ productId, name }))),
            status: review.status,
            hiddenReason: review.hiddenReason ?? null,
            reply: review.reply ?? null,
            writtenAt,
          },
        }
      );
    }
  });
  console.info(
    `Přidáno ${DEMO_REVIEWS.length} recenzí. Web je ukáže po přestavění stránek (nejpozději do hodiny).`
  );
}

async function removeReviews(database: Sequelize, databaseUrl: string): Promise<void> {
  const count = await countDemoOrders(database);
  if (count === 0) {
    console.info('Žádné ukázkové recenze tu nejsou.');
    return;
  }
  await confirm(`Smaže se ${count} ukázkových objednávek i s jejich recenzemi.`, databaseUrl);
  const bind = { pattern: `%@${DEMO_EMAIL_DOMAIN}` };
  await database.transaction(async (transaction) => {
    await database.query(
      `DELETE FROM ${REVIEWS} WHERE "orderId" IN (SELECT id FROM ${ORDERS} WHERE "customerEmail" LIKE $pattern)`,
      { transaction, bind }
    );
    await database.query(`DELETE FROM ${ORDERS} WHERE "customerEmail" LIKE $pattern`, {
      transaction,
      bind,
    });
  });
  console.info('Ukázkové recenze i objednávky smazány.');
}

async function main(): Promise<void> {
  loadEnvFile();
  const databaseUrl = requireVariable(process.env, 'DATABASE_URL');
  const database = createSequelize({
    databaseUrl,
    ssl: process.env.DATABASE_SSL !== 'false',
  });
  try {
    // `pnpm seed:reviews -- --remove` may pass the `--` on.
    const [command] = process.argv.slice(2).filter((arg) => arg !== '--');
    if (command === '--remove') await removeReviews(database, databaseUrl);
    else await addReviews(database, databaseUrl);
  } finally {
    await database.close();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});

import { AuthSession, createMemorySessionStorage } from '@eleansphere/entity-core';
import {
  createServices,
  type GalleryRow,
  type ProductCategory,
  type Services,
} from '@klotilda/domain';
import { loadEnvFile, requireVariable } from '../env';
import { demoImage, type DemoPalette } from './demo-image';

/**
 * Fills a test shop with made-up products and gallery pictures, through the API like the admin
 * does (so the photos land in that API's own bucket). Reads SEED_API_URL, SEED_ADMIN_EMAIL and
 * SEED_ADMIN_PASSWORD. Safe to run again: anything whose Czech name already exists is skipped.
 */

/** The live API. Demo data never goes there. */
const PRODUCTION_API_HOSTS = ['klotilda-api-test.up.railway.app'];
const DEMO_NOTE = 'Testovací položka.';
const DEMO_NOTE_EN = 'Test item.';
const LIST_LIMIT = 100;

interface DemoProduct {
  name_cs: string;
  name_en: string;
  description_cs: string;
  description_en: string;
  price: number;
  category: ProductCategory;
  stockCount: number;
  active: boolean;
  photos: DemoPalette[];
}

interface DemoGalleryItem {
  title_cs: string;
  title_en: string;
  category: ProductCategory;
  row: GalleryRow;
  sortOrder: number;
  active: boolean;
  photo: DemoPalette;
}

const CLAY: DemoPalette = { top: [236, 226, 211], bottom: [214, 196, 170], motif: [120, 142, 168] };
const MOSS: DemoPalette = { top: [226, 232, 214], bottom: [196, 208, 178], motif: [86, 112, 66] };
const ROSE: DemoPalette = { top: [240, 214, 212], bottom: [222, 184, 180], motif: [150, 70, 78] };
const LINEN: DemoPalette = { top: [238, 233, 222], bottom: [220, 212, 196], motif: [58, 52, 46] };
const OCHRE: DemoPalette = { top: [244, 228, 196], bottom: [228, 200, 150], motif: [176, 110, 40] };
const INK: DemoPalette = { top: [222, 228, 236], bottom: [192, 202, 218], motif: [34, 48, 82] };

const PRODUCTS: DemoProduct[] = [
  {
    name_cs: 'Miska Mech',
    name_en: 'Moss bowl',
    description_cs: 'Ručně točená miska s mechově zelenou glazurou. Průměr 14 cm.',
    description_en: 'Hand-thrown bowl with a moss-green glaze. 14 cm across.',
    price: 650,
    category: 'keramika',
    stockCount: 1,
    active: true,
    photos: [MOSS, CLAY],
  },
  {
    name_cs: 'Hrnek Modrý květ',
    name_en: 'Blue flower mug',
    description_cs: 'Hrnek s malovaným květem, 300 ml. Vhodný do myčky.',
    description_en: 'Mug with a painted flower, 300 ml. Dishwasher safe.',
    price: 480,
    category: 'keramika',
    stockCount: 3,
    active: true,
    photos: [CLAY, INK, MOSS],
  },
  {
    name_cs: 'Sada talířků Lišejník',
    name_en: 'Lichen side plates',
    description_cs: 'Tři talířky, každý trochu jiný. Průměr 18 cm.',
    description_en: 'Three side plates, each a little different. 18 cm across.',
    price: 1450,
    category: 'keramika',
    stockCount: 1,
    active: true,
    photos: [OCHRE],
  },
  {
    name_cs: 'Váza Okrová',
    name_en: 'Ochre vase',
    description_cs: 'Vysoká váza s matnou okrovou glazurou.',
    description_en: 'A tall vase with a matt ochre glaze.',
    price: 1200,
    category: 'keramika',
    stockCount: 0,
    active: true,
    photos: [OCHRE, CLAY],
  },
  {
    name_cs: 'Výšivka Holub',
    name_en: 'Pigeon embroidery',
    description_cs: 'Vyšívaný obrázek v kruhu, 20 cm. Bavlna na lnu.',
    description_en: 'Embroidered picture in a hoop, 20 cm. Cotton on linen.',
    price: 1800,
    category: 'vysivka',
    stockCount: 1,
    active: true,
    photos: [LINEN, ROSE],
  },
  {
    name_cs: 'Výšivka Kávová magie',
    name_en: 'Coffee magic embroidery',
    description_cs: 'Barevná výšivka na černém plátně, 25 × 30 cm.',
    description_en: 'Colourful embroidery on black cloth, 25 × 30 cm.',
    price: 2400,
    category: 'vysivka',
    stockCount: 1,
    active: true,
    photos: [ROSE, LINEN, OCHRE],
  },
  {
    name_cs: 'Brož Kvítek',
    name_en: 'Flower brooch',
    description_cs: 'Malá vyšívaná brož se zapínáním na špendlík.',
    description_en: 'A small embroidered brooch with a pin clasp.',
    price: 350,
    category: 'vysivka',
    stockCount: 5,
    active: true,
    photos: [ROSE],
  },
  {
    name_cs: 'Linoryt Les',
    name_en: 'Forest linocut',
    description_cs: 'Tisk z linorytu, A4, ručně číslovaný, náklad 20 kusů.',
    description_en: 'Linocut print, A4, numbered by hand, edition of 20.',
    price: 890,
    category: 'linoryt',
    stockCount: 4,
    active: true,
    photos: [INK, LINEN],
  },
  {
    name_cs: 'Linoryt Kočka',
    name_en: 'Cat linocut',
    description_cs: 'Tisk z linorytu, A5, na japonském papíře.',
    description_en: 'Linocut print, A5, on Japanese paper.',
    price: 520,
    category: 'linoryt',
    stockCount: 2,
    active: true,
    photos: [LINEN],
  },
  {
    name_cs: 'Linoryt Velká ryba',
    name_en: 'Big fish linocut',
    description_cs: 'Velkoformátový tisk, A2. Zatím skrytý v e-shopu.',
    description_en: 'Large print, A2. Hidden from the shop for now.',
    price: 3200,
    category: 'linoryt',
    stockCount: 1,
    active: false,
    photos: [INK],
  },
];

const GALLERY: DemoGalleryItem[] = [
  {
    title_cs: 'Mechová miska',
    title_en: 'Moss bowl',
    category: 'keramika',
    row: 1,
    sortOrder: 0,
    active: true,
    photo: MOSS,
  },
  {
    title_cs: 'Holub',
    title_en: 'Pigeon',
    category: 'vysivka',
    row: 1,
    sortOrder: 1,
    active: true,
    photo: LINEN,
  },
  {
    title_cs: 'Les',
    title_en: 'Forest',
    category: 'linoryt',
    row: 1,
    sortOrder: 2,
    active: true,
    photo: INK,
  },
  {
    title_cs: 'Okrová váza',
    title_en: 'Ochre vase',
    category: 'keramika',
    row: 1,
    sortOrder: 3,
    active: true,
    photo: OCHRE,
  },
  {
    title_cs: 'Růžová výšivka',
    title_en: 'Pink embroidery',
    category: 'vysivka',
    row: 2,
    sortOrder: 0,
    active: true,
    photo: ROSE,
  },
  {
    title_cs: 'Talířky',
    title_en: 'Side plates',
    category: 'keramika',
    row: 2,
    sortOrder: 1,
    active: true,
    photo: CLAY,
  },
  {
    title_cs: 'Kočka',
    title_en: 'Cat',
    category: 'linoryt',
    row: 2,
    sortOrder: 2,
    active: true,
    photo: LINEN,
  },
  {
    title_cs: 'Skrytá práce',
    title_en: 'Hidden work',
    category: 'vysivka',
    row: 2,
    sortOrder: 3,
    active: false,
    photo: ROSE,
  },
];

function readApiUrl(): string {
  const url = new URL(requireVariable(process.env, 'SEED_API_URL'));
  if (PRODUCTION_API_HOSTS.includes(url.hostname)) {
    throw new Error(`${url.hostname} is the live API — demo data only goes to a test API.`);
  }
  return url.origin;
}

function png(bytes: Buffer): Blob {
  return new Blob([new Uint8Array(bytes)], { type: 'image/png' });
}

async function seedDemo(): Promise<void> {
  loadEnvFile();
  const apiUrl = readApiUrl();
  const email = requireVariable(process.env, 'SEED_ADMIN_EMAIL');
  const password = requireVariable(process.env, 'SEED_ADMIN_PASSWORD');

  const session = new AuthSession({ baseUrl: apiUrl, storage: createMemorySessionStorage() });
  const services = createServices(apiUrl, session);
  const signedIn = await services.auth.login({ email, password });
  session.start(signedIn);
  console.info(`Signed in to ${apiUrl} as ${email}`);
  try {
    await createDemoData(services);
  } finally {
    // Revoke the refresh token this run was given; a failure here changes nothing else.
    if (signedIn.refreshToken) {
      await services.auth.logout(signedIn.refreshToken).catch(() => undefined);
    }
  }
}

async function createDemoData(services: Services): Promise<void> {
  const existingProducts = new Set(
    (await services.products.getAll({ limit: LIST_LIMIT })).data.map((p) => p.name_cs)
  );
  for (const { photos, ...product } of PRODUCTS) {
    if (existingProducts.has(product.name_cs)) {
      console.info(`Product "${product.name_cs}" exists, skipped`);
      continue;
    }
    const created = await services.products.create({
      ...product,
      description_cs: `${product.description_cs} ${DEMO_NOTE}`,
      description_en: `${product.description_en} ${DEMO_NOTE_EN}`,
    });
    for (const [index, palette] of photos.entries()) {
      await services.products.uploadImage(
        created.id,
        png(demoImage(product.category, palette)),
        index
      );
    }
    console.info(`Product "${product.name_cs}" created with ${photos.length} photo(s)`);
  }

  const existingGallery = new Set(
    (await services.gallery.getAll({ limit: LIST_LIMIT })).data.map((g) => g.title_cs)
  );
  for (const { photo, ...item } of GALLERY) {
    if (existingGallery.has(item.title_cs)) {
      console.info(`Gallery item "${item.title_cs}" exists, skipped`);
      continue;
    }
    const created = await services.gallery.create(item);
    await services.gallery.uploadImage(created.id, png(demoImage(item.category, photo)), 0);
    console.info(`Gallery item "${item.title_cs}" created`);
  }
}

seedDemo().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});

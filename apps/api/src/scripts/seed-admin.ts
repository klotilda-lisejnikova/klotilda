import { createInterface } from 'node:readline';
import bcrypt from 'bcrypt';
import { createSequelize, generateId } from '@eleansphere/be-core';
import type { Sequelize } from '@eleansphere/be-core';
import { validateFields } from '@eleansphere/schema';
import { adminUserEntity } from '@klotilda/domain';
import { loadEnvFile, requireVariable } from '../env';

/**
 * Admin accounts, straight in the database the API uses (DATABASE_URL, DATABASE_SSL):
 *
 *   pnpm --filter @klotilda/api seed:admin                  create, or set a new password
 *   pnpm --filter @klotilda/api seed:admin -- --list        who can sign in
 *   pnpm --filter @klotilda/api seed:admin -- --remove <e-mail>
 *
 * The e-mail comes from SEED_ADMIN_EMAIL. The password from SEED_ADMIN_PASSWORD, or — better, so
 * it stays out of the shell history — typed at the prompt, not echoed.
 *
 * It touches only the admin table: no migrations run, so it's safe against any environment,
 * whatever version of the API runs there. Before writing it shows the database and asks.
 */

const BCRYPT_ROUNDS = 10;
const TABLE = `"${adminUserEntity.config.name}s"`;
const YES = /^(a|ano|y|yes)$/i;

function ask(question: string, hidden = false): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: Boolean(process.stdin.isTTY),
  });
  if (hidden) {
    // Print the question, then nothing for what is typed.
    const internal = rl as unknown as { _writeToOutput: (text: string) => void };
    internal._writeToOutput = (text) => {
      if (text.includes(question)) process.stdout.write(text);
    };
  }
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
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

async function listAdmins(database: Sequelize): Promise<string[]> {
  const [rows] = await database.query(`SELECT email FROM ${TABLE} ORDER BY "createdAt"`);
  return (rows as { email: string }[]).map((row) => row.email);
}

async function setAdmin(database: Sequelize, databaseUrl: string): Promise<void> {
  const email = requireVariable(process.env, 'SEED_ADMIN_EMAIL').trim();
  const fromEnv = process.env.SEED_ADMIN_PASSWORD;
  // Said out loud: a password in apps/api/.env is used without asking.
  if (fromEnv) console.info('Heslo: z proměnné SEED_ADMIN_PASSWORD (apps/api/.env nebo shell).');
  const password = fromEnv || (await ask(`Heslo pro ${email}: `, true));
  const issues = validateFields(
    adminUserEntity.config.fields,
    { email, password },
    { mode: 'create' }
  );
  if (issues.length > 0) throw new Error(`Neplatný účet: ${JSON.stringify(issues)}`);

  const exists = (await listAdmins(database)).includes(email);
  await confirm(
    exists ? `Účet ${email} existuje: nastaví se mu nové heslo.` : `Vytvoří se účet ${email}.`,
    databaseUrl
  );
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  if (exists) {
    await database.query(
      `UPDATE ${TABLE} SET password = $hash, "updatedAt" = now() WHERE email = $email`,
      {
        bind: { hash, email },
      }
    );
    // Sessions signed in with the old password end.
    await database.query(
      `DELETE FROM "RefreshTokens" WHERE "userId" IN (SELECT id FROM ${TABLE} WHERE email = $email)`,
      { bind: { email } }
    );
    console.info(`Nové heslo nastaveno: ${email}`);
  } else {
    await database.query(
      `INSERT INTO ${TABLE} (id, email, password, "createdAt", "updatedAt") VALUES ($id, $email, $hash, now(), now())`,
      { bind: { id: generateId(adminUserEntity.config.prefix), email, hash } }
    );
    console.info(`Účet vytvořen: ${email}`);
  }
}

async function removeAdmin(database: Sequelize, databaseUrl: string, email: string | undefined) {
  if (!email) throw new Error('Chybí e-mail: seed:admin -- --remove <e-mail>');
  const admins = await listAdmins(database);
  if (!admins.includes(email)) throw new Error(`Účet ${email} neexistuje.`);
  if (admins.length === 1) throw new Error('Tohle je poslední účet — nejdřív vytvořte nový.');
  await confirm(`Smaže se účet ${email} (a jeho přihlášení).`, databaseUrl);
  // Its refresh tokens go with it (ON DELETE CASCADE).
  await database.query(`DELETE FROM ${TABLE} WHERE email = $email`, { bind: { email } });
  console.info(`Účet smazán: ${email}`);
}

async function main(): Promise<void> {
  loadEnvFile();
  const databaseUrl = requireVariable(process.env, 'DATABASE_URL');
  const database = createSequelize({
    databaseUrl,
    ssl: process.env.DATABASE_SSL !== 'false',
  });
  try {
    // `pnpm seed:admin -- --list` may pass the `--` on.
    const [command, argument] = process.argv.slice(2).filter((arg) => arg !== '--');
    if (command === '--list') {
      console.info(`Databáze: ${describeDatabase(databaseUrl)}`);
      console.info((await listAdmins(database)).join('\n') || '(žádné účty)');
    } else if (command === '--remove') {
      await removeAdmin(database, databaseUrl, argument?.trim());
    } else {
      await setAdmin(database, databaseUrl);
    }
  } finally {
    await database.close();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});

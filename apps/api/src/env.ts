import { existsSync } from 'node:fs';
import type { EmailTransportConfig, S3StorageConfig } from '@eleansphere/be-core';

export type StorageSettings = { kind: 's3'; s3: S3StorageConfig } | { kind: 'memory' };

/** The shop's bank account: orders are paid by transfer to it. */
export interface BankAccount {
  iban: string;
  bic?: string;
  /** How the account is shown to customers, `192000145399/0800`; the IBAN when unset. */
  display: string;
}

export interface Environment {
  isProduction: boolean;
  port: number;
  databaseUrl: string;
  databaseSsl: boolean;
  jwtSecret: string;
  corsOrigins: string[] | '*';
  trustProxy: number | undefined;
  emailFrom: string;
  email: EmailTransportConfig;
  /** Where new orders are announced. */
  adminEmail: string | undefined;
  storage: StorageSettings;
  bankAccount: BankAccount;
}

type Variables = NodeJS.ProcessEnv;

const LOCAL_ENV_FILE = '.env';
const DEFAULT_PORT = 3001;
const DEFAULT_SMTP_PORT = 587;
const DEFAULT_EMAIL_FROM = 'Klotilda <info@klotilda.cz>';
/** Local SMTP catchers such as Mailpit accept any credentials. */
const LOCAL_SMTP_CREDENTIALS = { user: 'klotilda', pass: 'klotilda' };
const LIST_SEPARATOR = ',';
const ANY_ORIGIN = '*';

/** Loads `.env` from the working directory when present (local development). */
export function loadEnvFile(): void {
  if (existsSync(LOCAL_ENV_FILE)) process.loadEnvFile(LOCAL_ENV_FILE);
}

export function requireVariable(variables: Variables, name: string): string {
  const value = variables[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

function readList(value: string | undefined): string[] | undefined {
  const items = value
    ?.split(LIST_SEPARATOR)
    .map((item) => item.trim())
    .filter(Boolean);
  return items?.length ? items : undefined;
}

/** `CORS_ORIGINS`, else the older single `FRONTEND_URL`; any origin only outside production. */
function readCorsOrigins(variables: Variables, isProduction: boolean): string[] | '*' {
  const origins = readList(variables.CORS_ORIGINS) ?? readList(variables.FRONTEND_URL);
  if (origins) return origins;
  if (isProduction) throw new Error('Missing environment variable CORS_ORIGINS');
  return ANY_ORIGIN;
}

function readEmailTransport(variables: Variables): EmailTransportConfig {
  if (!variables.SMTP_HOST) return { kind: 'log' };
  return {
    kind: 'smtp',
    host: variables.SMTP_HOST,
    port: Number(variables.SMTP_PORT ?? DEFAULT_SMTP_PORT),
    secure: variables.SMTP_SECURE === 'true',
    auth: {
      user: variables.SMTP_USER ?? LOCAL_SMTP_CREDENTIALS.user,
      pass: variables.SMTP_PASS ?? LOCAL_SMTP_CREDENTIALS.pass,
    },
  };
}

function readStorage(variables: Variables): StorageSettings {
  if (!variables.R2_BUCKET) return { kind: 'memory' };
  return {
    kind: 's3',
    s3: {
      endpoint: requireVariable(variables, 'R2_ENDPOINT'),
      bucket: variables.R2_BUCKET,
      accessKeyId: requireVariable(variables, 'R2_ACCESS_KEY_ID'),
      secretAccessKey: requireVariable(variables, 'R2_SECRET_ACCESS_KEY'),
      publicBaseUrl: variables.R2_PUBLIC_BASE_URL,
    },
  };
}

function readBankAccount(variables: Variables): BankAccount {
  const iban = requireVariable(variables, 'BANK_ACCOUNT_IBAN');
  return {
    iban,
    bic: variables.BANK_ACCOUNT_BIC || undefined,
    display: variables.BANK_ACCOUNT_DISPLAY || iban,
  };
}

/** Production refuses to start without what orders need: e-mail, file storage, the admin inbox. */
function assertProductionReady(environment: Environment): void {
  if (!environment.isProduction) return;
  const gaps: string[] = [];
  if (environment.email.kind === 'log') gaps.push('SMTP_HOST (e-mails would only be logged)');
  if (environment.storage.kind === 'memory') gaps.push('R2_* (photos would be lost on restart)');
  if (!environment.adminEmail) gaps.push('ADMIN_EMAIL (new orders would go unannounced)');
  if (gaps.length > 0) throw new Error(`Production needs ${gaps.join(', ')}`);
}

/** Reads and checks the API's configuration. Throws on anything missing or unsafe. */
export function readEnvironment(variables: Variables = process.env): Environment {
  const isProduction = variables.NODE_ENV === 'production';
  const environment: Environment = {
    isProduction,
    port: Number(variables.PORT ?? DEFAULT_PORT),
    databaseUrl: requireVariable(variables, 'DATABASE_URL'),
    databaseSsl: variables.DATABASE_SSL !== 'false',
    jwtSecret: requireVariable(variables, 'JWT_SECRET'),
    corsOrigins: readCorsOrigins(variables, isProduction),
    trustProxy: variables.TRUST_PROXY ? Number(variables.TRUST_PROXY) : undefined,
    emailFrom: variables.FROM_EMAIL ?? DEFAULT_EMAIL_FROM,
    email: readEmailTransport(variables),
    adminEmail: variables.ADMIN_EMAIL || undefined,
    storage: readStorage(variables),
    bankAccount: readBankAccount(variables),
  };
  assertProductionReady(environment);
  return environment;
}

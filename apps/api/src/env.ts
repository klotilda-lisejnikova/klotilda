import { existsSync } from 'node:fs';
import type { EmailTransportConfig, S3StorageConfig } from '@eleansphere/be-core';
import type { WebRevalidation } from './web/revalidate-web';

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
  /** The public website, linked from the e-mails. */
  siteUrl: string;
  /** Tells the website to rebuild its cached pages after a change; unset, it catches up alone. */
  webRevalidation: WebRevalidation | undefined;
  storage: StorageSettings;
  bankAccount: BankAccount;
  /**
   * Zásilkovna's API key (the account's public 16-character key, not the API password), for
   * checking the pickup point chosen at checkout; unset, such a method can't be ordered.
   */
  packetaApiKey: string | undefined;
}

type Variables = NodeJS.ProcessEnv;

const LOCAL_ENV_FILE = '.env';
const DEFAULT_PORT = 3001;
const DEFAULT_SMTP_PORT = 587;
const DEFAULT_EMAIL_FROM = 'Klotilda <info@klotilda.cz>';
const DEFAULT_SITE_URL = 'https://www.klotilda.cz';
/** Local SMTP catchers such as Mailpit accept any credentials. */
const LOCAL_SMTP_CREDENTIALS = { user: 'klotilda', pass: 'klotilda' };
const LIST_SEPARATOR = ',';
const ANY_ORIGIN = '*';
/** HS256 wants a key at least as long as its 256-bit hash; shorter ones are guessable offline. */
const MIN_JWT_SECRET_LENGTH = 32;
const WHOLE_NUMBER = /^\d+$/;

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

/**
 * `TRUST_PROXY`: how many proxies stand in front of the API (Railway: 1). Rate limits count by the
 * client's address, which only that tells Express where to find. More than there are lets a client
 * choose its own address through `X-Forwarded-For`.
 */
function readTrustProxy(variables: Variables): number | undefined {
  const value = variables.TRUST_PROXY;
  if (!value) return undefined;
  if (!WHOLE_NUMBER.test(value)) throw new Error('TRUST_PROXY must be a whole number of proxies');
  return Number(value);
}

/** `JWT_SECRET`, at least `MIN_JWT_SECRET_LENGTH` characters in production. */
function readJwtSecret(variables: Variables, isProduction: boolean): string {
  const secret = requireVariable(variables, 'JWT_SECRET');
  if (isProduction && secret.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters long`);
  }
  return secret;
}

/** Resend (`RESEND_API_KEY`, HTTP — Railway blocks outbound SMTP), else SMTP, else only logged. */
function readEmailTransport(variables: Variables): EmailTransportConfig {
  if (variables.RESEND_API_KEY) return { kind: 'resend', apiKey: variables.RESEND_API_KEY };
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

/** `WEB_REVALIDATE_URL` (the website's `/api/revalidate`) with `WEB_REVALIDATE_SECRET`. */
function readWebRevalidation(variables: Variables): WebRevalidation | undefined {
  const url = variables.WEB_REVALIDATE_URL;
  if (!url) return undefined;
  return { url, secret: requireVariable(variables, 'WEB_REVALIDATE_SECRET') };
}

/**
 * Production refuses to start without what orders need — e-mail, file storage, the admin inbox —
 * and without the proxy count the rate limits need.
 */
function assertProductionReady(environment: Environment): void {
  if (!environment.isProduction) return;
  const gaps: string[] = [];
  if (environment.email.kind === 'log')
    gaps.push('RESEND_API_KEY or SMTP_HOST (e-mails would only be logged)');
  if (environment.storage.kind === 'memory') gaps.push('R2_* (photos would be lost on restart)');
  if (!environment.adminEmail) gaps.push('ADMIN_EMAIL (new orders would go unannounced)');
  if (!environment.trustProxy) {
    gaps.push('TRUST_PROXY of at least 1 (every customer would share one rate limit)');
  }
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
    jwtSecret: readJwtSecret(variables, isProduction),
    corsOrigins: readCorsOrigins(variables, isProduction),
    trustProxy: readTrustProxy(variables),
    emailFrom: variables.FROM_EMAIL ?? DEFAULT_EMAIL_FROM,
    email: readEmailTransport(variables),
    adminEmail: variables.ADMIN_EMAIL || undefined,
    siteUrl: variables.SITE_URL || DEFAULT_SITE_URL,
    webRevalidation: readWebRevalidation(variables),
    storage: readStorage(variables),
    bankAccount: readBankAccount(variables),
    packetaApiKey: variables.PACKETA_API_KEY || undefined,
  };
  assertProductionReady(environment);
  return environment;
}

import { describe, expect, it } from 'vitest';
import { readEnvironment } from './env';

/** What any environment needs to be read at all. */
const BASE = {
  DATABASE_URL: 'postgres://klotilda@localhost/klotilda',
  JWT_SECRET: 'a-development-secret',
  BANK_ACCOUNT_IBAN: 'CZ6508000000192000145399',
};

/** Everything production needs, so each test can take one thing away. */
const PRODUCTION = {
  ...BASE,
  NODE_ENV: 'production',
  JWT_SECRET: 'x'.repeat(32),
  TRUST_PROXY: '1',
  CORS_ORIGINS: 'https://www.klotilda.cz',
  RESEND_API_KEY: 'resend-key',
  ADMIN_EMAIL: 'artist@klotilda.test',
  R2_BUCKET: 'bucket',
  R2_ENDPOINT: 'https://r2.example',
  R2_ACCESS_KEY_ID: 'id',
  R2_SECRET_ACCESS_KEY: 'key',
};

describe('readEnvironment', () => {
  it('reads a complete production environment', () => {
    const environment = readEnvironment(PRODUCTION);
    expect(environment.isProduction).toBe(true);
    expect(environment.trustProxy).toBe(1);
  });

  it('refuses production without TRUST_PROXY', () => {
    expect(() => readEnvironment({ ...PRODUCTION, TRUST_PROXY: undefined })).toThrow('TRUST_PROXY');
  });

  it('refuses production with TRUST_PROXY=0, which trusts no proxy', () => {
    expect(() => readEnvironment({ ...PRODUCTION, TRUST_PROXY: '0' })).toThrow('TRUST_PROXY');
  });

  it('refuses a TRUST_PROXY that is not a whole number', () => {
    expect(() => readEnvironment({ ...BASE, TRUST_PROXY: 'true' })).toThrow('TRUST_PROXY');
    expect(() => readEnvironment({ ...PRODUCTION, TRUST_PROXY: '1.5' })).toThrow('TRUST_PROXY');
  });

  it('refuses a JWT_SECRET shorter than 32 characters in production', () => {
    expect(() => readEnvironment({ ...PRODUCTION, JWT_SECRET: 'x'.repeat(31) })).toThrow(
      'JWT_SECRET'
    );
  });

  it('takes a short secret and no TRUST_PROXY outside production', () => {
    const environment = readEnvironment(BASE);
    expect(environment.jwtSecret).toBe(BASE.JWT_SECRET);
    expect(environment.trustProxy).toBeUndefined();
  });
});

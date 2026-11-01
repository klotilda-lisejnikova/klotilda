import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import request from 'supertest';
import {
  createCore,
  createSequelize,
  generateId,
  MemoryEmailTransport,
  MemoryStorageAdapter,
} from '@eleansphere/be-core';
import type { CoreInstance } from '@eleansphere/be-core';
import { adminUserEntity } from '@klotilda/domain';
import { buildAppConfig } from '../app-config';
import type { AppConfigOverrides } from '../app-config';
import type { Environment } from '../env';
import type { PickupPointValidator } from '../shipping/pickup-points';

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://klotilda:klotilda@localhost:5435/klotilda';
export const ADMIN_EMAIL = 'admin@klotilda.test';
export const ARTIST_EMAIL = 'artist@klotilda.test';
export const PASSWORD = 'correct-horse-battery';
/** The eight bytes a PNG starts with: enough for an upload to count as an image. */
export const PNG_SIGNATURE = Buffer.from('89504e470d0a1a0a', 'hex');
const BCRYPT_ROUNDS = 4;

export const testEnvironment: Environment = {
  isProduction: false,
  port: 0,
  databaseUrl: TEST_DATABASE_URL,
  databaseSsl: false,
  jwtSecret: 'integration-test-secret-of-sufficient-length',
  corsOrigins: ['https://klotilda.test'],
  trustProxy: undefined,
  emailFrom: 'Klotilda <info@klotilda.test>',
  email: { kind: 'log' },
  adminEmail: ARTIST_EMAIL,
  siteUrl: 'https://klotilda.test',
  webRevalidation: undefined,
  storage: { kind: 'memory' },
  bankAccount: { iban: 'CZ6508000000192000145399', display: '192000145399/0800' },
  packetaApiKey: undefined,
};

export const bearer = (token: string) => `Bearer ${token}`;

/** The pickup point the tests choose; `TEST_PICKUP_POINTS` knows it. */
export const TEST_PICKUP_POINT_ID = '1234';

/**
 * Stands in for Zásilkovna: knows `TEST_PICKUP_POINT_ID` as a staffed point and `5678` as a Z-BOX,
 * refuses any other point.
 */
export const TEST_PICKUP_POINTS: PickupPointValidator = async (_network, pointId) => {
  if (pointId === TEST_PICKUP_POINT_ID) {
    return {
      pickupPointId: pointId,
      pickupPointName: 'Praha 1, Dlouhá 12 (Papírnictví)',
      pickupPointAddress: 'Dlouhá 12, 110 00 Praha',
      pickupPointType: 'point',
    };
  }
  if (pointId === '5678') {
    return {
      pickupPointId: pointId,
      pickupPointName: 'Z-BOX Praha 4, Budějovická',
      pickupPointAddress: 'Budějovická 1667/64, 140 00 Praha',
      pickupPointType: 'box',
    };
  }
  return { refused: true, reasons: ['NotFound'] };
};

export interface TestApp {
  core: CoreInstance;
  /** The Postgres schema holding this app's tables. */
  schema: string;
  outbox: MemoryEmailTransport;
  api: () => ReturnType<typeof request>;
  /** Creates an admin account (as `seed:admin` does) and signs it in; resolves its token. */
  signInAdmin: (email?: string) => Promise<string>;
  close: () => Promise<void>;
}

/**
 * A fresh API on a Postgres schema of its own (dropped again by `close`), migrated like
 * production, with in-memory e-mail and files, `TEST_PICKUP_POINTS` instead of Zásilkovna and
 * without rate limits.
 */
export async function startTestApp(
  overrides: Omit<AppConfigOverrides, 'schema' | 'emailTransport'> = {}
): Promise<TestApp> {
  const schema = `test_${crypto.randomBytes(6).toString('hex')}`;
  const database = createSequelize({ databaseUrl: TEST_DATABASE_URL, ssl: false });
  const outbox = new MemoryEmailTransport();
  await database.query(`CREATE SCHEMA "${schema}"`);

  const core = await createCore(
    buildAppConfig(testEnvironment, {
      storageAdapter: new MemoryStorageAdapter(),
      rateLimit: 'off',
      pickupPoints: TEST_PICKUP_POINTS,
      ...overrides,
      schema,
      emailTransport: outbox,
    })
  );

  const api = () => request(core.app);
  return {
    core,
    schema,
    outbox,
    api,
    async signInAdmin(email = ADMIN_EMAIL) {
      await core.models[adminUserEntity.config.name].create({
        id: generateId(adminUserEntity.config.prefix),
        email,
        password: await bcrypt.hash(PASSWORD, BCRYPT_ROUNDS),
      });
      const login = await api().post('/api/auth/login').send({ email, password: PASSWORD });
      if (login.status !== 200) throw new Error(`Admin login failed: ${login.status}`);
      return String(login.body.token);
    },
    async close() {
      await core.close();
      await database.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await database.close();
    },
  };
}

import { createStorageAdapter, MemoryStorageAdapter } from '@eleansphere/be-core';
import type {
  AccessDecider,
  AppConfig,
  EmailTransport,
  RateLimitConfig,
  StorageAdapter,
} from '@eleansphere/be-core';
import { toModelConfigs } from '@eleansphere/entity-core';
import {
  adminUserEntity,
  allEntities,
  categoryEntity,
  ENTITIES_WITHOUT_CRUD_ROUTES,
  FILE_REF_TYPES,
  galleryItemEntity,
  orderEntity,
  productEntity,
} from '@klotilda/domain';
import { normalizeSlug, withCategory } from './catalogue/categories';
import { CHECKOUT_RATE_LIMIT, createCheckoutPlugin } from './checkout/checkout-plugin';
import type { Environment, StorageSettings } from './env';
import { authorizeFileAccess } from './files/authorize-file-access';
import { createShopImages } from './files/shop-images';
import { createModelRegistry } from './models-registry';
import { migrations } from './migrations';

const ACCESS_TOKEN_LIFETIME = '15m';
const REFRESH_TOKEN_LIFETIME = '30d';
const CREATE_METHOD = 'POST';

/** Test and script hooks: replace infrastructure without touching the environment. */
export interface AppConfigOverrides {
  schema?: string;
  emailTransport?: EmailTransport;
  storageAdapter?: StorageAdapter;
  rateLimit?: RateLimitConfig | 'off';
}

/** Visitors see what is on offer; the signed-in admin sees everything, hidden rows too. */
const activeUnlessSignedIn: AccessDecider = (req) => (req.user ? true : { active: true });

/** Orders are placed only through `POST /api/checkout`; the admin updates and deletes them. */
const signedInExceptCreating: AccessDecider = (req) =>
  req.user !== undefined && req.method !== CREATE_METHOD;

function buildStorageAdapter(
  settings: StorageSettings,
  override: StorageAdapter | undefined
): StorageAdapter {
  if (override) return override;
  if (settings.kind === 's3') return createStorageAdapter({ s3: settings.s3 });
  return new MemoryStorageAdapter();
}

/** The whole backend, declared: models, routes, auth, e-mail, files and the checkout. */
export function buildAppConfig(
  environment: Environment,
  overrides: AppConfigOverrides = {}
): AppConfig {
  const models = createModelRegistry();
  const storageAdapter = buildStorageAdapter(environment.storage, overrides.storageAdapter);
  const productImages = createShopImages(models, storageAdapter, FILE_REF_TYPES.product);
  const galleryImages = createShopImages(models, storageAdapter, FILE_REF_TYPES.galleryItem);
  const rateLimitsOff = overrides.rateLimit === 'off';

  return {
    databaseUrl: environment.databaseUrl,
    dbSsl: environment.databaseSsl,
    schema: overrides.schema,
    syncMode: 'migrate',
    migrations,
    jwtSecret: environment.jwtSecret,
    port: environment.port,
    trustProxy: environment.trustProxy,
    cors: { origin: environment.corsOrigins },
    modelConfigs: toModelConfigs(allEntities, { custom: ENTITIES_WITHOUT_CRUD_ROUTES }),
    routes: {
      [categoryEntity.config.name]: {
        hooks: { beforeCreate: normalizeSlug, beforeUpdate: normalizeSlug },
      },
      [productEntity.config.name]: {
        access: { read: activeUnlessSignedIn },
        enrich: withCategory(models, productImages.attach),
        beforeDelete: productImages.removeWithRow,
      },
      [galleryItemEntity.config.name]: {
        access: { read: activeUnlessSignedIn },
        enrich: withCategory(models, galleryImages.attach),
        beforeDelete: galleryImages.removeWithRow,
      },
      [orderEntity.config.name]: {
        access: { write: signedInExceptCreating },
      },
    },
    plugins: [
      models.plugin,
      createCheckoutPlugin({
        registry: models,
        bankAccount: environment.bankAccount,
        adminEmail: environment.adminEmail,
        rateLimit: rateLimitsOff ? 'off' : (overrides.rateLimit ?? CHECKOUT_RATE_LIMIT),
      }),
    ],
    email: {
      from: environment.emailFrom,
      transport: overrides.emailTransport ?? environment.email,
    },
    storage: {
      adapter: storageAdapter,
      authorize: authorizeFileAccess,
    },
    auth: {
      modelName: adminUserEntity.config.name,
      expiresIn: ACCESS_TOKEN_LIFETIME,
      refreshTokens: { expiresIn: REFRESH_TOKEN_LIFETIME },
      rateLimit: overrides.rateLimit,
    },
  };
}

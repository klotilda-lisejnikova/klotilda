import { AuthService, createServiceContainer } from '@eleansphere/entity-core';
import type { AccessTokenSource } from '@eleansphere/entity-core';
import type { AdminUser } from './entities/admin-user';
import { categoryEntity } from './entities/category';
import { galleryItemEntity } from './entities/gallery-item';
import { orderEntity } from './entities/order';
import { productEntity } from './entities/product';

/** Admin accounts sign in and out; there is no registration or profile. */
export class KlotildaAuthService extends AuthService<AdminUser> {}

/**
 * Every API client, sharing one base URL and session. The website passes a token source that
 * never has a token; it only reads and places orders.
 */
export function createServices(baseUrl: string, tokenSource: AccessTokenSource) {
  return createServiceContainer(
    {
      auth: KlotildaAuthService,
      categories: categoryEntity,
      products: productEntity,
      gallery: galleryItemEntity,
      orders: orderEntity,
    },
    baseUrl,
    tokenSource
  );
}

export type Services = ReturnType<typeof createServices>;

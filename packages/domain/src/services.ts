import { AuthService, createServiceContainer } from '@eleansphere/entity-core';
import type { AccessTokenSource } from '@eleansphere/entity-core';
import type { AdminUser } from './entities/admin-user';
import { categoryEntity } from './entities/category';
import { emailTemplateEntity } from './entities/email-template';
import { galleryItemEntity } from './entities/gallery-item';
import { legalDocumentVersionEntity } from './entities/legal-document';
import { orderEntity } from './entities/order';
import { paymentMethodEntity } from './entities/payment-method';
import { productEntity } from './entities/product';
import { sellerEntity } from './entities/seller';
import { shippingMethodEntity } from './entities/shipping-method';

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
      shippingMethods: shippingMethodEntity,
      paymentMethods: paymentMethodEntity,
      emailTemplates: emailTemplateEntity,
      seller: sellerEntity,
      legalDocuments: legalDocumentVersionEntity,
    },
    baseUrl,
    tokenSource
  );
}

export type Services = ReturnType<typeof createServices>;

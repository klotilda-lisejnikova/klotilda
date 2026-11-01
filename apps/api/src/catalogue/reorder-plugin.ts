import { createVerifyToken, FILE_MODEL_NAME, HttpError } from '@eleansphere/be-core';
import type { ProjectPlugin, Sequelize, WhereOptions } from '@eleansphere/be-core';
import {
  CATEGORIES_ORDER_ROUTE,
  categoryEntity,
  FILE_REF_TYPES,
  GALLERY_ROW_ORDER_ROUTE,
  GALLERY_ROWS,
  galleryItemEntity,
  IMAGE_ROLE,
  PRODUCT_IMAGE_ORDER_ROUTE,
  productEntity,
  SHIPPING_METHODS_ORDER_ROUTE,
  shippingMethodEntity,
} from '@klotilda/domain';
import type { ReorderRequest } from '@klotilda/domain';
import { asyncHandler } from '../http/async-handler';
import type { ModelClass, ModelRegistry } from '../models-registry';

const NO_CONTENT = 204;
const BAD_REQUEST = 400;
const NOT_FOUND = 404;
const CONFLICT = 409;

/** What a reorder route saves: which rows of which model, and what a stale list is told. */
interface OrderedList {
  model: ModelClass;
  where: WhereOptions;
  /** The 409's message, shown to the admin. */
  conflict: string;
}

export interface ReorderPluginOptions {
  registry: ModelRegistry;
  jwtSecret: string;
}

/** The ids of `{ ids }`: strings, each once. */
function readReorderRequest(body: unknown): string[] {
  const { ids } = (body && typeof body === 'object' ? body : {}) as Partial<ReorderRequest>;
  const valid =
    Array.isArray(ids) &&
    ids.every((id) => typeof id === 'string') &&
    new Set(ids).size === ids.length;
  if (!valid) throw new HttpError(BAD_REQUEST, 'Expected { ids }: every id once');
  return ids;
}

/**
 * Gives each row of the list its position in `ids` as `sortOrder`, in one transaction. `ids` must
 * name every row exactly once: a list that no longer matches (one added or deleted meanwhile) is
 * refused with 409, so a stale page cannot leave a row out of the order. The rows are locked in id
 * order, so reorders of the same list running at once wait for each other instead of deadlocking;
 * `NO KEY UPDATE` leaves foreign keys pointing at them (a product's category) free meanwhile.
 */
async function saveOrder(sequelize: Sequelize, list: OrderedList, ids: string[]) {
  await sequelize.transaction(async (transaction) => {
    const rows = await list.model.findAll({
      where: list.where,
      order: [['id', 'ASC']],
      lock: transaction.LOCK.NO_KEY_UPDATE,
      transaction,
    });
    const stored = new Set(rows.map((row) => String(row.get('id'))));
    if (stored.size !== ids.length || !ids.every((id) => stored.has(id))) {
      throw new HttpError(CONFLICT, list.conflict);
    }
    for (const row of rows) {
      await row.update({ sortOrder: ids.indexOf(String(row.get('id'))) }, { transaction });
    }
  });
}

/**
 * The signed-in admin's reordering, each list saved at once:
 *
 * - `PUT /api/products/:id/images/order` — a product's photos (`File.sortOrder`; the first is the
 *   main one);
 * - `PUT /api/gallery/rows/:row/order` — the pictures of one gallery row (`GalleryItem.sortOrder`);
 * - `PUT /api/categories/all/order` — every category (`Category.sortOrder`, the shop's filters);
 * - `PUT /api/shipping-methods/all/order` — every shipping method (the checkout's choices).
 */
export function createReorderPlugin({ registry, jwtSecret }: ReorderPluginOptions): ProjectPlugin {
  return {
    registerRoutes(app, sequelize) {
      app.put(
        PRODUCT_IMAGE_ORDER_ROUTE,
        createVerifyToken(jwtSecret),
        asyncHandler(async (req, res) => {
          const ids = readReorderRequest(req.body);
          const product = await registry.get(productEntity.config.name).findByPk(req.params.id);
          if (!product) throw new HttpError(NOT_FOUND, 'Product not found');
          await saveOrder(
            sequelize,
            {
              model: registry.get(FILE_MODEL_NAME),
              where: {
                refType: FILE_REF_TYPES.product,
                refId: product.get('id'),
                role: IMAGE_ROLE,
              },
              conflict: 'Fotky se mezitím změnily. Zkuste to prosím znovu.',
            },
            ids
          );
          res.status(NO_CONTENT).end();
        })
      );

      app.put(
        GALLERY_ROW_ORDER_ROUTE,
        createVerifyToken(jwtSecret),
        asyncHandler(async (req, res) => {
          const row = Number(req.params.row);
          if (!(GALLERY_ROWS as readonly number[]).includes(row)) {
            throw new HttpError(NOT_FOUND, 'No such gallery row');
          }
          const ids = readReorderRequest(req.body);
          await saveOrder(
            sequelize,
            {
              model: registry.get(galleryItemEntity.config.name),
              where: { row },
              conflict: 'Galerie se mezitím změnila. Zkuste to prosím znovu.',
            },
            ids
          );
          res.status(NO_CONTENT).end();
        })
      );

      app.put(
        CATEGORIES_ORDER_ROUTE,
        createVerifyToken(jwtSecret),
        asyncHandler(async (req, res) => {
          const ids = readReorderRequest(req.body);
          await saveOrder(
            sequelize,
            {
              model: registry.get(categoryEntity.config.name),
              where: {},
              conflict: 'Kategorie se mezitím změnily. Zkuste to prosím znovu.',
            },
            ids
          );
          res.status(NO_CONTENT).end();
        })
      );

      app.put(
        SHIPPING_METHODS_ORDER_ROUTE,
        createVerifyToken(jwtSecret),
        asyncHandler(async (req, res) => {
          const ids = readReorderRequest(req.body);
          await saveOrder(
            sequelize,
            {
              model: registry.get(shippingMethodEntity.config.name),
              where: {},
              conflict: 'Způsoby dopravy se mezitím změnily. Zkuste to prosím znovu.',
            },
            ids
          );
          res.status(NO_CONTENT).end();
        })
      );
    },
  };
}

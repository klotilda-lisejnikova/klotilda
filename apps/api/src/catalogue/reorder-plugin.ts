import { createVerifyToken, FILE_MODEL_NAME, HttpError } from '@eleansphere/be-core';
import type { ProjectPlugin, Sequelize } from '@eleansphere/be-core';
import {
  FILE_REF_TYPES,
  GALLERY_ROW_ORDER_ROUTE,
  GALLERY_ROWS,
  galleryItemEntity,
  IMAGE_ROLE,
  PRODUCT_IMAGE_ORDER_ROUTE,
  productEntity,
} from '@klotilda/domain';
import type { ReorderRequest } from '@klotilda/domain';
import { asyncHandler } from '../http/async-handler';
import type { ModelRegistry } from '../models-registry';

const NO_CONTENT = 204;
const BAD_REQUEST = 400;
const NOT_FOUND = 404;
const CONFLICT = 409;

type Transaction = Awaited<ReturnType<Sequelize['transaction']>>;
type Rows = Awaited<ReturnType<ReturnType<ModelRegistry['get']>['findAll']>>;

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
 * Gives each of the locked `rows` its position in `ids` as `sortOrder`. `ids` must name every row
 * exactly once: a list that no longer matches (one added or deleted meanwhile) is refused with
 * 409, so a stale page cannot leave a row out of the order.
 */
async function applyOrder(rows: Rows, ids: string[], conflict: string, transaction: Transaction) {
  const stored = new Set(rows.map((row) => String(row.get('id'))));
  if (stored.size !== ids.length || !ids.every((id) => stored.has(id))) {
    throw new HttpError(CONFLICT, conflict);
  }
  for (const row of rows) {
    await row.update({ sortOrder: ids.indexOf(String(row.get('id'))) }, { transaction });
  }
}

/**
 * The signed-in admin's reordering, each list saved at once in one transaction:
 *
 * - `PUT /api/products/:id/images/order` — a product's photos (`File.sortOrder`; the first is the
 *   main one);
 * - `PUT /api/gallery/rows/:row/order` — the pictures of one gallery row (`GalleryItem.sortOrder`).
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

          await sequelize.transaction(async (transaction) => {
            const photos = await registry.get(FILE_MODEL_NAME).findAll({
              where: {
                refType: FILE_REF_TYPES.product,
                refId: product.get('id'),
                role: IMAGE_ROLE,
              },
              lock: transaction.LOCK.UPDATE,
              transaction,
            });
            await applyOrder(
              photos,
              ids,
              'Fotky se mezitím změnily. Načtěte stránku znovu.',
              transaction
            );
          });
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

          await sequelize.transaction(async (transaction) => {
            const pictures = await registry.get(galleryItemEntity.config.name).findAll({
              where: { row },
              lock: transaction.LOCK.UPDATE,
              transaction,
            });
            await applyOrder(
              pictures,
              ids,
              'Galerie se mezitím změnila. Načtěte stránku znovu.',
              transaction
            );
          });
          res.status(NO_CONTENT).end();
        })
      );
    },
  };
}

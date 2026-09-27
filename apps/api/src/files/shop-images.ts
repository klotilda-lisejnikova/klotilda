import { attachFiles, FILE_MODEL_NAME, removeStoredFile } from '@eleansphere/be-core';
import type { ModelRouteOverrides, StorageAdapter } from '@eleansphere/be-core';
import { IMAGE_ROLE } from '@klotilda/domain';
import type { ModelRegistry } from '../models-registry';

type Enrich = NonNullable<ModelRouteOverrides['enrich']>;
type BeforeDelete = NonNullable<ModelRouteOverrides['beforeDelete']>;

const IMAGES_KEY = 'images';

export interface ShopImages {
  /** `routes.<model>.enrich`: every row the API returns carries `images`, in their order. */
  attach: Enrich;
  /** `routes.<model>.beforeDelete`: a deleted row takes its photos, bytes included. */
  removeWithRow: BeforeDelete;
}

/** The photos of one kind of row — products or gallery pictures (`refType`). */
export function createShopImages(
  registry: ModelRegistry,
  storage: StorageAdapter,
  refType: string
): ShopImages {
  return {
    attach: (rows) =>
      attachFiles(
        registry.get(FILE_MODEL_NAME),
        storage,
        refType,
        rows.map((row) => ({ id: String(row.get('id')), toJSON: () => row.toJSON() })),
        { role: IMAGE_ROLE, as: IMAGES_KEY }
      ),

    async removeWithRow(row) {
      const images = await registry.get(FILE_MODEL_NAME).findAll({
        where: { refType, refId: row.get('id') },
      });
      await Promise.all(images.map((image) => removeStoredFile(image, storage)));
    },
  };
}

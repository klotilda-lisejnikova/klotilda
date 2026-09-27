import type { CoreInstance, ProjectPlugin } from '@eleansphere/be-core';

export type ModelClass = CoreInstance['models'][string];

export interface ModelRegistry {
  /** Registers with `createCore` to receive the models once they exist. */
  plugin: ProjectPlugin;
  /** A registered model, e.g. `get('File')`. Only callable once `createCore` has finished. */
  get(name: string): ModelClass;
}

/**
 * The models `createCore` builds, for configuration callbacks that run per request — CRUD `enrich`
 * and `beforeDelete`, the file authorizer — but have to be declared before the models exist.
 */
export function createModelRegistry(): ModelRegistry {
  let models: CoreInstance['models'] | undefined;
  return {
    plugin: {
      registerRoutes: (_app, _sequelize, registeredModels) => {
        models = registeredModels;
      },
    },
    get(name) {
      const model = models?.[name];
      if (!model) throw new Error(`Model "${name}" is not registered (yet)`);
      return model;
    },
  };
}

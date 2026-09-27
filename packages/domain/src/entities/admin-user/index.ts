import { defineEntity } from '@eleansphere/entity-core';
import { adminUserFields } from './fields';

/**
 * Who signs in to the admin. Every account is an administrator; accounts are made by the
 * `seed:admin` script and have no CRUD routes.
 */
export const adminUserEntity = defineEntity({
  name: 'AdminUser',
  prefix: 'adm',
  basePath: '/api/admin-users',
  access: { read: 'auth', write: 'auth' },
  fields: adminUserFields,
});

export type AdminUser = InstanceType<typeof adminUserEntity.Dto>;

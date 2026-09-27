import type { Fields } from '@eleansphere/entity-core';

export const adminUserFields = {
  email: { type: 'STRING', required: true, unique: true, format: 'email' },
  password: { type: 'STRING', required: true, writeOnly: true, hash: 'bcrypt' },
} as const satisfies Fields;

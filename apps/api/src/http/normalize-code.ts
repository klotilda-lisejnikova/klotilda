import { ValidationError } from '@eleansphere/be-core';
import type { CrudHook } from '@eleansphere/be-core';
import { toCode } from '@klotilda/domain';

/**
 * `hooks` of the shipping and payment methods' routes: the code is stored normalized (`toCode`);
 * one with nothing usable left is refused.
 */
export const normalizeCode: CrudHook = async (data) => {
  if (data.code === undefined) return data;
  const code = toCode(String(data.code));
  if (!code) throw new ValidationError([{ path: 'code', code: 'format' }]);
  return { ...data, code };
};

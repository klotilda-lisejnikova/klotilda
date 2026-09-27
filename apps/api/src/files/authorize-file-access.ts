import type { FileAuthorizer } from '@eleansphere/be-core';
import { FILE_REF_TYPES, IMAGE_ROLE } from '@klotilda/domain';

const SHOP_REF_TYPES: readonly string[] = Object.values(FILE_REF_TYPES);

/**
 * Every account is an administrator, and they share the photos: any of them uploads and deletes
 * any product's or gallery picture's image, whoever put it there. Photos are public.
 */
export const authorizeFileAccess: FileAuthorizer = ({ action, req, file, refType, role }) => {
  if (action === 'read' && file?.visibility === 'public') return true;
  if (!req.user) return false;
  if (action === 'create')
    return refType !== null && SHOP_REF_TYPES.includes(refType) && role === IMAGE_ROLE;
  return true;
};

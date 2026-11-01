import { HttpError } from '@eleansphere/be-core';
import type { RequestHandler } from 'express';

const BAD_REQUEST = 400;

const isEmptyObject = (value: unknown) =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  Object.keys(value).length === 0;

/**
 * Global middleware: refuses a query parameter that parses to an empty object, as
 * `stockCount[__proto__]=1` does (the parser drops the key). be-core's range filter would pass the
 * empty object on to the database, which answers with an error, and the visitor with a 500.
 */
export const rejectEmptyQueryObjects: RequestHandler = (req, _res, next) => {
  const empty = Object.entries(req.query).find(([, value]) => isEmptyObject(value));
  next(empty ? new HttpError(BAD_REQUEST, `Bad query parameter "${empty[0]}"`) : undefined);
};

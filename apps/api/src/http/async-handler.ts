import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** An async route body as Express middleware: a rejection reaches the error handler. */
export function asyncHandler(body: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    body(req, res).catch(next);
  };
}

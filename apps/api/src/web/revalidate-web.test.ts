import { EventEmitter } from 'node:events';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Request, Response } from 'express';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createWebRevalidator } from './revalidate-web';

/** Longer than the revalidator's debounce. */
const QUIET_MS = 1300;
const quiet = () => new Promise((resolve) => setTimeout(resolve, QUIET_MS));

describe('Website revalidation', () => {
  const calls: (string | undefined)[] = [];
  const website = createServer((req, res) => {
    calls.push(req.headers.authorization);
    res.end('{}');
  });
  let revalidator: ReturnType<typeof createWebRevalidator>;

  beforeAll(async () => {
    await new Promise<void>((resolve) => website.listen(0, resolve));
    const { port } = website.address() as AddressInfo;
    revalidator = createWebRevalidator({
      url: `http://127.0.0.1:${port}/api/revalidate`,
      secret: 's3cret',
    });
  });

  afterAll(() => {
    website.close();
  });

  /** A request through the middleware, answered with `status`. */
  function send(method: string, path: string, status = 200) {
    const res = Object.assign(new EventEmitter(), { statusCode: status });
    revalidator({ method, path } as Request, res as unknown as Response, () => undefined);
    res.emit('finish');
  }

  it('tells the website once after a burst of changes to the catalogue', async () => {
    calls.length = 0;
    send('POST', '/api/products', 201);
    send('POST', '/api/files', 201);
    send('GET', '/api/products');
    await vi.waitFor(() => expect(calls).toHaveLength(1), { timeout: 3000 });
    await quiet();
    expect(calls).toEqual(['Bearer s3cret']);
  });

  it('ignores reads, failures and order changes that leave the stock alone', async () => {
    calls.length = 0;
    send('GET', '/api/products');
    send('POST', '/api/categories', 400);
    send('PATCH', '/api/orders/ord1');
    await quiet();
    expect(calls).toEqual([]);

    send('POST', '/api/orders/ord1/actions/cancel');
    await vi.waitFor(() => expect(calls).toHaveLength(1), { timeout: 3000 });
  });
});

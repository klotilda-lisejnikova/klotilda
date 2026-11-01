import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bearer, startTestApp, TEST_PICKUP_POINT_ID } from './test-support/test-app';
import type { TestApp } from './test-support/test-app';

const CUSTOMER = {
  customerFirstName: 'Jana',
  customerLastName: 'Nováková',
  customerEmail: 'jana@example.cz',
  street: 'Dlouhá 1',
  city: 'Praha',
  zip: '11000',
  pickupPointId: TEST_PICKUP_POINT_ID,
  paymentMethod: 'prevod',
  termsAccepted: true,
};

interface Method {
  id: string;
  code: string;
  price: number;
  active: boolean;
}

describe('Shipping methods', () => {
  let app: TestApp;
  let token: string;

  beforeAll(async () => {
    app = await startTestApp();
    token = await app.signInAdmin();
  });

  afterAll(async () => {
    await app?.close();
  });

  const asAdmin = () => ({ Authorization: bearer(token) });
  const createMethod = (body: object) =>
    app.api().post('/api/shipping-methods').set(asAdmin()).send(body);
  const listMethods = async (signedIn: boolean) => {
    const request = app.api().get('/api/shipping-methods');
    const response = signedIn ? await request.set(asAdmin()) : await request;
    return response.body.data as Method[];
  };
  const placeOrder = async (shippingMethod: string, price = 500) => {
    const product = await app
      .api()
      .post('/api/products')
      .set(asAdmin())
      .send({ name_cs: 'Mísa', price });
    return app
      .api()
      .post('/api/checkout')
      .send({ ...CUSTOMER, shippingMethod, items: [{ productId: product.body.id, quantity: 1 }] });
  };

  it('lets only the admin write, with a normalized code', async () => {
    const visitor = await app
      .api()
      .post('/api/shipping-methods')
      .send({ code: 'ppl', name_cs: 'PPL', price: 110, kind: 'delivery' });
    expect(visitor.status).toBe(401);

    const created = await createMethod({
      code: 'PPL Balík',
      name_cs: 'PPL',
      price: 110,
      kind: 'delivery',
    });
    expect(created.status).toBe(201);
    expect(created.body.code).toBe('ppl-balik');

    const empty = await createMethod({ code: '!!', name_cs: 'X', price: 1, kind: 'delivery' });
    expect(empty.status).toBe(400);
    expect(empty.body.issues).toEqual([expect.objectContaining({ path: 'code', code: 'format' })]);
    const badKind = await createMethod({ code: 'drone', name_cs: 'Dron', price: 1, kind: 'air' });
    expect(badKind.status).toBe(400);
    expect(badKind.body.issues).toEqual([expect.objectContaining({ path: 'kind', code: 'enum' })]);
    const duplicate = await createMethod({
      code: 'ppl-balik',
      name_cs: 'Znovu',
      price: 1,
      kind: 'delivery',
    });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.issues).toEqual([
      expect.objectContaining({ path: 'code', code: 'unique' }),
    ]);
  });

  it('offers visitors the active methods only; the admin sees all', async () => {
    const hidden = await createMethod({
      code: 'kuryr',
      name_cs: 'Kurýr',
      price: 300,
      kind: 'delivery',
      active: false,
    });
    expect((await listMethods(false)).map((method) => method.code)).not.toContain('kuryr');
    expect((await listMethods(true)).map((method) => method.code)).toContain('kuryr');
    expect((await app.api().get(`/api/shipping-methods/${hidden.body.id}`)).status).toBe(404);
  });

  it("charges the method's price as the admin set it, and refuses a hidden one", async () => {
    const posta = (await listMethods(true)).find((method) => method.code === 'ceska_posta')!;
    await app.api().patch(`/api/shipping-methods/${posta.id}`).set(asAdmin()).send({ price: 149 });

    const placed = await placeOrder('ceska_posta', 500);
    expect(placed.status).toBe(201);
    expect(placed.body.amount).toBe(649);
    const hidden = await placeOrder('kuryr');
    expect(hidden.status).toBe(400);
    expect(hidden.body.message).toContain('není v nabídce');

    // Renaming the method afterwards leaves the order as it was placed.
    await app
      .api()
      .patch(`/api/shipping-methods/${posta.id}`)
      .set(asAdmin())
      .send({ name_cs: 'Pošta – balík do ruky' });
    const order = await app.api().get(`/api/orders/${placed.body.orderId}`).set(asAdmin());
    expect(order.body).toMatchObject({
      shippingMethod: 'ceska_posta',
      shippingName: 'Česká pošta',
      shippingKind: 'delivery',
      shippingPrice: 149,
    });
  });

  it('decides by its kind whether a paid order is shipped or made ready', async () => {
    await createMethod({
      code: 'atelier',
      name_cs: 'Vyzvednutí v ateliéru',
      price: 0,
      kind: 'pickup',
    });
    const placed = await placeOrder('atelier');
    const act = (action: string) =>
      app
        .api()
        .post(`/api/orders/${placed.body.orderId}/actions/${action}`)
        .set(asAdmin())
        .send({ notify: false });
    await act('mark-paid');
    const shipped = await act('ship');
    expect(shipped.status).toBe(409);
    expect(shipped.body.message).toContain('nejde');
    expect((await act('ready-for-pickup')).body.orderStatus).toBe('ready');
  });

  it('reorders all methods at once, and only all of them', async () => {
    const ids = (await listMethods(true)).map((method) => method.id);
    const reversed = [...ids].reverse();
    const saved = await app
      .api()
      .put('/api/shipping-methods/all/order')
      .set(asAdmin())
      .send({ ids: reversed });
    expect(saved.status).toBe(204);
    expect((await listMethods(true)).map((method) => method.id)).toEqual(reversed);

    const partial = await app
      .api()
      .put('/api/shipping-methods/all/order')
      .set(asAdmin())
      .send({ ids: reversed.slice(1) });
    expect(partial.status).toBe(409);
    expect(partial.body.message).toContain('Způsoby dopravy se mezitím změnily');
    expect((await app.api().put('/api/shipping-methods/all/order').send({ ids })).status).toBe(401);
  });
});

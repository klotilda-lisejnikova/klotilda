import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PickupPointsUnavailable } from './shipping/pickup-points';
import { ARTIST_EMAIL, bearer, startTestApp, TEST_PICKUP_POINT_ID } from './test-support/test-app';
import type { TestApp } from './test-support/test-app';

const CUSTOMER = {
  customerFirstName: 'Jana',
  customerLastName: 'Nováková',
  customerEmail: 'jana@example.cz',
  street: 'Dlouhá 1',
  city: 'Praha',
  zip: '11000',
  shippingMethod: 'zasilkovna',
  paymentMethod: 'prevod',
  termsAccepted: true,
};
const ZBOX_ID = '5678';

describe('Pickup points', () => {
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
  const createProduct = async () =>
    (await app.api().post('/api/products').set(asAdmin()).send({ name_cs: 'Mísa', price: 500 }))
      .body.id as string;
  const stockOf = async (id: string) =>
    (await app.api().get(`/api/products/${id}`).set(asAdmin())).body.stockCount as number;
  const checkout = async (body: object, productId?: string) =>
    app
      .api()
      .post('/api/checkout')
      .send({
        ...CUSTOMER,
        items: [{ productId: productId ?? (await createProduct()), quantity: 1 }],
        ...body,
      });
  const getOrder = async (id: string) =>
    (await app.api().get(`/api/orders/${id}`).set(asAdmin())).body;
  const settle = () => new Promise((resolve) => setTimeout(resolve, 50));
  const emailsTo = (to: string, since: number) =>
    app.outbox.sent.slice(since).filter((email) => email.to === to);
  const methodByCode = async (code: string) =>
    (
      (await app.api().get('/api/shipping-methods').set(asAdmin())).body.data as {
        id: string;
        code: string;
      }[]
    ).find((method) => method.code === code)!;

  it('send Zásilkovna to a point', async () => {
    const methods = await app.api().get('/api/shipping-methods');
    expect(
      methods.body.data.map((method: { code: string; pickupNetwork: string | null }) => [
        method.code,
        method.pickupNetwork,
      ])
    ).toEqual([
      ['zasilkovna', 'packeta'],
      ['ceska_posta', null],
      ['osobni_odber', null],
    ]);
  });

  it('keep the point as the carrier describes it, not as the client sends it', async () => {
    const before = app.outbox.sent.length;
    const placed = await checkout({
      pickupPointId: TEST_PICKUP_POINT_ID,
      pickupPointName: 'Somewhere else',
      pickupPointType: 'box',
    });
    expect(placed.status).toBe(201);
    expect(await getOrder(placed.body.orderId)).toMatchObject({
      pickupPointId: TEST_PICKUP_POINT_ID,
      pickupPointName: 'Praha 1, Dlouhá 12 (Papírnictví)',
      pickupPointAddress: 'Dlouhá 12, 110 00 Praha',
      pickupPointType: 'point',
    });

    await settle();
    const [confirmation] = emailsTo(CUSTOMER.customerEmail, before);
    expect(confirmation.text).toContain('Výdejní místo');
    expect(confirmation.text).toContain(
      'Praha 1, Dlouhá 12 (Papírnictví), Dlouhá 12, 110 00 Praha'
    );
    expect(confirmation.text).not.toContain('Doručení na adresu');
    const [announcement] = emailsTo(ARTIST_EMAIL, before);
    expect(announcement.text).toContain(`ID výdejního místa`);
    expect(announcement.text).toContain(TEST_PICKUP_POINT_ID);
  });

  it('tell how to collect from a Z-BOX when the parcel is shipped', async () => {
    const placed = await checkout({ pickupPointId: ZBOX_ID });
    expect(placed.status).toBe(201);
    const { orderId } = placed.body;
    expect((await getOrder(orderId)).pickupPointType).toBe('box');

    await app.api().post(`/api/orders/${orderId}/actions/mark-paid`).set(asAdmin()).send({});
    const before = app.outbox.sent.length;
    const shipped = await app
      .api()
      .post(`/api/orders/${orderId}/actions/ship`)
      .set(asAdmin())
      .send({ trackingNumber: 'Z 123 4567 890' });
    expect(shipped.status).toBe(200);
    const [email] = emailsTo(CUSTOMER.customerEmail, before);
    expect(email.text).toContain('Z-BOX Praha 4, Budějovická');
    expect(email.text).toContain('kódem pro otevření schránky');
  });

  it('refuse a Zásilkovna order without a usable point, taking nothing from stock', async () => {
    const productId = await createProduct();
    const missing = await checkout({}, productId);
    expect(missing.status).toBe(400);
    expect(missing.body.issues).toEqual([
      expect.objectContaining({ path: 'pickupPointId', code: 'required' }),
    ]);

    const malformed = await checkout({ pickupPointId: '12; DROP' }, productId);
    expect(malformed.status).toBe(400);
    expect(malformed.body.issues).toEqual([
      expect.objectContaining({ path: 'pickupPointId', code: 'format' }),
    ]);

    const refused = await checkout({ pickupPointId: '999' }, productId);
    expect(refused.status).toBe(400);
    expect(refused.body.issues).toEqual([
      expect.objectContaining({ path: 'pickupPointId', code: 'reference' }),
    ]);
    expect(await stockOf(productId)).toBe(1);
  });

  it('ignore a point sent with a method that has none', async () => {
    const placed = await checkout({
      shippingMethod: 'ceska_posta',
      pickupPointId: TEST_PICKUP_POINT_ID,
    });
    expect(placed.status).toBe(201);
    expect(await getOrder(placed.body.orderId)).toMatchObject({
      pickupPointId: null,
      pickupPointName: null,
    });
  });

  it('follow the admin: a method gains a pickup network, a pickup never has one', async () => {
    const post = await methodByCode('ceska_posta');
    await app
      .api()
      .patch(`/api/shipping-methods/${post.id}`)
      .set(asAdmin())
      .send({ pickupNetwork: 'packeta' });
    const withoutPoint = await checkout({ shippingMethod: 'ceska_posta' });
    expect(withoutPoint.status).toBe(400);
    expect(withoutPoint.body.issues).toEqual([
      expect.objectContaining({ path: 'pickupPointId', code: 'required' }),
    ]);

    const pickup = await methodByCode('osobni_odber');
    await app
      .api()
      .patch(`/api/shipping-methods/${pickup.id}`)
      .set(asAdmin())
      .send({ pickupNetwork: 'packeta' });
    const placed = await checkout({ shippingMethod: 'osobni_odber' });
    expect(placed.status).toBe(201);
    expect((await getOrder(placed.body.orderId)).pickupPointId).toBeNull();
  });

  it('keep the point read-only, even for the admin', async () => {
    const placed = await checkout({ pickupPointId: TEST_PICKUP_POINT_ID });
    await app
      .api()
      .patch(`/api/orders/${placed.body.orderId}`)
      .set(asAdmin())
      .send({ pickupPointName: 'Elsewhere' });
    expect((await getOrder(placed.body.orderId)).pickupPointName).toBe(
      'Praha 1, Dlouhá 12 (Papírnictví)'
    );
  });
});

describe('Pickup points while Zásilkovna is unreachable', () => {
  let app: TestApp;

  beforeAll(async () => {
    app = await startTestApp({
      pickupPoints: async () => {
        throw new PickupPointsUnavailable('down');
      },
    });
  });

  afterAll(async () => {
    await app?.close();
  });

  it('refuse the order for now, and take nothing from stock', async () => {
    const token = await app.signInAdmin();
    const product = await app
      .api()
      .post('/api/products')
      .set('Authorization', bearer(token))
      .send({ name_cs: 'Mísa', price: 500 });
    const response = await app
      .api()
      .post('/api/checkout')
      .send({
        ...CUSTOMER,
        pickupPointId: TEST_PICKUP_POINT_ID,
        items: [{ productId: product.body.id, quantity: 1 }],
      });
    expect(response.status).toBe(503);
    // be-core's own words for any 5xx; the web says what it means.
    expect(response.body.message).toBe('An unexpected error occurred');
    const stock = await app
      .api()
      .get(`/api/products/${product.body.id}`)
      .set('Authorization', bearer(token));
    expect(stock.body.stockCount).toBe(1);

    // Methods without a point still sell.
    const posted = await app
      .api()
      .post('/api/checkout')
      .send({
        ...CUSTOMER,
        shippingMethod: 'ceska_posta',
        items: [{ productId: product.body.id, quantity: 1 }],
      });
    expect(posted.status).toBe(201);
  });
});

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TERMS_VERSION } from '@klotilda/domain';
import { ARTIST_EMAIL, bearer, startTestApp } from './test-support/test-app';
import type { TestApp } from './test-support/test-app';

const CUSTOMER = {
  customerFirstName: 'Jana',
  customerLastName: 'Nováková',
  customerEmail: 'jana@example.cz',
  street: 'Dlouhá 1',
  city: 'Praha',
  zip: '11000',
  shippingMethod: 'zasilkovna',
  termsAccepted: true,
};
const ZASILKOVNA_PRICE = 99;

describe('Checkout', () => {
  let app: TestApp;
  let token: string;

  beforeAll(async () => {
    app = await startTestApp();
    token = await app.signInAdmin();
  });

  afterAll(async () => {
    await app?.close();
  });

  const createProduct = async (body: object) => {
    const response = await app
      .api()
      .post('/api/products')
      .set('Authorization', bearer(token))
      .send({ name_cs: 'Mísa', price: 800, ...body });
    return response.body as { id: string };
  };
  const stockOf = async (id: string) =>
    (await app.api().get(`/api/products/${id}`).set('Authorization', bearer(token))).body
      .stockCount;
  const checkout = (body: object) =>
    app
      .api()
      .post('/api/checkout')
      .send({ ...CUSTOMER, ...body });

  it("charges the products' prices, whatever the client sends", async () => {
    const bowl = await createProduct({ price: 800, stockCount: 3 });
    const response = await checkout({
      items: [{ productId: bowl.id, quantity: 2, price: 1 }],
      totalAmount: 1,
      shippingPrice: 0,
    });
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      amount: 2 * 800 + ZASILKOVNA_PRICE,
      bankAccount: '192000145399/0800',
    });
    expect(response.body.variableSymbol).toMatch(/^[1-9]\d{9}$/);
    expect(response.body.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(await stockOf(bowl.id)).toBe(1);

    const order = await app
      .api()
      .get(`/api/orders/${response.body.orderId}`)
      .set('Authorization', bearer(token));
    expect(order.body).toMatchObject({
      totalAmount: 1699,
      shippingPrice: ZASILKOVNA_PRICE,
      paymentStatus: 'pending',
      orderStatus: 'new',
    });
    expect(JSON.parse(order.body.items)).toEqual([
      { productId: bowl.id, name: 'Mísa', price: 800, quantity: 2 },
    ]);
    expect(order.body.termsVersion).toBe(TERMS_VERSION);
    expect(new Date(order.body.termsAcceptedAt).getTime()).toBeGreaterThan(Date.now() - 60_000);
  });

  it('takes an order only with the terms agreed to', async () => {
    const bowl = await createProduct({ stockCount: 2 });
    const items = [{ productId: bowl.id, quantity: 1 }];
    for (const termsAccepted of [undefined, false, 'yes']) {
      const response = await checkout({ items, termsAccepted });
      expect(response.status).toBe(400);
      expect(response.body.issues).toEqual([
        expect.objectContaining({ path: 'termsAccepted', code: 'required' }),
      ]);
    }
    expect(await stockOf(bowl.id)).toBe(2);
  });

  it('e-mails the customer and the artist', async () => {
    const bowl = await createProduct({});
    const before = app.outbox.sent.length;
    const response = await checkout({ items: [{ productId: bowl.id, quantity: 1 }] });
    expect(response.status).toBe(201);
    await new Promise((resolve) => setTimeout(resolve, 50));
    const sent = app.outbox.sent.slice(before).map((email) => email.to);
    expect(sent).toEqual(expect.arrayContaining([CUSTOMER.customerEmail, ARTIST_EMAIL]));
  });

  it('sells the last piece only once, even to two customers at the same moment', async () => {
    const original = await createProduct({ stockCount: 1 });
    const answers = await Promise.all([
      checkout({ items: [{ productId: original.id, quantity: 1 }] }),
      checkout({ items: [{ productId: original.id, quantity: 1 }] }),
    ]);
    expect(answers.map((answer) => answer.status).sort()).toEqual([201, 409]);
    expect(await stockOf(original.id)).toBe(0);
  });

  it('changes nothing when one line of the cart fails', async () => {
    const plenty = await createProduct({ stockCount: 5 });
    const sold = await createProduct({ stockCount: 0 });
    const response = await checkout({
      items: [
        { productId: plenty.id, quantity: 1 },
        { productId: sold.id, quantity: 1 },
      ],
    });
    expect(response.status).toBe(409);
    expect(await stockOf(plenty.id)).toBe(5);
  });

  it("refuses products that aren't on offer", async () => {
    const hidden = await createProduct({ active: false });
    const missing = await checkout({ items: [{ productId: 'prod_missing', quantity: 1 }] });
    const inactive = await checkout({ items: [{ productId: hidden.id, quantity: 1 }] });
    expect(missing.status).toBe(400);
    expect(inactive.status).toBe(400);
  });

  it('merges repeated lines of the same product', async () => {
    const bowl = await createProduct({ stockCount: 2 });
    const response = await checkout({
      items: [
        { productId: bowl.id, quantity: 1 },
        { productId: bowl.id, quantity: 2 },
      ],
    });
    expect(response.status).toBe(409);
    expect(await stockOf(bowl.id)).toBe(2);
  });

  it("checks the customer's details and the cart", async () => {
    const response = await app
      .api()
      .post('/api/checkout')
      .send({
        ...CUSTOMER,
        customerEmail: 'not-an-email',
        shippingMethod: 'drone',
        items: [{ productId: 'prod_1', quantity: 0 }],
      });
    expect(response.status).toBe(400);
    expect(response.body.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'customerEmail', code: 'format' }),
        expect.objectContaining({ path: 'shippingMethod', code: 'enum' }),
        expect.objectContaining({ path: 'items.0.quantity', code: 'min' }),
      ])
    );
    expect((await checkout({ items: [] })).status).toBe(400);
  });
});

describe('Orders', () => {
  let app: TestApp;
  let token: string;
  let orderId: string;

  beforeAll(async () => {
    app = await startTestApp();
    token = await app.signInAdmin();
    const product = await app
      .api()
      .post('/api/products')
      .set('Authorization', bearer(token))
      .send({ name_cs: 'Linoryt', price: 500 });
    const placed = await app
      .api()
      .post('/api/checkout')
      .send({ ...CUSTOMER, items: [{ productId: product.body.id, quantity: 1 }] });
    orderId = placed.body.orderId;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('are for the admin only', async () => {
    expect((await app.api().get('/api/orders')).status).toBe(401);
    expect((await app.api().get(`/api/orders/${orderId}`)).status).toBe(401);
    const list = await app.api().get('/api/orders').set('Authorization', bearer(token));
    expect(list.body.data.map((order: { id: string }) => order.id)).toEqual([orderId]);
  });

  it("can't be created past the checkout", async () => {
    const response = await app
      .api()
      .post('/api/orders')
      .set('Authorization', bearer(token))
      .send({ ...CUSTOMER, items: '[]', totalAmount: 0, variableSymbol: '1' });
    expect(response.status).toBe(403);
  });

  it('let the admin move the statuses, and nothing the customer sent', async () => {
    const response = await app
      .api()
      .patch(`/api/orders/${orderId}`)
      .set('Authorization', bearer(token))
      .send({
        paymentStatus: 'paid',
        orderStatus: 'shipped',
        totalAmount: 1,
        customerEmail: 'x@y.cz',
      });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      paymentStatus: 'paid',
      orderStatus: 'shipped',
      totalAmount: 500 + ZASILKOVNA_PRICE,
      customerEmail: CUSTOMER.customerEmail,
    });

    const invalid = await app
      .api()
      .patch(`/api/orders/${orderId}`)
      .set('Authorization', bearer(token))
      .send({ orderStatus: 'lost' });
    expect(invalid.status).toBe(400);
  });

  it('filter by status', async () => {
    const paid = await app
      .api()
      .get('/api/orders')
      .query({ paymentStatus: 'paid' })
      .set('Authorization', bearer(token));
    const pending = await app
      .api()
      .get('/api/orders')
      .query({ paymentStatus: 'pending' })
      .set('Authorization', bearer(token));
    expect(paid.body.total).toBe(1);
    expect(pending.body.total).toBe(0);
  });
});

describe('Order actions', () => {
  let app: TestApp;
  let token: string;

  beforeAll(async () => {
    app = await startTestApp();
    token = await app.signInAdmin();
  });

  afterAll(async () => {
    await app?.close();
  });

  const createProduct = async (body: object) =>
    (
      await app
        .api()
        .post('/api/products')
        .set('Authorization', bearer(token))
        .send({ name_cs: 'Váza', price: 700, stockCount: 1, ...body })
    ).body as { id: string };
  const placeOrder = async (body: object = {}) => {
    const product = await createProduct({});
    const placed = await app
      .api()
      .post('/api/checkout')
      .send({ ...CUSTOMER, items: [{ productId: product.id, quantity: 1 }], ...body });
    return { orderId: placed.body.orderId as string, productId: product.id };
  };
  const act = (orderId: string, action: string, body: object = {}) =>
    app
      .api()
      .post(`/api/orders/${orderId}/actions/${action}`)
      .set('Authorization', bearer(token))
      .send(body);
  const readOrder = async (orderId: string) =>
    (await app.api().get(`/api/orders/${orderId}`).set('Authorization', bearer(token))).body;
  const emailsTo = (to: string, since: number) =>
    app.outbox.sent.slice(since).filter((email) => email.to === to);
  const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

  it('are for the signed-in admin, and only the known ones', async () => {
    const { orderId } = await placeOrder();
    expect((await app.api().post(`/api/orders/${orderId}/actions/mark-paid`)).status).toBe(401);
    expect((await act(orderId, 'teleport')).status).toBe(404);
    expect((await act('ord_missing', 'mark-paid')).status).toBe(404);
  });

  it('take a shipped order from payment to delivery, e-mailing the customer', async () => {
    const { orderId } = await placeOrder();
    await settle();
    expect((await act(orderId, 'ship')).status).toBe(409);

    const before = app.outbox.sent.length;
    const paid = await act(orderId, 'mark-paid', { message: 'Balím ještě dnes.' });
    expect(paid.status).toBe(200);
    expect(paid.body).toMatchObject({ paymentStatus: 'paid', orderStatus: 'processing' });
    const [paidEmail] = emailsTo(CUSTOMER.customerEmail, before);
    expect(paidEmail.subject).toMatch(/platba dorazila/);
    expect(paidEmail.html).toContain('Balím ještě dnes.');
    expect(paidEmail.text).toContain('> Balím ještě dnes.');

    const shipped = await act(orderId, 'ship', { trackingNumber: ' Z 123 ' });
    expect(shipped.body).toMatchObject({ orderStatus: 'shipped', trackingNumber: 'Z 123' });
    const shippedEmail = emailsTo(CUSTOMER.customerEmail, before)[1];
    expect(shippedEmail.html).toContain('https://tracking.packeta.com/cs/?id=Z%20123');

    const delivered = await act(orderId, 'mark-delivered');
    expect(delivered.body.orderStatus).toBe('delivered');
    expect(emailsTo(CUSTOMER.customerEmail, before)).toHaveLength(2);

    const history = JSON.parse((await readOrder(orderId)).history);
    expect(
      history.map((event: { type: string; email?: string }) => [event.type, event.email])
    ).toEqual([
      ['placed', 'sent'],
      ['mark-paid', 'sent'],
      ['ship', 'sent'],
      ['mark-delivered', undefined],
    ]);
    expect(history[1].message).toBe('Balím ještě dnes.');
  });

  it('hand a pickup over in person', async () => {
    const { orderId } = await placeOrder({ shippingMethod: 'osobni_odber' });
    await act(orderId, 'mark-paid');
    expect((await act(orderId, 'ship')).status).toBe(409);
    const before = app.outbox.sent.length;
    const ready = await act(orderId, 'ready-for-pickup', { message: 'Ve čtvrtek v ateliéru.' });
    expect(ready.body.orderStatus).toBe('ready');
    const [email] = emailsTo(CUSTOMER.customerEmail, before);
    expect(email.subject).toMatch(/připravená k vyzvednutí/);
    expect(email.text).toContain('Ve čtvrtek v ateliéru.');
  });

  it('put a cancelled order back in stock, and refund it', async () => {
    const { orderId, productId } = await placeOrder();
    await act(orderId, 'mark-paid');
    const before = app.outbox.sent.length;
    const cancelled = await act(orderId, 'cancel');
    expect(cancelled.body.orderStatus).toBe('cancelled');
    const product = await app
      .api()
      .get(`/api/products/${productId}`)
      .set('Authorization', bearer(token));
    expect(product.body.stockCount).toBe(1);
    expect(emailsTo(CUSTOMER.customerEmail, before)[0].text).toContain('vrátíme na účet');

    const refunded = await act(orderId, 'mark-refunded', { notify: false });
    expect(refunded.body.paymentStatus).toBe('refunded');
    expect(emailsTo(CUSTOMER.customerEmail, before)).toHaveLength(1);
    const history = JSON.parse(refunded.body.history);
    expect(history.at(-2)).toMatchObject({ type: 'cancel', restocked: true, email: 'sent' });
    expect(history.at(-1)).toMatchObject({ type: 'mark-refunded', email: 'skipped' });
    expect((await act(orderId, 'mark-refunded')).status).toBe(409);
  });

  it('can cancel without restocking', async () => {
    const { orderId, productId } = await placeOrder();
    await act(orderId, 'cancel', { restock: false, notify: false });
    const product = await app
      .api()
      .get(`/api/products/${productId}`)
      .set('Authorization', bearer(token));
    expect(product.body.stockCount).toBe(0);
    expect((await act(orderId, 'cancel', { restock: 'yes' })).status).toBe(400);
  });
});

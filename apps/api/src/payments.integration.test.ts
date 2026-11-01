import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bearer, startTestApp } from './test-support/test-app';
import type { TestApp } from './test-support/test-app';

const CUSTOMER = {
  customerFirstName: 'Jana',
  customerLastName: 'Nováková',
  customerEmail: 'jana@example.cz',
  street: 'Dlouhá 1',
  city: 'Praha',
  zip: '11000',
  termsAccepted: true,
};

interface Method {
  id: string;
  code: string;
  fee: number;
  kind: string;
  active: boolean;
}

describe('Payment methods', () => {
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
    app.api().post('/api/payment-methods').set(asAdmin()).send(body);
  const listMethods = async (signedIn: boolean) => {
    const request = app.api().get('/api/payment-methods');
    const response = signedIn ? await request.set(asAdmin()) : await request;
    return response.body.data as Method[];
  };
  const createProduct = async (price = 500) =>
    (await app.api().post('/api/products').set(asAdmin()).send({ name_cs: 'Mísa', price })).body
      .id as string;
  const placeOrder = async (shippingMethod: string, paymentMethod: string, productId?: string) =>
    app
      .api()
      .post('/api/checkout')
      .send({
        ...CUSTOMER,
        shippingMethod,
        paymentMethod,
        items: [{ productId: productId ?? (await createProduct()), quantity: 1 }],
      });
  const getOrder = async (id: string) =>
    (await app.api().get(`/api/orders/${id}`).set(asAdmin())).body;

  it('start with the bank transfer and cash at pickup', async () => {
    expect((await listMethods(false)).map((method) => [method.code, method.kind])).toEqual([
      ['prevod', 'bank_transfer'],
      ['hotove', 'cash'],
    ]);
  });

  it('let only the admin write, with a normalized code', async () => {
    const visitor = await app
      .api()
      .post('/api/payment-methods')
      .send({ code: 'karta', name_cs: 'Karta', fee: 0, kind: 'bank_transfer' });
    expect(visitor.status).toBe(401);

    const created = await createMethod({
      code: 'Převod Expres',
      name_cs: 'Expresní převod',
      fee: 30,
      kind: 'bank_transfer',
    });
    expect(created.status).toBe(201);
    expect(created.body.code).toBe('prevod-expres');

    const empty = await createMethod({ code: '!!', name_cs: 'X', fee: 0, kind: 'cash' });
    expect(empty.status).toBe(400);
    expect(empty.body.issues).toEqual([expect.objectContaining({ path: 'code', code: 'format' })]);
    const badKind = await createMethod({ code: 'karta', name_cs: 'Karta', fee: 0, kind: 'card' });
    expect(badKind.status).toBe(400);
    expect(badKind.body.issues).toEqual([expect.objectContaining({ path: 'kind', code: 'enum' })]);
    const duplicate = await createMethod({
      code: 'prevod',
      name_cs: 'Znovu',
      fee: 0,
      kind: 'bank_transfer',
    });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.issues).toEqual([
      expect.objectContaining({ path: 'code', code: 'unique' }),
    ]);
  });

  it('offer visitors the active methods only, and refuse a hidden one at checkout', async () => {
    const hidden = await createMethod({
      code: 'slozenka',
      name_cs: 'Složenka',
      fee: 0,
      kind: 'bank_transfer',
      active: false,
    });
    expect((await listMethods(false)).map((method) => method.code)).not.toContain('slozenka');
    expect((await listMethods(true)).map((method) => method.code)).toContain('slozenka');
    expect((await app.api().get(`/api/payment-methods/${hidden.body.id}`)).status).toBe(404);

    const refused = await placeOrder('zasilkovna', 'slozenka');
    expect(refused.status).toBe(400);
    expect(refused.body.message).toBe('Tento způsob platby už není v nabídce');
  });

  it("add the method's fee to the order, and keep it as it was", async () => {
    const placed = await placeOrder('zasilkovna', 'prevod-expres');
    expect(placed.status).toBe(201);
    expect(placed.body).toMatchObject({ amount: 500 + 99 + 30, paymentKind: 'bank_transfer' });
    expect(placed.body.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);

    const method = (await listMethods(true)).find((one) => one.code === 'prevod-expres')!;
    await app
      .api()
      .patch(`/api/payment-methods/${method.id}`)
      .set(asAdmin())
      .send({ name_cs: 'Převod zrychleně', fee: 50 });
    expect(await getOrder(placed.body.orderId)).toMatchObject({
      paymentMethod: 'prevod-expres',
      paymentName: 'Expresní převod',
      paymentKind: 'bank_transfer',
      paymentFee: 30,
      totalAmount: 629,
    });
  });

  it('take cash only at a pickup, without account or QR code', async () => {
    const productId = await createProduct();
    const delivered = await placeOrder('zasilkovna', 'hotove', productId);
    expect(delivered.status).toBe(400);
    expect(delivered.body.message).toBe('Tento způsob platby nejde s vybranou dopravou');
    const stock = await app.api().get(`/api/products/${productId}`).set(asAdmin());
    expect(stock.body.stockCount).toBe(1);

    const before = app.outbox.sent.length;
    const picked = await placeOrder('osobni_odber', 'hotove', productId);
    expect(picked.status).toBe(201);
    expect(picked.body).toEqual({
      orderId: expect.any(String),
      variableSymbol: expect.any(String),
      amount: 500,
      paymentKind: 'cash',
    });

    // The confirmation asks for cash at the pickup, not for a transfer.
    await new Promise((resolve) => setTimeout(resolve, 50));
    const [confirmation] = app.outbox.sent
      .slice(before)
      .filter((email) => email.to === CUSTOMER.customerEmail);
    expect(confirmation.subject).toMatch(/přijata/);
    expect(confirmation.text).toContain('Zaplatíte při převzetí: 500');
    expect(confirmation.text).not.toContain('Číslo účtu');
  });

  it('make a cash order ready before the money, and hand it over once paid', async () => {
    const placed = await placeOrder('osobni_odber', 'hotove');
    const act = (action: string) =>
      app
        .api()
        .post(`/api/orders/${placed.body.orderId}/actions/${action}`)
        .set(asAdmin())
        .send({ notify: false });

    expect((await act('ready-for-pickup')).body).toMatchObject({
      orderStatus: 'ready',
      paymentStatus: 'pending',
    });
    const early = await act('mark-delivered');
    expect(early.status).toBe(409);
    expect(early.body.message).toContain('nejde');
    expect((await act('mark-paid')).body).toMatchObject({
      orderStatus: 'ready',
      paymentStatus: 'paid',
    });
    expect((await act('mark-delivered')).body.orderStatus).toBe('delivered');
  });

  it('reorder all methods at once, and only all of them', async () => {
    const ids = (await listMethods(true)).map((method) => method.id);
    const reversed = [...ids].reverse();
    const saved = await app
      .api()
      .put('/api/payment-methods/all/order')
      .set(asAdmin())
      .send({ ids: reversed });
    expect(saved.status).toBe(204);
    expect((await listMethods(true)).map((method) => method.id)).toEqual(reversed);

    const partial = await app
      .api()
      .put('/api/payment-methods/all/order')
      .set(asAdmin())
      .send({ ids: reversed.slice(1) });
    expect(partial.status).toBe(409);
    expect(partial.body.message).toContain('Způsoby platby se mezitím změnily');
    expect((await app.api().put('/api/payment-methods/all/order').send({ ids })).status).toBe(401);
  });
});

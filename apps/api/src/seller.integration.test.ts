import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SELLER, sellerLine } from '@klotilda/domain';
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
  shippingMethod: 'zasilkovna',
  paymentMethod: 'prevod',
  termsAccepted: true,
};

describe('The seller', () => {
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
  const settle = () => new Promise((resolve) => setTimeout(resolve, 50));
  const readSeller = async () => {
    const answer = await app.api().get('/api/seller');
    expect(answer.status).toBe(200);
    expect(answer.body.data).toHaveLength(1);
    return answer.body.data[0] as { id: string; name: string; complete: boolean };
  };
  /** Places an order; answers its id and the e-mails the customer got for it. */
  const placeOrder = async () => {
    const product = await app
      .api()
      .post('/api/products')
      .set(asAdmin())
      .send({ name_cs: 'Mísa', price: 500 });
    const before = app.outbox.sent.length;
    const placed = await app
      .api()
      .post('/api/checkout')
      .send({ ...CUSTOMER, items: [{ productId: product.body.id, quantity: 1 }] });
    await settle();
    const emails = app.outbox.sent
      .slice(before)
      .filter((email) => email.to === CUSTOMER.customerEmail);
    return { orderId: placed.body.orderId as string, emails };
  };

  it('is one row anyone reads, starting from the placeholders', async () => {
    expect(await readSeller()).toMatchObject({
      name: SELLER.name,
      ico: SELLER.ico,
      address: SELLER.address,
      email: SELLER.email,
      complete: false,
    });
  });

  it('is edited by the admin only, never added or removed', async () => {
    const { id } = await readSeller();
    expect((await app.api().patch(`/api/seller/${id}`).send({ name: 'X' })).status).toBe(401);
    const created = await app
      .api()
      .post('/api/seller')
      .set(asAdmin())
      .send({ name: 'Druhá', ico: '1', address: 'A', email: 'a@example.cz' });
    expect(created.status).toBe(403);
    expect((await app.api().delete(`/api/seller/${id}`).set(asAdmin())).status).toBe(403);
    const invalid = await app
      .api()
      .patch(`/api/seller/${id}`)
      .set(asAdmin())
      .send({ email: 'not-an-e-mail' });
    expect(invalid.status).toBe(400);
    expect(JSON.stringify(invalid.body)).toContain('email');
    expect(await readSeller()).toMatchObject({ name: SELLER.name });
  });

  it('is named in every e-mail as the admin set it', async () => {
    const { id } = await readSeller();
    const edited = await app
      .api()
      .patch(`/api/seller/${id}`)
      .set(asAdmin())
      .send({ name: 'Klotilda Lisejníková', ico: '87654321', address: 'Nová 2, Brno' });
    expect(edited.status).toBe(200);
    const line = 'Prodávající: Klotilda Lisejníková, IČO 87654321, Nová 2, Brno';

    const { orderId, emails } = await placeOrder();
    expect(emails[0]?.text).toContain(line);
    expect(emails[0]?.html).toContain(line);

    const before = app.outbox.sent.length;
    await app.api().post(`/api/orders/${orderId}/actions/mark-paid`).set(asAdmin()).send({});
    await settle();
    expect(app.outbox.sent.slice(before)[0]?.text).toContain(line);

    const preview = await app
      .api()
      .post('/api/email-templates/all/preview')
      .set(asAdmin())
      .send({ key: 'ship', subject: 'X', heading: 'X' });
    expect(preview.body.text).toContain(line);
  });

  it('falls back to the defaults when the row is gone, so e-mails still name a seller', async () => {
    await app.core.models.Seller.destroy({ where: {} });
    const { emails } = await placeOrder();
    expect(emails[0]?.text).toContain(`Prodávající: ${sellerLine(SELLER)}`);
  });
});

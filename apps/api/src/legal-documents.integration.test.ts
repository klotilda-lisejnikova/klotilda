import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { formatCzechDate, legalVersionDate, nextLegalVersion, pragueDate } from '@klotilda/domain';
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
/** The version of each document the migration publishes. */
const FIRST_VERSION = '2026-11-02';
const TERMS = '/api/legal-documents/terms';
const NEW_TERMS =
  '## Nové podmínky\n\nProdávající: {{sellerName}}\n\n## Reklamace {#{{complaintsAnchor}}}';

describe('Legal documents', () => {
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
  const placeOrder = async (body: object = {}) => {
    const product = await app
      .api()
      .post('/api/products')
      .set(asAdmin())
      .send({ name_cs: 'Mísa', price: 500, stockCount: 1 });
    const placed = await app
      .api()
      .post('/api/checkout')
      .send({ ...CUSTOMER, items: [{ productId: product.body.id, quantity: 1 }], ...body });
    return { placed, productId: product.body.id as string };
  };

  it('are read by anyone: the current version, the list, one version', async () => {
    const current = await app.api().get(`${TERMS}/current`);
    expect(current.status).toBe(200);
    expect(current.body).toMatchObject({
      document: 'terms',
      version: FIRST_VERSION,
      effectiveFrom: FIRST_VERSION,
      seller: { name: 'Jméno Příjmení', ico: '12345678' },
    });
    expect(current.body.body_cs).toContain('{#{{complaintsAnchor}}}');
    expect(current.body.body_en).toEqual(expect.any(String));

    const list = await app.api().get(`${TERMS}/versions`);
    expect(list.body).toEqual([{ version: FIRST_VERSION, effectiveFrom: FIRST_VERSION }]);
    const one = await app.api().get(`${TERMS}/versions/${FIRST_VERSION}`);
    expect(one.body).toEqual(current.body);

    expect((await app.api().get(`${TERMS}/versions/2020-01-01`)).status).toBe(404);
    expect((await app.api().get('/api/legal-documents/cookies/current')).status).toBe(404);
    for (const document of ['privacy', 'withdrawal']) {
      const answer = await app.api().get(`/api/legal-documents/${document}/current`);
      expect(answer.body.version).toBe(FIRST_VERSION);
    }
  });

  it('change only through the draft: auto CRUD writes nothing, and lists only signed in', async () => {
    expect((await app.api().get('/api/legal-documents')).status).toBe(401);
    const listed = await app.api().get('/api/legal-documents').set(asAdmin());
    expect(listed.status).toBe(200);
    const published = listed.body.data[0] as { id: string };
    const patched = await app
      .api()
      .patch(`/api/legal-documents/${published.id}`)
      .set(asAdmin())
      .send({ body_cs: 'Přepsáno' });
    expect(patched.status).toBe(403);
    expect(
      (await app.api().delete(`/api/legal-documents/${published.id}`).set(asAdmin())).status
    ).toBe(403);
    const created = await app
      .api()
      .post('/api/legal-documents')
      .set(asAdmin())
      .send({ document: 'terms', body_cs: 'Nové' });
    expect(created.status).toBe(403);
    expect((await app.api().get(`${TERMS}/current`)).body.body_cs).not.toBe('Přepsáno');

    expect((await app.api().post(`${TERMS}/draft`).send({})).status).toBe(401);
    expect((await app.api().post(`${TERMS}/draft/publish`)).status).toBe(401);
    expect((await app.api().get(`${TERMS}/draft`)).status).toBe(401);
  });

  it('keep one draft per document, started from the current text', async () => {
    const [first, second] = await Promise.all([
      app.api().post(`${TERMS}/draft`).set(asAdmin()),
      app.api().post(`${TERMS}/draft`).set(asAdmin()),
    ]);
    expect([first.status, second.status].sort()).toEqual([200, 201]);
    expect(first.body.id).toBe(second.body.id);
    const current = await app.api().get(`${TERMS}/current`);
    expect(first.body).toMatchObject({ status: 'draft', body_cs: current.body.body_cs });
    expect(first.body.version ?? null).toBeNull();

    const empty = await app.api().put(`${TERMS}/draft`).set(asAdmin()).send({});
    expect(empty.status).toBe(400);
    expect(empty.body.issues).toEqual([
      expect.objectContaining({ path: 'body_cs', code: 'required' }),
    ]);
    const deleted = await app.api().delete(`${TERMS}/draft`).set(asAdmin());
    expect(deleted.status).toBe(204);
    expect((await app.api().get(`${TERMS}/draft`).set(asAdmin())).status).toBe(404);
    const gone = await app.api().put(`${TERMS}/draft`).set(asAdmin()).send({ body_cs: 'x' });
    expect(gone.status).toBe(404);
    expect(gone.body.message).toContain('Koncept neexistuje');
  });

  it('refuse to publish a text with unknown placeholders or without the complaints heading', async () => {
    await app.api().post(`${TERMS}/draft`).set(asAdmin());
    const texts = [
      ['Text {{vs}}\n\n## Reklamace {#reklamace}', 'Neznámá značka {{vs}}'],
      ['## Podmínky bez reklamací', 'Chybí nadpis s odkazem {#reklamace}'],
    ];
    for (const [body_cs, problem] of texts) {
      await app.api().put(`${TERMS}/draft`).set(asAdmin()).send({ body_cs });
      const refused = await app.api().post(`${TERMS}/draft/publish`).set(asAdmin());
      expect(refused.status).toBe(400);
      expect(refused.body.message).toContain(problem);
    }
    const english = await app
      .api()
      .put(`${TERMS}/draft`)
      .set(asAdmin())
      .send({ body_cs: NEW_TERMS, body_en: 'Terms {{sellerNam}}' });
    expect(english.status).toBe(200);
    const refused = await app.api().post(`${TERMS}/draft/publish`).set(asAdmin());
    expect(refused.status).toBe(400);
    expect(refused.body.message).toContain('{{sellerNam}}');
    expect((await app.api().get(`${TERMS}/current`)).body.version).toBe(FIRST_VERSION);
    await app.api().delete(`${TERMS}/draft`).set(asAdmin());
  });

  it('publish a draft as a frozen version, dated today in Prague, with the seller of today', async () => {
    const seller = (await app.api().get('/api/seller')).body.data[0] as { id: string };
    await app.api().patch(`/api/seller/${seller.id}`).set(asAdmin()).send({ name: 'Klotilda' });
    await app.api().post(`${TERMS}/draft`).set(asAdmin());
    await app.api().put(`${TERMS}/draft`).set(asAdmin()).send({ body_cs: NEW_TERMS, body_en: '' });

    // Two publishes at once: the first takes the draft, the second finds none.
    const answers = await Promise.all([
      app.api().post(`${TERMS}/draft/publish`).set(asAdmin()),
      app.api().post(`${TERMS}/draft/publish`).set(asAdmin()),
    ]);
    expect(answers.map((answer) => answer.status).sort()).toEqual([200, 404]);
    const published = answers.find((answer) => answer.status === 200)!;
    const version = nextLegalVersion(pragueDate(new Date()), [FIRST_VERSION]);
    expect(published.body).toMatchObject({
      version,
      effectiveFrom: legalVersionDate(version),
      body_cs: NEW_TERMS,
      body_en: null,
      seller: { name: 'Klotilda' },
    });

    // The seller's later changes leave the published version as it was.
    await app.api().patch(`/api/seller/${seller.id}`).set(asAdmin()).send({ name: 'Jiná' });
    expect((await app.api().get(`${TERMS}/current`)).body).toEqual(published.body);
    expect((await app.api().get(`${TERMS}/versions/${FIRST_VERSION}`)).body.seller.name).toBe(
      'Jméno Příjmení'
    );
    const list = await app.api().get(`${TERMS}/versions`);
    expect(list.body.map((entry: { version: string }) => entry.version)).toEqual([
      version,
      FIRST_VERSION,
    ]);
    expect((await app.api().get(`${TERMS}/draft`).set(asAdmin())).status).toBe(404);
    expect((await app.api().post(`${TERMS}/draft/publish`).set(asAdmin())).status).toBe(404);
    // The other documents keep their own versions.
    expect((await app.api().get('/api/legal-documents/privacy/current')).body.version).toBe(
      FIRST_VERSION
    );
  });

  it('let the checkout take an order only under the current terms', async () => {
    const { version } = (await app.api().get(`${TERMS}/current`)).body as { version: string };
    expect(version).not.toBe(FIRST_VERSION);

    const stale = await placeOrder({ termsVersion: FIRST_VERSION });
    expect(stale.placed.status).toBe(412);
    expect(stale.placed.body.message).toContain('Obchodní podmínky se mezitím změnily');
    const stock = await app.api().get(`/api/products/${stale.productId}`).set(asAdmin());
    expect(stock.body.stockCount).toBe(1);
    for (const termsVersion of [7, '2026-11-02.123456789012']) {
      const { placed } = await placeOrder({ termsVersion });
      expect(placed.status).toBe(400);
      expect(placed.body.issues).toEqual([expect.objectContaining({ path: 'termsVersion' })]);
    }

    const before = app.outbox.sent.length;
    for (const body of [{ termsVersion: version }, {}]) {
      const { placed } = await placeOrder(body);
      expect(placed.status).toBe(201);
      const order = await app.api().get(`/api/orders/${placed.body.orderId}`).set(asAdmin());
      expect(order.body.termsVersion).toBe(version);
    }
    await settle();
    const confirmation = app.outbox.sent
      .slice(before)
      .find((email) => email.to === CUSTOMER.customerEmail);
    expect(confirmation?.text).toContain(
      `obchodních podmínek platných od ${formatCzechDate(legalVersionDate(version))}`
    );
  });

  it('take no order while no terms are published', async () => {
    await app.core.models.LegalDocumentVersion.destroy({ where: { document: 'terms' } });
    const { placed, productId } = await placeOrder();
    // be-core answers a 5xx with a generic message; the API's own one goes to the log.
    expect(placed.status).toBe(503);
    const stock = await app.api().get(`/api/products/${productId}`).set(asAdmin());
    expect(stock.body.stockCount).toBe(1);
    expect((await app.api().get(`${TERMS}/current`)).status).toBe(404);
  });
});

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { REVIEW_LINK_LIFETIME_DAYS } from '@klotilda/domain';
import { ARTIST_EMAIL, bearer, startTestApp, testEnvironment } from './test-support/test-app';
import type { TestApp } from './test-support/test-app';
import { createReviewToken } from './reviews/review-link';

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
const REVIEW = {
  rating: 4,
  body: 'Hrnek je krásný, jen balík šel o den déle.',
  authorName: 'Jana N.',
  locale: 'cs',
  consent: true,
};
const DAY_MS = 24 * 60 * 60 * 1000;
const LINK_INVALID = 'Odkaz na recenzi neplatí nebo už vypršel.';
const NOT_DELIVERED = 'Objednávku půjde ohodnotit, až bude doručená.';
const ALREADY_REVIEWED = 'Tuhle objednávku už jste ohodnotili. Děkujeme!';
/** A refusal, by its status and its message. */
const refused = (status: number, message: string) => ({
  status,
  body: expect.objectContaining({ message }),
});
const tokenFor = (orderId: string, now = new Date()) =>
  createReviewToken(testEnvironment.jwtSecret, orderId, now);

describe('Reviews', () => {
  let app: TestApp;
  let token: string;

  beforeAll(async () => {
    app = await startTestApp();
    token = await app.signInAdmin();
  });

  afterAll(async () => {
    await app?.close();
  });

  const signedIn = () => ({ Authorization: bearer(token) });
  const settle = () => new Promise((resolve) => setTimeout(resolve, 50));
  const act = (orderId: string, action: string, body: object = {}) =>
    app.api().post(`/api/orders/${orderId}/actions/${action}`).set(signedIn()).send(body);

  /** An order for a new product, taken as far as `upTo`. */
  async function placeOrder(upTo: 'new' | 'delivered' = 'delivered') {
    const product = await app
      .api()
      .post('/api/products')
      .set(signedIn())
      .send({ name_cs: 'Hrnek', price: 500, stockCount: 1 });
    const placed = await app
      .api()
      .post('/api/checkout')
      .send({ ...CUSTOMER, items: [{ productId: product.body.id, quantity: 1 }] });
    const orderId = placed.body.orderId as string;
    await settle();
    if (upTo === 'delivered') {
      await act(orderId, 'mark-paid', { notify: false });
      await act(orderId, 'ship', { notify: false });
      await act(orderId, 'mark-delivered', { notify: false });
    }
    return { orderId, productId: product.body.id as string };
  }

  const invitation = (orderToken: string) =>
    app.api().get('/api/reviews/all/invitation').query({ token: orderToken });
  const submit = (body: object) => app.api().post('/api/reviews/all/invitation').send(body);
  const publicReviews = (query: object = {}) =>
    app.api().get('/api/reviews/all/public').query(query);

  it('invite the customer of a delivered order with a link in its e-mail', async () => {
    const { orderId } = await placeOrder('new');
    await act(orderId, 'mark-paid', { notify: false });
    await act(orderId, 'ship', { notify: false });
    const before = app.outbox.sent.length;
    await act(orderId, 'mark-delivered');
    const [email] = app.outbox.sent.slice(before);
    expect(email.to).toBe(CUSTOMER.customerEmail);
    const link = /https:\/\/klotilda\.test\/recenze\/napsat\?token=([^"&\s]+)/.exec(email.html);
    expect(link).not.toBeNull();

    const answer = await invitation(decodeURIComponent(link![1]));
    expect(answer.status).toBe(200);
    expect(answer.body).toMatchObject({
      authorName: 'Jana N.',
      items: [{ name: 'Hrnek' }],
    });
  });

  it('take one review per delivered order, through its own link only', async () => {
    const { orderId } = await placeOrder();
    const other = await placeOrder();
    expect(await invitation('nonsense')).toMatchObject(refused(404, LINK_INVALID));
    expect(await invitation(`${tokenFor(other.orderId)}x`)).toMatchObject(
      refused(404, LINK_INVALID)
    );
    const sentLongAgo = new Date(Date.now() - (REVIEW_LINK_LIFETIME_DAYS + 1) * DAY_MS);
    expect(await invitation(tokenFor(orderId, sentLongAgo))).toMatchObject(
      refused(404, LINK_INVALID)
    );

    const undelivered = await placeOrder('new');
    expect(await invitation(tokenFor(undelivered.orderId))).toMatchObject(
      refused(409, NOT_DELIVERED)
    );
    expect(await submit({ ...REVIEW, token: tokenFor(undelivered.orderId) })).toMatchObject(
      refused(409, NOT_DELIVERED)
    );

    const before = app.outbox.sent.length;
    const written = await submit({ ...REVIEW, token: tokenFor(orderId) });
    expect(written.status).toBe(201);
    expect(await submit({ ...REVIEW, token: tokenFor(orderId) })).toMatchObject(
      refused(409, ALREADY_REVIEWED)
    );
    expect(await invitation(tokenFor(orderId))).toMatchObject(refused(409, ALREADY_REVIEWED));

    await settle();
    const [notice] = app.outbox.sent.slice(before).filter((email) => email.to === ARTIST_EMAIL);
    expect(notice.subject).toMatch(/Nová recenze/);
    expect(notice.text).toContain(REVIEW.body);
  });

  it('make one review of the same link sent twice at once', async () => {
    const { orderId } = await placeOrder();
    const answers = await Promise.all([
      submit({ ...REVIEW, token: tokenFor(orderId) }),
      submit({ ...REVIEW, token: tokenFor(orderId) }),
    ]);
    expect(answers.map((answer) => answer.status).sort()).toEqual([201, 409]);
  });

  it('need stars, a text that says something, a name and the consent', async () => {
    const { orderId } = await placeOrder();
    const answer = await submit({
      token: tokenFor(orderId),
      rating: 0,
      body: '  super   ',
      authorName: ' ',
      locale: 'cs',
    });
    expect(answer.status).toBe(400);
    expect(answer.body.issues.map((issue: { path: string }) => issue.path).sort()).toEqual(
      ['authorName', 'body', 'consent', 'rating'].sort()
    );
  });

  it('show nothing until the admin publishes, and nothing that leads to the customer', async () => {
    const { orderId, productId } = await placeOrder();
    const written = await submit({ ...REVIEW, token: tokenFor(orderId) });
    const id = written.body.id as string;
    const listed = async () =>
      ((await publicReviews({ limit: 50 })).body.data as { id: string }[]).map((r) => r.id);
    expect(await listed()).not.toContain(id);

    const published = await app
      .api()
      .patch(`/api/reviews/${id}`)
      .set(signedIn())
      .send({ status: 'published', reply: 'Děkuji, Klotilda' });
    expect(published.status).toBe(200);
    const page = (await publicReviews({ productId })).body;
    expect(page).toMatchObject({ total: 1, averageRating: 4 });
    expect(page.data[0]).toEqual({
      id,
      rating: 4,
      body: REVIEW.body,
      authorName: 'Jana N.',
      locale: 'cs',
      items: [{ productId, name: 'Hrnek' }],
      reply: 'Děkuji, Klotilda',
      createdAt: expect.any(String),
    });

    // A reply cleared in the admin is no reply.
    await app.api().patch(`/api/reviews/${id}`).set(signedIn()).send({ reply: '' });
    expect((await publicReviews({ productId })).body.data[0].reply).toBeNull();

    await app.api().patch(`/api/reviews/${id}`).set(signedIn()).send({ status: 'hidden' });
    expect(await listed()).not.toContain(id);
  });

  it("keep the customer's words: the admin can't change or create one", async () => {
    const { orderId } = await placeOrder();
    const id = (await submit({ ...REVIEW, token: tokenFor(orderId) })).body.id as string;
    await app
      .api()
      .patch(`/api/reviews/${id}`)
      .set(signedIn())
      .send({ body: 'Nejlepší obchod na světě!', rating: 5 });
    const stored = (await app.api().get(`/api/reviews/${id}`).set(signedIn())).body;
    expect(stored).toMatchObject({ body: REVIEW.body, rating: 4, status: 'pending' });

    const created = await app
      .api()
      .post('/api/reviews')
      .set(signedIn())
      .send({ ...REVIEW, orderId, items: '[]' });
    expect(created.status).toBe(403);
    expect((await app.api().get('/api/reviews')).status).toBe(401);
  });

  it('keep an order with a review until its review is deleted', async () => {
    const { orderId } = await placeOrder();
    const id = (await submit({ ...REVIEW, token: tokenFor(orderId) })).body.id as string;
    const refusedDelete = await app.api().delete(`/api/orders/${orderId}`).set(signedIn());
    expect(refusedDelete).toMatchObject(
      refused(409, 'Objednávka má recenzi. Smažte nejdřív ji (v Recenzích).')
    );
    expect((await app.api().delete(`/api/reviews/${id}`).set(signedIn())).status).toBeLessThan(300);
    expect((await app.api().delete(`/api/orders/${orderId}`).set(signedIn())).status).toBeLessThan(
      300
    );
  });

  it('send the link again when the admin asks, for a delivered order without a review', async () => {
    const { orderId } = await placeOrder();
    const request = () =>
      app.api().post(`/api/orders/${orderId}/review-request`).set(signedIn()).send({});
    expect((await app.api().post(`/api/orders/${orderId}/review-request`)).status).toBe(401);

    const before = app.outbox.sent.length;
    const answer = await request();
    expect(answer.status).toBe(200);
    expect(app.outbox.sent.slice(before)[0].html).toContain('/recenze/napsat?token=');
    const history = JSON.parse(answer.body.history) as { type: string; email?: string }[];
    expect(history.at(-1)).toMatchObject({ type: 'review-request', email: 'sent' });

    await submit({ ...REVIEW, token: tokenFor(orderId) });
    expect(await request()).toMatchObject(refused(409, 'Objednávka už recenzi má.'));
    const fresh = await placeOrder('new');
    expect(
      await app.api().post(`/api/orders/${fresh.orderId}/review-request`).set(signedIn()).send({})
    ).toMatchObject(refused(409, 'O recenzi jde požádat jen u doručené objednávky.'));
  });

  it('keep both lines of two requests sent at once in the history', async () => {
    const { orderId } = await placeOrder();
    const request = () =>
      app.api().post(`/api/orders/${orderId}/review-request`).set(signedIn()).send({});
    await Promise.all([request(), request()]);
    const order = (await app.api().get(`/api/orders/${orderId}`).set(signedIn())).body;
    const types = (JSON.parse(order.history) as { type: string }[]).map((event) => event.type);
    expect(types.filter((type) => type === 'review-request')).toHaveLength(2);
  });
});

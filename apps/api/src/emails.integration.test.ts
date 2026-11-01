import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { EMAIL_TEMPLATE_KEYS, EMAIL_TEMPLATES } from '@klotilda/domain';
import { bearer, startTestApp } from './test-support/test-app';
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

interface Template {
  id: string;
  key: string;
  enabled: boolean;
  subject: string;
  heading: string;
  body: string | null;
}

describe('E-mail templates', () => {
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
  const listTemplates = async () =>
    (await app.api().get('/api/email-templates').set(asAdmin())).body.data as Template[];
  const templateOf = async (key: string) =>
    (await listTemplates()).find((template) => template.key === key)!;
  const edit = (template: Template, body: object) =>
    app.api().patch(`/api/email-templates/${template.id}`).set(asAdmin()).send(body);
  const settle = () => new Promise((resolve) => setTimeout(resolve, 50));
  const emailsTo = (to: string, since: number) =>
    app.outbox.sent.slice(since).filter((email) => email.to === to);
  const placeOrder = async () => {
    const product = await app
      .api()
      .post('/api/products')
      .set(asAdmin())
      .send({ name_cs: 'Mísa', price: 500 });
    const placed = await app
      .api()
      .post('/api/checkout')
      .send({ ...CUSTOMER, items: [{ productId: product.body.id, quantity: 1 }] });
    await settle();
    return placed.body.orderId as string;
  };
  const markPaid = (orderId: string) =>
    app.api().post(`/api/orders/${orderId}/actions/mark-paid`).set(asAdmin()).send({});

  it('start with one row per e-mail, worded as the defaults, for the admin only', async () => {
    expect((await app.api().get('/api/email-templates')).status).toBe(401);
    const templates = await listTemplates();
    expect(templates.map((template) => template.key).sort()).toEqual(
      [...EMAIL_TEMPLATE_KEYS].sort()
    );
    for (const template of templates) {
      const defaults = EMAIL_TEMPLATES[template.key as keyof typeof EMAIL_TEMPLATES];
      expect(template).toMatchObject({
        enabled: true,
        subject: defaults.subject,
        heading: defaults.heading,
        body: defaults.body,
      });
    }
  });

  it('are edited, never added or removed', async () => {
    const created = await app
      .api()
      .post('/api/email-templates')
      .set(asAdmin())
      .send({ key: 'ship', subject: 'Znovu', heading: 'Znovu' });
    expect(created.status).toBe(403);
    const cancel = await templateOf('cancel');
    const removed = await app.api().delete(`/api/email-templates/${cancel.id}`).set(asAdmin());
    expect(removed.status).toBe(403);
    expect(await listTemplates()).toHaveLength(EMAIL_TEMPLATE_KEYS.length);
  });

  it('word the e-mails as the admin set them, placeholders filled from the order', async () => {
    const paid = await templateOf('mark-paid');
    const saved = await edit(paid, {
      subject: 'Zaplaceno: {{vs}}',
      heading: 'Díky, {{jmeno}}!',
      body: 'Platba {{castka}} je u nás.\n\nOzveme se, {{neznamy}}.',
    });
    expect(saved.status).toBe(200);

    const orderId = await placeOrder();
    const before = app.outbox.sent.length;
    const order = (await markPaid(orderId)).body;
    const [email] = emailsTo(CUSTOMER.customerEmail, before);
    expect(email.subject).toBe(`Zaplaceno: ${order.variableSymbol}`);
    expect(email.text).toContain('Díky, Jana!');
    expect(email.text).toContain('Platba 599 Kč je u nás.');
    // A placeholder the e-mail doesn't know is left as written.
    expect(email.text).toContain('Ozveme se, {{neznamy}}.');
    expect(email.html).toContain('<p');
    // The parts made from the order stay.
    expect(email.text).toContain('Teď ji balíme');
    expect(email.text).toContain('Mísa');
  });

  it('send no e-mail the admin turned off, and note it as skipped', async () => {
    const paid = await templateOf('mark-paid');
    await edit(paid, { enabled: false });
    const orderId = await placeOrder();
    const before = app.outbox.sent.length;
    const order = (await markPaid(orderId)).body;
    expect(emailsTo(CUSTOMER.customerEmail, before)).toEqual([]);
    expect(JSON.parse(order.history).at(-1)).toMatchObject({ type: 'mark-paid', email: 'skipped' });
    await edit(paid, { enabled: true });
  });

  it('always confirm a new order to the customer, even when turned off', async () => {
    const received = await templateOf('order-received');
    await edit(received, { enabled: false });
    const before = app.outbox.sent.length;
    await placeOrder();
    expect(emailsTo(CUSTOMER.customerEmail, before)).toHaveLength(1);
    await edit(received, { enabled: true });
  });

  it('preview an e-mail as worded in the form, on a sample order', async () => {
    const preview = (body: object) =>
      app.api().post('/api/email-templates/all/preview').set(asAdmin()).send(body);
    const shown = await preview({
      key: 'ship',
      subject: 'Na cestě: {{vs}}',
      heading: 'Jede to',
      body: 'Balík {{cislo_zasilky}} veze {{doprava}}.',
    });
    expect(shown.status).toBe(200);
    expect(shown.body.subject).toMatch(/^Na cestě: \d{10}$/);
    expect(shown.body.text).toContain('Balík Z 1234567890 veze Zásilkovna.');
    expect(shown.body.html).toContain('Sledovat zásilku');

    const unknownKey = await preview({ key: 'teleport', subject: 'X', heading: 'X' });
    expect(unknownKey.status).toBe(400);
    expect(JSON.stringify(unknownKey.body)).toContain('key');
    const noSubject = await preview({ key: 'ship', heading: 'X' });
    expect(noSubject.status).toBe(400);
    expect(JSON.stringify(noSubject.body)).toContain('subject');
    const visitor = await app
      .api()
      .post('/api/email-templates/all/preview')
      .send({ key: 'ship', subject: 'X', heading: 'X' });
    expect(visitor.status).toBe(401);
  });
});

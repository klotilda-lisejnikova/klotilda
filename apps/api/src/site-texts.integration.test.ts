import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SITE_TEXT_KEYS, SITE_TEXTS_PATH, siteTextFor } from '@klotilda/domain';
import type { Messages, SiteText } from '@klotilda/domain';
import { bearer, startTestApp } from './test-support/test-app';
import type { TestApp } from './test-support/test-app';

/** The website's translation file for `locale`, which the rows replace messages of. */
const readMessages = (locale: string): Messages =>
  JSON.parse(
    readFileSync(new URL(`../../web/messages/${locale}.json`, import.meta.url), 'utf8')
  ) as Messages;

/** The message at `path` (`home.about.title`); undefined when there is none. */
const messageAt = (messages: Messages, path: string) =>
  path
    .split('.')
    .reduce<string | Messages | undefined>(
      (node, part) => (typeof node === 'object' ? node[part] : undefined),
      messages
    );

describe("The website's texts", () => {
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
  const readTexts = async () => {
    const answer = await app.api().get(SITE_TEXTS_PATH);
    expect(answer.status).toBe(200);
    return answer.body.data as SiteText[];
  };

  it('are one row per text, which anyone reads, seeded with what the website said', async () => {
    const texts = await readTexts();
    expect(texts.map((text) => text.key).sort()).toEqual([...SITE_TEXT_KEYS].sort());
    expect(texts.find((text) => text.key === 'home.about.title')).toMatchObject({
      text_cs: 'O mně',
      text_en: 'About',
    });
  });

  it('each replace a message of both translation files, seeded with its text', async () => {
    const texts = await readTexts();
    for (const locale of ['cs', 'en']) {
      const messages = readMessages(locale);
      for (const text of texts) {
        expect(messageAt(messages, text.key), `${locale}: ${text.key}`).toBe(
          siteTextFor(text, locale)
        );
      }
    }
  });

  it('are edited by the admin only, never added or removed', async () => {
    const [first] = await readTexts();
    const path = `${SITE_TEXTS_PATH}/${first!.id}`;
    expect((await app.api().patch(path).send({ text_cs: 'X' })).status).toBe(401);
    const edited = await app.api().patch(path).set(asAdmin()).send({ text_cs: 'Nový text' });
    expect(edited.status).toBe(200);
    expect(edited.body.text_cs).toBe('Nový text');
    const renamed = await app.api().patch(path).set(asAdmin()).send({ key: 'home.cta.title' });
    expect(renamed.body.key ?? first!.key).toBe(first!.key);

    const added = await app
      .api()
      .post(SITE_TEXTS_PATH)
      .set(asAdmin())
      .send({ key: 'home.about.title', text_cs: 'Y' });
    expect(added.status).toBe(403);
    expect((await app.api().delete(path).set(asAdmin())).status).toBe(403);
    expect(await readTexts()).toHaveLength(SITE_TEXT_KEYS.length);
  });
});

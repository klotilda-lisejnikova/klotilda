import { describe, expect, it } from 'vitest';
import { escapeMessage, instagramUrl, siteTextFor, withSiteTexts } from './index';

const FILES = {
  home: { about: { title: 'O mně', bio1: 'Ze souboru' }, contact: { email: 'a@b.cz' } },
  nav: { home: 'Domů' },
};

describe('Site texts', () => {
  it('show the English page the Czech text while it has none', () => {
    const row = (text_cs: string | null, text_en: string | null) => ({
      key: 'home.about.title',
      text_cs,
      text_en,
    });
    expect(siteTextFor(row('Ahoj', 'Hello'), 'en')).toBe('Hello');
    expect(siteTextFor(row('Ahoj', ' '), 'en')).toBe('Ahoj');
    expect(siteTextFor(row('Ahoj', 'Hello'), 'cs')).toBe('Ahoj');
    expect(siteTextFor(row(null, null), 'cs')).toBe('');
  });

  it('show an untranslated text in Czech on both pages', () => {
    const email = { key: 'home.contact.email', text_cs: 'a@c.cz', text_en: 'old@c.cz' };
    expect(siteTextFor(email, 'en')).toBe('a@c.cz');
  });

  it("lay the admin's texts over the files' messages, and only where a message is", () => {
    const texts = [
      { key: 'home.about.bio1', text_cs: 'Od adminu', text_en: null },
      { key: 'home.contact.email', text_cs: 'x@y.cz', text_en: null },
      { key: 'home.about.bio1.deeper', text_cs: 'nic', text_en: null },
      { key: 'home.missing.title', text_cs: 'nic', text_en: null },
    ];
    const messages = withSiteTexts(FILES, texts, 'cs');
    expect(messages).toEqual({
      home: { about: { title: 'O mně', bio1: 'Od adminu' }, contact: { email: 'x@y.cz' } },
      nav: { home: 'Domů' },
    });
    expect(FILES.home.about.bio1).toBe('Ze souboru');
  });

  it('keep what the admin types literal for the message formatter', () => {
    expect(escapeMessage("Píšu {jméno} <b>tučně</b>, it's")).toBe(
      "Píšu '{'jméno'}' '<'b>tučně'<'/b>, it''s"
    );
    expect(escapeMessage('<<{}>>')).toBe("'<<{}'>>");
    expect(escapeMessage('a > b')).toBe('a > b');
    expect(escapeMessage("}'<")).toBe("'}''<'");
    expect(escapeMessage("x'{")).toBe("x'''{'");
    const laid = withSiteTexts(
      FILES,
      [{ key: 'home.about.title', text_cs: '{x}', text_en: null }],
      'cs'
    );
    expect(laid).toMatchObject({ home: { about: { title: "'{'x'}'" } } });
  });

  it('link an Instagram handle to its profile', () => {
    expect(instagramUrl('@klotilda.lisejnikova')).toBe(
      'https://instagram.com/klotilda.lisejnikova'
    );
    expect(instagramUrl(' klotilda ')).toBe('https://instagram.com/klotilda');
    expect(instagramUrl('https://www.instagram.com/klotilda/')).toBe(
      'https://instagram.com/klotilda'
    );
    expect(instagramUrl('@klotilda lisejnikova')).toBe('https://instagram.com/klotildalisejnikova');
  });
});

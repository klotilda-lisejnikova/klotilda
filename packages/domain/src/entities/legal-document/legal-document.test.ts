import { describe, expect, it } from 'vitest';
import {
  fillLegalText,
  formatCzechDate,
  isLegalVersion,
  legalTextProblems,
  nextLegalVersion,
  pragueDate,
} from './index';

const SELLER = {
  name: 'Klotilda',
  ico: '87654321',
  address: 'Dlouhá 1, Praha',
  email: 'a@b.cz',
  phone: null,
  registration: null,
};

describe('Legal document versions', () => {
  it("name a version by Prague's date, whatever the server's zone", () => {
    expect(pragueDate(new Date('2026-11-01T22:59:00Z'))).toBe('2026-11-01');
    expect(pragueDate(new Date('2026-11-01T23:30:00Z'))).toBe('2026-11-02');
    // Summer time: Prague is two hours ahead.
    expect(pragueDate(new Date('2026-07-01T21:59:00Z'))).toBe('2026-07-01');
    expect(pragueDate(new Date('2026-07-01T22:00:00Z'))).toBe('2026-07-02');
    // The night the clocks go forward.
    expect(pragueDate(new Date('2027-03-28T00:30:00Z'))).toBe('2027-03-28');
  });

  it('number a second version the same day, and never date one before an earlier', () => {
    expect(nextLegalVersion('2026-12-01', ['2026-11-02'])).toBe('2026-12-01');
    expect(nextLegalVersion('2026-12-01', ['2026-12-01'])).toBe('2026-12-01-2');
    expect(nextLegalVersion('2026-12-01', ['2026-12-01', '2026-12-01-2'])).toBe('2026-12-01-3');
    expect(nextLegalVersion('2026-11-01', ['2026-11-02'])).toBe('2026-11-02-2');
  });

  it('name versions so a URL segment can carry them', () => {
    for (const taken of [[], ['2026-12-01'], ['2026-12-01', '2026-12-01-2']]) {
      expect(isLegalVersion(nextLegalVersion('2026-12-01', taken))).toBe(true);
    }
    for (const bad of ['2026-12-01.2', '2026-12-01-1', '2026-12-01-02', '../x', '2026-12-1']) {
      expect(isLegalVersion(bad)).toBe(false);
    }
  });

  it('fill the seller, the date and the paths', () => {
    expect(
      fillLegalText(
        '{{sellerName}}, IČO {{sellerIco}}, od {{effectiveFrom}}, [x]({{termsPath}}) {{sellerPhone}}|',
        SELLER,
        '2026-11-02-2'
      )
    ).toBe('Klotilda, IČO 87654321, od 2. 11. 2026, [x](/obchodni-podminky) |');
    expect(formatCzechDate('2026-01-09')).toBe('9. 1. 2026');
  });

  it('refuse unknown and broken placeholders, and terms without the complaints heading', () => {
    expect(legalTextProblems('privacy', 'Text {{sellerName}}.')).toEqual([]);
    expect(legalTextProblems('privacy', ' \n ')).toEqual(['Text je prázdný.']);
    expect(legalTextProblems('terms', '## Reklamace {#{{complaintsAnchor}}}\n\nText')).toEqual([]);
    expect(legalTextProblems('terms', '## Reklamace {#reklamace}')).toEqual([]);
    const problems = legalTextProblems('terms', 'Text {{vs}} a {{sellerName}');
    expect(problems).toHaveLength(3);
    expect(problems[0]).toContain('{{vs}}');
    expect(problems[2]).toContain('{#reklamace}');
  });
});

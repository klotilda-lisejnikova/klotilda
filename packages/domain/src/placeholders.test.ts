import { describe, expect, it } from 'vitest';
import { fillPlaceholders, hasBrokenPlaceholder, unknownPlaceholders } from './placeholders';

describe('Placeholders', () => {
  it('fill the ones given a value, and leave the rest as written', () => {
    expect(
      fillPlaceholders('Objednávka {{vs}} pro {{ jmeno }}, {{cena}}, {{cislo_zasilky}}', {
        vs: '1234567890',
        jmeno: 'Jana',
      })
    ).toBe('Objednávka 1234567890 pro Jana, {{cena}}, {{cislo_zasilky}}');
  });

  it('spot braces that are not a whole placeholder', () => {
    expect(hasBrokenPlaceholder('Objednávka {{vs}} pro {{ jmeno }}')).toBe(false);
    expect(hasBrokenPlaceholder('Objednávka {{vs}')).toBe(true);
    expect(hasBrokenPlaceholder('Balík {{cislo zasilky}}')).toBe(true);
    expect(hasBrokenPlaceholder('Hotovo }}')).toBe(true);
  });

  it('fill only the values they were given, never inherited names', () => {
    expect(fillPlaceholders('{{constructor}} {{toString}} {{a}}', { a: '$& $1' })).toBe(
      '{{constructor}} {{toString}} $& $1'
    );
  });

  it('name the ones not known, each once', () => {
    expect(unknownPlaceholders('{{vs}} {{cena}} {{ cena }}', ['vs'])).toEqual(['cena']);
  });
});

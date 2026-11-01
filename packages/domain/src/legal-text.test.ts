import { describe, expect, it } from 'vitest';
import { parseLegalText } from './legal-text';

describe('Legal texts', () => {
  it('parse headings with anchors, paragraphs with their line breaks, lists and notes', () => {
    const blocks = parseLegalText(
      [
        '## 7. Reklamace {#reklamace}',
        'Text **tučně** a [odkaz](/cs/x).\nDruhý řádek',
        '- a\n- b',
        '1. jedna\n2. dvě',
        '> poznámka',
      ].join('\n\n')
    );
    expect(blocks).toEqual([
      {
        kind: 'heading',
        level: 2,
        id: 'reklamace',
        spans: [{ kind: 'text', text: '7. Reklamace' }],
      },
      {
        kind: 'paragraph',
        lines: [
          [
            { kind: 'text', text: 'Text ' },
            { kind: 'bold', text: 'tučně' },
            { kind: 'text', text: ' a ' },
            { kind: 'link', label: 'odkaz', href: '/cs/x' },
            { kind: 'text', text: '.' },
          ],
          [{ kind: 'text', text: 'Druhý řádek' }],
        ],
      },
      {
        kind: 'list',
        ordered: false,
        items: [[{ kind: 'text', text: 'a' }], [{ kind: 'text', text: 'b' }]],
      },
      {
        kind: 'list',
        ordered: true,
        items: [[{ kind: 'text', text: 'jedna' }], [{ kind: 'text', text: 'dvě' }]],
      },
      { kind: 'note', lines: [[{ kind: 'text', text: 'poznámka' }]] },
    ]);
  });

  it('read an empty text as no blocks', () => {
    expect(parseLegalText('  \n ')).toEqual([]);
  });
});

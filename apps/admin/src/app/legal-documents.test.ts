import { describe, expect, it, vi } from 'vitest';
import type { LegalDocumentVersion } from '@klotilda/domain';
import { groupLegalVersions, nextEffectiveFrom } from './legal-documents';

vi.mock('./api', () => ({ services: {} }));

function row(overrides: Partial<LegalDocumentVersion>): LegalDocumentVersion {
  return {
    id: 'leg1',
    createdAt: '2026-11-01T10:00:00Z',
    updatedAt: '2026-11-01T10:00:00Z',
    document: 'terms',
    version: null,
    body_cs: 'Text',
    body_en: null,
    status: 'published',
    publishedAt: null,
    seller: null,
    ...overrides,
  } as LegalDocumentVersion;
}

describe('groupLegalVersions', () => {
  it("splits each document's draft from its published versions, the one in force first", () => {
    const grouped = groupLegalVersions([
      row({ id: 'a', version: '2026-11-02', publishedAt: '2026-11-01T09:00:00Z' }),
      row({ id: 'b', status: 'draft' }),
      row({ id: 'c', version: '2026-11-02-2', publishedAt: '2026-11-01T12:00:00Z' }),
      row({
        id: 'd',
        document: 'privacy',
        version: '2026-11-02',
        publishedAt: '2026-11-01T09:00:00Z',
      }),
    ]);
    expect(grouped.terms.draft?.id).toBe('b');
    expect(grouped.terms.published.map((version) => version.id)).toEqual(['c', 'a']);
    expect(grouped.privacy.published.map((version) => version.id)).toEqual(['d']);
    expect(grouped.privacy.draft).toBeUndefined();
    expect(grouped.withdrawal).toEqual({ published: [] });
  });
});

describe('nextEffectiveFrom', () => {
  it("names today in Prague, or the latest day already taken when that's later", () => {
    const lateEvening = new Date('2026-11-05T23:30:00Z');
    expect(nextEffectiveFrom([], lateEvening)).toBe('2026-11-06');
    expect(nextEffectiveFrom([row({ version: '2026-11-02' })], lateEvening)).toBe('2026-11-06');
    expect(nextEffectiveFrom([row({ version: '2026-11-08' })], lateEvening)).toBe('2026-11-08');
  });
});

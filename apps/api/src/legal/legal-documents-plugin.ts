import {
  createVerifyToken,
  generateId,
  HttpError,
  validateFields,
  ValidationError,
} from '@eleansphere/be-core';
import type { ProjectPlugin, Sequelize } from '@eleansphere/be-core';
import type { Request } from 'express';
import {
  isLegalDocumentKey,
  LEGAL_DOCUMENTS_PATH,
  legalDocumentVersionEntity,
  legalDocumentVersionFields,
  legalTextProblems,
  legalVersionDate,
  nextLegalVersion,
  pragueDate,
} from '@klotilda/domain';
import type {
  LegalDocumentKey,
  LegalDraftRequest,
  LegalVersionSummary,
  PublishedLegalVersion,
} from '@klotilda/domain';
import { asyncHandler } from '../http/async-handler';
import type { ModelRegistry } from '../models-registry';
import { resolveSeller } from '../seller/seller';
import { findCurrentVersion, NEWEST_FIRST, toPublished, versions } from './legal-documents';
import type { Transaction } from './legal-documents';

const OK = 200;
const CREATED = 201;
const NO_CONTENT = 204;
const BAD_REQUEST = 400;
const NOT_FOUND = 404;

const DOCUMENT_ROUTE = `${LEGAL_DOCUMENTS_PATH}/:document`;
const DRAFT_ROUTE = `${DOCUMENT_ROUTE}/draft`;
const DRAFT_FIELDS = {
  body_cs: legalDocumentVersionFields.body_cs,
  body_en: legalDocumentVersionFields.body_en,
};

export interface LegalDocumentsPluginOptions {
  registry: ModelRegistry;
  jwtSecret: string;
}

/** The document a URL names; any other segment is no page. */
function readDocument(req: Request): LegalDocumentKey {
  const { document } = req.params;
  if (!document || !isLegalDocumentKey(document)) {
    throw new HttpError(NOT_FOUND, 'No such legal document');
  }
  return document;
}

/** The draft's texts, checked by the version's own field rules. */
function readDraftRequest(body: unknown): Required<LegalDraftRequest> {
  const request = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const texts = { body_cs: request.body_cs, body_en: request.body_en };
  const issues = validateFields(DRAFT_FIELDS, texts, { mode: 'create' });
  if (issues.length > 0) throw new ValidationError(issues);
  const english = typeof texts.body_en === 'string' && texts.body_en.trim() !== '';
  return { body_cs: String(texts.body_cs), body_en: english ? String(texts.body_en) : null };
}

/**
 * Runs `work` in one transaction holding the document's advisory lock, so its draft and versions
 * change one request at a time: there is one draft, and no version is taken twice.
 */
function withDocumentLock<T>(
  sequelize: Sequelize,
  document: LegalDocumentKey,
  work: (transaction: Transaction) => Promise<T>
): Promise<T> {
  return sequelize.transaction(async (transaction) => {
    await sequelize.query('SELECT pg_advisory_xact_lock(hashtext($key))', {
      bind: { key: `${legalDocumentVersionEntity.config.name}:${document}` },
      transaction,
    });
    return work(transaction);
  });
}

const findDraft = (
  registry: ModelRegistry,
  document: LegalDocumentKey,
  transaction?: Transaction
) => versions(registry).findOne({ where: { document, status: 'draft' }, transaction });

async function resolveDraft(
  registry: ModelRegistry,
  document: LegalDocumentKey,
  transaction: Transaction
) {
  const draft = await findDraft(registry, document, transaction);
  if (!draft) throw new HttpError(NOT_FOUND, 'Koncept neexistuje. Založte novou verzi.');
  return draft;
}

/** The document's draft: the one there is, or a new one with the current version's texts. */
async function startDraft(
  registry: ModelRegistry,
  document: LegalDocumentKey,
  transaction: Transaction
) {
  const existing = await findDraft(registry, document, transaction);
  if (existing) return { draft: existing, created: false };
  const current = await findCurrentVersion(registry, document, transaction);
  const draft = await versions(registry).create(
    {
      id: generateId(legalDocumentVersionEntity.config.prefix),
      document,
      status: 'draft',
      body_cs: current ? String(current.get('body_cs')) : '',
      body_en: current?.get('body_en') ?? null,
    },
    { transaction }
  );
  return { draft, created: true };
}

/** Freezes the draft as the document's newest version, with the seller's details of today. */
async function publishDraft(
  registry: ModelRegistry,
  document: LegalDocumentKey,
  transaction: Transaction
): Promise<PublishedLegalVersion> {
  const draft = await resolveDraft(registry, document, transaction);
  // The Czech text always counts; the English one only when there is one (else the Czech shows).
  const english = draft.get('body_en');
  const texts = [
    String(draft.get('body_cs') ?? ''),
    ...(typeof english === 'string' && english.trim() !== '' ? [english] : []),
  ];
  const problems = [...new Set(texts.flatMap((text) => legalTextProblems(document, text)))];
  if (problems.length > 0) throw new HttpError(BAD_REQUEST, problems.join(' '));

  const published = await versions(registry).findAll({
    where: { document, status: 'published' },
    attributes: ['version'],
    transaction,
  });
  const now = new Date();
  const version = nextLegalVersion(
    pragueDate(now),
    published.map((row) => String(row.get('version')))
  );
  const seller = await resolveSeller(registry, transaction);
  await draft.update(
    { version, status: 'published', publishedAt: now, seller: JSON.stringify(seller) },
    { transaction }
  );
  return toPublished(draft);
}

/**
 * The legal pages' versions (`LegalDocumentVersion`); auto CRUD only lists them for the admin.
 *
 * Public:
 * - `GET /api/legal-documents/:document/current` — the version in force (404 before the first);
 * - `GET …/:document/versions` — every published version, newest first;
 * - `GET …/:document/versions/:version` — one of them, as it was published.
 *
 * Signed in, each under the document's lock:
 * - `GET …/:document/draft`, `POST` (starts one from the current text, or answers the one there
 *   is), `PUT` (`{ body_cs, body_en }`), `DELETE`;
 * - `POST …/:document/draft/publish` — the draft becomes the current version, dated today in
 *   Prague, once its texts pass `legalTextProblems`. A published version never changes again.
 */
export function createLegalDocumentsPlugin({
  registry,
  jwtSecret,
}: LegalDocumentsPluginOptions): ProjectPlugin {
  return {
    registerRoutes(app, sequelize) {
      const signedIn = createVerifyToken(jwtSecret);

      app.get(
        `${DOCUMENT_ROUTE}/current`,
        asyncHandler(async (req, res) => {
          const current = await findCurrentVersion(registry, readDocument(req));
          if (!current) throw new HttpError(NOT_FOUND, 'No version published yet');
          res.json(toPublished(current));
        })
      );

      app.get(
        `${DOCUMENT_ROUTE}/versions`,
        asyncHandler(async (req, res) => {
          const rows = await versions(registry).findAll({
            where: { document: readDocument(req), status: 'published' },
            attributes: ['version', 'publishedAt', 'createdAt', 'id'],
            order: NEWEST_FIRST,
          });
          const answer: LegalVersionSummary[] = rows.map((row) => {
            const version = String(row.get('version'));
            return { version, effectiveFrom: legalVersionDate(version) };
          });
          res.json(answer);
        })
      );

      app.get(
        `${DOCUMENT_ROUTE}/versions/:version`,
        asyncHandler(async (req, res) => {
          const row = await versions(registry).findOne({
            where: {
              document: readDocument(req),
              status: 'published',
              version: req.params.version,
            },
          });
          if (!row) throw new HttpError(NOT_FOUND, 'No such version');
          res.json(toPublished(row));
        })
      );

      app.get(
        DRAFT_ROUTE,
        signedIn,
        asyncHandler(async (req, res) => {
          const draft = await findDraft(registry, readDocument(req));
          if (!draft) throw new HttpError(NOT_FOUND, 'No draft');
          res.json(draft.toJSON());
        })
      );

      app.post(
        DRAFT_ROUTE,
        signedIn,
        asyncHandler(async (req, res) => {
          const document = readDocument(req);
          const { draft, created } = await withDocumentLock(sequelize, document, (transaction) =>
            startDraft(registry, document, transaction)
          );
          res.status(created ? CREATED : OK).json(draft.toJSON());
        })
      );

      app.put(
        DRAFT_ROUTE,
        signedIn,
        asyncHandler(async (req, res) => {
          const document = readDocument(req);
          const texts = readDraftRequest(req.body);
          const draft = await withDocumentLock(sequelize, document, async (transaction) => {
            const found = await resolveDraft(registry, document, transaction);
            return found.update(texts, { transaction });
          });
          res.json(draft.toJSON());
        })
      );

      app.delete(
        DRAFT_ROUTE,
        signedIn,
        asyncHandler(async (req, res) => {
          const document = readDocument(req);
          await withDocumentLock(sequelize, document, async (transaction) => {
            const draft = await resolveDraft(registry, document, transaction);
            await draft.destroy({ transaction });
          });
          res.status(NO_CONTENT).end();
        })
      );

      app.post(
        `${DRAFT_ROUTE}/publish`,
        signedIn,
        asyncHandler(async (req, res) => {
          const document = readDocument(req);
          res.json(
            await withDocumentLock(sequelize, document, (transaction) =>
              publishDraft(registry, document, transaction)
            )
          );
        })
      );
    },
  };
}

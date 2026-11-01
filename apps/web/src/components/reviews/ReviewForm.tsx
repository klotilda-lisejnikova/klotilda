"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { ApiError } from "@eleansphere/entity-core";
import {
  LEGAL_PATHS,
  MAX_RATING,
  REVIEW_AUTHOR_NAME_MAX_LENGTH,
  REVIEW_BODY_MAX_LENGTH,
  REVIEW_BODY_MIN_LENGTH,
  REVIEW_NOT_DELIVERED_MESSAGE,
} from "@klotilda/domain";
import type { ReviewInvitation, ReviewLocale } from "@klotilda/domain";
import { Link } from "@/i18n/navigation";
import { getReviewInvitation, submitReview } from "@/services";
import ReviewStars from "./ReviewStars";

const NOT_FOUND = 404;
const BAD_REQUEST = 400;
const CONFLICT = 409;
const RATINGS = Array.from(
  { length: MAX_RATING },
  (_, index) => MAX_RATING - index,
);

/** Why the link can't be used now; each has its own sentence. */
type Refusal = "invalid" | "notDelivered" | "already" | "loadError";

type Stage =
  | { kind: "loading" }
  | { kind: "refused"; refusal: Refusal }
  | { kind: "form"; invitation: ReviewInvitation }
  | { kind: "thanks" };

/** What a refusal from the invitation routes means for the customer; `undefined`: none of them. */
function refusalOf(err: unknown): Refusal | undefined {
  if (!(err instanceof ApiError)) return undefined;
  if (err.status === NOT_FOUND) return "invalid";
  if (err.status === CONFLICT) {
    return err.detail === REVIEW_NOT_DELIVERED_MESSAGE
      ? "notDelivered"
      : "already";
  }
  return undefined;
}

/** The fields as the API checks them: the text and the name, spaces at the ends left out. */
function fieldsFit(body: string, authorName: string): boolean {
  const name = authorName.trim();
  return (
    body.trim().length >= REVIEW_BODY_MIN_LENGTH &&
    name !== "" &&
    name.length <= REVIEW_AUTHOR_NAME_MAX_LENGTH
  );
}

/**
 * The form behind the link from the "delivered" e-mail. It calls the API from the visitor's
 * browser, so the rate limit counts each customer on their own.
 */
export default function ReviewForm({ token }: { token: string }) {
  const [stage, setStage] = useState<Stage>(
    token ? { kind: "loading" } : { kind: "refused", refusal: "invalid" },
  );

  useEffect(() => {
    if (!token) return;
    let current = true;
    getReviewInvitation(token)
      .then((invitation) => current && setStage({ kind: "form", invitation }))
      .catch((err: unknown) => {
        if (current) {
          setStage({ kind: "refused", refusal: refusalOf(err) ?? "loadError" });
        }
      });
    return () => {
      current = false;
    };
  }, [token]);

  if (stage.kind === "loading") return <Notice textKey="loading" />;
  if (stage.kind === "refused") return <Notice textKey={stage.refusal} />;
  if (stage.kind === "thanks") return <Thanks />;
  return (
    <WriteForm
      token={token}
      invitation={stage.invitation}
      onRefused={(refusal) => setStage({ kind: "refused", refusal })}
      onSent={() => setStage({ kind: "thanks" })}
    />
  );
}

function Notice({ textKey }: { textKey: Refusal | "loading" }) {
  const t = useTranslations("reviews.write");
  return (
    <p
      className="mt-8 text-stone-700"
      role={textKey === "loading" ? undefined : "alert"}
    >
      {t(textKey)}
    </p>
  );
}

function Thanks() {
  const t = useTranslations("reviews.write");
  return (
    <div className="mt-8" role="status">
      <h2 className="font-serif text-2xl font-light tracking-[0.08em] text-stone-800">
        {t("thanksTitle")}
      </h2>
      <p className="mt-3 text-stone-700">{t("thanksBody")}</p>
      <Link
        href="/recenze"
        className="text-moss mt-6 inline-block text-sm underline underline-offset-4"
      >
        {t("toReviews")}
      </Link>
    </div>
  );
}

function WriteForm({
  token,
  invitation,
  onRefused,
  onSent,
}: {
  token: string;
  invitation: ReviewInvitation;
  onRefused: (refusal: Refusal) => void;
  onSent: () => void;
}) {
  const t = useTranslations("reviews.write");
  const format = useFormatter();
  const locale = useLocale() as ReviewLocale;
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [authorName, setAuthorName] = useState(
    invitation.authorName.slice(0, REVIEW_AUTHOR_NAME_MAX_LENGTH),
  );
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(event: FormEvent) {
    event.preventDefault();
    if (rating === 0) {
      setError(t("ratingMissing"));
      return;
    }
    const checkFields = t("checkFields", { min: REVIEW_BODY_MIN_LENGTH });
    if (!fieldsFit(body, authorName)) {
      setError(checkFields);
      return;
    }
    setSending(true);
    setError(null);
    try {
      await submitReview({
        token,
        rating,
        body: body.trim(),
        authorName: authorName.trim(),
        locale,
        consent: true,
      });
      onSent();
    } catch (err) {
      const refusal = refusalOf(err);
      if (refusal) onRefused(refusal);
      else if (err instanceof ApiError && err.status === BAD_REQUEST) {
        setError(checkFields);
      } else setError(t("error"));
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={send} className="mt-8 space-y-8">
      <p className="leading-relaxed text-stone-700">{t("intro")}</p>

      <div>
        <p className="text-[0.7rem] tracking-[0.2em] text-stone-500 uppercase">
          {t("pieces")}
        </p>
        <ul className="mt-2 list-inside list-disc text-stone-800">
          {invitation.items.map((item) => (
            <li key={item.productId}>{item.name}</li>
          ))}
        </ul>
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-stone-800">
          {t("rating")}
        </legend>
        <div className="mt-3 flex flex-col gap-2">
          {RATINGS.map((value) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-3"
            >
              <input
                type="radio"
                name="rating"
                value={value}
                checked={rating === value}
                onChange={() => setRating(value)}
                className="accent-moss"
              />
              <ReviewStars
                rating={value}
                label={t("ratingOption", { rating: value })}
              />
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="text-sm font-medium text-stone-800">{t("body")}</span>
        <textarea
          required
          rows={6}
          minLength={REVIEW_BODY_MIN_LENGTH}
          maxLength={REVIEW_BODY_MAX_LENGTH}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          className="focus:border-moss mt-2 block w-full border border-stone-300 bg-white px-3 py-2 text-stone-800 outline-none"
        />
        <span className="mt-1 block text-xs text-stone-500">
          {t("bodyHint", {
            min: REVIEW_BODY_MIN_LENGTH,
            max: REVIEW_BODY_MAX_LENGTH,
          })}
        </span>
      </label>

      <label className="block">
        <span className="text-sm font-medium text-stone-800">{t("name")}</span>
        <input
          required
          maxLength={REVIEW_AUTHOR_NAME_MAX_LENGTH}
          value={authorName}
          onChange={(event) => setAuthorName(event.target.value)}
          className="focus:border-moss mt-2 block w-full border border-stone-300 bg-white px-3 py-2 text-stone-800 outline-none"
        />
        <span className="mt-1 block text-xs text-stone-500">
          {t("nameHint")}
        </span>
      </label>

      <label className="flex items-start gap-3 text-sm text-stone-700">
        <input
          type="checkbox"
          required
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="accent-moss mt-1"
        />
        <span>
          {t("consent")}{" "}
          <Link
            href={LEGAL_PATHS.privacy}
            target="_blank"
            rel="noopener"
            className="text-moss underline underline-offset-2"
          >
            {t("privacy")}
          </Link>
        </span>
      </label>

      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={sending}
          className="border border-stone-700 px-8 py-3 text-[0.7rem] tracking-[0.3em] text-stone-700 uppercase transition-all hover:border-moss hover:bg-moss hover:text-[#fafaf8] disabled:opacity-50"
        >
          {sending ? t("sending") : t("submit")}
        </button>
        <span className="text-xs text-stone-500">
          {t("expires", {
            date: format.dateTime(new Date(invitation.expiresAt), {
              dateStyle: "long",
            }),
          })}
        </span>
      </div>
    </form>
  );
}

import { toStandardSchema } from '@eleansphere/entity-core';
import type {
  Fields,
  FormOutput,
  ToStandardSchemaOptions,
  ValidationIssue,
  ValidationMode,
} from '@eleansphere/entity-core';
import type { FormInputEvents } from '@nuxt/ui';

/**
 * When a `UForm` validates besides on submit: while typing and once a value is committed, but not
 * on blur alone — leaving an untouched field must not flash "required" and shift the layout.
 */
export const VALIDATE_ON: FormInputEvents[] = ['input', 'change'];

const MESSAGES: Record<ValidationIssue['code'], (params: Record<string, unknown>) => string> = {
  required: () => 'Vyplňte prosím.',
  type: () => 'Tohle sem nepatří.',
  enum: () => 'Vyberte jednu z možností.',
  minLength: ({ minLength }) => `Aspoň ${minLength} znaků.`,
  maxLength: ({ maxLength }) => `Nejvýš ${maxLength} znaků.`,
  min: ({ min }) => `Nejméně ${min}.`,
  max: ({ max }) => `Nejvýš ${max}.`,
  format: () => 'Tohle nevypadá správně.',
  unique: () => 'Tohle už existuje.',
  reference: () => 'Tohle už neexistuje.',
};

/** `{ code: 'min', params: { min: 0 } }` → „Nejméně 0." */
export function describeIssue(issue: ValidationIssue): string {
  return MESSAGES[issue.code]?.(issue.params ?? {}) ?? 'Tohle nevypadá správně.';
}

/** A form schema for `UForm`, running the same rules the API does, with Czech messages. */
export function formSchema<F extends Fields, Mode extends ValidationMode>(
  fields: F,
  mode: Mode,
  options: Omit<ToStandardSchemaOptions<FormOutput<F, Mode>>, 'formatMessage'> = {}
) {
  return toStandardSchema(fields, mode, { ...options, formatMessage: describeIssue });
}

import crypto from 'node:crypto';
import QRCode from 'qrcode';
import type { BankAccount } from '../env';

const SPD_MESSAGE_MAX_LENGTH = 60;
const VARIABLE_SYMBOL_DIGITS = 10;
const COMBINING_MARKS = /[̀-ͯ]/g;
const SPD_DELIMITERS = /[*+]/g;

export interface QrPayment {
  /** CZK. */
  amount: number;
  variableSymbol: string;
  message?: string;
}

/** SPD fields are `*`-delimited and some banking apps choke on diacritics. */
function toSpdText(value: string): string {
  return value
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .replace(SPD_DELIMITERS, ' ')
    .slice(0, SPD_MESSAGE_MAX_LENGTH);
}

/**
 * The Czech "QR Platba" (SPD, https://qr-platba.cz/pro-vyvojare/specifikace-formatu/) as a PNG
 * data URL: any Czech banking app scanning it pre-fills the transfer.
 */
export function createQrPaymentDataUrl(account: BankAccount, payment: QrPayment): Promise<string> {
  const parts = [
    'SPD*1.0',
    `ACC:${account.iban}${account.bic ? `+${account.bic}` : ''}`,
    `AM:${payment.amount.toFixed(2)}`,
    'CC:CZK',
    `X-VS:${payment.variableSymbol}`,
  ];
  if (payment.message) parts.push(`MSG:${toSpdText(payment.message)}`);
  return QRCode.toDataURL(parts.join('*'));
}

/** Ten random digits, not starting with zero: bank variable symbols are digits only. */
export function createVariableSymbol(): string {
  const first = crypto.randomInt(1, 10).toString();
  const rest = Array.from({ length: VARIABLE_SYMBOL_DIGITS - 1 }, () =>
    crypto.randomInt(0, 10).toString()
  );
  return first + rest.join('');
}

/**
 * Decimal values cross service boundaries as base-10 strings.
 * No JavaScript floating point value is accepted for money, price, quantity or fees.
 */
export const DECIMAL_STRING_PATTERN = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;

export function isDecimalString(value: unknown): value is string {
  return typeof value === 'string' && DECIMAL_STRING_PATTERN.test(value);
}

export function isPositiveDecimalString(value: string): boolean {
  return isDecimalString(value) && !isZero(value) && !value.startsWith('-');
}

export function isNonNegativeDecimalString(value: string): boolean {
  return isDecimalString(value) && !value.startsWith('-');
}

/**
 * Compares two decimal strings without converting them to floating point.
 * Inputs must satisfy DECIMAL_STRING_PATTERN.
 */
export function compareDecimalStrings(left: string, right: string): -1 | 0 | 1 {
  if (!isDecimalString(left) || !isDecimalString(right)) {
    throw new TypeError('compareDecimalStrings expects base-10 decimal strings');
  }

  const a = splitDecimal(left);
  const b = splitDecimal(right);

  if (a.isZero && b.isZero) {
    return 0;
  }
  if (a.negative !== b.negative) {
    return a.negative ? -1 : 1;
  }

  const magnitude = compareMagnitude(a, b);
  if (magnitude === 0) {
    return 0;
  }
  return a.negative ? (magnitude === 1 ? -1 : 1) : magnitude;
}

interface SplitDecimal {
  negative: boolean;
  integer: string;
  fraction: string;
  isZero: boolean;
}

function splitDecimal(value: string): SplitDecimal {
  const negative = value.startsWith('-');
  const unsigned = negative ? value.slice(1) : value;
  const [rawInteger = '0', rawFraction = ''] = unsigned.split('.');
  const integer = rawInteger.replace(/^0+(?=\d)/, '');
  const fraction = rawFraction.replace(/0+$/, '');

  return {
    negative,
    integer,
    fraction,
    isZero: integer === '0' && fraction === '',
  };
}

function compareMagnitude(a: SplitDecimal, b: SplitDecimal): -1 | 0 | 1 {
  if (a.integer.length !== b.integer.length) {
    return a.integer.length > b.integer.length ? 1 : -1;
  }
  if (a.integer !== b.integer) {
    return a.integer > b.integer ? 1 : -1;
  }

  const width = Math.max(a.fraction.length, b.fraction.length);
  const aFraction = a.fraction.padEnd(width, '0');
  const bFraction = b.fraction.padEnd(width, '0');

  if (aFraction === bFraction) {
    return 0;
  }
  return aFraction > bFraction ? 1 : -1;
}

function isZero(value: string): boolean {
  const split = splitDecimal(value);
  return split.isZero;
}

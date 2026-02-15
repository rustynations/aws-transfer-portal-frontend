import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { isValidTotpCode, sanitizeTotpInput, buildOtpAuthUri } from './totp-validation';

/**
 * Feature: totp-mfa, Property 1: OTP Auth URI correctness
 * Validates: Requirements 2.2
 *
 * For any TOTP secret (non-empty base32 string), user email, and issuer string,
 * the generated otpauth URI should:
 * - Start with `otpauth://totp/`
 * - Contain the issuer and email in the label
 * - Include a `secret` parameter equal to the input secret
 * - Include an `issuer` parameter equal to the input issuer
 */
describe('Property 1: OTP Auth URI correctness', () => {
  // Generator for non-empty base32 strings
  const base32Char = fc.constantFrom(
    ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.split('')
  );
  const base32String = fc
    .array(base32Char, { minLength: 1, maxLength: 32 })
    .map((arr) => arr.join(''));

  // Generator for email-like strings (simple but valid structure)
  const emailArb = fc
    .tuple(
      fc.stringMatching(/^[a-z][a-z0-9]{0,9}$/),
      fc.stringMatching(/^[a-z][a-z0-9]{0,5}$/),
      fc.constantFrom('com', 'org', 'net', 'io')
    )
    .map(([user, domain, tld]) => `${user}@${domain}.${tld}`);

  // Generator for issuer names (non-empty alphanumeric with spaces)
  const issuerArb = fc
    .stringMatching(/^[A-Za-z][A-Za-z0-9 ]{0,19}$/)
    .filter((s) => s.length > 0);

  it('URI starts with otpauth://totp/', () => {
    fc.assert(
      fc.property(base32String, emailArb, issuerArb, (secret, email, issuer) => {
        const uri = buildOtpAuthUri(secret, email, issuer);
        expect(uri.startsWith('otpauth://totp/')).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('URI label contains the issuer and email', () => {
    fc.assert(
      fc.property(base32String, emailArb, issuerArb, (secret, email, issuer) => {
        const uri = buildOtpAuthUri(secret, email, issuer);
        // Extract the label portion (between otpauth://totp/ and ?)
        const labelPart = uri.split('?')[0].replace('otpauth://totp/', '');
        const decodedLabel = decodeURIComponent(labelPart);
        expect(decodedLabel).toContain(issuer);
        expect(decodedLabel).toContain(email);
      }),
      { numRuns: 100 }
    );
  });

  it('URI includes a secret parameter equal to the input secret', () => {
    fc.assert(
      fc.property(base32String, emailArb, issuerArb, (secret, email, issuer) => {
        const uri = buildOtpAuthUri(secret, email, issuer);
        const url = new URL(uri);
        expect(url.searchParams.get('secret')).toBe(secret);
      }),
      { numRuns: 100 }
    );
  });

  it('URI includes an issuer parameter equal to the input issuer', () => {
    fc.assert(
      fc.property(base32String, emailArb, issuerArb, (secret, email, issuer) => {
        const uri = buildOtpAuthUri(secret, email, issuer);
        const url = new URL(uri);
        expect(url.searchParams.get('issuer')).toBe(issuer);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: totp-mfa, Property 4: TOTP code validation
 * Validates: Requirements 7.1
 *
 * For any string, isValidTotpCode should return true if and only if the string
 * has exactly 6 characters and every character is a digit (0-9).
 */
describe('Property 4: TOTP code validation', () => {
  const digitChar = fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9');
  const digitString = (min: number, max: number) =>
    fc.array(digitChar, { minLength: min, maxLength: max }).map((arr) => arr.join(''));

  it('returns true for any string of exactly 6 digit characters', () => {
    fc.assert(
      fc.property(digitString(6, 6), (code) => {
        expect(isValidTotpCode(code)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('returns false for digit strings with fewer than 6 characters', () => {
    fc.assert(
      fc.property(digitString(0, 5), (code) => {
        expect(isValidTotpCode(code)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('returns false for digit strings with more than 6 characters', () => {
    fc.assert(
      fc.property(digitString(7, 20), (code) => {
        expect(isValidTotpCode(code)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('returns false for any string containing a non-digit character', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter((s) => /\D/.test(s)),
        (code) => {
          expect(isValidTotpCode(code)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns true iff the string is exactly 6 digits (universal property)', () => {
    fc.assert(
      fc.property(fc.string(), (code) => {
        const expected = /^\d{6}$/.test(code);
        expect(isValidTotpCode(code)).toBe(expected);
      }),
      { numRuns: 200 }
    );
  });
});

/**
 * Feature: totp-mfa, Property 5: TOTP input sanitization
 * Validates: Requirements 7.2
 *
 * For any input string, sanitizeTotpInput should return a string containing
 * only digit characters (0-9), preserving their original order, and the output
 * length should be less than or equal to the input length.
 */
describe('Property 5: TOTP input sanitization', () => {
  it('output contains only digit characters', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = sanitizeTotpInput(input);
        expect(result).toMatch(/^\d*$/);
      }),
      { numRuns: 100 }
    );
  });

  it('output length is less than or equal to input length', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = sanitizeTotpInput(input);
        expect(result.length).toBeLessThanOrEqual(input.length);
      }),
      { numRuns: 100 }
    );
  });

  it('preserves original digit order from the input', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = sanitizeTotpInput(input);
        const expectedDigits = input.replace(/\D/g, '');
        expect(result).toBe(expectedDigits);
      }),
      { numRuns: 100 }
    );
  });

  it('returns empty string for input with no digits', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !/\d/.test(s)),
        (input) => {
          expect(sanitizeTotpInput(input)).toBe('');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns the input unchanged when it contains only digits', () => {
    const digitChar = fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9');
    fc.assert(
      fc.property(
        fc.array(digitChar, { minLength: 0, maxLength: 20 }).map((arr) => arr.join('')),
        (input) => {
          expect(sanitizeTotpInput(input)).toBe(input);
        }
      ),
      { numRuns: 100 }
    );
  });
});

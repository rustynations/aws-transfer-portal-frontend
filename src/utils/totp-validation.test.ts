import { describe, it, expect } from 'vitest';
import { isValidTotpCode, sanitizeTotpInput, buildOtpAuthUri } from './totp-validation';

describe('isValidTotpCode', () => {
  it('returns true for a valid 6-digit code', () => {
    expect(isValidTotpCode('123456')).toBe(true);
    expect(isValidTotpCode('000000')).toBe(true);
    expect(isValidTotpCode('999999')).toBe(true);
  });

  it('returns false for empty string', () => {
    expect(isValidTotpCode('')).toBe(false);
  });

  it('returns false for fewer than 6 digits', () => {
    expect(isValidTotpCode('12345')).toBe(false);
  });

  it('returns false for more than 6 digits', () => {
    expect(isValidTotpCode('1234567')).toBe(false);
  });

  it('returns false for non-numeric characters', () => {
    expect(isValidTotpCode('abcdef')).toBe(false);
    expect(isValidTotpCode('12345a')).toBe(false);
  });

  it('returns false for strings with spaces', () => {
    expect(isValidTotpCode('12 456')).toBe(false);
    expect(isValidTotpCode(' 12345')).toBe(false);
  });
});

describe('sanitizeTotpInput', () => {
  it('returns only digits from mixed input', () => {
    expect(sanitizeTotpInput('abc123')).toBe('123');
    expect(sanitizeTotpInput('1a2b3c')).toBe('123');
  });

  it('returns empty string for no digits', () => {
    expect(sanitizeTotpInput('')).toBe('');
    expect(sanitizeTotpInput('abcdef')).toBe('');
  });

  it('preserves all-digit input unchanged', () => {
    expect(sanitizeTotpInput('123456')).toBe('123456');
  });

  it('strips spaces and special characters', () => {
    expect(sanitizeTotpInput('1 2 3 4 5 6')).toBe('123456');
    expect(sanitizeTotpInput('12-34-56')).toBe('123456');
  });
});

describe('buildOtpAuthUri', () => {
  it('builds a correct otpauth URI', () => {
    const uri = buildOtpAuthUri('JBSWY3DPEHPK3PXP', 'user@example.com', 'AWS Transfer Portal');
    expect(uri).toBe(
      'otpauth://totp/AWS%20Transfer%20Portal:user%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=AWS%20Transfer%20Portal'
    );
  });

  it('starts with otpauth://totp/', () => {
    const uri = buildOtpAuthUri('SECRET', 'a@b.com', 'MyApp');
    expect(uri.startsWith('otpauth://totp/')).toBe(true);
  });

  it('includes the secret parameter', () => {
    const uri = buildOtpAuthUri('ABCDEF', 'a@b.com', 'MyApp');
    expect(uri).toContain('secret=ABCDEF');
  });

  it('includes the issuer parameter', () => {
    const uri = buildOtpAuthUri('SECRET', 'a@b.com', 'MyApp');
    expect(uri).toContain('issuer=MyApp');
  });

  it('encodes special characters in email and issuer', () => {
    const uri = buildOtpAuthUri('SECRET', 'user+test@example.com', 'My App & Co');
    expect(uri).toContain(encodeURIComponent('user+test@example.com'));
    expect(uri).toContain(encodeURIComponent('My App & Co'));
  });
});

/**
 * Utility functions for TOTP code input validation and OTP Auth URI construction.
 */

/**
 * Checks if a string is a valid TOTP code (exactly 6 digits).
 * @param code The string to validate
 * @returns true if the string is exactly 6 digit characters
 */
export function isValidTotpCode(code: string): boolean {
  return /^\d{6}$/.test(code);
}

/**
 * Strips all non-digit characters from the input string.
 * @param input The raw user input
 * @returns A string containing only digit characters in their original order
 */
export function sanitizeTotpInput(input: string): string {
  return input.replace(/\D/g, '');
}

/**
 * Builds an otpauth URI for QR code generation.
 * @param secret The base32-encoded TOTP secret
 * @param email The user's email address
 * @param issuer The application name
 * @returns A properly formatted otpauth URI
 */
export function buildOtpAuthUri(secret: string, email: string, issuer: string): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedEmail = encodeURIComponent(email);
  return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${encodeURIComponent(secret)}&issuer=${encodedIssuer}`;
}

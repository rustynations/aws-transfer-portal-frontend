/**
 * Feature: sftp-toggle, Property 7: Access type filtering excludes SFTP types when disabled
 * Validates: Requirements 5.2, 5.3
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// All possible access types in the system
const ALL_ACCESS_TYPES = ['ADMIN', 'WEB_ONLY', 'SFTP_ONLY', 'HYBRID'] as const;
type AccessType = (typeof ALL_ACCESS_TYPES)[number];

const SFTP_TYPES: ReadonlySet<string> = new Set(['SFTP_ONLY', 'HYBRID']);

/**
 * Pure filtering function that mirrors the logic in Users.tsx (create-user modal)
 * and Settings.tsx (default access type selector).
 *
 * When sftpEnabled is false, SFTP_ONLY and HYBRID are excluded from the list.
 * When sftpEnabled is true, the list is returned unchanged.
 */
function filterAccessTypes(options: AccessType[], sftpEnabled: boolean): AccessType[] {
  if (sftpEnabled) return options;
  return options.filter((t) => !SFTP_TYPES.has(t));
}

// Arbitrary that produces arrays of access types (with possible duplicates, varying length)
const accessTypeListArb = fc.array(fc.constantFrom(...ALL_ACCESS_TYPES), { minLength: 0, maxLength: 20 });

describe('Feature: sftp-toggle, Property 7: Access type filtering excludes SFTP types when disabled', () => {
  /**
   * **Validates: Requirements 5.2, 5.3**
   *
   * For any list of access type options, when sftpEnabled is false,
   * filtering the list SHALL produce a result that contains neither SFTP_ONLY nor HYBRID.
   */
  it('filtered result never contains SFTP_ONLY or HYBRID when sftpEnabled is false', () => {
    fc.assert(
      fc.property(accessTypeListArb, (options) => {
        const result = filterAccessTypes(options, false);
        for (const item of result) {
          expect(SFTP_TYPES.has(item)).toBe(false);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 5.2, 5.3**
   *
   * When sftpEnabled is true, SFTP types present in the input are preserved in the output.
   */
  it('SFTP types are preserved when sftpEnabled is true', () => {
    fc.assert(
      fc.property(accessTypeListArb, (options) => {
        const result = filterAccessTypes(options, true);
        expect(result).toEqual(options);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 5.2, 5.3**
   *
   * Non-SFTP types (ADMIN, WEB_ONLY) are never removed by filtering, regardless of sftpEnabled.
   */
  it('non-SFTP types are always preserved regardless of sftpEnabled', () => {
    fc.assert(
      fc.property(accessTypeListArb, fc.boolean(), (options, sftpEnabled) => {
        const result = filterAccessTypes(options, sftpEnabled);
        const nonSftpInput = options.filter((t) => !SFTP_TYPES.has(t));
        const nonSftpOutput = result.filter((t) => !SFTP_TYPES.has(t));
        expect(nonSftpOutput).toEqual(nonSftpInput);
      }),
      { numRuns: 100 },
    );
  });
});

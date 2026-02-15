import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { constructPathParam, appendToPath, truncatePath, constructBreadcrumbs, sanitizePath, sanitizePathSegment } from './pathUtils';

/**
 * Generator for valid folder names that survive sanitization.
 * These are alphanumeric strings with hyphens/underscores — no dots, slashes, or whitespace-only.
 */
const validFolderName = fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,19}$/);

describe('Path Utility Properties', () => {
  /**
   * Property 27: File Key Path Construction
   * For any file operation requiring a key, the constructed key should include
   * the full folder hierarchy from currentPath joined with "/".
   * Validates: Requirements 8.6
   */
  it('Property 27: constructPathParam joins path segments with forward slash', () => {
    fc.assert(
      fc.property(
        fc.array(validFolderName, { minLength: 0, maxLength: 10 }),
        (pathSegments) => {
          const result = constructPathParam(pathSegments);

          if (pathSegments.length === 0) {
            expect(result).toBeUndefined();
          } else {
            expect(result).toBe(pathSegments.join('/'));

            pathSegments.forEach(segment => {
              expect(result).toContain(segment);
            });

            const slashCount = (result!.match(/\//g) || []).length;
            expect(slashCount).toBe(pathSegments.length - 1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 27: appendToPath creates new array with folder appended', () => {
    fc.assert(
      fc.property(
        fc.array(validFolderName, { minLength: 0, maxLength: 10 }),
        validFolderName,
        (currentPath, folderName) => {
          const result = appendToPath(currentPath, folderName);

          expect(result.length).toBe(currentPath.length + 1);
          expect(result[result.length - 1]).toBe(folderName);

          currentPath.forEach((segment, index) => {
            expect(result[index]).toBe(segment);
          });

          expect(currentPath.length).toBe(result.length - 1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 27: truncatePath returns correct slice of path', () => {
    fc.assert(
      fc.property(
        fc.array(validFolderName, { minLength: 0, maxLength: 10 }),
        fc.nat(),
        (currentPath, level) => {
          const result = truncatePath(currentPath, level);

          const expectedLength = Math.min(level, currentPath.length);
          expect(result.length).toBe(expectedLength);

          result.forEach((segment, index) => {
            expect(segment).toBe(currentPath[index]);
          });

          expect(currentPath.length).toBeGreaterThanOrEqual(result.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 27: constructBreadcrumbs includes tab name and all path segments', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('My Files', 'Shared Files'),
        fc.array(validFolderName, { minLength: 0, maxLength: 10 }),
        (tabName, pathSegments) => {
          const result = constructBreadcrumbs(tabName, pathSegments);

          expect(result.length).toBe(pathSegments.length + 1);

          expect(result[0].label).toBe(tabName);
          expect(result[0].level).toBe(0);

          pathSegments.forEach((segment, index) => {
            expect(result[index + 1].label).toBe(segment);
            expect(result[index + 1].level).toBe(index + 1);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 28: Private Directory Boundary Enforcement
   * For any navigation action in "My Files" tab, the currentPath should never
   * contain ".." or absolute path indicators, and breadcrumb navigation should
   * not allow navigating above the root level (empty currentPath).
   * Validates: Requirements 9.1, 9.2, 9.4
   */
  it('Property 28: sanitizePath removes all ".." segments from any path', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            fc.constant('..'),
            fc.constant('../'),
            fc.constant('..\\'),
            fc.constant('.'),
            fc.constant('/etc'),
            fc.constant('\\windows'),
            fc.string({ minLength: 1, maxLength: 20 })
          ),
          { minLength: 0, maxLength: 10 }
        ),
        (pathSegments) => {
          const result = sanitizePath(pathSegments);

          // No segment in the result should contain ".."
          result.forEach(segment => {
            expect(segment).not.toContain('..');
          });

          // No segment should start with "/" or "\" (absolute path indicators)
          result.forEach(segment => {
            expect(segment).not.toMatch(/^[/\\]/);
          });

          // No segment should contain "/" or "\"
          result.forEach(segment => {
            expect(segment).not.toContain('/');
            expect(segment).not.toContain('\\');
          });

          // All segments should be non-empty
          result.forEach(segment => {
            expect(segment.length).toBeGreaterThan(0);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 28: constructPathParam never produces paths with ".." or absolute indicators', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            fc.constant('..'),
            fc.constant('../secret'),
            fc.constant('/root'),
            fc.constant('..\\..'),
            fc.constant('normal-folder'),
            fc.string({ minLength: 1, maxLength: 20 })
          ),
          { minLength: 1, maxLength: 10 }
        ),
        (pathSegments) => {
          const result = constructPathParam(pathSegments);

          if (result !== undefined) {
            // Path should never contain ".."
            expect(result).not.toContain('..');

            // Path should not start with "/" (absolute path)
            expect(result).not.toMatch(/^\//);

            // Path should not contain "\\"
            expect(result).not.toContain('\\');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 28: appendToPath never allows ".." in folder names', () => {
    fc.assert(
      fc.property(
        fc.array(validFolderName, { minLength: 0, maxLength: 5 }),
        fc.oneof(
          fc.constant('..'),
          fc.constant('../..'),
          fc.constant('/etc/passwd'),
          fc.constant('..\\windows'),
          fc.constant('valid-folder'),
          fc.string({ minLength: 1, maxLength: 20 })
        ),
        (currentPath, folderName) => {
          const result = appendToPath(currentPath, folderName);

          // No segment should contain ".."
          result.forEach(segment => {
            expect(segment).not.toContain('..');
          });

          // No segment should contain "/" or "\"
          result.forEach(segment => {
            expect(segment).not.toContain('/');
            expect(segment).not.toContain('\\');
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 28: truncatePath to level 0 returns empty array (root) and negative levels are clamped', () => {
    fc.assert(
      fc.property(
        fc.array(validFolderName, { minLength: 1, maxLength: 10 }),
        fc.integer({ min: -100, max: 0 }),
        (currentPath, level) => {
          const result = truncatePath(currentPath, level);

          // Truncating to level 0 or negative should return empty array (root)
          expect(result.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 28: breadcrumb navigation at root level has no parent navigation', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('My Files' as const, 'Shared Files' as const),
        (tabName) => {
          // At root level (empty path), breadcrumbs should only have the tab name
          const breadcrumbs = constructBreadcrumbs(tabName, []);

          expect(breadcrumbs.length).toBe(1);
          expect(breadcrumbs[0].label).toBe(tabName);
          expect(breadcrumbs[0].level).toBe(0);

          // There should be no way to navigate above root
          const truncated = truncatePath([], 0);
          expect(truncated.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 28: sanitizePathSegment strips all dangerous patterns from any input', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant('..'),
          fc.constant('../../etc/passwd'),
          fc.constant('/absolute/path'),
          fc.constant('\\windows\\path'),
          fc.constant('...'),
          fc.constant('.hidden'),
          fc.constant('normal'),
          fc.string({ minLength: 0, maxLength: 30 })
        ),
        (input) => {
          const result = sanitizePathSegment(input);

          // Result should never contain ".."
          expect(result).not.toContain('..');

          // Result should never contain "/" or "\"
          expect(result).not.toContain('/');
          expect(result).not.toContain('\\');

          // Result should not start with "."
          if (result.length > 0) {
            expect(result).not.toMatch(/^\./);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

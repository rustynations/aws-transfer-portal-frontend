/**
 * Utility functions for path manipulation in the file browser
 */

/**
 * Sanitizes a single path segment by removing dangerous characters and patterns.
 * Strips "..", leading/trailing slashes, and absolute path indicators.
 * @param segment A single folder name
 * @returns Sanitized segment, or empty string if invalid
 */
export function sanitizePathSegment(segment: string): string {
  if (!segment || typeof segment !== 'string') {
    return '';
  }

  // Remove any ".." sequences (directory traversal)
  let sanitized = segment.replace(/\.\./g, '');

  // Remove forward and back slashes
  sanitized = sanitized.replace(/[/\\]/g, '');

  // Remove leading dots that could indicate hidden/relative paths
  sanitized = sanitized.replace(/^\.+/, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Sanitizes an entire path array, removing dangerous segments.
 * Filters out empty segments, ".." entries, and absolute path indicators.
 * @param pathSegments Array of folder names
 * @returns Sanitized path array with no traversal or absolute path indicators
 */
export function sanitizePath(pathSegments: string[]): string[] {
  return pathSegments
    .map(sanitizePathSegment)
    .filter(segment => segment.length > 0);
}

/**
 * Constructs a path parameter from an array of folder names.
 * Sanitizes the path to prevent directory traversal.
 * @param pathSegments Array of folder names (e.g., ['Documents', 'Reports'])
 * @returns Path string (e.g., 'Documents/Reports') or undefined if empty
 */
export function constructPathParam(pathSegments: string[]): string | undefined {
  const sanitized = sanitizePath(pathSegments);
  if (sanitized.length === 0) {
    return undefined;
  }
  return sanitized.join('/');
}

/**
 * Appends a folder name to the current path.
 * Sanitizes the folder name before appending.
 * @param currentPath Current path segments
 * @param folderName Folder name to append
 * @returns New path array with sanitized folder appended
 */
export function appendToPath(currentPath: string[], folderName: string): string[] {
  const sanitizedFolder = sanitizePathSegment(folderName);
  if (sanitizedFolder.length === 0) {
    return [...currentPath];
  }
  return [...sanitizePath(currentPath), sanitizedFolder];
}

/**
 * Truncates path to a specific level.
 * Level is clamped to >= 0 to prevent navigating above root.
 * @param currentPath Current path segments
 * @param level Level to truncate to (0 = root)
 * @returns New path array truncated to level
 */
export function truncatePath(currentPath: string[], level: number): string[] {
  const safeLevel = Math.max(0, level);
  return sanitizePath(currentPath).slice(0, safeLevel);
}

/**
 * Constructs a display path for breadcrumbs.
 * Sanitizes path segments and ensures root level is always present.
 * @param tabName Name of the active tab ('My Files' or 'Shared Files')
 * @param pathSegments Current path segments
 * @returns Array of breadcrumb items with labels
 */
export function constructBreadcrumbs(
  tabName: string,
  pathSegments: string[]
): Array<{ label: string; level: number }> {
  const breadcrumbs = [{ label: tabName, level: 0 }];
  
  const sanitized = sanitizePath(pathSegments);
  
  sanitized.forEach((segment, index) => {
    breadcrumbs.push({
      label: segment,
      level: index + 1,
    });
  });
  
  return breadcrumbs;
}

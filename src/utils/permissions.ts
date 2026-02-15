import type { FolderType } from './api';

/**
 * Operation types that can be performed on files and folders
 */
export type OperationType = 'upload' | 'delete' | 'createFolder' | 'download';

/**
 * Determines if an operation is allowed based on the current tab and shared folder permissions
 * 
 * @param operation - The operation to check ('upload', 'delete', 'createFolder', 'download')
 * @param activeTab - The currently active tab ('private' or 'shared')
 * @param sharedPermissions - The permissions for shared folders ('read-only' or 'read-write')
 * @returns true if the operation is allowed, false otherwise
 */
export function isOperationAllowed(
  operation: OperationType,
  activeTab: FolderType,
  sharedPermissions: 'read-only' | 'read-write'
): boolean {
  // Download is always allowed
  if (operation === 'download') {
    return true;
  }

  // Private tab: all operations allowed
  if (activeTab === 'private') {
    return true;
  }

  // Shared tab: depends on permissions
  if (activeTab === 'shared') {
    return sharedPermissions === 'read-write';
  }

  return false;
}

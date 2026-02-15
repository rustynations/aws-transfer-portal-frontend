import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { isOperationAllowed, type OperationType } from './permissions';
import type { FolderType } from './api';

describe('permissions - Property-Based Tests', () => {
  /**
   * Property 25: Permission-Based Button Enablement
   * 
   * For any combination of activeTab ("private" or "shared") and sharedFolderPermissions 
   * ("read-only" or "read-write"), the upload, delete, and create folder buttons should be 
   * enabled if and only if: (activeTab === "private") OR (activeTab === "shared" AND 
   * sharedFolderPermissions === "read-write"). The download button should always be enabled.
   * 
   * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
   */
  it('Property 25: Permission-Based Button Enablement', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<FolderType>('private', 'shared'),
        fc.constantFrom<'read-only' | 'read-write'>('read-only', 'read-write'),
        fc.constantFrom<OperationType>('upload', 'delete', 'createFolder', 'download'),
        (activeTab, sharedPermissions, operation) => {
          const result = isOperationAllowed(operation, activeTab, sharedPermissions);

          // Download should always be allowed
          if (operation === 'download') {
            expect(result).toBe(true);
            return true;
          }

          // For modification operations (upload, delete, createFolder)
          const expectedResult = 
            activeTab === 'private' || 
            (activeTab === 'shared' && sharedPermissions === 'read-write');

          expect(result).toBe(expectedResult);
          return result === expectedResult;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Additional unit tests for clarity
  it('should allow all operations on private tab', () => {
    expect(isOperationAllowed('upload', 'private', 'read-only')).toBe(true);
    expect(isOperationAllowed('delete', 'private', 'read-only')).toBe(true);
    expect(isOperationAllowed('createFolder', 'private', 'read-only')).toBe(true);
    expect(isOperationAllowed('download', 'private', 'read-only')).toBe(true);
  });

  it('should allow all operations on shared tab with read-write permissions', () => {
    expect(isOperationAllowed('upload', 'shared', 'read-write')).toBe(true);
    expect(isOperationAllowed('delete', 'shared', 'read-write')).toBe(true);
    expect(isOperationAllowed('createFolder', 'shared', 'read-write')).toBe(true);
    expect(isOperationAllowed('download', 'shared', 'read-write')).toBe(true);
  });

  it('should only allow download on shared tab with read-only permissions', () => {
    expect(isOperationAllowed('upload', 'shared', 'read-only')).toBe(false);
    expect(isOperationAllowed('delete', 'shared', 'read-only')).toBe(false);
    expect(isOperationAllowed('createFolder', 'shared', 'read-only')).toBe(false);
    expect(isOperationAllowed('download', 'shared', 'read-only')).toBe(true);
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as fc from 'fast-check';
import FileListHeader from './FileListHeader';
import type { FolderType } from '../utils/api';

describe('FileListHeader - Property-Based Tests', () => {
  /**
   * Property 4: Refresh Button Presence
   * 
   * For any tab state ("private" or "shared"), the Files_Component should render a refresh button.
   * 
   * Validates: Requirements 1.5
   */
  it('Property 4: Refresh Button Presence', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<FolderType>('private', 'shared'),
        fc.constantFrom<'read-only' | 'read-write'>('read-only', 'read-write'),
        (activeTab, sharedPermissions) => {
          const { unmount } = render(
            <FileListHeader
              activeTab={activeTab}
              sharedFolderPermissions={sharedPermissions}
              itemCount={0}
              hasSelection={false}
              onRefresh={vi.fn()}
              onCreateFolder={vi.fn()}
              onUpload={vi.fn()}
              onDownload={vi.fn()}
              onDelete={vi.fn()}
            />
          );

          // Refresh button should always be present
          const refreshButton = screen.getByRole('button', { name: /refresh/i });
          expect(refreshButton).toBeInTheDocument();
          expect(refreshButton).not.toBeDisabled();

          unmount();
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 5: Refresh Preserves Context
   * 
   * For any current state (activeTab, currentPath), clicking refresh should trigger 
   * a File_List_API call with the same Folder_Parameter and Path_Parameter.
   * 
   * Note: This test verifies that the refresh callback is invoked when the button is clicked.
   * The actual API call verification is done at the integration level in Files.tsx tests.
   * 
   * Validates: Requirements 1.6
   */
  it('Property 5: Refresh Preserves Context - callback invocation', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<FolderType>('private', 'shared'),
        fc.constantFrom<'read-only' | 'read-write'>('read-only', 'read-write'),
        (activeTab, sharedPermissions) => {
          const onRefresh = vi.fn();
          
          const { unmount } = render(
            <FileListHeader
              activeTab={activeTab}
              sharedFolderPermissions={sharedPermissions}
              itemCount={0}
              hasSelection={false}
              onRefresh={onRefresh}
              onCreateFolder={vi.fn()}
              onUpload={vi.fn()}
              onDownload={vi.fn()}
              onDelete={vi.fn()}
            />
          );

          const refreshButton = screen.getByRole('button', { name: /refresh/i });
          refreshButton.click();

          // Verify the refresh callback was invoked
          expect(onRefresh).toHaveBeenCalledTimes(1);

          unmount();
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Test permission-based button enablement for create folder, upload, and delete buttons
   */
  it('should enable/disable buttons based on permissions', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<FolderType>('private', 'shared'),
        fc.constantFrom<'read-only' | 'read-write'>('read-only', 'read-write'),
        fc.boolean(),
        (activeTab, sharedPermissions, hasSelection) => {
          const { unmount } = render(
            <FileListHeader
              activeTab={activeTab}
              sharedFolderPermissions={sharedPermissions}
              itemCount={0}
              hasSelection={hasSelection}
              onRefresh={vi.fn()}
              onCreateFolder={vi.fn()}
              onUpload={vi.fn()}
              onDownload={vi.fn()}
              onDelete={vi.fn()}
            />
          );

          const createFolderButton = screen.getByRole('button', { name: /create folder/i });
          const uploadButton = screen.getByRole('button', { name: /upload/i });
          const deleteButton = screen.getByRole('button', { name: /delete/i });
          const downloadButton = screen.getByRole('button', { name: /download/i });

          // Expected enablement based on permissions
          const shouldEnableModifications = 
            activeTab === 'private' || 
            (activeTab === 'shared' && sharedPermissions === 'read-write');

          // Create folder and upload should follow permission rules
          expect(createFolderButton.hasAttribute('disabled')).toBe(!shouldEnableModifications);
          expect(uploadButton.hasAttribute('disabled')).toBe(!shouldEnableModifications);

          // Delete should follow permission rules AND require selection
          const shouldEnableDelete = shouldEnableModifications && hasSelection;
          expect(deleteButton.hasAttribute('disabled')).toBe(!shouldEnableDelete);

          // Download should only require selection
          expect(downloadButton.hasAttribute('disabled')).toBe(!hasSelection);

          unmount();
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });
});

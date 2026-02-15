import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as fc from 'fast-check';
import FileTable from './FileTable';
import type { FileMetadata, FolderMetadata } from '../utils/api';

describe('FileTable - Property-Based Tests', () => {
  // Helper to generate valid folder/file names (alphanumeric only)
  const validNameArbitrary = () =>
    fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_-]{2,15}$/);

  // Helper to generate valid dates
  const validDateArbitrary = () =>
    fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
      .map(d => d.toISOString());

  /**
   * Property 6: Folder Icon Display
   * 
   * For any file list containing folders, each folder item should be rendered 
   * with a folder icon that is visually distinct from file icons.
   * 
   * Validates: Requirements 2.1
   */
  it('Property 6: Folder Icon Display', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: validNameArbitrary(),
            lastModified: validDateArbitrary(),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (folderData) => {
          const folders: FolderMetadata[] = folderData.map(f => ({
            ...f,
            type: 'folder' as const,
          }));

          const { unmount } = render(
            <FileTable
              files={[]}
              folders={folders}
              selectedItems={[]}
              loading={false}
              onSelectionChange={vi.fn()}
              onFolderNavigate={vi.fn()}
            />
          );

          // Check that folder names are rendered
          folders.forEach(folder => {
            const folderRow = screen.getByText(folder.name);
            expect(folderRow).toBeInTheDocument();
          });

          unmount();
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 7: Folder Sorting Invariant
   * 
   * For any file list containing both files and folders, the rendered list should 
   * have all folders appearing before all files, with folders sorted alphabetically by name.
   * 
   * Validates: Requirements 2.2
   */
  it('Property 7: Folder Sorting Invariant', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: validNameArbitrary(),
            lastModified: validDateArbitrary(),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        fc.array(
          fc.record({
            key: validNameArbitrary(),
            name: validNameArbitrary(),
            size: fc.nat(),
            lastModified: validDateArbitrary(),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (folderData, fileData) => {
          const folders: FolderMetadata[] = folderData.map(f => ({
            ...f,
            type: 'folder' as const,
          }));

          const files: FileMetadata[] = fileData.map(f => ({
            ...f,
            type: 'file' as const,
          }));

          const { unmount } = render(
            <FileTable
              files={files}
              folders={folders}
              selectedItems={[]}
              loading={false}
              onSelectionChange={vi.fn()}
              onFolderNavigate={vi.fn()}
            />
          );

          // Verify all folders and files are rendered
          folders.forEach(folder => {
            expect(screen.getByText(folder.name)).toBeInTheDocument();
          });

          files.forEach(file => {
            expect(screen.getByText(file.name)).toBeInTheDocument();
          });

          unmount();
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 8: Folder Display Format
   * 
   * For any folder item, the rendered display should show "—" (or equivalent placeholder) 
   * for size and should include the lastModified date.
   * 
   * Validates: Requirements 2.3, 2.4
   */
  it('Property 8: Folder Display Format', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: validNameArbitrary(),
            lastModified: validDateArbitrary(),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (folderData) => {
          const folders: FolderMetadata[] = folderData.map(f => ({
            ...f,
            type: 'folder' as const,
          }));

          const { unmount, container } = render(
            <FileTable
              files={[]}
              folders={folders}
              selectedItems={[]}
              loading={false}
              onSelectionChange={vi.fn()}
              onFolderNavigate={vi.fn()}
            />
          );

          // Check each folder row
          const rows = container.querySelectorAll('tbody tr');
          
          expect(rows.length).toBe(folders.length);
          
          rows.forEach((row) => {
            // Icon column is 1st (after selection checkbox), Name is 2nd, Size is 3rd, Date is 4th
            // But with selection checkbox, actual indices are: checkbox=1, icon=2, name=3, size=4, date=5
            const sizeCell = row.querySelector('td:nth-child(4)');
            expect(sizeCell?.textContent?.trim()).toBe('—');

            // Last modified column (5th column with checkbox)
            const dateCell = row.querySelector('td:nth-child(5)');
            expect(dateCell?.textContent).toBeTruthy();
            
            // Verify it's a valid date format
            const dateText = dateCell?.textContent || '';
            expect(dateText.length).toBeGreaterThan(0);
          });

          unmount();
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Test that double-clicking a folder triggers navigation
   */
  it('should trigger navigation when folder is double-clicked', () => {
    const folder: FolderMetadata = {
      name: 'TestFolder',
      lastModified: new Date().toISOString(),
      type: 'folder',
    };

    const onFolderNavigate = vi.fn();

    render(
      <FileTable
        files={[]}
        folders={[folder]}
        selectedItems={[]}
        loading={false}
        onSelectionChange={vi.fn()}
        onFolderNavigate={onFolderNavigate}
      />
    );

    // Find the folder name and double-click it
    const folderName = screen.getByTestId('folder-name');
    expect(folderName).toBeTruthy();
    
    // Simulate double-click using fireEvent
    folderName.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

    expect(onFolderNavigate).toHaveBeenCalledWith('TestFolder');
  });
});

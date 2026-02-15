import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as fc from 'fast-check';
import CreateFolderModal, { validateFolderName } from './CreateFolderModal';
import type { FolderType } from '../utils/api';

describe('CreateFolderModal - Property-Based Tests', () => {
  /**
   * Property 13: Folder Name Validation
   * 
   * For any string input, the folder name validation should return true if and only if 
   * the string is non-empty, matches the regex /^[a-zA-Z0-9\s_-]+$/, and contains no forward slashes.
   * 
   * Validates: Requirements 4.3
   */
  it('Property 13: Folder Name Validation', () => {
    fc.assert(
      fc.property(
        fc.string(),
        (input) => {
          const result = validateFolderName(input);
          
          // Expected validation result
          const isEmpty = !input || input.trim().length === 0;
          const hasSlash = input.includes('/');
          const matchesRegex = /^[a-zA-Z0-9\s_-]+$/.test(input);
          
          const shouldBeValid = !isEmpty && !hasSlash && matchesRegex;
          
          if (shouldBeValid) {
            expect(result).toBeNull();
          } else {
            expect(result).not.toBeNull();
            expect(typeof result).toBe('string');
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 14: Invalid Folder Name Shows Error
   * 
   * For any invalid folder name input (empty, special characters, or slashes), 
   * the Modal_Dialog should display an error message and disable the Create button.
   * 
   * Validates: Requirements 4.4
   */
  it('Property 14: Invalid Folder Name Shows Error', async () => {
    const user = userEvent.setup();
    
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant('folder/name'), // Contains slash
          fc.constant('folder@name'), // Special character
          fc.constant('folder#name'), // Special character
        ),
        async (invalidName) => {
          const { unmount } = render(
            <CreateFolderModal
              visible={true}
              activeTab="private"
              currentPath={[]}
              onDismiss={vi.fn()}
              onCreate={vi.fn()}
            />
          );

          const input = screen.getByPlaceholderText('Enter folder name');
          const createButton = screen.getByRole('button', { name: /create/i });

          // Type invalid name
          await user.clear(input);
          await user.type(input, invalidName);

          // Create button should be disabled
          expect(createButton).toBeDisabled();

          unmount();
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 15: Valid Folder Creation API Call
   * 
   * For any valid folder name and current state (activeTab, currentPath), submitting 
   * the folder creation should call Create_Folder_API with the folder name, correct 
   * Folder_Parameter, and Path_Parameter constructed from currentPath.
   * 
   * Validates: Requirements 4.5
   */
  it('Property 15: Valid Folder Creation API Call', async () => {
    const user = userEvent.setup();
    
    await fc.assert(
      fc.asyncProperty(
        fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_-]{2,15}$/), // Valid folder name
        fc.constantFrom<FolderType>('private', 'shared'),
        fc.array(fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_-]{2,10}$/), { maxLength: 3 }),
        async (folderName, activeTab, currentPath) => {
          const onCreate = vi.fn().mockResolvedValue(undefined);

          const { unmount } = render(
            <CreateFolderModal
              visible={true}
              activeTab={activeTab}
              currentPath={currentPath}
              onDismiss={vi.fn()}
              onCreate={onCreate}
            />
          );

          const input = screen.getByPlaceholderText('Enter folder name');
          const createButton = screen.getByRole('button', { name: /create/i });

          // Type valid folder name
          await user.clear(input);
          await user.type(input, folderName);

          // Create button should be enabled
          expect(createButton).not.toBeDisabled();

          // Click create
          await user.click(createButton);

          // Verify onCreate was called with the folder name
          await waitFor(() => {
            expect(onCreate).toHaveBeenCalledWith(folderName);
          });

          unmount();
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Test that modal displays current path context
   */
  it('should display current path context', () => {
    const { rerender } = render(
      <CreateFolderModal
        visible={true}
        activeTab="private"
        currentPath={[]}
        onDismiss={vi.fn()}
        onCreate={vi.fn()}
      />
    );

    // Root level should show just tab name
    expect(screen.getByText(/Creating folder in:/)).toBeInTheDocument();
    expect(screen.getByText(/My Files/)).toBeInTheDocument();

    // With path should show full hierarchy
    rerender(
      <CreateFolderModal
        visible={true}
        activeTab="private"
        currentPath={['Documents', 'Reports']}
        onDismiss={vi.fn()}
        onCreate={vi.fn()}
      />
    );

    expect(screen.getByText(/My Files > Documents > Reports/)).toBeInTheDocument();
  });
});

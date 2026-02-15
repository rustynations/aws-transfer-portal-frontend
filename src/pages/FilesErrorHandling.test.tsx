import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import FilesPage from './Files';
import { categorizeError } from '../hooks/useNotifications';

vi.mock('../utils/api', () => ({
  listFiles: vi.fn().mockResolvedValue({ files: [], folders: [], count: 0, totalSize: 0 }),
  getUploadUrl: vi.fn().mockResolvedValue({ uploadUrl: 'https://s3.example.com/upload', key: 'k' }),
  getDownloadUrl: vi.fn().mockResolvedValue({ downloadUrl: 'https://s3.example.com/download' }),
  deleteFile: vi.fn().mockResolvedValue(undefined),
  deleteFolder: vi.fn().mockResolvedValue(undefined),
  createFolder: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../utils/auth', () => ({ getIdToken: vi.fn().mockResolvedValue('t') }));
vi.mock('../config', () => ({
  config: { apiEndpoint: 'https://a.com', userPoolId: 'x', userPoolClientId: 'x', region: 'us-east-1', transferEndpoint: 'x' },
}));

function selectRow(name: string) {
  const row = screen.getByText(name).closest('tr')!;
  fireEvent.click(within(row).getByRole('checkbox'));
}

function headerDeleteButton(): HTMLElement {
  return screen.getAllByRole('button', { name: /^delete$/i }).find(b => !b.closest('[role="dialog"]'))!;
}

describe('categorizeError utility', () => {
  /** Validates: Requirements 4.7, 6.4 */

  it('categorizes network errors as persistent', () => {
    const result = categorizeError({ message: 'Failed to fetch' });
    expect(result.message).toBe('Unable to connect to server. Please check your connection and try again.');
    expect(result.persistent).toBe(true);
  });

  it('categorizes "Load failed" as network error', () => {
    const result = categorizeError({ message: 'Load failed' });
    expect(result.message).toContain('Unable to connect');
    expect(result.persistent).toBe(true);
  });

  it('categorizes "unable to connect" as network error', () => {
    const result = categorizeError({ message: 'unable to connect to server' });
    expect(result.message).toContain('Unable to connect');
    expect(result.persistent).toBe(true);
  });

  it('categorizes permission denied (403) as persistent', () => {
    const result = categorizeError({ message: 'Forbidden', statusCode: 403 });
    expect(result.message).toBe("You don't have permission to perform this operation");
    expect(result.persistent).toBe(true);
  });

  it('categorizes "permission denied" message as persistent', () => {
    const result = categorizeError({ message: 'Permission denied' });
    expect(result.message).toBe("You don't have permission to perform this operation");
    expect(result.persistent).toBe(true);
  });

  it('categorizes non-empty folder error', () => {
    const result = categorizeError({ message: 'Folder is not empty' });
    expect(result.message).toBe('Cannot delete folder: folder contains files or subfolders');
    expect(result.persistent).toBe(false);
  });

  it('categorizes "contains files" error', () => {
    const result = categorizeError({ message: 'Directory contains files' });
    expect(result.message).toBe('Cannot delete folder: folder contains files or subfolders');
    expect(result.persistent).toBe(false);
  });

  it('categorizes "already exists" error', () => {
    const result = categorizeError({ message: 'Folder already exists' });
    expect(result.message).toBe('A folder with this name already exists');
    expect(result.persistent).toBe(false);
  });

  it('passes through generic error messages', () => {
    const result = categorizeError({ message: 'Something went wrong' });
    expect(result.message).toBe('Something went wrong');
    expect(result.persistent).toBe(false);
  });

  it('returns fallback for unknown errors', () => {
    const result = categorizeError({});
    expect(result.message).toBe('An error occurred. Please try again.');
    expect(result.persistent).toBe(false);
  });

  it('handles null/undefined errors', () => {
    const result = categorizeError(null);
    expect(result.message).toBe('An error occurred. Please try again.');
    expect(result.persistent).toBe(false);
  });
});


describe('FilesPage error display - validation errors (Req 4.4)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('disables Create button when folder name is empty', async () => {
    const { listFiles } = await import('../utils/api');
    vi.mocked(listFiles).mockResolvedValue({ files: [], folders: [], count: 0, totalSize: 0 });

    render(<FilesPage />);
    await waitFor(() => expect(listFiles).toHaveBeenCalled());

    // Open create folder modal
    fireEvent.click(screen.getByRole('button', { name: /create folder/i }));
    await waitFor(() => expect(screen.getByText(/creating folder in/i)).toBeInTheDocument());

    // Create button should be disabled when name is empty
    const dialog = screen.getByRole('dialog', { name: /create folder/i });
    const createBtn = within(dialog).getByRole('button', { name: /^create$/i });
    expect(createBtn).toBeDisabled();
  });

  it('disables Create button for folder name with special characters', async () => {
    const { listFiles } = await import('../utils/api');
    vi.mocked(listFiles).mockResolvedValue({ files: [], folders: [], count: 0, totalSize: 0 });

    render(<FilesPage />);
    await waitFor(() => expect(listFiles).toHaveBeenCalled());

    // Open create folder modal
    fireEvent.click(screen.getByRole('button', { name: /create folder/i }));
    await waitFor(() => expect(screen.getByText(/creating folder in/i)).toBeInTheDocument());

    // Type invalid name using native input event
    const input = screen.getByPlaceholderText(/enter folder name/i);
    fireEvent.input(input, { target: { value: 'bad@name!' } });

    // Create button should remain disabled for invalid input
    const dialog = screen.getByRole('dialog', { name: /create folder/i });
    const createBtn = within(dialog).getByRole('button', { name: /^create$/i });
    expect(createBtn).toBeDisabled();
  });
});

describe('FilesPage error display - API errors (Req 4.7)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows error in Flashbar when folder creation API fails', async () => {
    const { listFiles, createFolder } = await import('../utils/api');
    vi.mocked(listFiles).mockResolvedValue({ files: [], folders: [], count: 0, totalSize: 0 });
    vi.mocked(createFolder).mockRejectedValue(new Error('A folder with this name already exists'));

    render(<FilesPage />);
    await waitFor(() => expect(listFiles).toHaveBeenCalled());

    // Open create folder modal
    fireEvent.click(screen.getByRole('button', { name: /create folder/i }));
    await waitFor(() => expect(screen.getByText(/creating folder in/i)).toBeInTheDocument());

    // Type a valid name using native input event
    const input = screen.getByPlaceholderText(/enter folder name/i);
    fireEvent.input(input, { target: { value: 'TestFolder' } });

    const dialog = screen.getByRole('dialog', { name: /create folder/i });
    fireEvent.click(within(dialog).getByRole('button', { name: /^create$/i }));

    // Error should appear in the modal (CreateFolderModal catches and displays the error)
    await waitFor(() => {
      expect(screen.getByText(/already exists/i)).toBeInTheDocument();
    });
  });

  it('shows error in Flashbar when file list loading fails', async () => {
    const { listFiles } = await import('../utils/api');
    vi.mocked(listFiles).mockRejectedValue(new Error('Server error'));

    render(<FilesPage />);

    await waitFor(() => {
      expect(screen.getByText(/server error/i)).toBeInTheDocument();
    });
  });
});

describe('FilesPage error display - network errors', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows network error message when listFiles fails with network error', async () => {
    const { listFiles } = await import('../utils/api');
    vi.mocked(listFiles).mockRejectedValue(new Error('Failed to fetch'));

    render(<FilesPage />);

    await waitFor(() => {
      expect(screen.getByText(/unable to connect to server/i)).toBeInTheDocument();
    });
  });
});

describe('FilesPage error display - non-empty folder deletion (Req 6.4)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows specific error when deleting non-empty folder', async () => {
    const { listFiles, deleteFolder } = await import('../utils/api');
    vi.mocked(listFiles).mockResolvedValue({
      files: [],
      folders: [{ name: 'NonEmpty', lastModified: new Date().toISOString(), type: 'folder' }],
      count: 1,
      totalSize: 0,
    });
    vi.mocked(deleteFolder).mockRejectedValue(new Error('Folder is not empty'));

    render(<FilesPage />);
    await waitFor(() => expect(screen.getByText('NonEmpty')).toBeInTheDocument());

    // Select the folder
    selectRow('NonEmpty');
    await waitFor(() => expect(headerDeleteButton()).not.toBeDisabled());

    // Click delete
    fireEvent.click(headerDeleteButton());
    await waitFor(() => expect(screen.getByText(/are you sure/i)).toBeInTheDocument());

    // Confirm deletion
    const modal = screen.getByRole('dialog', { name: /confirm deletion/i });
    fireEvent.click(within(modal).getByRole('button', { name: /delete/i }));

    // Should show the categorized error message
    await waitFor(() => {
      expect(screen.getByText(/cannot delete folder: folder contains files or subfolders/i)).toBeInTheDocument();
    });
  });
});

describe('FilesPage Flashbar notifications', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders Flashbar component for notifications', async () => {
    const { listFiles } = await import('../utils/api');
    vi.mocked(listFiles).mockResolvedValue({ files: [], folders: [], count: 0, totalSize: 0 });

    const { container } = render(<FilesPage />);
    await waitFor(() => expect(listFiles).toHaveBeenCalled());

    // Flashbar should be rendered (even if empty)
    const flashbar = container.querySelector('[class*="flashbar"]');
    expect(flashbar).toBeTruthy();
  });

  it('shows success notification after folder deletion', async () => {
    const { listFiles, deleteFolder } = await import('../utils/api');
    vi.mocked(listFiles).mockResolvedValue({
      files: [],
      folders: [{ name: 'ToDelete', lastModified: new Date().toISOString(), type: 'folder' }],
      count: 1,
      totalSize: 0,
    });
    vi.mocked(deleteFolder).mockResolvedValue(undefined);

    render(<FilesPage />);
    await waitFor(() => expect(screen.getByText('ToDelete')).toBeInTheDocument());

    selectRow('ToDelete');
    await waitFor(() => expect(headerDeleteButton()).not.toBeDisabled());
    fireEvent.click(headerDeleteButton());
    await waitFor(() => expect(screen.getByText(/are you sure/i)).toBeInTheDocument());

    vi.mocked(listFiles).mockResolvedValue({ files: [], folders: [], count: 0, totalSize: 0 });
    const modal = screen.getByRole('dialog', { name: /confirm deletion/i });
    fireEvent.click(within(modal).getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(screen.getByText(/deleted/i)).toBeInTheDocument();
    });
  });
});

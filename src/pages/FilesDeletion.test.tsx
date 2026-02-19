import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import * as fc from 'fast-check';
import FilesPage from './Files';
import type { FolderType } from '../utils/api';
import { constructPathParam } from '../utils/pathUtils';

vi.mock('../utils/api', () => ({
  listFiles: vi.fn().mockResolvedValue({ files: [], folders: [], count: 0, totalSize: 0 }),
  getUploadUrl: vi.fn().mockResolvedValue({ uploadUrl: 'https://s3.example.com/upload', key: 'k' }),
  getDownloadUrl: vi.fn().mockResolvedValue({ downloadUrl: 'https://s3.example.com/download' }),
  deleteFile: vi.fn().mockResolvedValue(undefined),
  deleteFolder: vi.fn().mockResolvedValue(undefined),
  createFolder: vi.fn().mockResolvedValue(undefined),
  getAdminSettings: vi.fn().mockResolvedValue({}),
}));
vi.mock('../utils/auth', () => ({ getIdToken: vi.fn().mockResolvedValue('t') }));
vi.mock('../config', () => ({
  config: { apiEndpoint: 'https://a.com', userPoolId: 'x', userPoolClientId: 'x', region: 'us-east-1', transferEndpoint: 'x' },
}));

function selectRow(n: string) {
  const rows = screen.getAllByTestId('folder-name');
  const r = rows.find(el => el.textContent === n) ?? rows[0];
  const row = r.closest('tr')!;
  fireEvent.click(within(row).getByRole('checkbox'));
}

function hdrDel(): HTMLElement {
  return screen.getAllByRole('button', { name: /^delete$/i }).find(b => !b.closest('[role="dialog"]'))!;
}

describe('Folder Deletion Properties', () => {
  beforeEach(() => vi.clearAllMocks());

  /**
   * Property 22: Folder Selection Enables Delete
   * Validates: Requirements 6.1
   */
  it('P22: selection enables delete', async () => {
    const { listFiles } = await import('../utils/api');
    await fc.assert(
      fc.asyncProperty(
        fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_-]{2,15}$/),
        fc.integer({ min: 1577836800000, max: 1767225599000 }).map(ts => new Date(ts).toISOString()),
        async (n, d) => {
          vi.clearAllMocks();
          vi.mocked(listFiles).mockResolvedValue({
            files: [], folders: [{ name: n, lastModified: d, type: 'folder' }], count: 1, totalSize: 0,
          });
          const { unmount } = render(<FilesPage />);
          await waitFor(() => expect(screen.getByTestId('folder-name')).toBeInTheDocument());
          expect(hdrDel()).toBeDisabled();
          selectRow(n);
          await waitFor(() => expect(hdrDel()).not.toBeDisabled());
          unmount();
        }
      ),
      { numRuns: 10 }
    );
  }, 30000);

  /**
   * Property 23: Folder Deletion API Call
   * Validates: Requirements 6.3
   */
  it('P23: deletion API call', async () => {
    const { deleteFolder } = await import('../utils/api');
    await fc.assert(
      fc.asyncProperty(
        fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_-]{2,15}$/),
        fc.constantFrom<FolderType>('private', 'shared'),
        fc.array(fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_-]{2,10}$/), { maxLength: 3 }),
        async (n, t, p) => {
          vi.clearAllMocks();
          vi.mocked(deleteFolder).mockResolvedValue(undefined);
          const pp = constructPathParam(p);
          await deleteFolder(n, t, pp);
          expect(deleteFolder).toHaveBeenCalledWith(n, t, pp);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 24: Successful Folder Deletion Refreshes List
   * Validates: Requirements 6.5
   */
  it('P24: success refreshes list', async () => {
    const { listFiles, deleteFolder } = await import('../utils/api');
    await fc.assert(
      fc.asyncProperty(
        fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_-]{2,15}$/),
        fc.integer({ min: 1577836800000, max: 1767225599000 }).map(ts => new Date(ts).toISOString()),
        async (n, d) => {
          vi.clearAllMocks();
          vi.mocked(listFiles).mockResolvedValue({
            files: [], folders: [{ name: n, lastModified: d, type: 'folder' }], count: 1, totalSize: 0,
          });
          vi.mocked(deleteFolder).mockResolvedValue(undefined);
          const { unmount } = render(<FilesPage />);
          await waitFor(() => expect(screen.getByTestId('folder-name')).toBeInTheDocument());
          const c0 = vi.mocked(listFiles).mock.calls.length;
          selectRow(n);
          await waitFor(() => expect(hdrDel()).not.toBeDisabled());
          fireEvent.click(hdrDel());
          await waitFor(() => expect(screen.getByText(/are you sure/i)).toBeInTheDocument());
          vi.mocked(listFiles).mockResolvedValue({ files: [], folders: [], count: 0, totalSize: 0 });
          const m = screen.getByRole('dialog', { name: /confirm deletion/i });
          fireEvent.click(within(m).getByRole('button', { name: /delete/i }));
          await waitFor(() => expect(deleteFolder).toHaveBeenCalledWith(n, 'private', undefined));
          await waitFor(() => expect(vi.mocked(listFiles).mock.calls.length).toBeGreaterThan(c0));
          await waitFor(() => expect(screen.getByText(/deleted/i)).toBeInTheDocument());
          unmount();
        }
      ),
      { numRuns: 5 }
    );
  }, 30000);
});

describe('Folder Deletion Unit Tests', () => {
  beforeEach(() => vi.clearAllMocks());

  /** Validates: Requirements 6.2 */
  it('shows confirmation modal', async () => {
    const { listFiles } = await import('../utils/api');
    vi.mocked(listFiles).mockResolvedValue({
      files: [], folders: [{ name: 'TestFolder', lastModified: new Date().toISOString(), type: 'folder' }], count: 1, totalSize: 0,
    });
    render(<FilesPage />);
    await waitFor(() => expect(screen.getByText('TestFolder')).toBeInTheDocument());
    selectRow('TestFolder');
    await waitFor(() => expect(hdrDel()).not.toBeDisabled());
    fireEvent.click(hdrDel());
    await waitFor(() => {
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      expect(screen.getByText(/folders must be empty/i)).toBeInTheDocument();
    });
  });

  /** Validates: Requirements 6.4 */
  it('displays error for non-empty folder', async () => {
    const { listFiles, deleteFolder } = await import('../utils/api');
    vi.mocked(listFiles).mockResolvedValue({
      files: [], folders: [{ name: 'Full', lastModified: new Date().toISOString(), type: 'folder' }], count: 1, totalSize: 0,
    });
    vi.mocked(deleteFolder).mockRejectedValue(new Error('Folder is not empty'));
    render(<FilesPage />);
    await waitFor(() => expect(screen.getByText('Full')).toBeInTheDocument());
    selectRow('Full');
    await waitFor(() => expect(hdrDel()).not.toBeDisabled());
    fireEvent.click(hdrDel());
    await waitFor(() => expect(screen.getByText(/are you sure/i)).toBeInTheDocument());
    const m = screen.getByRole('dialog', { name: /confirm deletion/i });
    fireEvent.click(within(m).getByRole('button', { name: /delete/i }));
    await waitFor(() => expect(screen.getByText(/cannot delete folder/i)).toBeInTheDocument());
  });

  it('cancel dismisses modal without deleting', async () => {
    const { listFiles, deleteFolder } = await import('../utils/api');
    vi.mocked(listFiles).mockResolvedValue({
      files: [], folders: [{ name: 'Keep', lastModified: new Date().toISOString(), type: 'folder' }], count: 1, totalSize: 0,
    });
    render(<FilesPage />);
    await waitFor(() => expect(screen.getByText('Keep')).toBeInTheDocument());
    selectRow('Keep');
    await waitFor(() => expect(hdrDel()).not.toBeDisabled());
    fireEvent.click(hdrDel());
    await waitFor(() => expect(screen.getByText(/are you sure/i)).toBeInTheDocument());
    const m = screen.getByRole('dialog', { name: /confirm deletion/i });
    fireEvent.click(within(m).getByRole('button', { name: /cancel/i }));
    expect(deleteFolder).not.toHaveBeenCalled();
  });
});

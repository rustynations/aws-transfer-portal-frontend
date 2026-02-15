import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { listFiles, getUploadUrl, deleteFile, createFolder, deleteFolder, type FolderType } from './api';

// Mock the config and auth modules
vi.mock('../config', () => ({
  config: {
    apiEndpoint: 'https://api.example.com',
  },
}));

vi.mock('./auth', () => ({
  getIdToken: vi.fn().mockResolvedValue('mock-token'),
}));

describe('API Parameter Inclusion Properties', () => {
  let fetchMock: any;

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    // Create a fresh fetch mock
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 26: API Calls Include Required Parameters
   * For any API call (listFiles, upload, delete, createFolder), the call should include
   * the Folder_Parameter matching the activeTab, and should include the Path_Parameter
   * if currentPath is non-empty.
   * Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5
   */
  it('Property 26: listFiles includes folder parameter and path when provided', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('private' as FolderType, 'shared' as FolderType),
        fc.option(fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('\0')), { nil: undefined }),
        async (folder, path) => {
          // Reset mock for this iteration
          fetchMock.mockClear();
          
          // Mock successful API response
          fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ files: [], folders: [], count: 0, totalSize: 0 }),
          });

          await listFiles(folder, path);

          // Verify fetch was called exactly once
          expect(fetchMock).toHaveBeenCalledTimes(1);
          const callArgs = fetchMock.mock.calls[0];
          const url = callArgs[0];

          // Verify folder parameter is included
          expect(url).toContain(`folder=${folder}`);

          // Verify path parameter is included if provided
          if (path) {
            // Check that path parameter exists in URL (don't check exact encoding)
            expect(url).toMatch(/[?&]path=/);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 26: getUploadUrl includes folder and path parameters in request body', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.constantFrom('private' as FolderType, 'shared' as FolderType),
        fc.option(fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('\0')), { nil: undefined }),
        async (filename, folder, path) => {
          // Reset mock for this iteration
          fetchMock.mockClear();
          
          // Mock successful API response
          fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ uploadUrl: 'https://s3.example.com/upload', key: 'test-key' }),
          });

          await getUploadUrl(filename, folder, path);

          // Verify fetch was called exactly once
          expect(fetchMock).toHaveBeenCalledTimes(1);
          const callArgs = fetchMock.mock.calls[0];
          const options = callArgs[1];
          const body = JSON.parse(options.body);

          // Verify folder parameter is included
          expect(body.folder).toBe(folder);

          // Verify path parameter is included if provided
          if (path) {
            expect(body.path).toBe(path);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 26: deleteFile includes folder parameter in request body', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.constantFrom('private' as FolderType, 'shared' as FolderType),
        async (key, folder) => {
          // Reset mock for this iteration
          fetchMock.mockClear();
          
          // Mock successful API response
          fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({}),
          });

          await deleteFile(key, folder);

          // Verify fetch was called exactly once
          expect(fetchMock).toHaveBeenCalledTimes(1);
          const callArgs = fetchMock.mock.calls[0];
          const options = callArgs[1];
          const body = JSON.parse(options.body);

          // Verify folder parameter is included
          expect(body.folder).toBe(folder);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 26: createFolder includes folder and path parameters in request body', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.constantFrom('private' as FolderType, 'shared' as FolderType),
        fc.option(fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('\0')), { nil: undefined }),
        async (folderName, folder, path) => {
          // Reset mock for this iteration
          fetchMock.mockClear();
          
          // Mock successful API response
          fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({}),
          });

          await createFolder(folderName, folder, path);

          // Verify fetch was called exactly once
          expect(fetchMock).toHaveBeenCalledTimes(1);
          const callArgs = fetchMock.mock.calls[0];
          const options = callArgs[1];
          const body = JSON.parse(options.body);

          // Verify folder parameter is included
          expect(body.folder).toBe(folder);

          // Verify path parameter is included if provided
          if (path) {
            expect(body.path).toBe(path);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 26: deleteFolder includes folder and path parameters in request body', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.constantFrom('private' as FolderType, 'shared' as FolderType),
        fc.option(fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('\0')), { nil: undefined }),
        async (folderName, folder, path) => {
          // Reset mock for this iteration
          fetchMock.mockClear();
          
          // Mock successful API response
          fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({}),
          });

          await deleteFolder(folderName, folder, path);

          // Verify fetch was called exactly once
          expect(fetchMock).toHaveBeenCalledTimes(1);
          const callArgs = fetchMock.mock.calls[0];
          const options = callArgs[1];
          const body = JSON.parse(options.body);

          // Verify folder parameter is included
          expect(body.folder).toBe(folder);

          // Verify path parameter is included if provided
          if (path) {
            expect(body.path).toBe(path);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

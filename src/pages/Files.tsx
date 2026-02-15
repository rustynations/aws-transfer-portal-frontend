import { useState, useEffect, useMemo } from 'react';
import ContentLayout from '@cloudscape-design/components/content-layout';
import Header from '@cloudscape-design/components/header';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Button from '@cloudscape-design/components/button';
import Flashbar from '@cloudscape-design/components/flashbar';
import Modal from '@cloudscape-design/components/modal';
import FormField from '@cloudscape-design/components/form-field';
import FileUpload from '@cloudscape-design/components/file-upload';
import FileDropzone from '@cloudscape-design/components/file-dropzone';
import ProgressBar from '@cloudscape-design/components/progress-bar';
import Box from '@cloudscape-design/components/box';
import Alert from '@cloudscape-design/components/alert';
import { 
  listFiles, 
  getUploadUrl, 
  getDownloadUrl, 
  deleteFile,
  deleteFolder,
  createFolder,
  type FileMetadata,
  type FolderMetadata,
  type FolderType 
} from '../utils/api';
import { constructPathParam, appendToPath, truncatePath, sanitizePath } from '../utils/pathUtils';
import { useNotifications, categorizeError } from '../hooks/useNotifications';
import TabNavigator from '../components/TabNavigator';
import BreadcrumbTrail from '../components/BreadcrumbTrail';
import FileListHeader from '../components/FileListHeader';
import FileTable from '../components/FileTable';
import CreateFolderModal from '../components/CreateFolderModal';

export default function FilesPage() {
  // Tab and navigation state
  const [activeTab, setActiveTab] = useState<FolderType>('private');
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [sharedFolderPermissions] = useState<'read-only' | 'read-write'>('read-write'); // TODO: Get from config/API
  
  // File and folder data
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [folders, setFolders] = useState<FolderMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<(FileMetadata | FolderMetadata)[]>([]);
  const { items: notificationItems, notifySuccess, notifyError, clearAll } = useNotifications();
  
  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFileName, setCurrentFileName] = useState('');

  // Create folder modal state
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);

  // Delete confirmation modal state
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

  // Detect files that would overwrite existing ones
  const conflictingFiles = useMemo(() => {
    if (uploadFiles.length === 0) return [];
    const existingNames = new Set(files.map(f => f.name));
    return uploadFiles.filter(f => existingNames.has(f.name));
  }, [uploadFiles, files]);

  // Load files when tab or path changes
  useEffect(() => {
    loadFiles();
  }, [activeTab, currentPath]);

  async function loadFiles() {
    try {
      setLoading(true);
      const pathParam = constructPathParam(currentPath);
      const data = await listFiles(activeTab, pathParam);
      setFiles(data.files || []);
      setFolders(data.folders || []);
    } catch (err: unknown) {
      const { message, persistent } = categorizeError(err);
      notifyError(message, { persistent });
      setFiles([]);
      setFolders([]);
    } finally {
      setLoading(false);
    }
  }

  // Tab switching handler
  function handleTabChange(newTab: FolderType) {
    setActiveTab(newTab);
    setCurrentPath([]); // Reset to root when switching tabs
    setSelectedItems([]);
  }

  // Folder navigation handler - sanitizes folder name to prevent directory traversal
  function handleFolderNavigate(folderName: string) {
    const newPath = appendToPath(currentPath, folderName);
    setCurrentPath(sanitizePath(newPath));
    setSelectedItems([]);
  }

  // Breadcrumb navigation handler - prevents navigating above root (level 0 = root)
  function handleBreadcrumbNavigate(level: number) {
    // Clamp level to 0 minimum to prevent navigating above root
    const safeLevel = Math.max(0, level);
    setCurrentPath(truncatePath(currentPath, safeLevel));
    setSelectedItems([]);
  }

  async function handleUpload() {
    if (uploadFiles.length === 0) return;

    setUploading(true);

    try {
      const pathParam = constructPathParam(currentPath);
      
      for (let i = 0; i < uploadFiles.length; i++) {
        const file = uploadFiles[i];
        setCurrentFileName(file.name);
        setUploadProgress(0);
        
        // Get pre-signed upload URL with folder and path context
        const { uploadUrl } = await getUploadUrl(file.name, activeTab, pathParam);
        
        // Upload file to S3 with progress tracking
        await uploadWithProgress(uploadUrl, file, (progress) => {
          setUploadProgress(progress);
        });
      }

      notifySuccess(`Successfully uploaded ${uploadFiles.length} file(s)`);
      setShowUploadModal(false);
      setUploadFiles([]);
      setUploadProgress(0);
      setCurrentFileName('');
      await loadFiles();
    } catch (err: unknown) {
      const { message, persistent } = categorizeError(err);
      notifyError(message, { persistent });
    } finally {
      setUploading(false);
    }
  }

  function uploadWithProgress(
    url: string,
    file: File,
    onProgress: (progress: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          onProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('PUT', url);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.send(file);
    });
  }

  async function handleDownload(item: FileMetadata | FolderMetadata) {
    // Only files can be downloaded
    if (item.type === 'folder') return;
    
    try {
      const pathParam = constructPathParam(currentPath);
      const { downloadUrl } = await getDownloadUrl(item.name, activeTab, pathParam);
      window.open(downloadUrl, '_blank');
    } catch (err: unknown) {
      const { message, persistent } = categorizeError(err);
      notifyError(message, { persistent });
    }
  }

  async function handleDelete() {
    if (selectedItems.length === 0) return;

    try {
      setLoading(true);
      const pathParam = constructPathParam(currentPath);
      for (const item of selectedItems) {
        if (item.type === 'file') {
          await deleteFile(item.name, activeTab, pathParam);
        } else if (item.type === 'folder') {
          await deleteFolder(item.name, activeTab, pathParam);
        }
      }
      notifySuccess(`Deleted ${selectedItems.length} item(s)`);
      setSelectedItems([]);
      await loadFiles();
    } catch (err: unknown) {
      const { message, persistent } = categorizeError(err);
      notifyError(message, { persistent });
    } finally {
      setLoading(false);
      setShowDeleteConfirmModal(false);
    }
  }

  function handleDeleteClick() {
    if (selectedItems.length === 0) return;
    setShowDeleteConfirmModal(true);
  }

  async function handleCreateFolder(folderName: string) {
    try {
      const pathParam = constructPathParam(currentPath);
      await createFolder(folderName, activeTab, pathParam);
      
      notifySuccess(`Successfully created folder "${folderName}"`);
      setShowCreateFolderModal(false);
      await loadFiles();
    } catch (err: unknown) {
      // Re-throw to let modal handle the error display
      const { message } = categorizeError(err);
      throw new Error(message);
    }
  }

  return (
    <ContentLayout
      header={
        <Header variant="h1">
          Files
        </Header>
      }
    >
      <SpaceBetween size="l">
        <Flashbar items={notificationItems} />

        <TabNavigator activeTab={activeTab} onTabChange={handleTabChange} />

        <BreadcrumbTrail 
          activeTab={activeTab} 
          currentPath={currentPath} 
          onNavigate={handleBreadcrumbNavigate} 
        />

        <FileListHeader
          activeTab={activeTab}
          sharedFolderPermissions={sharedFolderPermissions}
          itemCount={files.length + folders.length}
          hasSelection={selectedItems.length > 0}
          onRefresh={loadFiles}
          onCreateFolder={() => setShowCreateFolderModal(true)}
          onUpload={() => setShowUploadModal(true)}
          onDownload={() => selectedItems[0] && handleDownload(selectedItems[0])}
          onDelete={handleDeleteClick}
        />

        <FileTable
          files={files}
          folders={folders}
          selectedItems={selectedItems}
          loading={loading}
          onSelectionChange={setSelectedItems}
          onFolderNavigate={handleFolderNavigate}
        />
      </SpaceBetween>

      <CreateFolderModal
        visible={showCreateFolderModal}
        activeTab={activeTab}
        currentPath={currentPath}
        onDismiss={() => setShowCreateFolderModal(false)}
        onCreate={handleCreateFolder}
      />

      <Modal
        visible={showDeleteConfirmModal}
        onDismiss={() => setShowDeleteConfirmModal(false)}
        header="Confirm deletion"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setShowDeleteConfirmModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleDelete}>
                Delete
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <Box>
          Are you sure you want to delete {selectedItems.length} selected item(s)?
          {selectedItems.some(item => item.type === 'folder') && (
            <Box padding={{ top: 'xs' }} color="text-status-warning">
              Note: Folders must be empty to be deleted.
            </Box>
          )}
        </Box>
      </Modal>

      <Modal
        visible={showUploadModal}
        onDismiss={() => setShowUploadModal(false)}
        header="Upload files"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setShowUploadModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleUpload}
                loading={uploading}
                disabled={uploadFiles.length === 0}
              >
                {conflictingFiles.length > 0 ? 'Upload & replace' : 'Upload'}
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <Box>
            Uploading to: <strong>
              {activeTab === 'private' ? 'My Files' : 'Shared Files'}
              {currentPath.length > 0 && ` > ${currentPath.join(' > ')}`}
            </strong>
          </Box>

          {uploading && (
            <SpaceBetween size="xs">
              <Box>Uploading {currentFileName}...</Box>
              <ProgressBar
                value={uploadProgress}
                label="Upload progress"
                description={`${uploadProgress}% complete`}
                status={uploadProgress === 100 ? 'success' : 'in-progress'}
              />
            </SpaceBetween>
          )}
          
          {!uploading && conflictingFiles.length > 0 && (
            <Alert type="warning">
              {conflictingFiles.length === 1
                ? `"${conflictingFiles[0].name}" already exists and will be replaced.`
                : `${conflictingFiles.length} files already exist and will be replaced: ${conflictingFiles.map(f => f.name).join(', ')}`}
            </Alert>
          )}

          {!uploading && <FileDropzone onChange={({ detail }) => setUploadFiles(prev => [...prev, ...detail.value])}>
            <SpaceBetween size="m">
              <Box textAlign="center" color="text-body-secondary">
                Drop files here
              </Box>
              <FormField label="Or select files">
                <FileUpload
                  value={uploadFiles}
                  onChange={({ detail }) => setUploadFiles(detail.value)}
                  multiple
                  showFileSize
                  showFileLastModified
                  i18nStrings={{
                    uploadButtonText: (e) => (e ? 'Choose files' : 'Choose file'),
                    dropzoneText: (e) => (e ? 'Drop files to upload' : 'Drop file to upload'),
                    removeFileAriaLabel: (e) => `Remove file ${e + 1}`,
                    limitShowFewer: 'Show fewer files',
                    limitShowMore: 'Show more files',
                    errorIconAriaLabel: 'Error',
                  }}
                />
              </FormField>
            </SpaceBetween>
          </FileDropzone>}
        </SpaceBetween>
      </Modal>
    </ContentLayout>
  );
}

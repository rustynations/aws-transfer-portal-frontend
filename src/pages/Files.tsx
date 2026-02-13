import { useState, useEffect } from 'react';
import ContentLayout from '@cloudscape-design/components/content-layout';
import Header from '@cloudscape-design/components/header';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Button from '@cloudscape-design/components/button';
import Table from '@cloudscape-design/components/table';
import Box from '@cloudscape-design/components/box';
import Alert from '@cloudscape-design/components/alert';
import Modal from '@cloudscape-design/components/modal';
import FormField from '@cloudscape-design/components/form-field';
import FileUpload from '@cloudscape-design/components/file-upload';
import { listFiles, getUploadUrl, getDownloadUrl, deleteFile, type FileMetadata } from '../utils/api';

export default function FilesPage() {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<FileMetadata[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadFiles();
  }, []);

  async function loadFiles() {
    try {
      setLoading(true);
      const data = await listFiles();
      setFiles(data);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load files');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload() {
    if (uploadFiles.length === 0) return;

    setUploading(true);
    setError('');

    try {
      for (const file of uploadFiles) {
        // Get pre-signed upload URL
        const { uploadUrl } = await getUploadUrl(file.name);
        
        // Upload file to S3
        const response = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }
      }

      setSuccess(`Successfully uploaded ${uploadFiles.length} file(s)`);
      setShowUploadModal(false);
      setUploadFiles([]);
      await loadFiles();
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(file: FileMetadata) {
    try {
      const { downloadUrl } = await getDownloadUrl(file.name);
      window.open(downloadUrl, '_blank');
    } catch (err: any) {
      setError(err.message || 'Failed to generate download URL');
    }
  }

  async function handleDelete() {
    if (selectedItems.length === 0) return;

    try {
      setLoading(true);
      for (const file of selectedItems) {
        await deleteFile(file.name);
      }
      setSuccess(`Deleted ${selectedItems.length} file(s)`);
      setSelectedItems([]);
      await loadFiles();
    } catch (err: any) {
      setError(err.message || 'Failed to delete files');
    } finally {
      setLoading(false);
    }
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          actions={
            <Button variant="primary" iconName="upload" onClick={() => setShowUploadModal(true)}>
              Upload files
            </Button>
          }
        >
          Files
        </Header>
      }
    >
      <SpaceBetween size="l">
        {error && (
          <Alert type="error" dismissible onDismiss={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert type="success" dismissible onDismiss={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        <Table
          columnDefinitions={[
            {
              id: 'name',
              header: 'Name',
              cell: (item) => item.name,
              sortingField: 'name',
            },
            {
              id: 'size',
              header: 'Size',
              cell: (item) => formatBytes(item.size),
              sortingField: 'size',
            },
            {
              id: 'lastModified',
              header: 'Last modified',
              cell: (item) => new Date(item.lastModified).toLocaleString(),
              sortingField: 'lastModified',
            },
          ]}
          items={files}
          loading={loading}
          loadingText="Loading files"
          selectionType="multi"
          selectedItems={selectedItems}
          onSelectionChange={({ detail }) => setSelectedItems(detail.selectedItems)}
          empty={
            <Box textAlign="center" color="inherit">
              <b>No files</b>
              <Box padding={{ bottom: 's' }} variant="p" color="inherit">
                Upload files to get started
              </Box>
            </Box>
          }
          header={
            <Header
              counter={`(${files.length})`}
              actions={
                <SpaceBetween direction="horizontal" size="xs">
                  <Button
                    iconName="download"
                    disabled={selectedItems.length !== 1}
                    onClick={() => selectedItems[0] && handleDownload(selectedItems[0])}
                  >
                    Download
                  </Button>
                  <Button
                    iconName="remove"
                    disabled={selectedItems.length === 0}
                    onClick={handleDelete}
                  >
                    Delete
                  </Button>
                </SpaceBetween>
              }
            >
              Your files
            </Header>
          }
        />
      </SpaceBetween>

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
                Upload
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <FormField label="Select files">
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
      </Modal>
    </ContentLayout>
  );
}

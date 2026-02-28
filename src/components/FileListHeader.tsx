import Header from '@cloudscape-design/components/header';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Button from '@cloudscape-design/components/button';
import type { FolderType } from '../utils/api';
import { isOperationAllowed } from '../utils/permissions';

interface FileListHeaderProps {
  activeTab: FolderType;
  sharedFolderPermissions: 'read-only' | 'read-write';
  itemCount: number;
  hasSelection: boolean;
  onRefresh: () => void;
  onCreateFolder: () => void;
  onUpload: () => void;
  onDownload: () => void;
  onDelete: () => void;
}

export default function FileListHeader({
  activeTab,
  sharedFolderPermissions,
  hasSelection,
  onRefresh,
  onCreateFolder,
  onUpload,
  onDownload,
  onDelete,
}: FileListHeaderProps) {
  const canUpload = isOperationAllowed('upload', activeTab, sharedFolderPermissions);
  const canDelete = isOperationAllowed('delete', activeTab, sharedFolderPermissions);
  const canCreateFolder = isOperationAllowed('createFolder', activeTab, sharedFolderPermissions);

  return (
    <Header
      actions={
        <SpaceBetween direction="horizontal" size="xs">
          <Button iconName="refresh" onClick={onRefresh}>
            Refresh
          </Button>
          <Button
            iconName="folder"
            disabled={!canCreateFolder}
            onClick={onCreateFolder}
          >
            Create folder
          </Button>
          <Button
            iconName="upload"
            disabled={!canUpload}
            onClick={onUpload}
          >
            Upload
          </Button>
          <Button
            iconName="download"
            disabled={!hasSelection}
            onClick={onDownload}
          >
            Download
          </Button>
          <Button
            iconName="remove"
            disabled={!hasSelection || !canDelete}
            onClick={onDelete}
          >
            Delete
          </Button>
        </SpaceBetween>
      }
    >
    </Header>
  );
}

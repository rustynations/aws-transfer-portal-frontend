import Table from '@cloudscape-design/components/table';
import Box from '@cloudscape-design/components/box';
import Icon from '@cloudscape-design/components/icon';
import Link from '@cloudscape-design/components/link';
import type { FileMetadata, FolderMetadata } from '../utils/api';

interface FileTableProps {
  files: FileMetadata[];
  folders: FolderMetadata[];
  selectedItems: (FileMetadata | FolderMetadata)[];
  loading: boolean;
  onSelectionChange: (items: (FileMetadata | FolderMetadata)[]) => void;
  onFolderNavigate: (folderName: string) => void;
}

type TableItem = FileMetadata | FolderMetadata;

export default function FileTable({
  files,
  folders,
  selectedItems,
  loading,
  onSelectionChange,
  onFolderNavigate,
}: FileTableProps) {
  // Combine folders and files, sorting folders first alphabetically
  const items: TableItem[] = [
    ...folders.sort((a, b) => a.name.localeCompare(b.name)),
    ...files,
  ];

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  function handleRowClick(item: TableItem) {
    if (item.type === 'folder') {
      onFolderNavigate(item.name);
    }
  }

  return (
    <Table
      columnDefinitions={[
        {
          id: 'icon',
          header: '',
          cell: (item) => (
            <Icon
              name={item.type === 'folder' ? 'folder' : 'file'}
              size="medium"
            />
          ),
          width: 50,
        },
        {
          id: 'name',
          header: 'Name',
          cell: (item) => (
            item.type === 'folder' ? (
              <Link
                onFollow={(e) => { e.preventDefault(); handleRowClick(item); }}
                data-testid="folder-name"
              >
                {item.name}
              </Link>
            ) : (
              <span data-testid="file-name">{item.name}</span>
            )
          ),
          sortingField: 'name',
        },
        {
          id: 'size',
          header: 'Size',
          cell: (item) => (item.type === 'folder' ? '—' : formatBytes(item.size)),
          sortingField: 'size',
        },
        {
          id: 'lastModified',
          header: 'Last modified',
          cell: (item) => item.lastModified ? new Date(item.lastModified).toLocaleString() : '—',
          sortingField: 'lastModified',
        },
      ]}
      items={items}
      loading={loading}
      loadingText="Loading files"
      selectionType="multi"
      selectedItems={selectedItems}
      onSelectionChange={({ detail }) => onSelectionChange(detail.selectedItems)}
      empty={
        <Box textAlign="center" color="inherit">
          <b>No files or folders</b>
          <Box padding={{ bottom: 's' }} variant="p" color="inherit">
            Upload files or create folders to get started
          </Box>
        </Box>
      }
    />
  );
}

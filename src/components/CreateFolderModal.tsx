import { useState, useEffect, useRef } from 'react';
import Modal from '@cloudscape-design/components/modal';
import Box from '@cloudscape-design/components/box';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Button from '@cloudscape-design/components/button';
import FormField from '@cloudscape-design/components/form-field';
import Input from '@cloudscape-design/components/input';
import type { FolderType } from '../utils/api';

interface CreateFolderModalProps {
  visible: boolean;
  activeTab: FolderType;
  currentPath: string[];
  onDismiss: () => void;
  onCreate: (folderName: string) => Promise<void>;
}

/**
 * Validates folder name according to requirements:
 * - Not empty
 * - No forward slashes (/)
 * - No special characters except hyphen, underscore, space
 * - Regex: /^[a-zA-Z0-9\s_-]+$/
 */
function validateFolderName(name: string): string | null {
  if (!name || name.trim().length === 0) {
    return 'Folder name cannot be empty';
  }

  if (name.includes('/')) {
    return 'Folder name cannot contain forward slashes';
  }

  if (!/^[a-zA-Z0-9\s_-]+$/.test(name)) {
    return 'Folder name can only contain letters, numbers, spaces, hyphens, and underscores';
  }

  return null;
}

export default function CreateFolderModal({
  visible,
  activeTab,
  currentPath,
  onDismiss,
  onCreate,
}: CreateFolderModalProps) {
  const [folderName, setFolderName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<any>(null);

  // Focus the input when modal becomes visible
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const tabName = activeTab === 'private' ? 'My Files' : 'Shared Files';
  const pathDisplay = currentPath.length > 0 
    ? `${tabName} > ${currentPath.join(' > ')}`
    : tabName;

  function handleFolderNameChange(value: string) {
    setFolderName(value);
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  }

  async function handleCreate() {
    const validationError = validateFolderName(folderName);
    if (validationError) {
      setError(validationError);
      return;
    }

    setCreating(true);
    setError(null);

    try {
      await onCreate(folderName.trim());
      // Success - reset and close
      setFolderName('');
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to create folder');
    } finally {
      setCreating(false);
    }
  }

  function handleDismiss() {
    setFolderName('');
    setError(null);
    onDismiss();
  }

  const validationError = validateFolderName(folderName);
  const isValid = validationError === null;

  return (
    <Modal
      visible={visible}
      onDismiss={handleDismiss}
      header="Create folder"
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={handleDismiss}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreate}
              loading={creating}
              disabled={!isValid || creating}
            >
              Create
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="m">
        <Box>
          Creating folder in: <strong>{pathDisplay}</strong>
        </Box>

        <FormField
          label="Folder name"
          description="Letters, numbers, spaces, hyphens, and underscores only"
          errorText={error || (folderName && validationError)}
        >
          <Input
            ref={inputRef}
            value={folderName}
            onChange={({ detail }) => handleFolderNameChange(detail.value)}
            placeholder="Enter folder name"
            disabled={creating}
          />
        </FormField>
      </SpaceBetween>
    </Modal>
  );
}

export { validateFolderName };

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
import Textarea from '@cloudscape-design/components/textarea';
import { listKeys, addKey, deleteKey, type SSHKey } from '../utils/api';
import { config } from '../config';

export default function SSHKeysPage() {
  const [keys, setKeys] = useState<SSHKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<SSHKey[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Add key modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadKeys();
  }, []);

  async function loadKeys() {
    try {
      setLoading(true);
      const data = await listKeys();
      setKeys(data);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load SSH keys');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddKey() {
    if (!newKeyValue.trim()) return;

    setAdding(true);
    setError('');

    try {
      await addKey(newKeyValue.trim());
      setSuccess('SSH key added successfully');
      setShowAddModal(false);
      setNewKeyValue('');
      await loadKeys();
    } catch (err: any) {
      setError(err.message || 'Failed to add SSH key');
    } finally {
      setAdding(false);
    }
  }

  async function handleDeleteKey() {
    if (selectedItems.length === 0) return;

    try {
      setLoading(true);
      for (const key of selectedItems) {
        await deleteKey(key.key_id);
      }
      setSuccess(`Deleted ${selectedItems.length} SSH key(s)`);
      setSelectedItems([]);
      await loadKeys();
    } catch (err: any) {
      setError(err.message || 'Failed to delete SSH keys');
    } finally {
      setLoading(false);
    }
  }

  function truncateKey(key: string): string {
    if (key.length <= 60) return key;
    return key.substring(0, 30) + '...' + key.substring(key.length - 30);
  }

  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          description="Manage SSH public keys for SFTP access"
          actions={
            <Button variant="primary" iconName="add-plus" onClick={() => setShowAddModal(true)}>
              Add SSH key
            </Button>
          }
        >
          SSH Keys
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

        <Alert type="info" header="SFTP Connection">
          Use these SSH keys to connect via SFTP:
          <Box variant="code" margin={{ top: 's' }}>
            sftp username@{config.transferEndpoint}
          </Box>
        </Alert>

        <Table
          columnDefinitions={[
            {
              id: 'key_id',
              header: 'Key ID',
              cell: (item) => item.key_id,
              sortingField: 'key_id',
            },
            {
              id: 'public_key',
              header: 'Public Key',
              cell: (item) => (
                <Box variant="code" fontSize="body-s">
                  {truncateKey(item.public_key)}
                </Box>
              ),
            },
            {
              id: 'added_date',
              header: 'Added',
              cell: (item) => new Date(item.added_date).toLocaleString(),
              sortingField: 'added_date',
            },
          ]}
          items={keys}
          loading={loading}
          loadingText="Loading SSH keys"
          selectionType="multi"
          selectedItems={selectedItems}
          onSelectionChange={({ detail }) => setSelectedItems(detail.selectedItems)}
          empty={
            <Box textAlign="center" color="inherit">
              <b>No SSH keys</b>
              <Box padding={{ bottom: 's' }} variant="p" color="inherit">
                Add an SSH key to enable SFTP access
              </Box>
            </Box>
          }
          header={
            <Header
              counter={`(${keys.length})`}
              actions={
                <Button
                  iconName="remove"
                  disabled={selectedItems.length === 0}
                  onClick={handleDeleteKey}
                >
                  Delete
                </Button>
              }
            >
              Your SSH keys
            </Header>
          }
        />
      </SpaceBetween>

      <Modal
        visible={showAddModal}
        onDismiss={() => setShowAddModal(false)}
        header="Add SSH key"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleAddKey}
                loading={adding}
                disabled={!newKeyValue.trim()}
              >
                Add key
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <Alert type="info">
            Paste your SSH public key (e.g., from ~/.ssh/id_rsa.pub). Supported formats: ssh-rsa, ssh-ed25519, ecdsa-sha2-nistp256.
          </Alert>

          <FormField label="Public key">
            <Textarea
              value={newKeyValue}
              onChange={({ detail }) => setNewKeyValue(detail.value)}
              placeholder="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC..."
              rows={6}
            />
          </FormField>
        </SpaceBetween>
      </Modal>
    </ContentLayout>
  );
}

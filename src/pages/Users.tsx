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
import Input from '@cloudscape-design/components/input';
import Select from '@cloudscape-design/components/select';
import Textarea from '@cloudscape-design/components/textarea';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import Badge from '@cloudscape-design/components/badge';
import { listUsers, createUser, deleteUser, type UserData } from '../utils/api';

export default function UsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<UserData[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Create user modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    access_type: 'WEB_ONLY' as UserData['access_type'],
    ssh_keys: '',
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      setLoading(true);
      const data = await listUsers();
      setUsers(data);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser() {
    if (!newUser.username || !newUser.email) return;

    setCreating(true);
    setError('');

    try {
      const sshKeys = newUser.ssh_keys
        .split('\n')
        .map(k => k.trim())
        .filter(k => k.length > 0);

      await createUser({
        username: newUser.username,
        email: newUser.email,
        access_type: newUser.access_type,
        ssh_keys: sshKeys.length > 0 ? sshKeys : undefined,
        status: 'active',
      });

      setSuccess(`User ${newUser.username} created successfully`);
      setShowCreateModal(false);
      setNewUser({
        username: '',
        email: '',
        access_type: 'WEB_ONLY',
        ssh_keys: '',
      });
      await loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteUsers() {
    if (selectedItems.length === 0) return;

    try {
      setLoading(true);
      for (const user of selectedItems) {
        await deleteUser(user.username);
      }
      setSuccess(`Deleted ${selectedItems.length} user(s)`);
      setSelectedItems([]);
      await loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to delete users');
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

  function getAccessTypeBadge(accessType: string) {
    const colors: Record<string, 'blue' | 'green' | 'red' | 'grey'> = {
      ADMIN: 'red',
      HYBRID: 'blue',
      WEB_ONLY: 'green',
      SFTP_ONLY: 'grey',
    };
    return <Badge color={colors[accessType] || 'grey'}>{accessType}</Badge>;
  }

  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          description="Manage user accounts and access"
          actions={
            <Button variant="primary" iconName="add-plus" onClick={() => setShowCreateModal(true)}>
              Create user
            </Button>
          }
        >
          User Management
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
              id: 'username',
              header: 'Username',
              cell: (item) => item.username,
              sortingField: 'username',
            },
            {
              id: 'email',
              header: 'Email',
              cell: (item) => item.email,
            },
            {
              id: 'access_type',
              header: 'Access Type',
              cell: (item) => getAccessTypeBadge(item.access_type),
            },
            {
              id: 'status',
              header: 'Status',
              cell: (item) => (
                <StatusIndicator type={item.status === 'active' ? 'success' : 'stopped'}>
                  {item.status}
                </StatusIndicator>
              ),
            },
            {
              id: 'file_count',
              header: 'Files',
              cell: (item) => item.file_count || 0,
            },
            {
              id: 'storage_bytes',
              header: 'Storage',
              cell: (item) => formatBytes(item.storage_bytes || 0),
            },
            {
              id: 'created_at',
              header: 'Created',
              cell: (item) => item.created_at ? new Date(item.created_at).toLocaleDateString() : '-',
            },
          ]}
          items={users}
          loading={loading}
          loadingText="Loading users"
          selectionType="multi"
          selectedItems={selectedItems}
          onSelectionChange={({ detail }) => setSelectedItems(detail.selectedItems)}
          empty={
            <Box textAlign="center" color="inherit">
              <b>No users</b>
              <Box padding={{ bottom: 's' }} variant="p" color="inherit">
                Create a user to get started
              </Box>
            </Box>
          }
          header={
            <Header
              counter={`(${users.length})`}
              actions={
                <Button
                  iconName="remove"
                  disabled={selectedItems.length === 0}
                  onClick={handleDeleteUsers}
                >
                  Delete
                </Button>
              }
            >
              Users
            </Header>
          }
        />
      </SpaceBetween>

      <Modal
        visible={showCreateModal}
        onDismiss={() => setShowCreateModal(false)}
        header="Create user"
        size="medium"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateUser}
                loading={creating}
                disabled={!newUser.username || !newUser.email}
              >
                Create user
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <FormField label="Username" description="Unique identifier for the user">
            <Input
              value={newUser.username}
              onChange={({ detail }) => setNewUser({ ...newUser, username: detail.value })}
              placeholder="johndoe"
            />
          </FormField>

          <FormField label="Email" description="User's email address">
            <Input
              value={newUser.email}
              onChange={({ detail }) => setNewUser({ ...newUser, email: detail.value })}
              type="email"
              placeholder="john@example.com"
            />
          </FormField>

          <FormField
            label="Access Type"
            description="Determines how the user can access the system"
          >
            <Select
              selectedOption={{ label: newUser.access_type, value: newUser.access_type }}
              onChange={({ detail }) =>
                setNewUser({ ...newUser, access_type: detail.selectedOption.value as UserData['access_type'] })
              }
              options={[
                { label: 'ADMIN', value: 'ADMIN', description: 'Full access to all features' },
                { label: 'WEB_ONLY', value: 'WEB_ONLY', description: 'Web portal access only' },
                { label: 'SFTP_ONLY', value: 'SFTP_ONLY', description: 'SFTP access only (requires SSH key)' },
                { label: 'HYBRID', value: 'HYBRID', description: 'Both web and SFTP access' },
              ]}
            />
          </FormField>

          <FormField
            label="SSH Keys (optional)"
            description="One SSH public key per line. Required for SFTP_ONLY users."
          >
            <Textarea
              value={newUser.ssh_keys}
              onChange={({ detail }) => setNewUser({ ...newUser, ssh_keys: detail.value })}
              placeholder="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC..."
              rows={4}
            />
          </FormField>
        </SpaceBetween>
      </Modal>
    </ContentLayout>
  );
}

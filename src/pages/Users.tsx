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
import Icon from '@cloudscape-design/components/icon';
import { listUsers, createUser, deleteUser, resetUserMFA, getAdminSettings, type UserData } from '../utils/api';
import { isSftpEnabled } from '../config';

export default function UsersPage() {
  const sftpEnabled = isSftpEnabled();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<UserData[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Reset MFA modal state
  const [showResetMfaModal, setShowResetMfaModal] = useState(false);
  const [resettingMfa, setResettingMfa] = useState(false);

  // Create user modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [defaultAccessType, setDefaultAccessType] = useState<UserData['access_type']>('WEB_ONLY');
  const [newUser, setNewUser] = useState({
    email: '',
    access_type: 'WEB_ONLY' as UserData['access_type'],
    ssh_keys: '',
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadUsers();
    // Load default access type from settings
    getAdminSettings().then(s => {
      const at = s.defaultAccessType as UserData['access_type'];
      if (at) {
        setDefaultAccessType(at);
        setNewUser(prev => ({ ...prev, access_type: at }));
      }
    }).catch(() => {});
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
    if (!newUser.email) return;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUser.email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Validate SSH keys for SFTP access types
    const requiresSSH = newUser.access_type === 'SFTP_ONLY' || newUser.access_type === 'HYBRID';
    const sshKeys = newUser.ssh_keys
      .split('\n')
      .map(k => k.trim())
      .filter(k => k.length > 0);
    
    if (requiresSSH && sshKeys.length === 0) {
      setError('SSH key is required for SFTP_ONLY and HYBRID users');
      return;
    }

    setCreating(true);
    setError('');

    try {
      const createdUser = await createUser({
        email: newUser.email,
        access_type: newUser.access_type,
        ssh_keys: sshKeys.length > 0 ? sshKeys : undefined,
        status: 'active',
      });

      // Show username in success message, especially important for SFTP users
      if (newUser.access_type === 'SFTP_ONLY') {
        setSuccess(`SFTP user created successfully. Username: ${createdUser.username}`);
      } else if (newUser.access_type === 'HYBRID') {
        setSuccess(`User created successfully. Username: ${createdUser.username}. Web login credentials sent via email.`);
      } else {
        setSuccess(`User created successfully. Login credentials sent to ${newUser.email}`);
      }
      
      setShowCreateModal(false);
      setNewUser({
        email: '',
        access_type: defaultAccessType,
        ssh_keys: '',
      });
      await loadUsers();
    } catch (err: any) {
      // Handle specific error cases with clear messages
      if (err.statusCode === 409 || err.message?.includes('already exists')) {
        setError(`A user with email ${newUser.email} already exists`);
      } else if (err.message?.includes('Invalid')) {
        setError(err.message);
      } else {
        setError(err.message || 'Failed to create user. Please try again.');
      }
    } finally {
      setCreating(false);
    }
  }

  function getEmailValidationError(): string | undefined {
    if (!newUser.email) return undefined;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUser.email)) {
      return 'Invalid email format';
    }
    
    return undefined;
  }

  function validateSSHKey(key: string): string | undefined {
    const trimmed = key.trim();
    if (!trimmed) return undefined; // Empty is handled separately
    
    // Check for valid SSH key format (starts with key type)
    const validPrefixes = ['ssh-rsa', 'ssh-ed25519', 'ecdsa-sha2-', 'ssh-dss'];
    if (!validPrefixes.some(prefix => trimmed.startsWith(prefix))) {
      return 'SSH key must start with a valid key type (ssh-rsa, ssh-ed25519, etc.)';
    }
    
    // Basic structure check: should have at least 2 parts (type and key data)
    const parts = trimmed.split(/\s+/);
    if (parts.length < 2) {
      return 'Invalid SSH key format';
    }
    
    return undefined;
  }

  function getSSHKeyValidationError(): string | undefined {
    const requiresSSH = newUser.access_type === 'SFTP_ONLY' || newUser.access_type === 'HYBRID';
    if (!requiresSSH) return undefined;

    const trimmed = newUser.ssh_keys.trim();
    if (trimmed.length === 0) {
      return 'At least one SSH key is required';
    }

    return validateSSHKey(trimmed);
  }

  function isCreateButtonDisabled(): boolean {
    if (!newUser.email) return true;
    if (getEmailValidationError()) return true;
    if (getSSHKeyValidationError()) return true;
    
    return false;
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

  async function handleResetMfa() {
    if (selectedItems.length !== 1) return;

    const user = selectedItems[0];
    setResettingMfa(true);
    setError('');

    try {
      await resetUserMFA(user.username);
      setSuccess(`MFA has been reset for ${user.email}. They will need to set up MFA again.`);
      setShowResetMfaModal(false);
      setSelectedItems([]);
    } catch (err: any) {
      setError(err.message || 'Failed to reset MFA');
      setShowResetMfaModal(false);
    } finally {
      setResettingMfa(false);
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
    const isSftpType = accessType === 'SFTP_ONLY' || accessType === 'HYBRID';
    if (!sftpEnabled && isSftpType) {
      return (
        <SpaceBetween direction="horizontal" size="xxs">
          <span style={{ textDecoration: 'line-through', opacity: 0.6 }}>
            <Badge color={colors[accessType] || 'grey'}>{accessType}</Badge>
          </span>
          <Icon name="status-warning" variant="warning" />
        </SpaceBetween>
      );
    }
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

        {selectedItems.some(u => u.is_root) && (
          <Alert type="info">
            Root users cannot be modified or deleted through the web interface. They can only be managed via CDK deployment for security reasons.
          </Alert>
        )}

        {!sftpEnabled && users.some(u => u.access_type === 'SFTP_ONLY' || u.access_type === 'HYBRID') && (
          <Alert type="warning">
            SFTP is currently disabled, but some users have SFTP-dependent access types (SFTP_ONLY or HYBRID). These users will not be able to use SFTP until it is re-enabled.
          </Alert>
        )}

        <Table
          columnDefinitions={[
            {
              id: 'email',
              header: 'Email',
              cell: (item) => item.email,
            },
            ...(sftpEnabled ? [{
              id: 'username',
              header: 'SFTP User ID',
              cell: (item: UserData) => item.username,
              sortingField: 'username',
            }] : []),
            {
              id: 'access_type',
              header: 'Access Type',
              cell: (item) => item.is_root ? (
                <Badge color="blue">ROOT</Badge>
              ) : (
                getAccessTypeBadge(item.access_type)
              ),
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
          isItemDisabled={(item) => item.is_root || false}
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
                <SpaceBetween direction="horizontal" size="xs">
                  <Button
                    disabled={selectedItems.length !== 1 || selectedItems.some(u => u.is_root)}
                    onClick={() => setShowResetMfaModal(true)}
                  >
                    Reset MFA
                  </Button>
                  <Button
                    iconName="remove"
                    disabled={selectedItems.length === 0 || selectedItems.some(u => u.is_root)}
                    onClick={handleDeleteUsers}
                  >
                    Delete
                  </Button>
                </SpaceBetween>
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
                disabled={isCreateButtonDisabled()}
              >
                Create user
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <FormField 
            label="Email" 
            description="User's email address for web portal login"
            errorText={getEmailValidationError()}
          >
            <Input
              value={newUser.email}
              onChange={({ detail }) => setNewUser({ ...newUser, email: detail.value })}
              type="email"
              placeholder="john@example.com"
              invalid={!!getEmailValidationError()}
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
                { label: 'ADMIN', value: 'ADMIN', description: 'Full web portal access (no SFTP)' },
                { label: 'WEB_ONLY', value: 'WEB_ONLY', description: 'Web portal access only' },
                ...(sftpEnabled ? [
                  { label: 'SFTP_ONLY', value: 'SFTP_ONLY', description: 'SFTP access only (requires SSH key)' },
                  { label: 'HYBRID', value: 'HYBRID', description: 'Both web and SFTP access (requires SSH key)' },
                ] : []),
              ]}
            />
          </FormField>

          {(newUser.access_type === 'SFTP_ONLY' || newUser.access_type === 'HYBRID') && (
            <FormField
              label="SSH Keys"
              description="One SSH public key per line. Required for SFTP access."
              errorText={getSSHKeyValidationError()}
            >
              <Textarea
                value={newUser.ssh_keys}
                onChange={({ detail }) => setNewUser({ ...newUser, ssh_keys: detail.value })}
                placeholder="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC..."
                rows={4}
              />
            </FormField>
          )}
        </SpaceBetween>
      </Modal>

      <Modal
        visible={showResetMfaModal}
        onDismiss={() => setShowResetMfaModal(false)}
        header="Reset MFA"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setShowResetMfaModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleResetMfa}
                loading={resettingMfa}
              >
                Reset MFA
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        Are you sure you want to reset MFA for {selectedItems.length === 1 ? selectedItems[0].email : ''}? They will need to set up MFA again.
      </Modal>
    </ContentLayout>
  );
}

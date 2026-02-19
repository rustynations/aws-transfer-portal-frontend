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
import {
  listUsers, createUser, deleteUser, resetUserMFA, getAdminSettings,
  listApiKeys, createApiKey, revokeApiKey,
  type UserData, type ApiKeyMetadata,
} from '../utils/api';
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

  // Manage API Keys modal state
  const [showApiKeysModal, setShowApiKeysModal] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKeyMetadata[]>([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [apiKeyError, setApiKeyError] = useState('');
  const [showCreateKeyModal, setShowCreateKeyModal] = useState(false);
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [newKeyExpiry, setNewKeyExpiry] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);
  const [showRawKeyModal, setShowRawKeyModal] = useState(false);
  const [rawKey, setRawKey] = useState('');
  const [keyCopied, setKeyCopied] = useState(false);
  const [revokeKeyId, setRevokeKeyId] = useState<string | null>(null);
  const [revokingKey, setRevokingKey] = useState(false);

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

  function truncateKeyId(keyId: string): string {
    return keyId.length > 8 ? `${keyId.substring(0, 8)}...` : keyId;
  }

  function formatDate(timestamp?: number): string {
    if (!timestamp) return '—';
    return new Date(timestamp).toLocaleDateString();
  }

  async function loadApiKeysForUser(username: string, showError = false) {
    setApiKeysLoading(true);
    setApiKeyError('');
    try {
      const keys = await listApiKeys(username);
      setApiKeys(keys);
    } catch (err: any) {
      console.error('Failed to load API keys:', err);
      if (showError) {
        setApiKeyError(err.message || 'Failed to load API keys');
      }
    } finally {
      setApiKeysLoading(false);
    }
  }

  function handleOpenApiKeysModal() {
    if (selectedItems.length !== 1) return;
    setShowApiKeysModal(true);
    loadApiKeysForUser(selectedItems[0].username);
  }

  function handleCloseApiKeysModal() {
    setShowApiKeysModal(false);
    setApiKeys([]);
    setApiKeyError('');
  }

  async function handleCreateApiKeyForUser() {
    if (selectedItems.length !== 1) return;
    setApiKeyError('');
    setCreatingKey(true);
    try {
      const options: { username: string; label?: string; expiresInDays?: number } = {
        username: selectedItems[0].username,
      };
      if (newKeyLabel.trim()) options.label = newKeyLabel.trim();
      if (newKeyExpiry && parseInt(newKeyExpiry) > 0) options.expiresInDays = parseInt(newKeyExpiry);
      const result = await createApiKey(options);
      setRawKey(result.rawKey);
      setShowCreateKeyModal(false);
      setShowRawKeyModal(true);
      setNewKeyLabel('');
      setNewKeyExpiry('');
      await loadApiKeysForUser(selectedItems[0].username, true);
    } catch (err: any) {
      setApiKeyError(err.message || 'Failed to create API key');
    } finally {
      setCreatingKey(false);
    }
  }

  async function handleRevokeApiKeyForUser() {
    if (!revokeKeyId || selectedItems.length !== 1) return;
    setRevokingKey(true);
    setApiKeyError('');
    try {
      await revokeApiKey(revokeKeyId);
      setRevokeKeyId(null);
      await loadApiKeysForUser(selectedItems[0].username, true);
    } catch (err: any) {
      setApiKeyError(err.message || 'Failed to revoke API key');
    } finally {
      setRevokingKey(false);
    }
  }

  function handleCopyKey() {
    navigator.clipboard.writeText(rawKey);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2000);
  }

  function handleCloseRawKeyModal() {
    setRawKey('');
    setKeyCopied(false);
    setShowRawKeyModal(false);
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
                    onClick={handleOpenApiKeysModal}
                  >
                    Manage API Keys
                  </Button>
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

      {/* Manage API Keys Modal */}
      <Modal
        visible={showApiKeysModal}
        onDismiss={handleCloseApiKeysModal}
        header={`API Keys — ${selectedItems.length === 1 ? selectedItems[0].email : ''}`}
        size="large"
        footer={
          <Box float="right">
            <Button variant="link" onClick={handleCloseApiKeysModal}>
              Close
            </Button>
          </Box>
        }
      >
        <SpaceBetween size="m">
          {apiKeyError && (
            <Alert type="error" dismissible onDismiss={() => setApiKeyError('')}>
              {apiKeyError}
            </Alert>
          )}
          <Table
            loading={apiKeysLoading}
            loadingText="Loading API keys"
            items={apiKeys}
            header={
              <Header
                actions={
                  <Button onClick={() => setShowCreateKeyModal(true)}>
                    Create API Key
                  </Button>
                }
              >
                API Keys
              </Header>
            }
            empty={
              <Box textAlign="center" padding="l">
                <SpaceBetween size="s">
                  <Box variant="p" color="text-body-secondary">No API keys</Box>
                  <Button onClick={() => setShowCreateKeyModal(true)}>Create API Key</Button>
                </SpaceBetween>
              </Box>
            }
            columnDefinitions={[
              {
                id: 'keyId',
                header: 'Key ID',
                cell: (item) => <code>{truncateKeyId(item.keyId)}</code>,
              },
              {
                id: 'label',
                header: 'Label',
                cell: (item) => item.label || '—',
              },
              {
                id: 'createdAt',
                header: 'Created',
                cell: (item) => formatDate(item.createdAt),
              },
              {
                id: 'expiresAt',
                header: 'Expires',
                cell: (item) => formatDate(item.expiresAt),
              },
              {
                id: 'lastUsedAt',
                header: 'Last Used',
                cell: (item) => formatDate(item.lastUsedAt),
              },
              {
                id: 'actions',
                header: 'Actions',
                cell: (item) => (
                  <Button
                    variant="inline-link"
                    onClick={() => setRevokeKeyId(item.keyId)}
                  >
                    Revoke
                  </Button>
                ),
              },
            ]}
          />
        </SpaceBetween>
      </Modal>

      {/* Create API Key for User Modal */}
      <Modal
        visible={showCreateKeyModal}
        onDismiss={() => {
          setShowCreateKeyModal(false);
          setNewKeyLabel('');
          setNewKeyExpiry('');
        }}
        header="Create API Key"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button
                variant="link"
                onClick={() => {
                  setShowCreateKeyModal(false);
                  setNewKeyLabel('');
                  setNewKeyExpiry('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateApiKeyForUser}
                loading={creatingKey}
              >
                Create
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <FormField label="Label" description="Optional label to identify this key">
            <Input
              value={newKeyLabel}
              onChange={({ detail }) => setNewKeyLabel(detail.value)}
              placeholder="e.g., CI/CD pipeline"
              disabled={creatingKey}
            />
          </FormField>
          <FormField label="Expires in (days)" description="Optional. Leave empty for no expiration.">
            <Input
              type="number"
              value={newKeyExpiry}
              onChange={({ detail }) => setNewKeyExpiry(detail.value)}
              placeholder="e.g., 90"
              disabled={creatingKey}
            />
          </FormField>
        </SpaceBetween>
      </Modal>

      {/* Raw Key Display Modal */}
      <Modal
        visible={showRawKeyModal}
        onDismiss={handleCloseRawKeyModal}
        header="API Key Created"
        footer={
          <Box float="right">
            <Button variant="primary" onClick={handleCloseRawKeyModal}>
              Done
            </Button>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <Alert type="warning">
            Copy this API key now. You will not be able to see it again.
          </Alert>
          <FormField label="API Key">
            <SpaceBetween direction="horizontal" size="xs">
              <Input value={rawKey} readOnly />
              <Button
                iconName={keyCopied ? 'status-positive' : 'copy'}
                onClick={handleCopyKey}
              >
                {keyCopied ? 'Copied' : 'Copy'}
              </Button>
            </SpaceBetween>
          </FormField>
        </SpaceBetween>
      </Modal>

      {/* Revoke API Key Confirmation Modal */}
      <Modal
        visible={revokeKeyId !== null}
        onDismiss={() => setRevokeKeyId(null)}
        header="Revoke API Key"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setRevokeKeyId(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleRevokeApiKeyForUser}
                loading={revokingKey}
              >
                Revoke
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <Box>
            Are you sure you want to revoke this API key? This action cannot be undone and any
            applications using this key will lose access immediately.
          </Box>
          {revokeKeyId && (
            <Box variant="awsui-key-label">
              Key ID: <code>{revokeKeyId}</code>
            </Box>
          )}
        </SpaceBetween>
      </Modal>
    </ContentLayout>
  );
}

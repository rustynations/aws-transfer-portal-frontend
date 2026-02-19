import { useState, useEffect, useCallback } from 'react';
import ContentLayout from '@cloudscape-design/components/content-layout';
import Header from '@cloudscape-design/components/header';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Container from '@cloudscape-design/components/container';
import FormField from '@cloudscape-design/components/form-field';
import Input from '@cloudscape-design/components/input';
import Button from '@cloudscape-design/components/button';
import Alert from '@cloudscape-design/components/alert';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import Box from '@cloudscape-design/components/box';
import Badge from '@cloudscape-design/components/badge';
import Spinner from '@cloudscape-design/components/spinner';
import SegmentedControl from '@cloudscape-design/components/segmented-control';
import Table from '@cloudscape-design/components/table';
import Modal from '@cloudscape-design/components/modal';
import { QRCodeSVG } from 'qrcode.react';
import {
  changePassword,
  getMFAPreference,
  associateSoftwareToken,
  verifySoftwareToken,
  setPreferredMFA,
  type User,
} from '../utils/auth';
import {
  getProfile,
  updateProfile,
  listApiKeys,
  createApiKey,
  revokeApiKey,
  type UserData,
  type ApiKeyMetadata,
} from '../utils/api';
import { getThemePreference, setThemePreference, type ThemePreference } from '../utils/theme';
import { isValidTotpCode, sanitizeTotpInput, buildOtpAuthUri } from '../utils/totp-validation';

interface ProfilePageProps {
  user: User;
  onUserUpdate?: (updates: Partial<User>) => void;
}

export default function ProfilePage({ user, onUserUpdate }: ProfilePageProps) {
  const [userDetails, setUserDetails] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [savingDisplayName, setSavingDisplayName] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [theme, setTheme] = useState<ThemePreference>(getThemePreference());

  // MFA state
  const [mfaStatus, setMfaStatus] = useState<'TOTP' | 'NOMFA' | null>(null);
  const [mfaLoading, setMfaLoading] = useState(true);
  const [mfaSetupActive, setMfaSetupActive] = useState(false);
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaVerifying, setMfaVerifying] = useState(false);
  const [mfaError, setMfaError] = useState('');
  const [disableConfirm, setDisableConfirm] = useState(false);

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKeyMetadata[]>([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(true);
  const [showCreateKeyModal, setShowCreateKeyModal] = useState(false);
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [newKeyExpiry, setNewKeyExpiry] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);
  const [showRawKeyModal, setShowRawKeyModal] = useState(false);
  const [rawKey, setRawKey] = useState('');
  const [keyCopied, setKeyCopied] = useState(false);
  const [revokeKeyId, setRevokeKeyId] = useState<string | null>(null);
  const [revokingKey, setRevokingKey] = useState(false);
  const [apiKeyError, setApiKeyError] = useState('');

  useEffect(() => {
    loadUserDetails();
    loadMfaStatus();
    loadApiKeys();
  }, []);

  async function loadUserDetails() {
    try {
      setLoading(true);
      const profile = await getProfile();
      setUserDetails(profile);
      setDisplayName(profile.display_name || '');
    } catch (err: any) {
      console.error('Failed to load user details:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadMfaStatus() {
    try {
      setMfaLoading(true);
      const preference = await getMFAPreference();
      setMfaStatus(preference);
    } catch (err: any) {
      console.error('Failed to load MFA status:', err);
      setMfaError('Failed to load MFA status');
    } finally {
      setMfaLoading(false);
    }
  }

  async function handleEnableMfa() {
    setMfaError('');
    setMfaSetupActive(true);
    try {
      const secret = await associateSoftwareToken();
      setMfaSecret(secret);
    } catch (err: any) {
      setMfaError(err.message || 'Failed to start MFA setup');
      setMfaSetupActive(false);
    }
  }

  async function handleVerifyMfa() {
    setMfaError('');
    setMfaVerifying(true);
    try {
      await verifySoftwareToken(mfaCode);
      await setPreferredMFA('TOTP');
      setMfaStatus('TOTP');
      setMfaSetupActive(false);
      setMfaSecret('');
      setMfaCode('');
      setSuccess('MFA enabled successfully');
    } catch (err: any) {
      setMfaError(err.message || 'Invalid verification code. Please try again.');
    } finally {
      setMfaVerifying(false);
    }
  }

  async function handleDisableMfa() {
    setMfaError('');
    try {
      await setPreferredMFA('NOMFA');
      setMfaStatus('NOMFA');
      setDisableConfirm(false);
      setSuccess('MFA disabled successfully');
    } catch (err: any) {
      setMfaError(err.message || 'Failed to disable MFA');
    }
  }

  function handleCancelSetup() {
    setMfaSetupActive(false);
    setMfaSecret('');
    setMfaCode('');
    setMfaError('');
  }

  async function handleSaveDisplayName() {
    setSavingDisplayName(true);
    setError('');
    try {
      const result = await updateProfile({ display_name: displayName.trim() });
      setSuccess('Display name updated');
      onUserUpdate?.({ displayName: result.display_name || undefined });
    } catch (err: any) {
      setError(err.message || 'Failed to update display name');
    } finally {
      setSavingDisplayName(false);
    }
  }

  async function handleChangePassword() {
    setError('');
    setSuccess('');

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('All password fields are required');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      setError('New password must contain at least one uppercase letter');
      return;
    }
    if (!/[a-z]/.test(newPassword)) {
      setError('New password must contain at least one lowercase letter');
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      setError('New password must contain at least one number');
      return;
    }
    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      setError('New password must contain at least one special character');
      return;
    }

    setChangingPassword(true);
    try {
      await changePassword(oldPassword, newPassword);
      setSuccess('Password changed successfully');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Password change error:', err);
      if (err.code === 'NotAuthorizedException') {
        setError('Current password is incorrect');
      } else if (err.code === 'InvalidPasswordException') {
        setError('New password does not meet requirements');
      } else if (err.code === 'LimitExceededException') {
        setError('Too many attempts. Please try again later');
      } else {
        setError(err.message || 'Failed to change password');
      }
    } finally {
      setChangingPassword(false);
    }
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

  const loadApiKeys = useCallback(async (showError = false) => {
    try {
      setApiKeysLoading(true);
      const keys = await listApiKeys();
      setApiKeys(keys);
    } catch (err: any) {
      console.error('Failed to load API keys:', err);
      if (showError) {
        setApiKeyError('Failed to load API keys');
      }
    } finally {
      setApiKeysLoading(false);
    }
  }, []);

  async function handleCreateApiKey() {
    setApiKeyError('');
    setCreatingKey(true);
    try {
      const options: { label?: string; expiresInDays?: number } = {};
      if (newKeyLabel.trim()) options.label = newKeyLabel.trim();
      if (newKeyExpiry && parseInt(newKeyExpiry) > 0) options.expiresInDays = parseInt(newKeyExpiry);
      const result = await createApiKey(options);
      setRawKey(result.rawKey);
      setShowCreateKeyModal(false);
      setShowRawKeyModal(true);
      setNewKeyLabel('');
      setNewKeyExpiry('');
      await loadApiKeys(true);
    } catch (err: any) {
      setApiKeyError(err.message || 'Failed to create API key');
    } finally {
      setCreatingKey(false);
    }
  }

  async function handleRevokeApiKey() {
    if (!revokeKeyId) return;
    setRevokingKey(true);
    setApiKeyError('');
    try {
      await revokeApiKey(revokeKeyId);
      setRevokeKeyId(null);
      await loadApiKeys(true);
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

  function truncateKeyId(keyId: string): string {
    return keyId.length > 8 ? `${keyId.substring(0, 8)}...` : keyId;
  }

  function formatDate(timestamp?: number): string {
    if (!timestamp) return '—';
    return new Date(timestamp).toLocaleDateString();
  }

  return (
    <ContentLayout
      header={
        <Header variant="h1" description="Manage your account settings">
          Profile
        </Header>
      }
    >
      {loading ? (
        <Box textAlign="center" padding="xxl">
          <Spinner size="large" />
        </Box>
      ) : (
      <SpaceBetween size="l">
        {(error || success) ? (
          <Box>
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
          </Box>
        ) : null}

        <Container header={<Header variant="h2">Account Information</Header>}>
          <SpaceBetween size="m">
            <ColumnLayout columns={2} variant="text-grid">
              {(user.accessType === 'SFTP_ONLY' || user.accessType === 'HYBRID') && (
                <div key="sftp-user-id">
                  <Box variant="awsui-key-label">SFTP User ID</Box>
                  <div>
                    <code>{userDetails?.username || 'Loading...'}</code>
                  </div>
                </div>
              )}
              <div key="email">
                <Box variant="awsui-key-label">Email</Box>
                <div>{user.email}</div>
              </div>
              <div key="access-type">
                <Box variant="awsui-key-label">Access Type</Box>
                <div>{getAccessTypeBadge(user.accessType)}</div>
              </div>
            </ColumnLayout>

            <FormField label="Display name" description="Shown in the navigation bar and to other users">
              <SpaceBetween direction="horizontal" size="xs">
                <Input
                  value={displayName}
                  onChange={({ detail }) => setDisplayName(detail.value)}
                  placeholder="Enter a display name"
                  disabled={savingDisplayName}
                />
                <Button
                  onClick={handleSaveDisplayName}
                  loading={savingDisplayName}
                  disabled={displayName.trim() === (userDetails?.display_name || '')}
                >
                  Save
                </Button>
              </SpaceBetween>
            </FormField>

            <FormField label="Theme" description="Choose your preferred appearance">
              <SegmentedControl
                selectedId={theme}
                onChange={({ detail }) => {
                  const pref = detail.selectedId as ThemePreference;
                  setTheme(pref);
                  setThemePreference(pref);
                }}
                options={[
                  { id: 'light', text: 'Light' },
                  { id: 'dark', text: 'Dark' },
                  { id: 'system', text: 'System' },
                ]}
              />
            </FormField>
          </SpaceBetween>
        </Container>

        <Container header={<Header variant="h2">Multi-Factor Authentication</Header>}>
          <SpaceBetween size="m">
            {mfaLoading ? (
              <Box textAlign="center" padding="s">
                <Spinner /> Loading MFA status...
              </Box>
            ) : (
              <SpaceBetween size="m">
                {mfaError ? (
                  <Alert type="error" dismissible onDismiss={() => setMfaError('')}>
                    {mfaError}
                  </Alert>
                ) : null}

                <SpaceBetween size="xs">
                  <Box variant="awsui-key-label">Status</Box>
                  <Box>
                    {mfaStatus === 'TOTP' ? (
                      <Badge color="green">Enabled</Badge>
                    ) : (
                      <Badge color="grey">Disabled</Badge>
                    )}
                  </Box>
                </SpaceBetween>

                {mfaStatus === 'NOMFA' && !mfaSetupActive && (
                  <Button onClick={handleEnableMfa}>Enable MFA</Button>
                )}

                {mfaSetupActive && mfaSecret && (
                  <SpaceBetween size="m">
                    <Alert type="info">
                      Scan the QR code below with your authenticator app (e.g., Google Authenticator, Authy), or manually enter the secret key.
                    </Alert>

                    <Box textAlign="center">
                      <QRCodeSVG
                        value={buildOtpAuthUri(mfaSecret, user.email, 'AWS Transfer Portal')}
                        size={200}
                      />
                    </Box>

                    <FormField label="Secret key" description="Manually enter this key in your authenticator app if you cannot scan the QR code">
                      <Box>
                        <code>{mfaSecret}</code>
                      </Box>
                    </FormField>

                    <FormField label="Verification code" description="Enter the 6-digit code from your authenticator app">
                      <Input
                        value={mfaCode}
                        onChange={({ detail }) => setMfaCode(sanitizeTotpInput(detail.value).slice(0, 6))}
                        placeholder="000000"
                        disabled={mfaVerifying}
                        inputMode="numeric"
                      />
                    </FormField>

                    <SpaceBetween direction="horizontal" size="xs">
                      <Button
                        variant="primary"
                        onClick={handleVerifyMfa}
                        loading={mfaVerifying}
                        disabled={!isValidTotpCode(mfaCode)}
                      >
                        Verify &amp; Enable
                      </Button>
                      <Button onClick={handleCancelSetup} disabled={mfaVerifying}>
                        Cancel
                      </Button>
                    </SpaceBetween>
                  </SpaceBetween>
                )}

                {mfaStatus === 'TOTP' && !disableConfirm && (
                  <Button onClick={() => setDisableConfirm(true)}>Disable MFA</Button>
                )}

                {disableConfirm && (
                  <SpaceBetween size="s">
                    <Alert type="warning">
                      Are you sure you want to disable MFA? Your account will be less secure.
                    </Alert>
                    <SpaceBetween direction="horizontal" size="xs">
                      <Button variant="primary" onClick={handleDisableMfa}>
                        Confirm Disable
                      </Button>
                      <Button onClick={() => setDisableConfirm(false)}>Cancel</Button>
                    </SpaceBetween>
                  </SpaceBetween>
                )}
              </SpaceBetween>
            )}
          </SpaceBetween>
        </Container>

        <Container
          header={
            <Header
              variant="h2"
              actions={
                <Button onClick={() => setShowCreateKeyModal(true)}>
                  Create API Key
                </Button>
              }
            >
              API Keys
            </Header>
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
        </Container>

        <Container header={<Header variant="h2">Change Password</Header>}>
          <SpaceBetween size="m">
            <Alert type="info">
              Password must be at least 8 characters and contain uppercase, lowercase, numbers, and special characters.
            </Alert>

            <FormField label="Current Password">
              <Input
                type="password"
                value={oldPassword}
                onChange={({ detail }) => setOldPassword(detail.value)}
                placeholder="Enter current password"
                disabled={changingPassword}
              />
            </FormField>

            <FormField label="New Password">
              <Input
                type="password"
                value={newPassword}
                onChange={({ detail }) => setNewPassword(detail.value)}
                placeholder="Enter new password"
                disabled={changingPassword}
              />
            </FormField>

            <FormField label="Confirm New Password">
              <Input
                type="password"
                value={confirmPassword}
                onChange={({ detail }) => setConfirmPassword(detail.value)}
                placeholder="Confirm new password"
                disabled={changingPassword}
              />
            </FormField>

            <Button
              variant="primary"
              onClick={handleChangePassword}
              loading={changingPassword}
              disabled={!oldPassword || !newPassword || !confirmPassword}
            >
              Change Password
            </Button>
          </SpaceBetween>
        </Container>
      </SpaceBetween>
      )}

      {/* Create API Key Modal */}
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
                onClick={handleCreateApiKey}
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
            Copy your API key now. You will not be able to see it again.
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

      {/* Revoke Confirmation Modal */}
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
                onClick={handleRevokeApiKey}
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

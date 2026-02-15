import { useState, useEffect } from 'react';
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
import { QRCodeSVG } from 'qrcode.react';
import {
  changePassword,
  getMFAPreference,
  associateSoftwareToken,
  verifySoftwareToken,
  setPreferredMFA,
  type User,
} from '../utils/auth';
import { getProfile, updateProfile, type UserData } from '../utils/api';
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

  useEffect(() => {
    loadUserDetails();
    loadMfaStatus();
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
    </ContentLayout>
  );
}

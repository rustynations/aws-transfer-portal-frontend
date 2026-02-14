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
import { changePassword, type User } from '../utils/auth';
import { listUsers, type UserData } from '../utils/api';

interface ProfilePageProps {
  user: User;
}

export default function ProfilePage({ user }: ProfilePageProps) {
  const [userDetails, setUserDetails] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadUserDetails();
  }, []);

  async function loadUserDetails() {
    try {
      setLoading(true);
      // Get all users and find current user by email
      const users = await listUsers();
      const currentUser = users.find(u => u.email === user.email);
      setUserDetails(currentUser || null);
    } catch (err: any) {
      console.error('Failed to load user details:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleChangePassword() {
    setError('');
    setSuccess('');

    // Validation
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
      
      // Handle specific Cognito errors
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

  if (loading) {
    return (
      <ContentLayout>
        <Box textAlign="center" padding="xxl">
          <Spinner size="large" />
        </Box>
      </ContentLayout>
    );
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

        <Container header={<Header variant="h2">Account Information</Header>}>
          <ColumnLayout columns={2} variant="text-grid">
            {(user.accessType === 'SFTP_ONLY' || user.accessType === 'HYBRID') && (
              <div>
                <Box variant="awsui-key-label">SFTP User ID</Box>
                <div>
                  <code>{userDetails?.username || 'Loading...'}</code>
                </div>
              </div>
            )}
            <div>
              <Box variant="awsui-key-label">Email</Box>
              <div>{user.email}</div>
            </div>
            <div>
              <Box variant="awsui-key-label">Access Type</Box>
              <div>{getAccessTypeBadge(user.accessType)}</div>
            </div>
          </ColumnLayout>
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
    </ContentLayout>
  );
}

import { useState, useEffect, type FormEvent } from 'react';
import Container from '@cloudscape-design/components/container';
import Header from '@cloudscape-design/components/header';
import SpaceBetween from '@cloudscape-design/components/space-between';
import FormField from '@cloudscape-design/components/form-field';
import Input from '@cloudscape-design/components/input';
import Button from '@cloudscape-design/components/button';
import Alert from '@cloudscape-design/components/alert';
import Box from '@cloudscape-design/components/box';
import Link from '@cloudscape-design/components/link';
import { login, completeNewPassword, forgotPassword, confirmPasswordReset, confirmMFACode } from '../utils/auth';
import { sanitizeTotpInput, isValidTotpCode } from '../utils/totp-validation';
import { getPublicSettings } from '../config';
import { CognitoUser } from 'amazon-cognito-identity-js';

interface LoginPageProps {
  onLogin: (message?: string) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordChangeRequired, setPasswordChangeRequired] = useState(false);
  const [mfaChallengeRequired, setMfaChallengeRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [resetCodeSent, setResetCodeSent] = useState(false);
  const [cognitoUser, setCognitoUser] = useState<CognitoUser | null>(null);
  const [lastResetRequestTime, setLastResetRequestTime] = useState<number>(0);
  const [resetCooldown, setResetCooldown] = useState<number>(0);

  const publicSettings = getPublicSettings();
  const loginDescription = publicSettings?.loginDescription || 'Secure file transfer powered by AWS Transfer Family';

  // Email validation
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const emailError = email && !isValidEmail(email) ? 'Please enter a valid email address' : '';

  // Rate limiting: 60 second cooldown between reset requests
  const RESET_COOLDOWN_SECONDS = 60;

  // Update cooldown timer
  useEffect(() => {
    if (resetCooldown > 0) {
      const timer = setTimeout(() => {
        setResetCooldown(resetCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resetCooldown]);

  // Clear success message when email changes
  useEffect(() => {
    if (success) {
      setSuccess('');
    }
  }, [email]);

  // Real-time password validation
  const validatePassword = (pwd: string) => {
    const errors: string[] = [];
    if (pwd.length < 8) errors.push('At least 8 characters');
    if (!/[A-Z]/.test(pwd)) errors.push('One uppercase letter');
    if (!/[a-z]/.test(pwd)) errors.push('One lowercase letter');
    if (!/[0-9]/.test(pwd)) errors.push('One number');
    if (!/[^A-Za-z0-9]/.test(pwd)) errors.push('One special character');
    return errors;
  };

  const passwordErrors = newPassword ? validatePassword(newPassword) : [];
  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;
  const isPasswordValid = passwordErrors.length === 0 && passwordsMatch;
  const confirmPasswordError = confirmPassword && !passwordsMatch ? 'Passwords do not match' : '';

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Check rate limiting
    const now = Date.now();
    const timeSinceLastRequest = (now - lastResetRequestTime) / 1000;
    if (timeSinceLastRequest < RESET_COOLDOWN_SECONDS) {
      const remainingTime = Math.ceil(RESET_COOLDOWN_SECONDS - timeSinceLastRequest);
      setError(`Please wait ${remainingTime} seconds before requesting another code`);
      return;
    }

    setLoading(true);

    try {
      await forgotPassword(email);
      setResetCodeSent(true);
      setSuccess(''); // Clear success message when moving to next step
      setLastResetRequestTime(now);
      setResetCooldown(RESET_COOLDOWN_SECONDS);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!resetCode) {
      setError('Please enter the reset code from your email');
      return;
    }

    if (!isPasswordValid) {
      return;
    }

    setLoading(true);

    try {
      await confirmPasswordReset(email, resetCode, newPassword);
      setSuccess('Password reset successfully! Redirecting to sign in...');
      // Keep loading state and wait before redirecting
      setTimeout(() => {
        setForgotPasswordMode(false);
        setResetCodeSent(false);
        setResetCode('');
        setNewPassword('');
        setConfirmPassword('');
        setLoading(false);
        // Show success message on login page
        setSuccess('Your password has been reset successfully. You can now sign in with your new password.');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      
      // Check if password change is required
      if ('challengeName' in result && result.challengeName === 'NEW_PASSWORD_REQUIRED') {
        setPasswordChangeRequired(true);
        setCognitoUser(result.cognitoUser);
      } else if ('challengeName' in result && result.challengeName === 'SOFTWARE_TOKEN_MFA') {
        setMfaChallengeRequired(true);
        setCognitoUser(result.cognitoUser);
      } else {
        onLogin();
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!isPasswordValid) {
      return;
    }

    setLoading(true);

    try {
      if (!cognitoUser) {
        throw new Error('No user session');
      }
      await completeNewPassword(cognitoUser, newPassword);
      // Pass success message to parent
      onLogin('Password changed successfully! Welcome to AWS Transfer Portal.');
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
      setLoading(false);
    }
  };

  const handleMFASubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!cognitoUser) {
        throw new Error('No user session');
      }
      await confirmMFACode(cognitoUser, mfaCode);
      onLogin();
    } catch (err: any) {
      setError(err.message || 'Invalid verification code. Please try again.');
      setLoading(false);
    }
  };

  // MFA challenge flow
  if (mfaChallengeRequired) {
    return (
      
        <Box padding={{ vertical: 'xxxl' }}>
        <div style={{ maxWidth: '400px', margin: '0 auto' }}>
          <form onSubmit={handleMFASubmit}>
            <SpaceBetween size="l">
              <Container
                header={
                  <Header variant="h1">
                    Multi-Factor Authentication
                  </Header>
                }
              >
                <SpaceBetween size="m">
                  <Alert type="info">
                    Enter the 6-digit code from your authenticator app to complete sign in.
                  </Alert>

                  {error && (
                    <Alert type="error" dismissible onDismiss={() => setError('')}>
                      {error}
                    </Alert>
                  )}

                  <FormField label="Authentication Code">
                    <Input
                      value={mfaCode}
                      onChange={({ detail }) => setMfaCode(sanitizeTotpInput(detail.value))}
                      placeholder="Enter 6-digit code"
                      disabled={loading}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      autoFocus
                    />
                  </FormField>

                  <Button
                    variant="primary"
                    formAction="submit"
                    loading={loading}
                    fullWidth
                    disabled={!isValidTotpCode(mfaCode) || loading}
                  >
                    Verify
                  </Button>

                  <Box textAlign="center">
                    <Link onFollow={() => {
                      setMfaChallengeRequired(false);
                      setMfaCode('');
                      setError('');
                      setCognitoUser(null);
                    }}>
                      Back to sign in
                    </Link>
                  </Box>
                </SpaceBetween>
              </Container>

              <Box textAlign="center" color="text-body-secondary" fontSize="body-s">
                {loginDescription}
              </Box>
            </SpaceBetween>
          </form>
        </div>
      </Box>

    );
  }

  if (passwordChangeRequired) {
    return (
      
        <Box padding={{ vertical: 'xxxl' }}>
        <div style={{ maxWidth: '400px', margin: '0 auto' }}>
          <form onSubmit={handlePasswordChange}>
            <SpaceBetween size="l">
              <Container
                header={
                  <Header variant="h1">
                    Change Password
                  </Header>
                }
              >
                <SpaceBetween size="m">
                  <Alert type="info">
                    You must change your temporary password before continuing.
                  </Alert>

                  {error && (
                    <Alert type="error" dismissible onDismiss={() => setError('')}>
                      {error}
                    </Alert>
                  )}

                  <FormField 
                    label="New Password"
                    description="Must be at least 8 characters with uppercase, lowercase, number, and special character"
                    errorText={passwordErrors.length > 0 ? `Missing: ${passwordErrors.join(', ')}` : undefined}
                  >
                    <Input
                      value={newPassword}
                      onChange={({ detail }) => setNewPassword(detail.value)}
                      type="password"
                      placeholder="Enter new password"
                      disabled={loading}
                      autoComplete="new-password"
                      invalid={passwordErrors.length > 0}
                      autoFocus
                    />
                  </FormField>

                  <FormField 
                    label="Confirm New Password"
                    errorText={confirmPasswordError}
                  >
                    <Input
                      value={confirmPassword}
                      onChange={({ detail }) => setConfirmPassword(detail.value)}
                      type="password"
                      placeholder="Confirm new password"
                      disabled={loading}
                      autoComplete="new-password"
                      invalid={!!confirmPasswordError}
                    />
                  </FormField>

                  <Button
                    variant="primary"
                    formAction="submit"
                    loading={loading}
                    fullWidth
                    disabled={!isPasswordValid || loading}
                  >
                    Change Password
                  </Button>
                </SpaceBetween>
              </Container>

              <Box textAlign="center" color="text-body-secondary" fontSize="body-s">
                {loginDescription}
              </Box>
            </SpaceBetween>
          </form>
        </div>
      </Box>

    );
  }

  // Forgot password flow
  if (forgotPasswordMode) {
    return (
      
        <Box padding={{ vertical: 'xxxl' }}>
        <div style={{ maxWidth: '400px', margin: '0 auto' }}>
          <form onSubmit={resetCodeSent ? handleResetPassword : handleForgotPassword}>
            <SpaceBetween size="l">
              <Container
                header={
                  <Header variant="h1">
                    Reset Password
                  </Header>
                }
              >
                <SpaceBetween size="m">
                  {!resetCodeSent ? (
                    <>
                      <Box variant="p" color="text-body-secondary">
                        Enter your email address and we'll send you a password reset code.
                      </Box>

                      {error && (
                        <Alert type="error" dismissible onDismiss={() => setError('')}>
                          {error}
                        </Alert>
                      )}

                      {success && (
                        <Alert type="success">
                          {success}
                          {resetCooldown > 0 && (
                            <> You can request another code in {resetCooldown} seconds.</>
                          )}
                        </Alert>
                      )}

                      <FormField 
                        label="Email"
                        errorText={emailError}
                      >
                        <Input
                          value={email}
                          onChange={({ detail }) => setEmail(detail.value)}
                          type="email"
                          placeholder="user@example.com"
                          disabled={loading}
                          autoComplete="email"
                          invalid={!!emailError}
                          autoFocus
                        />
                      </FormField>

                      <div style={{ marginTop: '16px' }}>
                        <SpaceBetween size="m">
                          <Button
                            variant="primary"
                            formAction="submit"
                            loading={loading}
                            fullWidth
                            disabled={!email || !!emailError || loading || resetCooldown > 0}
                          >
                            {resetCooldown > 0 
                              ? `Wait ${resetCooldown}s to resend` 
                              : 'Send Reset Code'}
                          </Button>

                          <Box textAlign="center">
                            <Link onFollow={() => setForgotPasswordMode(false)}>
                              Back to Sign In
                            </Link>
                          </Box>
                        </SpaceBetween>
                      </div>
                    </>
                  ) : (
                    <>
                      <SpaceBetween size="s">
                        <Alert type="info">
                          Check your email for the password reset code. If <strong>{email}</strong> is registered in our system, you will receive a code shortly.
                        </Alert>

                        {error && (
                          <Alert type="error" dismissible onDismiss={() => setError('')}>
                            {error}
                          </Alert>
                        )}
                      </SpaceBetween>

                      <FormField label="Reset Code">
                        <Input
                          value={resetCode}
                          onChange={({ detail }) => setResetCode(detail.value)}
                          placeholder="Enter code from email"
                          disabled={loading}
                          autoFocus
                        />
                      </FormField>

                      <FormField 
                        label="New Password"
                        description="Must be at least 8 characters with uppercase, lowercase, number, and special character"
                        errorText={passwordErrors.length > 0 ? `Missing: ${passwordErrors.join(', ')}` : undefined}
                      >
                        <Input
                          value={newPassword}
                          onChange={({ detail }) => setNewPassword(detail.value)}
                          type="password"
                          placeholder="Enter new password"
                          disabled={loading}
                          autoComplete="new-password"
                          invalid={passwordErrors.length > 0}
                        />
                      </FormField>

                      <FormField 
                        label="Confirm New Password"
                        errorText={confirmPasswordError}
                      >
                        <Input
                          value={confirmPassword}
                          onChange={({ detail }) => setConfirmPassword(detail.value)}
                          type="password"
                          placeholder="Confirm new password"
                          disabled={loading}
                          autoComplete="new-password"
                          invalid={!!confirmPasswordError}
                        />
                      </FormField>

                      <div style={{ marginTop: '16px' }}>
                        <SpaceBetween size="m">
                          <Button
                            variant="primary"
                            formAction="submit"
                            loading={loading}
                            fullWidth
                            disabled={!resetCode || !isPasswordValid || loading}
                          >
                            Reset Password
                          </Button>

                          <Box textAlign="center">
                            <Link onFollow={() => {
                              setForgotPasswordMode(false);
                              setResetCodeSent(false);
                            }}>
                              Back to Sign In
                            </Link>
                          </Box>
                        </SpaceBetween>
                      </div>
                    </>
                  )}
                </SpaceBetween>
              </Container>

              <Box textAlign="center" color="text-body-secondary" fontSize="body-s">
                {loginDescription}
              </Box>
            </SpaceBetween>
          </form>
        </div>
      </Box>

    );
  }

  return (
    
      <Box padding={{ vertical: 'xxxl' }}>
      <div style={{ maxWidth: '400px', margin: '0 auto' }}>
        <form onSubmit={handleSubmit}>
          <SpaceBetween size="l">
            <Container>
              <SpaceBetween size="m">
                <Box variant="p" color="text-body-secondary">
                  Sign in to manage your file transfers
                </Box>

                {success && (
                  <Alert type="success" dismissible onDismiss={() => setSuccess('')}>
                    {success}
                  </Alert>
                )}

                {error && (
                  <Alert type="error" dismissible onDismiss={() => setError('')}>
                    {error}
                  </Alert>
                )}

                <FormField label="Email">
                  <Input
                    value={email}
                    onChange={({ detail }) => setEmail(detail.value)}
                    type="email"
                    placeholder="user@example.com"
                    disabled={loading}
                    autoComplete="email"
                    autoFocus
                  />
                </FormField>

                <FormField label="Password">
                  <Input
                    value={password}
                    onChange={({ detail }) => setPassword(detail.value)}
                    type="password"
                    placeholder="Enter your password"
                    disabled={loading}
                    autoComplete="current-password"
                  />
                </FormField>

                <Button
                  variant="primary"
                  formAction="submit"
                  loading={loading}
                  fullWidth
                >
                  Sign in
                </Button>

                <Box textAlign="center">
                  <Link onFollow={() => setForgotPasswordMode(true)}>
                    Forgot password?
                  </Link>
                </Box>
              </SpaceBetween>
            </Container>

            <Box textAlign="center" color="text-body-secondary" fontSize="body-s">
              {loginDescription}
            </Box>
          </SpaceBetween>
        </form>
      </div>
    </Box>

  );
}

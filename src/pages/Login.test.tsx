import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// --- Hoisted mocks ---
const { mockLogin, mockConfirmMFACode, mockCompleteNewPassword, mockForgotPassword, mockConfirmPasswordReset } = vi.hoisted(() => ({
  mockLogin: vi.fn(),
  mockConfirmMFACode: vi.fn(),
  mockCompleteNewPassword: vi.fn(),
  mockForgotPassword: vi.fn(),
  mockConfirmPasswordReset: vi.fn(),
}));

vi.mock('../utils/auth', () => ({
  login: mockLogin,
  confirmMFACode: mockConfirmMFACode,
  completeNewPassword: mockCompleteNewPassword,
  forgotPassword: mockForgotPassword,
  confirmPasswordReset: mockConfirmPasswordReset,
}));

vi.mock('../config', () => ({
  config: {
    cognito: {
      userPoolId: 'us-east-1_TEST',
      userPoolClientId: 'test-client-id',
    },
  },
}));

vi.mock('amazon-cognito-identity-js', () => ({
  CognitoUser: vi.fn(),
  CognitoUserPool: vi.fn(),
  AuthenticationDetails: vi.fn(),
}));

import LoginPage from './Login';

const mockOnLogin = vi.fn();
const mockCognitoUser = { sendMFACode: vi.fn() };

beforeEach(() => {
  vi.clearAllMocks();
});

async function loginAndTriggerMFA() {
  mockLogin.mockResolvedValue({
    challengeName: 'SOFTWARE_TOKEN_MFA',
    cognitoUser: mockCognitoUser,
  });

  render(<LoginPage onLogin={mockOnLogin} />);

  // Fill in email and password
  const emailInput = screen.getByPlaceholderText('user@example.com');
  const passwordInput = screen.getByPlaceholderText('Enter your password');
  fireEvent.change(emailInput, { target: { value: 'user@test.com' } });
  fireEvent.change(passwordInput, { target: { value: 'Password1!' } });

  // Submit login form
  const signInButton = screen.getByRole('button', { name: 'Sign in' });
  fireEvent.click(signInButton);

  // Wait for MFA screen
  await waitFor(() => {
    expect(screen.getByText('Multi-Factor Authentication')).toBeInTheDocument();
  });
}

describe('Login MFA Challenge Flow', () => {
  it('renders MFA challenge screen when login returns MFA challenge', async () => {
    await loginAndTriggerMFA();

    expect(screen.getByText('Multi-Factor Authentication')).toBeInTheDocument();
    expect(screen.getByText(/Enter the 6-digit code from your authenticator app/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter 6-digit code')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Verify' })).toBeInTheDocument();
    expect(screen.getByText('Back to sign in')).toBeInTheDocument();
  });

  it('successful MFA code submission completes login', async () => {
    await loginAndTriggerMFA();

    mockConfirmMFACode.mockResolvedValue({ isValid: () => true });

    // Enter a valid 6-digit code
    const codeInput = screen.getByPlaceholderText('Enter 6-digit code');
    fireEvent.change(codeInput, { target: { value: '123456' } });

    // Click Verify
    const verifyButton = screen.getByRole('button', { name: 'Verify' });
    fireEvent.click(verifyButton);

    await waitFor(() => {
      expect(mockConfirmMFACode).toHaveBeenCalledWith(mockCognitoUser, '123456');
      expect(mockOnLogin).toHaveBeenCalled();
    });
  });

  it('failed MFA code shows error and allows retry', async () => {
    await loginAndTriggerMFA();

    mockConfirmMFACode.mockRejectedValue(new Error('Invalid verification code'));

    // Enter a code and submit
    const codeInput = screen.getByPlaceholderText('Enter 6-digit code');
    fireEvent.change(codeInput, { target: { value: '000000' } });

    const verifyButton = screen.getByRole('button', { name: 'Verify' });
    fireEvent.click(verifyButton);

    // Error should appear
    await waitFor(() => {
      expect(screen.getByText('Invalid verification code')).toBeInTheDocument();
    });

    // Should still be on MFA screen (can retry)
    expect(screen.getByPlaceholderText('Enter 6-digit code')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Verify' })).toBeInTheDocument();

    // Retry with a new code
    mockConfirmMFACode.mockResolvedValue({ isValid: () => true });
    fireEvent.change(codeInput, { target: { value: '999999' } });
    fireEvent.click(verifyButton);

    await waitFor(() => {
      expect(mockConfirmMFACode).toHaveBeenCalledWith(mockCognitoUser, '999999');
      expect(mockOnLogin).toHaveBeenCalled();
    });
  });

  it('"Back to sign in" resets to login form', async () => {
    await loginAndTriggerMFA();

    // Click "Back to sign in"
    const backLink = screen.getByText('Back to sign in');
    fireEvent.click(backLink);

    // Should be back on the login form
    await waitFor(() => {
      expect(screen.getByText('AWS Transfer Portal')).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText('user@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();

    // MFA screen elements should be gone
    expect(screen.queryByText('Multi-Factor Authentication')).not.toBeInTheDocument();
  });
});

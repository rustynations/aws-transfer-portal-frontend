import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { User } from '../utils/auth';

// --- Hoisted mocks ---
const {
  mockGetMFAPreference,
  mockAssociateSoftwareToken,
  mockVerifySoftwareToken,
  mockSetPreferredMFA,
  mockChangePassword,
  mockGetProfile,
  mockUpdateProfile,
} = vi.hoisted(() => ({
  mockGetMFAPreference: vi.fn(),
  mockAssociateSoftwareToken: vi.fn(),
  mockVerifySoftwareToken: vi.fn(),
  mockSetPreferredMFA: vi.fn(),
  mockChangePassword: vi.fn(),
  mockGetProfile: vi.fn(),
  mockUpdateProfile: vi.fn(),
}));

vi.mock('../utils/auth', () => ({
  getMFAPreference: mockGetMFAPreference,
  associateSoftwareToken: mockAssociateSoftwareToken,
  verifySoftwareToken: mockVerifySoftwareToken,
  setPreferredMFA: mockSetPreferredMFA,
  changePassword: mockChangePassword,
}));

vi.mock('../utils/api', () => ({
  getProfile: mockGetProfile,
  updateProfile: mockUpdateProfile,
}));

vi.mock('../config', () => ({
  config: {
    apiEndpoint: 'https://api.example.com',
    cognito: {
      userPoolId: 'us-east-1_test',
      userPoolClientId: 'test-client-id',
      region: 'us-east-1',
    },
    transferEndpoint: 'sftp.example.com',
  },
}));

vi.mock('../utils/theme', () => ({
  getThemePreference: vi.fn().mockReturnValue('system'),
  setThemePreference: vi.fn(),
}));

vi.mock('qrcode.react', () => ({
  QRCodeSVG: (props: any) => <svg data-testid="qr-code" data-value={props.value} />,
}));

import ProfilePage from './Profile';

const testUser: User = {
  username: 'testuser',
  email: 'test@example.com',
  accessType: 'WEB_ONLY',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetProfile.mockResolvedValue({
    username: 'testuser',
    email: 'test@example.com',
    display_name: 'Test User',
    access_type: 'WEB_ONLY',
  });
});

describe('Profile MFA Section', () => {
  describe('MFA status badge renders correctly', () => {
    it('shows "Enabled" badge when MFA is TOTP', async () => {
      mockGetMFAPreference.mockResolvedValue('TOTP');

      render(<ProfilePage user={testUser} />);

      await waitFor(() => {
        expect(screen.getByText('Enabled')).toBeInTheDocument();
      });
      expect(screen.queryByText('Disabled')).not.toBeInTheDocument();
    });

    it('shows "Disabled" badge when MFA is NOMFA', async () => {
      mockGetMFAPreference.mockResolvedValue('NOMFA');

      render(<ProfilePage user={testUser} />);

      await waitFor(() => {
        expect(screen.getByText('Disabled')).toBeInTheDocument();
      });
      expect(screen.queryByText('Enabled')).not.toBeInTheDocument();
    });
  });

  describe('Setup flow displays QR code and secret', () => {
    it('shows QR code and secret after clicking Enable MFA', async () => {
      mockGetMFAPreference.mockResolvedValue('NOMFA');
      mockAssociateSoftwareToken.mockResolvedValue('JBSWY3DPEHPK3PXP');

      render(<ProfilePage user={testUser} />);

      // Wait for MFA status to load
      await waitFor(() => {
        expect(screen.getByText('Enable MFA')).toBeInTheDocument();
      });

      // Click Enable MFA
      fireEvent.click(screen.getByText('Enable MFA'));

      // Wait for setup flow to appear with QR code and secret
      await waitFor(() => {
        expect(screen.getByTestId('qr-code')).toBeInTheDocument();
      });

      // Secret should be displayed in a code element
      const codeElement = screen.getByText('JBSWY3DPEHPK3PXP');
      expect(codeElement.tagName).toBe('CODE');

      // Verify & Enable button should be present but disabled (no code entered yet)
      expect(screen.getByText('Verify & Enable')).toBeInTheDocument();
    });
  });

  describe('Verification error allows retry without restarting', () => {
    it('shows error on failed verification and keeps setup flow open', async () => {
      mockGetMFAPreference.mockResolvedValue('NOMFA');
      mockAssociateSoftwareToken.mockResolvedValue('JBSWY3DPEHPK3PXP');
      mockVerifySoftwareToken.mockRejectedValueOnce(new Error('Invalid code'));

      render(<ProfilePage user={testUser} />);

      // Wait for Enable MFA button
      await waitFor(() => {
        expect(screen.getByText('Enable MFA')).toBeInTheDocument();
      });

      // Start setup
      fireEvent.click(screen.getByText('Enable MFA'));

      await waitFor(() => {
        expect(screen.getByTestId('qr-code')).toBeInTheDocument();
      });

      // Enter a code
      const codeInput = screen.getByPlaceholderText('000000');
      fireEvent.change(codeInput, { target: { value: '123456' } });

      // Click Verify & Enable
      fireEvent.click(screen.getByText('Verify & Enable'));

      // Error should appear
      await waitFor(() => {
        expect(screen.getByText('Invalid code')).toBeInTheDocument();
      });

      // Setup flow should still be open (QR code and secret still visible)
      expect(screen.getByTestId('qr-code')).toBeInTheDocument();
      expect(screen.getByText('JBSWY3DPEHPK3PXP')).toBeInTheDocument();
      expect(screen.getByText('Verify & Enable')).toBeInTheDocument();

      // Retry with correct code
      mockVerifySoftwareToken.mockResolvedValueOnce(undefined);
      mockSetPreferredMFA.mockResolvedValueOnce(undefined);

      fireEvent.change(codeInput, { target: { value: '654321' } });
      fireEvent.click(screen.getByText('Verify & Enable'));

      // Should succeed and show enabled status
      await waitFor(() => {
        expect(screen.getByText('Enabled')).toBeInTheDocument();
      });
      expect(mockVerifySoftwareToken).toHaveBeenCalledWith('654321');
      expect(mockSetPreferredMFA).toHaveBeenCalledWith('TOTP');
    });
  });

  describe('Disable flow calls setPreferredMFA(NOMFA)', () => {
    it('disables MFA after confirmation', async () => {
      mockGetMFAPreference.mockResolvedValue('TOTP');
      mockSetPreferredMFA.mockResolvedValue(undefined);

      render(<ProfilePage user={testUser} />);

      // Wait for Disable MFA button
      await waitFor(() => {
        expect(screen.getByText('Disable MFA')).toBeInTheDocument();
      });

      // Click Disable MFA
      fireEvent.click(screen.getByText('Disable MFA'));

      // Confirmation should appear
      await waitFor(() => {
        expect(screen.getByText('Confirm Disable')).toBeInTheDocument();
      });

      // Click Confirm Disable
      fireEvent.click(screen.getByText('Confirm Disable'));

      // Should call setPreferredMFA with 'NOMFA'
      await waitFor(() => {
        expect(mockSetPreferredMFA).toHaveBeenCalledWith('NOMFA');
      });

      // Status should update to Disabled
      await waitFor(() => {
        expect(screen.getByText('Disabled')).toBeInTheDocument();
      });
    });
  });
});

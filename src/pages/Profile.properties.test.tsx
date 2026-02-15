import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import * as fc from 'fast-check';
import ProfilePage from './Profile';
import type { User } from '../utils/auth';

// Mock the auth module
vi.mock('../utils/auth', () => ({
  getMFAPreference: vi.fn(),
  associateSoftwareToken: vi.fn(),
  verifySoftwareToken: vi.fn(),
  setPreferredMFA: vi.fn(),
  changePassword: vi.fn(),
}));

// Mock the API module
vi.mock('../utils/api', () => ({
  getProfile: vi.fn().mockResolvedValue({
    username: 'test',
    display_name: 'Test',
    email: 'test@test.com',
  }),
  updateProfile: vi.fn(),
}));

// Mock the config module
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

// Mock the theme module
vi.mock('../utils/theme', () => ({
  getThemePreference: vi.fn().mockReturnValue('system'),
  setThemePreference: vi.fn(),
}));

/**
 * Feature: totp-mfa, Property 2: MFA status display consistency
 * Validates: Requirements 4.1, 4.4, 5.2, 5.3
 *
 * For any MFA state (either enabled or disabled), the profile MFA section should render:
 * - A status indicator matching the current state (active badge when enabled, inactive badge when disabled)
 * - The correct action button (disable button when enabled, enable button when disabled)
 * - The action buttons should be mutually exclusive — exactly one of enable or disable is shown
 */
describe('Property 2: MFA status display consistency', () => {
  const testUser: User = {
    username: 'testuser',
    email: 'test@example.com',
    accessType: 'WEB_ONLY',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows correct badge text matching the MFA state', async () => {
    // Increase timeout for property-based test with 100 async renders
    const { getMFAPreference } = await import('../utils/auth');

    await fc.assert(
      fc.asyncProperty(fc.boolean(), async (mfaEnabled) => {
        vi.clearAllMocks();
        const mfaStatus = mfaEnabled ? 'TOTP' : 'NOMFA';
        vi.mocked(getMFAPreference).mockResolvedValue(mfaStatus as 'TOTP' | 'NOMFA');

        const { unmount } = render(<ProfilePage user={testUser} />);

        await waitFor(() => {
          expect(getMFAPreference).toHaveBeenCalled();
        });

        const expectedBadgeText = mfaEnabled ? 'Enabled' : 'Disabled';
        expect(screen.getByText(expectedBadgeText)).toBeInTheDocument();

        unmount();
      }),
      { numRuns: 100 }
    );
  }, 30000);

  it('shows correct action button for the MFA state', async () => {
    const { getMFAPreference } = await import('../utils/auth');

    await fc.assert(
      fc.asyncProperty(fc.boolean(), async (mfaEnabled) => {
        vi.clearAllMocks();
        const mfaStatus = mfaEnabled ? 'TOTP' : 'NOMFA';
        vi.mocked(getMFAPreference).mockResolvedValue(mfaStatus as 'TOTP' | 'NOMFA');

        const { unmount } = render(<ProfilePage user={testUser} />);

        await waitFor(() => {
          expect(getMFAPreference).toHaveBeenCalled();
        });

        if (mfaEnabled) {
          expect(screen.getByText('Disable MFA')).toBeInTheDocument();
        } else {
          expect(screen.getByText('Enable MFA')).toBeInTheDocument();
        }

        unmount();
      }),
      { numRuns: 100 }
    );
  }, 30000);

  it('action buttons are mutually exclusive — exactly one of enable or disable is shown', async () => {
    const { getMFAPreference } = await import('../utils/auth');

    await fc.assert(
      fc.asyncProperty(fc.boolean(), async (mfaEnabled) => {
        vi.clearAllMocks();
        const mfaStatus = mfaEnabled ? 'TOTP' : 'NOMFA';
        vi.mocked(getMFAPreference).mockResolvedValue(mfaStatus as 'TOTP' | 'NOMFA');

        const { unmount } = render(<ProfilePage user={testUser} />);

        await waitFor(() => {
          expect(getMFAPreference).toHaveBeenCalled();
        });

        const enableButton = screen.queryByText('Enable MFA');
        const disableButton = screen.queryByText('Disable MFA');

        // Exactly one must be present
        const enablePresent = enableButton !== null;
        const disablePresent = disableButton !== null;
        expect(enablePresent !== disablePresent).toBe(true);

        // The correct one is shown
        if (mfaEnabled) {
          expect(disablePresent).toBe(true);
          expect(enablePresent).toBe(false);
        } else {
          expect(enablePresent).toBe(true);
          expect(disablePresent).toBe(false);
        }

        unmount();
      }),
      { numRuns: 100 }
    );
  }, 30000);
});

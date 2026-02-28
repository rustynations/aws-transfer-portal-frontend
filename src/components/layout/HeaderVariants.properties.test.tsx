/**
 * Property 3: Fault Condition — Public vs Private Header/Footer Variants
 *
 * **Validates: Requirements 2.5, 2.6**
 *
 * For any unauthenticated render state, the layout uses PublicHeader (no user menu).
 * For any authenticated render state with random user props, the layout uses
 * PrivateHeader (with user menu showing display name or email).
 */
import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { render } from '@testing-library/react';

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/files' }),
}));

// Mock config
vi.mock('../../config', () => ({
  getPublicSettings: () => ({
    appName: 'Test Portal',
    footerText: 'Test Footer',
    footerLink: 'https://example.com',
  }),
  isSftpEnabled: () => true,
  config: {
    apiEndpoint: 'https://api.example.com',
    cognito: { userPoolId: 'us-east-1_test', userPoolClientId: 'test-client', region: 'us-east-1' },
  },
}));

// Mock auth
vi.mock('../../utils/auth', () => ({
  logout: vi.fn(),
}));

import AppShell from './AppShell';
import PublicLayout from './PublicLayout';

// --- Generators ---

const accessTypeArb = fc.constantFrom('ADMIN', 'SFTP_ONLY', 'HYBRID', 'WEB_ONLY');

const userArb = fc.record({
  username: fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9]{0,14}$/),
  email: fc.emailAddress(),
  accessType: accessTypeArb,
  displayName: fc.option(
    fc.stringMatching(/^[a-zA-Z][a-zA-Z ]{0,19}$/),
    { nil: undefined },
  ),
});

// --- Tests ---

describe('Property 3: Fault Condition — Public vs Private Header/Footer Variants', () => {
  /**
   * **Validates: Requirements 2.5**
   *
   * For any unauthenticated render state, PublicHeader is used:
   * no user menu, no "Sign out", no "Profile", no user display name.
   */
  it('PublicLayout uses PublicHeader with no user menu for unauthenticated state', () => {
    fc.assert(
      fc.property(
        fc.constant(null), // unauthenticated — no user
        () => {
          const { container, unmount } = render(
            <PublicLayout>
              <div>Login Form</div>
            </PublicLayout>
          );

          const text = container.textContent || '';

          // App title should be present
          expect(text).toContain('Test Portal');

          // No user menu items should be present
          expect(text).not.toContain('Sign out');
          expect(text).not.toContain('Profile');

          // No help link utility (private-only)
          const helpLink = container.querySelector(
            'a[href="https://github.com/rusty428/aws-transfer-portal-frontend"]',
          );
          expect(helpLink).toBeNull();

          unmount();
        },
      ),
      { numRuns: 5 },
    );
  });

  /**
   * **Validates: Requirements 2.5**
   *
   * For any authenticated render state with random user props,
   * PrivateHeader is used: user display name (or email) appears,
   * and the help link utility is present.
   */
  it('AppShell uses PrivateHeader with user menu for any authenticated user', () => {
    fc.assert(
      fc.property(userArb, (user) => {
        const { container, unmount } = render(
          <AppShell
            user={user}
            onLogout={vi.fn()}
            notifications={[]}
            onDismissNotification={vi.fn()}
          >
            <div>Page Content</div>
          </AppShell>
        );

        const text = container.textContent || '';

        // App title should be present
        expect(text).toContain('Test Portal');

        // User display name or email should appear in the header
        const expectedUserLabel = user.displayName || user.email;
        expect(text).toContain(expectedUserLabel);

        // Help link utility should be present (private header only)
        const helpLink = container.querySelector(
          'a[href="https://github.com/rusty428/aws-transfer-portal-frontend"]',
        );
        expect(helpLink).not.toBeNull();

        unmount();
      }),
      { numRuns: 20 },
    );
  });
});

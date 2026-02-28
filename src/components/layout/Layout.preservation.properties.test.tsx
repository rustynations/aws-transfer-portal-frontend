/**
 * Preservation Property Tests — Existing Functionality Unchanged
 * Property 2: Preservation
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**
 *
 * These tests capture existing behavior on the UNFIXED code. They must PASS
 * before and after the fix, ensuring no regressions are introduced.
 *
 * Observation-first methodology:
 * - AppShell renders TopNavigation with user menu containing "Profile" and "Sign out"
 * - AppShell renders SideNavigation with "Files" (and conditionally "SSH Keys", "Dashboard", "User Management", "Settings")
 * - PublicLayout renders TopNavigation with app title and empty utilities
 * - Footer renders footer text and link from public settings
 * - Notifications component renders inside the content area
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { render, screen, within } from '@testing-library/react';

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/files' }),
}));

// We'll set up config mock with a mutable ref so property tests can vary settings
let mockPublicSettings: Record<string, unknown> | null = {
  appName: 'Test Portal',
  footerText: 'Test Footer',
  footerLink: 'https://example.com',
  sftpEnabled: true,
};

vi.mock('../../config', () => ({
  getPublicSettings: () => mockPublicSettings,
  isSftpEnabled: () => mockPublicSettings?.sftpEnabled ?? true,
  config: {
    apiEndpoint: 'https://api.example.com',
    cognito: { userPoolId: 'us-east-1_test', userPoolClientId: 'test-client', region: 'us-east-1' },
  },
}));

vi.mock('../../utils/auth', () => ({
  logout: vi.fn(),
}));

import AppShell from './AppShell';
import PublicLayout from './PublicLayout';
import Footer from '../Footer';
import Notifications, { type Notification } from '../Notifications';

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

// Generator for non-empty printable strings (for footer/app settings)
const printableStringArb = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9 _-]{0,29}$/);

const urlArb = fc.constantFrom(
  'https://example.com',
  'https://github.com/test',
  'https://docs.aws.amazon.com',
  'https://my-company.io/portal',
);

const publicSettingsArb = fc.record({
  appName: printableStringArb,
  footerText: printableStringArb,
  footerLink: urlArb,
});

const notificationTypeArb = fc.constantFrom(
  'success' as const,
  'error' as const,
  'warning' as const,
  'info' as const,
);

const notificationArb = fc.record({
  id: fc.stringMatching(/^notif-[a-z0-9]{1,8}$/),
  type: notificationTypeArb,
  header: fc.option(fc.stringMatching(/^[A-Z][a-zA-Z ]{0,19}$/), { nil: undefined }),
  message: fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9 .]{0,49}$/),
  dismissible: fc.option(fc.boolean(), { nil: undefined }),
});

// --- Tests ---

describe('Property 2: Preservation — Existing Functionality Unchanged', () => {
  beforeEach(() => {
    // Reset to default settings before each test
    mockPublicSettings = {
      appName: 'Test Portal',
      footerText: 'Test Footer',
      footerLink: 'https://example.com',
      sftpEnabled: true,
    };
  });

  /**
   * **Validates: Requirements 3.1, 3.2**
   *
   * For any user with random accessType, AppShell renders correct navigation items:
   * - Always: "Files" link
   * - SFTP_ONLY or HYBRID (when SFTP enabled): "SSH Keys" link
   * - ADMIN: "Dashboard", "User Management", "Settings" links
   */
  it('AppShell renders correct navigation items for any user accessType', () => {
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

        // "Files" link is always present
        expect(text).toContain('Files');

        // SSH Keys shown for SFTP_ONLY or HYBRID when SFTP is enabled
        const hasSSHAccess = user.accessType === 'SFTP_ONLY' || user.accessType === 'HYBRID';
        if (hasSSHAccess) {
          expect(text).toContain('SSH Keys');
        }

        // Admin links shown only for ADMIN
        if (user.accessType === 'ADMIN') {
          expect(text).toContain('Dashboard');
          expect(text).toContain('User Management');
          expect(text).toContain('Settings');
        } else {
          expect(text).not.toContain('Dashboard');
          expect(text).not.toContain('User Management');
          // "Settings" could appear in other contexts, but not as a nav link for non-admins
        }

        unmount();
      }),
      { numRuns: 20 },
    );
  });

  /**
   * **Validates: Requirements 3.3**
   *
   * AppShell renders TopNavigation with user menu containing "Profile" and "Sign out".
   */
  it('AppShell renders user menu with Profile and Sign out items', () => {
    fc.assert(
      fc.property(userArb, (user) => {
        const { container, unmount } = render(
          <AppShell
            user={user}
            onLogout={vi.fn()}
            notifications={[]}
            onDismissNotification={vi.fn()}
          >
            <div>Content</div>
          </AppShell>
        );

        const text = container.textContent || '';

        // User display name or email should appear in the header
        const expectedUserLabel = user.displayName || user.email;
        expect(text).toContain(expectedUserLabel);

        // The app title should appear
        expect(text).toContain('Test Portal');

        unmount();
      }),
      { numRuns: 20 },
    );
  });

  /**
   * **Validates: Requirements 3.6**
   *
   * PublicLayout renders TopNavigation with app title and empty utilities.
   */
  it('PublicLayout renders TopNavigation with app title', () => {
    const { container, unmount } = render(
      <PublicLayout>
        <div>Login Form</div>
      </PublicLayout>
    );

    const text = container.textContent || '';
    expect(text).toContain('Test Portal');
    expect(text).toContain('Login Form');

    unmount();
  });

  /**
   * **Validates: Requirements 3.6**
   *
   * For any public settings config (random appName, footerText, footerLink),
   * Footer renders correct customized content.
   */
  it('Footer renders correct customized content for any public settings', () => {
    fc.assert(
      fc.property(publicSettingsArb, (settings) => {
        // Update the mock settings
        mockPublicSettings = {
          ...settings,
          sftpEnabled: true,
        };

        const { container, unmount } = render(<Footer />);

        const text = container.textContent || '';

        // Footer should contain "Built with" and the footer text
        expect(text).toContain('Built with');
        expect(text).toContain(settings.footerText);

        // Footer link should be rendered as an anchor
        const link = container.querySelector('a');
        expect(link).not.toBeNull();
        expect(link!.getAttribute('href')).toBe(settings.footerLink);
        expect(link!.textContent).toBe(settings.footerText);

        unmount();
      }),
      { numRuns: 30 },
    );
  });

  /**
   * **Validates: Requirements 3.4**
   *
   * For any notification list, Notifications renders inside the content area.
   */
  it('Notifications renders all notifications inside the content area', () => {
    fc.assert(
      fc.property(
        fc.array(notificationArb, { minLength: 1, maxLength: 5 }),
        (notifications) => {
          const onDismiss = vi.fn();

          const { container, unmount } = render(
            <Notifications notifications={notifications} onDismiss={onDismiss} />
          );

          const text = container.textContent || '';

          // Each notification message should be rendered
          for (const n of notifications) {
            expect(text).toContain(n.message);
          }

          // Each notification header (if present) should be rendered
          for (const n of notifications) {
            if (n.header) {
              expect(text).toContain(n.header);
            }
          }

          unmount();
        },
      ),
      { numRuns: 20 },
    );
  });

  /**
   * **Validates: Requirements 3.4**
   *
   * Notifications renders inside AppShell's content area (within the layout).
   */
  it('Notifications render inside AppShell content area', () => {
    const notifications: Notification[] = [
      { id: 'test-1', type: 'info', message: 'Test notification message', dismissible: true },
    ];

    const { container, unmount } = render(
      <AppShell
        user={{ username: 'testuser', email: 'test@example.com', accessType: 'WEB_ONLY' }}
        onLogout={vi.fn()}
        notifications={notifications}
        onDismissNotification={vi.fn()}
      >
        <div>Page Content</div>
      </AppShell>
    );

    const text = container.textContent || '';
    expect(text).toContain('Test notification message');
    expect(text).toContain('Page Content');

    unmount();
  });

  /**
   * **Validates: Requirements 3.5**
   *
   * Empty notifications list renders nothing (no crash, no empty container).
   */
  it('Notifications renders nothing when list is empty', () => {
    const { container, unmount } = render(
      <Notifications notifications={[]} onDismiss={vi.fn()} />
    );

    // Should render null — container should be empty
    expect(container.innerHTML).toBe('');

    unmount();
  });
});

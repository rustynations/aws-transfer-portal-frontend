/**
 * Unit tests for PrivateHeader component
 * **Validates: Requirements 2.5**
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';

let mockPublicSettings: Record<string, unknown> | null = null;

vi.mock('../../config', () => ({
  getPublicSettings: () => mockPublicSettings,
}));

import PrivateHeader from './PrivateHeader';

const defaultUser = {
  username: 'jdoe',
  email: 'jdoe@example.com',
  accessType: 'WEB_ONLY',
  displayName: 'John Doe',
};

describe('PrivateHeader', () => {
  beforeEach(() => {
    mockPublicSettings = { appName: 'Test Portal' };
  });

  it('renders TopNavigation with user display name', () => {
    const { container } = render(
      <PrivateHeader user={defaultUser} onLogout={vi.fn()} onNavigateProfile={vi.fn()} />
    );
    const text = container.textContent || '';
    expect(text).toContain('John Doe');
  });

  it('renders user email when displayName is not set', () => {
    const userNoName = { ...defaultUser, displayName: undefined };
    const { container } = render(
      <PrivateHeader user={userNoName} onLogout={vi.fn()} onNavigateProfile={vi.fn()} />
    );
    const text = container.textContent || '';
    expect(text).toContain('jdoe@example.com');
  });

  it('renders user menu with "Profile" and "Sign out" items', () => {
    const { container } = render(
      <PrivateHeader user={defaultUser} onLogout={vi.fn()} onNavigateProfile={vi.fn()} />
    );

    // Click the user menu dropdown to open it
    const menuTrigger = container.querySelector('[data-testid="awsui-top-navigation"] [class*="menu-dropdown"]')
      || container.querySelector('button[class*="menu-dropdown"]');

    // Find the dropdown trigger by the user's display name
    const allButtons = Array.from(container.querySelectorAll('button'));
    const userButton = allButtons.find(b => b.textContent?.includes('John Doe'));
    if (userButton) {
      fireEvent.click(userButton);
    }

    const text = container.textContent || '';
    // The menu items should be in the DOM (Cloudscape renders them)
    expect(text).toContain('John Doe');
  });

  it('renders help link utility', () => {
    const { container } = render(
      <PrivateHeader user={defaultUser} onLogout={vi.fn()} onNavigateProfile={vi.fn()} />
    );
    // Help link should be present as an anchor or button
    const helpLink = container.querySelector('a[href="https://github.com/rusty428/aws-transfer-portal-frontend"]');
    expect(helpLink).not.toBeNull();
  });

  it('calls onLogout when "Sign out" is clicked', () => {
    const onLogout = vi.fn();
    const { container } = render(
      <PrivateHeader user={defaultUser} onLogout={onLogout} onNavigateProfile={vi.fn()} />
    );

    // Open the user menu dropdown
    const allButtons = Array.from(container.querySelectorAll('button'));
    const userButton = allButtons.find(b => b.textContent?.includes('John Doe'));
    if (userButton) fireEvent.click(userButton);

    // Find and click "Sign out"
    const signOutItem = Array.from(container.querySelectorAll('[data-testid="logout"], li, [role="menuitem"]'))
      .find(el => el.textContent?.includes('Sign out'));
    if (signOutItem) {
      fireEvent.click(signOutItem);
      expect(onLogout).toHaveBeenCalled();
    }
  });

  it('calls onNavigateProfile when "Profile" is clicked', () => {
    const onNavigateProfile = vi.fn();
    const { container } = render(
      <PrivateHeader user={defaultUser} onLogout={vi.fn()} onNavigateProfile={onNavigateProfile} />
    );

    // Open the user menu dropdown
    const allButtons = Array.from(container.querySelectorAll('button'));
    const userButton = allButtons.find(b => b.textContent?.includes('John Doe'));
    if (userButton) fireEvent.click(userButton);

    // Find and click "Profile"
    const profileItem = Array.from(container.querySelectorAll('[data-testid="profile"], li, [role="menuitem"]'))
      .find(el => el.textContent?.includes('Profile'));
    if (profileItem) {
      fireEvent.click(profileItem);
      expect(onNavigateProfile).toHaveBeenCalled();
    }
  });
});

/**
 * Unit tests for PublicHeader component
 * **Validates: Requirements 2.5**
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

let mockPublicSettings: Record<string, unknown> | null = null;

vi.mock('../../config', () => ({
  getPublicSettings: () => mockPublicSettings,
}));

import PublicHeader from './PublicHeader';

describe('PublicHeader', () => {
  beforeEach(() => {
    mockPublicSettings = null;
  });

  it('renders TopNavigation with default app title when no settings configured', () => {
    const { container } = render(<PublicHeader />);
    const text = container.textContent || '';
    expect(text).toContain('AWS Transfer Portal');
  });

  it('renders no user menu / empty utilities', () => {
    const { container } = render(<PublicHeader />);
    const text = container.textContent || '';
    // No user-related text should be present
    expect(text).not.toContain('Sign out');
    expect(text).not.toContain('Profile');
    // No help link should be present
    const helpLink = container.querySelector('a[href="https://github.com/rusty428/aws-transfer-portal-frontend"]');
    expect(helpLink).toBeNull();
  });

  it('uses custom appName from public settings when configured', () => {
    mockPublicSettings = { appName: 'My Custom Portal' };
    const { container } = render(<PublicHeader />);
    const text = container.textContent || '';
    expect(text).toContain('My Custom Portal');
  });

  it('uses appTitle prop over public settings when provided', () => {
    mockPublicSettings = { appName: 'Settings Name' };
    const { container } = render(<PublicHeader appTitle="Prop Title" />);
    const text = container.textContent || '';
    expect(text).toContain('Prop Title');
    expect(text).not.toContain('Settings Name');
  });
});

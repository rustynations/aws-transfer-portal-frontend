/**
 * Unit tests for PublicFooter and PrivateFooter components
 * **Validates: Requirements 2.6, 3.6**
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

let mockPublicSettings: Record<string, unknown> | null = null;

vi.mock('../../config', () => ({
  getPublicSettings: () => mockPublicSettings,
}));

import PublicFooter from './PublicFooter';
import PrivateFooter from './PrivateFooter';

describe('PublicFooter', () => {
  beforeEach(() => {
    mockPublicSettings = null;
  });

  it('renders footer text and link with defaults', () => {
    const { container } = render(<PublicFooter />);
    const text = container.textContent || '';
    expect(text).toContain('Built with');
    expect(text).toContain('AWS Transfer Portal');
    const link = container.querySelector('a');
    expect(link).not.toBeNull();
    expect(link!.getAttribute('href')).toBe('https://github.com/rusty428/aws-transfer-portal-frontend');
  });

  it('respects public settings customization', () => {
    mockPublicSettings = {
      appName: 'Custom App',
      footerText: 'Custom Footer',
      footerLink: 'https://custom.example.com',
    };
    const { container } = render(<PublicFooter />);
    const text = container.textContent || '';
    expect(text).toContain('Custom Footer');
    const link = container.querySelector('a');
    expect(link).not.toBeNull();
    expect(link!.getAttribute('href')).toBe('https://custom.example.com');
    expect(link!.textContent).toBe('Custom Footer');
  });

  it('hides when footerText is empty string', () => {
    mockPublicSettings = { footerText: '' };
    const { container } = render(<PublicFooter />);
    expect(container.innerHTML).toBe('');
  });
});

describe('PrivateFooter', () => {
  beforeEach(() => {
    mockPublicSettings = null;
  });

  it('renders footer text and link with defaults', () => {
    const { container } = render(<PrivateFooter />);
    const text = container.textContent || '';
    expect(text).toContain('Built with');
    expect(text).toContain('AWS Transfer Portal');
    const link = container.querySelector('a');
    expect(link).not.toBeNull();
    expect(link!.getAttribute('href')).toBe('https://github.com/rusty428/aws-transfer-portal-frontend');
  });

  it('respects public settings customization', () => {
    mockPublicSettings = {
      appName: 'My Portal',
      footerText: 'My Footer Text',
      footerLink: 'https://my-portal.example.com',
    };
    const { container } = render(<PrivateFooter />);
    const text = container.textContent || '';
    expect(text).toContain('My Footer Text');
    const link = container.querySelector('a');
    expect(link).not.toBeNull();
    expect(link!.getAttribute('href')).toBe('https://my-portal.example.com');
    expect(link!.textContent).toBe('My Footer Text');
  });

  it('hides when footerText is empty string', () => {
    mockPublicSettings = { footerText: '' };
    const { container } = render(<PrivateFooter />);
    expect(container.innerHTML).toBe('');
  });
});

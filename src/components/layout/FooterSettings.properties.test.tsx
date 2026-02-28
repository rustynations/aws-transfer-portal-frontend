/**
 * Property 3 (continued): Footer Settings Customization
 *
 * **Validates: Requirements 2.6, 3.6**
 *
 * For any random public settings config (appName, footerText, footerLink),
 * both PublicFooter and PrivateFooter render correct customized content.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { render } from '@testing-library/react';

// Mutable settings ref so property tests can vary config per run
let mockPublicSettings: Record<string, unknown> | null = null;

vi.mock('../../config', () => ({
  getPublicSettings: () => mockPublicSettings,
}));

import PublicFooter from './PublicFooter';
import PrivateFooter from './PrivateFooter';

// --- Generators ---

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

// --- Tests ---

describe('Property 3 (continued): Footer Settings Customization', () => {
  beforeEach(() => {
    mockPublicSettings = null;
  });

  /**
   * **Validates: Requirements 2.6, 3.6**
   *
   * For any random public settings, PublicFooter renders the correct
   * customized footer text and link.
   */
  it('PublicFooter renders correct customized content for any settings', () => {
    fc.assert(
      fc.property(publicSettingsArb, (settings) => {
        mockPublicSettings = { ...settings };

        const { container, unmount } = render(<PublicFooter />);
        const text = container.textContent || '';

        // Footer should contain "Built with" prefix and the footer text
        expect(text).toContain('Built with');
        expect(text).toContain(settings.footerText);

        // Footer link should be rendered as an anchor with correct href
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
   * **Validates: Requirements 2.6, 3.6**
   *
   * For any random public settings, PrivateFooter renders the correct
   * customized footer text and link.
   */
  it('PrivateFooter renders correct customized content for any settings', () => {
    fc.assert(
      fc.property(publicSettingsArb, (settings) => {
        mockPublicSettings = { ...settings };

        const { container, unmount } = render(<PrivateFooter />);
        const text = container.textContent || '';

        // Footer should contain "Built with" prefix and the footer text
        expect(text).toContain('Built with');
        expect(text).toContain(settings.footerText);

        // Footer link should be rendered as an anchor with correct href
        const link = container.querySelector('a');
        expect(link).not.toBeNull();
        expect(link!.getAttribute('href')).toBe(settings.footerLink);
        expect(link!.textContent).toBe(settings.footerText);

        unmount();
      }),
      { numRuns: 30 },
    );
  });
});

/**
 * Bug Condition Exploration Test — Viewport Layout Structure
 * Property 1: Fault Condition
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4**
 *
 * These tests encode the EXPECTED (correct) behavior. They are designed to
 * FAIL on the current unfixed code, confirming the bug exists. Once the fix
 * is applied, these tests should PASS.
 *
 * Counterexamples surfaced:
 * - body has `place-items: center` in index.css (prevents full-viewport layout)
 * - :root has font/color overrides in index.css (conflicts with Cloudscape tokens)
 * - App.css constrains #root with max-width: 1280px and padding: 2rem
 * - Footer renders inside AppLayout content area (scrolls away with content)
 * - PublicLayout uses minHeight: 100vh instead of height: 100vh (footer not sticky)
 */
import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { render } from '@testing-library/react';
import fs from 'fs';
import path from 'path';

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

// Generator for user access types
const accessTypeArb = fc.constantFrom('ADMIN', 'SFTP_ONLY', 'HYBRID', 'WEB_ONLY');

// Generator for mock user objects
const userArb = fc.record({
  username: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
  email: fc.emailAddress(),
  accessType: accessTypeArb,
  displayName: fc.option(fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0), { nil: undefined }),
});

describe('Property 1: Fault Condition — Viewport Layout Structure', () => {
  /**
   * **Validates: Requirements 1.4, 2.4**
   *
   * index.css must NOT contain `place-items: center` on body or `:root` font/color overrides.
   * These are Vite boilerplate styles that conflict with the intended full-viewport layout.
   */
  it('index.css does NOT contain Vite boilerplate (place-items: center, :root font/color overrides)', () => {
    const indexCssPath = path.resolve(__dirname, '../../index.css');
    const cssContent = fs.readFileSync(indexCssPath, 'utf-8');

    // Body should not have place-items: center
    expect(cssContent).not.toMatch(/place-items:\s*center/);

    // :root should not have font-family, color, background-color overrides
    // (Cloudscape provides its own design tokens)
    const rootBlock = cssContent.match(/:root\s*\{[^}]*\}/s);
    if (rootBlock) {
      expect(rootBlock[0]).not.toMatch(/font-family:/);
      expect(rootBlock[0]).not.toMatch(/\bcolor:/);
      expect(rootBlock[0]).not.toMatch(/background-color:/);
    }
  });

  /**
   * **Validates: Requirements 1.4, 2.4**
   *
   * App.css must NOT exist or must NOT constrain #root with max-width/padding.
   */
  it('App.css does NOT exist or does NOT constrain #root with max-width/padding', () => {
    const appCssPath = path.resolve(__dirname, '../../App.css');
    const exists = fs.existsSync(appCssPath);

    if (exists) {
      const cssContent = fs.readFileSync(appCssPath, 'utf-8');
      // #root should not have max-width or padding constraints
      expect(cssContent).not.toMatch(/#root\s*\{[^}]*max-width/s);
      expect(cssContent).not.toMatch(/#root\s*\{[^}]*padding/s);
    }
    // If file doesn't exist, that's the correct state — test passes
  });

  /**
   * **Validates: Requirements 1.1, 1.2, 2.1, 2.2**
   *
   * For any authenticated user, Footer must NOT be inside the AppLayout content area.
   * It should be a viewport-level element outside the scrollable content.
   */
  it('AppShell renders Footer OUTSIDE the AppLayout content area', () => {
    fc.assert(
      fc.property(userArb, (user) => {
        const { container, unmount } = render(
          <AppShell
            user={user}
            onLogout={vi.fn()}
            notifications={[]}
            onDismissNotification={vi.fn()}
          >
            <div data-testid="page-content">Page Content</div>
          </AppShell>
        );

        // Find the footer element (Footer component renders a div with "Built with" text and border-top)
        const allDivs = container.querySelectorAll('div');
        let footerEl: Element | null = null;
        for (const el of allDivs) {
          if (el.textContent?.includes('Built with') && el.style?.cssText?.includes('border-top')) {
            footerEl = el;
            break;
          }
        }

        expect(footerEl).not.toBeNull();

        // The footer should NOT be inside the AppLayout content area.
        // Cloudscape AppLayout renders content inside a <main> element.
        // The footer should be a sibling of AppLayout, not a descendant.
        const mainEl = container.querySelector('main');
        if (mainEl && footerEl) {
          // Footer must NOT be inside <main> (the AppLayout content area)
          expect(mainEl.contains(footerEl)).toBe(false);
        }

        // Additionally, the AppShell root should be a flex container with the footer
        // as a direct child (not nested inside AppLayout's content prop).
        // In the current buggy code, AppShell renders a Fragment (<>) with TopNavigation
        // and AppLayout as siblings — there's no viewport-height flex wrapper.
        // The footer is inside AppLayout's content prop.
        const layoutRoot = container.firstElementChild as HTMLElement;
        expect(layoutRoot).not.toBeNull();

        // The root element should be a flex container wrapping everything
        // In the buggy code, the first child is the TopNavigation (not a flex wrapper)
        expect(layoutRoot.style.display).toBe('flex');
        expect(layoutRoot.style.flexDirection).toBe('column');
        expect(layoutRoot.style.height).toBe('100vh');

        unmount();
      }),
      { numRuns: 5 },
    );
  });

  /**
   * **Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.2, 2.3**
   *
   * PublicLayout must use height: 100vh (not minHeight) with flex column,
   * and the footer must be a direct child of the viewport container
   * (not nested inside the scrollable content area).
   */
  it('PublicLayout uses height: 100vh with flex column and footer is a direct child of viewport container', () => {
    const { container, unmount } = render(
      <PublicLayout>
        <div data-testid="public-content">Public Content</div>
      </PublicLayout>
    );

    // Find the outermost layout div (first child of the render container)
    const layoutRoot = container.firstElementChild as HTMLElement;
    expect(layoutRoot).not.toBeNull();

    // The layout root should use height: 100vh (not minHeight: 100vh)
    const style = layoutRoot.style;
    expect(style.height).toBe('100vh');
    expect(style.display).toBe('flex');
    expect(style.flexDirection).toBe('column');

    // Footer should be a direct child of the layout root, not nested inside content
    const footerElements = container.querySelectorAll('div');
    let footerEl: Element | null = null;
    for (const el of footerElements) {
      if (el.textContent?.includes('Built with') && !el.querySelector('div[style*="Built with"]')) {
        // Find the footer wrapper (the one with borderTop style)
        if (el.style?.cssText?.includes('border-top') || el.getAttribute('style')?.includes('border-top')) {
          footerEl = el;
          break;
        }
      }
    }

    // Footer's parent should be the layout root (direct child of viewport container)
    if (footerEl) {
      expect(footerEl.parentElement).toBe(layoutRoot);
    }

    unmount();
  });

  /**
   * **Validates: Requirements 2.1, 2.2, 2.3**
   *
   * For any user state, the layout root must use display: flex; flex-direction: column; height: 100vh.
   * This applies to both authenticated (AppShell) and unauthenticated (PublicLayout) states.
   */
  it('layout root uses display: flex; flex-direction: column; height: 100vh for authenticated state', () => {
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

        // The outermost wrapper of AppShell should be a viewport-height flex container
        const layoutRoot = container.firstElementChild as HTMLElement;
        expect(layoutRoot).not.toBeNull();
        expect(layoutRoot.style.display).toBe('flex');
        expect(layoutRoot.style.flexDirection).toBe('column');
        expect(layoutRoot.style.height).toBe('100vh');

        unmount();
      }),
      { numRuns: 5 },
    );
  });

  it('layout root uses display: flex; flex-direction: column; height: 100vh for unauthenticated state', () => {
    const { container, unmount } = render(
      <PublicLayout>
        <div>Content</div>
      </PublicLayout>
    );

    const layoutRoot = container.firstElementChild as HTMLElement;
    expect(layoutRoot).not.toBeNull();
    expect(layoutRoot.style.display).toBe('flex');
    expect(layoutRoot.style.flexDirection).toBe('column');
    // Must be height: 100vh, NOT minHeight: 100vh
    expect(layoutRoot.style.height).toBe('100vh');

    unmount();
  });
});

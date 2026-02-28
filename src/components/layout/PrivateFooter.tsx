import Footer from '../Footer';

/**
 * Footer variant for private/authenticated views.
 * Currently delegates to the shared Footer component.
 * Separated from PublicFooter to allow future divergence.
 */
export default function PrivateFooter() {
  return <Footer />;
}

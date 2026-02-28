import Footer from '../Footer';

/**
 * Footer variant for public/unauthenticated views.
 * Currently delegates to the shared Footer component.
 * Separated from PrivateFooter to allow future divergence.
 */
export default function PublicFooter() {
  return <Footer />;
}

import type { ReactNode } from 'react';
import PublicHeader from './PublicHeader';
import PublicFooter from './PublicFooter';

interface PublicLayoutProps {
  children: ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <PublicHeader />
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {children}
      </div>
      <PublicFooter />
    </div>
  );
}

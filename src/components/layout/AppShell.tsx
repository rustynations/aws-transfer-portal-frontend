import type { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AppLayout from '@cloudscape-design/components/app-layout';
import SideNavigation, { type SideNavigationProps } from '@cloudscape-design/components/side-navigation';
import TopNavigation from '@cloudscape-design/components/top-navigation';
import { logout, type User } from '../../utils/auth';
import Notifications, { type Notification } from '../Notifications';

interface AppShellProps {
  user: User;
  onLogout: () => void;
  notifications: Notification[];
  onDismissNotification: (id: string) => void;
  children: ReactNode;
}

export default function AppShell({ user, onLogout, notifications, onDismissNotification, children }: AppShellProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = user.accessType === 'ADMIN';
  const hasSSHAccess = user.accessType === 'SFTP_ONLY' || user.accessType === 'HYBRID';

  const navigationItems: SideNavigationProps.Item[] = [
    {
      type: 'link',
      text: 'Files',
      href: '/files',
    },
  ];

  // Only show SSH Keys for users with SFTP access
  if (hasSSHAccess) {
    navigationItems.push({
      type: 'link',
      text: 'SSH Keys',
      href: '/keys',
    });
  }

  if (isAdmin) {
    navigationItems.push(
      { type: 'divider' },
      {
        type: 'link',
        text: 'Dashboard',
        href: '/dashboard',
      },
      {
        type: 'link',
        text: 'User Management',
        href: '/users',
      }
    );
  }

  const handleNavigate: SideNavigationProps['onFollow'] = (event) => {
    event.preventDefault();
    if (event.detail.href) {
      navigate(event.detail.href);
    }
  };

  const handleLogout = async () => {
    logout();
    onLogout();
  };

  return (
    <>
      <TopNavigation
        identity={{
          href: '/',
          title: 'AWS Transfer Portal',
        }}
        utilities={[
          {
            type: 'menu-dropdown',
            text: user.email,
            iconName: 'user-profile',
            items: [
              {
                id: 'profile',
                text: 'Profile',
              },
              {
                id: 'logout',
                text: 'Sign out',
              },
            ],
            onItemClick: ({ detail }) => {
              if (detail.id === 'logout') {
                handleLogout();
              } else if (detail.id === 'profile') {
                navigate('/profile');
              }
            },
          },
        ]}
      />
      <AppLayout
        navigation={
          <SideNavigation
            header={{ text: 'Navigation', href: '/' }}
            activeHref={location.pathname}
            onFollow={handleNavigate}
            items={navigationItems}
          />
        }
        content={
          <>
            <Notifications 
              notifications={notifications}
              onDismiss={onDismissNotification}
            />
            {children}
          </>
        }
        toolsHide
        navigationWidth={200}
      />
    </>
  );
}

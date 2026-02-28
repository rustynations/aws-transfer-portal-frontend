import TopNavigation from '@cloudscape-design/components/top-navigation';
import { getPublicSettings } from '../../config';
import type { User } from '../../utils/auth';

interface PrivateHeaderProps {
  user: User;
  onLogout: () => void;
  onNavigateProfile: () => void;
}

export default function PrivateHeader({ user, onLogout, onNavigateProfile }: PrivateHeaderProps) {
  const publicSettings = getPublicSettings();
  const appTitle = publicSettings?.appName || 'AWS Transfer Portal';

  return (
    <TopNavigation
      identity={{
        href: '/',
        title: appTitle,
      }}
      utilities={[
        {
          type: 'button',
          iconName: 'status-info',
          title: 'Help',
          ariaLabel: 'Help',
          href: 'https://github.com/rusty428/aws-transfer-portal-frontend',
          target: '_blank',
          externalIconAriaLabel: '(opens in new tab)',
        },
        {
          type: 'menu-dropdown',
          text: user.displayName || user.email,
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
              onLogout();
            } else if (detail.id === 'profile') {
              onNavigateProfile();
            }
          },
        },
      ]}
    />
  );
}

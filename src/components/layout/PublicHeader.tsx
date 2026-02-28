import TopNavigation from '@cloudscape-design/components/top-navigation';
import { getPublicSettings } from '../../config';

interface PublicHeaderProps {
  appTitle?: string;
}

export default function PublicHeader({ appTitle }: PublicHeaderProps) {
  const publicSettings = getPublicSettings();
  const resolvedTitle = appTitle ?? publicSettings?.appName ?? 'AWS Transfer Portal';
  const helpUrl = publicSettings?.helpUrl;

  const utilities: any[] = [];

  if (helpUrl) {
    utilities.push({
      type: 'button',
      iconName: 'status-info',
      title: 'Help',
      ariaLabel: 'Help',
      href: helpUrl,
      target: '_blank',
      externalIconAriaLabel: '(opens in new tab)',
    });
  }

  return (
    <TopNavigation
      identity={{ href: '/', title: resolvedTitle }}
      utilities={utilities}
    />
  );
}

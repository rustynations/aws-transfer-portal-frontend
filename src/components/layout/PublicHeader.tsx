import TopNavigation from '@cloudscape-design/components/top-navigation';
import { getPublicSettings } from '../../config';

interface PublicHeaderProps {
  appTitle?: string;
}

export default function PublicHeader({ appTitle }: PublicHeaderProps) {
  const resolvedTitle = appTitle ?? getPublicSettings()?.appName ?? 'AWS Transfer Portal';

  return (
    <TopNavigation
      identity={{ href: '/', title: resolvedTitle }}
      utilities={[]}
    />
  );
}

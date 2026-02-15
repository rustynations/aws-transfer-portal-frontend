import Tabs from '@cloudscape-design/components/tabs';
import type { FolderType } from '../utils/api';

interface TabNavigatorProps {
  activeTab: FolderType;
  onTabChange: (tab: FolderType) => void;
}

export default function TabNavigator({ activeTab, onTabChange }: TabNavigatorProps) {
  return (
    <Tabs
      activeTabId={activeTab}
      onChange={({ detail }) => onTabChange(detail.activeTabId as FolderType)}
      tabs={[
        {
          id: 'private',
          label: 'My Files',
          content: null, // Content is managed by parent component
        },
        {
          id: 'shared',
          label: 'Shared Files',
          content: null,
        },
      ]}
    />
  );
}

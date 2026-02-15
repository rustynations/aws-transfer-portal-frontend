import BreadcrumbGroup from '@cloudscape-design/components/breadcrumb-group';
import type { FolderType } from '../utils/api';
import { constructBreadcrumbs } from '../utils/pathUtils';

interface BreadcrumbTrailProps {
  activeTab: FolderType;
  currentPath: string[];
  onNavigate: (level: number) => void;
}

export default function BreadcrumbTrail({ activeTab, currentPath, onNavigate }: BreadcrumbTrailProps) {
  const tabName = activeTab === 'private' ? 'My Files' : 'Shared Files';
  const breadcrumbs = constructBreadcrumbs(tabName, currentPath);

  return (
    <BreadcrumbGroup
      items={breadcrumbs.map((crumb, index) => ({
        text: crumb.label,
        href: '#', // Prevent default navigation
      }))}
      onFollow={(event) => {
        event.preventDefault();
        const clickedIndex = event.detail.item ? 
          breadcrumbs.findIndex(b => b.label === event.detail.item?.text) : 
          0;
        
        if (clickedIndex >= 0) {
          // Navigate to the clicked level (0 = root, 1 = first folder, etc.)
          onNavigate(clickedIndex);
        }
      }}
      ariaLabel="Navigation breadcrumbs"
    />
  );
}

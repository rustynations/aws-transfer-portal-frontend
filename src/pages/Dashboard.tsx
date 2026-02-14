import { useState, useEffect } from 'react';
import ContentLayout from '@cloudscape-design/components/content-layout';
import Header from '@cloudscape-design/components/header';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Container from '@cloudscape-design/components/container';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import Box from '@cloudscape-design/components/box';
import Table from '@cloudscape-design/components/table';
import Alert from '@cloudscape-design/components/alert';
import Button from '@cloudscape-design/components/button';
import TextFilter from '@cloudscape-design/components/text-filter';
import Pagination from '@cloudscape-design/components/pagination';
import CollectionPreferences from '@cloudscape-design/components/collection-preferences';
import { useCollection } from '@cloudscape-design/collection-hooks';
import { getSystemStats, getActivityLog, type SystemStats, type ActivityLogEntry } from '../utils/api';

export default function DashboardPage() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [preferences, setPreferences] = useState({
    pageSize: 10,
    visibleContent: ['timestamp', 'username', 'action', 'protocol', 'filename']
  });

  const { items, actions, filteredItemsCount, collectionProps, filterProps, paginationProps } = useCollection(
    activity,
    {
      filtering: {
        empty: (
          <Box textAlign="center" color="inherit">
            <b>No activities</b>
          </Box>
        ),
        noMatch: (
          <Box textAlign="center" color="inherit">
            <b>No matches</b>
            <Box padding={{ bottom: 's' }} variant="p" color="inherit">
              We can't find a match.
            </Box>
            <Button onClick={() => actions.setFiltering('')}>Clear filter</Button>
          </Box>
        ),
      },
      pagination: { pageSize: preferences.pageSize },
      sorting: {},
    }
  );

  useEffect(() => {
    loadData();
    // Removed auto-refresh - users can manually refresh with the button
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError('');
      
      const [statsData, activityData] = await Promise.all([
        getSystemStats().catch(err => {
          console.error('Stats error:', err);
          return null;
        }),
        getActivityLog().catch(err => {
          console.error('Activity error:', err);
          return [];
        }),
      ]);
      
      console.log('Stats data:', statsData);
      console.log('Activity data:', activityData, 'Is array?', Array.isArray(activityData));
      
      setStats(statsData);
      // Ensure activity is always an array
      setActivity(Array.isArray(activityData) ? activityData : []);
    } catch (err: any) {
      console.error('Dashboard error:', err);
      setError(err.message || 'Failed to load dashboard data');
      setStats(null);
      setActivity([]);
    } finally {
      setLoading(false);
    }
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          description="System overview and recent activity"
          actions={
            <Button iconName="refresh" onClick={loadData} loading={loading}>
              Refresh
            </Button>
          }
        >
          Dashboard
        </Header>
      }
    >
      <SpaceBetween size="l">
        {error && (
          <Alert type="error" dismissible onDismiss={() => setError('')}>
            {error}
          </Alert>
        )}

        <Container header={<Header variant="h2">System Statistics</Header>}>
          {stats ? (
            <ColumnLayout columns={4} variant="text-grid">
              <div>
                <Box variant="awsui-key-label">Total Users</Box>
                <Box variant="awsui-value-large">{stats.totalUsers}</Box>
              </div>
              <div>
                <Box variant="awsui-key-label">Total Files</Box>
                <Box variant="awsui-value-large">{stats.totalFiles}</Box>
              </div>
              <div>
                <Box variant="awsui-key-label">Total Storage</Box>
                <Box variant="awsui-value-large">{formatBytes(stats.totalStorageBytes)}</Box>
              </div>
              <div>
                <Box variant="awsui-key-label">Admin Users</Box>
                <Box variant="awsui-value-large">{stats.usersByAccessType.ADMIN || 0}</Box>
              </div>
            </ColumnLayout>
          ) : (
            <Box>Loading...</Box>
          )}
        </Container>

        <Container header={<Header variant="h2">Users by Access Type</Header>}>
          {stats && stats.usersByAccessType ? (
            <ColumnLayout columns={4} variant="text-grid">
              <div>
                <Box variant="awsui-key-label">Admin</Box>
                <Box variant="awsui-value-large">{stats.usersByAccessType.ADMIN || 0}</Box>
              </div>
              <div>
                <Box variant="awsui-key-label">Web Only</Box>
                <Box variant="awsui-value-large">{stats.usersByAccessType.WEB_ONLY || 0}</Box>
              </div>
              <div>
                <Box variant="awsui-key-label">SFTP Only</Box>
                <Box variant="awsui-value-large">{stats.usersByAccessType.SFTP_ONLY || 0}</Box>
              </div>
              <div>
                <Box variant="awsui-key-label">Hybrid</Box>
                <Box variant="awsui-value-large">{stats.usersByAccessType.HYBRID || 0}</Box>
              </div>
            </ColumnLayout>
          ) : (
            <Box>Loading...</Box>
          )}
        </Container>

        <Table
          {...collectionProps}
          columnDefinitions={[
            {
              id: 'timestamp',
              header: 'Time',
              cell: (item) => new Date(item.timestamp).toLocaleString(),
              sortingField: 'timestamp',
            },
            {
              id: 'username',
              header: 'User',
              cell: (item) => item.email,
            },
            {
              id: 'action',
              header: 'Action',
              cell: (item) => item.action,
            },
            {
              id: 'protocol',
              header: 'Protocol',
              cell: (item) => item.protocol.toUpperCase(),
            },
            {
              id: 'filename',
              header: 'File',
              cell: (item) => item.filename || '-',
            },
          ]}
          items={items}
          loading={loading}
          loadingText="Loading activity"
          visibleColumns={preferences.visibleContent}
          filter={
            <TextFilter
              {...filterProps}
              filteringPlaceholder="Find activities"
              countText={`${filteredItemsCount} ${filteredItemsCount === 1 ? 'match' : 'matches'}`}
            />
          }
          pagination={<Pagination {...paginationProps} />}
          preferences={
            <CollectionPreferences
              title="Preferences"
              confirmLabel="Confirm"
              cancelLabel="Cancel"
              preferences={preferences}
              onConfirm={({ detail }) => setPreferences(detail as any)}
              pageSizePreference={{
                title: 'Page size',
                options: [
                  { value: 10, label: '10 activities' },
                  { value: 20, label: '20 activities' },
                  { value: 50, label: '50 activities' },
                ],
              }}
              visibleContentPreference={{
                title: 'Select visible columns',
                options: [
                  {
                    label: 'Activity properties',
                    options: [
                      { id: 'timestamp', label: 'Time', editable: false },
                      { id: 'username', label: 'User' },
                      { id: 'action', label: 'Action' },
                      { id: 'protocol', label: 'Protocol' },
                      { id: 'filename', label: 'File' },
                    ],
                  },
                ],
              }}
            />
          }
          header={
            <Header
              variant="h2"
              counter={`(${activity.length})`}
            >
              Recent Activity
            </Header>
          }
        />
      </SpaceBetween>
    </ContentLayout>
  );
}

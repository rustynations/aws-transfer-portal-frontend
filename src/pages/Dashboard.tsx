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
import { getSystemStats, getActivityLog, type SystemStats, type ActivityLogEntry } from '../utils/api';

export default function DashboardPage() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [statsData, activityData] = await Promise.all([
        getSystemStats(),
        getActivityLog(),
      ]);
      setStats(statsData);
      setActivity(activityData);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
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
          {stats ? (
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
              cell: (item) => item.username,
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
          items={activity}
          loading={loading}
          loadingText="Loading activity"
          empty={
            <Box textAlign="center" color="inherit">
              <b>No recent activity</b>
            </Box>
          }
          header={
            <Header
              variant="h2"
              description="Last 50 file operations"
            >
              Recent Activity
            </Header>
          }
        />
      </SpaceBetween>
    </ContentLayout>
  );
}

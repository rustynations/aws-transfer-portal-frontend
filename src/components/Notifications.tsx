import Alert from '@cloudscape-design/components/alert';
import SpaceBetween from '@cloudscape-design/components/space-between';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  header?: string;
  message: string;
  dismissible?: boolean;
}

interface NotificationsProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}

export default function Notifications({ notifications, onDismiss }: NotificationsProps) {
  if (notifications.length === 0) {
    return null;
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      <SpaceBetween size="s">
        {notifications.map((notification) => (
          <Alert
            key={notification.id}
            type={notification.type}
            header={notification.header}
            dismissible={notification.dismissible !== false}
            onDismiss={() => onDismiss(notification.id)}
          >
            {notification.message}
          </Alert>
        ))}
      </SpaceBetween>
    </div>
  );
}

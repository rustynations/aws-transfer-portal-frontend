import { useState, useCallback, useRef } from 'react';
import type { FlashbarProps } from '@cloudscape-design/components/flashbar';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationConfig {
  type: NotificationType;
  content: string;
  header?: string;
  /** If true, notification won't auto-dismiss (used for critical errors like network/permission errors) */
  persistent?: boolean;
}

const AUTO_DISMISS_MS = 5000;

/**
 * Hook for managing Flashbar notifications with auto-dismiss support.
 * Non-critical notifications auto-dismiss after 5 seconds.
 * Critical errors (network, permission) require manual dismissal.
 */
export function useNotifications() {
  const [items, setItems] = useState<FlashbarProps.MessageDefinition[]>([]);
  const counterRef = useRef(0);

  const dismissNotification = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const addNotification = useCallback(({ type, content, header, persistent }: NotificationConfig) => {
    const id = `notification-${++counterRef.current}`;

    const item: FlashbarProps.MessageDefinition = {
      id,
      type,
      content,
      header,
      dismissible: true,
      onDismiss: () => dismissNotification(id),
    };

    setItems(prev => [...prev, item]);

    // Auto-dismiss non-persistent notifications after 5 seconds
    if (!persistent) {
      setTimeout(() => {
        dismissNotification(id);
      }, AUTO_DISMISS_MS);
    }

    return id;
  }, [dismissNotification]);

  const notifySuccess = useCallback((content: string, header?: string) => {
    return addNotification({ type: 'success', content, header });
  }, [addNotification]);

  const notifyError = useCallback((content: string, options?: { header?: string; persistent?: boolean }) => {
    return addNotification({
      type: 'error',
      content,
      header: options?.header,
      persistent: options?.persistent ?? false,
    });
  }, [addNotification]);

  const clearAll = useCallback(() => {
    setItems([]);
  }, []);

  return {
    items,
    addNotification,
    notifySuccess,
    notifyError,
    clearAll,
    dismissNotification,
  };
}

/**
 * Categorizes an error and returns appropriate user-facing message and persistence flag.
 */
export function categorizeError(err: unknown): { message: string; persistent: boolean } {
  const error = err as { message?: string; statusCode?: number };
  const message = error?.message || '';
  const statusCode = error?.statusCode;

  // Network errors - persistent, require manual dismissal
  if (
    message.toLowerCase().includes('network') ||
    message.toLowerCase().includes('failed to fetch') ||
    message.toLowerCase().includes('unable to connect') ||
    message === 'Load failed' ||
    statusCode === 0
  ) {
    return {
      message: 'Unable to connect to server. Please check your connection and try again.',
      persistent: true,
    };
  }

  // Permission denied - persistent
  if (
    statusCode === 403 ||
    message.toLowerCase().includes('permission denied') ||
    message.toLowerCase().includes('forbidden')
  ) {
    return {
      message: "You don't have permission to perform this operation",
      persistent: true,
    };
  }

  // Non-empty folder deletion
  if (
    message.toLowerCase().includes('not empty') ||
    message.toLowerCase().includes('contains files')
  ) {
    return {
      message: 'Cannot delete folder: folder contains files or subfolders',
      persistent: false,
    };
  }

  // Folder already exists
  if (message.toLowerCase().includes('already exists')) {
    return {
      message: 'A folder with this name already exists',
      persistent: false,
    };
  }

  // Generic API error with message
  if (message) {
    return {
      message,
      persistent: false,
    };
  }

  // Fallback
  return {
    message: 'An error occurred. Please try again.',
    persistent: false,
  };
}

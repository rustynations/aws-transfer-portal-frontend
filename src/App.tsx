import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getUser, type User } from './utils/auth';
import { getThemePreference, listenForSystemThemeChanges } from './utils/theme';
import { getPublicSettings, isSftpEnabled } from './config';
import LoginPage from './pages/Login';
import PublicLayout from './components/layout/PublicLayout';
import AppShell from './components/layout/AppShell';
import FilesPage from './pages/Files';
import SSHKeysPage from './pages/SSHKeys';
import UsersPage from './pages/Users';
import DashboardPage from './pages/Dashboard';
import ProfilePage from './pages/Profile';
import SettingsPage from './pages/Settings';
import Spinner from '@cloudscape-design/components/spinner';
import Box from '@cloudscape-design/components/box';
import type { Notification } from './components/Notifications';

function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  // Listen for OS theme changes when preference is 'system'
  useEffect(() => {
    return listenForSystemThemeChanges(getThemePreference);
  }, []);

  // Apply favicon and page title from public settings
  useEffect(() => {
    const settings = getPublicSettings();
    if (settings?.faviconUrl) {
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement
        || document.createElement('link');
      link.rel = 'icon';
      link.href = settings.faviconUrl;
      document.head.appendChild(link);
    }
    if (settings?.appName) {
      document.title = settings.appName;
    }
  }, []);

  async function checkAuth() {
    try {
      const currentUser = await getUser();
      if (currentUser) {
        // Fetch display name from profile API
        try {
          const { getProfile } = await import('./utils/api');
          const profile = await getProfile();
          currentUser.displayName = profile.display_name || undefined;
        } catch {
          // Profile fetch failed — not critical, continue with email
        }
      }
      setUser(currentUser);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  const handleLogin = (message?: string) => {
    if (message) {
      addNotification({
        type: 'success',
        header: 'Success',
        message,
      });
    }
    checkAuth();
  };

  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const id = `notification-${Date.now()}`;
    setNotifications(prev => [...prev, { ...notification, id }]);
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Box textAlign="center">
          <Spinner size="large" />
          <Box variant="p" color="text-body-secondary" margin={{ top: 's' }}>
            Loading...
          </Box>
        </Box>
      </div>
    );
  }

  if (!user) {
    return <PublicLayout><LoginPage onLogin={handleLogin} /></PublicLayout>;
  }

  const isAdmin = user.accessType === 'ADMIN';
  const hasSSHAccess = user.accessType === 'SFTP_ONLY' || user.accessType === 'HYBRID';

  const handleUserUpdate = (updates: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...updates } : prev);
  };

  return (
    <BrowserRouter>
      <AppShell 
        user={user} 
        onLogout={() => setUser(null)}
        notifications={notifications}
        onDismissNotification={dismissNotification}
      >
        <Routes>
          <Route path="/" element={<Navigate to="/files" replace />} />
          <Route path="/files" element={<FilesPage />} />
          {isSftpEnabled() && hasSSHAccess && <Route path="/keys" element={<SSHKeysPage />} />}
          <Route path="/profile" element={<ProfilePage user={user} onUserUpdate={handleUserUpdate} />} />
          {isAdmin && <Route path="/users" element={<UsersPage />} />}
          {isAdmin && <Route path="/dashboard" element={<DashboardPage />} />}
          {isAdmin && <Route path="/settings" element={<SettingsPage />} />}
          <Route path="*" element={<Navigate to="/files" replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}

export default App;

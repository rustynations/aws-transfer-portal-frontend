import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getUser, type User } from './utils/auth';
import LoginPage from './pages/Login';
import AppShell from './components/layout/AppShell';
import FilesPage from './pages/Files';
import SSHKeysPage from './pages/SSHKeys';
import UsersPage from './pages/Users';
import DashboardPage from './pages/Dashboard';
import ProfilePage from './pages/Profile';
import type { Notification } from './components/Notifications';

function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const currentUser = await getUser();
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
    return <div>Loading...</div>;
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const isAdmin = user.accessType === 'ADMIN';
  const hasSSHAccess = user.accessType === 'SFTP_ONLY' || user.accessType === 'HYBRID';

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
          {hasSSHAccess && <Route path="/keys" element={<SSHKeysPage />} />}
          <Route path="/profile" element={<ProfilePage user={user} />} />
          {isAdmin && <Route path="/users" element={<UsersPage />} />}
          {isAdmin && <Route path="/dashboard" element={<DashboardPage />} />}
          <Route path="*" element={<Navigate to="/files" replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}

export default App;

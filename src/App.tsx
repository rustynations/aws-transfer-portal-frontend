import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getUser, type User } from './utils/auth';
import LoginPage from './pages/Login';
import AppShell from './components/layout/AppShell';
import FilesPage from './pages/Files';
import SSHKeysPage from './pages/SSHKeys';
import UsersPage from './pages/Users';
import DashboardPage from './pages/Dashboard';

function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <LoginPage onLogin={checkAuth} />;
  }

  const isAdmin = user.accessType === 'ADMIN';

  return (
    <BrowserRouter>
      <AppShell user={user} onLogout={() => setUser(null)}>
        <Routes>
          <Route path="/" element={<Navigate to="/files" replace />} />
          <Route path="/files" element={<FilesPage />} />
          <Route path="/keys" element={<SSHKeysPage />} />
          {isAdmin && <Route path="/users" element={<UsersPage />} />}
          {isAdmin && <Route path="/dashboard" element={<DashboardPage />} />}
          <Route path="*" element={<Navigate to="/files" replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}

export default App;

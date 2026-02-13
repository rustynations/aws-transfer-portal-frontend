import { useState, type FormEvent } from 'react';
import Container from '@cloudscape-design/components/container';
import Header from '@cloudscape-design/components/header';
import SpaceBetween from '@cloudscape-design/components/space-between';
import FormField from '@cloudscape-design/components/form-field';
import Input from '@cloudscape-design/components/input';
import Button from '@cloudscape-design/components/button';
import Alert from '@cloudscape-design/components/alert';
import Box from '@cloudscape-design/components/box';
import { login } from '../utils/auth';

interface LoginPageProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      onLogin();
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box padding={{ vertical: 'xxxl' }}>
      <div style={{ maxWidth: '400px', margin: '0 auto' }}>
        <form onSubmit={handleSubmit}>
          <SpaceBetween size="l">
            <Container
              header={
                <Header variant="h1">
                  AWS Transfer Portal
                </Header>
              }
            >
              <SpaceBetween size="m">
                <Box variant="p" color="text-body-secondary">
                  Sign in to manage your file transfers
                </Box>

                {error && (
                  <Alert type="error" dismissible onDismiss={() => setError('')}>
                    {error}
                  </Alert>
                )}

                <FormField label="Email">
                  <Input
                    value={email}
                    onChange={({ detail }) => setEmail(detail.value)}
                    type="email"
                    placeholder="user@example.com"
                    disabled={loading}
                    autoComplete="email"
                  />
                </FormField>

                <FormField label="Password">
                  <Input
                    value={password}
                    onChange={({ detail }) => setPassword(detail.value)}
                    type="password"
                    placeholder="Enter your password"
                    disabled={loading}
                    autoComplete="current-password"
                  />
                </FormField>

                <Button
                  variant="primary"
                  formAction="submit"
                  loading={loading}
                  fullWidth
                >
                  Sign in
                </Button>
              </SpaceBetween>
            </Container>

            <Box textAlign="center" color="text-body-secondary" fontSize="body-s">
              Secure file transfer powered by AWS Transfer Family
            </Box>
          </SpaceBetween>
        </form>
      </div>
    </Box>
  );
}

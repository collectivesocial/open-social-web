import { useState, useEffect } from 'react';
import { Box, Container, VStack, Heading, Text, Input, Button, Spinner, Center } from '@chakra-ui/react';
import { Navbar } from './components/Navbar';
import './App.css';

// Use relative paths - Vite proxy will forward to backend
const API_URL = '';

interface User {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  description?: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch(`${API_URL}/users/me`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return (
      <Box minH="100vh" bg="gray.50">
        <Navbar user={null} onLogout={() => {}} />
        <Center h="calc(100vh - 60px)">
          <Spinner size="xl" color="teal.500" />
        </Center>
      </Box>
    );
  }

  if (!user) {
    return (
      <Box minH="100vh" bg="gray.50">
        <Navbar user={null} onLogout={() => {}} />
        <LoginPage apiUrl={API_URL} />
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg="gray.50">
      <Navbar user={user} onLogout={handleLogout} />
      <Container maxW="container.lg" py={8}>
        <VStack gap={6} align="stretch">
          <Box bg="white" p={6} borderRadius="lg" shadow="sm">
            <Heading size="lg" mb={4}>Welcome to OpenSocial</Heading>
            <Text fontSize="lg" color="gray.600" mb={2}>
              Community management for ATProto apps
            </Text>
            {user.description && (
              <Text color="gray.600" mt={4}>
                {user.description}
              </Text>
            )}
            <Text fontSize="sm" color="gray.500" mt={4}>
              DID: {user.did}
            </Text>
          </Box>
        </VStack>
      </Container>
    </Box>
  );
}

function LoginPage({ apiUrl }: { apiUrl: string }) {
  const [handle, setHandle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Create a form to submit to the API
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = `${apiUrl}/login`;
      
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'input';
      input.value = handle;
      
      form.appendChild(input);
      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setIsLoading(false);
    }
  };

  return (
    <Container maxW="container.sm" py={20}>
      <VStack gap={8} align="stretch">
        <Box textAlign="center">
          <Heading size="2xl" mb={2}>OpenSocial</Heading>
          <Text fontSize="lg" color="gray.600">
            Community management for ATProto apps
          </Text>
        </Box>
        
        <Box bg="white" p={8} borderRadius="lg" shadow="md">
          <form onSubmit={handleLogin}>
            <VStack gap={4} align="stretch">
              <Heading size="lg">Login with ATProtocol</Heading>
              <Input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="your-handle.bsky.social"
                disabled={isLoading}
                required
                size="lg"
              />
              <Button
                type="submit"
                disabled={isLoading || !handle}
                colorPalette="teal"
                size="lg"
                width="full"
              >
                {isLoading ? 'Redirecting...' : 'Login'}
              </Button>
              {error && (
                <Text color="red.600" fontSize="sm">
                  {error}
                </Text>
              )}
            </VStack>
          </form>
        </Box>
      </VStack>
    </Container>
  );
}

export default App;

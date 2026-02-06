import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box, Container, VStack, Heading, Text, Input, Button, Spinner, Center, Grid, Flex } from '@chakra-ui/react';
import { Navbar } from './components/Navbar';
import { CommunityCard, CommunityCardSkeleton } from './components/CommunityCard';
import { EmptyState } from './components/EmptyState';
import { CreateCommunityModal } from './components/CreateCommunityModal';
import { CommunityPage } from './pages/CommunityPage';
import { AppsPage } from './pages/AppsPage';
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

interface Community {
  did: string;
  displayName: string;
  description?: string;
  avatar?: string;
}

interface Membership {
  uri: string;
  communityDid: string;
  joinedAt: string;
  status: 'active' | 'pending';
  community: Community;
  isOnlyAdmin?: boolean;
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
      <Box minH="100vh" bg="bg.page">
        <Navbar user={null} onLogout={() => {}} />
        <Center h="calc(100vh - 60px)">
          <Spinner size="xl" color="accent.default" />
        </Center>
      </Box>
    );
  }

  if (!user) {
    return (
      <Box minH="100vh" bg="bg.page">
        <Navbar user={null} onLogout={() => {}} />
        <LoginPage apiUrl={API_URL} />
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg="bg.page">
      <Navbar user={user} onLogout={handleLogout} />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/apps" element={<AppsPage />} />
        <Route path="/communities/:did" element={<CommunityPage />} />
      </Routes>
    </Box>
  );
}

function HomePage() {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [membershipsLoading, setMembershipsLoading] = useState(false);

  useEffect(() => {
    fetchMemberships();
  }, []);

  const fetchMemberships = async () => {
    setMembershipsLoading(true);
    try {
      const response = await fetch(`${API_URL}/users/me/memberships`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // For each membership, check if user is the only admin
        const membershipsWithAdminInfo = await Promise.all(
          data.memberships.map(async (membership: Membership) => {
            try {
              const communityResponse = await fetch(
                `/communities/${encodeURIComponent(membership.community.did)}`,
                { credentials: 'include' }
              );
              
              if (communityResponse.ok) {
                const communityData = await communityResponse.json();
                const admins = communityData.community?.admins || [];
                const isAdmin = communityData.is_admin;
                const isOnlyAdmin = isAdmin && admins.length === 1;
                
                return {
                  ...membership,
                  isOnlyAdmin,
                };
              }
            } catch (err) {
              console.error('Failed to check admin status:', err);
            }
            return membership;
          })
        );
        
        setMemberships(membershipsWithAdminInfo);
      }
    } catch (error) {
      console.error('Failed to fetch memberships:', error);
    } finally {
      setMembershipsLoading(false);
    }
  };

  return (
    <Container maxW="1920px" py={{ base: 4, md: 8 }} px={{ base: 4, md: 6 }}>
        <VStack gap={6} align="stretch">
          <Flex 
            direction={{ base: 'column', md: 'row' }} 
            justify="space-between" 
            align={{ base: 'stretch', md: 'center' }}
            gap={{ base: 4, md: 0 }}
          >
            <Box>
              <Heading size={{ base: 'md', md: 'lg' }} mb={2} fontFamily="heading">My Communities</Heading>
              <Text color="fg.muted" fontSize={{ base: 'sm', md: 'md' }}>
                Communities you've joined on OpenSocial
              </Text>
            </Box>
            <CreateCommunityModal onSuccess={fetchMemberships} />
          </Flex>

          {membershipsLoading ? (
            <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(4, 1fr)' }} gap={4}>
              <CommunityCardSkeleton />
              <CommunityCardSkeleton />
              <CommunityCardSkeleton />
              <CommunityCardSkeleton />
            </Grid>
          ) : memberships.length === 0 ? (
            <EmptyState
              title="No communities yet"
              description="You haven't joined any communities yet. Join a community to get started and connect with others who share your interests."
            />
          ) : (
            <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(4, 1fr)' }} gap={4}>
              {memberships.map((membership) => (
                <CommunityCard 
                  key={membership.uri} 
                  membership={membership}
                  onDelete={fetchMemberships}
                />
              ))}
            </Grid>
          )}
        </VStack>
      </Container>
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
          <Heading size="2xl" mb={2} color="fg.default" fontFamily="heading">OpenSocial</Heading>
          <Text fontSize="lg" color="fg.muted">
            Community management for ATProto apps
          </Text>
        </Box>
        
        <Box bg="bg.card" p={8} borderRadius="xl" shadow="md" borderWidth="1px" borderColor="border.card">
          <form onSubmit={handleLogin}>
            <VStack gap={4} align="stretch">
              <Heading size="lg" color="fg.default" fontFamily="heading">Login with ATProtocol</Heading>
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
                colorPalette="accent"
                variant="solid"
                size="lg"
                width="full"
              >
                {isLoading ? 'Redirecting...' : 'Login'}
              </Button>
              {error && (
                <Text color="fg.error" fontSize="sm">
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

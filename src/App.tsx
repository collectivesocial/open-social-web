import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Box, Container, VStack, Heading, Text, Input, Button, Spinner, Center, Grid, Flex } from '@chakra-ui/react';
import { Navbar } from './components/Navbar';
import { CommunityCard, CommunityCardSkeleton } from './components/CommunityCard';
import { EmptyState } from './components/EmptyState';
import { CreateCommunityModal } from './components/CreateCommunityModal';
import { csrfHeaders } from './utils/csrf';
import { apiUrl } from './utils/api';
import { sanitizeRedirectUrl } from './utils/redirect';
import { CommunityPage } from './pages/CommunityPage';
import { CommunitySettingsPage } from './pages/CommunitySettingsPage';
import { AppsPage } from './pages/AppsPage';
import './App.css';

// Use VITE_API_URL from env for production, empty string for dev (Vite proxy)
const API_URL = import.meta.env.VITE_API_URL || '';

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
  const navigate = useNavigate();

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

        // Check for pending redirect after login (e.g., from join community flow)
        const pendingRedirect = sessionStorage.getItem('pendingRedirect');
        if (pendingRedirect) {
          sessionStorage.removeItem('pendingRedirect');
          // Sanitize the redirect URL to prevent open redirects
          const safeRedirect = sanitizeRedirectUrl(pendingRedirect);
          if (safeRedirect) {
            navigate(safeRedirect);
          }
        }
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
        headers: { ...csrfHeaders() },
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
    // Allow community pages to be viewed without authentication
    // (CommunityPage handles the non-auth state and shows join UI)
    const isCommunityPage = window.location.pathname.startsWith('/communities/');
    if (!isCommunityPage) {
      return (
        <Box minH="100vh" bg="bg.page">
          <Navbar user={null} onLogout={() => {}} />
          <LoginPage apiUrl={API_URL} />
        </Box>
      );
    }
  }

  return (
    <Box minH="100vh" bg="bg.page">
      <Navbar user={user} onLogout={handleLogout} />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/apps" element={<AppsPage />} />
        <Route path="/communities/:did" element={<CommunityPage />} />
        <Route path="/communities/:did/settings" element={<CommunitySettingsPage />} />
      </Routes>
    </Box>
  );
}

function HomePage() {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [membershipsLoading, setMembershipsLoading] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Community[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    fetchMemberships();
  }, []);

  // Debounced community search (min 3 characters for query, otherwise show top communities)
  useEffect(() => {
    const trimmed = searchQuery.trim();

    // If query is 1-2 chars, clear results and wait for more input
    if (trimmed.length > 0 && trimmed.length < 3) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    const timeout = setTimeout(async () => {
      setSearchLoading(true);
      setHasSearched(trimmed.length >= 3);
      try {
        const params = new URLSearchParams();
        if (trimmed.length >= 3) {
          params.set('query', trimmed);
        }
        const response = await fetch(`${API_URL}/communities/search?${params.toString()}`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.communities);
        }
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setSearchLoading(false);
      }
    }, trimmed.length >= 3 ? 400 : 0);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

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
                apiUrl(`/communities/${encodeURIComponent(membership.community.did)}`),
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
          {/* Search Communities */}
          <Box bg="bg.card" borderRadius="xl" p={6} shadow="sm" borderWidth="1px" borderColor="border.card">
            <Heading size="md" mb={3} fontFamily="heading">
              Find Communities
            </Heading>
            <Input
              placeholder="Search communities by name or handle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="lg"
            />

            {searchLoading && (
              <Center py={4}>
                <Spinner size="sm" color="accent.default" />
              </Center>
            )}

            {!searchLoading && searchQuery.trim().length > 0 && searchQuery.trim().length < 3 && (
              <Text color="fg.muted" mt={3} textAlign="center">
                Type at least 3 characters to search
              </Text>
            )}

            {!searchLoading && hasSearched && searchResults.length === 0 && (
              <Text color="fg.muted" mt={3} textAlign="center">
                No communities found matching "{searchQuery}"
              </Text>
            )}

            {!searchLoading && searchResults.length > 0 && (
              <VStack gap={2} mt={4} align="stretch">
                {searchResults.map((community) => (
                  <Flex
                    key={community.did}
                    align="center"
                    gap={3}
                    p={3}
                    borderRadius="lg"
                    borderWidth="1px"
                    borderColor="border.card"
                    bg="bg.subtle"
                    _hover={{ bg: 'bg.muted', cursor: 'pointer' }}
                    onClick={() => {
                      window.location.href = `/communities/${encodeURIComponent(community.did)}`;
                    }}
                  >
                    <Box
                      w="40px"
                      h="40px"
                      borderRadius="full"
                      bg="accent.subtle"
                      overflow="hidden"
                      flexShrink={0}
                    >
                      {community.avatar && (
                        <img
                          src={community.avatar}
                          alt={community.displayName}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      )}
                    </Box>
                    <Box flex={1} minW={0}>
                      <Text fontWeight="medium" fontSize="sm" truncate>
                        {community.displayName}
                      </Text>
                      {community.description && (
                        <Text color="fg.muted" fontSize="xs" truncate>
                          {community.description}
                        </Text>
                      )}
                    </Box>
                  </Flex>
                ))}
              </VStack>
            )}
          </Box>

          {/* My Communities */}
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
      // Store the current URL for redirect after login (if not already stored by join flow)
      if (!sessionStorage.getItem('pendingRedirect')) {
        const currentPath = window.location.pathname + window.location.search;
        if (currentPath !== '/') {
          sessionStorage.setItem('pendingRedirect', currentPath);
        }
      }

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

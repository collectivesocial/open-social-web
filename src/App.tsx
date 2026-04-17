import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Box, Container, VStack, Heading, Text, Input, Button, Spinner, Center, Grid, Flex } from '@chakra-ui/react';
import { Navbar } from './components/Navbar';
import { CommunityCard, CommunityCardSkeleton } from './components/CommunityCard';
import { EmptyState } from './components/EmptyState';
import { CreateCommunityModal } from './components/CreateCommunityModal';
import { csrfHeaders } from './utils/csrf';
import { sanitizeRedirectUrl } from './utils/redirect';
import { CommunityPage } from './pages/CommunityPage';
import { CommunitySettingsPage } from './pages/CommunitySettingsPage';
import { AppsPage } from './pages/AppsPage';
import { ContentPage } from './pages/ContentPage';
import type { User, Community, Membership } from './types';
import './App.css';

// In dev, Vite proxy forwards relative paths to the backend.
// In production, VITE_API_URL must point to the deployed API origin.
const API_URL = import.meta.env.VITE_API_URL || '';

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
        <Route path="/content" element={<ContentPage />} />
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
                `${API_URL}/communities/${encodeURIComponent(membership.community.did)}`,
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
    <Container maxW="container.content" py={{ base: 4, md: 8 }} px={{ base: 4, md: 6 }}>
        <VStack gap={8} align="stretch">
          {/* Search Communities */}
          <Box>
            <Heading size={{ base: 'lg', md: 'xl' }} mb={2}>
              Find Communities
            </Heading>
            <Text color="fg.muted" mb={4} fontSize={{ base: 'sm', md: 'md' }}>
              Discover communities on the ATProto network
            </Text>
            <Input
              placeholder="Search by name or handle…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="lg"
              bg="bg.card"
              borderColor="border.card"
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
                    bg="bg.card"
                    _hover={{ bg: 'bg.subtle', cursor: 'pointer' }}
                    onClick={() => {
                      window.location.href = `/communities/${encodeURIComponent(community.did)}`;
                    }}
                    transition="background 0.15s"
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
          <Box>
            <Flex 
              direction={{ base: 'column', md: 'row' }} 
              justify="space-between" 
              align={{ base: 'stretch', md: 'center' }}
              gap={{ base: 4, md: 0 }}
              mb={4}
            >
              <Box>
                <Heading size={{ base: 'lg', md: 'xl' }} mb={1}>My Communities</Heading>
                <Text color="fg.muted" fontSize={{ base: 'sm', md: 'md' }}>
                  Communities you've joined on OpenSocial
                </Text>
              </Box>
              <CreateCommunityModal onSuccess={fetchMemberships} />
            </Flex>

          {membershipsLoading ? (
            <Grid templateColumns={{ base: '1fr', sm: 'repeat(auto-fit, minmax(280px, 1fr))' }} gap={4}>
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
            <Grid templateColumns={{ base: '1fr', sm: 'repeat(auto-fit, minmax(280px, 1fr))' }} gap={4}>
              {memberships.map((membership) => (
                <CommunityCard 
                  key={membership.uri} 
                  membership={membership}
                  onDelete={fetchMemberships}
                />
              ))}
            </Grid>
          )}
          </Box>
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
    <Box minH="calc(100vh - 60px)" display="flex" alignItems="center" justifyContent="center" px={4}>
      <Box maxW="420px" w="100%">
        <VStack gap={8} align="stretch">
          {/* Hero */}
          <Box>
            <Heading
              size={{ base: '2xl', md: '3xl' }}
              mb={3}
              color="fg.default"
              fontFamily="heading"
              lineHeight="1.1"
            >
              Your communities,
              <br />
              <Text as="span" color="accent.default">connected.</Text>
            </Heading>
            <Text fontSize={{ base: 'md', md: 'lg' }} color="fg.muted" lineHeight="1.6" maxW="38ch">
              Open Social brings community management to the ATProto network.
              Join communities, share content, and build together.
            </Text>
          </Box>
          
          {/* Login form */}
          <Box
            bg="bg.card"
            p={{ base: 6, md: 8 }}
            borderRadius="xl"
            shadow="sm"
            borderWidth="1px"
            borderColor="border.card"
          >
            <form onSubmit={handleLogin}>
              <VStack gap={4} align="stretch">
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={1.5} color="fg.default">
                    Your Bluesky handle
                  </Text>
                  <Input
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    placeholder="handle.bsky.social"
                    disabled={isLoading}
                    required
                    size="lg"
                  />
                </Box>
                <Button
                  type="submit"
                  disabled={isLoading || !handle}
                  colorPalette="accent"
                  variant="solid"
                  size="lg"
                  width="full"
                >
                  {isLoading ? 'Redirecting…' : 'Log in with ATProto'}
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
      </Box>
    </Box>
  );
}

export default App;

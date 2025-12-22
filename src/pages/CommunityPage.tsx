import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  VStack,
  Heading,
  Text,
  Button,
  Spinner,
  Center,
  Flex,
  Input,
  HStack,
} from '@chakra-ui/react';
import { Avatar } from '../components/ui/avatar';

interface Community {
  did: string;
  displayName: string;
  description?: string;
  avatar?: string;
  banner?: string;
}

interface CommunityDetails {
  community: Community;
  memberCount: number;
  isAdmin: boolean;
  userRole?: string;
}

export function CommunityPage() {
  const { did } = useParams<{ did: string }>();
  const navigate = useNavigate();
  const [details, setDetails] = useState<CommunityDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (did) {
      fetchCommunityDetails();
    }
  }, [did]);

  const fetchCommunityDetails = async () => {
    try {
      const response = await fetch(`/communities/${encodeURIComponent(did!)}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch community details');
      }

      const data = await response.json();
      setDetails(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load community');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 1MB)
    if (file.size > 1024 * 1024) {
      setError('Image must be less than 1MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('File must be an image');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch(`/communities/${encodeURIComponent(did!)}/avatar`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload avatar');
      }

      // Refresh community details
      await fetchCommunityDetails();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload avatar');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <Box minH="100vh" bg="gray.50">
        <Center h="100vh">
          <Spinner size="xl" color="teal.500" />
        </Center>
      </Box>
    );
  }

  if (error && !details) {
    return (
      <Box minH="100vh" bg="gray.50">
        <Container maxW="1920px" py={8}>
          <VStack gap={4}>
            <Text color="red.600">{error}</Text>
            <Button onClick={() => navigate('/')}>Go Back</Button>
          </VStack>
        </Container>
      </Box>
    );
  }

  if (!details) {
    return null;
  }

  const { community, memberCount, isAdmin, userRole } = details;

  return (
    <Box minH="100vh" bg="gray.50">
      {/* Banner */}
      {community.banner && (
        <Box
          h={{ base: '150px', md: '250px' }}
          bg="gray.300"
          backgroundImage={`url(${community.banner})`}
          backgroundSize="cover"
          backgroundPosition="center"
        />
      )}

      <Container maxW="1920px" py={{ base: 4, md: 8 }} px={{ base: 4, md: 6 }}>
        <VStack gap={6} align="stretch">
          {/* Header Section */}
          <Flex
            direction={{ base: 'column', md: 'row' }}
            gap={6}
            align={{ base: 'center', md: 'flex-start' }}
            mt={community.banner ? -16 : 0}
          >
            {/* Avatar with upload for admins */}
            <Box position="relative">
              <Avatar
                name={community.displayName}
                src={community.avatar}
                size="2xl"
                borderWidth="4px"
                borderColor="white"
                bg="white"
              />
              {isAdmin && (
                <Box mt={2}>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    display="none"
                    id="avatar-upload"
                    disabled={uploading}
                  />
                  <label htmlFor="avatar-upload" style={{ width: '100%' }}>
                    <Button
                      size="sm"
                      variant="outline"
                      cursor="pointer"
                      disabled={uploading}
                      width="full"
                      as="span"
                    >
                      {uploading ? 'Uploading...' : 'Change Avatar'}
                    </Button>
                  </label>
                </Box>
              )}
            </Box>

            {/* Community Info */}
            <VStack align={{ base: 'center', md: 'flex-start' }} flex={1} gap={2}>
              <Heading size={{ base: 'lg', md: 'xl' }}>{community.displayName}</Heading>
              
              <HStack gap={2}>
                <Text color="gray.600" fontSize={{ base: 'sm', md: 'md' }}>
                  {memberCount} {memberCount === 1 ? 'member' : 'members'}
                </Text>
                {userRole && (
                  <>
                    <Text color="gray.400">•</Text>
                    <Text
                      color="teal.600"
                      fontSize={{ base: 'sm', md: 'md' }}
                      fontWeight="medium"
                    >
                      {userRole}
                    </Text>
                  </>
                )}
              </HStack>

              {community.description && (
                <Text color="gray.700" fontSize={{ base: 'sm', md: 'md' }}>
                  {community.description}
                </Text>
              )}

              <Text color="gray.500" fontSize="xs" fontFamily="mono">
                {community.did}
              </Text>
            </VStack>
          </Flex>

          {error && (
            <Box bg="red.50" borderRadius="md" p={4}>
              <Text color="red.600">{error}</Text>
            </Box>
          )}

          {/* Content sections will go here */}
          <Box bg="white" borderRadius="lg" p={6} shadow="sm">
            <Heading size="md" mb={4}>
              Community Activity
            </Heading>
            <Text color="gray.600">More features coming soon...</Text>
          </Box>
        </VStack>
      </Container>
    </Box>
  );
}

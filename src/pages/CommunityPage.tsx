import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { csrfHeaders } from '../utils/csrf';
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
  Textarea,
  HStack,
  Badge,
  Grid,
} from '@chakra-ui/react';
import { Avatar } from '../components/ui/avatar';

interface Community {
  did: string;
  displayName: string;
  description?: string;
  type?: 'open' | 'admin-approved' | 'private';
  avatar?: string;
  banner?: string;
}

interface CommunityDetails {
  community: Community;
  memberCount: number;
  isAdmin: boolean;
  userRole?: string;
}

interface Member {
  did: string;
  handle?: string;
  displayName?: string;
  avatar?: string;
  confirmedAt?: string;
  isAdmin?: boolean;
}

interface MembersResponse {
  members: Member[];
  total: number;
  callerIsAdmin: boolean;
}

export function CommunityPage() {
  const { did } = useParams<{ did: string }>();
  const navigate = useNavigate();
  const [details, setDetails] = useState<CommunityDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editType, setEditType] = useState<'open' | 'admin-approved' | 'private'>('open');
  const [saving, setSaving] = useState(false);

  // Member list state
  const [members, setMembers] = useState<Member[]>([]);
  const [membersTotal, setMembersTotal] = useState(0);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');

    const fetchCommunityDetails = useCallback(async () => {
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
  }, [did]);

  const fetchMembers = useCallback(async (search?: string) => {
    if (!did) return;
    setMembersLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const response = await fetch(
        `/communities/${encodeURIComponent(did)}/members?${params.toString()}`,
        { credentials: 'include' }
      );
      if (response.ok) {
        const data: MembersResponse = await response.json();
        setMembers(data.members);
        setMembersTotal(data.total);
      }
    } catch (err) {
      console.error('Failed to fetch members:', err);
    } finally {
      setMembersLoading(false);
    }
  }, [did]);

  useEffect(() => {
    if (did) {
      fetchCommunityDetails();
      fetchMembers();
    }
  }, [did, fetchCommunityDetails, fetchMembers]);

  // Debounce member search
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchMembers(memberSearch);
    }, 300);
    return () => clearTimeout(timeout);
  }, [memberSearch, fetchMembers]);

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
        headers: { ...csrfHeaders() },
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

  const handleEditClick = () => {
    setEditDisplayName(details?.community.displayName || '');
    setEditDescription(details?.community.description || '');
    setEditType(details?.community.type || 'open');
    setIsEditing(true);
    setError('');
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditDisplayName('');
    setEditDescription('');
    setEditType('open');
    setError('');
  };

  const handleSaveProfile = async () => {
    if (!editDisplayName.trim()) {
      setError('Display name is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response = await fetch(`/communities/${encodeURIComponent(did!)}/profile`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...csrfHeaders(),
        },
        body: JSON.stringify({
          displayName: editDisplayName.trim(),
          description: editDescription.trim(),
          type: editType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update community');
      }

      // Refresh community details
      await fetchCommunityDetails();
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update community');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box minH="100vh" bg="bg.page">
        <Center h="100vh">
          <Spinner size="xl" color="accent.default" />
        </Center>
      </Box>
    );
  }

  if (error && !details) {
    return (
      <Box minH="100vh" bg="bg.page">
        <Container maxW="1920px" py={8}>
          <VStack gap={4}>
            <Text color="fg.error">{error}</Text>
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
    <Box minH="100vh" bg="bg.page">
      {/* Banner */}
      {community.banner && (
        <Box
          h={{ base: '150px', md: '250px' }}
          bg="bg.subtle"
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
                borderColor="bg.card"
                bg="bg.card"
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
              {isEditing ? (
                <VStack align="stretch" gap={3} width="full">
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" mb={1}>
                      Display Name
                    </Text>
                    <Input
                      value={editDisplayName}
                      onChange={(e) => setEditDisplayName(e.target.value)}
                      placeholder="Community name"
                      size="lg"
                    />
                  </Box>
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" mb={1}>
                      Description
                    </Text>
                    <Textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Community description"
                      rows={3}
                    />
                  </Box>
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" mb={1}>
                      Community Type
                    </Text>
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value as 'open' | 'admin-approved' | 'private')}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '0.75rem',
                        border: '1px solid var(--chakra-colors-border-card)',
                        backgroundColor: 'var(--chakra-colors-bg-subtle)',
                        fontSize: '1rem',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="open">Open - Anyone can join</option>
                      <option value="admin-approved">Admin Approved - Requires approval</option>
                      <option value="private">Private - Invite only</option>
                    </select>
                  </Box>
                  <HStack gap={2}>
                    <Button
                      onClick={handleSaveProfile}
                      colorPalette="accent"
                      disabled={saving}
                      size="sm"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      onClick={handleCancelEdit}
                      variant="outline"
                      disabled={saving}
                      size="sm"
                      bg="transparent"
                    >
                      Cancel
                    </Button>
                  </HStack>
                </VStack>
              ) : (
                <>
                  <HStack gap={3} align="center">
                    <Heading size={{ base: 'lg', md: 'xl' }} fontFamily="heading">{community.displayName}</Heading>
                    {isAdmin && (
                      <Button
                        onClick={handleEditClick}
                        size="sm"
                        variant="ghost"
                        bg="transparent"
                        colorPalette="accent"
                      >
                        Edit
                      </Button>
                    )}
                  </HStack>
                  
                  <HStack gap={2}>
                    <Text color="fg.muted" fontSize={{ base: 'sm', md: 'md' }}>
                      {memberCount} {memberCount === 1 ? 'member' : 'members'}
                    </Text>
                    <Text color="fg.subtle">•</Text>
                    <Badge
                      colorPalette={
                        community.type === 'open'
                          ? 'green'
                          : community.type === 'admin-approved'
                          ? 'orange'
                          : 'purple'
                      }
                      variant="subtle"
                    >
                      {community.type === 'open'
                        ? 'Open'
                        : community.type === 'admin-approved'
                        ? 'Admin Approved'
                        : 'Private'}
                    </Badge>
                    {userRole && (
                      <>
                        <Text color="fg.subtle">•</Text>
                        <Text
                          color="accent.default"
                          fontSize={{ base: 'sm', md: 'md' }}
                          fontWeight="medium"
                        >
                          {userRole}
                        </Text>
                      </>
                    )}
                  </HStack>

                  {community.description && (
                    <Text color="fg.default" fontSize={{ base: 'sm', md: 'md' }}>
                      {community.description}
                    </Text>
                  )}

                  <Text color="fg.subtle" fontSize="xs" fontFamily="mono">
                    {community.did}
                  </Text>
                </>
              )}
            </VStack>
          </Flex>

          {error && (
            <Box bg="red.50" borderRadius="md" p={4}>
              <Text color="fg.error">{error}</Text>
            </Box>
          )}

          {/* Members Section */}
          <Box bg="bg.card" borderRadius="xl" p={6} shadow="sm" borderWidth="1px" borderColor="border.card">
            <Flex justify="space-between" align="center" mb={4}>
              <Heading size="md" fontFamily="heading">
                Members ({membersTotal})
              </Heading>
            </Flex>

            <Input
              placeholder="Search members..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              mb={4}
              size="sm"
            />

            {membersLoading ? (
              <Center py={8}>
                <Spinner size="md" color="accent.default" />
              </Center>
            ) : members.length === 0 ? (
              <Text color="fg.muted" textAlign="center" py={4}>
                {memberSearch ? 'No members found matching your search.' : 'No members yet.'}
              </Text>
            ) : (
              <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={3}>
                {members.map((member) => (
                  <Flex
                    key={member.did}
                    align="center"
                    gap={3}
                    p={3}
                    borderRadius="lg"
                    borderWidth="1px"
                    borderColor="border.card"
                    bg="bg.subtle"
                  >
                    <Avatar
                      name={member.displayName || member.handle || member.did}
                      src={member.avatar}
                      size="sm"
                    />
                    <Box flex={1} minW={0}>
                      <HStack gap={2}>
                        <Text
                          fontWeight="medium"
                          fontSize="sm"
                          truncate
                        >
                          {member.displayName || member.handle || member.did.slice(0, 20) + '...'}
                        </Text>
                        {member.isAdmin && (
                          <Badge colorPalette="purple" variant="subtle" size="sm">
                            Admin
                          </Badge>
                        )}
                      </HStack>
                      {member.handle && (
                        <Text color="fg.muted" fontSize="xs" truncate>
                          @{member.handle}
                        </Text>
                      )}
                    </Box>
                  </Flex>
                ))}
              </Grid>
            )}
          </Box>
        </VStack>
      </Container>
    </Box>
  );
}

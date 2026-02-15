import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { csrfHeaders } from '../utils/csrf';
import { api } from '../utils/api';
import { sanitizeRedirectUrl } from '../utils/redirect';
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
  isMember: boolean;
  isPrimaryAdmin: boolean;
  isAuthenticated: boolean;
  userRole?: string;
}

interface Member {
  did: string;
  handle?: string;
  displayName?: string;
  avatar?: string;
  confirmedAt?: string;
  isAdmin?: boolean;
  isPrimaryAdmin?: boolean;
  roles?: { name: string; displayName: string }[];
}

interface MembersResponse {
  members: Member[];
  total: number;
  callerIsAdmin: boolean;
}

export function CommunityPage() {
  const { did } = useParams<{ did: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [details, setDetails] = useState<CommunityDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // Join state
  const [joining, setJoining] = useState(false);
  const [joinStatus, setJoinStatus] = useState<string | null>(null);

  // Member list state
  const [members, setMembers] = useState<Member[]>([]);
  const [membersTotal, setMembersTotal] = useState(0);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');

  // Member action dropdown state
  const [openMenuDid, setOpenMenuDid] = useState<string | null>(null);
  const [availableRoles, setAvailableRoles] = useState<{ name: string; displayName: string }[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const action = searchParams.get('action');
  const returnTo = sanitizeRedirectUrl(searchParams.get('return_to'));

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

  // Handle auto-join when ?action=join is present
  const handleJoinCommunity = useCallback(async () => {
    if (!did || joining) return;
    setJoining(true);
    setJoinStatus(null);
    try {
      const response = await fetch(`/communities/${encodeURIComponent(did)}/join`, {
        method: 'POST',
        credentials: 'include',
        headers: { ...csrfHeaders() },
      });

      const data = await response.json();
      if (response.ok) {
        if (data.status === 'already_member') {
          setJoinStatus('already_member');
          if (returnTo) {
            setTimeout(() => {
              window.location.href = returnTo;
            }, 1500);
          }
        } else {
          setJoinStatus(data.status === 'pending' ? 'pending' : 'joined');
          // Refresh community details
          await fetchCommunityDetails();
          await fetchMembers();

          // If there's a return_to URL and the join was successful, redirect back
          if (returnTo && data.status === 'joined') {
            setTimeout(() => {
              window.location.href = returnTo;
            }, 1500);
          }
        }
      } else {
        setError(data.error || 'Failed to join community');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join community');
    } finally {
      setJoining(false);
    }
  }, [did, joining, returnTo, fetchCommunityDetails, fetchMembers]);

  // Auto-join when ?action=join and user is authenticated and not already a member
  useEffect(() => {
    if (action === 'join' && details && details.isAuthenticated && !details.isMember && !joining && !joinStatus) {
      handleJoinCommunity();
    }
  }, [action, details, joining, joinStatus, handleJoinCommunity]);

  // Debounce member search
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchMembers(memberSearch);
    }, 300);
    return () => clearTimeout(timeout);
  }, [memberSearch, fetchMembers]);

  // Fetch available custom roles for the dropdown
  const fetchRoles = useCallback(async () => {
    if (!did || !details?.isAdmin) return;
    try {
      const data = await api.get<{ roles: { name: string; displayName: string }[] }>(
        `/communities/${encodeURIComponent(did)}/roles`,
      );
      setAvailableRoles(data.roles);
    } catch {
      setAvailableRoles([]);
    }
  }, [did, details?.isAdmin]);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuDid(null);
      }
    };
    if (openMenuDid) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openMenuDid]);

  // ─── Member action helpers ─────────────────────────────────────

  const promoteToAdmin = async (memberDid: string) => {
    if (!did) return;
    setActionLoading(true);
    try {
      await api.post(`/communities/${encodeURIComponent(did)}/members/${encodeURIComponent(memberDid)}/admin`);
      await Promise.all([fetchCommunityDetails(), fetchMembers(memberSearch)]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
      setOpenMenuDid(null);
    }
  };

  const demoteAdmin = async (memberDid: string) => {
    if (!did || !confirm('Remove admin privileges from this member?')) return;
    setActionLoading(true);
    try {
      await api.del(`/communities/${encodeURIComponent(did)}/members/${encodeURIComponent(memberDid)}/admin`);
      await Promise.all([fetchCommunityDetails(), fetchMembers(memberSearch)]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
      setOpenMenuDid(null);
    }
  };

  const kickMember = async (memberDid: string) => {
    if (!did || !confirm('Remove this member from the community? This cannot be undone.')) return;
    setActionLoading(true);
    try {
      await api.del(`/communities/${encodeURIComponent(did)}/members/${encodeURIComponent(memberDid)}`);
      await fetchMembers(memberSearch);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
      setOpenMenuDid(null);
    }
  };

  const transferAdmin = async (memberDid: string) => {
    if (!did || !confirm('Transfer primary admin rights to this member? You will remain an admin but can be demoted by them.')) return;
    setActionLoading(true);
    try {
      await api.post(`/communities/${encodeURIComponent(did)}/transfer-admin`, { newOwnerDid: memberDid });
      await Promise.all([fetchCommunityDetails(), fetchMembers(memberSearch)]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
      setOpenMenuDid(null);
    }
  };

  const assignRole = async (memberDid: string, roleName: string) => {
    if (!did) return;
    setActionLoading(true);
    try {
      await api.post(`/communities/${encodeURIComponent(did)}/members/${encodeURIComponent(memberDid)}/roles`, { roleName });
      await fetchMembers(memberSearch);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
      setOpenMenuDid(null);
    }
  };

  const revokeRole = async (memberDid: string, roleName: string) => {
    if (!did) return;
    setActionLoading(true);
    try {
      await api.del(`/communities/${encodeURIComponent(did)}/members/${encodeURIComponent(memberDid)}/roles/${encodeURIComponent(roleName)}`);
      await fetchMembers(memberSearch);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
      setOpenMenuDid(null);
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
    setIsEditing(true);
    setError('');
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditDisplayName('');
    setEditDescription('');
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
  const isMember = details.isMember;
  const isAuthenticated = details.isAuthenticated;

  // Non-authenticated or non-member view: show community info with join option
  if (!isAuthenticated || !isMember) {
    return (
      <Box minH="100vh" bg="bg.page">
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
            <Flex
              direction={{ base: 'column', md: 'row' }}
              gap={6}
              align={{ base: 'center', md: 'flex-start' }}
              mt={community.banner ? -16 : 0}
            >
              <Avatar
                name={community.displayName}
                src={community.avatar}
                size="2xl"
                borderWidth="4px"
                borderColor="bg.card"
                bg="bg.card"
              />
              <VStack align={{ base: 'center', md: 'flex-start' }} flex={1} gap={2}>
                <Heading size={{ base: 'lg', md: 'xl' }} fontFamily="heading">
                  {community.displayName}
                </Heading>
                <HStack gap={2}>
                  <Text color="fg.muted" fontSize={{ base: 'sm', md: 'md' }}>
                    {memberCount} {memberCount === 1 ? 'member' : 'members'}
                  </Text>
                  <Text color="fg.subtle">•</Text>
                  <Badge
                    colorPalette={
                      community.type === 'open' ? 'green'
                      : community.type === 'admin-approved' ? 'orange'
                      : 'purple'
                    }
                    variant="subtle"
                  >
                    {community.type === 'open' ? 'Open'
                      : community.type === 'admin-approved' ? 'Admin Approved'
                      : 'Private'}
                  </Badge>
                </HStack>
                {community.description && (
                  <Text color="fg.default" fontSize={{ base: 'sm', md: 'md' }}>
                    {community.description}
                  </Text>
                )}
              </VStack>
            </Flex>

            {/* Join section */}
            <Box bg="bg.card" borderRadius="xl" p={6} shadow="sm" borderWidth="1px" borderColor="border.card">
              {!isAuthenticated ? (
                <VStack gap={4} align="center" py={4}>
                  <Heading size="md" fontFamily="heading">
                    Join {community.displayName}
                  </Heading>
                  <Text color="fg.muted" textAlign="center">
                    Log in with your AT Protocol account to join this community.
                  </Text>
                  <Button
                    colorPalette="accent"
                    size="lg"
                    onClick={() => {
                      // Store the current URL so we can redirect back after login
                      sessionStorage.setItem('pendingRedirect', window.location.pathname + window.location.search);
                      navigate('/');
                    }}
                  >
                    Log In to Join
                  </Button>
                </VStack>
              ) : joining ? (
                <VStack gap={4} align="center" py={4}>
                  <Spinner size="lg" color="accent.default" />
                  <Text color="fg.muted">Joining community...</Text>
                </VStack>
              ) : joinStatus === 'joined' || joinStatus === 'already_member' ? (
                <VStack gap={4} align="center" py={4}>
                  <Heading size="md" fontFamily="heading" color="green.500">
                    ✓ {joinStatus === 'already_member' ? 'Already a member!' : 'Joined successfully!'}
                  </Heading>
                  {returnTo && (
                    <Text color="fg.muted">Redirecting you back...</Text>
                  )}
                  {!returnTo && (
                    <Button
                      colorPalette="accent"
                      onClick={() => {
                        // Reload page to show full member view
                        window.location.reload();
                      }}
                    >
                      View Community
                    </Button>
                  )}
                </VStack>
              ) : joinStatus === 'pending' ? (
                <VStack gap={4} align="center" py={4}>
                  <Heading size="md" fontFamily="heading" color="orange.500">
                    ⏳ Join Request Submitted
                  </Heading>
                  <Text color="fg.muted" textAlign="center">
                    This community requires admin approval. Your request has been submitted.
                  </Text>
                  {returnTo && (
                    <Button variant="outline" onClick={() => { window.location.href = returnTo; }}>
                      Return to App
                    </Button>
                  )}
                </VStack>
              ) : (
                <VStack gap={4} align="center" py={4}>
                  <Heading size="md" fontFamily="heading">
                    Join {community.displayName}
                  </Heading>
                  <Text color="fg.muted" textAlign="center">
                    {community.type === 'open'
                      ? 'This is an open community. Click below to join.'
                      : community.type === 'admin-approved'
                      ? 'This community requires admin approval to join.'
                      : 'This is a private community.'}
                  </Text>
                  {error && <Text color="fg.error">{error}</Text>}
                  {(community.type === 'open' || community.type === 'admin-approved') && (
                    <Button
                      colorPalette="accent"
                      size="lg"
                      onClick={handleJoinCommunity}
                      disabled={joining}
                    >
                      {community.type === 'admin-approved' ? 'Request to Join' : 'Join Community'}
                    </Button>
                  )}
                </VStack>
              )}
            </Box>
          </VStack>
        </Container>
      </Box>
    );
  }

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
                    {isAdmin && (
                      <Button
                        onClick={() => navigate(`/communities/${encodeURIComponent(did!)}/settings`)}
                        size="sm"
                        variant="outline"
                        colorPalette="orange"
                      >
                        ⚙ Settings
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
                {members.map((member) => {
                  const bskyUrl = member.handle
                    ? `https://bsky.app/profile/${member.handle}`
                    : `https://bsky.app/profile/${member.did}`;

                  const memberRoleNames = new Set((member.roles || []).map((r) => r.name));
                  const unassignedRoles = availableRoles.filter((r) => !memberRoleNames.has(r.name));

                  return (
                    <Box
                      key={member.did}
                      position="relative"
                      borderRadius="lg"
                      borderWidth="1px"
                      borderColor="border.card"
                      bg="bg.subtle"
                      _hover={{ borderColor: 'accent.default', bg: 'bg.card' }}
                      transition="all 0.15s ease"
                    >
                      <a
                        href={bskyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ textDecoration: 'none', flex: 1 }}
                      >
                      <Flex
                        align="center"
                        gap={3}
                        p={3}
                        cursor="pointer"
                      >
                        <Avatar
                          name={member.displayName || member.handle || member.did}
                          src={member.avatar}
                          size="sm"
                        />
                        <Box flex={1} minW={0}>
                          <HStack gap={2} flexWrap="wrap">
                            <Text fontWeight="medium" fontSize="sm" truncate>
                              {member.displayName || member.handle || member.did.slice(0, 20) + '...'}
                            </Text>
                            {member.isPrimaryAdmin && (
                              <Badge colorPalette="orange" variant="subtle" size="sm">
                                Primary Admin
                              </Badge>
                            )}
                            {member.isAdmin && !member.isPrimaryAdmin && (
                              <Badge colorPalette="purple" variant="subtle" size="sm">
                                Admin
                              </Badge>
                            )}
                            {member.roles && member.roles.map((role) => (
                              <Badge key={role.name} colorPalette="blue" variant="subtle" size="sm">
                                {role.displayName}
                              </Badge>
                            ))}
                          </HStack>
                          {member.handle && (
                            <Text color="fg.muted" fontSize="xs" truncate>
                              @{member.handle}
                            </Text>
                          )}
                        </Box>

                        {/* Action button — only show if current user is admin */}
                        {details.isAdmin && (
                          <Box
                            as="span"
                            onClick={(e: React.MouseEvent) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setOpenMenuDid(openMenuDid === member.did ? null : member.did);
                            }}
                            cursor="pointer"
                            px={2}
                            py={1}
                            borderRadius="md"
                            _hover={{ bg: 'bg.emphasized' }}
                            fontSize="lg"
                            color="fg.muted"
                            flexShrink={0}
                          >
                            ⋯
                          </Box>
                        )}
                      </Flex>
                      </a>

                      {/* Dropdown menu */}
                      {openMenuDid === member.did && details.isAdmin && (
                        <Box
                          ref={menuRef}
                          position="absolute"
                          right="0"
                          top="100%"
                          zIndex={20}
                          bg="bg.card"
                          borderWidth="1px"
                          borderColor="border.card"
                          borderRadius="lg"
                          shadow="lg"
                          py={1}
                          minW="200px"
                          maxH="320px"
                          overflowY="auto"
                        >
                          {/* Admin actions */}
                          {!member.isAdmin && (
                            <Box
                              as="button"
                              w="100%"
                              textAlign="left"
                              px={3}
                              py={2}
                              fontSize="sm"
                              _hover={{ bg: 'bg.subtle' }}
                              onClick={() => !actionLoading && promoteToAdmin(member.did)}
                              aria-disabled={actionLoading}
                              opacity={actionLoading ? 0.5 : 1}
                              pointerEvents={actionLoading ? 'none' : 'auto'}
                            >
                              ⬆ Promote to Admin
                            </Box>
                          )}
                          {member.isAdmin && !member.isPrimaryAdmin && (
                            <Box
                              as="button"
                              w="100%"
                              textAlign="left"
                              px={3}
                              py={2}
                              fontSize="sm"
                              _hover={{ bg: 'bg.subtle' }}
                              onClick={() => !actionLoading && demoteAdmin(member.did)}
                              aria-disabled={actionLoading}
                              opacity={actionLoading ? 0.5 : 1}
                              pointerEvents={actionLoading ? 'none' : 'auto'}
                            >
                              ⬇ Demote from Admin
                            </Box>
                          )}
                          {details.isPrimaryAdmin && member.isAdmin && !member.isPrimaryAdmin && (
                            <Box
                              as="button"
                              w="100%"
                              textAlign="left"
                              px={3}
                              py={2}
                              fontSize="sm"
                              _hover={{ bg: 'bg.subtle' }}
                              onClick={() => !actionLoading && transferAdmin(member.did)}
                              aria-disabled={actionLoading}
                              opacity={actionLoading ? 0.5 : 1}
                              pointerEvents={actionLoading ? 'none' : 'auto'}
                            >
                              🔄 Transfer Primary Admin
                            </Box>
                          )}

                          {/* Role assignment — show unassigned roles */}
                          {unassignedRoles.length > 0 && (
                            <>
                              <Box borderTopWidth="1px" borderColor="border.subtle" my={1} />
                              <Text fontSize="xs" color="fg.subtle" px={3} py={1} fontWeight="semibold">
                                Assign Role
                              </Text>
                              {unassignedRoles.map((role) => (
                                <Box
                                  key={role.name}
                                  as="button"
                                  w="100%"
                                  textAlign="left"
                                  px={3}
                                  py={2}
                                  fontSize="sm"
                                  _hover={{ bg: 'bg.subtle' }}
                                  onClick={() => !actionLoading && assignRole(member.did, role.name)}
                                  aria-disabled={actionLoading}
                                  opacity={actionLoading ? 0.5 : 1}
                                  pointerEvents={actionLoading ? 'none' : 'auto'}
                                >
                                  + {role.displayName}
                                </Box>
                              ))}
                            </>
                          )}

                          {/* Role revocation — show assigned roles */}
                          {member.roles && member.roles.length > 0 && (
                            <>
                              <Box borderTopWidth="1px" borderColor="border.subtle" my={1} />
                              <Text fontSize="xs" color="fg.subtle" px={3} py={1} fontWeight="semibold">
                                Remove Role
                              </Text>
                              {member.roles.map((role) => (
                                <Box
                                  key={role.name}
                                  as="button"
                                  w="100%"
                                  textAlign="left"
                                  px={3}
                                  py={2}
                                  fontSize="sm"
                                  color="fg.error"
                                  _hover={{ bg: 'bg.subtle' }}
                                  onClick={() => !actionLoading && revokeRole(member.did, role.name)}
                                  aria-disabled={actionLoading}
                                  opacity={actionLoading ? 0.5 : 1}
                                  pointerEvents={actionLoading ? 'none' : 'auto'}
                                >
                                  − {role.displayName}
                                </Box>
                              ))}
                            </>
                          )}

                          {/* Kick — not available for primary admin */}
                          {!member.isPrimaryAdmin && (
                            <>
                              <Box borderTopWidth="1px" borderColor="border.subtle" my={1} />
                              <Box
                                as="button"
                                w="100%"
                                textAlign="left"
                                px={3}
                                py={2}
                                fontSize="sm"
                                color="fg.error"
                                _hover={{ bg: 'bg.subtle' }}
                                onClick={() => !actionLoading && kickMember(member.did)}
                                aria-disabled={actionLoading}
                                opacity={actionLoading ? 0.5 : 1}
                                pointerEvents={actionLoading ? 'none' : 'auto'}
                              >
                                🚫 Kick from Community
                              </Box>
                            </>
                          )}
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Grid>
            )}
          </Box>
        </VStack>
      </Container>
    </Box>
  );
}

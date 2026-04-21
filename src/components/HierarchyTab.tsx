import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Flex,
  Heading,
  Image,
  Spinner,
  Text,
  VStack,
  Badge,
  Center,
} from '@chakra-ui/react';
import { api } from '../utils/api';
import { CommunitySearchDialog } from './CommunitySearchDialog';
import type {
  Community,
  HierarchyRelationship,
  PendingHierarchyRequest,
  HierarchyContentRecord,
} from '../types';

interface HierarchyTabProps {
  did: string;
}

export function HierarchyTab({ did }: HierarchyTabProps) {
  const [relationships, setRelationships] = useState<HierarchyRelationship[]>([]);
  const [incoming, setIncoming] = useState<PendingHierarchyRequest[]>([]);
  const [childContent, setChildContent] = useState<HierarchyContentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [searchMode, setSearchMode] = useState<'parent' | 'child' | null>(null);
  const [contentFilter, setContentFilter] = useState<'all' | 'document' | 'event'>('all');

  const encodedDid = encodeURIComponent(did);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [hierarchyData, pendingData] = await Promise.all([
        api.get<{ relationships: HierarchyRelationship[] }>(
          `/api/v1/communities/${encodedDid}/hierarchy`,
        ),
        api.get<{ requests: PendingHierarchyRequest[] }>(
          `/api/v1/communities/${encodedDid}/hierarchy/pending`,
        ),
      ]);
      setRelationships(hierarchyData.relationships);
      setIncoming(pendingData.requests);

      // Fetch child content if this community has any approved children
      const hasChildren = hierarchyData.relationships.some(
        (r) => r.role === 'parent' && r.status === 'approved',
      );
      if (hasChildren) {
        const contentData = await api.get<{ records: HierarchyContentRecord[] }>(
          `/api/v1/communities/${encodedDid}/hierarchy/content`,
        );
        setChildContent(contentData.records);
      } else {
        setChildContent([]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [encodedDid]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const approved = relationships.filter((r) => r.status === 'approved');
  const pendingOutgoing = relationships.filter((r) => r.status === 'pending');
  const parents = approved.filter((r) => r.role === 'child');
  const children = approved.filter((r) => r.role === 'parent');

  // DIDs already in a relationship (for excluding from search)
  const connectedDids = relationships.map((r) => r.counterpartyDid);
  const incomingDids = incoming.map((r) => r.requesterDid);
  const excludeDids = [...connectedDids, ...incomingDids];

  const handleInviteChild = async (community: Community) => {
    setActionLoading('invite');
    setError('');
    try {
      await api.post(`/api/v1/communities/${encodedDid}/hierarchy/invite`, {
        adminDid: did, // The current user is admin — the backend verifies this
        childDid: community.did,
      });
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRequestParent = async (community: Community) => {
    setActionLoading('request');
    setError('');
    try {
      await api.post(`/api/v1/communities/${encodedDid}/hierarchy/request`, {
        adminDid: did,
        parentDid: community.did,
      });
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprove = async (request: PendingHierarchyRequest) => {
    setActionLoading(`approve-${request.id}`);
    setError('');
    try {
      if (request.requesterRole === 'child') {
        // Requester is a child wanting us as parent → use approve endpoint
        await api.post(`/api/v1/communities/${encodedDid}/hierarchy/approve`, {
          adminDid: did,
          childDid: request.requesterDid,
        });
      } else {
        // Requester is a parent wanting us as child → use accept endpoint
        await api.post(`/api/v1/communities/${encodedDid}/hierarchy/accept`, {
          adminDid: did,
          parentDid: request.requesterDid,
        });
      }
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (request: PendingHierarchyRequest) => {
    setActionLoading(`reject-${request.id}`);
    setError('');
    try {
      await api.post(`/api/v1/communities/${encodedDid}/hierarchy/reject`, {
        adminDid: did,
        counterpartyDid: request.requesterDid,
      });
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevoke = async (rel: HierarchyRelationship) => {
    setActionLoading(`revoke-${rel.rkey}`);
    setError('');
    try {
      await api.del(`/api/v1/communities/${encodedDid}/hierarchy/${rel.rkey}`, {
        adminDid: did,
      });
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelOutgoing = async (rel: HierarchyRelationship) => {
    // Cancel a pending outgoing request — uses the same revoke/delete endpoint
    await handleRevoke(rel);
  };

  const filteredContent =
    contentFilter === 'all'
      ? childContent
      : childContent.filter((r) => r.type === contentFilter);

  if (loading) {
    return (
      <Center py={10}>
        <Spinner size="lg" color="accent.default" />
      </Center>
    );
  }

  return (
    <VStack gap={6} align="stretch">
      {error && (
        <Text color="fg.error" fontSize="sm">
          {error}
        </Text>
      )}

      {/* Actions */}
      <Flex gap={3} wrap="wrap">
        <Button
          colorPalette="teal"
          size="sm"
          onClick={() => setSearchMode('child')}
          loading={actionLoading === 'invite'}
        >
          Add Subcommunity
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSearchMode('parent')}
          loading={actionLoading === 'request'}
        >
          Request Parent
        </Button>
      </Flex>

      {/* Incoming Pending Requests */}
      {incoming.length > 0 && (
        <Box>
          <Heading size="sm" mb={3}>
            Incoming Requests
          </Heading>
          <VStack gap={3} align="stretch">
            {incoming.map((req) => (
              <Box
                key={req.id}
                p={3}
                borderWidth="1px"
                borderColor="border"
                borderRadius="md"
              >
                <Flex align="center" gap={3}>
                  {req.avatar && (
                    <Image
                      src={req.avatar}
                      alt=""
                      boxSize="36px"
                      borderRadius="full"
                      objectFit="cover"
                    />
                  )}
                  <Box flex={1} minW={0}>
                    <Flex align="center" gap={2}>
                      <Text fontWeight="semibold" truncate>
                        {req.displayName || req.requesterDid}
                      </Text>
                      <Badge size="sm" colorPalette="yellow">
                        {req.requesterRole === 'child'
                          ? 'Wants to be subcommunity'
                          : 'Wants to be parent'}
                      </Badge>
                    </Flex>
                    {req.handle && (
                      <Text fontSize="xs" color="fg.muted">
                        @{req.handle}
                      </Text>
                    )}
                  </Box>
                  <Flex gap={2}>
                    <Button
                      size="xs"
                      colorPalette="teal"
                      onClick={() => handleApprove(req)}
                      loading={actionLoading === `approve-${req.id}`}
                    >
                      Approve
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      colorPalette="red"
                      onClick={() => handleReject(req)}
                      loading={actionLoading === `reject-${req.id}`}
                    >
                      Reject
                    </Button>
                  </Flex>
                </Flex>
              </Box>
            ))}
          </VStack>
        </Box>
      )}

      {/* Pending Outgoing */}
      {pendingOutgoing.length > 0 && (
        <Box>
          <Heading size="sm" mb={3}>
            Pending Outgoing
          </Heading>
          <VStack gap={3} align="stretch">
            {pendingOutgoing.map((rel) => (
              <Box
                key={rel.rkey}
                p={3}
                borderWidth="1px"
                borderColor="border"
                borderRadius="md"
              >
                <Flex align="center" gap={3}>
                  {rel.avatar && (
                    <Image
                      src={rel.avatar}
                      alt=""
                      boxSize="36px"
                      borderRadius="full"
                      objectFit="cover"
                    />
                  )}
                  <Box flex={1} minW={0}>
                    <Flex align="center" gap={2}>
                      <Text fontWeight="semibold" truncate>
                        {rel.displayName || rel.counterpartyDid}
                      </Text>
                      <Badge size="sm" colorPalette="orange">
                        {rel.role === 'child'
                          ? 'Requesting parent'
                          : 'Inviting subcommunity'}
                      </Badge>
                    </Flex>
                    {rel.handle && (
                      <Text fontSize="xs" color="fg.muted">
                        @{rel.handle}
                      </Text>
                    )}
                  </Box>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => handleCancelOutgoing(rel)}
                    loading={actionLoading === `revoke-${rel.rkey}`}
                  >
                    Cancel
                  </Button>
                </Flex>
              </Box>
            ))}
          </VStack>
        </Box>
      )}

      {/* Active Relationships — Parents */}
      {parents.length > 0 && (
        <Box>
          <Heading size="sm" mb={3}>
            Parent Communities
          </Heading>
          <VStack gap={3} align="stretch">
            {parents.map((rel) => (
              <RelationshipCard
                key={rel.rkey}
                rel={rel}
                label="Parent"
                onRevoke={handleRevoke}
                loading={actionLoading === `revoke-${rel.rkey}`}
              />
            ))}
          </VStack>
        </Box>
      )}

      {/* Active Relationships — Children */}
      {children.length > 0 && (
        <Box>
          <Heading size="sm" mb={3}>
            Subcommunities
          </Heading>
          <VStack gap={3} align="stretch">
            {children.map((rel) => (
              <RelationshipCard
                key={rel.rkey}
                rel={rel}
                label="Subcommunity"
                onRevoke={handleRevoke}
                loading={actionLoading === `revoke-${rel.rkey}`}
              />
            ))}
          </VStack>
        </Box>
      )}

      {/* Empty state */}
      {approved.length === 0 &&
        pendingOutgoing.length === 0 &&
        incoming.length === 0 && (
          <Box
            py={8}
            textAlign="center"
            borderWidth="1px"
            borderColor="border"
            borderRadius="md"
          >
            <Text color="fg.muted">
              No hierarchy relationships yet. Use the buttons above to connect
              with a parent or add subcommunities.
            </Text>
          </Box>
        )}

      {/* Subcommunity Content */}
      {children.length > 0 && (
        <Box>
          <Flex align="center" justify="space-between" mb={3}>
            <Heading size="sm">Subcommunity Content</Heading>
            <Flex gap={2}>
              {(['all', 'event', 'document'] as const).map((f) => (
                <Button
                  key={f}
                  size="xs"
                  variant={contentFilter === f ? 'solid' : 'outline'}
                  onClick={() => setContentFilter(f)}
                >
                  {f === 'all' ? 'All' : f === 'event' ? 'Events' : 'Documents'}
                </Button>
              ))}
            </Flex>
          </Flex>
          {filteredContent.length === 0 ? (
            <Text color="fg.muted" fontSize="sm">
              No {contentFilter === 'all' ? 'content' : contentFilter + 's'}{' '}
              shared by subcommunities yet.
            </Text>
          ) : (
            <VStack gap={2} align="stretch">
              {filteredContent.map((record) => (
                <Box
                  key={record.uri}
                  p={3}
                  borderWidth="1px"
                  borderColor="border"
                  borderRadius="md"
                >
                  <Flex align="center" gap={2} mb={1}>
                    <Badge size="sm" colorPalette={record.type === 'event' ? 'purple' : 'blue'}>
                      {record.type}
                    </Badge>
                    <Text fontWeight="semibold" truncate>
                      {record.title}
                    </Text>
                  </Flex>
                  <Flex gap={4} fontSize="xs" color="fg.muted" wrap="wrap">
                    {record.startsAt && (
                      <Text>
                        Starts: {new Date(record.startsAt).toLocaleDateString()}
                      </Text>
                    )}
                    {record.location && <Text>Location: {record.location}</Text>}
                    {record.mode && <Text>Mode: {record.mode}</Text>}
                    <Text>
                      Shared: {new Date(record.sharedAt).toLocaleDateString()}
                    </Text>
                  </Flex>
                </Box>
              ))}
            </VStack>
          )}
        </Box>
      )}

      {/* Search Dialogs */}
      <CommunitySearchDialog
        open={searchMode === 'child'}
        onOpenChange={(open) => !open && setSearchMode(null)}
        title="Add Subcommunity"
        selfDid={did}
        excludeDids={excludeDids}
        onSelect={handleInviteChild}
      />
      <CommunitySearchDialog
        open={searchMode === 'parent'}
        onOpenChange={(open) => !open && setSearchMode(null)}
        title="Request Parent Community"
        selfDid={did}
        excludeDids={excludeDids}
        onSelect={handleRequestParent}
      />
    </VStack>
  );
}

function RelationshipCard({
  rel,
  label,
  onRevoke,
  loading,
}: {
  rel: HierarchyRelationship;
  label: string;
  onRevoke: (rel: HierarchyRelationship) => void;
  loading: boolean;
}) {
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  return (
    <Box p={3} borderWidth="1px" borderColor="border" borderRadius="md">
      <Flex align="center" gap={3}>
        {rel.avatar && (
          <Image
            src={rel.avatar}
            alt=""
            boxSize="36px"
            borderRadius="full"
            objectFit="cover"
          />
        )}
        <Box flex={1} minW={0}>
          <Flex align="center" gap={2}>
            <Text fontWeight="semibold" truncate>
              {rel.displayName || rel.counterpartyDid}
            </Text>
            <Badge size="sm" colorPalette="teal">
              {label}
            </Badge>
          </Flex>
          {rel.handle && (
            <Text fontSize="xs" color="fg.muted">
              @{rel.handle}
            </Text>
          )}
        </Box>
        {confirmRevoke ? (
          <Flex gap={2}>
            <Button
              size="xs"
              colorPalette="red"
              onClick={() => onRevoke(rel)}
              loading={loading}
            >
              Confirm
            </Button>
            <Button
              size="xs"
              variant="outline"
              onClick={() => setConfirmRevoke(false)}
            >
              Cancel
            </Button>
          </Flex>
        ) : (
          <Button
            size="xs"
            variant="outline"
            colorPalette="red"
            onClick={() => setConfirmRevoke(true)}
          >
            Remove
          </Button>
        )}
      </Flex>
    </Box>
  );
}

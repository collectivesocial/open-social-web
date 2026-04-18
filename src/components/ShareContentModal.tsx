import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogCloseTrigger,
} from './ui/dialog.tsx';
import {
  Box,
  Button,
  VStack,
  Text,
  Spinner,
  Center,
  Flex,
  Badge,
} from '@chakra-ui/react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../utils/api';
import { Avatar } from './ui/avatar';
import type { Publication, Membership } from '../types';

interface SharedStatus {
  shared: boolean;
  rkey?: string;
  sharedBy?: string;
}

interface ShareContentModalProps {
  publication: Publication | null;
  memberships: Membership[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareContentModal({
  publication,
  memberships,
  open,
  onOpenChange,
}: ShareContentModalProps) {
  const [sharing, setSharing] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sharedStatus, setSharedStatus] = useState<Record<string, SharedStatus>>({});
  const [checking, setChecking] = useState(false);
  const [unsharing, setUnsharing] = useState<Record<string, boolean>>({});

  const activeMemberships = useMemo(
    () => memberships.filter((m) => m.status === 'active'),
    [memberships],
  );

  const checkSharedStatus = useCallback(async () => {
    if (!publication || activeMemberships.length === 0) return;
    setChecking(true);
    try {
      const results = await Promise.all(
        activeMemberships.map(async (m) => {
          try {
            const data = await api.get<SharedStatus>(
              `/api/v1/communities/${encodeURIComponent(m.communityDid)}/content/check?documentUri=${encodeURIComponent(publication.uri)}`,
            );
            return [m.communityDid, data] as const;
          } catch {
            return [m.communityDid, { shared: false }] as const;
          }
        }),
      );
      setSharedStatus(Object.fromEntries(results));
    } finally {
      setChecking(false);
    }
  }, [publication, activeMemberships]);

  useEffect(() => {
    if (open) {
      checkSharedStatus();
    }
  }, [open, checkSharedStatus]);

  const handleShare = async (communityDid: string) => {
    if (!publication) return;

    setSharing((prev) => ({ ...prev, [communityDid]: 'loading' }));
    setErrors((prev) => ({ ...prev, [communityDid]: '' }));

    try {
      await api.post(`/api/v1/communities/${encodeURIComponent(communityDid)}/content`, {
        type: 'document',
        documentUri: publication.uri,
        documentCid: publication.cid,
        title: publication.title,
        path: publication.path,
      });
      setSharing((prev) => ({ ...prev, [communityDid]: 'success' }));
      // Re-check status to get the rkey for potential unshare
      try {
        const data = await api.get<SharedStatus>(
          `/api/v1/communities/${encodeURIComponent(communityDid)}/content/check?documentUri=${encodeURIComponent(publication.uri)}`,
        );
        setSharedStatus((prev) => ({ ...prev, [communityDid]: data }));
      } catch { /* ignore — success state still shows */ }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to share';
      setErrors((prev) => ({ ...prev, [communityDid]: message }));
      setSharing((prev) => ({ ...prev, [communityDid]: 'error' }));
    }
  };

  const handleUnshare = async (communityDid: string) => {
    const status = sharedStatus[communityDid];
    if (!status?.rkey) return;

    setUnsharing((prev) => ({ ...prev, [communityDid]: true }));
    setErrors((prev) => ({ ...prev, [communityDid]: '' }));

    try {
      await api.del(
        `/api/v1/communities/${encodeURIComponent(communityDid)}/content/${status.rkey}`,
      );
      setSharedStatus((prev) => ({ ...prev, [communityDid]: { shared: false } }));
      setSharing((prev) => ({ ...prev, [communityDid]: 'idle' }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to unshare';
      setErrors((prev) => ({ ...prev, [communityDid]: message }));
    } finally {
      setUnsharing((prev) => ({ ...prev, [communityDid]: false }));
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after close animation
    setTimeout(() => {
      setSharing({});
      setErrors({});
      setSharedStatus({});
      setUnsharing({});
    }, 200);
  };

  return (
    <DialogRoot open={open} onOpenChange={() => handleClose()}>
      <DialogContent maxW={{ base: '95vw', sm: '500px' }} mx={{ base: 2, sm: 4 }}>
        <DialogHeader>
          <DialogTitle>Share with Community</DialogTitle>
          <DialogCloseTrigger />
        </DialogHeader>

        <DialogBody>
          {publication && (
            <Box mb={4} p={3} bg="bg.subtle" borderRadius="md">
              <Text fontWeight="medium" fontSize="sm" lineClamp={2}>
                {publication.title}
              </Text>
              {publication.path && (
                <Text fontSize="xs" color="fg.muted" mt={1}>
                  {publication.path}
                </Text>
              )}
            </Box>
          )}

          {activeMemberships.length === 0 ? (
            <Center py={6}>
              <Text color="fg.muted">You haven&apos;t joined any communities yet.</Text>
            </Center>
          ) : (
            <VStack gap={2} align="stretch">
              <Text fontSize="sm" color="fg.muted" mb={1}>
                Select a community to share with:
              </Text>
              {checking && (
                <Center py={2}>
                  <Spinner size="sm" color="accent.default" />
                </Center>
              )}
              {activeMemberships.map((membership) => {
                const status = sharing[membership.communityDid] || 'idle';
                const error = errors[membership.communityDid];
                const shared = sharedStatus[membership.communityDid];
                const isShared = shared?.shared || status === 'success';
                const isUnsharing = unsharing[membership.communityDid] || false;

                return (
                  <Flex
                    key={membership.communityDid}
                    align="center"
                    justify="space-between"
                    p={3}
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor={isShared ? 'green.200' : 'border.card'}
                    bg={isShared ? 'green.50' : undefined}
                    _hover={!isShared && status === 'idle' ? { borderColor: 'accent.default' } : undefined}
                    transition="border-color 0.2s"
                  >
                    <Flex align="center" gap={3} flex={1} minW={0}>
                      <Avatar
                        name={membership.community.displayName}
                        src={membership.community.avatar}
                        size="sm"
                      />
                      <Box minW={0}>
                        <Text fontSize="sm" fontWeight="medium" truncate>
                          {membership.community.displayName}
                        </Text>
                        {isShared && (
                          <Badge colorPalette="green" size="sm" mt={0.5}>
                            Shared
                          </Badge>
                        )}
                      </Box>
                    </Flex>

                    <Box ml={3} flexShrink={0}>
                      {isShared && shared?.rkey && (
                        <Button
                          size="xs"
                          colorPalette="red"
                          variant="outline"
                          onClick={() => handleUnshare(membership.communityDid)}
                          loading={isUnsharing}
                        >
                          Unshare
                        </Button>
                      )}
                      {!isShared && status === 'idle' && (
                        <Button
                          size="xs"
                          colorPalette="accent"
                          variant="outline"
                          onClick={() => handleShare(membership.communityDid)}
                        >
                          Share
                        </Button>
                      )}
                      {status === 'loading' && <Spinner size="sm" color="accent.default" />}
                      {status === 'error' && (
                        <Text fontSize="xs" color="fg.error" fontWeight="medium">
                          {error || 'Failed'}
                        </Text>
                      )}
                      {error && isShared && (
                        <Text fontSize="xs" color="fg.error" mt={1}>
                          {error}
                        </Text>
                      )}
                    </Box>
                  </Flex>
                );
              })}
            </VStack>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}

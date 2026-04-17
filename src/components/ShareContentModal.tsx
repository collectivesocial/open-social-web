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
} from '@chakra-ui/react';
import { useState } from 'react';
import { api } from '../utils/api';
import { Avatar } from './ui/avatar';
import type { Publication, Membership } from '../types';

interface OpenChangeDetails {
  open: boolean;
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

  const handleShare = async (communityDid: string) => {
    if (!publication) return;

    setSharing((prev) => ({ ...prev, [communityDid]: 'loading' }));
    setErrors((prev) => ({ ...prev, [communityDid]: '' }));

    try {
      await api.post(`/api/v1/communities/${encodeURIComponent(communityDid)}/content`, {
        userDid: '', // Will be populated by the server from session
        type: 'document',
        documentUri: publication.uri,
        documentCid: publication.cid,
        title: publication.title,
        path: publication.path,
      });
      setSharing((prev) => ({ ...prev, [communityDid]: 'success' }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to share';
      setErrors((prev) => ({ ...prev, [communityDid]: message }));
      setSharing((prev) => ({ ...prev, [communityDid]: 'error' }));
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after close animation
    setTimeout(() => {
      setSharing({});
      setErrors({});
    }, 200);
  };

  const activeMemberships = memberships.filter((m) => m.status === 'active');

  return (
    <DialogRoot open={open} onOpenChange={(e: OpenChangeDetails) => handleClose()}>
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
              {activeMemberships.map((membership) => {
                const status = sharing[membership.communityDid] || 'idle';
                const error = errors[membership.communityDid];

                return (
                  <Flex
                    key={membership.communityDid}
                    align="center"
                    justify="space-between"
                    p={3}
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor="border.card"
                    _hover={status === 'idle' ? { borderColor: 'accent.default' } : undefined}
                    transition="border-color 0.2s"
                  >
                    <Flex align="center" gap={3} flex={1} minW={0}>
                      <Avatar
                        name={membership.community.displayName}
                        src={membership.community.avatar}
                        size="sm"
                      />
                      <Text fontSize="sm" fontWeight="medium" truncate>
                        {membership.community.displayName}
                      </Text>
                    </Flex>

                    <Box ml={3} flexShrink={0}>
                      {status === 'idle' && (
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
                      {status === 'success' && (
                        <Text fontSize="xs" color="green.500" fontWeight="medium">
                          Shared!
                        </Text>
                      )}
                      {status === 'error' && (
                        <Text fontSize="xs" color="fg.error" fontWeight="medium">
                          {error || 'Failed'}
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

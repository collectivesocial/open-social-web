import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogTitle,
  DialogCloseTrigger,
} from './ui/dialog.tsx';
import {
  Box,
  Input,
  VStack,
  Text,
  Spinner,
  Flex,
  Image,
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import type { Community } from '../types';

interface CommunitySearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** DIDs to exclude from results (e.g. already connected communities) */
  excludeDids?: string[];
  /** The community's own DID (always excluded) */
  selfDid: string;
  onSelect: (community: Community) => void;
}

export function CommunitySearchDialog({
  open,
  onOpenChange,
  title,
  excludeDids = [],
  selfDid,
  onSelect,
}: CommunitySearchDialogProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Community[]>([]);
  const [loading, setLoading] = useState(false);

  // Reset when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length > 0 && trimmed.length < 3) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (trimmed.length >= 3) {
          params.set('query', trimmed);
        }
        const data = await api.get<{ communities: Community[] }>(
          `/communities/search?${params.toString()}`,
        );
        const excluded = new Set([selfDid, ...excludeDids]);
        setResults(data.communities.filter((c) => !excluded.has(c.did)));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, trimmed.length >= 3 ? 400 : 0);

    return () => clearTimeout(timeout);
  }, [query, selfDid, excludeDids]);

  return (
    <DialogRoot
      open={open}
      onOpenChange={(e: { open: boolean }) => onOpenChange(e.open)}
    >
      <DialogContent maxW={{ base: '95vw', sm: '500px', md: '600px' }} mx={{ base: 2, sm: 4 }}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogCloseTrigger />
        </DialogHeader>
        <DialogBody pb={6}>
          <VStack gap={4} align="stretch">
            <Input
              placeholder="Search communities (min 3 characters)…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />

            {loading && (
              <Flex justify="center" py={4}>
                <Spinner size="sm" color="accent.default" />
              </Flex>
            )}

            {!loading && results.length === 0 && query.trim().length >= 3 && (
              <Text color="fg.muted" textAlign="center" py={4}>
                No communities found
              </Text>
            )}

            {results.map((community) => (
              <Box
                key={community.did}
                p={3}
                borderWidth="1px"
                borderColor="border"
                borderRadius="md"
                cursor="pointer"
                _hover={{ bg: 'bg.subtle' }}
                onClick={() => {
                  onSelect(community);
                  onOpenChange(false);
                }}
              >
                <Flex align="center" gap={3}>
                  {community.avatar && (
                    <Image
                      src={community.avatar}
                      alt=""
                      boxSize="40px"
                      borderRadius="full"
                      objectFit="cover"
                    />
                  )}
                  <Box flex={1} minW={0}>
                    <Text fontWeight="semibold" truncate>
                      {community.displayName}
                    </Text>
                    {community.description && (
                      <Text fontSize="sm" color="fg.muted" truncate>
                        {community.description}
                      </Text>
                    )}
                  </Box>
                </Flex>
              </Box>
            ))}
          </VStack>
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  );
}

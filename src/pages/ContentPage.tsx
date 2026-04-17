import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  VStack,
  Heading,
  Text,
  Button,
  Flex,
  Spinner,
  Center,
  Badge,
} from '@chakra-ui/react';
import { EmptyState } from '../components/EmptyState';
import { ShareContentModal } from '../components/ShareContentModal';
import { api } from '../utils/api';
import type { Publication, Membership } from '../types';

export function ContentPage() {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Share modal state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedPublication, setSelectedPublication] = useState<Publication | null>(null);

  const fetchPublications = useCallback(async () => {
    try {
      const data = await api.get<{ publications: Publication[] }>('/users/me/publications');
      setPublications(data.publications);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load publications');
    }
  }, []);

  const fetchMemberships = useCallback(async () => {
    try {
      const data = await api.get<{ memberships: Membership[] }>('/users/me/memberships');
      setMemberships(data.memberships);
    } catch (err) {
      console.error('Failed to fetch memberships:', err);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchPublications(), fetchMemberships()]).finally(() =>
      setLoading(false),
    );
  }, [fetchPublications, fetchMemberships]);

  const handleShareClick = (publication: Publication) => {
    setSelectedPublication(publication);
    setShareModalOpen(true);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <Container maxW="1920px" py={{ base: 4, md: 8 }} px={{ base: 4, md: 6 }}>
        <Center py={12}>
          <Spinner size="xl" color="accent.default" />
        </Center>
      </Container>
    );
  }

  return (
    <Container maxW="1920px" py={{ base: 4, md: 8 }} px={{ base: 4, md: 6 }}>
      <VStack gap={6} align="stretch">
        <Flex justify="space-between" align="center">
          <Box>
            <Heading size={{ base: 'lg', md: 'xl' }} fontFamily="heading">
              My Content
            </Heading>
            <Text color="fg.muted" mt={1}>
              Your standard.site publications. Share them with your communities.
            </Text>
          </Box>
        </Flex>

        {error && (
          <Box p={4} bg="red.50" borderRadius="md" borderWidth="1px" borderColor="red.200">
            <Text color="fg.error" fontSize="sm">{error}</Text>
          </Box>
        )}

        {publications.length === 0 ? (
          <EmptyState title="No publications" description="Create content on standard.site to see it here." />
        ) : (
          <VStack gap={3} align="stretch">
            {publications.map((pub) => (
              <Box
                key={pub.uri}
                bg="bg.card"
                borderRadius="xl"
                p={{ base: 4, md: 5 }}
                shadow="sm"
                borderWidth="1px"
                borderColor="border.card"
              >
                <Flex justify="space-between" align="flex-start" gap={4}>
                  <Box flex={1} minW={0}>
                    <Text fontWeight="semibold" fontSize={{ base: 'sm', md: 'md' }}>
                      {pub.title}
                    </Text>
                    <Flex gap={3} mt={2} align="center" flexWrap="wrap">
                      {pub.publishedAt && (
                        <Badge variant="subtle" size="sm">
                          {formatDate(pub.publishedAt)}
                        </Badge>
                      )}
                      {pub.path && (
                        <Text fontSize="xs" color="fg.muted" truncate>
                          {pub.path}
                        </Text>
                      )}
                    </Flex>
                  </Box>

                  <Button
                    size="sm"
                    colorPalette="accent"
                    variant="outline"
                    onClick={() => handleShareClick(pub)}
                    flexShrink={0}
                  >
                    Share
                  </Button>
                </Flex>
              </Box>
            ))}
          </VStack>
        )}
      </VStack>

      <ShareContentModal
        publication={selectedPublication}
        memberships={memberships}
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
      />
    </Container>
  );
}

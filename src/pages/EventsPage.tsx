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
import { ShareEventModal } from '../components/ShareEventModal';
import { api } from '../utils/api';
import type { CalendarEvent, Membership } from '../types';

export function EventsPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      const data = await api.get<{ events: CalendarEvent[] }>('/users/me/events');
      setEvents(data.events);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
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
    Promise.all([fetchEvents(), fetchMemberships()]).finally(() =>
      setLoading(false),
    );
  }, [fetchEvents, fetchMemberships]);

  const handleShareClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShareModalOpen(true);
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return null;
    }
  };

  const modeBadgeColor = (mode: string) => {
    switch (mode) {
      case 'in-person': return 'green';
      case 'virtual': return 'blue';
      case 'hybrid': return 'purple';
      default: return 'gray';
    }
  };

  if (loading) {
    return (
      <Container maxW="container.content" py={{ base: 4, md: 8 }} px={{ base: 4, md: 6 }}>
        <Center py={12}>
          <Spinner size="xl" color="accent.default" />
        </Center>
      </Container>
    );
  }

  return (
    <Container maxW="container.content" py={{ base: 4, md: 8 }} px={{ base: 4, md: 6 }}>
      <VStack gap={6} align="stretch">
        <Flex justify="space-between" align="center">
          <Box>
            <Heading size={{ base: 'lg', md: 'xl' }}>
              My Events
            </Heading>
            <Text color="fg.muted" mt={1}>
              Your calendar events. Share them with your communities.
            </Text>
          </Box>
        </Flex>

        {error && (
          <Box p={4} bg="red.50" borderRadius="md" borderWidth="1px" borderColor="red.200">
            <Text color="fg.error" fontSize="sm">{error}</Text>
          </Box>
        )}

        {events.length === 0 ? (
          <EmptyState title="No events" description="Create events on a calendar app like Smoke Signal or atmo.rsvp to see them here." />
        ) : (
          <VStack gap={3} align="stretch">
            {events.map((event) => (
              <Box
                key={event.uri}
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
                      {event.name}
                    </Text>
                    <Flex gap={3} mt={2} align="center" flexWrap="wrap">
                      {event.startsAt && (
                        <Badge variant="subtle" size="sm">
                          {formatDateTime(event.startsAt)}
                        </Badge>
                      )}
                      <Badge variant="subtle" size="sm" colorPalette={modeBadgeColor(event.mode)}>
                        {event.mode}
                      </Badge>
                      {event.location && (
                        <Text fontSize="xs" color="fg.muted" truncate>
                          {event.location}
                        </Text>
                      )}
                    </Flex>
                    {event.description && (
                      <Text fontSize="xs" color="fg.muted" mt={2} lineClamp={2}>
                        {event.description}
                      </Text>
                    )}
                  </Box>

                  <Button
                    size="sm"
                    colorPalette="accent"
                    variant="outline"
                    onClick={() => handleShareClick(event)}
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

      <ShareEventModal
        event={selectedEvent}
        memberships={memberships}
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
      />
    </Container>
  );
}

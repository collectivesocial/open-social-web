import { Box, Flex, Heading, Text, Badge, Image, Skeleton } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';

interface Community {
  did: string;
  displayName: string;
  description?: string;
  avatar?: string;
}

interface Membership {
  uri: string;
  communityDid: string;
  joinedAt: string;
  status: 'active' | 'pending';
  community: Community;
}

interface CommunityCardProps {
  membership: Membership;
}

export function CommunityCard({ membership }: CommunityCardProps) {
  const { community, status } = membership;
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/communities/${encodeURIComponent(community.did)}`);
  };

  return (
    <Box
      bg="white"
      borderRadius="lg"
      shadow="sm"
      p={5}
      cursor="pointer"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      _hover={{ shadow: 'md', transform: 'translateY(-2px)' }}
      _focusVisible={{ outline: '2px solid', outlineColor: 'teal.500', outlineOffset: '2px' }}
      transition="all 0.2s"
      borderWidth="1px"
      borderColor={status === 'pending' ? 'orange.200' : 'gray.200'}
    >
      <Flex gap={4} align="flex-start">
        {/* Avatar */}
        <Box flexShrink={0}>
          {community.avatar ? (
            <Image
              src={community.avatar}
              alt={community.displayName}
              boxSize="60px"
              borderRadius="md"
              objectFit="cover"
            />
          ) : (
            <Box
              boxSize="60px"
              borderRadius="md"
              bg="teal.100"
              display="flex"
              alignItems="center"
              justifyContent="center"
              fontSize="2xl"
              fontWeight="bold"
              color="teal.700"
            >
              {community.displayName.charAt(0).toUpperCase()}
            </Box>
          )}
        </Box>

        {/* Content */}
        <Box flex={1} minW={0}>
          <Flex justify="space-between" align="flex-start" mb={2}>
            <Heading size="md" lineClamp={1}>
              {community.displayName}
            </Heading>
            <Badge
              colorPalette={status === 'active' ? 'green' : 'orange'}
              ml={2}
              flexShrink={0}
            >
              {status === 'active' ? 'Active' : 'Pending'}
            </Badge>
          </Flex>

          {community.description && (
            <Text color="gray.600" fontSize="sm" lineClamp={2} mb={2}>
              {community.description}
            </Text>
          )}

          <Text fontSize="xs" color="gray.500">
            Joined {new Date(membership.joinedAt).toLocaleDateString()}
          </Text>
        </Box>
      </Flex>
    </Box>
  );
}

export function CommunityCardSkeleton() {
  return (
    <Box bg="white" borderRadius="lg" shadow="sm" p={5} borderWidth="1px" borderColor="gray.200">
      <Flex gap={4}>
        <Skeleton boxSize="60px" borderRadius="md" />
        <Box flex={1}>
          <Skeleton height="24px" width="60%" mb={2} />
          <Skeleton height="16px" width="100%" mb={1} />
          <Skeleton height="16px" width="80%" mb={2} />
          <Skeleton height="12px" width="40%" />
        </Box>
      </Flex>
    </Box>
  );
}

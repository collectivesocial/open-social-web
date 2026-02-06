import { Box, Flex, Heading, Text, Badge, Image, Skeleton, IconButton } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { FiTrash2 } from 'react-icons/fi';
import {
  DialogRoot,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogCloseTrigger,
} from './ui/dialog';
import { Button } from '@chakra-ui/react';

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
  isOnlyAdmin?: boolean;
}

interface CommunityCardProps {
  membership: Membership;
  onDelete?: () => void;
}

export function CommunityCard({ membership, onDelete }: CommunityCardProps) {
  const { community, status, isOnlyAdmin } = membership;
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleClick = () => {
    navigate(`/communities/${encodeURIComponent(community.did)}`);
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError('');

    try {
      const response = await fetch(`/communities/${encodeURIComponent(community.did)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete community');
      }

      setDeleteOpen(false);
      if (onDelete) {
        onDelete();
      }
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete community');
    } finally {
      setDeleting(false);
    }
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
      position="relative"
    >
      {isOnlyAdmin && (
        <DialogRoot open={deleteOpen} onOpenChange={(e) => setDeleteOpen(e.open)}>
          <DialogTrigger asChild>
            <IconButton
              aria-label="Delete community"
              size="sm"
              variant="ghost"
              colorPalette="red"
              position="absolute"
              top={2}
              right={2}
              onClick={(e) => {
                e.stopPropagation();
                setDeleteOpen(true);
              }}
              _hover={{ bg: 'red.50' }}
            >
              <FiTrash2 />
            </IconButton>
          </DialogTrigger>
          <DialogContent onClick={(e) => e.stopPropagation()}>
            <DialogHeader>
              <DialogTitle>Delete Community</DialogTitle>
              <DialogCloseTrigger />
            </DialogHeader>
            <DialogBody>
              <Text mb={2}>
                Are you sure you want to delete <strong>{community.displayName}</strong>?
              </Text>
              <Text fontSize="sm" color="gray.600">
                This will remove the community from OpenSocial. This action cannot be undone.
              </Text>
              {deleteError && (
                <Text color="red.600" fontSize="sm" mt={3}>
                  {deleteError}
                </Text>
              )}
            </DialogBody>
            <DialogFooter>
              <Button
                variant="outline"
                bg="transparent"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteOpen(false);
                }}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                colorPalette="red"
                bg="red.600"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                disabled={deleting}
                loading={deleting}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogRoot>
      )}
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

import {
  DialogRoot,
  DialogTrigger,
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
  Input,
  VStack,
  Text,
  Textarea,
  HStack,
} from '@chakra-ui/react';
import { useState } from 'react';

interface OpenChangeDetails {
  open: boolean;
}

interface ValueChangeDetails {
  value: string | null;
}

interface CreateCommunityModalProps {
  onSuccess: () => void;
}

export function CreateCommunityModal({ onSuccess }: CreateCommunityModalProps) {
  const [open, setOpen] = useState(false);
  const [creationType, setCreationType] = useState<'new' | 'existing'>('new');
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [existingDid, setExistingDid] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/users/me/communities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: creationType,
          ...(creationType === 'new'
            ? {
                name,
                displayName,
                description,
              }
            : {
                did: existingDid,
                appPassword,
                displayName,
                description,
              }),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create community');
      }

      // Success!
      setOpen(false);
      resetForm();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create community');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDisplayName('');
    setDescription('');
    setExistingDid('');
    setAppPassword('');
    setError('');
    setCreationType('new');
  };

  const isValid =
    creationType === 'new'
      ? name && displayName
      : existingDid && appPassword && displayName;

  return (
    <DialogRoot open={open} onOpenChange={(e: OpenChangeDetails) => setOpen(e.open)}>
      <DialogTrigger asChild>
        <Button colorPalette="teal" variant="solid" bg="teal" size="lg">
          Create Community
        </Button>
      </DialogTrigger>

      <DialogContent maxW="600px">
        <DialogHeader>
          <DialogTitle>Create a Community</DialogTitle>
          <DialogCloseTrigger />
        </DialogHeader>

        <DialogBody>
          <VStack gap={4} align="stretch">
            <Box>
              <Text fontWeight="medium" mb={2}>
                Community Type
              </Text>
              <VStack align="stretch" gap={3} role="radiogroup" aria-label="Community Type">
                <Box
                  as="button"
                  role="radio"
                  aria-checked={creationType === 'new'}
                  tabIndex={0}
                  p={3}
                  borderWidth="2px"
                  borderColor={creationType === 'new' ? 'teal.500' : 'gray.200'}
                  borderRadius="md"
                  cursor="pointer"
                  onClick={() => setCreationType('new')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setCreationType('new');
                    }
                  }}
                  bg={creationType === 'new' ? 'teal.50' : 'transparent'}
                  _focusVisible={{ outline: '2px solid', outlineColor: 'teal.500', outlineOffset: '2px' }}
                  textAlign="left"
                  w="full"
                >
                  <HStack gap={3}>
                    <Box
                      w="20px"
                      h="20px"
                      borderRadius="full"
                      borderWidth="2px"
                      borderColor={creationType === 'new' ? 'teal.500' : 'gray.300'}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      {creationType === 'new' && (
                        <Box w="10px" h="10px" borderRadius="full" bg="teal.500" />
                      )}
                    </Box>
                    <VStack align="start" gap={0} flex={1}>
                      <Text fontWeight="medium">Create on OpenSocial</Text>
                      <Text fontSize="sm" color="gray.600">
                        Get a new @name.opensocial.community handle
                      </Text>
                    </VStack>
                  </HStack>
                </Box>

                <Box
                  as="button"
                  role="radio"
                  aria-checked={creationType === 'existing'}
                  tabIndex={0}
                  p={3}
                  borderWidth="2px"
                  borderColor={creationType === 'existing' ? 'teal.500' : 'gray.200'}
                  borderRadius="md"
                  cursor="pointer"
                  onClick={() => setCreationType('existing')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setCreationType('existing');
                    }
                  }}
                  bg={creationType === 'existing' ? 'teal.50' : 'transparent'}
                  _focusVisible={{ outline: '2px solid', outlineColor: 'teal.500', outlineOffset: '2px' }}
                  textAlign="left"
                  w="full"
                >
                  <HStack gap={3}>
                    <Box
                      w="20px"
                      h="20px"
                      borderRadius="full"
                      borderWidth="2px"
                      borderColor={creationType === 'existing' ? 'teal.500' : 'gray.300'}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      {creationType === 'existing' && (
                        <Box w="10px" h="10px" borderRadius="full" bg="teal.500" />
                      )}
                    </Box>
                    <VStack align="start" gap={0} flex={1}>
                      <Text fontWeight="medium">Use Existing Account</Text>
                      <Text fontSize="sm" color="gray.600">
                        Connect an existing ATProto account with app password
                      </Text>
                    </VStack>
                  </HStack>
                </Box>
              </VStack>
            </Box>

            {creationType === 'new' ? (
              <>
                <Box>
                  <Text fontWeight="medium" mb={1}>
                    Community Name *
                  </Text>
                  <HStack>
                    <Input
                      placeholder="myawesomecommunity"
                      value={name}
                      onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                    />
                    <Text color="gray.600" fontSize="sm" whiteSpace="nowrap">
                      .opensocial.community
                    </Text>
                  </HStack>
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    This will be your community's unique handle
                  </Text>
                </Box>

                <Box>
                  <Text fontWeight="medium" mb={1}>
                    Display Name *
                  </Text>
                  <Input
                    placeholder="My Awesome Community"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </Box>

                <Box>
                  <Text fontWeight="medium" mb={1}>
                    Description
                  </Text>
                  <Textarea
                    placeholder="A community for..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </Box>
              </>
            ) : (
              <>
                <Box>
                  <Text fontWeight="medium" mb={1}>
                    Account DID *
                  </Text>
                  <Input
                    placeholder="did:plc:..."
                    value={existingDid}
                    onChange={(e) => setExistingDid(e.target.value)}
                  />
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    The DID of the account you want to use as a community
                  </Text>
                </Box>

                <Box>
                  <Text fontWeight="medium" mb={1}>
                    App Password *
                  </Text>
                  <Input
                    type="password"
                    placeholder="xxxx-xxxx-xxxx-xxxx"
                    value={appPassword}
                    onChange={(e) => setAppPassword(e.target.value)}
                  />
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    Generate an app password in your account settings
                  </Text>
                </Box>

                <Box>
                  <Text fontWeight="medium" mb={1}>
                    Display Name *
                  </Text>
                  <Input
                    placeholder="My Awesome Community"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </Box>

                <Box>
                  <Text fontWeight="medium" mb={1}>
                    Description
                  </Text>
                  <Textarea
                    placeholder="A community for..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </Box>
              </>
            )}

            {error && (
              <Text color="red.600" fontSize="sm">
                {error}
              </Text>
            )}
          </VStack>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" bg="transparent" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            colorPalette="teal"
            variant="solid"
            bg="teal"
            onClick={handleSubmit}
            disabled={!isValid || loading}
            loading={loading}
          >
            Create Community
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}

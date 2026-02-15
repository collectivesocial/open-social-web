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
  Flex,
  Input,
  VStack,
  Text,
  Textarea,
  Switch,
} from '@chakra-ui/react';
import { useState } from 'react';
import { csrfHeaders } from '../utils/csrf';
import { API_BASE } from '../utils/api';

interface OpenChangeDetails {
  open: boolean;
}

interface CreateCommunityModalProps {
  onSuccess: () => void;
}

export function CreateCommunityModal({ onSuccess }: CreateCommunityModalProps) {
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [existingDid, setExistingDid] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [requireApproval, setRequireApproval] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/users/me/communities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        credentials: 'include',
        body: JSON.stringify({
          type: 'existing',
          did: existingDid,
          appPassword,
          displayName,
          description,
          communityType: requireApproval ? 'admin-approved' : 'open',
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
    setDisplayName('');
    setDescription('');
    setExistingDid('');
    setAppPassword('');
    setRequireApproval(false);
    setError('');
  };

  const isValid = existingDid && appPassword && displayName;

  return (
    <DialogRoot open={open} onOpenChange={(e: OpenChangeDetails) => setOpen(e.open)}>
      <DialogTrigger asChild>
        <Button 
          colorPalette="accent" 
          variant="solid" 
          size={{ base: 'md', md: 'lg' }}
          width={{ base: 'full', md: 'auto' }}
        >
          Create Community
        </Button>
      </DialogTrigger>

      <DialogContent maxW={{ base: '95vw', sm: '500px', md: '600px' }} mx={{ base: 2, sm: 4 }}>
        <DialogHeader>
          <DialogTitle>Create a Community</DialogTitle>
          <DialogCloseTrigger />
        </DialogHeader>

        <DialogBody>
          <VStack gap={4} align="stretch">
            <Box>
              <Text fontWeight="medium" mb={1}>
                Account DID *
              </Text>
              <Input
                placeholder="did:plc:..."
                value={existingDid}
                onChange={(e) => setExistingDid(e.target.value)}
              />
              <Text fontSize="xs" color="fg.subtle" mt={1}>
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
              <Text fontSize="xs" color="fg.subtle" mt={1}>
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

            <Box>
              <Flex align="center" justify="space-between">
                <Box>
                  <Text fontWeight="medium">Require approval for new members</Text>
                  <Text fontSize="xs" color="fg.subtle">
                    When enabled, new members must be approved by an admin before joining
                  </Text>
                </Box>
                <Switch.Root
                  checked={requireApproval}
                  onCheckedChange={(e) => setRequireApproval(e.checked)}
                >
                  <Switch.HiddenInput />
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch.Root>
              </Flex>
            </Box>

            {error && (
              <Text color="fg.error" fontSize="sm">
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
            colorPalette="accent"
            variant="solid"
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

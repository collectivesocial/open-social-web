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
import {
  Box,
  Button,
  Input,
  VStack,
  Text,
  Code,
  Flex,
} from '@chakra-ui/react';
import { useState } from 'react';

interface OpenChangeDetails {
  open: boolean;
}

interface RegisterAppModalProps {
  onSuccess: () => void;
}

export function RegisterAppModal({ onSuccess }: RegisterAppModalProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{
    app: { app_id: string; name: string; domain: string; api_key: string };
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/v1/apps/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, domain }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to register app');
      }

      const data = await response.json();
      setResult(data);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register app');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDomain('');
    setError('');
    setResult(null);
    setCopiedKey(false);
  };

  const handleClose = () => {
    setOpen(false);
    resetForm();
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <DialogRoot open={open} onOpenChange={(e: OpenChangeDetails) => {
      if (!e.open) handleClose();
      else setOpen(true);
    }}>
      <DialogTrigger asChild>
        <Button
          colorPalette="accent"
          variant="solid"
          size={{ base: 'md', md: 'lg' }}
          width={{ base: 'full', md: 'auto' }}
        >
          Register New App
        </Button>
      </DialogTrigger>

      <DialogContent maxW={{ base: '95vw', sm: '500px', md: '600px' }} mx={{ base: 2, sm: 4 }}>
        <DialogHeader>
          <DialogTitle>{result ? 'App Registered!' : 'Register a New App'}</DialogTitle>
          <DialogCloseTrigger />
        </DialogHeader>

        <DialogBody>
          {result ? (
            <VStack gap={4} align="stretch">
              <Box bg="green.50" borderRadius="md" p={4} borderWidth="1px" borderColor="green.200">
                <Text fontWeight="bold" color="green.700" mb={2}>
                  ✅ App "{result.app.name}" registered successfully
                </Text>
                <Text fontSize="sm" color="green.600">
                  Save your API key below — treat it like a password.
                </Text>
              </Box>

              <Box>
                <Text fontWeight="medium" mb={1} fontSize="sm">App ID</Text>
                <Code p={2} borderRadius="md" display="block" fontSize="sm">
                  {result.app.app_id}
                </Code>
              </Box>

              <Box>
                <Flex justify="space-between" align="center" mb={1}>
                  <Text fontWeight="medium" fontSize="sm">API Key</Text>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => copyToClipboard(result.app.api_key)}
                  >
                    {copiedKey ? '✓ Copied' : 'Copy'}
                  </Button>
                </Flex>
                <Code p={2} borderRadius="md" display="block" fontSize="xs" wordBreak="break-all">
                  {result.app.api_key}
                </Code>
              </Box>
            </VStack>
          ) : (
            <VStack gap={4} align="stretch">
              <Box>
                <Text fontWeight="medium" mb={1} fontSize="sm">App Name</Text>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My App"
                  disabled={loading}
                />
              </Box>

              <Box>
                <Text fontWeight="medium" mb={1} fontSize="sm">Domain</Text>
                <Input
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="myapp.example.com"
                  disabled={loading}
                />
                <Text fontSize="xs" color="fg.subtle" mt={1}>
                  The domain where your app will run
                </Text>
              </Box>

              {error && (
                <Text color="fg.error" fontSize="sm">{error}</Text>
              )}
            </VStack>
          )}
        </DialogBody>

        <DialogFooter>
          {result ? (
            <Button onClick={handleClose} colorPalette="accent" variant="solid">
              Done
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button
                colorPalette="accent"
                variant="solid"
                onClick={handleSubmit}
                disabled={loading || !name || !domain}
              >
                {loading ? 'Registering...' : 'Register App'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}

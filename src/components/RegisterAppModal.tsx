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
  HStack,
  Badge,
} from '@chakra-ui/react';
import { useState } from 'react';

interface OpenChangeDetails {
  open: boolean;
}

interface DefaultPermission {
  collection: string;
  defaultCanCreate: string;
  defaultCanRead: string;
  defaultCanUpdate: string;
  defaultCanDelete: string;
}

const PERMISSION_LEVELS = ['member', 'admin'] as const;

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

  // Default permissions / lexicons
  const [permissions, setPermissions] = useState<DefaultPermission[]>([]);
  const [newCollection, setNewCollection] = useState('');
  const [collectionError, setCollectionError] = useState('');

  /**
   * Validates that a collection NSID belongs to the app's domain.
   * E.g. domain "myapp.example.com" → collection must start with "com.example.myapp."
   */
  const validateCollection = (collection: string): boolean => {
    if (!domain) return false;
    const domainParts = domain.split('.').reverse();
    const expectedPrefix = domainParts.join('.') + '.';
    return collection.startsWith(expectedPrefix);
  };

  const addPermission = () => {
    const trimmed = newCollection.trim();
    if (!trimmed) return;

    if (!validateCollection(trimmed)) {
      const domainParts = domain.split('.').reverse();
      setCollectionError(`Collection must start with "${domainParts.join('.')}." to match your app domain`);
      return;
    }

    if (permissions.some((p) => p.collection === trimmed)) {
      setCollectionError('This collection already exists');
      return;
    }

    setPermissions([
      ...permissions,
      {
        collection: trimmed,
        defaultCanCreate: 'member',
        defaultCanRead: 'member',
        defaultCanUpdate: 'member',
        defaultCanDelete: 'admin',
      },
    ]);
    setNewCollection('');
    setCollectionError('');
  };

  const removePermission = (index: number) => {
    setPermissions(permissions.filter((_, i) => i !== index));
  };

  const updatePermission = (index: number, field: keyof DefaultPermission, value: string) => {
    setPermissions(
      permissions.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
    );
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      const body: any = { name, domain };
      if (permissions.length > 0) {
        body.defaultPermissions = permissions;
      }

      const response = await fetch('/api/v1/apps/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
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
    setPermissions([]);
    setNewCollection('');
    setCollectionError('');
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

  const domainPrefix = domain
    ? domain.split('.').reverse().join('.') + '.'
    : '';

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

      <DialogContent maxW={{ base: '95vw', sm: '500px', md: '700px' }} mx={{ base: 2, sm: 4 }}>
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
                  The domain where your app will run. Lexicon collections must match this domain.
                </Text>
              </Box>

              {/* Default Collection Permissions / Lexicons */}
              <Box>
                <Text fontWeight="medium" mb={1} fontSize="sm">
                  Collection Permissions (Lexicons)
                </Text>
                <Text fontSize="xs" color="fg.subtle" mb={3}>
                  Define which record collections your app uses and their default permission levels.
                  Collections must use your app's reversed domain as a prefix
                  {domainPrefix && (
                    <>
                      {' '}(e.g. <Code fontSize="xs">{domainPrefix}feed.post</Code>)
                    </>
                  )}
                  .
                </Text>

                {permissions.map((perm, idx) => (
                  <Box
                    key={perm.collection}
                    borderWidth="1px"
                    borderColor="border.card"
                    borderRadius="lg"
                    p={3}
                    mb={2}
                  >
                    <Flex justify="space-between" align="center" mb={2}>
                      <Code fontSize="xs">{perm.collection}</Code>
                      <Button size="xs" variant="ghost" colorPalette="red" onClick={() => removePermission(idx)}>
                        Remove
                      </Button>
                    </Flex>

                    <Flex gap={2} flexWrap="wrap">
                      {(['defaultCanCreate', 'defaultCanRead', 'defaultCanUpdate', 'defaultCanDelete'] as const).map((field) => {
                        const label = field.replace('defaultCan', '');
                        return (
                          <Box key={field} flex="1" minW="100px">
                            <Text fontSize="xs" color="fg.subtle" mb={1}>{label}</Text>
                            <select
                              value={perm[field]}
                              onChange={(e) => updatePermission(idx, field, e.target.value)}
                              style={{
                                width: '100%',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                border: '1px solid var(--chakra-colors-border-card)',
                                backgroundColor: 'var(--chakra-colors-bg-subtle)',
                                fontSize: '0.75rem',
                              }}
                            >
                              {PERMISSION_LEVELS.map((level) => (
                                <option key={level} value={level}>{level}</option>
                              ))}
                            </select>
                          </Box>
                        );
                      })}
                    </Flex>
                  </Box>
                ))}

                <HStack gap={2}>
                  <Input
                    value={newCollection}
                    onChange={(e) => {
                      setNewCollection(e.target.value);
                      setCollectionError('');
                    }}
                    placeholder={domainPrefix ? `${domainPrefix}your.collection` : 'com.example.your.collection'}
                    size="sm"
                    disabled={!domain || loading}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addPermission}
                    disabled={!newCollection.trim() || !domain || loading}
                    flexShrink={0}
                  >
                    Add
                  </Button>
                </HStack>
                {collectionError && (
                  <Text fontSize="xs" color="fg.error" mt={1}>{collectionError}</Text>
                )}
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

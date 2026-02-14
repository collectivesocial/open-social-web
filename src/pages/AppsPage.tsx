import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  VStack,
  Heading,
  Text,
  Button,
  Flex,
  Grid,
  Code,
  Spinner,
  Center,
  Badge,
  Input,
  HStack,
} from '@chakra-ui/react';
import { RegisterAppModal } from '../components/RegisterAppModal';
import { EmptyState } from '../components/EmptyState';
import { api } from '../utils/api';
import type { AppInfo, AppDefaultPermission } from '../types';

const PERMISSION_LEVELS = ['member', 'admin'] as const;

function PermissionSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
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
  );
}

function AppDefaultPermissionsSection({ app }: { app: AppInfo }) {
  const [permissions, setPermissions] = useState<AppDefaultPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCollection, setNewCollection] = useState('');
  const [collectionError, setCollectionError] = useState('');
  const [saving, setSaving] = useState(false);

  const domainPrefix = app.domain.split('.').reverse().join('.') + '.';

  const fetchPermissions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ permissions: AppDefaultPermission[] }>(
        `/api/v1/apps/${app.app_id}/default-permissions`,
      );
      setPermissions(data.permissions);
    } catch {
      // If 404, no permissions exist yet — that's fine
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, [app.app_id]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const validateCollection = (collection: string): boolean => {
    return collection.startsWith(domainPrefix);
  };

  const addPermission = async () => {
    const trimmed = newCollection.trim();
    if (!trimmed) return;

    if (!validateCollection(trimmed)) {
      setCollectionError(`Collection must start with "${domainPrefix}"`);
      return;
    }

    if (permissions.some((p) => p.collection === trimmed)) {
      setCollectionError('This collection already exists');
      return;
    }

    setSaving(true);
    try {
      await api.post(`/api/v1/apps/${app.app_id}/default-permissions`, {
        collection: trimmed,
        defaultCanCreate: 'member',
        defaultCanRead: 'member',
        defaultCanUpdate: 'member',
        defaultCanDelete: 'admin',
      });
      await fetchPermissions();
      setNewCollection('');
      setCollectionError('');
    } catch (err: any) {
      setCollectionError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updatePermission = async (perm: AppDefaultPermission, field: string, value: string) => {
    try {
      await api.put(`/api/v1/apps/${app.app_id}/default-permissions`, {
        collection: perm.collection,
        [field]: value,
      });
      await fetchPermissions();
    } catch (err: any) {
      console.error('Failed to update permission:', err);
    }
  };

  const removePermission = async (collection: string) => {
    try {
      await api.del(`/api/v1/apps/${app.app_id}/default-permissions`, { collection });
      await fetchPermissions();
    } catch (err: any) {
      console.error('Failed to remove permission:', err);
    }
  };

  if (loading) {
    return (
      <Center py={4}>
        <Spinner size="sm" color="accent.default" />
      </Center>
    );
  }

  return (
    <Box mt={3} pt={3} borderTopWidth="1px" borderColor="border.subtle">
      <Text fontSize="xs" fontWeight="bold" color="fg.muted" mb={2}>
        Default Collection Permissions (Lexicons)
      </Text>

      {permissions.length === 0 && (
        <Text fontSize="xs" color="fg.subtle" mb={2}>
          No lexicons defined yet. Add collections to define default permissions.
        </Text>
      )}

      {permissions.map((perm) => (
        <Box
          key={perm.collection}
          borderWidth="1px"
          borderColor="border.card"
          borderRadius="md"
          p={2}
          mb={2}
          bg="bg.subtle"
        >
          <Flex justify="space-between" align="center" mb={2}>
            <Code fontSize="xs">{perm.collection}</Code>
            <Button
              size="xs"
              variant="ghost"
              colorPalette="red"
              onClick={() => removePermission(perm.collection)}
            >
              ✕
            </Button>
          </Flex>
          <Flex gap={2} flexWrap="wrap">
            {(
              [
                ['defaultCanCreate', 'Create'],
                ['defaultCanRead', 'Read'],
                ['defaultCanUpdate', 'Update'],
                ['defaultCanDelete', 'Delete'],
              ] as const
            ).map(([field, label]) => (
              <Box key={field} flex="1" minW="70px">
                <Text fontSize="xs" color="fg.subtle">{label}</Text>
                <PermissionSelect
                  value={perm[field]}
                  onChange={(v) => updatePermission(perm, field, v)}
                />
              </Box>
            ))}
          </Flex>
        </Box>
      ))}

      <HStack gap={2} mt={2}>
        <Input
          value={newCollection}
          onChange={(e) => {
            setNewCollection(e.target.value);
            setCollectionError('');
          }}
          placeholder={`${domainPrefix}your.collection`}
          size="sm"
          disabled={saving}
        />
        <Button size="sm" variant="outline" onClick={addPermission} disabled={saving} flexShrink={0}>
          Add
        </Button>
      </HStack>
      {collectionError && (
        <Text fontSize="xs" color="fg.error" mt={1}>{collectionError}</Text>
      )}
    </Box>
  );
}

function AppCard({
  app,
  onRotateKey,
  onDeactivate,
}: {
  app: AppInfo;
  onRotateKey: (appId: string) => void;
  onDeactivate: (appId: string) => void;
}) {
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyKey = async () => {
    await navigator.clipboard.writeText(app.api_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Box bg="bg.card" borderRadius="xl" shadow="sm" p={5} borderWidth="1px" borderColor="border.card">
      <Flex justify="space-between" align="start" mb={3}>
        <Box>
          <Heading size="sm" mb={1} fontFamily="heading">{app.name}</Heading>
          <Text fontSize="sm" color="fg.muted">{app.domain}</Text>
        </Box>
        <Badge
          colorPalette={app.status === 'active' ? 'green' : 'red'}
          size="sm"
        >
          {app.status}
        </Badge>
      </Flex>

      <Box mb={3}>
        <Text fontSize="xs" color="fg.subtle" mb={1}>App ID</Text>
        <Code fontSize="xs" p={1} borderRadius="sm">{app.app_id}</Code>
      </Box>

      <Box mb={3}>
        <Flex justify="space-between" align="center" mb={1}>
          <Text fontSize="xs" color="fg.subtle">API Key</Text>
          <Flex gap={1}>
            <Button size="xs" variant="ghost" onClick={() => setShowKey(!showKey)}>
              {showKey ? 'Hide' : 'Show'}
            </Button>
            {showKey && (
              <Button size="xs" variant="ghost" onClick={copyKey}>
                {copied ? '✓' : 'Copy'}
              </Button>
            )}
          </Flex>
        </Flex>
        <Code fontSize="xs" p={1} borderRadius="sm" display="block" wordBreak="break-all">
          {showKey ? app.api_key : '••••••••••••••••••••••••'}
        </Code>
      </Box>

      <Text fontSize="xs" color="fg.subtle" mb={3}>
        Created {new Date(app.created_at).toLocaleDateString()}
      </Text>

      {app.status === 'active' && (
        <Flex gap={2} mt={2}>
          <Button
            size="xs"
            variant="outline"
            colorPalette="blue"
            onClick={() => onRotateKey(app.app_id)}
          >
            Rotate Key
          </Button>
          <Button
            size="xs"
            variant="outline"
            colorPalette="red"
            onClick={() => onDeactivate(app.app_id)}
          >
            Deactivate
          </Button>
        </Flex>
      )}

      {app.status === 'active' && <AppDefaultPermissionsSection app={app} />}
    </Box>
  );
}

export function AppsPage() {
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [rotateResult, setRotateResult] = useState<{
    appId: string;
    api_key: string;
  } | null>(null);

  const fetchApps = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/apps', {
        credentials: 'include',
      });
      if (response.status === 401) {
        setAuthError(true);
        setApps([]);
      } else if (response.ok) {
        setAuthError(false);
        const data = await response.json();
        setApps(data.apps);
      }
    } catch (error) {
      console.error('Failed to fetch apps:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  const handleRotateKey = async (appId: string) => {
    if (!confirm('Rotate API key? The old key will stop working immediately.')) return;

    try {
      const data = await api.post<{ api_key: string }>(`/api/v1/apps/${appId}/rotate-key`);
      setRotateResult({ appId, api_key: data.api_key });
      fetchApps();
    } catch (error) {
      console.error('Failed to rotate key:', error);
    }
  };

  const handleDeactivate = async (appId: string) => {
    if (!confirm('Deactivate this app? Its API key will stop working.')) return;

    try {
      await api.del(`/api/v1/apps/${appId}`);
      fetchApps();
    } catch (error) {
      console.error('Failed to deactivate app:', error);
    }
  };

  return (
    <Container maxW="1920px" py={{ base: 4, md: 8 }} px={{ base: 4, md: 6 }}>
      <VStack gap={6} align="stretch">
        <Flex
          direction={{ base: 'column', md: 'row' }}
          justify="space-between"
          align={{ base: 'stretch', md: 'center' }}
          gap={{ base: 4, md: 0 }}
        >
          <Box>
            <Heading size={{ base: 'md', md: 'lg' }} mb={2} fontFamily="heading">Developer Apps</Heading>
            <Text color="fg.muted" fontSize={{ base: 'sm', md: 'md' }}>
              Register and manage apps that use the OpenSocial API
            </Text>
          </Box>
          <RegisterAppModal onSuccess={fetchApps} />
        </Flex>

        {/* Show rotate result banner */}
        {rotateResult && (
          <Box bg="blue.50" borderRadius="md" p={4} borderWidth="1px" borderColor="blue.200">
            <Flex justify="space-between" align="start" mb={2}>
              <Text fontWeight="bold" color="blue.700">
                🔑 New credentials for {rotateResult.appId}
              </Text>
              <Button size="xs" variant="ghost" onClick={() => setRotateResult(null)}>✕</Button>
            </Flex>
            <Box>
              <Text fontSize="sm" fontWeight="medium">New API Key:</Text>
              <Code fontSize="xs" p={1} display="block" wordBreak="break-all">
                {rotateResult.api_key}
              </Code>
            </Box>
          </Box>
        )}

        {loading ? (
          <Center py={12}>
            <Spinner size="xl" color="accent.default" />
          </Center>
        ) : authError ? (
          <EmptyState
            title="Not logged in"
            description="You need to log in before you can manage developer apps."
          />
        ) : apps.length === 0 ? (
          <EmptyState
            title="No apps registered"
            description="Register an app to get API credentials for building on the OpenSocial platform."
          />
        ) : (
          <Grid
            templateColumns={{
              base: '1fr',
              md: 'repeat(2, 1fr)',
              lg: 'repeat(3, 1fr)',
            }}
            gap={4}
          >
            {apps.map((app) => (
              <AppCard
                key={app.app_id}
                app={app}
                onRotateKey={handleRotateKey}
                onDeactivate={handleDeactivate}
              />
            ))}
          </Grid>
        )}
      </VStack>
    </Container>
  );
}

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
} from '@chakra-ui/react';
import { RegisterAppModal } from '../components/RegisterAppModal';
import { EmptyState } from '../components/EmptyState';

interface AppInfo {
  app_id: string;
  name: string;
  domain: string;
  api_key: string;
  status: string;
  created_at: string;
  updated_at: string;
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
    <Box bg="white" borderRadius="lg" shadow="sm" p={5} borderWidth="1px" borderColor="gray.200">
      <Flex justify="space-between" align="start" mb={3}>
        <Box>
          <Heading size="sm" mb={1}>{app.name}</Heading>
          <Text fontSize="sm" color="gray.600">{app.domain}</Text>
        </Box>
        <Badge
          colorPalette={app.status === 'active' ? 'green' : 'red'}
          size="sm"
        >
          {app.status}
        </Badge>
      </Flex>

      <Box mb={3}>
        <Text fontSize="xs" color="gray.500" mb={1}>App ID</Text>
        <Code fontSize="xs" p={1} borderRadius="sm">{app.app_id}</Code>
      </Box>

      <Box mb={3}>
        <Flex justify="space-between" align="center" mb={1}>
          <Text fontSize="xs" color="gray.500">API Key</Text>
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

      <Text fontSize="xs" color="gray.400" mb={3}>
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
      const response = await fetch(`/api/v1/apps/${appId}/rotate-key`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setRotateResult({ appId, api_key: data.api_key });
        fetchApps();
      }
    } catch (error) {
      console.error('Failed to rotate key:', error);
    }
  };

  const handleDeactivate = async (appId: string) => {
    if (!confirm('Deactivate this app? Its API key will stop working.')) return;

    try {
      const response = await fetch(`/api/v1/apps/${appId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        fetchApps();
      }
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
            <Heading size={{ base: 'md', md: 'lg' }} mb={2}>Developer Apps</Heading>
            <Text color="gray.600" fontSize={{ base: 'sm', md: 'md' }}>
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
            <Spinner size="xl" color="teal.500" />
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

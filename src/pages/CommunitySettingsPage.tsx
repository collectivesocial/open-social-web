import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Code,
  Input,
  HStack,
  Grid,
  Textarea,
} from '@chakra-ui/react';
import { api } from '../utils/api';
import { toaster } from '../components/ui/toaster';
import type {
  CommunitySettings,
  AppVisibility,
  CollectionPermission,
  CommunityRole,
} from '../types';

const PERMISSION_LEVELS = ['member', 'admin'] as const;

function PermSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
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
      {PERMISSION_LEVELS.map((l) => (
        <option key={l} value={l}>{l}</option>
      ))}
    </select>
  );
}

// ─── Tab: General Settings ────────────────────────────────────────────

function SettingsTab({ did }: { did: string }) {
  const [settings, setSettings] = useState<CommunitySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ settings: CommunitySettings }>(
        `/communities/${encodeURIComponent(did)}/settings`,
      );
      setSettings(data.settings);
    } catch {
      setSettings({
        communityDid: did,
        appVisibilityDefault: 'open',
        blockedAppIds: [],
      });
    } finally {
      setLoading(false);
    }
  }, [did]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await api.put(`/communities/${encodeURIComponent(did)}/settings`, {
        communityType: settings.communityType,
        appVisibilityDefault: settings.appVisibilityDefault,
        blockedAppIds: settings.blockedAppIds,
      });
      toaster.success({
        title: 'Settings saved',
        description: 'Community settings have been updated',
      });
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      toaster.error({
        title: 'Failed to save settings',
        description: err.message || 'Could not update community settings',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) return <Center py={8}><Spinner size="lg" color="accent.default" /></Center>;

  return (
    <VStack gap={5} align="stretch">
      <Box bg="bg.card" borderRadius="xl" shadow="sm" p={5} borderWidth="1px" borderColor="border.card">
        <Heading size="sm" mb={3} fontFamily="heading">Community Type</Heading>
        <Text fontSize="sm" color="fg.muted" mb={3}>
          Controls who can join this community and how membership requests are handled.
        </Text>
        <select
          value={settings.communityType || 'open'}
          onChange={(e) => setSettings({ ...settings, communityType: e.target.value as any })}
          style={{
            width: '100%',
            maxWidth: '300px',
            padding: '6px 12px',
            borderRadius: '8px',
            border: '1px solid var(--chakra-colors-border-card)',
            backgroundColor: 'var(--chakra-colors-bg-subtle)',
          }}
        >
          <option value="open">Open — anyone can join</option>
          <option value="admin-approved">Admin Approved — requests require approval</option>
          <option value="private">Private — invite only</option>
        </select>
      </Box>

      <Box bg="bg.card" borderRadius="xl" shadow="sm" p={5} borderWidth="1px" borderColor="border.card">
        <Heading size="sm" mb={3} fontFamily="heading">App Visibility Default</Heading>
        <Text fontSize="sm" color="fg.muted" mb={3}>
          When an app first interacts with this community, should it be allowed by default or require admin approval?
        </Text>
        <select
          value={settings.appVisibilityDefault}
          onChange={(e) => setSettings({ ...settings, appVisibilityDefault: e.target.value as any })}
          style={{
            width: '100%',
            maxWidth: '300px',
            padding: '6px 12px',
            borderRadius: '8px',
            border: '1px solid var(--chakra-colors-border-card)',
            backgroundColor: 'var(--chakra-colors-bg-subtle)',
          }}
        >
          <option value="open">Open — apps allowed by default</option>
          <option value="approval_required">Approval Required — admin must enable each app</option>
        </select>
      </Box>

      <Flex justify="flex-end">
        <Button onClick={save} disabled={saving} colorPalette="orange" size="sm">
          {saving ? 'Saving…' : 'Save Settings'}
        </Button>
      </Flex>
    </VStack>
  );
}

// ─── Tab: Apps ────────────────────────────────────────────────────────

interface AllApp {
  app_id: string;
  name: string;
  domain: string;
}

function AppsTab({ did }: { did: string }) {
  const [apps, setApps] = useState<AppVisibility[]>([]);
  const [allApps, setAllApps] = useState<AllApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedApp, setExpandedApp] = useState<string | null>(null);

  const fetchApps = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ apps: AppVisibility[]; allApps: AllApp[] }>(
        `/communities/${encodeURIComponent(did)}/apps`,
      );
      setApps(data.apps);
      setAllApps(data.allApps);
    } catch {
      setApps([]);
    } finally {
      setLoading(false);
    }
  }, [did]);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  const setAppStatus = async (appId: string, status: string) => {
    try {
      await api.put(
        `/communities/${encodeURIComponent(did)}/apps/${appId}`,
        { status },
      );
      await fetchApps();
      toaster.success({
        title: 'App status updated',
        description: `App has been ${status}`,
      });
    } catch (err: any) {
      console.error('Failed to update app status:', err);
      toaster.error({
        title: 'Failed to update app status',
        description: err.message || 'Could not update app status',
      });
    }
  };

  if (loading) return <Center py={8}><Spinner size="lg" color="accent.default" /></Center>;

  // Merge: show all active apps, with overrides where they exist
  const overrideMap = new Map(apps.map((a) => [a.appId, a]));
  const appsList = allApps.map((a) => ({
    appId: a.app_id,
    name: a.name,
    domain: a.domain,
    status: overrideMap.get(a.app_id)?.status || 'default',
  }));

  return (
    <VStack gap={3} align="stretch">
      <Text fontSize="sm" color="fg.muted">
        Control which apps can interact with this community.
      </Text>

      {appsList.length === 0 && (
        <Text fontSize="sm" color="fg.subtle">No registered apps found.</Text>
      )}

      {appsList.map((app) => (
        <Box
          key={app.appId}
          bg="bg.card"
          borderRadius="xl"
          shadow="sm"
          p={4}
          borderWidth="1px"
          borderColor="border.card"
        >
          <Flex justify="space-between" align="center" mb={2}>
            <Box>
              <Text fontWeight="semibold" fontSize="sm">{app.name}</Text>
              <Text fontSize="xs" color="fg.muted">{app.domain}</Text>
            </Box>
            <HStack gap={2}>
              <Badge
                colorPalette={
                  app.status === 'enabled' ? 'green' :
                  app.status === 'disabled' ? 'red' :
                  app.status === 'pending' ? 'yellow' : 'gray'
                }
                size="sm"
              >
                {app.status === 'default' ? 'default (open)' : app.status}
              </Badge>
            </HStack>
          </Flex>

          <Flex gap={2} flexWrap="wrap">
            <Button
              size="xs"
              variant={app.status === 'enabled' ? 'solid' : 'outline'}
              colorPalette="green"
              onClick={() => setAppStatus(app.appId, 'enabled')}
            >
              Enable
            </Button>
            <Button
              size="xs"
              variant={app.status === 'disabled' ? 'solid' : 'outline'}
              colorPalette="red"
              onClick={() => setAppStatus(app.appId, 'disabled')}
            >
              Disable
            </Button>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => setExpandedApp(expandedApp === app.appId ? null : app.appId)}
            >
              {expandedApp === app.appId ? 'Hide Permissions' : 'Permissions'}
            </Button>
          </Flex>

          {expandedApp === app.appId && (
            <AppCollectionPermissions did={did} appId={app.appId} />
          )}
        </Box>
      ))}
    </VStack>
  );
}

function AppCollectionPermissions({ did, appId }: { did: string; appId: string }) {
  const [permissions, setPermissions] = useState<CollectionPermission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ permissions: CollectionPermission[] }>(
        `/communities/${encodeURIComponent(did)}/apps/${appId}/permissions`,
      );
      setPermissions(data.permissions);
    } catch {
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, [did, appId]);

  useEffect(() => { fetchPermissions(); }, [fetchPermissions]);

  const updateField = async (collection: string, field: string, value: string) => {
    try {
      await api.put(
        `/communities/${encodeURIComponent(did)}/apps/${appId}/permissions`,
        { collection, [field]: value },
      );
      await fetchPermissions();
      toaster.success({
        title: 'Permission updated',
        description: 'Collection permission has been updated',
      });
    } catch (err: any) {
      console.error('Failed to update permission:', err);
      toaster.error({
        title: 'Failed to update permission',
        description: err.message || 'Could not update permission',
      });
    }
  };

  const removePermission = async (collection: string) => {
    try {
      await api.del(
        `/communities/${encodeURIComponent(did)}/apps/${appId}/permissions`,
        { collection },
      );
      await fetchPermissions();
      toaster.success({
        title: 'Permission removed',
        description: 'Collection permission has been removed',
      });
    } catch (err: any) {
      console.error('Failed to delete permission:', err);
      toaster.error({
        title: 'Failed to remove permission',
        description: err.message || 'Could not remove permission',
      });
    }
  };

  if (loading) return <Center py={3}><Spinner size="sm" color="accent.default" /></Center>;

  return (
    <Box mt={3} pt={3} borderTopWidth="1px" borderColor="border.subtle">
      <Text fontSize="xs" fontWeight="bold" color="fg.muted" mb={2}>
        Collection-level Permission Overrides
      </Text>

      {permissions.length === 0 && (
        <Text fontSize="xs" color="fg.subtle">
          No permission overrides. Enable the app to seed defaults.
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
            <Button size="xs" variant="ghost" colorPalette="red" onClick={() => removePermission(perm.collection)}>
              ✕
            </Button>
          </Flex>
          <Flex gap={2} flexWrap="wrap">
            {(
              [
                ['canCreate', 'Create'],
                ['canRead', 'Read'],
                ['canUpdate', 'Update'],
                ['canDelete', 'Delete'],
              ] as const
            ).map(([field, label]) => (
              <Box key={field} flex="1" minW="70px">
                <Text fontSize="xs" color="fg.subtle">{label}</Text>
                <PermSelect
                  value={perm[field]}
                  onChange={(v) => updateField(perm.collection, field, v)}
                />
              </Box>
            ))}
          </Flex>
        </Box>
      ))}
    </Box>
  );
}

// ─── Tab: Roles ──────────────────────────────────────────────────────

function RolesTab({ did }: { did: string }) {
  const [roles, setRoles] = useState<CommunityRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newVisible, setNewVisible] = useState(false);
  const [newCanViewAuditLog, setNewCanViewAuditLog] = useState(false);
  const [createError, setCreateError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ roles: CommunityRole[] }>(
        `/communities/${encodeURIComponent(did)}/roles`,
      );
      setRoles(data.roles);
    } catch {
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, [did]);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  const createRole = async () => {
    if (!newName || !newDisplayName) {
      setCreateError('Name and display name are required');
      return;
    }
    setSaving(true);
    setCreateError('');
    try {
      await api.post(`/communities/${encodeURIComponent(did)}/roles`, {
        name: newName,
        displayName: newDisplayName,
        description: newDescription || undefined,
        visible: newVisible,
        canViewAuditLog: newCanViewAuditLog,
      });
      setNewName('');
      setNewDisplayName('');
      setNewDescription('');
      setNewVisible(false);
      setNewCanViewAuditLog(false);
      setShowCreate(false);
      await fetchRoles();
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteRole = async (roleName: string) => {
    if (!confirm(`Delete role "${roleName}"? All assignments will be removed.`)) return;
    try {
      await api.del(`/communities/${encodeURIComponent(did)}/roles/${roleName}`);
      await fetchRoles();
      toaster.success({
        title: 'Role deleted',
        description: 'Role has been deleted',
      });
    } catch (err: any) {
      console.error('Failed to delete role:', err);
      toaster.error({
        title: 'Failed to delete role',
        description: err.message || 'Could not delete role',
      });
    }
  };

  const toggleVisibility = async (role: CommunityRole) => {
    try {
      await api.put(
        `/communities/${encodeURIComponent(did)}/roles/${role.name}`,
        { visible: !role.visible },
      );
      await fetchRoles();
      toaster.success({
        title: 'Role visibility updated',
        description: `Role is now ${!role.visible ? 'visible' : 'hidden'}`,
      });
    } catch (err: any) {
      console.error('Failed to update role:', err);
      toaster.error({
        title: 'Failed to update role',
        description: err.message || 'Could not update role visibility',
      });
    }
  };

  const toggleAuditLogAccess = async (role: CommunityRole) => {
    try {
      await api.put(
        `/communities/${encodeURIComponent(did)}/roles/${role.name}`,
        { canViewAuditLog: !role.canViewAuditLog },
      );
      await fetchRoles();
      toaster.success({
        title: 'Audit log access updated',
        description: `Audit log access ${!role.canViewAuditLog ? 'granted' : 'revoked'}`,
      });
    } catch (err: any) {
      console.error('Failed to update role:', err);
      toaster.error({
        title: 'Failed to update role',
        description: err.message || 'Could not update audit log access',
      });
    }
  };

  if (loading) return <Center py={8}><Spinner size="lg" color="accent.default" /></Center>;

  return (
    <VStack gap={4} align="stretch">
      <Flex justify="space-between" align="center">
        <Text fontSize="sm" color="fg.muted">
          Custom roles beyond the built-in admin and member roles.
        </Text>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowCreate(!showCreate)}
        >
          {showCreate ? 'Cancel' : '+ New Role'}
        </Button>
      </Flex>

      {showCreate && (
        <Box bg="bg.card" borderRadius="xl" shadow="sm" p={4} borderWidth="1px" borderColor="border.card">
          <VStack gap={3} align="stretch">
            <Heading size="xs" fontFamily="heading">Create Role</Heading>
            <Flex gap={3} flexWrap="wrap">
              <Box flex="1" minW="150px">
                <Text fontSize="xs" color="fg.subtle" mb={1}>Name (lowercase, no spaces)</Text>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  placeholder="e.g. moderator"
                  size="sm"
                />
              </Box>
              <Box flex="1" minW="150px">
                <Text fontSize="xs" color="fg.subtle" mb={1}>Display Name</Text>
                <Input
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="e.g. Moderator"
                  size="sm"
                />
              </Box>
            </Flex>
            <Box>
              <Text fontSize="xs" color="fg.subtle" mb={1}>Description (optional)</Text>
              <Textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="What does this role do?"
                size="sm"
                rows={2}
              />
            </Box>
            <Flex align="center" gap={2}>
              <input
                type="checkbox"
                checked={newVisible}
                onChange={(e) => setNewVisible(e.target.checked)}
                id="visible-checkbox"
              />
              <Text as="label" htmlFor="visible-checkbox" fontSize="sm">
                Visible to all members
              </Text>
            </Flex>
            <Flex align="center" gap={2}>
              <input
                type="checkbox"
                checked={newCanViewAuditLog}
                onChange={(e) => setNewCanViewAuditLog(e.target.checked)}
                id="audit-log-checkbox"
              />
              <Text as="label" htmlFor="audit-log-checkbox" fontSize="sm">
                Can view audit log
              </Text>
            </Flex>
            {createError && <Text fontSize="xs" color="fg.error">{createError}</Text>}
            <Button onClick={createRole} disabled={saving} colorPalette="orange" size="sm" alignSelf="flex-start">
              {saving ? 'Creating…' : 'Create Role'}
            </Button>
          </VStack>
        </Box>
      )}

      {roles.length === 0 && !showCreate && (
        <Text fontSize="sm" color="fg.subtle">No custom roles yet. Create one to assign to members.</Text>
      )}

      <Grid
        templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }}
        gap={3}
      >
        {roles.map((role) => (
          <Box
            key={role.name}
            bg="bg.card"
            borderRadius="xl"
            shadow="sm"
            p={4}
            borderWidth="1px"
            borderColor="border.card"
          >
            <Flex justify="space-between" align="start" mb={2}>
              <Box>
                <Text fontWeight="semibold" fontSize="sm">{role.displayName}</Text>
                <Code fontSize="xs">{role.name}</Code>
              </Box>
              <Badge colorPalette={role.visible ? 'green' : 'gray'} size="sm">
                {role.visible ? 'Visible' : 'Hidden'}
              </Badge>
            </Flex>
            {role.description && (
              <Text fontSize="xs" color="fg.muted" mb={2}>{role.description}</Text>
            )}
            <Flex align="center" gap={2} mb={2}>
              <Badge colorPalette={role.canViewAuditLog ? 'purple' : 'gray'} size="sm">
                {role.canViewAuditLog ? 'Audit Log ✓' : 'No Audit Log'}
              </Badge>
            </Flex>
            <Flex gap={2}>
              <Button size="xs" variant="ghost" onClick={() => toggleVisibility(role)}>
                {role.visible ? 'Hide' : 'Show'}
              </Button>
              <Button size="xs" variant="ghost" onClick={() => toggleAuditLogAccess(role)}>
                {role.canViewAuditLog ? 'Revoke Audit' : 'Grant Audit'}
              </Button>
              <Button size="xs" variant="ghost" colorPalette="red" onClick={() => deleteRole(role.name)}>
                Delete
              </Button>
            </Flex>
          </Box>
        ))}
      </Grid>
    </VStack>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────

interface AuditLogEntry {
  id: number;
  action: string;
  adminDid: string;
  targetDid: string | null;
  reason: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
}

function AuditLogTab({ did }: { did: string }) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchEntries = useCallback(async (cursorParam?: string) => {
    const isInitial = !cursorParam;
    if (isInitial) setLoading(true);
    else setLoadingMore(true);
    try {
      const params = new URLSearchParams({ limit: '25' });
      if (cursorParam) params.set('cursor', cursorParam);
      const data = await api.get<{ entries: AuditLogEntry[]; cursor?: string }>(
        `/communities/${encodeURIComponent(did)}/audit-log?${params.toString()}`,
      );
      if (isInitial) {
        setEntries(data.entries);
      } else {
        setEntries((prev) => [...prev, ...data.entries]);
      }
      setCursor(data.cursor);
    } catch {
      if (isInitial) setEntries([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [did]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  if (loading) return <Center py={8}><Spinner size="lg" color="accent.default" /></Center>;

  const formatAction = (action: string) => action.replace(/\./g, ' › ');

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <VStack gap={3} align="stretch">
      <Text fontSize="sm" color="fg.muted">
        A record of all administrative actions taken in this community.
      </Text>

      {entries.length === 0 && (
        <Text fontSize="sm" color="fg.subtle">No audit log entries yet.</Text>
      )}

      {entries.map((entry) => (
        <Box
          key={entry.id}
          bg="bg.card"
          borderRadius="xl"
          shadow="sm"
          p={4}
          borderWidth="1px"
          borderColor="border.card"
        >
          <Flex justify="space-between" align="start" mb={1}>
            <Badge colorPalette="purple" size="sm">{formatAction(entry.action)}</Badge>
            <Text fontSize="xs" color="fg.subtle">{formatDate(entry.createdAt)}</Text>
          </Flex>
          <Text fontSize="xs" color="fg.muted" mt={1}>
            By: <Code fontSize="xs">{entry.adminDid}</Code>
          </Text>
          {entry.targetDid && (
            <Text fontSize="xs" color="fg.muted">
              Target: <Code fontSize="xs">{entry.targetDid}</Code>
            </Text>
          )}
          {entry.reason && (
            <Text fontSize="xs" color="fg.muted" mt={1}>Reason: {entry.reason}</Text>
          )}
          {entry.metadata && Object.keys(entry.metadata).length > 0 && (
            <Code fontSize="xs" mt={1} display="block" p={2} borderRadius="md">
              {JSON.stringify(entry.metadata, null, 2)}
            </Code>
          )}
        </Box>
      ))}

      {cursor && (
        <Flex justify="center" pt={2}>
          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchEntries(cursor)}
            disabled={loadingMore}
          >
            {loadingMore ? 'Loading…' : 'Load More'}
          </Button>
        </Flex>
      )}
    </VStack>
  );
}

type TabName = 'settings' | 'apps' | 'roles' | 'audit-log';

export function CommunitySettingsPage() {
  const { did } = useParams<{ did: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabName>('settings');
  const [communityName, setCommunityName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [canViewAuditLog, setCanViewAuditLog] = useState(false);

  useEffect(() => {
    if (!did) return;
    (async () => {
      try {
        const [communityData, accessData] = await Promise.all([
          api.get<{ community: { displayName: string } }>(
            `/communities/${encodeURIComponent(did)}`,
          ),
          api.get<{ canViewAuditLog: boolean }>(
            `/communities/${encodeURIComponent(did)}/audit-log/access`,
          ).catch(() => ({ canViewAuditLog: false })),
        ]);
        setCommunityName(communityData.community.displayName);
        setCanViewAuditLog(accessData.canViewAuditLog);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [did]);

  if (!did) return null;

  if (loading) {
    return (
      <Center py={20}>
        <Spinner size="xl" color="accent.default" />
      </Center>
    );
  }

  if (error) {
    return (
      <Container maxW="1920px" py={8} px={{ base: 4, md: 6 }}>
        <Text color="fg.error">{error}</Text>
      </Container>
    );
  }

  const tabs: { key: TabName; label: string }[] = [
    { key: 'settings', label: 'Settings' },
    { key: 'apps', label: 'Apps' },
    { key: 'roles', label: 'Roles' },
    ...(canViewAuditLog ? [{ key: 'audit-log' as TabName, label: 'Audit Log' }] : []),
  ];

  return (
    <Container maxW="1920px" py={{ base: 4, md: 8 }} px={{ base: 4, md: 6 }}>
      <VStack gap={6} align="stretch">
        {/* Header */}
        <Flex
          direction={{ base: 'column', md: 'row' }}
          justify="space-between"
          align={{ base: 'stretch', md: 'center' }}
          gap={3}
        >
          <Box>
            <Button
              variant="ghost"
              size="sm"
              mb={1}
              onClick={() => navigate(`/communities/${encodeURIComponent(did)}`)}
            >
              ← Back to Community
            </Button>
            <Heading size={{ base: 'md', md: 'lg' }} fontFamily="heading">
              {communityName} — Settings
            </Heading>
          </Box>
        </Flex>

        {/* Tab bar */}
        <Flex
          gap={0}
          borderBottomWidth="2px"
          borderColor="border.subtle"
        >
          {tabs.map((t) => (
            <Button
              key={t.key}
              variant="ghost"
              size="sm"
              onClick={() => setTab(t.key)}
              borderBottomWidth="2px"
              borderColor={tab === t.key ? 'accent.default' : 'transparent'}
              borderRadius="0"
              color={tab === t.key ? 'accent.default' : 'fg.muted'}
              fontWeight={tab === t.key ? 'bold' : 'normal'}
              px={4}
              mb="-2px"
            >
              {t.label}
            </Button>
          ))}
        </Flex>

        {/* Tab content */}
        {tab === 'settings' && <SettingsTab did={did} />}
        {tab === 'apps' && <AppsTab did={did} />}
        {tab === 'roles' && <RolesTab did={did} />}
        {tab === 'audit-log' && canViewAuditLog && <AuditLogTab did={did} />}
      </VStack>
    </Container>
  );
}

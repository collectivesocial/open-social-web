import { useState } from 'react';
import {
  Box,
  Badge,
  Button,
  Input,
  Text,
  VStack,
  Flex,
  HStack,
  Separator,
} from '@chakra-ui/react';
import { LuChevronDown, LuChevronRight } from 'react-icons/lu';
import { CopyableCode } from './CopyableCode';
import { api } from '../utils/api';
import type { AppInfo } from '../types';

// ─── Stub snippets (Simon's Section B absent — see kaylee-phase2-cimd.md) ────

const SNIPPET_KEYGEN = `# Generate an RSA-2048 signing keypair
openssl genrsa -out cimd_private.pem 2048
openssl rsa -in cimd_private.pem -pubout -out cimd_public.pem

# Convert public key to JWK format (requires node or python-jose)
# node -e "require('node-jose').JWK.asKey(require('fs').readFileSync('cimd_public.pem'),'pem').then(k=>console.log(JSON.stringify(k.toJSON())))"`.trim();

const SNIPPET_JWKS = `{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "alg": "RS256",
      "kid": "your-key-id-v1",
      "n": "<base64url-modulus>",
      "e": "AQAB"
    }
  ]
}`.trim();

const SNIPPET_TEST = (appId: string) =>
  `# Send a signed test request — replace headers with your actual values
curl -i https://<your-community-host>/api/v1/apps/${appId}/cimd/test \\
  -H "Signature: keyId=\\"<kid>\\",algorithm=\\"rsa-sha256\\",headers=\\"(request-target) date\\",signature=\\"<base64sig>\\"" \\
  -H "Date: $(date -u '+%a, %d %b %Y %H:%M:%S GMT')"`.trim();

// ─── Component ────────────────────────────────────────────────────────────────

interface CimdSetupSectionProps {
  app: AppInfo;
  onUpdated: () => void;
}

export function CimdSetupSection({ app, onUpdated }: CimdSetupSectionProps) {
  const isConfigured = Boolean(app.cimd_url);

  const [showSetup, setShowSetup] = useState(false);
  const [cimdUrlInput, setCimdUrlInput] = useState(app.cimd_url ?? '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);

  const validateHttps = (url: string) => url.startsWith('https://');

  const handleSave = async () => {
    setSaveError('');

    if (!validateHttps(cimdUrlInput)) {
      setSaveError('CIMD URL must start with https://');
      return;
    }

    setSaving(true);
    try {
      // ⚠️ BLOCKER: PUT /api/v1/apps/:appId not yet confirmed by Wash.
      // Optimistically calling; update if endpoint path differs.
      await api.put(`/api/v1/apps/${app.app_id}`, { cimdUrl: cimdUrlInput });
      setShowSetup(false);
      onUpdated();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save CIMD URL');
    } finally {
      setSaving(false);
    }
  };

  // ─── Configured state ─────────────────────────────────────────────────────

  if (isConfigured && !showSetup) {
    return (
      <Box mt={3} pt={3} borderTopWidth="1px" borderColor="border.subtle">
        <Flex justify="space-between" align="center" mb={2}>
          <HStack gap={2}>
            <Text fontSize="xs" fontWeight="bold" color="fg.muted">CIMD</Text>
            <Badge colorPalette="green" size="sm">Saved</Badge>
          </HStack>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => {
              setCimdUrlInput(app.cimd_url ?? '');
              setSaveError('');
              setShowSetup(true);
            }}
          >
            Reconfigure
          </Button>
        </Flex>
        <CopyableCode value={app.cimd_url!} label="CIMD URL" />
      </Box>
    );
  }

  // ─── Not configured (collapsed) ──────────────────────────────────────────

  if (!showSetup) {
    return (
      <Box mt={3} pt={3} borderTopWidth="1px" borderColor="border.subtle">
        <Flex justify="space-between" align="center">
          <HStack gap={2}>
            <Text fontSize="xs" fontWeight="bold" color="fg.muted">CIMD</Text>
            <Badge colorPalette="gray" size="sm">Not configured</Badge>
          </HStack>
          <Button
            size="xs"
            variant="outline"
            onClick={() => setShowSetup(true)}
          >
            Set up CIMD
          </Button>
        </Flex>
      </Box>
    );
  }

  // ─── Inline setup panel ───────────────────────────────────────────────────

  return (
    <Box mt={3} pt={3} borderTopWidth="1px" borderColor="border.subtle">
      <Flex justify="space-between" align="center" mb={3}>
        <HStack gap={2}>
          <Text fontSize="xs" fontWeight="bold" color="fg.muted">CIMD</Text>
          <Badge colorPalette={isConfigured ? 'green' : 'gray'} size="sm">
            {isConfigured ? 'Saved' : 'Not configured'}
          </Badge>
        </HStack>
        <Button size="xs" variant="ghost" onClick={() => setShowSetup(false)}>
          ✕ Close
        </Button>
      </Flex>

      <Box
        bg="bg.subtle"
        borderWidth="1px"
        borderColor="border"
        borderRadius="md"
        p={4}
      >
        <VStack gap={5} align="stretch">

          {/* Step 1: Generate keypair */}
          <Box>
            <Text fontSize="sm" fontWeight="semibold" mb={1}>
              1. Generate a signing keypair
            </Text>
            <Text fontSize="xs" color="fg.muted" mb={2}>
              Run these commands on your server. Keep <code>cimd_private.pem</code> secret — never commit it.
              {/* Simon's Section B content absent — stubbed. See kaylee-phase2-cimd.md */}
            </Text>
            <CopyableCode value={SNIPPET_KEYGEN} label="Keygen commands" />
          </Box>

          <Separator />

          {/* Step 2: Host JWKS */}
          <Box>
            <Text fontSize="sm" fontWeight="semibold" mb={1}>
              2. Host your CIMD document
            </Text>
            <Text fontSize="xs" color="fg.muted" mb={2}>
              Publish your public key as a JWKS file at a stable HTTPS URL on your app's domain
              (e.g. <code>https://myapp.example.com/.well-known/jwks.json</code>).
            </Text>
            <CopyableCode value={SNIPPET_JWKS} label="JWKS document" />
          </Box>

          <Separator />

          {/* Step 3: Save CIMD URL */}
          <Box>
            <Text fontSize="sm" fontWeight="semibold" mb={1}>
              3. Save your CIMD URL
            </Text>
            <Text fontSize="xs" color="fg.muted" mb={2}>
              Enter the HTTPS URL where you're hosting your JWKS document.
              It must share a domain with your registered app domain ({app.domain}).
            </Text>
            <HStack gap={2}>
              <Input
                value={cimdUrlInput}
                onChange={(e) => {
                  setCimdUrlInput(e.target.value);
                  setSaveError('');
                }}
                placeholder={`https://${app.domain}/.well-known/jwks.json`}
                size="sm"
                disabled={saving}
                type="url"
              />
              <Button
                size="sm"
                colorPalette="teal"
                variant="solid"
                onClick={handleSave}
                disabled={saving || !cimdUrlInput.trim()}
                flexShrink={0}
              >
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </HStack>
            {saveError && (
              <Text color="fg.error" fontSize="xs" mt={1}>{saveError}</Text>
            )}
          </Box>

          <Separator />

          {/* Step 4: Test */}
          <Box>
            <Text fontSize="sm" fontWeight="semibold" mb={1}>
              4. Test your setup
            </Text>
            <Text fontSize="xs" color="fg.muted" mb={2}>
              Once your CIMD URL is saved, send a test signed request:
            </Text>
            <CopyableCode value={SNIPPET_TEST(app.app_id)} label="Test curl command" />
          </Box>

          <Separator />

          {/* Step 5: Troubleshooting (collapsible) */}
          <Box>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => setShowTroubleshooting((v) => !v)}
              px={0}
            >
              <Flex align="center" gap={1}>
                {showTroubleshooting ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />}
                <Text fontSize="sm" fontWeight="semibold">Troubleshooting</Text>
              </Flex>
            </Button>

            {showTroubleshooting && (
              <Box mt={2} pl={2}>
                <VStack gap={2} align="stretch">
                  <Text fontSize="xs" color="fg.muted">
                    <strong>401 Unauthorized:</strong> Check that your <code>kid</code> in the Signature header matches the <code>kid</code> in your JWKS document.
                  </Text>
                  <Text fontSize="xs" color="fg.muted">
                    <strong>CIMD URL domain mismatch:</strong> The CIMD URL domain must match or be a subdomain of your registered app domain (<code>{app.domain}</code>).
                  </Text>
                  <Text fontSize="xs" color="fg.muted">
                    <strong>Signature verification failed:</strong> Ensure you're signing the exact string <code>(request-target) date</code> using RS256 (RSA-SHA256).
                  </Text>
                  <Text fontSize="xs" color="fg.muted">
                    <strong>JWKS not reachable:</strong> Confirm your CIMD URL is publicly accessible over HTTPS and returns a valid JSON response.
                  </Text>
                </VStack>
              </Box>
            )}
          </Box>

        </VStack>
      </Box>
    </Box>
  );
}

import { describe, it, expect } from 'vitest';
import { communityShareUrl } from '../utils/share';

describe('communityShareUrl', () => {
  it('builds the API share URL with an encoded DID', () => {
    // API_BASE is '' in tests, so the URL falls back to window.location.origin (jsdom).
    expect(communityShareUrl('did:plc:abc123')).toBe(
      `${window.location.origin}/communities/did%3Aplc%3Aabc123/share`,
    );
  });
});

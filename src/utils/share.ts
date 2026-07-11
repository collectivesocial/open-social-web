import { API_BASE } from './api';

/**
 * The URL copied by the community Share button. Points at the API's share
 * endpoint, which serves OG meta tags (dynamic preview card) to crawlers
 * and instantly redirects humans to the community page with ?action=join.
 * Falls back to the current origin in dev, where the Vite proxy forwards
 * /communities requests to the local API.
 */
export function communityShareUrl(did: string): string {
  const base = API_BASE || window.location.origin;
  return `${base}/communities/${encodeURIComponent(did)}/share`;
}

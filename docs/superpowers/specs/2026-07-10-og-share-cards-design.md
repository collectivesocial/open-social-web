# Open Graph Share Cards for Communities — Design

**Date:** 2026-07-10
**Status:** Approved pending user review
**Repos involved:** `open-social` (API, primary), `open-social-web` (frontend, minor changes)

## Problem

Sharing a community link (e.g. `https://app.opensocial.community/communities/did%3Aplc%3A...`)
produces no rich preview. The web app is a client-side React SPA on GitHub Pages, so
link-preview crawlers (Slack, Discord, iMessage, Bluesky, X) — which never execute
JavaScript — see the same static `index.html` for every route. Dynamic per-community
OG tags cannot be served from GitHub Pages.

## Decision summary

- **Backend-only solution.** No Cloudflare Worker, no hosting change (user decision).
  The share URL moves to the API domain; raw app URLs fall back to a static generic card.
- **Card content is minimal:** community avatar + "Join {name} on Open Social" + branding.
  No member count, no description.
- **Rendering stack:** satori + `@resvg/resvg-js` in the `open-social` API.
- **Visual direction:** "Warm cream" — light warm-gray gradient background
  (`#FAF8F6 → #F3EFE9`), avatar in a circle with a terracotta ring (`#C2703E`),
  terracotta accent bar along the bottom edge, small uppercase "OPEN SOCIAL" label in
  terracotta, community name headline in Vollkorn serif (`#2A2420`), "on Open Social"
  subline in muted warm gray (`#7A6F62`). Chosen to read well embedded in both light-
  and dark-mode chat clients.

## Architecture

### New API endpoints (`open-social` repo, public/unauthenticated)

1. **`GET /communities/:did/og-image`** → 1200×630 PNG
   - Look up community (display name + avatar URL, same source as the existing
     community details endpoint).
   - Fetch avatar bytes server-side (~3s timeout), embed as data URI.
   - Render with satori (flexbox layout) → SVG → `@resvg/resvg-js` → PNG.
   - Response headers: `Content-Type: image/png`, `Cache-Control: public, max-age=3600`.

2. **`GET /communities/:did/share`** → small HTML page (the URL people paste)
   - Meta tags: `og:title` = `Join {name} on Open Social`, `og:description` = the
     community's description if set, else `Join this community on Open Social.`,
     `og:image` = absolute URL of endpoint 1, `og:url`,
     `twitter:card` = `summary_large_image`. (The description appears only in the
     unfurl text, not on the card image — the card itself stays minimal.)
   - Human redirect: `<meta http-equiv="refresh" content="0; url=...">` plus a JS
     fallback and a plain link, targeting
     `https://app.opensocial.community/communities/{did}?action=join`
     (preserves the existing join-CTA flow). Crawlers read the tags and do not follow
     the refresh; no user-agent sniffing.
   - `Cache-Control: public, max-age=300`.

### Frontend changes (`open-social-web` repo)

- `handleShare` in `src/pages/CommunityPage.tsx` copies
  `{API_BASE}/communities/{did}/share` instead of the app URL. The `?action=join`
  behavior is preserved via the share page's redirect target.
- `index.html` gains static default OG tags + a generic branded card image in
  `public/`, so raw app URLs pasted anywhere show a branded fallback.

## Implementation details

- New module `src/services/ogImage.ts` and route registration following the existing
  router patterns in `src/routes/` and `src/index.ts` (either a small `og.ts` router
  or additions to `communities.ts` — whichever matches existing registration
  conventions when implementing).
- **Fonts:** bundle Vollkorn regular + bold TTFs (sourced from `@fontsource/vollkorn`)
  as static assets, loaded once at startup. Satori requires real font files.
- **Long names:** headline font size steps down for names over ~20 characters; satori
  line clamping caps the headline at 2 lines with an ellipsis.
- **Dependencies added to `open-social`:** `satori`, `@resvg/resvg-js` (both ship
  prebuilt binaries; no system deps; Docker-compatible).

## Error handling

- Unknown community DID → `404` on both endpoints.
- Avatar missing, fetch failure, or timeout → render the card with a terracotta
  monogram circle (first letter of the community name) instead of failing.
- Satori/render failure → `500`, error logged. The share page still functions; a
  broken `og:image` merely downgrades the preview to text-only.

## Testing

- **API (vitest, following `src/routes/communities.test.ts` patterns):**
  - Share page returns correct OG tags and redirect URL for a known community.
  - Image endpoint returns valid PNG (magic bytes + 1200×630) for a community with
    an avatar and for one without (monogram fallback path).
  - Both endpoints return `404` for an unknown DID.
  - Cache-Control headers present.
- **Web:** update share-button test expectations to the new copied URL (add a test
  if none exists).

## Out of scope (YAGNI)

- OG cards for events, content, or user profiles (can reuse the same service later).
- Member count / description on the card.
- Edge caching beyond standard `Cache-Control`.
- Making raw `app.opensocial.community` URLs unfurl dynamically (requires an edge
  layer; explicitly deferred).

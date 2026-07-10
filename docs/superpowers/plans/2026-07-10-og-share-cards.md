# Community OG Share Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dynamic Open Graph share cards ("Join {name} on Open Social" + community avatar) for community links, served by the API; the web app's Share button copies the API share URL.

**Architecture:** Two new public GET endpoints in the `open-social` API — `/communities/:did/share` (HTML with OG meta tags + instant redirect to the app) and `/communities/:did/og-image` (1200×630 PNG rendered with satori → resvg). The web app copies the share URL and gains static fallback OG tags. Spec: `docs/superpowers/specs/2026-07-10-og-share-cards-design.md` (open-social-web repo).

**Tech Stack:** Express + Kysely (existing), satori (layout → SVG), @resvg/resvg-js (SVG → PNG), @fontsource/vollkorn + @fontsource/inter (fonts), vitest + supertest.

## Global Constraints

- **Two repos.** API tasks run in `/Users/brittany/Documents/code/collective/open-social` ("API repo"). Web tasks run in `/Users/brittany/Documents/code/collective/open-social-web` ("web repo"). Every step says which repo it's in; `cd` there first.
- **PNG is exactly 1200×630.**
- **Colors (verbatim):** background gradient `#FAF8F6 → #F3EFE9` at 135deg; terracotta accent `#C2703E`; headline text `#2A2420`; subline text `#7A6F62`; monogram circle fill `#F9E1D0`.
- **Copy (verbatim):** label `OPEN SOCIAL`; headline `Join {displayName}`; subline `on Open Social`; og:title `Join {displayName} on Open Social`; og:description fallback `Join this community on Open Social.`
- **Cache headers:** PNG `public, max-age=3600`; share HTML `public, max-age=300`.
- **New API deps go in `dependencies` (NOT devDependencies)** — the production Docker stage runs `npm ci --omit=dev`: `satori`, `@resvg/resvg-js`, `@fontsource/vollkorn`, `@fontsource/inter`.
- API repo TypeScript is CommonJS (`"module": "commonjs"`, `esModuleInterop: true`). `import satori from "satori"` resolves to satori's CJS build — do not add `.js` extensions or ESM config.
- Both endpoints are public (no session, no API key) — they exist for link-preview crawlers.
- All user-controlled strings interpolated into share-page HTML MUST go through `escapeHtml` (community names can contain `"`, `<`, `&`).
- Run tests with `npm test -- <file>` (vitest) in either repo. API repo unit tests here must NOT require `DATABASE_URL` — all DB access is stubbed.

---

### Task 1: Avatar fetcher (`ogAvatar`) — API repo

Fetches an avatar URL server-side and returns it as a data URI satori can embed. satori/resvg decode JPEG/PNG/GIF but **not WebP**; `cdn.bsky.app` serves WebP by default but transcodes when the path ends in `@jpeg` (verified live).

**Files:**
- Create: `src/lib/ogAvatar.ts`
- Test: `src/lib/ogAvatar.test.ts`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces:
  - `preferJpegCdnUrl(url: string): string`
  - `fetchAvatarAsDataUri(url: string, timeoutMs?: number): Promise<string | undefined>` (default timeout 3000ms; `undefined` on any failure — callers fall back to a monogram)

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/ogAvatar.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { preferJpegCdnUrl, fetchAvatarAsDataUri } from "./ogAvatar";

const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const WEBP_BYTES = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);

function mockFetchOk(bytes: Uint8Array) {
  return vi.fn(async () => ({
    ok: true,
    arrayBuffer: async () => bytes.buffer,
  })) as unknown as typeof fetch;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("preferJpegCdnUrl", () => {
  it("appends @jpeg to bare cdn.bsky.app image URLs", () => {
    expect(
      preferJpegCdnUrl("https://cdn.bsky.app/img/avatar/plain/did:plc:x/bafyabc"),
    ).toBe("https://cdn.bsky.app/img/avatar/plain/did:plc:x/bafyabc@jpeg");
  });

  it("leaves cdn URLs that already have a format suffix alone", () => {
    const url = "https://cdn.bsky.app/img/avatar/plain/did:plc:x/bafyabc@jpeg";
    expect(preferJpegCdnUrl(url)).toBe(url);
  });

  it("leaves non-CDN URLs alone", () => {
    const url = "https://pds.example.com/xrpc/com.atproto.sync.getBlob?did=x&cid=y";
    expect(preferJpegCdnUrl(url)).toBe(url);
  });

  it("returns invalid URLs unchanged", () => {
    expect(preferJpegCdnUrl("not a url")).toBe("not a url");
  });
});

describe("fetchAvatarAsDataUri", () => {
  it("returns a jpeg data URI for jpeg bytes", async () => {
    vi.stubGlobal("fetch", mockFetchOk(JPEG_BYTES));
    const uri = await fetchAvatarAsDataUri("https://example.com/a.jpg");
    expect(uri).toMatch(/^data:image\/jpeg;base64,/);
    expect(uri).toContain(Buffer.from(JPEG_BYTES).toString("base64"));
  });

  it("returns a png data URI for png bytes", async () => {
    vi.stubGlobal("fetch", mockFetchOk(PNG_BYTES));
    const uri = await fetchAvatarAsDataUri("https://example.com/a.png");
    expect(uri).toMatch(/^data:image\/png;base64,/);
  });

  it("returns undefined for webp bytes (satori cannot decode them)", async () => {
    vi.stubGlobal("fetch", mockFetchOk(WEBP_BYTES));
    expect(await fetchAvatarAsDataUri("https://example.com/a.webp")).toBeUndefined();
  });

  it("returns undefined on non-ok responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, arrayBuffer: async () => new ArrayBuffer(0) })),
    );
    expect(await fetchAvatarAsDataUri("https://example.com/404.jpg")).toBeUndefined();
  });

  it("returns undefined when fetch throws (network error / abort)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("aborted");
      }),
    );
    expect(await fetchAvatarAsDataUri("https://example.com/slow.jpg")).toBeUndefined();
  });

  it("requests the @jpeg variant of bare cdn.bsky.app URLs", async () => {
    const fetchMock = mockFetchOk(JPEG_BYTES);
    vi.stubGlobal("fetch", fetchMock);
    await fetchAvatarAsDataUri("https://cdn.bsky.app/img/avatar/plain/did:plc:x/bafyabc");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://cdn.bsky.app/img/avatar/plain/did:plc:x/bafyabc@jpeg",
      expect.anything(),
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run (API repo): `npm test -- src/lib/ogAvatar.test.ts`
Expected: FAIL — `Cannot find module './ogAvatar'` (or similar).

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/ogAvatar.ts
import { logger } from "./logger";

/**
 * cdn.bsky.app serves WebP by default, which satori/resvg cannot decode.
 * Appending "@jpeg" to the image path asks the CDN to transcode to JPEG.
 */
export function preferJpegCdnUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname === "cdn.bsky.app" && !/@(jpeg|png)$/.test(u.pathname)) {
      return `${u.origin}${u.pathname}@jpeg${u.search}`;
    }
  } catch {
    // Not a parseable URL — return as-is and let fetch fail downstream.
  }
  return url;
}

function sniffImageMime(buf: Buffer): string | undefined {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return "image/png";
  }
  if (buf.length >= 4 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) {
    return "image/gif";
  }
  return undefined; // WebP or anything else satori can't embed
}

/**
 * Fetch an avatar and return it as a data URI for embedding in a satori
 * layout. Returns undefined on any failure (timeout, non-image, WebP, …)
 * so callers can fall back to a monogram card.
 */
export async function fetchAvatarAsDataUri(
  url: string,
  timeoutMs = 3000,
): Promise<string | undefined> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(preferJpegCdnUrl(url), { signal: controller.signal });
    if (!res.ok) return undefined;
    const buf = Buffer.from(await res.arrayBuffer());
    const mime = sniffImageMime(buf);
    if (!mime) {
      logger.warn({ url }, "Avatar is not a satori-embeddable image type");
      return undefined;
    }
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch (err) {
    logger.warn({ error: err, url }, "Failed to fetch avatar for OG card");
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run (API repo): `npm test -- src/lib/ogAvatar.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ogAvatar.ts src/lib/ogAvatar.test.ts
git commit -m "feat: add OG avatar fetcher with WebP-safe CDN handling"
```

---

### Task 2: Card renderer (`ogImage`) — API repo

Renders the approved "warm cream" card with satori (object trees, no JSX) and rasterizes with resvg. Fonts load from `@fontsource` packages at runtime via `require.resolve` — they live in `node_modules`, which the production Docker image has, so no Dockerfile changes.

**Files:**
- Modify: `package.json` (add dependencies)
- Create: `src/services/ogImage.ts`
- Test: `src/services/ogImage.test.ts`

**Interfaces:**
- Consumes: nothing from other tasks (avatar arrives as an already-fetched data URI string).
- Produces:
  - `renderCommunityCard(opts: { displayName: string; avatarDataUri?: string }): Promise<Buffer>` — 1200×630 PNG
  - `renderDefaultCard(): Promise<Buffer>` — generic fallback card (used by Task 5's script)

- [ ] **Step 1: Install dependencies**

Run (API repo):
```bash
npm install satori @resvg/resvg-js @fontsource/vollkorn @fontsource/inter
```
Expected: all four appear under `"dependencies"` in `package.json`.

- [ ] **Step 2: Write the failing tests**

```typescript
// src/services/ogImage.test.ts
import { describe, it, expect } from "vitest";
import { renderCommunityCard, renderDefaultCard } from "./ogImage";

// A minimal valid 1x1 white JPEG for the avatar-embedding path.
const TINY_JPEG_DATA_URI =
  "data:image/jpeg;base64," +
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iiigD//2Q==";

function pngDimensions(buf: Buffer): { width: number; height: number } {
  // PNG signature is 8 bytes; IHDR width/height are big-endian at 16/20.
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function expectValidCardPng(buf: Buffer) {
  expect(buf.subarray(0, 8)).toEqual(
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  );
  expect(pngDimensions(buf)).toEqual({ width: 1200, height: 630 });
}

describe("renderCommunityCard", () => {
  it("renders a 1200x630 PNG with an avatar", async () => {
    const buf = await renderCommunityCard({
      displayName: "ATProtocol Developers",
      avatarDataUri: TINY_JPEG_DATA_URI,
    });
    expectValidCardPng(buf);
  });

  it("renders a 1200x630 PNG without an avatar (monogram fallback)", async () => {
    const buf = await renderCommunityCard({ displayName: "ATProtocol Developers" });
    expectValidCardPng(buf);
  });

  it("handles very long community names without throwing", async () => {
    const buf = await renderCommunityCard({
      displayName:
        "The Extremely Long-Winded Society of People Who Never Abbreviate Anything At All Ever",
    });
    expectValidCardPng(buf);
  });

  it("handles names with characters satori must escape", async () => {
    const buf = await renderCommunityCard({ displayName: 'Rock & <Roll> "Club"' });
    expectValidCardPng(buf);
  });
});

describe("renderDefaultCard", () => {
  it("renders the generic 1200x630 fallback card", async () => {
    const buf = await renderDefaultCard();
    expectValidCardPng(buf);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run (API repo): `npm test -- src/services/ogImage.test.ts`
Expected: FAIL — `Cannot find module './ogImage'`.

- [ ] **Step 4: Write the implementation**

```typescript
// src/services/ogImage.ts
import { readFileSync } from "fs";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

const WIDTH = 1200;
const HEIGHT = 630;

// Approved "warm cream" palette (spec: 2026-07-10-og-share-cards-design.md)
const BG_GRADIENT = "linear-gradient(135deg, #FAF8F6 0%, #F3EFE9 100%)";
const TERRACOTTA = "#C2703E";
const HEADLINE_COLOR = "#2A2420";
const SUBLINE_COLOR = "#7A6F62";
const MONOGRAM_BG = "#F9E1D0";

type SatoriFont = {
  name: string;
  data: Buffer;
  weight: 400 | 700;
  style: "normal";
};

let fonts: SatoriFont[] | null = null;

/** Fonts ship in @fontsource packages (woff — satori-compatible); loaded once. */
function loadFonts(): SatoriFont[] {
  if (!fonts) {
    fonts = [
      {
        name: "Vollkorn",
        data: readFileSync(
          require.resolve("@fontsource/vollkorn/files/vollkorn-latin-700-normal.woff"),
        ),
        weight: 700,
        style: "normal",
      },
      {
        name: "Inter",
        data: readFileSync(
          require.resolve("@fontsource/inter/files/inter-latin-400-normal.woff"),
        ),
        weight: 400,
        style: "normal",
      },
      {
        name: "Inter",
        data: readFileSync(
          require.resolve("@fontsource/inter/files/inter-latin-700-normal.woff"),
        ),
        weight: 700,
        style: "normal",
      },
    ];
  }
  return fonts;
}

// Satori element helper — plain object trees, no JSX.
function el(type: string, style: Record<string, unknown>, children?: unknown) {
  return { type, props: { style, ...(children !== undefined ? { children } : {}) } };
}

function headlineFontSize(name: string): number {
  if (name.length <= 20) return 68;
  if (name.length <= 40) return 56;
  return 48;
}

function avatarNode(avatarDataUri: string | undefined, displayName: string) {
  const ring = `10px solid ${TERRACOTTA}`;
  if (avatarDataUri) {
    return {
      type: "img",
      props: {
        src: avatarDataUri,
        width: 300,
        height: 300,
        style: {
          width: 300,
          height: 300,
          borderRadius: 150,
          border: ring,
          objectFit: "cover",
          flexShrink: 0,
        },
      },
    };
  }
  // Monogram fallback: first letter in a terracotta-ringed circle.
  const letter = (displayName.trim()[0] || "?").toUpperCase();
  return el(
    "div",
    {
      width: 300,
      height: 300,
      borderRadius: 150,
      border: ring,
      backgroundColor: MONOGRAM_BG,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "Vollkorn",
      fontWeight: 700,
      fontSize: 140,
      color: TERRACOTTA,
      flexShrink: 0,
    },
    letter,
  );
}

async function renderCard(opts: {
  headline: string;
  headlineFontSize: number;
  subline: string;
  avatar: unknown;
}): Promise<Buffer> {
  const tree = el(
    "div",
    {
      width: WIDTH,
      height: HEIGHT,
      display: "flex",
      alignItems: "center",
      gap: 72,
      padding: "0 96px",
      backgroundImage: BG_GRADIENT,
      position: "relative",
    },
    [
      opts.avatar,
      el("div", { display: "flex", flexDirection: "column", flexGrow: 1 }, [
        el(
          "div",
          {
            fontFamily: "Inter",
            fontWeight: 700,
            fontSize: 26,
            letterSpacing: "0.18em",
            color: TERRACOTTA,
            marginBottom: 20,
          },
          "OPEN SOCIAL",
        ),
        el(
          "div",
          {
            fontFamily: "Vollkorn",
            fontWeight: 700,
            fontSize: opts.headlineFontSize,
            color: HEADLINE_COLOR,
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
            lineClamp: 2,
          },
          opts.headline,
        ),
        el(
          "div",
          {
            fontFamily: "Inter",
            fontWeight: 400,
            fontSize: 38,
            color: SUBLINE_COLOR,
            marginTop: 20,
          },
          opts.subline,
        ),
      ]),
      // Terracotta accent bar along the bottom edge.
      el("div", {
        position: "absolute",
        left: 0,
        bottom: 0,
        width: WIDTH,
        height: 16,
        backgroundColor: TERRACOTTA,
      }),
    ],
  );

  const svg = await satori(tree as any, {
    width: WIDTH,
    height: HEIGHT,
    fonts: loadFonts(),
  });
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: WIDTH } });
  return resvg.render().asPng();
}

/** The per-community share card: avatar + "Join {name}" + "on Open Social". */
export async function renderCommunityCard(opts: {
  displayName: string;
  avatarDataUri?: string;
}): Promise<Buffer> {
  return renderCard({
    headline: `Join ${opts.displayName}`,
    headlineFontSize: headlineFontSize(opts.displayName),
    subline: "on Open Social",
    avatar: avatarNode(opts.avatarDataUri, opts.displayName),
  });
}

/** Generic fallback card for the web app's static og:image tag. */
export async function renderDefaultCard(): Promise<Buffer> {
  return renderCard({
    headline: "Open Social",
    headlineFontSize: 68,
    subline: "Communities for the open social web",
    avatar: avatarNode(undefined, "Open Social"),
  });
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run (API repo): `npm test -- src/services/ogImage.test.ts`
Expected: PASS (5 tests). If TypeScript can't find satori's types, create `src/types/satori.d.ts` containing `declare module "satori";` — but try without it first (satori ships `./dist/index.d.ts`).

- [ ] **Step 6: Eyeball the output (one-off)**

Run (API repo):
```bash
npx tsx -e "import('./src/services/ogImage').then(async m => require('fs').writeFileSync('/tmp/og-card-test.png', await m.renderCommunityCard({ displayName: 'ATProtocol Developers' })))" && open /tmp/og-card-test.png
```
Expected: the warm-cream card with a terracotta "A" monogram, "Join ATProtocol Developers" headline, bottom accent bar. Fix layout issues now if it looks wrong.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/services/ogImage.ts src/services/ogImage.test.ts
git commit -m "feat: render community OG card PNGs with satori + resvg"
```

---

### Task 3: Community card data lookup (`ogCard`) — API repo

Light community lookup for OG purposes — DB row for name/handle/PDS host, then the community profile record via a public PDS agent (no app-password agent needed), mirroring the fallback path already used in `src/routes/auth.ts:1088-1129`.

**Files:**
- Create: `src/services/ogCard.ts`
- Test: `src/services/ogCard.test.ts`

**Interfaces:**
- Consumes: `resolvePdsEndpoint(did, pdsHost)` from `src/services/atproto.ts`; `blobToUrl(blob, did, pdsHost)`, `fetchBlueskyAvatar(did)` from `src/lib/avatar.ts`; `BskyAgent` from `@atproto/api`.
- Produces:
  - `interface CommunityCardData { displayName: string; description?: string; avatarUrl?: string }`
  - `getCommunityCardData(db: Kysely<Database>, did: string): Promise<CommunityCardData | null>` (`null` = community not found)

- [ ] **Step 1: Write the failing tests**

```typescript
// src/services/ogCard.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCommunityCardData } from "./ogCard";

const DID = "did:plc:testcommunity000000001";

const { getRecordMock } = vi.hoisted(() => ({ getRecordMock: vi.fn() }));

vi.mock("@atproto/api", () => ({
  BskyAgent: class {
    api = { com: { atproto: { repo: { getRecord: getRecordMock } } } };
  },
}));

vi.mock("./atproto", () => ({
  resolvePdsEndpoint: vi.fn(async () => "https://pds.example.com"),
}));

vi.mock("../lib/avatar", () => ({
  blobToUrl: vi.fn(() => undefined),
  fetchBlueskyAvatar: vi.fn(async () => undefined),
}));

import { blobToUrl, fetchBlueskyAvatar } from "../lib/avatar";

// Minimal chainable stand-in for the Kysely communities lookup.
function stubDb(row: Record<string, unknown> | undefined) {
  return {
    selectFrom: () => ({
      select: () => ({
        where: () => ({ executeTakeFirst: async () => row }),
      }),
    }),
  } as any;
}

const ROW = {
  did: DID,
  handle: "test-community.bsky.social",
  display_name: "Test Community",
  pds_host: "https://pds.example.com",
};

beforeEach(() => {
  vi.clearAllMocks();
  getRecordMock.mockRejectedValue(new Error("RecordNotFound"));
});

describe("getCommunityCardData", () => {
  it("returns null when the community does not exist", async () => {
    expect(await getCommunityCardData(stubDb(undefined), DID)).toBeNull();
  });

  it("falls back to the DB display_name when there is no profile record", async () => {
    const data = await getCommunityCardData(stubDb(ROW), DID);
    expect(data).toEqual({ displayName: "Test Community", description: undefined, avatarUrl: undefined });
  });

  it("prefers the profile record displayName, description, and avatar", async () => {
    getRecordMock.mockResolvedValue({
      data: {
        value: {
          displayName: "Profile Name",
          description: "A great community.",
          avatar: { $type: "blob", ref: { $link: "bafyavatar" }, mimeType: "image/jpeg" },
        },
      },
    });
    vi.mocked(blobToUrl).mockReturnValue("https://pds.example.com/blob/bafyavatar");

    const data = await getCommunityCardData(stubDb(ROW), DID);
    expect(data).toEqual({
      displayName: "Profile Name",
      description: "A great community.",
      avatarUrl: "https://pds.example.com/blob/bafyavatar",
    });
  });

  it("falls back to the Bluesky avatar when the profile has none", async () => {
    vi.mocked(fetchBlueskyAvatar).mockResolvedValue("https://cdn.bsky.app/img/a@jpeg");
    const data = await getCommunityCardData(stubDb(ROW), DID);
    expect(data?.avatarUrl).toBe("https://cdn.bsky.app/img/a@jpeg");
  });

  it("uses the handle when display_name is empty", async () => {
    const data = await getCommunityCardData(stubDb({ ...ROW, display_name: "" }), DID);
    expect(data?.displayName).toBe("test-community.bsky.social");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run (API repo): `npm test -- src/services/ogCard.test.ts`
Expected: FAIL — `Cannot find module './ogCard'`.

- [ ] **Step 3: Write the implementation**

```typescript
// src/services/ogCard.ts
import { BskyAgent } from "@atproto/api";
import type { Kysely } from "kysely";
import type { Database } from "../db";
import { resolvePdsEndpoint } from "./atproto";
import { blobToUrl, fetchBlueskyAvatar } from "../lib/avatar";
import { logger } from "../lib/logger";

export interface CommunityCardData {
  displayName: string;
  description?: string;
  avatarUrl?: string;
}

interface ProfileRecordValue {
  displayName?: string;
  description?: string;
  avatar?: unknown;
}

/**
 * Minimal community lookup for OG share cards. Reads the DB row plus the
 * public community profile record (no app-password agent — crawler traffic
 * must never depend on community credentials). Returns null when the
 * community doesn't exist.
 */
export async function getCommunityCardData(
  db: Kysely<Database>,
  did: string,
): Promise<CommunityCardData | null> {
  const community = await db
    .selectFrom("communities")
    .select(["did", "handle", "display_name", "pds_host"])
    .where("did", "=", did)
    .executeTakeFirst();

  if (!community) return null;

  let displayName = community.display_name || community.handle;
  let description: string | undefined;
  let avatarUrl: string | undefined;

  try {
    const pdsUrl = await resolvePdsEndpoint(did, community.pds_host);
    const agent = new BskyAgent({ service: pdsUrl });
    const record = await agent.api.com.atproto.repo.getRecord({
      repo: did,
      collection: "community.opensocial.profile",
      rkey: "self",
    });
    const profile = record.data.value as ProfileRecordValue;
    if (profile.displayName) displayName = profile.displayName;
    if (profile.description) description = profile.description;
    avatarUrl = blobToUrl(profile.avatar, did, community.pds_host);
  } catch (err) {
    // Profile record missing or PDS unreachable — card still renders.
    logger.debug({ error: err, did }, "No community profile record for OG card");
  }

  if (!avatarUrl) {
    avatarUrl = await fetchBlueskyAvatar(did);
  }

  return { displayName, description, avatarUrl };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run (API repo): `npm test -- src/services/ogCard.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/services/ogCard.ts src/services/ogCard.test.ts
git commit -m "feat: add community card data lookup for OG endpoints"
```

---

### Task 4: OG routes + mounting — API repo

The two public endpoints, with an in-memory PNG cache (rendering is CPU-bound and crawlers re-fetch). Mounted at root like the other web-facing routes (`createAuthRouter` owns `/communities/:did`; these paths don't collide).

**Files:**
- Create: `src/routes/og.ts`
- Modify: `src/index.ts` (import + mount after `createAuthRouter`, around line 107)
- Test: `src/routes/og.test.ts`

**Interfaces:**
- Consumes: `getCommunityCardData` (Task 3), `renderCommunityCard` (Task 2), `fetchAvatarAsDataUri` (Task 1), `config.serviceUrl` / `config.corsOrigin` from `src/config.ts`.
- Produces: `createOgRouter(db: Kysely<Database>): Router` with `GET /communities/:did/og-image` and `GET /communities/:did/share`; exports `escapeHtml(s: string): string` for testing.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/routes/og.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import supertest from "supertest";
import express from "express";
import { createOgRouter, escapeHtml } from "./og";

vi.mock("../services/ogCard", () => ({ getCommunityCardData: vi.fn() }));
vi.mock("../services/ogImage", () => ({ renderCommunityCard: vi.fn() }));
vi.mock("../lib/ogAvatar", () => ({ fetchAvatarAsDataUri: vi.fn(async () => undefined) }));

import { getCommunityCardData } from "../services/ogCard";
import { renderCommunityCard } from "../services/ogImage";
import { fetchAvatarAsDataUri } from "../lib/ogAvatar";

const FAKE_PNG = Buffer.from("fake-png-bytes");

function buildApp() {
  const app = express();
  app.use(createOgRouter({} as any));
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(renderCommunityCard).mockResolvedValue(FAKE_PNG);
});

describe("escapeHtml", () => {
  it("escapes HTML metacharacters", () => {
    expect(escapeHtml(`Rock & <Roll> "Club" 'n stuff`)).toBe(
      "Rock &amp; &lt;Roll&gt; &quot;Club&quot; &#39;n stuff",
    );
  });
});

describe("GET /communities/:did/og-image", () => {
  it("returns the rendered PNG with cache headers", async () => {
    // Unique DID per test — the route keeps a module-level PNG cache.
    const did = "did:plc:png0000000000000000001";
    vi.mocked(getCommunityCardData).mockResolvedValue({ displayName: "Test" });

    const res = await supertest(buildApp()).get(`/communities/${encodeURIComponent(did)}/og-image`);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("image/png");
    expect(res.headers["cache-control"]).toBe("public, max-age=3600");
    expect(res.body).toEqual(FAKE_PNG);
  });

  it("passes the fetched avatar data URI to the renderer", async () => {
    const did = "did:plc:png0000000000000000002";
    vi.mocked(getCommunityCardData).mockResolvedValue({
      displayName: "Test",
      avatarUrl: "https://cdn.bsky.app/img/a",
    });
    vi.mocked(fetchAvatarAsDataUri).mockResolvedValue("data:image/jpeg;base64,xyz");

    await supertest(buildApp()).get(`/communities/${encodeURIComponent(did)}/og-image`);

    expect(fetchAvatarAsDataUri).toHaveBeenCalledWith("https://cdn.bsky.app/img/a");
    expect(renderCommunityCard).toHaveBeenCalledWith({
      displayName: "Test",
      avatarDataUri: "data:image/jpeg;base64,xyz",
    });
  });

  it("serves repeat requests from the in-memory cache", async () => {
    const did = "did:plc:png0000000000000000003";
    vi.mocked(getCommunityCardData).mockResolvedValue({ displayName: "Test" });

    const app = buildApp();
    await supertest(app).get(`/communities/${encodeURIComponent(did)}/og-image`);
    const second = await supertest(app).get(`/communities/${encodeURIComponent(did)}/og-image`);

    expect(second.status).toBe(200);
    expect(renderCommunityCard).toHaveBeenCalledTimes(1);
  });

  it("404s for unknown communities", async () => {
    vi.mocked(getCommunityCardData).mockResolvedValue(null);
    const res = await supertest(buildApp()).get(
      "/communities/did%3Aplc%3Amissing0000000000001/og-image",
    );
    expect(res.status).toBe(404);
  });
});

describe("GET /communities/:did/share", () => {
  const DID = "did:plc:share00000000000000001";
  const ENCODED = encodeURIComponent(DID);

  it("serves OG meta tags with escaped values and a redirect", async () => {
    vi.mocked(getCommunityCardData).mockResolvedValue({
      displayName: 'Rock & <Roll> "Club"',
      description: "Loud & proud.",
    });

    const res = await supertest(buildApp()).get(`/communities/${ENCODED}/share`);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
    expect(res.headers["cache-control"]).toBe("public, max-age=300");
    expect(res.text).toContain(
      'og:title" content="Join Rock &amp; &lt;Roll&gt; &quot;Club&quot; on Open Social"',
    );
    expect(res.text).toContain('og:description" content="Loud &amp; proud."');
    expect(res.text).toContain(`/communities/${ENCODED}/og-image`);
    expect(res.text).toContain('name="twitter:card" content="summary_large_image"');
    // Redirect target preserves the join flow.
    expect(res.text).toContain(`/communities/${ENCODED}?action=join`);
    expect(res.text).toContain("http-equiv=");
    // Raw name must never appear unescaped.
    expect(res.text).not.toContain('<Roll>');
  });

  it("uses the fallback description when the community has none", async () => {
    vi.mocked(getCommunityCardData).mockResolvedValue({ displayName: "Quiet Club" });
    const res = await supertest(buildApp()).get(`/communities/${ENCODED}/share`);
    expect(res.text).toContain(
      'og:description" content="Join this community on Open Social."',
    );
  });

  it("404s for unknown communities", async () => {
    vi.mocked(getCommunityCardData).mockResolvedValue(null);
    const res = await supertest(buildApp()).get(`/communities/${ENCODED}/share`);
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run (API repo): `npm test -- src/routes/og.test.ts`
Expected: FAIL — `Cannot find module './og'`.

- [ ] **Step 3: Write the implementation**

```typescript
// src/routes/og.ts
import express, { Request, Response, NextFunction, Router } from "express";
import type { Kysely } from "kysely";
import type { Database } from "../db";
import { config } from "../config";
import { getCommunityCardData } from "../services/ogCard";
import { renderCommunityCard } from "../services/ogImage";
import { fetchAvatarAsDataUri } from "../lib/ogAvatar";

const PNG_CACHE_TTL_MS = 60 * 60 * 1000; // matches Cache-Control max-age=3600
const PNG_CACHE_MAX_ENTRIES = 500;
const pngCache = new Map<string, { buf: Buffer; expires: number }>();

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Public base URL of this API (for absolute og:image URLs). */
function apiBaseUrl(req: Request): string {
  return config.serviceUrl || `${req.protocol}://${req.get("host")}`;
}

/** Public base URL of the web app (redirect target). */
function appBaseUrl(): string {
  return config.corsOrigin || "http://127.0.0.1:5174";
}

/**
 * Public OG share-card endpoints, consumed by link-preview crawlers.
 * No auth: crawlers have no session, and the data shown is already public.
 */
export function createOgRouter(db: Kysely<Database>): Router {
  const router = express.Router();

  router.get(
    "/communities/:did/og-image",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const did = decodeURIComponent(req.params.did);

        const sendPng = (buf: Buffer) => {
          res.setHeader("Content-Type", "image/png");
          res.setHeader("Cache-Control", "public, max-age=3600");
          res.send(buf);
        };

        const cached = pngCache.get(did);
        if (cached && cached.expires > Date.now()) {
          return sendPng(cached.buf);
        }

        const data = await getCommunityCardData(db, did);
        if (!data) {
          return res.status(404).json({ error: "Community not found" });
        }

        const avatarDataUri = data.avatarUrl
          ? await fetchAvatarAsDataUri(data.avatarUrl)
          : undefined;
        const buf = await renderCommunityCard({
          displayName: data.displayName,
          avatarDataUri,
        });

        if (pngCache.size >= PNG_CACHE_MAX_ENTRIES) {
          const oldest = pngCache.keys().next().value;
          if (oldest !== undefined) pngCache.delete(oldest);
        }
        pngCache.set(did, { buf, expires: Date.now() + PNG_CACHE_TTL_MS });

        sendPng(buf);
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    "/communities/:did/share",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const did = decodeURIComponent(req.params.did);
        const data = await getCommunityCardData(db, did);
        if (!data) {
          return res.status(404).send("Community not found");
        }

        const encodedDid = encodeURIComponent(did);
        const imageUrl = `${apiBaseUrl(req)}/communities/${encodedDid}/og-image`;
        const targetUrl = `${appBaseUrl()}/communities/${encodedDid}?action=join`;
        const title = escapeHtml(`Join ${data.displayName} on Open Social`);
        const description = escapeHtml(
          data.description || "Join this community on Open Social.",
        );

        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "public, max-age=300");
        res.send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title}</title>
<meta property="og:site_name" content="Open Social">
<meta property="og:type" content="website">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${imageUrl}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="${escapeHtml(targetUrl)}">
<meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0; url=${escapeHtml(targetUrl)}">
</head>
<body>
<p>Redirecting to <a href="${escapeHtml(targetUrl)}">${title}</a>…</p>
<script>window.location.replace(${JSON.stringify(targetUrl)});</script>
</body>
</html>`);
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run (API repo): `npm test -- src/routes/og.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Mount the router in `src/index.ts`**

Add to the imports block (after the `createEventsRouter` import at line 21):

```typescript
import { createOgRouter } from "./routes/og";
```

Add directly after `app.use(createAuthRouter(oauthClient, db));` (line 107):

```typescript
// Public OG share-card endpoints (no auth — consumed by link-preview crawlers)
app.use(createOgRouter(db));
```

- [ ] **Step 6: Run the full API test suite and typecheck**

Run (API repo): `npm run build && npm test`
Expected: build succeeds; all tests pass (no regressions).

- [ ] **Step 7: Commit**

```bash
git add src/routes/og.ts src/routes/og.test.ts src/index.ts
git commit -m "feat: add public OG share and og-image endpoints for communities"
```

---

### Task 5: Generate the generic fallback card — API repo, output lands in web repo

**Files:**
- Create: `scripts/generate-og-default.ts` (API repo)
- Create: `public/og-default.png` (web repo — generated, committed in Task 7)

**Interfaces:**
- Consumes: `renderDefaultCard()` from Task 2.
- Produces: `public/og-default.png` (1200×630) in the web repo working tree.

- [ ] **Step 1: Write the script**

```typescript
// scripts/generate-og-default.ts
/**
 * Renders the generic OG fallback card used by the web app's static
 * og:image tag. Usage: npx tsx scripts/generate-og-default.ts <output-path>
 */
import { writeFileSync } from "fs";
import { renderDefaultCard } from "../src/services/ogImage";

async function main() {
  const outPath = process.argv[2];
  if (!outPath) {
    console.error("Usage: npx tsx scripts/generate-og-default.ts <output-path>");
    process.exit(1);
  }
  writeFileSync(outPath, await renderDefaultCard());
  console.log(`Wrote ${outPath}`);
}

main();
```

- [ ] **Step 2: Run it, writing into the web repo**

Run (API repo):
```bash
npx tsx scripts/generate-og-default.ts ../open-social-web/public/og-default.png
```
Expected: `Wrote ../open-social-web/public/og-default.png`; `open ../open-social-web/public/og-default.png` shows the generic card ("Open Social" / "Communities for the open social web" / "O" monogram).

- [ ] **Step 3: Commit the script (API repo only — the PNG is committed with Task 7)**

```bash
git add scripts/generate-og-default.ts
git commit -m "feat: add script to generate the generic OG fallback card"
```

---

### Task 6: Share button copies the API share URL — web repo

**Files:**
- Create: `src/utils/share.ts`
- Modify: `src/pages/CommunityPage.tsx:258-268` (the comment block + `handleShare` URL)
- Test: `src/test/share.test.ts`

**Interfaces:**
- Consumes: `API_BASE` from `src/utils/api.ts` (empty string in dev/tests — Vite proxy handles it).
- Produces: `communityShareUrl(did: string): string`.

- [ ] **Step 1: Write the failing test**

```typescript
// src/test/share.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run (web repo): `npm test -- src/test/share.test.ts`
Expected: FAIL — cannot find `../utils/share`.

- [ ] **Step 3: Write the util**

```typescript
// src/utils/share.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run (web repo): `npm test -- src/test/share.test.ts`
Expected: PASS.

- [ ] **Step 5: Update `handleShare` in `src/pages/CommunityPage.tsx`**

Add the import near the other util imports:

```typescript
import { communityShareUrl } from '../utils/share';
```

Replace the comment block and URL construction (currently lines 258-268):

```typescript
  // Share community handler: copy the API share link to the clipboard. The
  // share endpoint serves OG meta tags (dynamic preview card) to link-preview
  // crawlers, then redirects humans to this community page with ?action=join
  // so the existing join CTA / auto-join flow still fires.
  const handleShare = useCallback(async () => {
    if (!did) return;
    setShareError('');
    const url = communityShareUrl(did);
```

(The rest of `handleShare` — clipboard write, fallback textarea, `setShareCopied` — is unchanged.)

- [ ] **Step 6: Run the full web test suite and build**

Run (web repo): `npm test && npm run build`
Expected: all tests pass; build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/utils/share.ts src/test/share.test.ts src/pages/CommunityPage.tsx
git commit -m "feat: share button copies API share URL with dynamic OG card"
```

---

### Task 7: Static fallback OG tags — web repo

Raw `app.opensocial.community` URLs pasted anywhere get a branded generic card instead of nothing.

**Files:**
- Modify: `index.html` (head)
- Add: `public/og-default.png` (generated in Task 5)

**Interfaces:**
- Consumes: `public/og-default.png` from Task 5 (verify it exists: `ls public/og-default.png`).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Add the meta tags to `index.html`**

Insert after the `<meta name="viewport" ...>` line:

```html
    <meta property="og:site_name" content="Open Social" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="Open Social" />
    <meta property="og:description" content="Communities for the open social web." />
    <meta property="og:image" content="https://app.opensocial.community/og-default.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
```

- [ ] **Step 2: Verify the build includes both**

Run (web repo): `npm run build && ls dist/og-default.png && grep -c "og:image" dist/index.html`
Expected: `dist/og-default.png` exists; grep prints `3` (og:image, og:image:width, og:image:height).

- [ ] **Step 3: Commit**

```bash
git add index.html public/og-default.png
git commit -m "feat: add static fallback OG tags and generic share card"
```

---

### Task 8: End-to-end verification

- [ ] **Step 1: Full test suites, both repos**

Run: `(cd /Users/brittany/Documents/code/collective/open-social && npm run build && npm test)` then `(cd /Users/brittany/Documents/code/collective/open-social-web && npm test && npm run build)`
Expected: everything green.

- [ ] **Step 2: Live smoke test against a local API (if a dev environment is available)**

With the API running locally (`npm run dev` in the API repo, or the devnet setup — needs `DATABASE_URL`):

```bash
curl -s "http://localhost:3001/communities/<some-known-did>/share" | grep -o 'og:title[^>]*'
curl -s -o /tmp/og-live.png "http://localhost:3001/communities/<some-known-did>/og-image" && open /tmp/og-live.png
```
Expected: og:title shows the community name; the PNG is the warm-cream card with the community's avatar. If no local DB is available, skip — unit coverage exercises every branch — and note it in the final report.

- [ ] **Step 3: Post-deploy check (after the API ships)**

Paste `https://api.opensocial.community/communities/did%3Aplc%3Abbj62ki3gmlsjfzsr3dxbkna/share` into https://opengraph.dev or a Slack/Discord message.
Expected: "Join ATProtocol Developers on Open Social" card with the community avatar. Requires `SERVICE_URL` and `CORS_ORIGIN` env vars set in production (both already used by existing code).

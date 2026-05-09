# Kaylee — Phase 2 CIMD UI: Decisions & Blockers

**Author:** Kaylee (Frontend Dev)  
**Date:** 2026-05-08  
**Branch:** `squad/phase2-cimd-ui` in `open-social-web`

---

## Files Added / Modified

| File | Change |
|------|--------|
| `src/hooks/useCopyToClipboard.ts` | **New** — `{ copied, copy }` hook, auto-resets after 2s |
| `src/components/CopyableCode.tsx` | **New** — `<Code>` + copy button component; uses hook internally |
| `src/components/CimdSetupSection.tsx` | **New** — full CIMD setup UI (collapsed/configured/panel states) |
| `src/types.ts` | **Modified** — `AppInfo` gains `auth_method` and `cimd_url` |
| `src/components/RegisterAppModal.tsx` | **Modified** — auth method radio group, CIMD URL field, updated success panel |
| `src/pages/AppsPage.tsx` | **Modified** — `useCopyToClipboard` in AppCard, `CimdSetupSection` wired in, `onUpdated` prop threaded |

---

## Blockers

### 🔴 B1: PUT `/api/v1/apps/:appId` endpoint not confirmed

**Owner:** Wash  
**Affects:** `CimdSetupSection` Save button

`CimdSetupSection` calls `api.put('/api/v1/apps/:appId', { cimdUrl })` to save the CIMD URL after initial registration. Wash confirmed the registration endpoint accepts `cimdUrl`, but a separate update endpoint hasn't been verified. If the route doesn't exist, the Save button will return a 404. The UI already surfaces the error inline.

**Needed from Wash:** Confirm path and method for updating `cimd_url` on an existing app (e.g. `PUT /api/v1/apps/:appId` or a dedicated `PUT /api/v1/apps/:appId/cimd`).

### 🟡 B2: Simon's Section B content absent

**Owner:** Simon  
**Affects:** `CimdSetupSection` Steps 1, 2, 4 (keygen, JWKS, test snippets)

`.squad/decisions/inbox/simon-cimd-section-b.md` was not present at implementation time. The CIMD setup panel is stubbed with plausible but unverified shell/JSON snippets:
- **Step 1** — `openssl genrsa` + JWK conversion comment
- **Step 2** — JWKS JSON skeleton
- **Step 4** — `curl` test command template

**Needed from Simon:** Drop the canonical snippets into `simon-cimd-section-b.md` and I'll swap in the real content.

### 🟡 B3: Inara's design spec absent

**Owner:** Inara  
**Affects:** Visual polish of `CimdSetupSection`

`.squad/decisions/inbox/inara-b5-hybrid-status-spec.md` was not present. Implemented using the shared conventions (semantic tokens, teal palette, `bg.subtle`/`border` for the panel, `Badge` for status). If Inara has specific token overrides or layout specs, flag them and I'll apply.

---

## Open Questions

| # | Question | For |
|---|----------|-----|
| Q1 | Does `PUT /api/v1/apps/:appId` exist, or should the CIMD URL update go to a sub-resource like `/cimd`? | Wash |
| Q2 | Should the CIMD URL be editable at registration time for `http_signature` and `both`, or only post-registration via the card? Currently: both. | Team |
| Q3 | Simon's keygen snippet — does this platform use RS256 only or also ES256? The JWKS stub assumes RSA. | Simon |
| Q4 | Should `http_signature`-only apps hide the "Rotate Key" button entirely? Currently it's still shown (Rotate Key generates a new API key regardless of auth method — could be confusing). | Wash / Team |
| Q5 | Inara: any preference on collapsed vs expanded default for `CimdSetupSection` when `cimd_url` is null? Currently collapsed ("Set up CIMD" button). | Inara |
| Q6 | The success panel in `RegisterAppModal` for `http_signature` shows "CIMD setup pending — visit your app's detail card." Is this copy aligned with UX goals? (Per Q11 lazy-validation guidance — not claiming active/verified.) | Simon / Inara |

---

## Implementation Notes

- **Q11 lazy-validation** honoured: Save success copy is "✓ Saved. CIMD will activate on the first signed request." — not "active" or "verified."
- `CimdSetupSection` is positioned *between* the API Key block and `AppDefaultPermissionsSection` as specified, inside an existing `active`-status guard.
- `useCopyToClipboard` replaces 3+ inline copy patterns. `CopyableCode` handles its own clipboard state so callers don't need to wire it.
- Build: clean (exit 0). Pre-existing chunk-size warning unrelated to this change.

# AISO Instrument — Full End-to-End Diagnostic Report

## STEP 1 — ROUTE INVENTORY

### Files inside /api (12 total)

| # | File | Route | Method |
|---|------|-------|--------|
| 1 | api/extract.ts | /api/extract | POST |
| 2 | api/extract-from-html.ts | /api/extract-from-html | POST |
| 3 | api/audits.ts | /api/audits | GET, POST, PATCH |
| 4 | api/config.ts | /api/config | GET, PATCH |
| 5 | api/audit-enrich.ts | /api/audit-enrich | POST |
| 6 | api/competitive.ts | /api/competitive | POST |
| 7 | api/factual-anchors.ts | /api/factual-anchors | POST |
| 8 | api/handover-artifacts.ts | /api/handover-artifacts | POST |
| 9 | api/deployment-checklist.ts | /api/deployment-checklist | POST |
| 10 | api/quick-audit.ts | /api/quick-audit | POST |
| 11 | api/roadmap.ts | /api/roadmap | POST |
| 12 | api/admin/[[...path]].ts | /api/admin/* (audits) | GET |

**Total: 12 serverless functions** — at Vercel Hobby limit.

**Missing routes (called by frontend but no route file):**

- /api/answer-test — AnswerSimulationDisplay.tsx (component NOT imported anywhere; dead code)
- /api/competitor-discovery — CompetitorDiscoveryDisplay.tsx (component NOT imported; dead code)
- /api/users — AuthContext.tsx (only when Supabase configured; demo bypasses auth)

---

## STEP 2 — FRONTEND ENTRY FLOW TRACE

### User enters URL → handleAudit (App.tsx:126)

| Step | File | Function | API | Expected Response | Failure Point |
|------|------|----------|-----|-------------------|---------------|
| 1 | App.tsx:135 | handleAudit | POST /api/extract | ExtractionData JSON | If !extractRes.ok → setUsePasteFallback(true), throw. User sees "paste HTML" fallback |
| 2 | App.tsx:175 | performQuickAudit | POST /api/quick-audit | AuditResponse | geminiClient.ts:14 fetches; throws if !res.ok |
| 3 | App.tsx:194 | handleAudit | POST /api/audits | { id } | Saves audit; saveData?.id |
| 4 | App.tsx:226 | handleAudit | POST /api/audit-enrich | { findings, queryPack, fixLibrary, clientTranslation } | Async; does not block render. Failures caught in .catch |
| 5 | App.tsx:245 | (inside audit-enrich then) | PATCH /api/audits | — | Persists enrichment; .catch(()=>{}) |

**Failure chain:** If /api/extract returns 404, 500, or proxy ECONNREFUSED → extractRes.ok is false → setUsePasteFallback(true), throw → user sees paste HTML UI.

---

## STEP 3 — API TRACE

| Route | File Exists | Default Export | Method | Returns JSON | Imports |
|-------|-------------|----------------|--------|--------------|---------|
| /api/extract | Yes | Yes | POST | Yes | lib/apiHandlers/extract ✓ |
| /api/quick-audit | Yes | Yes | POST | Yes | lib/apiHandlers/quick-audit → ../geminiService ✓ |
| /api/audit-enrich | Yes | Yes | POST | Yes | lib/apiHandlers/audit-enrich → ../geminiService ✓ |
| /api/competitive | Yes | Yes | POST | Yes | lib/apiHandlers/competitive ✓ |
| /api/roadmap | Yes | Yes | POST | Yes | lib/apiHandlers/roadmap ✓ |
| /api/audits | Yes | Yes | GET/POST/PATCH | Yes | lib/apiHandlers/audits ✓ |
| /api/config | Yes | Yes | GET, PATCH | Yes | lib/apiHandlers/config ✓ |
| /api/factual-anchors | Yes | Yes | POST | Yes | lib/apiHandlers/factual-anchors ✓ |
| /api/handover-artifacts | Yes | Yes | POST | Yes | lib/apiHandlers/handover-artifacts ✓ |
| /api/deployment-checklist | Yes | Yes | POST | Yes | lib/apiHandlers/deployment-checklist ✓ |
| /api/extract-from-html | Yes | Yes | POST | Yes | lib/apiHandlers/extract-from-html ✓ |
| /api/admin/* | Yes | Yes | GET | Yes | admin/[[...path]].ts → admin-audits ✓ |

**Extract handler:** 12s AbortController timeout; structured error on failure.

---

## STEP 4 — BROKEN CALL DETECTION

| Endpoint | Called From | Route Exists | 404 Risk |
|----------|-------------|--------------|----------|
| /api/config | App.tsx, Admin.tsx | Yes | No |
| /api/extract | App.tsx | Yes | No |
| /api/extract-from-html | App.tsx | Yes | No |
| /api/audits | App, AuditHistory, Trends, Roadmap, Report | Yes | No |
| /api/audit-enrich | App.tsx | Yes | No |
| /api/competitive | App.tsx | Yes | No |
| /api/factual-anchors | App.tsx | Yes | No |
| /api/quick-audit | geminiClient | Yes | No |
| /api/handover-artifacts | geminiClient | Yes | No |
| /api/deployment-checklist | geminiClient | Yes | No |
| /api/roadmap | Roadmap.tsx | Yes | No |
| /api/admin/audits | Admin.tsx | Yes (catch-all) | No |
| /api/answer-test | AnswerSimulationDisplay | No | N/A — component not imported |
| /api/competitor-discovery | CompetitorDiscoveryDisplay | No | N/A — component not imported |
| /api/users | AuthContext | No | Only when Supabase configured; demo uses no auth |

**No UI calls broken endpoints** — all visible flows have matching routes.

---

## STEP 5 — RENDER FLOW TRACE

**ResultDashboard** (App.tsx:519):

- Props: observed (required), auditId, onReset, onReAudit, isQueryLoading, isFixLoading, isBriefLoading, etc.
- Line 46: `if (!observed) return null` — guards null.
- Line 58: `observed.summary.scores?.overallMaturityIndex` — optional chaining.
- Line 61: `observed.summary.readinessScore` — may be undefined; downstream uses handle it.

**Undefined access risks:** Low. observed is guarded; scores use optional chaining.

---

## STEP 6 — ROADMAP TRACE

**Roadmap.tsx (lines 217, 249):**

- GET /api/audits?id={auditId} — loads audit when coming from /roadmap/:auditId with no state.
- POST /api/roadmap — body: RoadmapPayload from buildRoadmapPayload().
- Expected response: RoadmapResponse (phase1, phase2, phase3, scoreProjection).

**lib/apiHandlers/roadmap.ts:**

- Expects RoadmapPayload; validates overallScore.
- Returns RoadmapResponse (phase1, phase2, phase3, scoreProjection).
- Uses ANTHROPIC_API_KEY or OPENAI_API_KEY; returns 503 if neither set.
- Error handling: 500 + structured message.

**Shape match:** Yes.

---

## STEP 7 — DEPLOYMENT CHECK

- **Non-route .ts in /api:** None. All files are route handlers.
- **Accidental default export:** None observed.
- **Handler import paths:** All api/* import from `../lib/apiHandlers/*`. Correct.
- **lib handlers:** Import from `../geminiService`, `../../types`. Correct (lib/geminiService exists).

---

## STEP 8 — OUTPUT

### 1. Confirmed working flows

- URL audit: extract → quick-audit → audits → audit-enrich (async)
- Paste HTML audit: extract-from-html → quick-audit → audits → audit-enrich
- Competitive compare: POST /api/competitive
- Roadmap: POST /api/roadmap with RoadmapPayload
- Trends: GET /api/audits?domain=
- Admin: GET /api/admin/audits via catch-all
- Config: GET /api/config
- Handover, deployment checklist: via geminiClient

### 2. Exact failure points

| Failure | File | Line | Cause |
|---------|------|------|-------|
| "Paste HTML" fallback | App.tsx | 141–158 | /api/extract returns non-OK (404, 500, ECONNREFUSED) |
| Blank page (dev) | — | — | react-refresh injectIntoGlobalHook error; assetsInclude may contribute |
| Vercel 12-function limit | — | — | 12 routes = at limit; any add will exceed |

### 3. Missing routes

- /api/answer-test — not used (component not rendered)
- /api/competitor-discovery — not used (component not rendered)
- /api/users — not used when Supabase not configured

### 4. Incorrect import paths

None found. All imports resolve.

### 5. Undefined access risks

Low. ResultDashboard guards observed; optional chaining used for scores.

### 6. Vercel build

- `npm run build` succeeds (Vite production build).
- 12 serverless functions — at Hobby limit; deploy may fail if Vercel counts differently.
- No custom devCommand; vercel.json has SPA rewrites only.

### 7. Minimal fix list (real issues only)

1. **"Source website unreachable" / paste fallback:** Ensure /api/extract is reachable. With `vercel dev`, APIs run; with `npm run preview` only, proxy to :3001 has nothing to connect to → use `vercel dev` for full-stack local testing.
2. **Blank page + react-refresh error:** Likely `assetsInclude: ['**/*.html']` or React 19 + plugin-react mismatch. Try removing assetsInclude; if import-analysis error returns, investigate alternative (e.g. plugin-react version).
3. **Vercel deploy 12-function error:** If deploy fails, remove one route (e.g. deployment-checklist if not critical) to reach 11.

# Walkthrough: Declarative Policy Packs, Legal Statute Monitor & Local ML Reality Engine

We have designed, implemented, and validated both tracks of the evolutionary roadmap for `knowthankyew-extension`:
1. **Track 1 (Upstream Regulatory Pipeline):** Decoupled hardcoded TypeScript rules into declarative JSON policy packs and built a scheduled GitHub Action that monitors official regulatory feeds (Federal Register API) and drafts PRs when statutory definitions change.
2. **Track 2 (In-Browser Reality Engine):** Built a type-safe Local ML loopback client (`http://127.0.0.1:8420`) with 2-stage legal link discovery/reranking (solving the "DoorDash/Marketplace" multi-agreement problem), plain-English clause analysis, and an explicit `/burn` protocol handshake fulfilling the Pillar 5 Hard Burn invariant.

---

## 1. Changes Made

### Track 1: Upstream Regulatory Intelligence & Declarative Policy Packs
- `src/core/policy-packs/us-federal.json`: Declarative JSON policy pack storing federal statutory rules for ROSCA (15 U.S.C. § 8403), FTC Negative Option & Click-to-Cancel (16 CFR Part 425), FAA Arbitration (9 U.S.C. § 2), and Class Action Waivers, annotated with API tracking metadata (`tracking.apiKeywords`).
- `src/core/policy-packs/state-arl.json`: Declarative policy pack for state automatic renewal and privacy statutes (California AB 2863 / CCPA, New York GBL § 527-a, Illinois BIPA).
- `src/core/policy-packs/index.ts`: Policy pack compiler converting declarative pattern strings into live, safe, case-insensitive `RegExp` instances and exposing `COMPILED_POLICY_RULES`.
- `src/core/types.ts`: Added `TrackingMetadata`, `DeclarativeRule`, and `PolicyPack` interfaces.
- `src/core/engine.ts`: Updated `ALL_RULES` to load dynamically from `COMPILED_POLICY_RULES` with zero runtime overhead.
- `scripts/check-statutory-updates.mjs`: Standalone ESM script that iterates through tracked policy pack citations, queries the public Federal Register API (`https://www.federalregister.gov/api/v1/documents.json`), and generates a structured `statutory-update-report.md`.
- `.github/workflows/legal-statute-monitor.yml`: GitHub Action with manual dispatch that queries Federal Register and generates a **Draft Pull Request** for human review rather than automatically merging or running unprompted.

### Track 2: Client-Side Local ML Integration & TOS Link Discovery
- `src/ml/types.ts`: Defined the service contracts for `HealthResponse`, `ClassifyLinksRequest`, `ClassifyLinksResponse`, `AnalyzeClauseRequest`, `AnalyzeClauseResponse`, and `BurnResponse`.
- `src/ml/local-ml-client.ts`: Created `LocalMLClient` connecting to `http://127.0.0.1:8420` with short abort timeouts and full support for the `/burn` endpoint.
- `src/content/link-detector.ts`: Implemented `discoverLegalLinksWithML()`—a 2-stage cascade where the fast heuristic DOM extractor gathers candidates and the local model promotes the primary consumer agreement to index 0.
- `src/telemetry/client.ts`: Updated `hardBurnAllData()` to trigger `localMLClient.burn()` in a non-blocking fire-and-forget dispatch, commanding the local worker to wipe prompt contexts and KV caches without blocking browser DOM/storage teardown.
- `vite.config.ts`: Added compile-time dead-code elimination (`__LOCAL_ML_ENABLED__`) and air-gap stripping during production builds, preserving the Zero-Egress Invariant in Chrome Web Store releases.
- `src/popup/App.tsx` & `src/options/OptionsApp.tsx`: Added distinct UI privacy status ("Local Assist" cyan badge vs. "Zero Egress" green badge) and live diagnostics meters for the loopback worker.

---

## 2. Test & Verification Results

### Vitest Suite (66 / 66 Tests Passed)
Ran `npm test` across all 14 test suites:
- **`policy-packs.test.ts`**: Verified all JSON policy packs load, contain valid citations and tracking metadata, and compile into safe `RegExp` instances.
- **`redos-static.test.ts`**: Statically proved with `safe-regex` that all 37 regex patterns in the declarative policy packs are free of exponential backtracking.
- **`local-ml-client.test.ts`**: Verified health checking, link classification, clause analysis, and `/burn` protocol dispatch.
- **`link-detector-ml.test.ts`**: Verified that ambiguous legal links (e.g. DoorDash Merchant vs. Consumer terms) are reranked so the primary consumer contract is promoted.
- **`bundle-invariants.test.ts`**: Statically verified 0 network primitives (`fetch`, `WebSocket`, `XMLHttpRequest`) in the compiled production bundle (`dist/`), verified CSP `connect-src 'none'`, and proved loopback client/manifest preservation in developer builds.
- **`chromium-e2e.test.ts`**: Puppeteer Chromium browser tests passed with 0 external egress packets and confirmed negative-control blocking under CSP `connect-src 'none'`.
- **`chromium-local-ml-e2e.test.ts`**: Real Chromium browser test verifying end-to-end Local ML Assist activation, options page `● Connected` status, popup `● Local Assist` tooltipped badge, and loopback `/burn` handshake.

### Production & Developer Build Verification
- Ran `npm run build`: Standard zero-egress production build with CSP `connect-src 'none'` and zero host permissions.
- Ran `npm run build:local-assist`: Developer build dynamically tailoring CSP `connect-src 'self' http://127.0.0.1:8420 http://localhost:8420` and `host_permissions: ["http://127.0.0.1:8420/*", "http://localhost:8420/*"]`.
- Ran `npm run package:all`: Validated dual-zip packaging generating both release packages with SHA256 checksums.

### Regulatory Monitor Script
Ran `node scripts/check-statutory-updates.mjs --mock`:
- Successfully ingested policy packs, checked tracking rules, and produced the markdown report for automated PR generation.

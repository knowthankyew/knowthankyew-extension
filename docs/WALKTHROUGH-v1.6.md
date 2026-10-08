# Walkthrough: KnowThankYew Reality Engine v1.6.0

> **Release Version**: `v1.6.0`  
> **Store Status**: Live on Chrome Web Store (`pbgjjgggmeecalifcgggiondfminilnl`) • Approved on Firefox Add-ons (AMO)  
> **Architecture Focus**: Multi-Tab Session Amnesia, Token-Bucket Throttling, Declarative Policy Packs, and Local ML Integration

---

## 1. Overview & Architecture Scope

`knowthankyew-extension` v1.6.0 establishes the hardened, multi-browser foundation of the Reality Engine. It expands on the original heuristic scanner by decoupling statutory definitions into declarative JSON policy packs, implementing multi-tab session amnesia synchronization, introducing a burst-resilient token-bucket scanner throttle, and integrating an optional air-gapped Local ML loopback assist.

The extension strictly preserves its foundational **Zero-Egress Invariant**:
- **Content Security Policy**: `connect-src 'none'` strictly enforced at the browser engine level for all extension pages.
- **Physical Bundle Auditing**: Build-time air-gap stripping removes `fetch`, XHR, and network primitives from production releases.
- **Pillar 5 Hard Burn**: Instant volatile memory flush, local storage wipe, and cross-tab/cross-context amnesia broadcast.

---

## 2. Key Capabilities & Innovations Delivered in v1.6.0

### A. Multi-Tab Session Amnesia Coordinator

- **Dual-Broadcast Hard Burn**:
  - Primary path: Dispatches `chrome.tabs.sendMessage` (`KTY_HARD_BURN_DOM`) to all active tabs in Chromium.
  - Secondary path: Concurrently broadcasts over `BroadcastChannel('kty_hard_burn')`. This ensures immediate amnesia synchronization across partitioned worker contexts, detached iframes, Options pages, and Safari containers.
- **Idempotent Content Script Teardown**:
  - `src/content/scanner.ts` receives the burn signal, tears down active `MutationObserver` instances, flushes local scan caches, dereferences all in-memory clause matches, purges `sessionStorage`, and sets an in-memory amnesia lock flag.
  - Subsequent programmatic scan requests within that tab session are permanently rejected until a fresh navigation occurs (architectural foundation established in v1.6.0; hardened with in-memory lock in v2.1.0).

### B. Burst-Resilient Token-Bucket Scanner Throttle (Q-SCAN-01)

- **Problem**: Fixed 60-second throttling windows caused cliff-edge scan starvation on dynamic single-page applications (SPAs) undergoing rapid checkout modal or accordion transitions.
- **Solution**: Replaced fixed windows with a mathematically sound **Token Bucket** in `src/content/scanner.ts`:
  - **Bucket Capacity**: 15 tokens.
  - **Refill Rate**: 1 token every 4,000ms (15 scans/minute steady state).
  - Permits rapid bursts during interactive multi-step checkout forms while bounding worst-case DOM inspection costs and preventing denial-of-service/CPU lockups.

### C. Declarative JSON Policy Packs & Upstream Regulatory Monitor

- **Declarative Statutory Rules**:
  - Hardcoded regex matchers decoupled into structured JSON policy packs:
    - `src/core/policy-packs/us-federal.json`: Federal ROSCA (15 U.S.C. § 8403), FTC Act § 5 Symmetrical Cancellation, Federal Arbitration Act (9 U.S.C. § 2), and Class Action Waivers.
    - `src/core/policy-packs/state-arl.json`: California AB 2863 / CCPA, New York GBL § 527-a, Illinois BIPA.
  - Runtime policy compiler (`src/core/policy-packs/index.ts`) compiles declarative strings into safe, case-insensitive `RegExp` instances at initialization with zero runtime overhead.
- **Automated Statutory Monitor (`scripts/check-statutory-updates.mjs`)**:
  - Weekly GitHub Action queries the official Federal Register API (`https://www.federalregister.gov/api/v1/documents.json`) using citation keywords (`15 U.S.C. 8403`, `negative option`, `click to cancel`).
  - Automatically drafts a **Draft Pull Request** with citation diffs for human legal review. Autonomous, unverified rule mutations are prohibited by design.

### D. Client-Side Local ML Integration & TOS Link Discovery

- **2-Stage Legal Link Discovery Cascade**:
  - Stage 1: Fast heuristic DOM extractor gathers governing legal links from footers, headers, and consent sections.
  - Stage 2: When Local ML is active, candidate links are dispatched to `POST /classify-links` (`http://127.0.0.1:8420`), semantically reranking multi-sided marketplace terms (e.g., DoorDash Consumer vs. Courier vs. Merchant terms) to promote the primary consumer agreement to the top of the popup list.
- **Loopback ML Client & `/burn` Protocol Handshake**:
  - Type-safe `LocalMLClient` connects to `127.0.0.1:8420` with strict abort timeouts (`1500ms` for link classification, `3000ms` for clause synthesis).
  - On Nuclear Hard Burn, dispatches a fire-and-forget `POST /burn` handshake commanding the local sidecar to purge KV caches and session prompt context before wiping client memory.
- **Chrome Prompt API Adapter (Gemini Nano)**:
  - Zero-setup in-browser adapter implementing `LocalMLProvider` via `window.ai.languageModel` with rigid schema enforcement and 4-state availability tracking (`ready`, `downloading`, `unsupported`, `disabled`).

### E. Senior Code Audit Hardening & Quality Refactoring

- **WeakSet O(1) DOM Node Deduplication (Q-DOM-01)**: Replaced $O(n)$ array lookup in `dom-extractor.ts` with an $O(1)$ `WeakSet` deduplicator.
- **Modularized Scan Execution (Q-UI-01)**: Refactored `performScan()` in `App.tsx` into isolated `injectAndRetryScan()` and `attemptMLRerank()` helpers.
- **Audit Timestamps on Legal Routes (Q-LINK-01)**: Added verified ISO audit timestamps to all 14 routes in `WELL_KNOWN_LEGAL_MAP`.
- **Fail-Loud Egress & Scanner Verification (Q-BUILD-01, Q-TEST-03)**: Added automated bundle checks ensuring `dist/content/scanner.js` is compiled, verified, and completely free of network primitives.

---

## 3. Test & Verification Results (v1.6.0)

### Vitest Suite (86 / 86 Tests Passed Across 16 Test Suites)

- **`policy-packs.test.ts`**: Validated JSON schema integrity, citation presence, and successful regex compilation.
- **`redos-static.test.ts`**: Statically proved with `safe-regex` that all declarative patterns are free of exponential backtracking.
- **`scanner-throttle.test.ts`**: Verified token-bucket capacity bounds, 4,000ms refill timing, and burst resilience.
- **`burn.test.ts` & `amnesia-coordinator.test.ts`**: Verified dual-broadcast Hard Burn propagation, `BroadcastChannel` synchronization, and permanent tombstone enforcement.
- **`rules.test.ts`**: Verified statutory pattern matches including `ARB-003`, `SURV-002`, and 3 benign negative controls.
- **`local-ml-client.test.ts`**: Verified loopback health pings, semantic reranking, non-200 / 500 error resilience, and `/burn` dispatch.
- **`bundle-invariants.test.ts`**: Statically verified 0 network primitives across all compiled distribution JS and confirmed CSP `connect-src 'none'`.
- **`chromium-e2e.test.ts`**: Real Puppeteer Chromium browser test confirming 0 external egress packets on checkout pages and proving negative-control CSP blocking.
- **`chromium-local-ml-e2e.test.ts`**: End-to-end Chromium verification of loopback worker connection, options status indicators, and loopback `/burn` handshake.

---

## 4. Packaging & Store Releases

The v1.6.0 release is packaged into dual distribution artifacts:

1. **Standard Chrome Web Store Package**:
   - Built via `npm run package` (`dist/`).
   - Packaged as `knowthankyew-extension-v1.6.0.zip`.
   - Manifest V3 with `connect-src 'none'` and zero broad host permissions.
2. **Mozilla Firefox (Gecko / AMO) Package**:
   - Built via `npm run package:firefox` (`dist-firefox/`).
   - Packaged as `knowthankyew-extension-v1.6.0-firefox.zip`.
   - Includes `browser_specific_settings.gecko.id: "reality-engine@knowthankyew.org"` and mobile Firefox bottom-sheet support.

# Roadmap: KnowThankYew Reality Engine (Browser Extension)

> **Repository**: [`knowthankyew/knowthankyew-extension`](https://github.com/knowthankyew/knowthankyew-extension)  
> **Status**: **v1.3.0 Live on Chrome Web Store · v1.5.0 Release Complete & Packaged · v1.6.0 Hardened & Verified**

---

## Delivered: v1.0.0 Foundation

The core reality engine is fully built, statically verified, and audited:

- [x] **Zero-Egress Invariant**: Enforced via Manifest V3 `extension_pages` CSP (`connect-src 'none'`), compile-time dead-code elimination, and fail-closed CI bundle grep over all distribution JS.
- [x] **Amnesiac Hard Burn**: Destroys volatile in-memory circular buffers, wipes `chrome.storage.local`, clears toolbar badges, and sets permanent tombstone traps.
- [x] **ROSCA & Rights-Waiver Grounding**: 37 heuristic pattern matchers rooted in ROSCA 15 U.S.C. § 8403, California AB 2863, New York GBL § 527-a, and FAA § 2 rights-waiver classifications.
- [x] **Static ReDoS Elimination**: 100% of regular expression patterns statically verified with `safe-regex`.
- [x] **Puppeteer E2E Network Interception**: Real Chromium browser test intercepting 100% of network traffic with negative-control CSP verification.
- [x] **Supply Chain Attestation**: Automated CycloneDX SBOM (`bom.json`) and SLSA build provenance attestation on every `main` push.

---

## Milestone 1: Chrome Web Store Packaging & Submission (`v1.1.0`) ✅

- [x] **Automated Release Packaging in CI**: GitHub Actions packages `dist/` into `knowthankyew-extension-v1.1.0.zip` attached to GitHub Releases alongside `bom.json`.
- [x] **Store Marketing & Listing Assets**: 1280×800 marquee promo tile, 440×280 small promo tile, verified 16/48/128 icon assets.
- [x] **Static Privacy Policy Host**: Cookie-less, zero-analytics privacy policy page via GitHub Pages.
- [x] **Web Store Review & Publication**: Reviewed, approved, and published live — [`knowthankyew-reality-engi/pbgjjgggmeecalifcgggiondfminilnl`](https://chromewebstore.google.com/detail/knowthankyew-reality-engi/pbgjjgggmeecalifcgggiondfminilnl).

---

## Milestone 2: Automated Contract Discovery & 1-Click Audit (`v1.2.0`) ✅

- [x] **Governing Legal Link Discovery**: Automatically detect Terms of Service, Privacy Policies, Arbitration Clauses, and ROSCA disclosures in page footers and headers. 1-click audit navigation in the popup.
- [x] **Dynamic Checkout MutationObserver**: Automatically re-evaluates fine print on dynamic DOM mutation (accordions, modal expansions, client-rendered checkout flows).

---

## Milestone 3: Engine Dashboard & Cross-Domain Burn Manager (`v1.3.0`) ✅ — Live on Chrome Web Store

- [x] **Full-Page Options Dashboard**: VS Code-styled options page with live memory/storage usage meters (`chrome.storage.local.getBytesInUse()`).
- [x] **Nuclear Amnesia Across All Domains**: Global master burn clearing all local storage, volatile telemetry buffers, and broadcasting `KTY_HARD_BURN_DOM` observer teardown across all open tabs.

---

## Milestone 4: Declarative Policy Packs, Multi-Browser & Neural Assist (`v1.5.0`) ✅ — Packaged & Release-Ready

> **Release Status**: 86/86 baseline tests pass across unit, ReDoS, invariant, adversarial DOM, and Puppeteer real-Chromium suites. Packaged as `knowthankyew-extension-v1.5.0.zip` (Chrome) and `knowthankyew-extension-v1.5.0-firefox.zip` (Firefox / Gecko AMO).

- [x] **Declarative JSON Policy Packs**: Statutory rules decoupled into structured JSON packs (`us-federal.json`, `state-arl.json`) with automated regex compilation at build time.
- [x] **Automated Statutory Regulatory Monitor**: Weekly GitHub Action querying the Federal Register API to detect rule amendments (ROSCA, Negative Option, Click-to-Cancel, Arbitration). Generates Draft Pull Requests with official citation diffs for human review — no autonomous rule mutations.
- [x] **2-Stage Legal Link Discovery Cascade**: Fast DOM heuristic extractor coupled with optional loopback semantic reranker (`http://127.0.0.1:8420`) to prioritize consumer agreements over merchant/courier terms.
- [x] **Hard Burn Protocol Handshake**: Fire-and-forget `POST /burn` wiping external worker prompt context and KV cache on Nuclear Amnesia.
- [x] **Compile-Time Air-Gap Invariant Preservation**: `vite.config.ts` dead-code eliminates `fetch()` calls in production Chrome Web Store builds, preserving `connect-src 'none'`.
- [x] **Chrome Built-in Prompt API Provider (`ai.languageModel` / Gemini Nano)**: Zero-setup in-browser adapter implementing `LocalMLProvider` with rigid schema enforcement and post-hoc length caps. 4-state availability model (`ready`, `downloading`, `unsupported`, `disabled`).
- [x] **Mozilla Firefox (Gecko & Firefox Android)**: Dedicated build target with `browser_specific_settings` in `manifest.json`. Mobile Firefox bottom sheet compatibility. Packaged as `knowthankyew-extension-v1.5.0-firefox.zip`.

---

## Milestone 5: Hardening, Multi-Tab Amnesia & Code Quality (`v1.6.0`) ✅

- [x] **Multi-Tab Session Amnesia Coordinator**: Dual-broadcast Hard Burn via `chrome.tabs.sendMessage` (primary Chromium path) **and** `BroadcastChannel('kty_hard_burn')` (secondary cross-context path covering Safari's partitioned worker contexts and detached frames) with idempotent DOM handler in `src/content/scanner.ts`.
- [x] **Token Bucket Scanner Throttle** *(Q-SCAN-01)*: Replaced fixed 60-second window in `src/content/scanner.ts` with a token bucket (capacity: 15 tokens, refill rate: 1 token per 4,000ms = 15/min steady state). Eliminates cliff-edge scan starvation on dynamic single-page applications while enforcing anti-abuse boundaries.
- [x] **`performScan()` refactor** *(Q-UI-01)*: Landed in commit `c0bd121`. Modularized into `injectAndRetryScan()` and `attemptMLRerank()` in `src/popup/App.tsx`, reducing `performScan` complexity and enabling isolated testing.
- [x] **`WeakSet` deduplication** *(Q-DOM-01)*: Landed in commit `c0bd121`. Replaced $O(n)$ array lookup in `src/content/dom-extractor.ts` with $O(1)$ `WeakSet` deduplication.
- [x] **Missing policy rule tests** *(Q-TEST-01)*: Landed in commit `c0bd121`. Added positive tests for `ARB-003` and `SURV-002` + 3 benign control tests in `tests/rules.test.ts`.
- [x] **Throttle unit & stress tests** *(Q-TEST-02)*: Added in commit `c0bd121` and updated for token-bucket refill verification in `tests/scanner-throttle.test.ts`.
- [x] **Loopback ML error handling tests** *(Q-TEST-04)*: Landed in commit `c0bd121`. Added tests covering non-200 responses (404, 500, 503), malformed JSON, and timeout handlers in `tests/local-ml-client.test.ts`.
- [x] **`lastVerified` timestamps on `WELL_KNOWN_LEGAL_MAP`** *(Q-LINK-01)*: Landed in commit `c0bd121`. Added ISO audit timestamps to all 14 routes in `src/content/link-detector.ts`.
- [x] **Fail-loud bundle and scanner egress verification** *(Q-BUILD-01, Q-TEST-03)*: Landed in commit `c0bd121` in `tests/fixture-dom.test.ts` and `tests/bundle-invariants.test.ts`.

---

## Milestone 6: International Jurisdiction Packs, Safari & Inline Defense (`v2.0.0`)

**Why this is a major version**: Two simultaneous product-changing shifts — ambient inline visual indicators (new UX surface and trust model) and international regulatory coverage (new user base outside the US) — merit a major version bump. The ongoing operational commitment of monitoring EUR-Lex and UK legislation.gov.uk is a new maintenance boundary that does not exist in 1.x.

### New UX Surface

- [ ] **Context-Aware Inline Visual Indicators**: Shield badges injected directly adjacent to predatory consent checkboxes and deceptive terms toggles *before* form submission — shifting the extension from a toolbar alert panel to an ambient, frontline visual layer. Implemented inside a **closed Shadow DOM** to guarantee complete CSS isolation from host-page styles. SPA resilience strategy (reconnecting injected indicators after framework re-renders) will be finalized during the v2.0 sprint based on findings from Milestone 5's MutationObserver work.

### International Jurisdiction Packs

- [ ] **UK Digital Markets, Competition and Consumers Act 2024**: Statutory rules covering mandatory 14-day cooling-off reminders and pre-renewal disclosure schedules under the DMCC Act.
- [ ] **EU Consumer Rights Directive (Directive 2011/83/EU)**: Rules detecting pre-ticked subscription boxes (banned across all EU member states) and non-compliant cancellation mechanisms. Note: the extension *detects* non-compliant mechanisms — it does not enforce or block them.
- [ ] **State ARL Expansion**: Specific statutory alerts for Colorado, Illinois (ACRA 815 ILCS 601), and Oregon auto-renewal notification thresholds not currently covered by `state-arl.json`.

### New Distribution Channel

- [ ] **Apple Safari (macOS / iOS)**: Convert the Chrome extension via `xcrun safari-web-extension-converter`. Native macOS App Sandbox companion packaging. App Store distribution pipeline including Apple's required privacy manifest (`NSPrivacyTrackedDataTypes` declarations). iOS Safari compatibility testing.

### Regulatory Upkeep Infrastructure

- [ ] **Automated Regulatory Upkeep for International Packs**: Extend the existing weekly Federal Register GitHub Action to additionally monitor **EUR-Lex** (EU Official Journal API, `/ELI` endpoint) and **UK legislation.gov.uk** (SPARQL endpoint) for amendments to covered directives and acts. Auto-draft PRs with official citation diffs and amendment abstracts for human review — same human-in-the-loop pattern as the existing Federal Register monitor. No autonomous rule mutations.

---

## Architecture Notes for v2.0.0

### Inline Indicators: Trust Model Shift

The inline visual indicators feature represents a meaningful trust model change from v1.x. Content scripts currently *read* from the host page DOM passively. Inline indicators *write* to the host page DOM. Key design constraints for the v2.0 sprint:

- **Shadow DOM (closed mode required)**: Host-page CSS must not leak into indicators. `attachShadow({ mode: 'closed' })` is the baseline. Open mode is explicitly not acceptable.
- **MutationObserver resilience**: SPA frameworks (React, Next.js, Vue) re-render subtrees and will overwrite injected indicators. The existing `scanner.ts` MutationObserver infrastructure from v1.x should be extended to detect when indicator anchor elements are re-rendered and re-inject accordingly.
- **Layout safety**: Injected elements must not shift host-page layout. `position: absolute` overlay approach preferred over layout-participating inserts.
- **Selector targeting strategy**: Heuristics for locating predatory checkboxes (common `name` attribute patterns, adjacent text matching existing policy pack patterns) must be designed to fail silently — missing an indicator is acceptable; breaking a checkout form is not.

### Safari: Build Pipeline Delta

The `xcrun safari-web-extension-converter` output is an Xcode project wrapping the existing MV3 extension. Key deltas from the existing Chrome/Firefox pipeline:

- `BroadcastChannel` support: Verify Safari 16+ support for the `kty_hard_burn` channel added in v1.6.0.
- `browser_specific_settings` in manifest: Extend the existing Firefox `closeBundle()` hook in `vite.config.ts` to also emit a Safari-compatible manifest variant.
- App Sandbox entitlements: The Xcode wrapper requires explicit entitlements for `com.apple.security.network.client` if Local Assist loopback is ever enabled in a Safari build. Consumer builds with `connect-src 'none'` require no network entitlements — document this explicitly.
- `NSPrivacyTrackedDataTypes`: Apple's required privacy manifest must declare zero tracked data types for the consumer build. This is provably accurate and should be documented with a reference to the `bundle-invariants.test.ts` zero-egress verification.

---

*Architecture and roadmap maintained by the `knowthankyew` project. Implementation coded by Gemini. Reviewed by Kiro (Claude).*

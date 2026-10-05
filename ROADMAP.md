# Roadmap: KnowThankYew Reality Engine (Browser Extension)

> **Repository**: [`knowthankyew/knowthankyew-extension`](https://github.com/knowthankyew/knowthankyew-extension)  
> **Status**: **v1.3.0 Live on Chrome Web Store · v1.6.0 Approved on Firefox AMO · v2.0.0 Release Complete & Packaged**

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

## Milestone 6: International Jurisdiction Packs, Safari & Inline Defense (`v2.0.0`) ✅

**Why this is a major version**: Two simultaneous product-changing shifts — ambient inline visual indicators (new UX surface and trust model) and international regulatory coverage (new user base outside the US) — merit a major version bump. The ongoing operational commitment of monitoring EUR-Lex and UK legislation.gov.uk is a new maintenance boundary that does not exist in 1.x.

### New UX Surface

- [x] **Context-Aware Inline Visual Indicators**: Shield badges injected directly adjacent to predatory consent checkboxes and deceptive terms toggles *before* form submission — shifting the extension from a toolbar alert panel to an ambient, frontline visual layer. Implemented inside a **closed Shadow DOM** (`attachShadow({ mode: 'closed' })`) to guarantee complete CSS isolation from host-page styles. Form-neutral, fail-silent, zero `innerHTML` (pure document text nodes), and seamlessly integrated into `scanner.ts` with atomic teardown upon Hard Burn.

### International Jurisdiction Packs

- [x] **UK Digital Markets, Competition and Consumers Act 2024**: Statutory rules covering mandatory 14-day cooling-off reminders and pre-renewal disclosure schedules under the DMCC Act (`src/core/policy-packs/uk-dmcc.json`).
- [x] **EU Consumer Rights Directive (Directive 2011/83/EU)**: Rules detecting pre-ticked subscription boxes (banned across all EU member states), unwaivable withdrawal right waivers, and bundled consent profiling under GDPR (`src/core/policy-packs/eu-crd.json`).
- [x] **State ARL Expansion**: Specific statutory alerts for Colorado (C.R.S. § 6-1-732), Illinois (ACRA 815 ILCS 601), and Oregon (ORS § 646A.295) auto-renewal notification thresholds added to `state-arl.json`.

### New Distribution Channel

- [x] **Apple Safari (macOS / iOS)**: Dedicated `TARGET_BROWSER=safari` build target outputting `dist-safari/` and packaging `knowthankyew-extension-v2.0.0-safari.zip`. Verified clean conversion via `xcrun safari-web-extension-converter`. Documented Apple App Store privacy manifest (`NSPrivacyTrackedDataTypes: []`) and zero network entitlements requirement.

### Regulatory Upkeep Infrastructure

- [x] **Automated Regulatory Upkeep for International Packs**: Extended `scripts/check-statutory-updates.mjs` to monitor **EUR-Lex** (EU Official Journal API / ELI) and **UK legislation.gov.uk** for amendments to covered directives and statutory instruments. Produces multi-jurisdiction markdown reports for automated GitHub Actions PR dispatch. No autonomous rule mutations.

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

### Clean-State Proof of Work: Resolving the "Silent Failure vs. Clean Bill of Health" Dilemma

A core vulnerability in consumer trust for client-side privacy extensions is the ambiguity of a green or "all good" verdict. When a scan yields zero violations (`riskScore === 0`), the user currently cannot distinguish between:
1. **A Thorough Clean Bill of Health**: The engine extracted thousands of characters across multiple legal containers, segmented dozens of discrete clauses, and evaluated them against all compiled policy packs with zero violations.
2. **A Silent Extraction Failure / Empty Scope**: The content script encountered text trapped inside a cross-origin `<iframe>`, an unexpanded dynamic accordion, a PDF/canvas viewer, or a DOM structure unreached by `dom-extractor.ts`, evaluating negligible text and falsely proclaiming "Clean".

To address this, the v2.0 architecture requires an auditable **Proof of Work receipt** for every evaluation:
- **Quantifiable Telemetry**: Expose extracted character counts, word estimates, evaluated segment counts, and inspected DOM selectors directly in the UI.
- **Fail-Loud Low-Watermark Guard**: Introduce a minimum extraction threshold (`< 250` chars of substantive text). If below threshold, suppress the "Clean / Low Risk" green state and display an amber **"Sparse / Indeterminate Scope"** warning with actionable navigation diagnostics.
- **Verifiable Ingest Preview**: Provide a collapsible, strictly sanitized on-page text sample verifying exactly what DOM content was passed to the regex engine.

---

## Milestone 7: Consumer Intelligence Arc — Plain Language, Structured Handoff & Remedy (`v2.x`)

> **Strategic framing**: v2.0.0 established the ambient shield (inline indicators + international packs). The next arc transforms the extension from a *detector* into a *consumer advocate*: plain-language explanations first, then a structured handoff to the portfolio's specialist destination tools, and finally remedy artifact generation.

### Phase 1 — BS Translator ✅ (`v2.0.0`)

Gemini Nano explains each finding in 1–2 plain conversational sentences, on-device, with zero cloud egress.

- [x] Nano on-device summaries per `TrapCard` via `ChromePromptAPIAdapter` (opt-in, fail-silent fallback to heuristic explanation)
- [x] Rule IDs never surface to the user
- [x] Severity tiers simplified to plain language: **"Watch out"** / **"This is a problem"** / **"FYI"**
- [x] `useEffect` async/await + `AbortController` for clean inference lifecycle (burn-safe)
- [x] Calendar reminder link for `AUTO_RENEWAL` traps (25-day pre-renewal reminder, zero new permissions)

### Phase 1.5 — Clean-State "Proof of Work" & Evaluation Transparency ✅ (`v2.0.1`)

Give users verifiable evidence of what the engine actually inspected when a page passes clean, eliminating the ambiguity between a spotless contract and a failed DOM extraction.

- [x] **Clean-State "Audit Receipt" Drawer**: When `riskScore === 0` ("Clean / Low Risk"), replace the passive empty-state placeholder with an interactive, inspectable **Evaluation Breakdown / Proof of Work** card.
- [x] **Extraction Scope Telemetry**: Surface quantitative metrics so the user can verify the engine actively evaluated their document:
  - Total characters and estimated word count evaluated (e.g. `14,820 chars · ~2,100 words`).
  - Evaluated clause segments: count of discrete bounded clauses parsed by `segmentText()`.
  - DOM container attribution: list of candidate selectors scanned (e.g. `<main>`, `article.legal`, `form.checkout`, `body`).
  - Local scan latency: microsecond/millisecond execution time (`~35ms local execution`).
- [x] **Statutory & Category Pass Checklist**: Explicitly render the verified battery of checks so "all good" is provable rather than a black box:
  - `✓ Automatic Renewal & Negative Option (ROSCA 15 U.S.C. § 8403 / State ARLs)`
  - `✓ Mandatory Binding Arbitration & Jury Trial Waivers (FAA 9 U.S.C. § 2)`
  - `✓ Unilateral Terms Modification & Illusory Discretion`
  - `✓ Surveillance & Cross-Context Data Brokerage Disclosures`
  - `✓ EU CRD / UK DMCC 2024 Pre-ticked Consent & Cooling-off Disclosures`
- [x] **Sanitized Text Preview Accordion**: An expandable "Inspect Evaluated Text" drawer displaying a scrollable, redacted snippet preview of what the engine ingested, enabling the user to confirm their specific agreement was processed.
- [x] **Sparse Text & Frame Warning Guard**: Distinguish between a genuinely clean contract and an unscanned page. If `scannedLength < 250` characters or no semantic clauses are detected:
  - Suppress the green "Clean / Low Risk" banner and surface an amber **"Sparse Content / Indeterminate Scan"** advisory.
  - Alert the user that contract text may reside in a cross-origin `<iframe>`, closed shadow DOM, canvas/PDF viewer, or collapsed accordion.
  - Elevate discovered external contract links with a prominent 1-click "Open & Scan Contract" action.
- [x] **Zero-Egress & Amnesiac Conformance**: Proof of work telemetry and text previews remain strictly in ephemeral content script / popup memory, never leave the browser, and are purged completely on Nuclear Hard Burn (`KTY_HARD_BURN_DOM`).

### Phase 2 — Structured Handoff Protocol ✅ (`v2.1.0`)

Define the intent/findings/summary JSON schema and wire the extension popup to open portfolio destination tools with pre-loaded context. No new backend. No new infrastructure.

- [x] **Define `KTY_HANDOFF_PAYLOAD` schema**: structured JSON envelope containing `{ domain, scanTimestamp, findings: EvaluationMatch[], primaryLegalLink: DiscoveredLegalLink | null, summary: PageScanResult['summary'] }`
- [x] **`postMessage` bridge**: Extension popup serializes the payload into a `sessionStorage`-safe blob and opens the destination tool URL with a `?kty_handoff=1` flag; destination reads via `window.addEventListener('message', ...)` or `sessionStorage` key with HMAC integrity check
- [x] **Zero persistent storage for handoff**: Payload lives in `sessionStorage` for the duration of the destination tab session only; cleared on Hard Burn broadcast
- [x] **Canonical destination tool registry**: Map `TrapCategory` → best-fit destination tool (`AUTO_RENEWAL` → `bill-of-rights-bot`, `DATA_SHARING` → `careCheck`, `ARBITRATION` → `lease-audit` or `bill-of-rights-bot`)
- [x] **New extension UI surface**: "Get Help" / "Take Action" button in the scan results panel, visible only when ≥ 1 CRITICAL or WARNING finding exists

### Phase 3 — Destination Tools Receive Context ✅ (`v2.2.0`)

`bill-of-rights-bot`, `careCheck`, and `lease-audit` detect the handoff payload and skip their intake flow, jumping directly to findings display.

- [x] **`useKTYHandoff()` hook** in `@knowthankyew/privacy-telemetry/react`: reads and validates `KTY_HANDOFF_PAYLOAD` from `sessionStorage` on mount; returns typed payload or `null`
- [x] **Intake bypass in `bill-of-rights-bot`**: When hook returns a payload, render findings panel directly with `findings[]` pre-populated; intake dropzone is replaced by the domain banner + "Back to scan" affordance
- [x] **Intake bypass in `careCheck`**: Same pattern — payload maps to itemized line items where applicable; graceful fallback if category mismatch
- [x] **Intake bypass in `lease-audit`**: Arbitration and unilateral-change findings map to lease clause categories; tenant tool renders matched clauses inline
- [x] **Privacy invariant**: `KTY_HANDOFF_PAYLOAD` must pass through `SAFE_ALLOWLIST_KEYS` sanitization before being written to `sessionStorage` — no raw clause text beyond the already-sanitized `matchedSnippet` (already redacted by `sanitizeSnippet()` in engine)
- [x] **Hard Burn propagation**: `KTY_HARD_BURN_DOM` broadcast must also clear `sessionStorage['kty_handoff']` in destination tool tabs

### Phase 4 — Remedy Artifacts (`v2.3.0+`)

Cancellation and dispute letter template generation with ML fill-in and statutory grounding. **Only after Phases 1–3 are stable and the accuracy bar is established.**

- [ ] **Cancellation letter templates**: Jurisdiction-aware templates grounded in applicable ROSCA / state ARL statutes, filled in by Nano (on-device) with merchant name, subscription type, and detected renewal terms
- [ ] **Dispute letter templates**: Medical bill, wage, and warranty dispute templates with statutory citation injection (one template per destination tool domain)
- [ ] **ML fill-in accuracy gate**: Templates are only offered when Nano `confidence === 'high'` AND the heuristic engine corroborates the category — contradictions fall back to blank template with manual fill-in prompt
- [ ] **Zero server-side generation**: All template rendering runs client-side in the destination tool. No document text leaves the browser at any point in the pipeline
- [ ] **Download / copy affordance**: Generated letters are offered as a `.txt` download or clipboard copy — never transmitted to any KTY server

---

*Architecture and roadmap maintained by the `knowthankyew` project. Implementation coded by Gemini. Reviewed by Claude (Antigravity).*


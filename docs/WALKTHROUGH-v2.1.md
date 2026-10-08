# Walkthrough: KnowThankYew Reality Engine v2.1.0

> **Release Version**: `v2.1.0`  
> **Store Readiness**: Chrome Web Store • Firefox Add-ons (AMO) • Apple Safari / Mac App Store  
> **Architecture Focus**: Ambient Closed Shadow DOM Defense, International Statutory Packs, Clean-State Proof of Work, Structured Handoff Protocol, and Air-Gapped Document Auditing

---

## 1. Executive Summary & Strategic Evolution

`knowthankyew-extension` v2.1.0 marks the evolution of the Reality Engine from a passive, toolbar-bound detector into an **ambient, frontline consumer advocate**:

1. **Ambient Frontline Defense**: Injects non-intrusive warning badges directly adjacent to deceptive consent checkboxes and terms toggles *before* form submission, encapsulated within a strictly isolated closed Shadow DOM.
2. **International Statutory Grounding**: Expands beyond US federal and state law to enforce UK (DMCC Act 2024) and European Union (Consumer Rights Directive 2011/83/EU) standards, with automated multi-jurisdictional regulatory tracking across the Federal Register, EUR-Lex, and UK Legislation.
3. **Evaluation Transparency ("Proof of Work")**: Solves the "silent failure vs. clean bill of health" dilemma by providing a verifiable, quantitative audit receipt and low-watermark sparse scan guard for every inspected page.
4. **Action Engine & Specialist Tool Handoff**: Connects on-page statutory findings directly to portfolio remedy tools (`bill-of-rights-bot`, `careCheck`, `lease-audit`) via an ephemeral, amnesiac JSON handoff protocol.
5. **Universal Document Auditing & PDF Detection**: Adds context-aware detection for Chromium-isolated native PDF viewer tabs, an auto-focused zero-permission `Cmd+V` Quick-Paste scratchpad, and a full-page drag-and-drop Document Auditor dashboard.

Throughout all of these capabilities, the engine strictly maintains its **Zero-Egress Invariant** (`connect-src 'none'`), zero external data collection, and atomic Nuclear Hard Burn amnesia.

---

## 2. Comprehensive Breakdown of Changes & Features

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   KNOWTHANKYEW REALITY ENGINE v2.1.0                                   │
├────────────────────────────────┬───────────────────────────────────┬───────────────────────────────────┤
│        FRONTLINE DEFENSE       │         STATUTORY INTELLIGENCE    │           ACTION ENGINE           │
├────────────────────────────────┼───────────────────────────────────┼───────────────────────────────────┤
│ • Closed Shadow DOM Indicators │ • US Federal (ROSCA, FAA, FTC §5) │ • Ephemeral Session Handoff       │
│ • Context Checkbox Targeting   │ • State ARL (CA, NY, IL, CO, OR)  │ • Bill of Rights Bot Integration  │
│ • Zero Host Style Leakage      │ • UK DMCC Act 2024                │ • CareCheck & Lease-Audit Routing │
│ • Atomic Hard Burn Teardown    │ • EU Consumer Rights Directive    │ • 25-Day Calendar Reminders       │
├────────────────────────────────┴───────────────────────────────────┴───────────────────────────────────┤
│                                      AUDIT & TRANSPARENCY LAYER                                        │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ • Quantitative Proof of Work Receipt (Character/Word/Segment/DOM container telemetry)                  │
│ • Sparse Content Low-Watermark Guard (< 250 chars triggers amber Indeterminate Advisory)               │
│ • Chromium Native PDF Tab Detection with Zero-Permission Quick-Paste Scratchpad (Cmd+V)                │
│ • Full-Page Air-Gapped Document Auditor (Drag-and-drop .pdf, .txt, .md, .html upload)                 │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### A. Ambient Closed Shadow DOM Inline Defense (Milestone 6)
- **Frontline Consent Shield (`src/content/inline-indicators.ts`)**:
  - Automatically identifies predatory consent elements on checkout forms (e.g. pre-ticked continuous subscription enrollments, hidden arbitration checkboxes).
  - Injects subtle warning badges directly adjacent to the input element *before* user submission.
- **Closed Shadow DOM Encapsulation (`mode: 'closed'`)**:
  - Indicators are attached using `attachShadow({ mode: 'closed' })`. This physically prohibits host-page stylesheets from mutating indicator styles and prevents host-page JavaScript from inspecting indicator internals.
- **Form-Neutral & Fail-Silent**:
  - Uses `position: absolute` floating overlays to prevent layout shifts.
  - Form inputs are never modified or blocked; indicators fail silently if selectors do not match.
  - Zero `innerHTML`: All text and nodes are constructed via pure document text primitives to eliminate XSS surfaces.
  - Destroyed atomically across all tabs upon Nuclear Hard Burn.

### B. International Jurisdiction Policy Packs
- **UK Digital Markets, Competition and Consumers Act 2024 (`src/core/policy-packs/uk-dmcc.json`)**:
  - Rules flagging continuous payment authority agreements lacking mandatory 14-day pre-renewal cooling-off reminder provisions.
- **EU Consumer Rights Directive (`src/core/policy-packs/eu-crd.json`)**:
  - Enforces statutory prohibitions against pre-ticked commercial consent boxes (Directive 2011/83/EU Art. 22).
  - Flags bundled consent profiling under GDPR and statutory withdrawal right waivers.
- **Expanded State Automatic Renewal Laws (`src/core/policy-packs/state-arl.json`)**:
  - Ingests Colorado (C.R.S. § 6-1-732), Illinois (ACRA 815 ILCS 601), and Oregon (ORS § 646A.295) notification windows.
- **Multi-Jurisdiction Statutory Upkeep (`scripts/check-statutory-updates.mjs`)**:
  - Automated CI script extended to query **EUR-Lex** (EU Official Journal API / ELI) and **UK legislation.gov.uk** alongside the US Federal Register, producing consolidated markdown diff reports.

### C. Clean-State Proof of Work & Evaluation Transparency (Milestone 7 Phase 1.5)
- **Resolving the "Clean vs. Uninspected" Dilemma**:
  - Eliminates consumer ambiguity when zero violations are found (`riskScore === 0`).
- **Audit Receipt Card (`src/popup/components/AuditReceiptCard.tsx`)**:
  - **Quantitative Extraction Telemetry**: Displays total characters evaluated, estimated word counts, discrete segmented clause counts, and inspected DOM candidate containers (e.g. `<main>`, `form.checkout`, `article.legal`).
  - **Execution Latency**: Surfaces microsecond/millisecond execution timing (e.g. `~35ms local execution`).
  - **Statutory Pass Checklist**: Renders an explicit battery of passed statutory checks (ROSCA, FAA, EU CRD, UK DMCC, State ARL).
  - **Sanitized Text Preview Accordion**: Scrollable, redacted drawer allowing users to verify the exact text ingested by the engine.
- **Sparse Scan Low-Watermark Guard (`src/popup/components/SparseScanWarning.tsx`)**:
  - If substantive text extracted is below 250 characters, the engine suppresses the green "Clean" state and renders an amber **"Sparse Content / Indeterminate Scan"** advisory warning that content may reside in cross-origin iframes, canvas/PDF readers, or collapsed accordions.

### D. Structured Handoff Protocol & Action Engine (Milestone 7 Phase 2)
- **Cross-Tool Remediation Bridge (`src/popup/handoff-bridge.ts`, `src/core/handoff.ts`)**:
  - Defines the typed `KTY_HANDOFF_PAYLOAD` JSON envelope containing domain attribution, sanitized findings, legal citations, and recommended destination tool.
- **1-Click Advocate Launch**:
  - Surfaces a prominent **"Take Action: Dispute or Cancel"** banner in the popup when critical or warning terms are discovered.
  - Automatically routes users to specialist portfolio tools:
    - `AUTO_RENEWAL` / `ROSCA` violations $\rightarrow$ **Bill of Rights Bot** ([github.com/knowthankyew/bill-of-rights-bot](https://github.com/knowthankyew/bill-of-rights-bot))
    - `DATA_SHARING` violations $\rightarrow$ **CareCheck** ([github.com/knowthankyew/care-check](https://github.com/knowthankyew/care-check))
    - `ARBITRATION` / `UNILATERAL_CHANGE` $\rightarrow$ **Lease-Audit** ([github.com/knowthankyew/lease-audit](https://github.com/knowthankyew/lease-audit)) or **Bill of Rights Bot**
- **Ephemeral Session Security**:
  - Transferred via `sessionStorage` with HMAC verification and target URL flag (`?kty_handoff=1`). Zero cloud persistence, zero cookies, zero external telemetry.
  - Purged automatically on tab close or Nuclear Hard Burn.

### E. Plain-Language BS Translator & Severity Tiers (Milestone 7 Phase 1)
- **Gemini Nano On-Device Summaries (`src/ml/chrome-ai-adapter.ts`)**:
  - In Chrome browsers with Prompt API support, translates complex legal jargon into 1–2 plain, conversational sentences locally.
- **Human-Centric Severity Tiers**:
  - Replaced opaque technical error badges with clear human labels:
    - **"Watch out"** (Critical statutory violation / financial trap)
    - **"This is a problem"** (Warning / rights surrender)
    - **"FYI"** (Informational disclosure)
- **1-Click Pre-Renewal Calendar Reminder**:
  - Automatically generates standard `.ics` / Web Calendar URLs for subscription signups (setting a notification for 25 days post-signup) without requiring calendar permissions.

### F. PDF Agreement Detection & Zero-Permission Quick-Paste Scratchpad
- **Native PDF Tab Identification (`src/popup/App.tsx`)**:
  - Recognizes native Chromium PDF tabs (`.pdf`, `chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai`) where browser security policy blocks direct content script injection.
  - Replaces generic browser restriction errors with a dedicated **"📄 PDF Agreement Detected"** card.
- **Auto-Focused Quick-Paste Scratchpad**:
  - Bypasses Chromium's extension popup clipboard restrictions (which block programmatic `navigator.clipboard.readText()` without high-risk manifest permissions).
  - Provides an auto-focused, dark-themed monospace `<textarea>` with an `onPaste` listener:
    - User copies text from the PDF tab (`Cmd+A`, `Cmd+C`).
    - Opens the popup and presses **`Cmd+V`**.
    - The `onPaste` handler **immediately executes `scanDocumentText()`**, displaying risk meters and findings in under 5ms with **zero browser permissions required**.

### G. Air-Gapped Document & Contract Auditor Tab (`options.html#document`)
- **Full-Page Standalone Auditor (`src/options/OptionsApp.tsx`)**:
  - Accessible via the Options dashboard or direct link from the popup.
  - **Drag-and-Drop File Upload**: Evaluates uploaded `.pdf`, `.txt`, `.md`, and `.html` contracts entirely client-side using Web APIs.
  - **Direct Text Input**: Large paste area for long-form commercial agreements.
  - **Full Statutory Battery**: Evaluates text against all 42+ compiled rules across all jurisdictions, complete with interactive risk score meters, statutory pass breakdowns, and Action Engine dispatch.
  - **Dedicated Nuclear Hard Burn**: Instantly purges file names, extracted text, and audit results from browser memory.

### H. Visual Polish & Portfolio Tooling Standardization
- **500px Widened Popup**: Increased popup dimensions from 400px to 500px, accommodating multi-line legal findings, statutory receipts, and action buttons.
- **Sleek Custom Scrollbars**: Injected modern CSS `scrollbar-width: thin; scrollbar-color: #334155 transparent;` across both popup and options dashboard, eliminating unsightly OS default scrollbars.
- **Standardized Playwright & FFmpeg Discovery**: Updated `scripts/record-demo.js` to eliminate lateral sibling workspace imports, adopting the unified portfolio discovery cascade matching all sister repositories.

---

## 3. Test & Verification Matrix (v2.1.0)

### Vitest Suite (156 / 156 Tests Passed Across 22 Test Suites)

```
Test Files  22 passed (22)
     Tests  156 passed (156)
  Duration  7.19s
```

| Test Suite | File | Focus & Assertions Verified |
| :--- | :--- | :--- |
| **Handoff Bridge & Actions** | [tests/handoff-bridge.test.tsx](../tests/handoff-bridge.test.tsx) | Ephemeral `sessionStorage` dispatch, `?kty_handoff=1` flags, PDF quick-paste `Cmd+V` auto-scan, Hard Burn purge |
| **Proof of Work & Scope** | [tests/proof-of-work.test.tsx](../tests/proof-of-work.test.tsx) | Telemetry extraction metrics, statutory checklist rendering, low-watermark sparse scan warnings (< 250 chars) |
| **Closed Shadow DOM Defense** | [tests/inline-indicators.test.ts](../tests/inline-indicators.test.ts) | Encapsulation inside `mode: 'closed'`, pure text node safety, zero CSS host leakage, atomic DOM cleanup |
| **Amnesia & Multi-Tab Sync** | [tests/amnesia-coordinator.test.ts](../tests/amnesia-coordinator.test.ts) | Dual-broadcast `BroadcastChannel` synchronization, OptionsApp state sync, permanent tombstone flags |
| **Options Document Burn** | [tests/options-burn.test.ts](../tests/options-burn.test.ts) | Standalone document auditor memory incinerator, tab switching resilience, byte meter accuracy |
| **International Policy Packs** | [tests/policy-packs.test.ts](../tests/policy-packs.test.ts) | Schema validation and regex compilation for US Federal, State ARL, UK DMCC, and EU CRD packs |
| **Static ReDoS Elimination** | [tests/redos-static.test.ts](../tests/redos-static.test.ts) | Mathematical verification via `safe-regex` proving 0 exponential backtracking across all 42+ patterns |
| **Real Chromium E2E** | [tests/chromium-e2e.test.ts](../tests/chromium-e2e.test.ts) | Puppeteer Chromium browser test verifying 0 external network requests during checkout inspection |
| **Bundle Egress Invariants** | [tests/bundle-invariants.test.ts](../tests/bundle-invariants.test.ts) | 100% absence of `fetch`/XHR primitives in `dist/`, CSP `connect-src 'none'`, Safari/Firefox manifest invariants |
| **Local ML Loopback E2E** | [tests/chromium-local-ml-e2e.test.ts](../tests/chromium-local-ml-e2e.test.ts) | Loopback ML worker connection, options status indicators, popup tooltipped badge, `/burn` handshake |
| **Adversarial DOM** | [tests/adversarial-dom.test.ts](../tests/adversarial-dom.test.ts) | Deeply nested trees, shadow roots, SVG containers, bounded memory/CPU extraction ceiling |

---

## 4. Multi-Store Packaging & Release Artifacts

All distribution packages have been compiled, verified, and checksummed via `npm run package:all`:

| Release Package | Target Platform | Manifest & CSP Details | Verification |
| :--- | :--- | :--- | :--- |
| **`knowthankyew-extension-v2.1.0.zip`** | **Chrome Web Store** | Manifest V3 · `connect-src 'none'` · Least-privilege permissions (`activeTab`, `storage`, `scripting`) | Pre-packaged for ID `pbgjjgggmeecalifcgggiondfminilnl` |
| **`knowthankyew-extension-v2.1.0-firefox.zip`** | **Firefox Add-ons (AMO)** | Manifest V3 · Gecko ID `reality-engine@knowthankyew.org` · Mobile Firefox Android bottom sheet support | Pre-packaged for Mozilla Add-on Hub |
| **`knowthankyew-extension-v2.1.0-safari.zip`** | **Apple Safari (macOS/iOS)** | Manifest V3 · `version_name` synchronization · Ready for `xcrun safari-web-extension-converter` | Zero network entitlements · `NSPrivacyTrackedDataTypes: []` |
| **`knowthankyew-extension-v2.1.0-local-assist.zip`** | **Developer / Sidecar ML** | Manifest V3 · `connect-src 'self' http://127.0.0.1:8420` · Loopback host permissions | Verified loopback assist build for local ML workflows |

### Cryptographic Attestation (`SHA256SUMS`)

The canonical checksums are recorded in [SHA256SUMS](../SHA256SUMS):
```text
3cb20cceb6baecda4086ad345151ee661c9e8fb85c490ffc1868fcda324e9432  knowthankyew-extension-v2.1.0-firefox.zip
14a38f36dd31da9f55e5b61c169eb9ee8ea1c1729c159846387fb88d6c702a0a  knowthankyew-extension-v2.1.0-local-assist.zip
d9ae87ecb1fc0647c4e5e4933dd78f24b22c7a5d3f115998a4427181c2f1f316  knowthankyew-extension-v2.1.0-safari.zip
bb8b8db44a33cb86c23a7bb7d5d0ddbdf7598c4749f7cf7d1596706e22ba9321  knowthankyew-extension-v2.1.0.zip
```

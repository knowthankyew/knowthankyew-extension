<!-- diagram-meta
  last-validated: 2026-10-27
  validated-commit: 0aa6d49
  covers: [src/**, manifest.json, vite.config.ts]
  generated-by: manual
-->

# Architecture & Invariants Specification: KnowThankYew Reality Engine

> Technical architecture, security boundaries, and portfolio alignment for `knowthankyew-extension`.

---

## 1. Executive Summary

`knowthankyew-extension` is the 11th repository of the [`knowthankyew`](https://github.com/knowthankyew) open-source portfolio. It serves as an in-browser "reality engine" that brings the statutory clause evaluation logic from `bill-of-rights-bot` and `lease-audit` directly into the user's browser toolbar under Manifest V3.

---

## 2. System Architecture & Ecosystem Relationships

### A. C4 Container Diagram: Extension & Portfolio Ecosystem

```mermaid
flowchart TD
    subgraph UserContext["User Context"]
        Consumer["👤 Consumer / Citizen"]
    end

    subgraph Browser["Client Browser Environment"]
        subgraph HostTab["Host Page Tab (Isolated World)"]
            DOM["🌐 Host Page DOM<br/><i>(Checkout Forms, Terms Modals)</i>"]
            Scanner["🔍 Content Scanner<br/><code>src/content/scanner.ts</code>"]
            ShadowUI["🛡️ Closed Shadow DOM Badges<br/><code>span[data-kty-indicator-host]</code><br/><code>src/content/inline-indicators.ts</code>"]
        end

        subgraph CoreEngine["Shared On-Device Core (Bundled per Context)"]
            Engine["⚡ Core Scanner Engine<br/><code>src/core/engine.ts</code>"]
        end

        subgraph ExtSandbox["knowthankyew-extension Sandbox (MV3)"]
            Popup["💻 Popup UI (React 19)<br/><code>src/popup/App.tsx</code>"]
            Options["📄 Options &amp; PDF Auditor<br/><code>src/options/OptionsApp.tsx</code><br/><code>src/options/pdf-extractor.ts</code>"]
            BG["⚙️ Background Worker<br/><code>src/background/service-worker.ts</code>"]
            Nano["🧬 Chrome Built-in AI Adapter<br/><code>src/ml/chrome-ai-adapter.ts</code>"]
        end
    end

    subgraph CompileTime["Portfolio Dependencies (Compile-Time Air-Gapped)"]
        PP["📦 @knowthankyew/policy-packs/subscriptions<br/><i>Statutory rules, ReDoS-verified regex</i>"]
        PT["📦 @knowthankyew/privacy-telemetry/react<br/><i>Volatile buffer, getPrivacyClaims(), burn</i>"]
    end

    subgraph LocalMachine["Local Machine (Optional Sidecar)"]
        MLWorker["🧠 Local ML Inference (:8420)<br/><code>src/ml/local-ml-client.ts</code><br/><i>SmolLM2/Gemma reranker &amp; /burn</i>"]
    end

    subgraph DownstreamPortfolio["Downstream Reality Engines (Zero-Storage Handoff)"]
        LeaseAudit["📄 lease-audit<br/><i>Tenancy Engine</i>"]
        CareCheck["🏥 careCheck<br/><i>Medical Billing</i>"]
        BillOfRights["📜 bill-of-rights-bot<br/><i>Dispute Engine</i>"]
        WarrantyWatch["🛡️ warranty-watch<br/><i>Warranty Engine</i>"]
    end

    %% Interactions
    Consumer -->|"Navigates & Interacts"| DOM
    Consumer -->|"Clicks Toolbar / Inspects"| Popup
    Consumer -->|"Uploads PDF / Audits Text"| Options

    Popup -->|"Injects on Demand (activeTab)"| Scanner
    Scanner -->|"Extracts Visible Legal Text"| Engine
    Options -->|"Local Pasted / PDF Text"| Engine
    PP -.->|"Compile-Time Rules Injected"| Engine
    Engine -->|"PageScanResult (findings & sanitized snippets)"| Popup

    Scanner -->|"Renders Closed Mode"| ShadowUI
    ShadowUI -.->|"Overlay Above"| DOM

    Popup -->|"Logs Operational Spans"| PT
    Options -->|"Logs Operational Spans"| PT
    Popup -.->|"On-Device Explain (if available)"| Nano
    BG ---|"Syncs Badges"| Popup

    %% Optional Local ML Loopback
    Popup -.->|"POST /classify-links & /explain (if active)"| MLWorker
    Popup -.->|"POST /burn (on Hard Burn)"| MLWorker
    Options -.->|"POST /burn (on Hard Burn)"| MLWorker

    %% Structured Handoff
    Popup -->|"Advocate Handoff (Tab Open / ?kty_handoff=1)"| LeaseAudit
    Popup -->|"Advocate Handoff (Tab Open / ?kty_handoff=1)"| CareCheck
    Popup -->|"Advocate Handoff (Tab Open / ?kty_handoff=1)"| BillOfRights
    Popup -->|"Advocate Handoff (Tab Open / ?kty_handoff=1)"| WarrantyWatch

    classDef core fill:#1e293b,stroke:#38bdf8,stroke-width:2px,color:#f8fafc;
    classDef browser fill:#0f172a,stroke:#64748b,stroke-width:1px,color:#f8fafc;
    classDef pkg fill:#14532d,stroke:#22c55e,stroke-width:2px,color:#f8fafc;
    classDef opt fill:#78350f,stroke:#f59e0b,stroke-width:1px,stroke-dasharray: 5 5,color:#f8fafc;
    classDef ext fill:#312e81,stroke:#818cf8,stroke-width:1px,color:#f8fafc;

    class Popup,Options,Engine,Scanner,ShadowUI,BG core;
    class PP,PT pkg;
    class MLWorker,Nano opt;
    class LeaseAudit,CareCheck,BillOfRights,WarrantyWatch ext;
```

### B. Execution Sandbox & Data Flow

```mermaid
flowchart LR
    subgraph Execution["Local Tab Sandbox"]
        DOM["Target Page DOM"]
        Ext["src/content/dom-extractor.ts"]
        RE["Core Rule Engine<br/>(src/core/engine.ts)"]
    end

    subgraph MV3Runtime["Extension Context"]
        SW["Background Worker<br/>(src/background/service-worker.ts)"]
        Pop["Popup &amp; Options UI<br/>(src/popup/App.tsx, src/options/OptionsApp.tsx)"]
        TM["TelemetryManager<br/>(src/telemetry/client.ts)"]
    end

    DOM -->|"Batched Extract"| Ext
    Ext -->|"Text Segments"| RE
    RE -->|"Matched Findings Only"| Pop
    Pop -->|"Operational Spans"| TM
    SW ---|"Badge Updates"| Pop
```

### Pillar 1: Volatile Memory State & Local-Only Processing
The extension never writes document excerpts, page URLs, or audit traces to disk. Operational telemetry is configured as `memory_only`, and scan results are held in the popup and injected content-script contexts. The current implementation does not use `chrome.storage.local` as the telemetry or scan-result store, and it never uses `chrome.storage.sync`.

The `storage` permission is retained so the Nuclear Hard Burn routine can purge the extension's local storage namespace and the Options dashboard can report local storage byte usage (`getBytesInUse()`). In the current release, `chrome.storage.local` is a defensive cleanup and storage-meter inspection target rather than the source of truth for runtime telemetry or findings.

### Pillar 2: Compile-Time Dead-Code Shims & CSP Boundaries
- **Manifest CSP:** `extension_pages` specifies `connect-src 'none'`, physically forbidding popup and background worker environments from initiating outbound network traffic.
- **Content Script Isolation & CSP Distinction:** Manifest V3's `connect-src 'none'` CSP strictly governs extension pages (popup, options page, service worker). Injected content scripts run in an isolated execution world inside the host page. Content script air-gapping is therefore enforced **by architectural design and compile-time dead-code exclusion** (confirmed via automated `dist/content/scanner.js` regex audits and Puppeteer zero-egress interception tests), rather than relying on extension page CSP.
- **OTLP Shims:** `vite.config.ts` ensures that unless an enterprise build explicitly injects `VITE_OTEL_EXPORTER_OTLP_ENDPOINT`, network telemetry exporter functions are excised at build time.
- **Local ML Air-Gap Boundary & Trust Delta:** Loopback communications (`http://127.0.0.1:8420`) are governed by compile-time flag `__LOCAL_ML_ENABLED__`. In standard production Chrome Web Store builds, the `air-gap-zero-egress` plugin physically strips all `fetch()` calls from `dist/`, ensuring that release builds maintain zero-egress compliance with CSP `connect-src 'none'`. Developer builds with Local Assist enabled are distributed via GitHub Releases backed by CycloneDX SBOM and SLSA Level 3 build provenance.

### Pillar 3: Strict Fail-Closed Allowlisting
All telemetry spans emit attributes validated against `SAFE_ALLOWLIST_KEYS` and `EXTENSION_ALLOWLIST_KEYS`. Arbitrary properties are silently stripped.

### Pillar 4: Zero Raw Text Egress & Least Privilege Injection
The content script executes all heuristic pattern matching locally in the tab. Only structured categorical findings (e.g. `ruleId: "AR-001"`, `severity: "CRITICAL"`) and sanitized text snippets are passed across browser boundaries. Permissions are strictly bound to `activeTab` + `scripting`, preventing passive background monitoring across tabs.

### Pillar 5: The Hard Burn
A single invocation of `hardBurnAllData()` drains the in-memory telemetry buffer, clears the extension's `chrome.storage.local` namespace, clears toolbar badge indicators, and broadcasts `KTY_HARD_BURN_DOM` to every open tab. Each injected content script that receives the message disconnects its `MutationObserver`, clears its cached scan result, resets extraction state, and removes extension-owned DOM attributes.

When Local ML assistance is active, `hardBurnAllData()` additionally issues a fire-and-forget `POST /burn` command to the loopback worker (`http://127.0.0.1:8420/burn`), instructing the external process to purge in-memory prompt contexts and KV caches without blocking the instant browser-side DOM and storage wipe.

Hard burn is best-effort rather than transactional: tabs may be closed, restricted, or lack an injected content script, and those failures do not prevent cleanup of the other tabs or the extension context that initiated the burn.

### Upstream Regulatory Pipeline & Centralized Policy Packs
Statutory subscription rules are centralized in the portfolio's version-controlled engine **`@knowthankyew/policy-packs/subscriptions`** and consumed as a compile-time air-gapped dependency.
- **Declarative Structure:** Each rule contains standard classifications, plain explanations, regex pattern strings verified against ReDoS via `safe-regex`, and legal grounding (`statuteRef`, `jurisdiction`, `effectiveDate`, `lastAudited`, `officialSourceUrl`).
- **Centralized Daily Regulatory Monitor:** A daily GitHub Action (`.github/workflows/legal-statute-monitor.yml` in `knowthankyew/policy-packs`) queries the Federal Register (FTC, CFPB, HHS, DOL), EUR-Lex, UK Legislation, and State statutory feeds at `06:00 UTC`.
- **Human-in-the-Loop Draft PR Gate:** Detected changes generate automated markdown diff reports and open draft PRs labeled `needs-attorney-review` in `knowthankyew/policy-packs` rather than autonomously mutating rules or synthesizing patches, eliminating AI hallucination risks in statutory enforcement.

### 2-Stage Legal Link Discovery Cascade
Finding governing consumer contracts on multi-sided platforms (e.g., DoorDash Consumer vs. Dasher vs. Merchant terms) utilizes a 2-stage cascade:
1. **Stage 1 (DOM Heuristics):** In-tab extractor scans `<a>` elements and well-known route maps locally in <2ms.
2. **Stage 2 (Local ML Reranker):** When multiple candidate agreements exist and Local ML Assist is active, candidate titles/URLs are dispatched to `POST /classify-links` on loopback. The model promotes the true consumer agreement to the primary position. If the local worker is offline, the engine falls back seamlessly to heuristic priority sorting.

### Runtime Activation and Dynamic Observation
The extension has no manifest-declared `content_scripts` entry. The popup injects `content/scanner.js` into the active tab only when the user invokes the extension. Once injected, the scanner performs an initial local scan and installs a debounced `MutationObserver` on that tab's document body to detect dynamically inserted terms, checkout modals, and asynchronous subscription clauses.

This means the runtime model is **user-initiated activation with post-activation observation**, not strictly click-to-scan. Automatic rescans are bounded by a 400 ms debounce, a 25-character extracted-text delta threshold, and a maximum of 15 scans per minute. The observer remains active until the content script receives `KTY_HARD_BURN_DOM`, the scanner is explicitly stopped, or the tab is destroyed.

### Runtime State and Cleanup Boundaries
- **Popup:** React state holds the currently displayed `PageScanResult` and UI state.
- **Content script:** Module-local state holds the latest scan result, extracted-text length, observer, and debounce timers.
- **Telemetry:** `TelemetryManager` holds allowlisted operational spans and audit events in memory only.
- **Chrome storage:** No current scan or telemetry write path uses `chrome.storage.local`; hard burn clears the namespace as a defensive cleanup operation.

Consequently, reopening the popup or navigating away can discard context-local state independently of the other extension contexts. Hard burn coordinates the known contexts but should not be described as a durable or atomic transaction.

---

## 3. The 12 Core Invariants

Every release and pull request must satisfy these 12 core invariants, verified by automated unit, ReDoS, and physical bundle invariant test suites:

| # | Invariant | Enforcement Mechanism |
|:--|:----------|:----------------------|
| 1 | **Zero Document Egress (Consumer Build)** | Manifest CSP `connect-src 'none'`, Vite air-gap plugin, and fail-closed CI bundle scan over all distribution JS (`scanner.js` explicit). |
| 2 | **No PII in Telemetry Spans** | Strict compile-time allowlist (`EXTENSION_ALLOWLIST_KEYS`); arbitrary properties are stripped before entering memory buffer. |
| 3 | **`memory_only` Telemetry Mode** | Telemetry runs strictly in volatile circular memory; zero persistence to disk, databases, or cloud endpoints. |
| 4 | **Hard Burn Covers All Contexts** | Dual-broadcast Nuclear Amnesia (`chrome.tabs` + `BroadcastChannel`) wipes memory buffers, `chrome.storage.local`, badges, loopback worker cache (`POST /burn`), and purges DOM observers and inline indicators. |
| 5 | **Least-Privilege Permissions** | Only `activeTab`, `storage`, and `scripting` requested. Zero broad host permissions (`<all_urls>` strictly prohibited). |
| 6 | **ReDoS-Free Regex Patterns** | 100% of regular expression patterns across all statutory policy packs statically verified via `safe-regex` in CI. |
| 7 | **Zero `innerHTML` Execution** | All UI components and inline indicators use React sanitized rendering or native `document.createTextNode()` / DOM text nodes. |
| 8 | **Dynamic UI Claims Grounding** | Privacy meters and policy claims are derived dynamically from verified runtime configuration via `getPrivacyClaims()`. |
| 9 | **Compile-Time ML Dead-Code Elimination** | Consumer builds completely excise loopback networking code (`http://127.0.0.1:8420`) at compile time. |
| 10 | **Minimal Production Dependencies** | Exactly 5 production dependencies (`@knowthankyew/policy-packs`, `@knowthankyew/privacy-telemetry`, `fflate`, `react`, `react-dom`) to prevent supply-chain attack surface. |
| 11 | **Shadow DOM Closed Mode** | All inline visual indicators injected into the host page DOM must use `attachShadow({ mode: 'closed' })`. Host page styles cannot pierce or distort badges, and host scripts cannot inspect or access internal badge nodes. |
| 12 | **Indicator Content No Raw Text** | Injected indicator labels and accessible tooltips are constructed strictly from deterministic rule metadata (`rule.title`, `rule.explanation`), never from raw page-extracted text, form values, or PII. |

---

## 4. Directory Structure

```
knowthankyew-extension/
├── .github/workflows/       # CI and Release workflows
├── manifest.json            # Manifest V3 configuration (activeTab, storage, scripting)
├── package.json             # React 19 + TypeScript + @knowthankyew/privacy-telemetry
├── vite.config.ts           # Multi-browser bundling (Chrome, Firefox, Safari) with air-gap shims
├── public/                  # Manifest and generated PNG icons (16, 48, 128)
├── scripts/                 # Store asset renderers, demo recording & claims linter
├── src/
│   ├── background/          # Ephemeral MV3 service worker
│   ├── content/             # Isolated DOM extractor, link discovery & inline indicators
│   ├── core/
│   │   ├── policy-packs/    # Re-exports from @knowthankyew/policy-packs/subscriptions
│   │   ├── handoff.ts       # Ecosystem routing & sessionStorage handoff builder
│   │   ├── types.ts         # Core TypeScript domain & handoff interfaces
│   │   └── engine.ts        # Dynamic policy compiler & reality engine scanner
│   ├── ml/                  # Local ML loopback client (127.0.0.1:8420), Chrome AI adapter & /burn contract
│   ├── options/             # Full-page PDF/Contract Auditor & 5-Pillar Diagnostics UI
│   ├── telemetry/           # Privacy telemetry singleton & Hard Burn controller
│   └── popup/               # React 19 popup UI & PrivacyAuditModal
├── tests/                   # Vitest suite (policy packs, ML, ReDoS, indicators, handoff, Chromium E2E)
└── docs/                    # Technical documentation, store specs, and GitHub Pages
    ├── ARCHITECTURE.md      # Architecture, state machines & security invariants
    ├── BUILD.md             # Mozilla AMO source verification guide
    ├── CHROMEWEBSTORE.md    # Chrome Web Store submission specification
    ├── HOW-TO-USE.md        # Plain-English user guide & onboarding
    ├── LOCAL-ML-SETUP.md    # Local ML inference sidecar setup guide
    ├── QA_CHECKLIST.md      # Pre-release & multi-browser QA verification checklist
    ├── SAFARI-SUBMISSION.md # Safari Web Extension packaging & Xcode conversion guide
    ├── SECURITY.md          # Threat model & vulnerability disclosure
    ├── WALKTHROUGH-v1.6.md  # v1.6.0 live baseline release walkthrough
    ├── WALKTHROUGH-v2.1.md  # v2.1.0 release candidate walkthrough
    └── senior-review.md     # Production readiness audit & verification log
```

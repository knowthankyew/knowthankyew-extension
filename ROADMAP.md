# Roadmap: KnowThankYew Reality Engine (Browser Extension)

> **Repository**: [`knowthankyew/knowthankyew-extension`](https://github.com/knowthankyew/knowthankyew-extension)  
> **Status**: **v1.3.0 Live & Published on Chrome Web Store • v1.4.0 Release Candidate Ready**

---

## 1. Current State: v1.0.0 Foundation (Delivered)

The core reality engine is fully built, statically verified, and audited:
- [x] **Zero-Egress Invariant**: Enforced via Manifest V3 `extension_pages` CSP (`connect-src 'none'`) and fail-closed CI grep over all distribution JS bundles.
- [x] **Amnesiac Hard Burn**: Destroys volatile in-memory circular buffers, wipes `chrome.storage.local`, clears toolbar badges, and sets permanent tombstone traps.
- [x] **ROSCA & Rights-Waiver Grounding**: 37 heuristic pattern matchers rooted in ROSCA 15 U.S.C. § 8403, California AB 2863, New York GBL § 527-a, and FAA § 2 rights-waiver classifications.
- [x] **Static ReDoS Elimination**: 100% of regular expression patterns statically verified with `safe-regex`.
- [x] **Puppeteer E2E Network Interception**: Real Chromium browser test intercepting 100% of network traffic with negative-control CSP verification.
- [x] **Supply Chain Attestation**: Automated CycloneDX SBOM (`bom.json`) and SLSA build provenance attestation on every `main` push.

---

## 2. Near-Term Milestones

### Milestone 1: Chrome Web Store Packaging & Submission (v1.1.0) [Delivered]
- [x] **Automated Release Packaging in CI**:
  - Add GitHub Actions step to package `dist/` into a pristine `knowthankyew-extension-v1.1.0.zip`.
  - Attach zip bundle directly to GitHub Releases alongside `bom.json`.
- [x] **Store Marketing & Listing Assets**:
  - Produce required store graphic assets: 1280x800 marquee promo tile, 440x280 small promo tile, verified crisp 16/48/128 icon assets.
  - Finalize store copy from [`CHROMEWEBSTORE.md`](CHROMEWEBSTORE.md) highlighting zero host permissions.
- [x] **Static Privacy Policy Host**:
  - Deploy a static, cookie-less, zero-analytics privacy policy page (via GitHub Pages) required by Google Web Store Developer Program Policies.
- [x] **Web Store Review & Publication**:
  - Successfully reviewed, approved, and published live on Chrome Web Store: [`https://chromewebstore.google.com/detail/knowthankyew-reality-engi/pbgjjgggmeecalifcgggiondfminilnl`](https://chromewebstore.google.com/detail/knowthankyew-reality-engi/pbgjjgggmeecalifcgggiondfminilnl).

### Milestone 2: Automated Contract Discovery & 1-Click Audit (v1.2.0) [Delivered]
- [x] **Governing Legal Link Discovery**:
  - Automatically detect Terms of Service, Privacy Policies, Arbitration Clauses, and ROSCA disclosures in page footers and headers.
  - Provide 1-click audit navigation and discovered links cards in the popup.
- [x] **Dynamic Checkout MutationObserver**:
  - Automatically re-evaluate fine print on dynamic DOM mutation (accordions, modal expansions).

### Milestone 3: Engine Dashboard & Cross-Domain Burn Manager (v1.3.0) [Delivered - Live on CWS]
- [x] **Full-Page Options Dashboard**:
  - VS Code extension-styled options page with live memory/storage usage meters (`chrome.storage.local.getBytesInUse()`).
- [x] **Nuclear Amnesia Across All Domains**:
  - Global master burn clearing all local storage, volatile telemetry buffers, and broadcasting DOM observer teardown across all open tabs.

### Milestone 4: Declarative Policy Packs & Local Assist Reality Engine (v1.4.0) [Release Candidate Ready]

> [!NOTE]
> **Release Candidate Status**: All baseline issues and invariant audits are complete. 85/85 tests pass across unit, ReDoS, invariant, adversarial DOM, and Puppeteer real-Chromium suites. The zero-egress production build is packaged as `knowthankyew-extension-v1.4.0.zip` ready for Chrome Web Store manual upload.
- [x] **Declarative JSON Policy Packs**:
  - Decouple statutory rules into structured JSON packs (`us-federal.json`, `state-arl.json`) with automated regex compilation.
- [x] **Automated Statutory Regulatory Monitor**:
  - Weekly GitHub Action querying the official Federal Register API to detect rule amendments (ROSCA, Negative Option, Click-to-Cancel, Arbitration).
  - Draft Pull Request workflow with official citation diffs for human attorney review.
- [x] **2-Stage Legal Link Discovery Cascade**:
  - Fast DOM heuristic extractor coupled with loopback semantic reranker (`http://127.0.0.1:8420`) to prioritize consumer agreements over merchant/courier terms.
- [x] **Hard Burn Protocol Handshake**:
  - Fire-and-forget `POST /burn` endpoint contract wiping external worker prompt context and KV cache on Nuclear Amnesia wipe.
- [x] **Compile-Time Air-Gap Invariant Preservation**:
  - `vite.config.ts` dead-code eliminates `fetch()` calls in production Chrome Web Store builds, preserving `connect-src 'none'`.
- [ ] **Chrome Built-in Prompt API Provider (`ai.languageModel` / Gemini Nano)**:
  - Add zero-setup in-browser Prompt API provider implementing `LocalMLProvider`.
  - Implement 4-state availability model (`ready`, `downloading`, `unsupported`, `disabled`) reflecting Chrome version and device hardware capability gates.
  - Enable mainstream CWS users to benefit from neural link disambiguation without running an external loopback daemon.
- [ ] **WebGPU / WASM ONNX Runtime Integration**:
  - Mount `onnxruntime-web` inside an MV3 `chrome.offscreen` canvas document or Web Worker.
  - Load the 157.2 MB INT8 quantized `SmolLM2-135M` model (trained and exported via `event-driven-ftaas`).

### Milestone 3: International Jurisdiction Packs (v1.3.0)
- [ ] **UK Digital Markets, Competition and Consumers Act 2024**:
  - Add statutory rules covering statutory 14-day cooling-off reminders and mandatory pre-renewal disclosure schedules.
- [ ] **EU Consumer Rights Directive (Directive 2011/83/EU)**:
  - Add rules detecting pre-ticked subscription boxes (banned across the EU) and non-compliant cancellation mechanisms.
- [ ] **State ARL Expansion**:
  - Add specific statutory alerts for Colorado, Illinois (ACRA), and Oregon auto-renewal notification thresholds.
- [ ] **In-Popup Jurisdiction Selector**:
  - Allow user to toggle between US Federal/State, UK, and EU regulatory frameworks.

### Milestone 4: Cross-Browser Manifest Support (v1.4.0)
- [ ] **Mozilla Firefox (Gecko)**:
  - Build target with `browser_specific_settings` in `manifest.json`.
  - Validate against Mozilla Add-on Policies (AMO).
- [ ] **Apple Safari (macOS / iOS)**:
  - Convert via `xcrun safari-web-extension-converter`.
  - Native macOS companion packaging.

---

## 3. Long-Term Vision: v2.0.0 (Ambient Consumer Defense)
- [ ] **Context-Aware Inline Visual Indicators**:
  - Inject subtle, non-intrusive red/amber shield indicators directly beside predatory consent checkboxes and deceptive terms toggles.
  - Pure CSS styling with zero host page layout disruption.
- [ ] **Multi-Tab Session Amnesia Coordinator**:
  - Broadcast Hard Burn events across all open browser windows via `chrome.runtime.onMessage` to guarantee simultaneous cross-tab sanitization.

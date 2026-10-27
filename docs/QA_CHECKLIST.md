# KnowThankYew Reality Engine v2.1.0 — QA & Verification Checklist

> **Purpose**: Comprehensive, step-by-step hands-on QA guide for verifying the KnowThankYew Reality Engine **v2.1.0** release candidate across **Chrome**, **Firefox**, and **Apple Safari** (while **v1.6.0** remains the live baseline on the Chrome Web Store and Firefox AMO).

---

## 📋 Section 1: Automated Health, Claims Linter & Invariant Verification

Run these automated checks first to confirm the build environment, zero-egress invariants, architecture diagrams, and statutory policy packs are 100% green before interactive browser testing:

- [ ] **1.1 Complete Vitest Test Suite (25 Suites / 196 Tests)**
  ```bash
  npm test
  ```
  *Verify*: All 25 test files pass with `0` failures across all 196 unit, ReDoS, bundle invariant, claims linter, adversarial DOM, and Chromium E2E tests.

- [ ] **1.2 Automated Claims, Architecture Diagram & Portfolio Parity Audit**
  ```bash
  npm run audit:claims
  node scripts/audit-claims.mjs --require-brief
  ```
  *Verify*: Reports `[PASS]` for all 6 audit gates:
  1. Zero remote egress (`connect-src 'none'`, zero network primitives in runtime and production bundles).
  2. Store metadata & manifest parity (`package.json` ⇄ `manifest.json` ⇄ `public/manifest.json` ⇄ `docs/CHROMEWEBSTORE.md` ⇄ `ROADMAP.md` ⇄ `SHA256SUMS`).
  3. Zero prohibited marketing vocabulary across Markdown docs, HTML docs, and React UI components.
  4. Statutory policy pack schema, `safe-regex` ReDoS safety, and `@knowthankyew/policy-packs/subscriptions` parity across all 4 packs (`us-federal`, `state-arl`, `uk-dmcc`, `eu-crd`).
  5. Architecture diagram metadata (`<!-- diagram-meta -->`), referenced file existence, and dependency count parity in `docs/ARCHITECTURE.md`.
  6. Portfolio Master Brief test count and suite inventory parity (`196/196 Tests`, `25 test files`).

- [ ] **1.3 Multi-Browser Production Builds & Release Packaging**
  ```bash
  npm run package:all
  ```
  *Verify*:
  1. `dist/`, `dist-firefox/`, `dist-safari/`, and `dist-local-assist/` compile cleanly with zero TypeScript or Vite errors.
  2. All 4 release archives are created in the repository root and `SHA256SUMS` is automatically refreshed:
     - `knowthankyew-extension-v2.1.0.zip` (Chrome Web Store)
     - `knowthankyew-extension-v2.1.0-firefox.zip` (Mozilla Firefox / AMO)
     - `knowthankyew-extension-v2.1.0-safari.zip` (Apple Safari Web Extension)
     - `knowthankyew-extension-v2.1.0-local-assist.zip` (Developer Local ML Assist)

- [ ] **1.4 Cryptographic Checksum Validation**
  ```bash
  shasum -a 256 -c SHA256SUMS
  ```
  *Verify*: Output reports `OK` for all 4 versioned `.zip` archives with zero checksum mismatches.

- [ ] **1.5 Physical Zero-Egress Bundle Scan**
  ```bash
  grep -rEn "fetch\(|WebSocket|sendBeacon|XMLHttpRequest|EventSource|importScripts|/v1/traces|__KTY_TEST_HOOK_" dist dist-firefox dist-safari --include='*.js'
  ```
  *Verify*: Exit code `1` (`0` matches found). Confirms physical zero-egress across all consumer distribution bundles.

---

## 🌐 Section 2: Live Browser Extension Loading & Checkout Fixture Testing

Start the built-in local fixture server:
```bash
npm run demo
```
*(Server listens on `http://localhost:3000` and opens `http://localhost:3000/demo.html`).*

### Load the Unpacked Extension in Chrome / Chromium:
1. Navigate to `chrome://extensions`.
2. Toggle **Developer mode** on (top-right).
3. Click **Load unpacked** and select the `dist/` folder inside your `knowthankyew-extension` repository checkout.
4. Pin **KnowThankYew Reality Engine** to your browser toolbar.

- [ ] **2.1 User-Initiated Scan & Toolbar Badge Activation (`activeTab` Model)**
  - Open `http://localhost:3000/demo.html`.
  - *Verify Least-Privilege Idle State*: Before clicking the extension icon, no content script is injected (the extension has no passive `content_scripts` manifest entry).
  - Click the **KnowThankYew** shield icon in the browser toolbar to open `popup.html`.
  - *Verify*:
    - The popup injects `content/scanner.js` on demand, scans the page, and updates the extension toolbar badge for this tab to **`2`** in high-contrast red (`#ef4444`), representing the **2 Critical** statutory violations (`AR-001` Automatic Subscription Renewal and `AR-002` Asymmetric Cancellation Obstacle), alongside **5 Warning** findings (`ARB-001`, `ARB-003`, `ARB-002`, `SURV-001`, `CRD-001`) and **1 Info** finding (`UNI-001`).

- [ ] **2.2 Inspect Ambient Closed Shadow DOM Badges**
  - Look at the two pre-ticked consent checkboxes inside the checkout card on `http://localhost:3000/demo.html`:
    - **Checkbox 1 (`#consent-auto-renew` — Continuous Auto-Renewal)**: A red shield badge **`⚠ Trap`** (`#ef4444`) floats immediately adjacent to the checkbox.
    - **Checkbox 2 (`#consent-arbitration` — Mandatory Binding Arbitration & Class Action Waiver)**: An amber shield badge **`⚠ Risk`** (`#f59e0b`) floats immediately adjacent to the checkbox.
  - **Inspect in DevTools**:
    - Right-click either badge and select **Inspect**.
    - Verify the host element is `<span data-kty-indicator-host="true">` containing `#shadow-root (closed)`.
    - Run the following in the page's DevTools console:
      ```javascript
      document.querySelectorAll('[data-kty-indicator-host]').length // Expected: 2
      document.querySelector('[data-kty-indicator-host]').shadowRoot // Expected: null
      ```
    - *Verify*: `shadowRoot` returns `null`, confirming host scripts cannot read or tamper with internal badge nodes.

- [ ] **2.3 Popup Risk Meter, BS Translator Tiers & 25-Day Calendar Reminder**
  - In `popup.html` on `demo.html`, verify:
    - **Risk Assessment Banner & Stats**: Displays **`Predatory Terms Detected`** (`100/100`) with summary stat boxes **`2 Problem`**, **`5 Watch out`**, and **`8 Total`**.
    - **BS Translator Human-Centric Severity Badges**:
      - **`This is a problem`** (Red / `CRITICAL`): Automatic Subscription Renewal (`15 U.S.C. § 8403 (ROSCA)`) and Asymmetric Cancellation Obstacle (`15 U.S.C. § 45 (FTC Act § 5)`).
      - **`Watch out`** (Amber / `WARNING`): Mandatory Binding Arbitration (`9 U.S.C. § 2 (FAA)`), Class Action Waiver, Jury Trial Waiver, Pre-Ticked Consent / Negative Option Box (`Directive 2011/83/EU Art. 22`), and Third-Party Data Sharing / Sale (`Cal. Civ. Code § 1798.120 (CCPA/CPRA)`).
      - **`FYI`** (Blue / `INFO`): Unilateral Modification of Terms (`Restatement (Second) of Contracts § 77`).
    - **Pre-Renewal Calendar Reminder**: On the Automatic Subscription Renewal card, verify the **"📅 Add 25-Day Cancel Reminder"** link generates a zero-permission Google Calendar template link set 25 days out.
    - **Discovered Legal Agreements**: Verify the 4 footer links (`Terms of Service`, `Dispute Resolution & Arbitration`, `Subscription & Billing Terms`, `Privacy Policy`) appear under **Discovered Legal Agreements (4)** with **"Open & Scan ↗"** buttons.

- [ ] **2.4 Dynamic SPA DOM Mutation Reaction**
  - On `http://localhost:3000/demo.html`, click the blue **"⚡ Inject Dynamic Terms (Test MutationObserver)"** button.
  - *Verify*:
    - Within ~450ms (400ms debounce), the injected `MutationObserver` detects the dynamically added free-trial conversion clause (`AR-003` — Free Trial Auto-Conversion, `CRITICAL`) without a page reload.
    - The extension toolbar badge automatically increments from **`2`** to **`3`**.
    - Clicking **"↻ Rescan Tab"** (or reopening the popup) updates the stat pill to **`3 Problem`** (`9 Total`).

- [ ] **2.5 Clean-State "Proof of Work" Receipt (`AuditReceiptCard`) & Sparse Scan Guard (`SparseScanWarning`)**
  - **Part A — Clean-State Proof of Work Receipt**:
    1. On `http://localhost:3000/demo.html`, open the page DevTools console and replace the predatory terms with a clean, standard agreement (> 250 characters):
       ```javascript
       document.querySelector('.terms').innerHTML = '<p>' + 'This software purchase agreement grants a perpetual one-time license with no recurring charges, full access to public courts, and zero third-party data sharing. '.repeat(3) + '</p>';
       document.querySelector('.consent-group')?.remove();
       ```
    2. Open `popup.html` and click **"↻ Rescan Tab"**.
    3. *Verify*:
       - Risk Assessment banner updates to **`Clean / Low Risk`** (`0/100`), stat boxes show `0 Problem`, `0 Watch out`, `0 Total`, and the toolbar badge clears to `""`.
       - Renders **`✓ Clean Scan — Proof of Work Verified`** (`AuditReceiptCard`) showing:
         - Quantitative telemetry grid: **`CHARS EVALUATED`**, **`WORDS (EST.)`**, **`CLAUSE SEGMENTS`**, and **`DOM CONTAINERS`** (`div.terms.legal.agreement`) plus local scan duration (`~...ms local scan`).
         - **Statutory Pass Checklist** (all 5 checks green: ROSCA, FAA, Unilateral Terms, CCPA/CPRA, EU CRD / UK DMCC 2024).
         - Click **"▶ Inspect Evaluated Text Sample (Sanitized)"** to verify the collapsible redacted text preview.
  - **Part B — Sparse Content / Indeterminate Scan Guard**:
    1. In the page DevTools console, reduce page text below the 250-character watermark:
       ```javascript
       document.body.innerHTML = '<main><p>Short landing page.</p></main>';
       ```
    2. Open `popup.html` and click **"↻ Rescan Tab"**.
    3. *Verify*: Suppresses the green clean receipt and renders the amber **`⚠️ Sparse Content / Indeterminate Scan`** (`SparseScanWarning`) card explaining that fewer than 250 substantive characters were found.

---

## 📄 Section 3: Universal Document Auditing & PDF Parsing

- [ ] **3.1 Chromium Native PDF Tab Detection & Quick-Paste Scratchpad**
  - Open any `.pdf` URL in a browser tab (e.g., `https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf` or a local `.pdf` file).
  - Click the KnowThankYew toolbar icon to open `popup.html`:
    - *Verify*: Instead of a generic injection failure, the popup renders the blue **`📄 PDF Agreement Detected`** card with an auto-focused **Zero-Permission Quick-Paste Scratchpad**.
    - Copy any contract clause (e.g. `"Your subscription automatically renews each month unless you call to cancel."`) and press **`Cmd+V`** (or `Ctrl+V`) inside the scratchpad.
    - *Verify*: The `onPaste` handler immediately evaluates the pasted text locally in `<5ms` and renders the full risk score and statutory `TrapCard` breakdown without requiring clipboard permissions.

- [ ] **3.2 Full-Page Contract Auditor Dashboard (`options.html#document`)**
  - In `popup.html`, click **"📄 Audit File / PDF"** in the top-right header (or **"Open Full Document & File Uploader ↗"** inside the PDF card).
  - *Verify*: Opens `options.html#document` directly on the **`📄 Document & Contract Auditor`** tab.
  - Test both **Drag & Drop / File Upload** (`.pdf`, `.txt`, `.md`, `.html`) and **Direct Text Paste** + **"🔍 Audit Contract Text"**:
    - *Verify*: Displays composite risk score, statutory findings cards, and clean-state Proof of Work receipts entirely offline.

- [ ] **3.3 Malformed Stream & PDF Decompression Bomb Defenses**
  - Attempt to upload a file exceeding `10 MB` or a corrupt binary disguised as a `.pdf`.
  - *Verify*: Rejects oversized payloads cleanly (`File exceeds 10MB local processing limit`) and bounds FlateDecode stream inflation (`MAX_DECOMPRESSED_STREAM_BYTES = 10MB`) without freezing the UI thread.

---

## 🤝 Section 4: Ephemeral Remedy Handoff & Nuclear Hard Burn Amnesia

- [ ] **4.1 Portfolio Specialist Handoff Export**
  - Reload `http://localhost:3000/demo.html`, open `popup.html`, and locate the **"Take Action: Dispute or Cancel"** banner (or individual `TrapCard` action footers).
  - Click **"Launch Rights Advocate →"** (or **"Defend Rights →"** on a specific card).
  - *Verify*:
    - In production mode, verify clicking the button opens the destination tool repository tab (`https://github.com/knowthankyew/...`); in local developer mode (`localhost:3000`), verify it opens `http://localhost:300X?kty_handoff=1` and injects the sanitized payload (`domain`, `scanTimestamp`, `findings`, `primaryLegalLink`, `summary`) into ephemeral `sessionStorage`.
    - Inspect `sessionStorage.getItem('kty_handoff')` in the destination tab (local dev mode): confirm `domain`, `scanTimestamp`, `findings`, `primaryLegalLink` (stripped of query strings, hashes, and credentials), and `summary` are populated in ephemeral `sessionStorage` only, and confirm that `findings` contain strictly sanitized snippets (with all PII such as credit cards and emails redacted) and no raw un-redacted page text.

- [ ] **4.2 Nuclear Hard Burn Multi-Context Destruction**
  - Keep `http://localhost:3000/demo.html` open in Tab 1 (with active Closed Shadow DOM badges and toolbar badge `2`) and open `options.html` in Tab 2.
  - **Part A — Test Popup Burn**: Click **"🔥 HARD BURN"** in the `popup.html` footer:
    - *Verify*: Button flashes **`✓ AMNESIA ENGAGED`**, popup transitions to the **`🔥 Session Memory Incinerated`** state, toolbar badge on Tab 1 clears to `""`, and all `[data-kty-indicator-host]` Closed Shadow DOM badges on `demo.html` disappear.
  - **Part B — Test Options Cross-Domain Burn**:
    1. Reload `http://localhost:3000/demo.html` in Tab 1 and click the KnowThankYew toolbar icon to re-scan the page so active Closed Shadow DOM badges and toolbar badge `2` are restored.
    2. Switch to `options.html` in Tab 2 (on the **`🔥 Memory & Cross-Domain Burn`** tab) and click **"🔥 BURN ALL DATA ACROSS ALL DOMAINS"**:
    - *Verify*: Button transitions to **`✓ ALL DATA INCINERATED ACROSS ALL DOMAINS`** and confirmation banner appears.
  - *Verify instantaneous multi-context teardown across both paths*:
    1. Toolbar badge on `demo.html` is immediately wiped to `""`.
    2. All `<span data-kty-indicator-host="true">` Closed Shadow DOM badges on `demo.html` are immediately removed (`document.querySelectorAll('[data-kty-indicator-host]').length === 0`).
    3. Clicking **"⚡ Inject Dynamic Terms (Test MutationObserver)"** on `demo.html` no longer triggers scans because the `MutationObserver` is disconnected and `hardBurned` tombstone is active.
    4. `chrome.storage.local` usage meter in `options.html` reads **`0 B`** and active memory spans read **`0 spans`**.

---

## 🤖 Section 5: Local ML Assist Loopback Worker (Optional Sidecar)

Start the reference local loopback worker:
```bash
npm run ml:serve
```
*(Listens on `http://127.0.0.1:8420`, handling `GET /health`, `POST /analyze`, `POST /explain`, `POST /classify-links`, and `POST /burn`).*

- [ ] **5.1 Load Local Assist Extension Build**
  - In `chrome://extensions`, click **Load unpacked** and select the `dist-local-assist/` folder inside your `knowthankyew-extension` repository checkout.
  - Open `options.html` (on the **`🔥 Memory & Cross-Domain Burn`** tab) and locate the **Local ML Assist (Loopback Worker)** status card.
  - *Verify*: Status badge displays **`● Connected (127.0.0.1:8420)`** in emerald green.

- [ ] **5.2 Popup Local Assist Badge & `/burn` Handshake**
  - Open `popup.html` on `http://localhost:3000/demo.html`:
    - *Verify*: Header displays the emerald **`Local Assist`** badge.
  - Click **"🔥 HARD BURN"** in `popup.html` (or **"🔥 BURN ALL DATA ACROSS ALL DOMAINS"** in `options.html`):
    - *Verify*: The terminal running `npm run ml:serve` logs `[Local ML Worker] 🔥 HARD BURN executed. Purged ... in-memory prompt contexts.`

---

## 🍎 Section 6: Safari Web Extension Conversion & Submission QA (macOS / iOS)

- [ ] **6.1 Inspect Safari Target Bundle (`dist-safari/`)**
  - Inspect `dist-safari/manifest.json`:
    - *Verify*: `manifest_version: 3`, `version: "2.1.0"`, `version_name: "2.1.0"`.
    - *Verify*: Does **not** contain Gecko-only `browser_specific_settings`.
    - *Verify*: `content_security_policy.extension_pages` enforces `default-src 'self'; script-src 'self'; object-src 'none'; connect-src 'none'`.

- [ ] **6.2 Apple Safari Web Extension Converter Verification**
  Run Apple's converter CLI to generate the Xcode wrapper project:
  ```bash
  rm -rf /tmp/kty-safari
  xcrun safari-web-extension-converter dist-safari \
    --project-location /tmp/kty-safari \
    --app-name "KnowThankYew" \
    --bundle-identifier "org.knowthankyew.reality-engine" \
    --swift \
    --no-open
  ```
  *Verify*: Generates `/tmp/kty-safari/KnowThankYew/KnowThankYew.xcodeproj` cleanly with zero manifest warnings.

- [ ] **6.3 Xcode App Sandbox Entitlements & `PrivacyInfo.xcprivacy` Audit**
  - Before archiving in Xcode for App Store Connect:
    1. **Network Entitlements**: Confirm `com.apple.security.network.client` is **disabled / absent** on the Safari Web Extension target (consumer build is 100% air-gapped).
    2. **Apple Privacy Manifest (`PrivacyInfo.xcprivacy`)**: Confirm the bundle includes `PrivacyInfo.xcprivacy` with:
       - `NSPrivacyTracking`: `false`
       - `NSPrivacyTrackingDomains`: `[]`
       - `NSPrivacyCollectedDataTypes`: `[]`
       - `NSPrivacyAccessedAPITypes`: `[]`

- [ ] **6.4 Interactive Safari Runtime QA Pass**
  1. In Xcode, build and run the `KnowThankYew (macOS)` scheme (`⌘R`).
  2. In Safari → **Settings** → **Advanced**, enable **"Show features for web developers"**.
  3. In Safari's **Develop** menu, enable **"Allow Unsigned Extensions"**, then enable **KnowThankYew Reality Engine** in Safari → **Settings** → **Extensions**.
  4. Navigate to `http://localhost:3000/demo.html` in Safari and click the KnowThankYew toolbar icon (granting active-tab access when prompted):
     - *Verify*: Closed Shadow DOM badges (`⚠ Trap` and `⚠ Risk`) render cleanly next to both checkboxes in WebKit.
     - *Verify*: Opening `options.html#document` and uploading a `.pdf` or `.txt` contract executes locally in WebKit without console errors.
     - *Verify*: Clicking **"🔥 HARD BURN"** broadcasts over `BroadcastChannel('kty_hard_burn')` and removes all Closed Shadow DOM badges and cached state in Safari.

---

## 🦊 Section 7: Mozilla Firefox / Gecko AMO Parity Pass

- [ ] **7.1 Inspect Firefox Target Bundle (`dist-firefox/`)**
  - Inspect `dist-firefox/manifest.json`:
    - *Verify*: `browser_specific_settings.gecko.id` is `"reality-engine@knowthankyew.org"` and `strict_min_version` is `"109.0"`.
    - *Verify*: `background.scripts` includes `["background/service-worker.js"]` alongside `service_worker` for Gecko MV3 compatibility.

- [ ] **7.2 Load Temporary Add-on in Firefox**
  - Open Firefox, navigate to `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on...**, and select `dist-firefox/manifest.json`.
  - Navigate to `http://localhost:3000/demo.html`, click the toolbar icon, and verify findings, Closed Shadow DOM badges, and Hard Burn teardown match Chrome and Safari.

---

## 🧪 Section 8: Exploratory & Adversarial Edge Cases

- [ ] **8.1 Host CSS Infection Test**: On `http://localhost:3000/demo.html`, inject a global universal stylesheet rule via the DevTools console:
  ```javascript
  document.head.insertAdjacentHTML('beforeend', '<style>* { color: lime !important; font-size: 40px !important; }</style>');
  ```
  *Verify*: While host page text turns huge and lime green, the Closed Shadow DOM badges (`⚠ Trap`, `⚠ Risk`) retain their isolated `11px` system font and high-contrast colors unaffected by host page CSS.
- [ ] **8.2 Tab Isolation Integrity**: Open `http://localhost:3000/demo.html` in Tab A (badge reads `2`) and `https://example.com` in Tab B. Switch between tabs and verify the badge count is strictly tab-scoped (`tabId`) and never bleeds across tabs.
- [ ] **8.3 Zero-Network Negative Control**: Open `options.html`, open DevTools Console, and run:
  ```javascript
  fetch('https://example.com')
  ```
  *Verify*: Browser immediately rejects the request with a Content Security Policy violation (`connect-src 'none'`).

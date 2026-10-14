# KnowThankYew Reality Engine v2.1.0 — QA & Verification Checklist

> **Purpose**: Step-by-step hands-on testing guide for evaluating the KnowThankYew Reality Engine v2.1.0 across Chrome, Firefox, and Safari. Feel free to wander off-script at any point!

---

## 📋 Section 1: Automated Health & Invariant Verification

Run these automated checks first to verify that the build environment, zero-egress invariants, and statutory policy packs are 100% green before interactive browser testing:

- [ ] **1.1 Complete Vitest Test Suite (25 Suites / 192 Tests)**
  ```bash
  cd /Users/cl0rkster/Dev/knowthankyew-extension
  npm test
  ```
  *Verify*: All 25 test files pass with `0` failures across all 192 unit, adversarial DOM, and Chromium E2E tests.

- [ ] **1.2 Multi-Browser Production Builds & Zero-Egress Invariant Check**
  ```bash
  npm run package:all
  ```
  *Verify*:
  1. `dist/`, `dist-firefox/`, `dist-safari/`, and `dist-local-assist/` compile cleanly with zero TypeScript errors.
  2. All 4 release archives are created in the repo root:
     - `knowthankyew-extension-v2.1.0.zip`
     - `knowthankyew-extension-v2.1.0-firefox.zip`
     - `knowthankyew-extension-v2.1.0-safari.zip`
     - `knowthankyew-extension-v2.1.0-local-assist.zip`

- [ ] **1.3 Cryptographic Checksum Validation**
  ```bash
  shasum -a 256 -c SHA256SUMS
  ```
  *Verify*: Output reports `OK` for all 4 archives with zero checksum mismatches.

- [ ] **1.4 Absolute Zero-Egress Codebase Scan**
  ```bash
  grep -rEn "fetch\(|WebSocket|sendBeacon|XMLHttpRequest|EventSource|importScripts" dist dist-firefox dist-safari --include='*.js'
  ```
  *Verify*: Exit code 1 (0 matches found). Demonstrates mathematical zero-egress across all production distribution outputs.

---

## 🌐 Section 2: Live Browser Extension Loading & Checkout Fixture Testing

Start the built-in local fixture server:
```bash
npm run demo
```
*(Server listens on `http://localhost:3000` with fixture at `http://localhost:3000/demo.html`).*

### Load the Extension in Your Browser:
- **Chrome / Chromium**:
  1. Navigate to `chrome://extensions`.
  2. Toggle **Developer mode** on (top-right).
  3. Click **Load unpacked** and select the `/Users/cl0rkster/Dev/knowthankyew-extension/dist` folder.
  4. Note the Extension ID and pin KnowThankYew to your toolbar.

- [ ] **2.1 Navigate to Demo Checkout Fixture**
  - Open `http://localhost:3000/demo.html` in your browser.
  - Observe the extension toolbar badge: It should dynamically update to display `3` in high-contrast red (`#ef4444`).

- [ ] **2.2 Inspect Ambient Closed Shadow DOM Badges**
  - Look at the checkout form on the demo page:
    - Pre-ticked Subscription Checkbox: A red alert badge `⚠️ Auto-Renewal Warning` floats immediately adjacent to the checkbox.
    - Terms Toggle / Arbitration Clause: Warning badge annotates the mandatory binding arbitration section.
  - **Inspect in DevTools**:
    - Right-click the warning badge and choose **Inspect Element**.
    - Notice the container is `#shadow-root (closed)`.
    - Try running this in the browser console:
      ```javascript
      document.querySelector('kty-indicator-host').shadowRoot
      ```
    - *Verify*: Returns `null`. Host scripts cannot access or tamper with the indicator internals!

- [ ] **2.3 Dynamic SPA DOM Mutation Reaction**
  - In the demo page, click the **"Simulate Dynamic Terms Injection"** button.
  - *Verify*: The scanner observes the DOM insertion without a full page reload, re-scans automatically (debounced ~450ms), and updates the toolbar badge count.

- [ ] **2.4 Popup Proof-of-Work Quantitative Receipt**
  - Click the KnowThankYew extension icon in your browser toolbar to open `popup.html`.
  - *Verify the Receipt*:
    - **Composite Risk Score**: Visual color-coded gauge (e.g. `85/100 HIGH RISK`).
    - **Quantitative Telemetry**: Displays exact scanned length (chars), word count, segment count, inspected DOM containers (`['body']`), and scan duration in ms.
    - **Trap Findings Cards**:
      1. Mandatory Binding Arbitration Clause (US Federal / FAA 9 U.S.C. § 2).
      2. Dark Pattern Continuous Billing / Auto-Renewal (FTC ROSCA 15 U.S.C. § 8402).
      3. Pre-ticked Consent Option (EU CRD 2011/83/EU Art. 22).

---

## 📄 Section 3: Universal Document Auditing & PDF Parsing

- [ ] **3.1 Chromium Native PDF Tab Detection**
  - Open any local or remote PDF in a new tab (e.g. file URL or web PDF).
  - Click the KnowThankYew popup:
    - *Verify*: Instead of an error, the popup renders the specialized **Native PDF Notice**, explaining Chromium's process isolation boundaries.
    - Notice the auto-focused **Quick-Paste Scratchpad** (Cmd+V).
    - Paste any contract text directly into the scratchpad: it runs an immediate local audit and renders the full breakdown.

- [ ] **3.2 Full-Page Contract Auditor Dashboard**
  - From the popup, click **"Full Auditor ↗"**.
  - *Verify*: Opens `options.html#document` directly in a new tab, landing specifically on the **Document & Contract Auditor** tab.
  - Test drag-and-drop or file upload:
    - Upload any `.txt`, `.md`, or `.pdf` file.
    - Click **"Run Statutory Audit"**.
    - Verify instant offline risk scoring, statute breakdowns, and plain-English recommendations.

- [ ] **3.3 Malformed Stream & Zip Bomb Defenses**
  - Paste or upload a corrupt or extremely repetitive test payload (> 10MB or dense whitespace).
  - *Verify*: The engine rejects payloads exceeding 10MB without locking the main thread or crashing the tab.

---

## 🤝 Section 4: Ephemeral Remedy Handoff & Nuclear Hard Burn Amnesia

- [ ] **4.1 Portfolio Specialist Handoff Export**
  - In `popup.html` on a page with arbitration or auto-renewal findings:
  - Click **"Consult Remedy Tool ↗"** (routes to Bill of Rights Bot, CareCheck, or Lease-Audit).
  - In DevTools console for the popup, inspect the dispatched session payload:
    - *Verify*: Stripped of query strings, fragments, and sensitive user credentials (`user:pass@`).
    - *Verify*: Target tool ID is dynamically matched based on statutory finding categories.

- [ ] **4.2 Nuclear Hard Burn Atomic Destruction**
  - Open `options.html` in Tab 1 and keep `http://localhost:3000/demo.html` open in Tab 2.
  - Click the **"🔥 Nuclear Hard Burn"** button in either `popup.html` or `options.html`.
  - *Verify instantaneous multi-context purge*:
    1. Toolbar badge on Tab 2 is immediately cleared to blank `""`.
    2. All closed Shadow DOM badges on the demo page disappear immediately.
    3. Extension storage is wiped: `chrome.storage.local` contains 0 keys.
    4. In-memory scratchpads and document audit results reset to initial clean state.
    5. The burn confirmation pill flashes green (`● All Memory Purged`).

---

## 🤖 Section 5: Local ML Assist Loopback Worker (Optional)

Start the mock local AI worker:
```bash
npm run ml:serve
```
*(Worker listens on `http://127.0.0.1:8420`).*

- [ ] **5.1 Load Local Assist Extension Build**
  - In `chrome://extensions`, click **Load unpacked** and select `dist-local-assist/`.
  - Navigate to `options.html` under the **Pillars & Diagnostics** tab.
  - *Verify*: **Local ML Worker** card renders `● Connected` (green indicator).

- [ ] **5.2 Popup Local Assist Badge & Handshake**
  - Open `popup.html`:
  - Observe the header badge showing `● Local Assist (Loopback)`.
  - Perform a Hard Burn: Verify the terminal running `ml:serve` logs the `/burn` purge request.

---

## 🍎 Section 6: Safari Web Extension Conversion Readiness

- [ ] **6.1 Inspect Safari Target Bundle**
  - Check `dist-safari/manifest.json`:
    - *Verify*: Standard MV3 manifest, `version_name: "2.1.0"`.
    - *Verify*: Does not include Gecko-specific `browser_specific_settings`.
    - *Verify*: `connect-src 'none'` strictly preserved.

- [ ] **6.2 Apple Safari Converter Verification (macOS)**
  Run Apple's official conversion tool in dry-run mode:
  ```bash
  xcrun safari-web-extension-converter --no-open --project-location /tmp/kty-safari dist-safari
  ```
  *Verify*: Xcode project generates with 0 manifest errors and outputs valid macOS/iOS Safari extension app targets.

---

## 🧪 Section 7: "Off-Script" Exploratory Prompts & Edge Cases

Try these deliberate adversarial challenges to verify the engine fails closed and never leaks data:

- [ ] **Host CSS Infection Test**: On the demo page, run `document.body.style.cssText = "* { display: none !important; color: red !important; }"` in the console. Notice the closed shadow DOM badges maintain their isolated styling.
- [ ] **Blank Page Low-Watermark Test**: Open an empty page `about:blank`. Click popup: Verify the engine displays the amber **Sparse Content / Indeterminate Notice** because character count is under the 250-character threshold.
- [ ] **Tab Isolation Integrity**: Open two tabs with different domains. Ensure findings and badge counts from Tab A never bleed into Tab B.
- [ ] **Zero-Network Negative Control**: In the options page DevTools console, run:
  ```javascript
  fetch('https://example.com')
  ```
  *Verify*: Browser throws `EvalError: Refused to connect to 'https://example.com' because it violates the following Content Security Policy directive: "connect-src 'none'".`

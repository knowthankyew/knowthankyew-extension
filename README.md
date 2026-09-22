# KnowThankYew Reality Engine 🛡️
### Zero-egress consumer advocate in your browser toolbar.

> **Stop getting tricked by fine print.**  
> With a single click, KnowThankYew audits checkout screens, subscription signups, and terms-of-service agreements for predatory traps. It flags hidden recurring charges, impossible cancellation mazes, and clauses that strip your right to sue—**100% locally on your machine, with zero data sent to the cloud.**

[![CI](https://github.com/knowthankyew/knowthankyew-extension/actions/workflows/ci.yml/badge.svg)](https://github.com/knowthankyew/knowthankyew-extension/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](https://opensource.org/licenses/MIT)
[![Zero Egress Verified](https://img.shields.io/badge/Egress-0%20Bytes%20(Local%20Only)-10b981.svg)](https://github.com/knowthankyew/knowthankyew-extension/actions/workflows/ci.yml)

---

## The Kitchen Table Summary

When you buy software, stream a movie, or sign up for a free trial, teams of corporate lawyers have arranged the checkout page to trap you into continuous credit card charges and force you to waive your constitutional right to a jury trial.

**KnowThankYew evens the odds.**

1. **User-Initiated Audits & Contract Discovery**: The extension is not injected into every tab. When you reach a checkout, sign-up, or landing page, click the shield icon in your toolbar to inject the local scanner and analyze visible fine print. It automatically scans footers and domain structures to discover hidden governing agreements (Terms of Service, Binding Arbitration, Billing Policies), providing 1-click audit navigation. After activation, that tab may be monitored for dynamically inserted terms until the scanner is stopped or the tab is closed.
2. **Plain English Explanations**: Click any detected finding. It shows you the exact sentence they buried in the terms, what law or doctrine it touches, and what it actually means for your wallet.
3. **Zero Data Leaves Your Machine**: We don't have servers. We don't have accounts. We don't have analytics. Pages are analyzed strictly in your browser's local sandbox and nowhere else.
4. **The "Hard Burn" Red Button**: Finished buying? Click **"Burn Local Data"**. The extension clears its in-memory telemetry, popup/content-script scan state, local extension storage, and toolbar badges, then asks every open tab to stop its injected scanner. Cleanup is best-effort for tabs that are unavailable or do not contain the scanner.

---

## How to Install in 60 Seconds

### Option A: One-Click Install (Official Chrome Web Store)

👉 **[Add to Chrome from the Chrome Web Store](https://chromewebstore.google.com/detail/knowthankyew-reality-engi/pbgjjgggmeecalifcgggiondfminilnl)**

Click **"Add to Chrome"** (or Brave / Edge / Opera), then pin the shield icon to your toolbar.

---

### Option B: Offline / Unpacked Install (From Release Zip)

If you prefer installing directly from source without using the store:

1. **Download the Package**: 👉 **[knowthankyew-extension-v1.3.0.zip](https://github.com/knowthankyew/knowthankyew-extension/releases/download/v1.3.0/knowthankyew-extension-v1.3.0.zip)** *(or visit [Releases](https://github.com/knowthankyew/knowthankyew-extension/releases))*.
2. **Unzip** the archive into a folder on your computer.
3. Open `chrome://extensions` (or `brave://extensions`) in your browser.
4. Turn on **Developer mode** (top-right toggle).
5. Click **Load unpacked** and select the unzipped folder. Pin the shield icon to your toolbar.

---

## What It Catches (And Why It Matters)

| What You See | What's Actually Happening | The Legal Backbone |
| :--- | :--- | :--- |
| **"Start My Free Trial"** | You are silently enrolled in an auto-renewing subscription that bills your card automatically every month until you cancel. | **ROSCA (15 U.S.C. § 8403)** & State Automatic Renewal Laws (Cal. AB 2863, NY GBL § 527-a) |
| **"Call Us to Cancel"** | You can subscribe online with 1 click, but you must call a phone hotline during business hours to stop charges. | Symmetrical Cancellation Standards (**15 U.S.C. § 45 / FTC Act § 5** & Cal. Bus. & Prof. Code § 17602) |
| **"Dispute Resolution"** | You forfeit your right to join a class action or take the vendor to small claims court; you must submit to private binding arbitration. | **FAA § 2 (9 U.S.C. § 2)** & Fundamental Rights Waiver Auditing |
| **"Terms May Change"** | The vendor reserves the right to raise prices or change terms at any time without notifying you. | Common Law Contract Principles & Unilateral Discretion Doctrines |
| **"Personalized Partners"** | Your checkout info and location data can be sold or shared with data brokers and ad networks. | **Cal. Civ. Code § 1798.120 (CCPA/CPRA)** & State Privacy Disclosure Frameworks |

---

## How It Protects Your Privacy (The Zero-Egress Guarantee)

Unlike other "privacy" extensions that quietly send your browsing habits to analytics servers, **KnowThankYew cannot transmit data over the network**:

1. **Manifest-Level CSP**: We declare `connect-src 'none'` in the extension manifest. The Chromium browser physically forbids extension pages (popup, background worker) from making outbound network connections.
2. **Isolated Local Execution**: Scans run purely in the active tab's local context. Content scripts contain zero network primitives (`fetch`, `XMLHttpRequest`, `WebSocket`), verified via negative-control tests.
3. **Memory-Only Runtime State**: Operational telemetry is configured as `memory_only`; scan results are held in the popup and injected content-script contexts. The repository does not persist telemetry, document excerpts, URLs, or scan results to `chrome.storage.local`.
4. **Local Storage Is Not a Telemetry Database**: The extension requests the `storage` permission so the hard-burn routine can clear the extension's local storage namespace and to permit future local-only settings. The current release does not use `chrome.storage.local` as the source of truth for telemetry or scan results.
5. **Zero Cloud Infrastructure**: There is no remote backend, no user accounts, and no telemetry collection servers.

Read our complete, plain-language **[Privacy Policy](https://knowthankyew.github.io/knowthankyew-extension/)**.

---

## Interactive Live Test Page

Want to test how it works right now?
1. Open the live **[Interactive Test Fixture Page](https://knowthankyew.github.io/knowthankyew-extension/demo.html)** *(or run `npm run demo` locally)*.
2. Click the KnowThankYew shield icon in your toolbar to scan the page.
3. Review the plain-English breakdown of all detected trap clauses.
4. Click the blue button on the test page to dynamically inject a surprise clause. The activated tab's local `MutationObserver` may detect the change automatically; you can also hit **"↻ Rescan Tab"**.
5. Click **"Burn Local Data"** to clear memory and request scanner teardown across open tabs.

---

## For Developers & Contributors

If you want to build or inspect the source code locally:

```bash
# Clone the repository
git clone https://github.com/knowthankyew/knowthankyew-extension.git
cd knowthankyew-extension

# Install dependencies
npm install

# Run the test verification suite (unit + Puppeteer real-Chromium E2E + ReDoS audit)
npm test

# Build production bundle and package store zip
npm run package

# Run local demo checkout fixture
npm run demo
```

- **Architecture Details**: See [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- **Store Publication Spec**: See [`CHROMEWEBSTORE.md`](./CHROMEWEBSTORE.md)
- **Product Roadmap**: See [`ROADMAP.md`](./ROADMAP.md)
- **Legal Notice & Attributions**: See [`NOTICE.md`](./NOTICE.md)

---

## Disclaimer

> KnowThankYew Reality Engine is an automated text-pattern analysis tool intended solely for informational and educational consumer transparency. It does not provide legal advice, does not assess all contractual terms, and is not a substitute for qualified legal counsel.

---

## License

Open source under the [MIT License](./LICENSE). Built for individual consumer sovereignty.

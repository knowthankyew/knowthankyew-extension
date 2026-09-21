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

1. **Zero-Privilege On-Demand Audits**: We never spy on your browsing in the background. When you reach a checkout, sign-up, or terms page, click the shield icon in your toolbar to instantly extract visible text and flag predatory clauses.
2. **Plain English Explanations**: Click any detected finding. It shows you the exact sentence they buried in the terms, what law or doctrine it touches, and what it actually means for your wallet.
3. **Zero Data Leaves Your Machine**: We don't have servers. We don't have accounts. We don't have analytics. Pages are analyzed strictly in your browser's local sandbox and nowhere else.
4. **The "Hard Burn" Red Button**: Finished buying? Click **"Burn Local Data"**. The extension wipes its own memory clean and goes into complete amnesia.

---

## How to Install in 60 Seconds (No Coding Required)

Until our Chrome Web Store listing goes live, you can install the extension in 3 simple steps:

### Step 1: Download the Pre-Built Package
👉 **[Click Here to Download: knowthankyew-extension-v1.1.0.zip](https://github.com/knowthankyew/knowthankyew-extension/releases/download/v1.1.0/knowthankyew-extension-v1.1.0.zip)**  
*(Or visit the [Official Releases Page](https://github.com/knowthankyew/knowthankyew-extension/releases)).*

Double-click the downloaded `.zip` file to unzip it into a folder.

> **Integrity Verification (Optional):**  
> You can verify the build archive matches our signed release:  
> `shasum -a 256 knowthankyew-extension-v1.1.0.zip`

### Step 2: Open Extensions in Chrome or Brave
In your address bar, type:
```text
chrome://extensions
```
*(If you use Brave, you can also type `brave://extensions`)*

### Step 3: Turn on Developer Mode & Load the Folder
1. In the top-right corner, switch the **Developer mode** toggle to **ON**.
2. Click the **Load unpacked** button in the top-left toolbar.
3. Select the unzipped folder.
4. **Done!** Click the puzzle piece icon on your browser toolbar and click the **Pin** icon next to **KnowThankYew Reality Engine**.

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

1. **Manifest-Level CSP**: We declare `connect-src 'none'` in the extension manifest. The Chromium browser physically forbids extension pages (popup, background worker) from making outbound network calls.
2. **Isolated Local Execution**: Scans run purely in the active tab's local context. Content scripts contain zero network primitives (`fetch`, `XMLHttpRequest`, `WebSocket`), verified via negative-control Chromium tests in CI.
3. **No Cloud Sync**: All volatile states and metrics use `chrome.storage.local` exclusively, ensuring data is never synchronized to Google or browser cloud accounts.
4. **Zero Cloud Infrastructure**: There is no remote backend, no user accounts, and no telemetry collection servers.

Read our complete, plain-language **[Privacy Policy](https://knowthankyew.github.io/knowthankyew-extension/)**.

---

## Interactive Live Test Page

Want to test how it works right now?
1. Open the live **[Interactive Test Fixture Page](https://knowthankyew.github.io/knowthankyew-extension/demo.html)** *(or run `npm run demo` locally)*.
2. Click the KnowThankYew shield icon in your toolbar to scan the page.
3. Review the plain-English breakdown of all 4 detected trap clauses.
4. Click the blue button on the test page to dynamically inject a surprise clause, and hit **"↻ Rescan Tab"**.
5. Click **"Burn Local Data"** to clear memory.

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

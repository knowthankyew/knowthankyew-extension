# KnowThankYew Reality Engine 🛡️
### An uncompromising, air-gapped consumer advocate in your browser toolbar.

> **Stop getting tricked by fine print.**  
> KnowThankYew automatically scans checkout screens, subscription signups, and terms-of-service agreements the second you land on them. It flags hidden recurring charges, impossible cancellation mazes, and clauses that strip your right to sue—**all on your own device, with zero data sent to the cloud.**

[![CI](https://github.com/knowthankyew/knowthankyew-extension/actions/workflows/ci.yml/badge.svg)](https://github.com/knowthankyew/knowthankyew-extension/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](https://opensource.org/licenses/MIT)
[![Zero Egress Verified](https://img.shields.io/badge/Egress-0%20Bytes%20(Air--Gapped)-10b981.svg)](#how-it-protects-your-privacy)

---

## The Kitchen Table Summary

When you buy software, stream a movie, or sign up for a free trial, teams of corporate lawyers have arranged the checkout page to trap you into continuous credit card charges and force you to waive your constitutional right to a jury trial.

**KnowThankYew evens the odds.**

1. **It Watches Checkout Pages for You**: The moment a website tries to sneak an auto-renewal or an arbitration clause past you, the shield icon in your toolbar lights up with a red or amber warning badge.
2. **Plain English Explanations**: Click the shield. It shows you the exact sentence they buried in the terms, what law it touches, and what it actually means for your wallet.
3. **Zero Data Leaves Your Machine**: We don't have servers. We don't have accounts. We don't have analytics. Your documents and checkout pages are analyzed on your computer's own processor and nowhere else.
4. **The "Hard Burn" Red Button**: Finished buying? Click **"Burn Local Data"**. The extension wipes its own memory clean and goes into complete amnesia.

---

## How to Install in 60 Seconds (No Coding Required)

Until our Chrome Web Store listing goes live, you can install the extension in 3 simple steps:

### Step 1: Download the Pre-Built Package
👉 **[Download the Latest Release (knowthankyew-extension-v1.0.0.zip)](https://github.com/knowthankyew/knowthankyew-extension/releases/latest)**

*(Or download `knowthankyew-extension-production-package` from the latest [GitHub Actions build](https://github.com/knowthankyew/knowthankyew-extension/actions)).*

Double-click the downloaded `.zip` file to unzip it into a folder.

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
| **"Call Us to Cancel"** | You can subscribe online with 1 click, but you must call a phone hotline during business hours to stop charges. | Symmetrical Cancellation Standards (FTC Deceptive Practices & State ARLs) |
| **"Dispute Resolution"** | You forfeit your right to join a class action or take the vendor to small claims court; you must submit to private binding arbitration. | **FAA § 2** / Fundamental Rights Waiver Auditing |
| **"Terms May Change"** | The vendor reserves the right to raise prices or change terms at any time without notifying you. | Illusory Promise & Unilateral Discretion Doctrines |
| **"Personalized Partners"** | Your checkout info and location data can be sold or shared with data brokers and ad networks. | Cross-Context Surveillance Disclosures |

---

## How It Protects Your Privacy (The Air-Gap Guarantee)

Unlike other "privacy" extensions that secretly send your browsing habits to analytics servers, **KnowThankYew cannot spy on you even if we wanted to**:

1. **Browser-Enforced Blockade**: We declare `connect-src 'none'` in the extension manifest. The Chromium browser engine physically blocks this extension from making any internet connection.
2. **Zero Cloud Infrastructure**: There is no login, no password, no email collection, and no remote server database.
3. **Continuous Safety Audits**: Every update is automatically checked before release to guarantee zero tracking code exists.

Read our complete, plain-language **[Privacy Policy](https://knowthankyew.github.io/knowthankyew-extension/)**.

---

## Interactive Live Test Page

Want to test how it works right now?
1. Open our **[Interactive Test Fixture Page](./tests/demo.html)**.
2. Notice the shield badge immediately turns **RED** with a count of **`4`**.
3. Click the shield to read the breakdown.
4. Click the blue button on the page to inject a surprise clause and watch the badge automatically update in real time!
5. Click **"Burn Local Data"** to watch the badge vanish.

---

## For Developers & Contributors

If you want to build or inspect the source code locally:

```bash
# Clone the repository
git clone https://github.com/knowthankyew/knowthankyew-extension.git
cd knowthankyew-extension

# Install dependencies
npm install

# Run the 26-test verification suite (unit + Puppeteer real-Chromium E2E + ReDoS audit)
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

## License

Open source under the [MIT License](./LICENSE). Built for individual consumer sovereignty.

# Chrome Web Store Metadata & Publishing Reference

> Single source of truth for Chrome Web Store listing metadata, permissions justification, privacy disclosures, and publication readiness for **KnowThankYew Reality Engine**.

---

## 1. Store Listing Metadata

- **Extension Name**: KnowThankYew Reality Engine
- **Short Name**: KnowThankYew
- **Extension ID**: `pbgjjgggmeecalifcgggiondfminilnl`
- **Store Status**: **LIVE & APPROVED**
- **Live Chrome Web Store URL**: [https://chromewebstore.google.com/detail/knowthankyew-reality-engi/pbgjjgggmeecalifcgggiondfminilnl](https://chromewebstore.google.com/detail/knowthankyew-reality-engi/pbgjjgggmeecalifcgggiondfminilnl)
- **Summary / Teaser**:
  Instant consumer advocate in your toolbar. Flags hidden subscription traps, automatic renewal billing, and forced arbitration waivers in real-time with zero data collection.
- **Category**: Productivity / Privacy & Security
- **Version**: `1.3.0` (Live & Approved in Chrome Web Store) • `1.4.0` (Release Candidate Ready for Manual Upload)
- **Manual Upload ZIP**: `knowthankyew-extension-v1.4.0.zip` (SHA256: `209ef4b55879bc081ad30ade8d342934e71f1a1dd28a1e0c36e1c48cd1bde3cc`)
- **Support / Source URL**: https://github.com/knowthankyew/knowthankyew-extension

### Detailed Description (Store-Facing)

Browse the web with an invisible consumer protection advocate sitting quietly in your toolbar.

When you reach a checkout page, terms of service modal, or subscription signup, the KnowThankYew Reality Engine instantly scans the agreement fine print on your device and highlights critical legal traps before you submit your credit card or click "I Agree":

- **Automatic Renewal Traps**: Detects hidden continuous service commitments, negative-option billing, and promotional trial expirations under federal ROSCA standards (15 U.S.C. § 8403) and state Automatic Renewal Laws.
- **Symmetrical Cancellation Obstacles**: Flags dark patterns that force you to call customer service hotlines or mail physical letters to cancel subscriptions you purchased online.
- **Forced Arbitration & Class Action Bans**: Identifies mandatory binding arbitration clauses and class action waivers where companies force you to surrender your constitutional rights to a public trial.
- **Unilateral Contract Alterations**: Alerts you when a company claims the power to change prices or terms retroactively without your affirmative consent.
- **Third-Party Data Brokerage**: Discloses clauses where your personal data and browsing history may be sold or shared with commercial advertisers.

### Complete Privacy & Total Amnesia

Unlike commercial extensions that upload your browsing history to cloud analytics servers, the KnowThankYew Reality Engine operates under strict zero-egress invariants:

1. **100% On-Device Processing**: Contract evaluation runs entirely inside your browser tab sandbox. No document text, form inputs, or browsing history ever leave your device.
2. **Zero Network Egress (Browser Enforced for Extension Pages)**: Manifest CSP strictly enforces `connect-src 'none'` for all extension pages (popup and background worker), physically prohibiting `fetch`, XHR, WebSocket, or beacon dispatch at the browser engine level. (Note: Chromium's MV3 CSP applies to `extension_pages`, not content scripts; content script zero-egress is maintained via the absence of host permissions and verified by physical bundle auditing in CI).
3. **The Hard Burn Switch**: Click "Hard Burn" at any moment to instantly wipe local extension storage, flush memory buffers, and dereference in-memory state.

### Architectural Scope & Honest Limitations

In accordance with our brutalist transparency principles:
- **Visible DOM Text Only**: The engine analyzes visible DOM text extracted from the current active tab when you click the extension. It cannot follow external hyperlink chains (e.g., external "Terms & Conditions" URLs) or inspect opaque cross-origin iframes without explicit navigation.
- **No False Reassurance ("No Findings" ≠ "Safe")**: If zero clauses are flagged, the extension shows "No Findings" and clears badge indicators. It never shows a green "OK" or "Safe" stamp, because no regex scanner can guarantee that an uninspected external contract is free of predatory terms.
- **User-Initiated Tab Inspection**: Under the least-privilege `activeTab` permission model, the extension has zero access to any tab until you explicitly open the popup. Once invoked, a local MutationObserver monitors that specific tab for dynamic checkout modals and accordion expansions until closed or cleared via Hard Burn. It never tracks other tabs, background navigation, or browsing history.

---

## 2. Permissions Justification (For Chrome Web Store Reviewers)

| Permission | Technical Requirement | Plain-English Reviewer Justification |
| :--- | :--- | :--- |
| `activeTab` | Temporary access to current tab DOM | Required solely when the user clicks the extension icon to inspect the text of the active checkout or terms page for deceptive clauses. No background browsing is tracked. |
| `storage` | `chrome.storage.local` API | Required strictly to persist user-selected display preferences (such as risk badge thresholds) locally on the device. Never stores document text, personal data, or URLs. |
| `scripting` | `chrome.scripting.executeScript` API | Required to inject the local text analyzer into the active tab when explicitly requested by the user. |

*Note: The extension explicitly does NOT declare `<all_urls>` or any broad host permissions.*

---

## 3. Single Purpose & Privacy Compliance

- **Single Purpose Declaration**:
  "To analyze legal fine print, terms of service agreements, and checkout disclosure texts locally on the user's device, highlighting predatory subscription traps and forced arbitration waivers."
- **Data Collection Declaration**:
  - Personally Identifiable Information (PII): **NO**
  - Health Information: **NO**
  - Financial & Payment Information: **NO**
  - Authentication Information: **NO**
  - Personal Communications: **NO**
  - Location: **NO**
  - Web History: **NO**
  - User Activity / Analytics: **NO**
  - Website Content: **NO** (Processed purely in volatile memory during tab analysis; never stored or transmitted off-device).

---

## 4. Privacy Policy Text

```markdown
# Privacy Policy for KnowThankYew Reality Engine

Last Updated: September 20, 2026

The KnowThankYew Reality Engine is built on the principle that consumer protection tools must never surveil the consumers they protect.

1. No Data Collection: The extension does not collect, record, log, or transmit any personally identifiable information, browsing history, device identifiers, or form input values.
2. Local Sandbox Execution: All text segmentation, statutory rule matching, and risk assessments occur entirely in client-side memory on your local machine.
3. Zero Network Dispatch: The extension initiates no outbound network requests for analytics, user tracking, or document processing.
4. Instant Hard Burn: Users can incinerate all local configuration and session state instantly via the "Hard Burn" button in the extension popup.
```

---

## 5. Submission Checklist (CWS Developer Dashboard)

> Step-by-step guide to fill in every field in the Chrome Web Store Developer Dashboard.

### Prerequisites
- [ ] Register a CWS developer account ($5 one-time) at https://chrome.google.com/webstore/devconsole
- [ ] Enable GitHub Pages in repo settings (Settings → Pages → Source: "GitHub Actions")
- [ ] Verify privacy policy is live at `https://knowthankyew.github.io/knowthankyew-extension/privacy.html`

### Step 1: Get the Store ZIP
Locate `knowthankyew-extension-v1.4.0.zip` in the repository root or build locally:
```bash
npm run package
```
*(Package SHA256: `209ef4b55879bc081ad30ade8d342934e71f1a1dd28a1e0c36e1c48cd1bde3cc`)*

### Step 2: Upload Updated Package in Developer Dashboard
1. Go to https://chrome.google.com/webstore/devconsole
2. Click on **KnowThankYew Reality Engine** → **Package** → **Upload new package** → Upload `knowthankyew-extension-v1.4.0.zip`

### Step 3: Fill in Store Listing Tab
| Field | Value |
|:--|:--|
| **Extension Name** | KnowThankYew Reality Engine |
| **Summary** | Instant consumer advocate in your toolbar. Flags hidden subscription traps, automatic renewal billing, and forced arbitration waivers in real-time with zero data collection. |
| **Description** | _(Copy the full "Detailed Description" from Section 1 above)_ |
| **Category** | Productivity |
| **Language** | English (United States) |
| **Icon** | Upload `public/icons/icon-128.png` |
| **Screenshots** | Upload `assets/store/screenshot-1-findings.png`, `screenshot-2-privacy.png`, `screenshot-3-no-findings.png` |
| **Small Promo Tile** | Upload `assets/store/promo-small-440x280.png` |
| **Marquee Promo Tile** | Upload `assets/store/promo-marquee-1400x560.png` |
| **Homepage URL** | `https://github.com/knowthankyew/knowthankyew-extension` |
| **Support URL** | `https://github.com/knowthankyew/knowthankyew-extension/issues` |

### Step 4: Fill in Privacy Tab
| Field | Value |
|:--|:--|
| **Single Purpose** | "To analyze legal fine print, terms of service agreements, and checkout disclosure texts locally on the user's device, highlighting predatory subscription traps and forced arbitration waivers." |
| **Privacy Policy URL** | `https://knowthankyew.github.io/knowthankyew-extension/privacy.html` |
| **Permission Justifications** | _(Copy from Section 2 table above)_ |
| **Data Use Disclosures** | All categories → **NO** (see Section 3 above) |

### Step 5: Distribution Tab
| Field | Value |
|:--|:--|
| **Visibility** | Public |
| **Distribution** | All regions |

### Step 6: Submit for Review
Click **"Submit for Review"**. First submission typically takes 1–3 business days.

---

## 6. Version History

| Version | Date | Key Highlights |
|:---|:---|:---|
| **1.4.0 (Release Candidate)** | September 24, 2026 | Prepared for Chrome Web Store upload (`knowthankyew-extension-v1.4.0.zip`). Resolved baseline issues, aligned statutory policy packs with current ROSCA / FTC Act § 5 / State ARL law, 50k char DOM extraction ceiling, OTLP enterprise badge preservation, and 85/85 tests passing. |
| **1.3.0 (LIVE)** | September 22, 2026 | **Live & Approved on Chrome Web Store**. Added full-page Options / Engine Dashboard (VS Code extension style), global "Burn All Data Across All Domains" master amnesia switch, live memory/storage meters, and popup dashboard shortcut. |
| **1.2.0** | September 21, 2026 | Automated governing terms link detection with 1-click contract navigation, dynamic checkout observer. Approved & Live in Chrome Web Store. |
| **1.1.0** | September 20, 2026 | Initial public release with statutory rule matching (ROSCA, FAA, State ARL), atomic Hard Burn, zero-egress CSP enforcement. |



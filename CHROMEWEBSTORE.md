# Chrome Web Store Metadata & Publishing Reference

> Single source of truth for Chrome Web Store listing metadata, permissions justification, privacy disclosures, and publication readiness for **KnowThankYew Reality Engine**.

---

## 1. Store Listing Metadata

- **Extension Name**: KnowThankYew Reality Engine
- **Short Name**: KnowThankYew
- **Summary / Teaser**:
  Instant consumer advocate in your toolbar. Flags hidden subscription traps, automatic renewal billing, and forced arbitration waivers in real-time with zero data collection.
- **Category**: Productivity / Privacy & Security
- **Version**: `1.0.0`
- **Default Language**: English (United States)
- **Support / Source URL**: https://github.com/knowthankyew/knowthankyew-extension

### Detailed Description (Store-Facing)

Browse the web with an invisible consumer protection advocate sitting quietly in your toolbar.

When you reach a checkout page, terms of service modal, or subscription signup, the KnowThankYew Reality Engine instantly scans the agreement fine print on your device and highlights critical legal traps before you submit your credit card or click "I Agree":

- **Automatic Renewal Traps**: Detects hidden continuous service commitments, negative-option billing, and promotional trial expirations under FTC Click-to-Cancel standards and state Automatic Renewal Laws.
- **Symmetrical Cancellation Obstacles**: Flags dark patterns that force you to call customer service hotlines or mail physical letters to cancel subscriptions you purchased online.
- **Forced Arbitration & Class Action Bans**: Identifies mandatory binding arbitration clauses and class action waivers where companies force you to surrender your constitutional rights to a public trial.
- **Unilateral Contract Alterations**: Alerts you when a company claims the power to change prices or terms retroactively without your affirmative consent.
- **Third-Party Data Brokerage**: Discloses clauses where your personal data and browsing history may be sold or shared with commercial advertisers.

### Complete Privacy & Total Amnesia

Unlike commercial extensions that upload your browsing history to cloud analytics servers, the KnowThankYew Reality Engine operates under strict zero-egress invariants:

1. **100% On-Device Processing**: Contract evaluation runs entirely inside your browser tab sandbox. No document text, form inputs, or browsing history ever leave your device.
2. **Zero Cloud Telemetry**: The public release contains no remote telemetry endpoints or network dispatch code.
3. **The Hard Burn Switch**: Click "Hard Burn" at any moment to instantly wipe local extension storage, flush memory buffers, and leave your browser in a completely clean state.

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

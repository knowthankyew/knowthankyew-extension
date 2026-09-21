# KnowThankYew Reality Engine (Browser Extension)

> **Repository #10** of the [`knowthankyew`](https://github.com/knowthankyew) portfolio.  
> An uncompromising, zero-egress browser reality engine and consumer advocate that detects predatory subscription traps, forced arbitration waivers, and dark patterns in real time.

---

## The Elevator Pitch

*"Imagine browsing the web and having an invisible advocate sitting in your toolbar that instantly flags hidden subscription traps, predatory arbitration clauses, and tracking scripts the second you land on a checkout page or terms-of-service agreement. It reads the fine print for you in real time, warns you before you get squeezed, runs 100% on your own device, and leaves zero trace behind when you close the tab."*

---

## Features

- **Negative-Option & Auto-Renewal Detection**: Identifies continuous billing commitments under FTC 16 CFR Part 425 and state Automatic Renewal Laws.
- **Symmetrical Cancellation Auditing**: Warns of phone-only or mail-only cancellation barriers before you submit payment.
- **Arbitration & Class Action Ban Scanners**: Highlights binding AAA/JAMS arbitration agreements and jury trial waivers.
- **Unilateral Modification Alerts**: Catches rights claimed by platforms to rewrite terms or raise prices retroactively.
- **Embedded `PrivacyAuditModal`**: Native integration with `@knowthankyew/privacy-telemetry` to inspect volatile memory buffers in real time.
- **The Hard Burn Switch**: One-click total amnesia—clears `chrome.storage.local`, drains in-memory telemetry buffers, and resets the extension state.

---

## Quick Start (Development)

```bash
# Install dependencies
npm install

# Run unit tests
npm test

# Build production unpacked extension bundle
npm run build
```

The compiled unpacked extension is output to `dist/`:
1. Open Chrome or Brave and navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in upper right)
3. Click **Load unpacked** and select the `dist/` directory

---

## The 5 Architectural Invariants

1. **Volatile Memory Buffer**: Zero disk telemetry; logs reside in an ephemeral circular memory buffer.
2. **Compile-Time Dead-Code Shims**: Without `VITE_OTEL_EXPORTER_OTLP_ENDPOINT`, network export paths are tree-shaken out of the public release.
3. **Fail-Closed Allowlist**: Telemetry metrics are validated strictly against `SAFE_ALLOWLIST_KEYS`.
4. **Zero Raw Text Egress**: Contract heuristic matching executes entirely in the local tab sandbox.
5. **The Hard Burn**: Complete memory and storage flush on demand.

See [ARCHITECTURE.md](./ARCHITECTURE.md) and [CHROMEWEBSTORE.md](./CHROMEWEBSTORE.md) for detailed technical specifications and store publication metadata.

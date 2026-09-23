# Security Policy

The KnowThankYew Reality Engine is built on the principle of **Zero-Egress Invariant Architecture** and **Total Local Volatility**. We treat user privacy and network air-gapping as hard security boundaries, not merely configuration preferences.

---

## 1. Supported Versions

| Version | Supported | Distribution Channel | Security Posture |
| :--- | :--- | :--- | :--- |
| **v1.3.x (Current)** | :white_check_mark: | Chrome Web Store / GitHub | Air-gapped (`connect-src 'none'`), Zero-Egress |
| **v1.4.x-dev** | :white_check_mark: | GitHub Releases (`.zip`) | Loopback Assist (`127.0.0.1:8420`), SLSA Provenance |
| **< v1.2.0** | :x: | Legacy | Deprecated |

---

## 2. Dual-Channel Trust Delta & Distribution Model

KnowThankYew maintains two distinct distribution channels with explicitly declared security postures:

### Channel A: Chrome Web Store Production Releases (Official Default)
- **Zero-Egress Enforcement**: Governed by Manifest V3 Content Security Policy: `connect-src 'none'`.
- **Physical Air-Gap**: All network primitives (`fetch`, `XMLHttpRequest`, `WebSocket`) are physically stripped from the `dist/` bundle at compile time via Vite dead-code elimination.
- **Audited by Google**: Subject to Google Chrome Web Store Developer Program Policies and automated extension review.
- **Verification**: Verified via automated CI bundle grep gates and Puppeteer negative-control network interception tests.

### Channel B: GitHub Releases Developer Builds (`VITE_LOCAL_ML_ENABLED=true`)
- **Target Audience**: AppSec researchers, developers, and power users running local LLMs (Ollama, llama.cpp, FTaaS).
- **Loopback Scope**: Makes strictly local HTTP requests to `http://127.0.0.1:8420` for semantic link classification and `/burn` memory purge handshakes.
- **Trust Delta**: These developer zip archives are distributed outside Google Chrome Web Store review. You are the sole guarantor of your local runtime environment.
- **Supply Chain Verification**: Every GitHub Release build is accompanied by an automated **CycloneDX Software Bill of Materials (`bom.json`)** and **SLSA Level 3 Build Provenance**. Users are strongly advised to verify the SBOM and commit hashes before installing in developer mode (`chrome://extensions`).

---

## 3. Security Architecture & Boundary Invariants

### 3.1 Content Script vs. Extension Page CSP Boundary
- **Extension Pages (Popup, Options, Background Service Worker)**: Governed directly by the extension's `manifest.json` CSP (`connect-src 'none'`). Physical network egress is prohibited at the Chromium browser engine level.
- **Content Scripts (`scanner.js`, `link-detector.ts`)**: Injected into host web pages. Under Manifest V3, content scripts run in an isolated execution world but execute within the host page context. **Content script air-gapping is enforced by architectural design and compile-time code exclusion**, rather than extension page CSP. Automated CI regression tests assert zero network calls or loopback references within `dist/content/scanner.js`.

### 3.2 Nuclear Amnesia & Hard Burn Handshake
- Clicking **Hard Burn** clears all `chrome.storage.local` keys, tears down DOM observers across all open tabs, overwrites volatile telemetry buffers, and dispatches a non-blocking `POST /burn` request to any active loopback worker to purge prompt context and KV caches.

---

## 4. Reporting a Vulnerability

We welcome vulnerability reports from security researchers and the community. If you discover a vulnerability—especially any scenario that could violate the Zero-Egress Invariant or cause unauthorized network egress—please report it responsibly.

### How to Report:
1. **Do NOT open a public GitHub issue** for undisclosed security vulnerabilities.
2. Email your findings directly to the maintainers at: **`security@knowthankyew.org`** (or open a private security advisory via [GitHub Security Advisories](https://github.com/knowthankyew/knowthankyew-extension/security/advisories/new)).
3. Include:
   - Detailed reproduction steps or Proof of Concept (PoC).
   - Affected browser version and operating system.
   - Analysis of potential security or privacy impact.

### Response Timelines:
- **Initial acknowledgment**: Within 48 hours.
- **Vulnerability assessment**: Within 5 business days.
- **Remediation & disclosure**: Coordinated disclosure within 30 days of confirmed fix.

# Local ML Setup Guide for KnowThankYew 🧠

KnowThankYew's **Reality Engine** is designed to protect your privacy through **zero-egress, 100% on-device contract auditing**. 

While the core rule-matching engine runs everywhere (including on Firefox and Safari), the plain-language BS Translator can be powered by on-device machine learning in two ways:

---

## Option 1: Chrome Built-in Prompt API (Gemini Nano)

On Chromium-based browsers (Chrome 128+ Dev/Canary or Chrome 131+ Stable):
1. Gemini Nano runs directly inside your browser process via hardware acceleration.
2. It requires **zero setup**, **zero terminal commands**, and **zero external servers**.
3. View setup details at [Chrome Prompt API Documentation](https://developer.chrome.com/docs/ai/prompt-api).

---

## Option 2: Local Loopback Worker (Firefox, Safari, or Custom Models)

If you are using Firefox, Safari, or an operating system where Chrome's built-in Prompt API is unavailable, you can run a local loopback worker on `127.0.0.1:8420`.

> [!IMPORTANT]
> **Prerequisite Extension Build**:  
> Standard production releases enforce strict CSP `connect-src 'none'`, which blocks all network calls (including loopback). To use the local loopback worker, you must compile an unpacked extension with loopback support enabled:
> ```bash
> # Build Chrome/Chromium Local Assist variant
> npm run build:local-assist
>
> # Or build Firefox with Local ML loopback enabled
> VITE_LOCAL_ML_ENABLED=true TARGET_BROWSER=firefox npm run build:firefox
> ```
> Load the resulting unpacked build from `dist/` or `dist-firefox/` into your browser before starting the worker.

### Why a Loopback Worker?
- **Pillar 1 Invariant (Zero Cloud Egress)**: Data is transmitted strictly across your machine's loopback interface (`localhost` / `127.0.0.1`). Nothing leaves your device.
- **Pillar 5 Invariant (Hard Burn Handshake)**: When you click "Burn Local Data", KnowThankYew sends a `/burn` command to the local worker to flush all in-memory cache and prompt buffers.

### Quick Start Reference Worker
The repository includes a reference local server implementation:
```bash
# Clone the repository
git clone https://github.com/knowthankyew/knowthankyew-extension.git
cd knowthankyew-extension

# Start the local loopback worker
node scripts/mock-local-ml-worker.mjs
```
The worker will listen on `http://127.0.0.1:8420` and fulfill:
- `GET /health` - Diagnostic and availability status
- `POST /analyze` - Plain-language translation
- `POST /burn` - Memory purge protocol

> **Security Note on CORS & Private Network Access (PNA)**:  
> The developer reference worker serves `Access-Control-Allow-Origin: *` to simplify local testing across development ports. In a production desktop assistant or custom local inference daemon (e.g. Ollama/Llama.cpp wrapper), you should restrict the `Access-Control-Allow-Origin` header explicitly to your extension's origin (`chrome-extension://<extension-id>` or `moz-extension://<uuid>`).

---

## Web Standards & Future Support
Standardization for in-browser neural acceleration is currently progressing under the W3C Web Machine Learning Working Group. You can track browser standards and implementation status at:
- [W3C Web Machine Learning Working Group](https://www.w3.org/groups/wg/webmachinelearning/)
- [W3C Web Neural Network API (WebNN) Specification](https://www.w3.org/TR/webnn/)

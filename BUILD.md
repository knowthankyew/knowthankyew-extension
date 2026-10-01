# Source Code Build & Verification Instructions (Mozilla AMO Reviewers)

> **Extension Name**: KnowThankYew Reality Engine  
> **Gecko ID**: `reality-engine@knowthankyew.org`  
> **Version**: `1.6.0`

---

## 1. Build Environment & Prerequisites

- **Operating System**: macOS, Linux, or Windows (WSL recommended)
- **Node.js**: v20.x or higher (`node --version`)
- **Package Manager**: npm v10.x or higher (`npm --version`)

---

## 2. Step-by-Step Build Instructions

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Compile the Firefox Extension**:
   ```bash
   npm run build:firefox
   ```
   *Technical Execution*: This runs `tsc` for TypeScript typechecking followed by `TARGET_BROWSER=firefox vite build`.
   *Output*: All compiled, unminified-asset extension files and the gecko-tailored `manifest.json` are placed into the `dist-firefox/` directory.

3. **(Optional) Run Test Suite**:
   ```bash
   npm test
   ```
   Verifies all 103 invariant, ReDoS, and DOM parsing tests pass with 0 errors.

4. **Package the Release Archive**:
   ```bash
   npm run package:firefox
   ```
   Packages `dist-firefox/` into `knowthankyew-extension-v1.6.0-firefox.zip`.

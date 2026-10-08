# Safari Web Extension Packaging & Submission Guide

> **Extension Name**: KnowThankYew Reality Engine  
> **Target Version**: `2.1.0`  
> **Bundle Identifier**: `org.knowthankyew.reality-engine`  
> **Distribution Target**: Apple App Store (macOS Safari & iOS Safari)

---

## 1. Overview & Architecture

Safari uses the standard Manifest V3 specification with an Xcode native container application wrapper. The KnowThankYew Safari distribution is built from the identical source codebase as Chrome and Firefox, utilizing:
- **`dist-safari/`**: Standard MV3 assets tailored for WebKit (`TARGET_BROWSER=safari npm run build:safari`).
- **Closed Shadow DOM Overlays**: Fully supported in Safari 15.4+.
- **Zero-Egress CSP Invariant**: `connect-src 'none'` enforced across all extension pages.
- **Cross-Context Session Amnesia**: `BroadcastChannel('kty_hard_burn')` supported natively in Safari 15.4+.

---

## 2. Step-by-Step Xcode Conversion

### Prerequisites
- macOS 14 (Sonoma) or macOS 15 (Sequoia)
- Xcode 15 or 16 (`xcode-select --install`)
- Node.js v20.19+ or v22.12+ (required for Vite 8)

### Step 1: Compile the Clean Safari Distribution
```bash
# Clean build for Safari target
npm run build:safari

# Verify output in dist-safari/
ls -la dist-safari/
```

### Step 2: Convert to Native Xcode Project
Run Apple's official `safari-web-extension-converter` CLI tool:
```bash
xcrun safari-web-extension-converter dist-safari/ \
  --project-location ./safari-xcode \
  --app-name "KnowThankYew" \
  --bundle-identifier "org.knowthankyew.reality-engine" \
  --swift
```

This generates an Xcode project (`./safari-xcode/KnowThankYew.xcodeproj`) containing:
1. **Host App (macOS & iOS)**: A lightweight native Swift wrapper that presents installation and enablement instructions.
2. **Safari Web Extension Target**: The sandboxed extension bundle wrapping `dist-safari/`.

---

## 3. App Sandbox & Entitlements

In accordance with our zero-egress invariants:
- **`com.apple.security.network.client`**: **MUST NOT** be enabled in the production consumer build. All pattern evaluation, text segmentation, and inline visual indicators execute 100% locally in browser memory.
- **App Sandbox**: The host companion app runs fully sandboxed with default entitlements only.

---

## 4. Apple Privacy Manifest (`PrivacyInfo.xcprivacy`)

Apple requires all App Store submissions to include a `PrivacyInfo.xcprivacy` dictionary declaring tracking domains and collected data types:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>NSPrivacyTracking</key>
    <false/>
    <key>NSPrivacyTrackingDomains</key>
    <array/>
    <key>NSPrivacyCollectedDataTypes</key>
    <array/>
    <key>NSPrivacyAccessedAPITypes</key>
    <array/>
</dict>
</plist>
```

- **`NSPrivacyTracking`**: `false` (KnowThankYew never tracks users across third-party websites or apps).
- **`NSPrivacyCollectedDataTypes`**: Empty array `[]` (0 bytes of PII, location, browsing history, or diagnostics are stored or transmitted).
- **Physical Verification**: Statically enforced by `tests/bundle-invariants.test.ts`.

---

## 5. Local Testing & Verification in Safari

1. Open **Safari** → **Settings** (or **Preferences** on older macOS).
2. Go to the **Advanced** tab and check **"Show features for web developers"**.
3. Under the **Developer** menu in Safari's menu bar:
   - Check **"Allow Unsigned Extensions"**.
4. In Xcode, select the `KnowThankYew (macOS)` scheme and click **Run** (⌘R).
5. The container app will launch. In Safari Settings → **Extensions**, check the box next to **KnowThankYew Reality Engine**.
6. Open `tests/fixtures/checkout-form.html` (or run `npm run demo`) and click the shield toolbar icon to verify inline indicators and legal analysis.
7. Click **"Burn Local Data"** to verify multi-context Nuclear Amnesia teardown.

---

## 6. App Store Submission

1. In Xcode, select **Product** → **Archive**.
2. Open the **Organizer** window (⌘⌥⇧O).
3. Select the latest archive and click **Distribute App** → **App Store Connect**.
4. In App Store Connect, configure:
   - **Category**: Utilities / Privacy & Security.
   - **Data Collection Declaration**: Mark all data categories as **"Data Not Collected"**.
   - **Review Notes**: Reference `connect-src 'none'` and the zero-egress architecture.

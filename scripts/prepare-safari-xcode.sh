#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_SAFARI="$ROOT_DIR/dist-safari"
XCODE_OUT="$ROOT_DIR/safari-xcode"
PRIVACY_MANIFEST="$ROOT_DIR/safari/PrivacyInfo.xcprivacy"
HOST_RESOURCES="$ROOT_DIR/safari/host-resources"

RUN_BUILD=false
for arg in "$@"; do
  case "$arg" in
    --build) RUN_BUILD=true ;;
    *)
      echo "Unknown option: $arg" >&2
      echo "Usage: $0 [--build]" >&2
      exit 1
      ;;
  esac
done

echo "=== KnowThankYew Safari Web Extension Xcode Preparation ==="

if ! xcrun --find safari-web-extension-converter >/dev/null 2>&1; then
  echo "ERROR: 'safari-web-extension-converter' not found. Full Xcode.app is required (xcode-select -s /Applications/Xcode.app/Contents/Developer)." >&2
  exit 1
fi

echo "1. Building clean zero-egress Safari MV3 distribution..."
(cd "$ROOT_DIR" && npm run build:safari)

if [ ! -f "$DIST_SAFARI/manifest.json" ]; then
  echo "ERROR: Missing $DIST_SAFARI/manifest.json after build:safari" >&2
  exit 1
fi

if grep -q '"version_name"' "$DIST_SAFARI/manifest.json"; then
  echo "ERROR: Safari manifest.json must not contain Chromium-only 'version_name'" >&2
  exit 1
fi

rm -rf "$XCODE_OUT"
mkdir -p "$XCODE_OUT"

echo "2. Converting dist-safari/ via xcrun safari-web-extension-converter..."
xcrun safari-web-extension-converter "$DIST_SAFARI" \
  --project-location "$XCODE_OUT" \
  --app-name "KnowThankYew" \
  --bundle-identifier "org.knowthankyew.reality-engine" \
  --swift \
  --copy-resources \
  --no-open \
  --no-prompt \
  --force

PROJECT_DIR="$XCODE_OUT/KnowThankYew"
XCODEPROJ="$PROJECT_DIR/KnowThankYew.xcodeproj"
if [ ! -d "$XCODEPROJ" ]; then
  XCODEPROJ="$(find "$XCODE_OUT" -maxdepth 3 -name "*.xcodeproj" -print -quit)"
  PROJECT_DIR="$(dirname "$XCODEPROJ")"
fi

if [ ! -d "$XCODEPROJ" ]; then
  echo "ERROR: Generated .xcodeproj not found inside $XCODE_OUT" >&2
  exit 1
fi

echo "3. Installing native container host resources (Guideline 4.2 offline utility)..."
while IFS= read -r main_html; do
  res_dir="$(cd "$(dirname "$main_html")/.." && pwd)"
  cp "$HOST_RESOURCES/Main.html" "$main_html"
  cp "$HOST_RESOURCES/Style.css" "$res_dir/Style.css"
  cp "$HOST_RESOURCES/Script.js" "$res_dir/Script.js"
  echo "   Updated container UI in $res_dir"
done < <(find "$PROJECT_DIR" -path "*App*/Resources/*/Main.html" -o -path "*App*/Resources/Base.lproj/Main.html" | sort -u)

echo "4. Installing & registering Apple PrivacyInfo.xcprivacy across App and Extension targets..."
python3 - "$XCODEPROJ/project.pbxproj" "$PROJECT_DIR" "$PRIVACY_MANIFEST" <<'PY'
import hashlib
import os
import re
import shutil
import sys

pbxproj_path, project_dir, privacy_src = sys.argv[1], sys.argv[2], sys.argv[3]
with open(pbxproj_path, "r", encoding="utf-8") as fh:
    content = fh.read()

def uid(seed: str) -> str:
    return hashlib.sha1(seed.encode("utf-8")).hexdigest()[:24].upper()

targets_to_add = ["Shared (App)", "Shared (Extension)"]

for group_name in targets_to_add:
    is_synced = False
    if "PBXFileSystemSynchronizedRootGroup" in content and group_name in content:
        sync_pattern = re.compile(rf'PBXFileSystemSynchronizedRootGroup.*?path\s*=\s*"{re.escape(group_name)}"', re.DOTALL)
        if sync_pattern.search(content):
            is_synced = True

    dest_path = os.path.join(project_dir, group_name, "Resources", "PrivacyInfo.xcprivacy")
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    shutil.copyfile(privacy_src, dest_path)

    if is_synced:
        # Synchronized groups automatically embed files placed inside Resources/ without duplicate root copies
        print(f"   Synced group embeds {group_name}/Resources/PrivacyInfo.xcprivacy")
        continue

    rel_file = "Resources/PrivacyInfo.xcprivacy"
    file_ref_id = uid(f"fileref:{group_name}:{rel_file}")
    build_file_id = uid(f"buildfile:{group_name}:{rel_file}")

    if file_ref_id in content:
        continue

    anchor_file = "Style.css" if "App" in group_name else "manifest.json"
    group_regex = re.compile(
        rf'(children\s*=\s*\((?:(?!</dict>|\);)[\s\S])*?{re.escape(anchor_file)}[\s\S]*?)(\n\s*\);)([\s\S]{{0,240}}?\}};)',
        re.MULTILINE,
    )

    attached_to_group = False
    group_uses_resources_path = True
    for m in group_regex.finditer(content):
        if "PrivacyInfo.xcprivacy" not in m.group(1):
            prefix, close, tail = m.group(1), m.group(2), m.group(3)
            group_uses_resources_path = bool(re.search(r'\bpath\s*=\s*"?Resources"?\s*;', tail))
            replacement = f"{prefix}\n\t\t\t\t{file_ref_id} /* PrivacyInfo.xcprivacy */,{close}{tail}"
            content = content[:m.start(1)] + replacement + content[m.end(3):]
            attached_to_group = True
            break

    if not attached_to_group:
        fallback_rg = re.compile(
            rf'(children\s*=\s*\((?:(?!\);)[\s\S])*?{re.escape(anchor_file)}[\s\S]*?)(^\s*\);)([\s\S]{{0,240}}?\}};)',
            re.MULTILINE,
        )
        m = fallback_rg.search(content)
        if m:
            group_uses_resources_path = bool(re.search(r'\bpath\s*=\s*"?Resources"?\s*;', m.group(3)))
            replacement = f"{m.group(1)}\n\t\t\t\t{file_ref_id} /* PrivacyInfo.xcprivacy */,{m.group(2)}{m.group(3)}"
            content = content[:m.start(1)] + replacement + content[m.end(3):]
            attached_to_group = True

    # If the matched group sets `path = Resources;`, reference relative to Resources/; otherwise use Resources/PrivacyInfo.xcprivacy
    pbx_file_path = "PrivacyInfo.xcprivacy" if group_uses_resources_path else "Resources/PrivacyInfo.xcprivacy"

    file_ref_entry = (
        f'\t\t{file_ref_id} /* PrivacyInfo.xcprivacy */ = {{isa = PBXFileReference; '
        f'lastKnownFileType = text.xml; path = "{pbx_file_path}"; sourceTree = "<group>"; }};\n'
    )
    build_file_entry = (
        f'\t\t{build_file_id} /* PrivacyInfo.xcprivacy in Resources */ = {{isa = PBXBuildFile; '
        f'fileRef = {file_ref_id} /* PrivacyInfo.xcprivacy */; }};\n'
    )

    content = content.replace(
        "/* End PBXFileReference section */",
        file_ref_entry + "/* End PBXFileReference section */",
        1,
    )
    content = content.replace(
        "/* End PBXBuildFile section */",
        build_file_entry + "/* End PBXBuildFile section */",
        1,
    )

    phase_anchor = "Main.html" if "App" in group_name else "manifest.json"
    phase_regex = re.compile(
        rf'(isa\s*=\s*PBXResourcesBuildPhase;[\s\S]*?files\s*=\s*\((?:(?!\);)[\s\S])*?{re.escape(phase_anchor)}[\s\S]*?)(\n\s*\);)',
        re.MULTILINE,
    )
    phase_count = [0]
    def _inject_phase(match):
        body, close = match.group(1), match.group(2)
        if build_file_id in body:
            return match.group(0)
        phase_count[0] += 1
        return f"{body}\n\t\t\t\t{build_file_id} /* PrivacyInfo.xcprivacy in Resources */,{close}"

    content = phase_regex.sub(_inject_phase, content)
    print(f"   Registered {group_name}/{rel_file} (pbxPath={pbx_file_path}, group={attached_to_group}, phases={phase_count[0]})")

with open(pbxproj_path, "w", encoding="utf-8") as fh:
    fh.write(content)
PY

plutil -lint "$XCODEPROJ/project.pbxproj" >/dev/null

echo "5. Enforcing zero-network sandbox settings & auditing generated Xcode entitlements..."
python3 - "$XCODEPROJ/project.pbxproj" <<'PY'
import re
import sys

pbxproj_path = sys.argv[1]
with open(pbxproj_path, "r", encoding="utf-8") as fh:
    text = fh.read()

matches = re.findall(r"ENABLE_OUTGOING_NETWORK_CONNECTIONS\s*=\s*YES\s*;", text)
if matches:
    text = re.sub(
        r"ENABLE_OUTGOING_NETWORK_CONNECTIONS\s*=\s*YES\s*;",
        "ENABLE_OUTGOING_NETWORK_CONNECTIONS = NO;",
        text,
    )
    print(f"   Overrode {len(matches)} default ENABLE_OUTGOING_NETWORK_CONNECTIONS = YES setting(s) to NO")

with open(pbxproj_path, "w", encoding="utf-8") as fh:
    fh.write(text)
PY

if grep -q "com.apple.security.network.client" "$XCODEPROJ/project.pbxproj" || \
   grep -qE "ENABLE_OUTGOING_NETWORK_CONNECTIONS\s*=\s*YES" "$XCODEPROJ/project.pbxproj"; then
  echo "ERROR: Forbidden outgoing network entitlement or build setting detected in $XCODEPROJ/project.pbxproj" >&2
  exit 1
fi

if ! grep -qE "ENABLE_APP_SANDBOX\s*=\s*YES" "$XCODEPROJ/project.pbxproj" && \
   [ -z "$(find "$PROJECT_DIR" -name "*.entitlements" -print -quit)" ]; then
  echo "ERROR: Neither ENABLE_APP_SANDBOX = YES nor .entitlements files found in generated Xcode project" >&2
  exit 1
fi

while IFS= read -r ent; do
  plutil -lint "$ent" >/dev/null
  if grep -q "com.apple.security.network.client" "$ent"; then
    echo "ERROR: Forbidden network client entitlement detected in $ent" >&2
    exit 1
  fi
  echo "   Verified clean entitlements: ${ent#$XCODE_OUT/}"
done < <(find "$PROJECT_DIR" -name "*.entitlements" | sort)

echo "   Verified sandbox & zero outgoing network settings in project.pbxproj"

while IFS= read -r plist_file; do
  plutil -lint "$plist_file" >/dev/null
done < <(find "$PROJECT_DIR" -name "PrivacyInfo.xcprivacy" | sort)

if [ "$RUN_BUILD" = true ]; then
  echo "6. Compiling unsigned macOS Release target via xcodebuild..."
  xcodebuild \
    -project "$XCODEPROJ" \
    -scheme "KnowThankYew (macOS)" \
    -configuration Release \
    -derivedDataPath "$XCODE_OUT/build" \
    CODE_SIGNING_ALLOWED=NO \
    CODE_SIGNING_REQUIRED=NO \
    DEVELOPMENT_TEAM="" \
    clean build

  BUILT_APP="$(find "$XCODE_OUT/build/Build/Products/Release" -maxdepth 2 -name "*.app" -print -quit)"
  BUILT_APPEX="$(find "$XCODE_OUT/build/Build/Products/Release" -name "*.appex" -print -quit)"

  if [ -z "$BUILT_APP" ] || [ -z "$BUILT_APPEX" ]; then
    echo "ERROR: Built .app or .appex bundle missing after xcodebuild" >&2
    exit 1
  fi

  APP_PRIVACY="$(find "$BUILT_APP/Contents/Resources" -name "PrivacyInfo.xcprivacy" -print -quit)"
  APPEX_PRIVACY="$(find "$BUILT_APPEX/Contents/Resources" -name "PrivacyInfo.xcprivacy" -print -quit)"
  if [ -z "$APP_PRIVACY" ] || [ -z "$APPEX_PRIVACY" ]; then
    echo "ERROR: PrivacyInfo.xcprivacy missing from compiled .app or .appex bundle (app='$APP_PRIVACY', appex='$APPEX_PRIVACY')" >&2
    exit 1
  fi

  # Verify processed intermediate entitlements (.xcent) generated by Xcode contain zero network.client
  while IFS= read -r xcent; do
    if grep -q "com.apple.security.network.client" "$xcent"; then
      echo "ERROR: Processed target entitlements $xcent contain com.apple.security.network.client" >&2
      exit 1
    fi
  done < <(find "$XCODE_OUT/build" -name "*.xcent" | sort)

  echo "7. Scanning compiled macOS bundle JS for zero-egress compliance..."
  if grep -rEn "fetch\(|WebSocket|sendBeacon|XMLHttpRequest|EventSource|importScripts" "$BUILT_APPEX" "$BUILT_APP/Contents/Resources" --include="*.js"; then
    echo "ERROR: Remote network egress primitive detected in compiled Safari bundle!" >&2
    exit 1
  fi

  echo "PASS: Safari macOS .app and .appex built cleanly with PrivacyInfo.xcprivacy and zero network egress."
else
  echo "PASS: Safari Xcode project prepared cleanly at $XCODEPROJ (run with --build to compile)."
fi

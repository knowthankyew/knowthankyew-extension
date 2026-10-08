╔═══════════════════════════════════════════╗
║                                           ║
║   New update available! 0.8.2 -> 0.9.0    ║
║          Run: coderabbit update           ║
║                                           ║
╚═══════════════════════════════════════════╝


   !   Excluded 2 unsupported binary file(s): demo.gif, demo.mp4

────────────────────────────────────────
CodeRabbit Review

Diff      : tracked changes
Compare   : main → main
Directory : knowthankyew-extension
────────────────────────────────────────

(\(\
(• .•)  The fifth dentist recommends we all floss our code.


────────────────────────────────────────────────────────────────────────
  trivial [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/tests/amnesia-coordinator.test.ts:101tests/amnesia-coordinator.test.ts:101-117]8;;

  Tests do not assert the new per-tab badge clear or the sessionStorage
  purge.

  chrome.tabs.query returns tab 101 and setBadgeText is mocked. No test
  asserts the call { text: '', tabId: 101 } from hardBurnAllData. Add
  this assertion to the first test. The sessionStorage purge is covered in
  tests/handoff-bridge.test.tsx.


  Proposed addition

       expect(chrome.storage.local.clear).toHaveBeenCalled();
  +    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '', tabId: 101 });


────────────────────────────────────────────────────────────────────────
  trivial [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/telemetry/client.ts:103src/telemetry/client.ts:103-118]8;;

  Badge clears and burn messages run concurrently without error isolation,
  and the step numbering duplicates.

  Promise.allSettled isolates rejections, so this is safe. However, the
  comment at line 82 reuses "4." after the new step 4 at line 73. Renumber
  the comments.

  Also, the global badge clear at line 70 is redundant with the per-tab
  clears, but harmless.


────────────────────────────────────────────────────────────────────────
  trivial [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/docs/SAFARI-SUBMISSION.md:22docs/SAFARI-SUBMISSION.md:22]8;;

  Fix markdownlint warnings.

  Add blank lines after the headings at lines 22, 27, and 36. Add blank
  lines around the fenced code blocks at lines 28 and 38.






  Also applies to: 27-28, 36-38


────────────────────────────────────────────────────────────────────────
  trivial [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/background/service-worker.ts:84src/background/service-worker.ts:84-90]8;;

  Install handler writes a global badge color.

  The onInstalled handler calls setBadgeBackgroundColor without tabId.
  This sets a global badge state. Per-tab scan updates always set their own
  color, so the global color has no purpose. It also conflicts with the
  strict tab-scoping invariant in updateBadgeForScan. Remove the global
  color write.


  Proposed fix

     chrome.runtime.onInstalled.addListener(async () => {
       await chrome.action.setBadgeText({ text: '' });
  -    await chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
     });

  The test at tests/service-worker-badge.test.ts lines 54-55 asserts this
  call. Update the test with the fix.


────────────────────────────────────────────────────────────────────────
  trivial [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/package.json:13package.json:13-17]8;;

  Remove the duplicate checksum step in package.

  package writes SHA256SUMS for its own ZIP only. package:all then
  overwrites the file with a glob over every v${VERSION}*.zip. The glob
  can include stale ZIP files from earlier builds. Generate the checksums
  once at the end of package:all. Remove shasum from package, or
  delete old ZIP files first.


────────────────────────────────────────────────────────────────────────
  trivial [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/docs/WALKTHROUGH-v2.1.md:143docs/WALKTHROUGH-v2.1.md:143]8;;

  Remove the "permanent tombstone" claim.

  docs/WALKTHROUGH-v1.6.md and the pass 5 audit state that the tombstone
  behavior is an in-memory hardBurned flag, set only in v2.1.0. Describe
  it as an in-memory lock that resets on navigation.


────────────────────────────────────────────────────────────────────────
  trivial [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/tests/bundle-invariants.test.ts:10tests/bundle-invariants.test.ts:10-15]8;;

  Rebuild when a stale dist/ exists.

  The setup rebuilds only when a file is missing. A stale dist/ from an
  older build satisfies all three checks. The invariant tests then run
  against old output. Always rebuild in CI, or compare against the current
  version.


────────────────────────────────────────────────────────────────────────
  trivial [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/tests/claims-linter.test.ts:52tests/claims-linter.test.ts:52-53]8;;

  Avoid hard-coded rule and pattern counts.

  The test fails on any legitimate rule or pattern addition. The counts also
  duplicate numbers in ROADMAP.md and the walkthrough documents. Assert
  minimum counts, or compare against the documented numbers.


────────────────────────────────────────────────────────────────────────
  trivial [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/vite.config.ts:53vite.config.ts:53-80]8;;

  Isolate the scanner sub-build from the outer build state.

  The nested build() call uses configFile: false and does not pass
  mode. The airGapTransformPlugin closure reads the outer mode and
  isLocalMl, so the stripping decision stays consistent. The nested build
  also does not set minify or target options and relies on Vite
  defaults. Confirm that the IIFE output matches the Chrome, Firefox, and
  Safari content-script targets. Pass mode explicitly to keep the
  sub-build deterministic.


  Proposed change

               await build({
                 configFile: false,
                 publicDir: false,
  +              mode,
                 plugins: [airGapTransformPlugin],


────────────────────────────────────────────────────────────────────────
  trivial [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/scripts/record-demo.js:13scripts/record-demo.js:13-32]8;;

  Resolve Playwright from the declared dependency only.

  playwright is now declared in devDependencies. The candidates that
  point to ../node_modules assume a machine-specific portfolio layout.
  Remove the parent-directory fallbacks. The catch {} also hides real load
  errors from a broken installation.


────────────────────────────────────────────────────────────────────────
  trivial [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/docs/BUILD.md:35docs/BUILD.md:35]8;;

  Verify the stated test counts.

  The document states 189 tests across 25 suites. ROADMAP.md states 170+
  tests. Use one verified number, or remove the count.


────────────────────────────────────────────────────────────────────────
  trivial [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/tests/pdf-extractor.test.ts:144tests/pdf-extractor.test.ts:144-180]8;;

  The wall-clock assertions can fail intermittently on slow CI runners.

  The hard < 1000ms timing checks fail under CI load even when the code
  works. Use a larger margin, or assert on bounded work instead of elapsed
  time.


────────────────────────────────────────────────────────────────────────
  minor [Performance & Scalability]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/options/pdf-extractor.ts:138src/options/pdf-extractor.ts:138-154]8;;

  The decompression limit does not stop inflation inside a single push.

  When the output size goes over maxAllowed, the Unzlib callback throws.
  fflate inflates one pushed input slice completely before it calls back. A
  highly compressible 64 KB input slice can inflate to many megabytes before
  the check runs. The throw then exits from u.push, and the catch returns
  null. This means the cap limits retained chunks but not the allocation
  for each push. The budget is also not charged on the abort or error path.
  As a result, every font CMap and every content stream can each inflate up
  to maxAllowed before rejection. Reduce CHUNK_SIZE, for example to 1–4
  KB, so that each push has a smaller worst case. Also charge
  budget.bytesRemaining with the bytes produced before you return null.


  Proposed fix

  -      const CHUNK_SIZE = 64 * 1024;
  +      const CHUNK_SIZE = 4 * 1024;
   ...
  -      if (aborted) return null;
  +      if (aborted) {
  +        if (budget) budget.bytesRemaining -= totalBytes;
  +        return null;
  +      }

  Also charge the budget in the catch block.


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/options/pdf-extractor.ts:35src/options/pdf-extractor.ts:35]8;;

  Split bfrange lines on \r as well as \n.

  This code splits only on \n. Some CMaps use CR-only line endings. In
  that case the whole section becomes one line, and only the first range
  entry is parsed. The remaining glyphs are not mapped and silently decode
  to empty text. Use split(/\r\n|\r|\n/).


────────────────────────────────────────────────────────────────────────
  trivial [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/docs/coderabbit-pass5-iterative-audit.md:1docs/coderabbit-pass5-iterative-audit.md:1-6]8;;

  Remove raw tool output from the repository.

  These audit logs contain terminal banners, ASCII art, and a local path
  (/Users/cl0rkster/... in the related passes). Keep them out of version
  control, or add them to .gitignore. The files add noise and leak a local
  username.


────────────────────────────────────────────────────────────────────────
  trivial [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/docs/LOCAL-ML-SETUP.md:30docs/LOCAL-ML-SETUP.md:30-32]8;;

  Use a separate output directory for the Firefox Local Assist build.

  The command `VITE_LOCAL_ML_ENABLED=true TARGET_BROWSER=firefox npm run
  build:firefox writes to dist-firefox/`. This overwrites the standard
  Firefox build directory. A later npm run package:firefox rebuilds it,
  but a manual load can use the wrong build. Add `--outDir
  dist-firefox-local-assist` or document the overwrite.


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/popup/App.tsx:770src/popup/App.tsx:770-777]8;;

  Prevent the default paste in the error-panel textarea.

  The PDF panel calls e.preventDefault() on paste. This panel does not. In
  this panel, the browser inserts the pasted text at the cursor, and
  onChange then overwrites setPastedText(pasted) with the combined
  value. The audit runs on pasted only, so the textarea shows text that
  differs from the audited text. The 50 ms setTimeout also triggers a
  second state update. Use the same handling as the PDF panel.


  🐛 Proposed fix

                   onPaste={(e) => {
  +                  e.preventDefault();
                     const pasted = e.clipboardData.getData('text');
                     if (pasted && pasted.trim().length > 0) {
                       setPastedText(pasted);
  -                    setTimeout(() => {
  -                      handleAuditText(pasted);
  -                    }, 50);
  +                    handleAuditText(pasted);
                     }
                   }}


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/popup/components/AuditReceiptCard.tsx:55src/popup/components/AuditReceiptCard.tsx:55-59]8;;

  Fix the jurisdiction filter so unknown values do not default to US.

  For a targetJurisdiction other than ALL, EU, or UK, the filter
  shows only the US checklist items. This includes values such as US-CA,
  STATE, or INTL. A target of INTL therefore shows the US items and
  hides the INTL item. If the engine accepts jurisdiction codes outside
  US*, the receipt then reports a clean pass for the wrong set of
  statutes. Match US explicitly, and show all items for any other value.


  🐛 Proposed fix

     const checklistItems = allChecklistItems.filter(item => {
       if (targetJ === 'ALL') return true;
  -    if (targetJ === 'EU' || targetJ === 'UK') return item.jurisdiction === 'INTL';
  -    return item.jurisdiction === 'US';
  +    if (targetJ === 'EU' || targetJ === 'UK' || targetJ === 'INTL') return item.jurisdiction === 'INTL';
  +    if (targetJ.startsWith('US')) return item.jurisdiction === 'US';
  +    return true;
     });


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/core/handoff.ts:151src/core/handoff.ts:151-153]8;;

  ruleId skips sanitization. An empty title makes the payload fail its
  own validator.

  buildHandoffPayload copies match.title || '' through
  sanitizeSnippet. If a match has an empty title, the result is ''.
  validateHandoffPayload at Line 253 rejects an empty title. The bridge
  then returns { success: false, url: '' } and gives no reason. Match
  titles come from the rules in the bundled policy packs, so this path is
  narrow. The same applies to an empty ruleId at Line 252. Choose one fix.
  Use a non-empty fallback title such as match.ruleId, or filter such
  findings out before validation.


  Proposed fix

  -    title: sanitizeSnippet(match.title || ''),
  +    title: sanitizeSnippet(match.title || match.ruleId || 'Untitled finding'),


────────────────────────────────────────────────────────────────────────
  minor [Stability & Availability]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/popup/handoff-bridge.ts:44src/popup/handoff-bridge.ts:44-51]8;;

  On timeout, the code reports success without knowing whether the page
  loaded.

  When the 2 s timer fires, the promise resolves the same way as a
  complete load. If the destination page loads after the injection, the
  write can be lost. Handle the timeout as a separate result, and return
  success: false for that result.


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/core/policy-packs/eu-crd.json:21src/core/policy-packs/eu-crd.json:21]8;;

  Fix the optional-group whitespace in EU-AR-001 so single-space phrasing
  matches.

  The pattern is \s+(?:checkbox|box|option)?\s+is. If the optional noun is
  absent, two consecutive \s+ tokens need at least two whitespace
  characters. As a result, ordinary text such as "The subscription is
  pre-selected" or "An additional fee is checked by default" does not match
  this CRITICAL rule. The existing test matches only because it includes
  "checkbox". Put the leading whitespace inside the optional group.


  🐛 Proposed fix

  -        "(?:monthly\\s+subscription|subscription|additional\\s+(?:charge|fee|payment)|recurring\\s+charge)\\s+(?:checkbox|box|option)?\\s+is\\s+(?:pre-?selected|checked\\s+by\\s+default)",
  +        "(?:monthly\\s+subscription|subscription|additional\\s+(?:charge|fee|payment)|recurring\\s+charge)(?:\\s+(?:checkbox|box|option))?\\s+is\\s+(?:pre-?selected|checked\\s+by\\s+default)",

  Also add a test case without "checkbox" to tests/rules.test.ts.


────────────────────────────────────────────────────────────────────────
  minor [Security & Privacy] | 🛡️ Analyzed with Security Review
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/.github/workflows/release.yml:56.github/workflows/release.yml:56-61]8;;

  Security: Security Misconfiguration (CWE-693)
  Reachability: Internal · Exploitability: Difficult

  Run the zero-egress check after packaging all production bundles.

  npm run package rebuilds dist/ after the current check. The Firefox
  and Safari commands also create dist-firefox/ and dist-safari/, which
  are not checked. Move the check after the package commands and scan all
  three production directories.


  Proposed change

  -      - name: Verify Zero-Egress Invariant
  -        run: |
  -          echo "Scanning all built artifacts for network egress primitives..."
  -          if grep -rEn "fetch\(|WebSocket|sendBeacon|XMLHttpRequest|EventSource|importScripts" dist --include='*.js'; then
  -            echo "ERROR: Network egress primitive detected in production extension bundle!"
  -            exit 1
  -          fi
  -          echo "PASS: Absolute zero-egress verified across all dist JS bundles."
  -
         - name: Run Test Suite
           run: npm test
  @@
             npm run package:firefox
             npm run package:safari
             npm run package:local-assist
  +
  +      - name: Verify Zero-Egress Invariant
  +        run: |
  +          echo "Scanning all built artifacts for network egress primitives..."
  +          if grep -rEn "fetch\(|WebSocket|sendBeacon|XMLHttpRequest|EventSource|importScripts" dist dist-firefox dist-safari --include='*.js'; then
  +            echo "ERROR: Network egress primitive detected in production extension bundle!"
  +            exit 1
  +          fi
  +          echo "PASS: Absolute zero-egress verified across all production bundles."


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/ROADMAP.md:89ROADMAP.md:89]8;;

  Name the v2.1.0 Safari archive.

  Line 4 states that v2.1.0 is packaged, but this item names a v2.0.0 Safari
  ZIP. Update the archive name so readers can identify the release artifact.
  As per path instructions, this review compares the “v2.1.0 release
  candidate” against the v1.6.0 baseline.


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/popup/components/TrapCard.tsx:9src/popup/components/TrapCard.tsx:9-14]8;;

  Abort every in-flight inference during a hard burn.

  When multiple TrapCard instances render, they share one
  ChromePromptAPIAdapter. prepareInferenceController() overwrites
  currentAbortController for each summary. burn() aborts only the last
  controller, so earlier summaries can retain an unaborted signal after a
  hard burn. Track all active inference controllers and abort each one in
  burn(). The adapter does not allow only one inference at a time.


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/docs/WALKTHROUGH-v1.6.md:14docs/WALKTHROUGH-v1.6.md:14]8;;

  Scope the CSP statement to production builds.

  The isLocalMl build enables loopback connections for LocalMLClient.
  Update this statement to exclude the opt-in Local ML build, or document
  its separate CSP.


────────────────────────────────────────────────────────────────────────
  minor [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/docs/ARCHITECTURE.md:95docs/ARCHITECTURE.md:95]8;;

  Qualify the Hard Burn cleanup claims.

  docs/ARCHITECTURE.md describes the loopback request as fire-and-forget in
  Line 56 and cleanup as best-effort in Line 58. The statements below
  promise immediate or complete cleanup. State that cleanup is requested,
  and qualify it for reachable tabs and the Local ML worker.

  - docs/ARCHITECTURE.md#L95-L95: Replace “wipes” and “purges” with
  best-effort cleanup wording. Note that the worker purge applies only when
  Local ML is enabled.
  - docs/CHROMEWEBSTORE.md#L40-L40: Remove the unconditional “instantly”
  and “all” cleanup claim. Qualify cleanup for reachable tabs.
  - docs/CHROMEWEBSTORE.md#L48-L48: State that indicators are removed when
  cleanup reaches the tab, rather than promising immediate destruction in
  every tab.


────────────────────────────────────────────────────────────────────────
  trivial [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/tests/amnesia-coordinator.test.ts:101tests/amnesia-coordinator.test.ts:101-117]8;;

  Assert the per-tab badge clear.

  hardBurnAllData queries tab 101 and clears its badge, but this test only
  asserts the global badge behavior. Add the per-tab assertion. This is a
  coverage improvement, not a current production failure.


  Suggested test assertion

       expect(chrome.storage.local.clear).toHaveBeenCalled();
  +    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '', tabId: 101 });
       expect(telemetry.getBufferedSpans().length).toBe(0);


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/telemetry/client.ts:103src/telemetry/client.ts:103-118]8;;

  Remove the unscoped badge clear.

  chrome.action.setBadgeText({ text: '' }) has no tabId. It writes
  global badge state and violates the strict tab-scoped badge requirement.
  The later per-tab clears do not make this call redundant.


  Suggested fix

  -  // 3. Clear action badges.
  -  if (typeof chrome !== 'undefined' && chrome.action?.setBadgeText) {
  -    await chrome.action.setBadgeText({ text: '' });
  -  }


────────────────────────────────────────────────────────────────────────
  trivial [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/docs/LOCAL-ML-SETUP.md:30docs/LOCAL-ML-SETUP.md:30-32]8;;

  Keep Firefox Local Assist output separate from the release output.

  build:firefox writes every Firefox build to dist-firefox, including
  Local Assist builds. package:firefox then rebuilds the non-Local-Assist
  variant in the same directory. This makes manual loading depend on build
  order.


  🐛 Suggested fix

  -> VITE_LOCAL_ML_ENABLED=true TARGET_BROWSER=firefox npm run build:firefox
  +> VITE_LOCAL_ML_ENABLED=true TARGET_BROWSER=firefox npm run build:firefox -- --outDir dist-firefox-local-assist
  > 

  -> Load the resulting unpacked build from dist-local-assist/ or
  dist-firefox/ into your browser before starting the worker.
  +> Load the resulting unpacked build from dist-local-assist/ or
  dist-firefox-local-assist/ into your browser before starting the worker.
  ```


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/core/policy-packs/eu-crd.json:21src/core/policy-packs/eu-crd.json:21]8;;

  Allow omitted checkbox nouns without broadening EU-AR-001.

  The two whitespace expressions require two whitespace characters when the
  optional noun is absent, so ordinary text such as `An additional fee is
  checked by default` does not match. The replacement must also remove the
  bare subscription alternative. Otherwise, it matches the primary
  subscription and exceeds Article 22's additional-payment scope.


  🐛 Suggested fix

  -        "(?:monthly\\s+subscription|subscription|additional\\s+(?:charge|fee|payment)|recurring\\s+charge)\\s+(?:checkbox|box|option)?\\s+is\\s+(?:pre-?selected|checked\\s+by\\s+default)",
  +        "(?:(?:additional|add[- ]on)\\s+(?:(?:monthly|recurring)\\s+)?(?:subscription|charge|fee|payment))(?:\\s+(?:checkbox|box|option))?\\s+is\\s+(?:pre-?selected|checked\\s+by\\s+default)",

  Add positive coverage for An additional fee is checked by default and
  negative coverage for The subscription is pre-selected. Update the
  existing positive fixture to include an explicit additional-payment or
  add-on qualifier.


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/tests/bundle-invariants.test.ts:10tests/bundle-invariants.test.ts:10-15]8;;

  Rebuild the production bundle before running these assertions.

  npm test runs vitest run without running npm run build. If the three
  dist/ files already exist, the setup skips the build and the assertions
  read stale output. A stale bundle that still satisfies the assertions can
  therefore pass after source changes.


  Suggested fix

     beforeAll(() => {
       // Ensure standard production build exists for testing
  -    if (
  -      !existsSync(resolve(distDir, 'background/service-worker.js')) ||
  -      !existsSync(resolve(distDir, 'content/scanner.js')) ||
  -      !existsSync(resolve(distDir, 'manifest.json'))
  -    ) {
  -      execSync('npm run build', { cwd: resolve(__dirname, '..'), stdio: 'pipe' });
  -    }
  +    execSync('npm run build', { cwd: resolve(__dirname, '..'), stdio: 'pipe' });
     });


────────────────────────────────────────────────────────────────────────
  minor [Security & Privacy]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/popup/components/TrapCard.tsx:9src/popup/components/TrapCard.tsx:9-14]8;;

  Reset the shared prompt adapter from the popup hard-burn handler.

  hardBurnAllData() does not call resetSharedPromptAdapter(). After a
  successful burn, handleBurnCompleted() clears scanResult, which
  unmounts the TrapCard components and aborts each card's local signal.
  Therefore, the claim that earlier popup prompt signals remain running
  after this hard burn is too broad.

  That teardown does not call ChromePromptAPIAdapter.burn() or destroy its
  active session. Reset the shared adapter before calling
  hardBurnAllData().


  Suggested fix

  -import { hardBurnAllData } from '../../telemetry/client';
  +import { hardBurnAllData } from '../../telemetry/client';
  +import { resetSharedPromptAdapter } from './TrapCard';
  ...
     try {
  +    resetSharedPromptAdapter();
       await hardBurnAllData();


────────────────────────────────────────────────────────────────────────
  minor [Stability & Availability]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/scripts/record-demo.js:13scripts/record-demo.js:13-32]8;;

  Preserve the portfolio-root fallback and expose Playwright load errors.

  When a resolved Playwright installation throws during require(c), the
  empty catch {} discards the load error. If no later candidate succeeds,
  npm run record:demo stops with the misleading “Playwright not found”
  message. Keep the ../node_modules candidates because they support
  portfolio-root installs.


  Suggested fix

     for (const c of candidates) {
  +    let resolved;
       try {
  -      const mod = require(c);
  -      if (mod.chromium) return mod.chromium;
  -    } catch {}
  +      resolved = require.resolve(c);
  +    } catch (err) {
  +      if (err?.code === 'MODULE_NOT_FOUND') continue;
  +      throw err;
  +    }
  +    const mod = require(resolved);
  +    if (mod.chromium) return mod.chromium;
     }


────────────────────────────────────────────────────────────────────────
  trivial [Security & Privacy]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/docs/coderabbit-pass5-iterative-audit.md:1docs/coderabbit-pass5-iterative-audit.md:1-6]8;;

  Redact local filesystem paths from the audit reports.

  The reports may remain as historical records, but absolute paths such as
  /Users/cl0rkster/Dev/knowthankyew-extension expose a local account name
  and workstation layout. Replace these paths with repository-relative
  references. Adding .gitignore alone will not change files that are
  already tracked.


  Suggested redaction

  -Review directory: /Users/cl0rkster/Dev/knowthankyew-extension
  +Review directory: <repository-root>

  Apply the same redaction to the embedded VS Code paths in the other audit
  reports. The update banner itself is only noise and does not require
  deleting the reports.


────────────────────────────────────────────────────────────────────────
  minor [Stability & Availability]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/options/pdf-extractor.ts:138src/options/pdf-extractor.ts:138-154]8;;

  Use a bounded output buffer instead of treating CHUNK_SIZE as the cap.

  fflate@0.8.3 has no output limit for streaming Unzlib. Its
  unzlibSync API accepts an out buffer, but truncates output to that
  buffer instead of reporting an overflow. Use a bounded out buffer and
  reject the result when it reaches the configured limit, using a sentinel
  byte or a conservative boundary check.

  This is a localized change in getObjectStream; it does not require
  replacing the PDF parser. It bounds output allocation, but it does not
  stop CPU work when the limit is reached. A patched or forked streaming
  inflater is only needed for early abort and exact partial-output
  accounting.

  Charge the budget exactly once on success, overflow, and error paths:


  Suggested budget accounting

       try {
         const chunks: Uint8Array[] = [];
         let totalBytes = 0;
  +      let budgetCharged = false;
  +      const chargeBudget = () => {
  +        if (budget && !budgetCharged) {
  +          budget.bytesRemaining -= totalBytes;
  +          budgetCharged = true;
  +        }
  +      };
         let aborted = false;
  @@
  -      const CHUNK_SIZE = 64 * 1024;
  +      const CHUNK_SIZE = 4 * 1024; // Overshoot mitigation only.
  @@
  -      if (aborted) return null;
  +      if (aborted) {
  +        chargeBudget();
  +        return null;
  +      }
  
  -      if (budget) {
  -        budget.bytesRemaining -= totalBytes;
  -      }
  +      chargeBudget();
  @@
       } catch {
  +      chargeBudget();
         return null;
       }

  The bounded-buffer change is localized, but it requires tests for
  exact-limit, over-limit, highly compressible, and malformed streams. The 4
  KiB chunk size alone is not a hard bound.


────────────────────────────────────────────────────────────────────────
  minor [Data Integrity & Integration]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/package.json:13package.json:13-17]8;;

  Remove stale same-version ZIPs before package:all hashes the release.

  Each packaging script removes only its own exact archive. The final
  v${VERSION}*.zip glob can therefore include an older same-version ZIP
  and add it to SHA256SUMS. Removing the checksum command from package
  does not fix this; package:all overwrites that file. Clean the matching
  archives before running the four packaging scripts.


  Suggested fix

  -    "package:all": "npm run package && npm run package:firefox && npm run package:safari && npm run package:local-assist && VERSION=$(node -p \"require('./package.json').version\") && shasum -a 256 knowthankyew-extension-v${VERSION}*.zip > SHA256SUMS",
  +    "package:all": "VERSION=$(node -p \"require('./package.json').version\") && rm -f knowthankyew-extension-v${VERSION}*.zip && npm run package && npm run package:firefox && npm run package:safari && npm run package:local-assist && shasum -a 256 knowthankyew-extension-v${VERSION}*.zip > SHA256SUMS",


────────────────────────────────────────
Review complete
Review completed
36 findings ✔

Minor    19
Trivial  17

72 files reviewed:
  - .coderabbit.yaml
  - .github/workflows/ci.yml
  - .github/workflows/legal-statute-monitor.yml
  - .github/workflows/release.yml
  - .gitignore
  - README.md
  - ROADMAP.md
  - docs/ARCHITECTURE.md
  - docs/BUILD.md
  - docs/CHROMEWEBSTORE.md
  ... and 62 more files
Excluded unsupported binary files: demo.gif, demo.mp4
────────────────────────────────────────

Print all AI prompts: coderabbit review --show-prompts

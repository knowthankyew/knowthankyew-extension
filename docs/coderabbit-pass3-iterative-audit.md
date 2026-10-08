
   !   Excluded 2 unsupported binary file(s): demo.gif, demo.mp4

────────────────────────────────────────
CodeRabbit Review

Diff      : tracked changes
Compare   : main → main (local main differs, using origin/main)
Directory : knowthankyew-extension
────────────────────────────────────────

(\(\
(• .•)  Love the minimalism. Unfortunately the feature was also minimized.


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/core/handoff.ts:240src/core/handoff.ts:240]8;;

  Use an own-property check for targetTool.

  The in operator also checks the prototype chain. The validator accepts
  the payload when targetTool is "toString", "constructor", or
  "__proto__". Then CANONICAL_DESTINATION_TOOLS[p.targetTool] resolves
  to an Object.prototype member. The fail-closed validation contract
  ("registered target tools") breaks.


  Proposed fix

  -  if (typeof p.targetTool !== 'string' || !(p.targetTool in CANONICAL_DESTINATION_TOOLS)) {
  +  if (
  +    typeof p.targetTool !== 'string' ||
  +    !Object.prototype.hasOwnProperty.call(CANONICAL_DESTINATION_TOOLS, p.targetTool)
  +  ) {


────────────────────────────────────────────────────────────────────────
  trivial [Performance & Scalability]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/popup/components/TrapCard.tsx:20src/popup/components/TrapCard.tsx:20]8;;

  Each TrapCard creates its own Prompt API session.

  Every card builds a new ChromePromptAPIAdapter, and each adapter calls
  ensureSession(). A scan with N findings therefore starts N concurrent
  Gemini Nano sessions. This is costly in memory and inference time on
  low-end hardware. Share one adapter from the parent and run the summaries
  one after another.


────────────────────────────────────────────────────────────────────────
  trivial [Performance & Scalability]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/content/scanner.ts:68src/content/scanner.ts:68-72]8;;

  Indicator injection triggers a self-induced observer rescan cycle.

  injectIndicatorsForScanResult removes and re-inserts host spans under
  document.body. The MutationObserver watches childList with `subtree:
  true`. Each scan therefore produces childList mutations, and those
  mutations schedule a debounced callback. The 25-character text delta gate
  usually stops the rescan, because the badge text lives inside a closed
  shadow root. The callback still runs extractPageLegalText() (a full
  clone and extraction) 400 ms after every scan. Skip mutation records whose
  added or removed nodes are only [data-kty-indicator-host] elements.


  ♻️ Proposed filter

         if (mutation.type === 'childList') {
  -        if (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0) {
  +        const nodes = [...mutation.addedNodes, ...mutation.removedNodes];
  +        const external = nodes.some(
  +          (n) => !(n instanceof Element && n.hasAttribute('data-kty-indicator-host'))
  +        );
  +        if (external) {
             hasMeaningfulChange = true;
             break;
           }


────────────────────────────────────────────────────────────────────────
  minor [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/docs/WALKTHROUGH-v1.6.md:27docs/WALKTHROUGH-v1.6.md:27-28]8;;

  Remove the undocumented tombstone claim.

  The document says the scanner writes
  sessionStorage.__KTY_HARD_BURN_TOMBSTONE__ and permanently rejects later
  scans. handleHardBurnDOM in src/content/scanner.ts writes no
  tombstone. The KTY_REQUEST_PAGE_SCAN handler still calls executeScan()
  after a burn. Correct the text or implement the tombstone.


────────────────────────────────────────────────────────────────────────
  minor [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/docs/CHROMEWEBSTORE.md:155docs/CHROMEWEBSTORE.md:155]8;;

  Version history omits 2.1.0 while the listing packages 2.1.0.

  Line 17 and Line 18 reference 2.1.0 and
  knowthankyew-extension-v2.1.0.zip. The newest history row is 2.0.0
  with v2.0.0.zip. Add a 2.1.0 row, or align the version references.


────────────────────────────────────────────────────────────────────────
  trivial [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/background/service-worker.ts:22src/background/service-worker.ts:22-33]8;;

  Do not fall back to a global badge for scan results.

  If KTY_SCAN_COMPLETED arrives without sender.tab.id and without
  message.tabId, the badge count is set globally. The global badge then
  shows one page's findings on every tab. This violates the path instruction
  that badges must be "strictly scoped to specific tabIds". Content-script
  messages always carry sender.tab, so this is only a defensive change.
  Drop the update instead of writing a global badge.

  🛡️ Proposed fix

     } else {
  -    // Fallback if message has no associated tab (e.g. test harness)
  -    if (critical > 0) {
  -      ...
  -    }
  +    // No tab context: never write a global badge
  +    return;
     }

  Update the test at tests/service-worker-badge.test.ts Line 64-69 to match.


────────────────────────────────────────────────────────────────────────
  minor [Stability & Availability]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/popup/App.tsx:318src/popup/App.tsx:318-334]8;;

  Handle rejected handoff dispatches.

  handleBatchHandoff and handleSingleHandoff await
  dispatchHandoffToDestination without a try/catch.
  buildDestinationUrl and JSON.stringify run outside the internal try
  block. If either throws, the click handler produces an unhandled promise
  rejection and the user gets no feedback. Wrap each handler body in a
  try/catch and set handoffStatus to a failure message in the catch
  branch.


────────────────────────────────────────────────────────────────────────
  minor [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/docs/WALKTHROUGH-v2.1.md:96docs/WALKTHROUGH-v2.1.md:96-99]8;;

  Align the documented severity labels with SeverityBadge. In code,
  CRITICAL maps to "This is a problem" and WARNING maps to "Watch out".
  Both documents present a different mapping or order.
  - docs/WALKTHROUGH-v2.1.md#L96-L99: swap the descriptions so that "This
  is a problem" is the Critical label and "Watch out" is the Warning label.
  - ROADMAP.md#L139-L139: list the labels as "This is a problem" / "Watch
  out" / "FYI".


────────────────────────────────────────────────────────────────────────
  major [Performance & Scalability]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/options/OptionsApp.tsx:208src/options/OptionsApp.tsx:208-221]8;;

  Run PDF extraction off the main thread.

  extractTextFromPdfBuffer runs synchronously on the main thread. It
  accepts input up to 25 MB and runs several unbounded regex passes.
  unzlibSync can also produce up to 20 MB of output for each stream. A
  large or malformed PDF can freeze the options page for many seconds, and
  the burn-generation checks cannot interrupt the work. The path
  instructions require that large documents do not lock the main thread.
  Move extraction into a Web Worker, or reduce the input cap substantially.


────────────────────────────────────────────────────────────────────────
  major [Stability & Availability]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/options/pdf-extractor.ts:112src/options/pdf-extractor.ts:112-118]8;;

  Enforce the decompression limit during inflation.

  unzlibSync inflates the full stream before the 20 MB size check runs. A
  small zlib bomb can therefore allocate hundreds of megabytes or more
  before the function returns null. Each content stream and each CMap
  repeats this cost. Use the streaming Unzlib from fflate with an output
  counter that stops inflation at the cap. Alternatively, pass a
  preallocated output buffer that has the cap size.


────────────────────────────────────────────────────────────────────────
  trivial [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/tests/proof-of-work.test.tsx:319tests/proof-of-work.test.tsx:319-331]8;;

  Move this boundary test to the real truncation offset.

  The email in this test starts near character 1,971 of the raw text.
  Truncation of the raw text happens at character 4,000, so the email is
  never split before sanitization. The test cannot detect the split-token
  leak at the 4,000-character boundary. Place the PII token so that it
  crosses raw character 4,000.


────────────────────────────────────────────────────────────────────────
  minor [Security & Privacy] | 🛡️ Analyzed with Security Review
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/docs/WALKTHROUGH-v2.1.md:89docs/WALKTHROUGH-v2.1.md:89]8;;

  Security: Other (CWE-345)
  Exploitability: Theoretical

  Remove the HMAC claim or implement HMAC.

  dispatchHandoffToDestination writes plain JSON.stringify(payload) to
  sessionStorage. readAndClearHandoffPayload checks only the payload
  shape. No HMAC exists in this path. The document overstates a security
  control.


────────────────────────────────────────────────────────────────────────
  minor [Performance & Scalability]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/options/pdf-extractor.ts:173src/options/pdf-extractor.ts:173-188]8;;

  Bound the object scan and CMap work.

  objRegex runs across the whole document. For each Font object,
  getObjectStream performs a fresh indexOf search across the whole
  document. parseCMap can then fill up to 65,536 entries for each bfrange
  line. A crafted PDF with many fonts or many ranges can cause
  near-quadratic scanning time and large memory use. Add counters that limit
  the number of objects, fonts, and total CMap entries.


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/popup/handoff-bridge.ts:24src/popup/handoff-bridge.ts:24-44]8;;

  Report failed handoff injection instead of reporting success.

  For non-GitHub destinations, dispatchHandoffToDestination catches
  chrome.scripting.executeScript failures and then returns `success:
  true. Return success: false` when the scripting API is unavailable, the
  new tab has no ID, or injection fails. The tabs.create call does not
  need an onUpdated wait because executeScript uses the destination
  document's default idle injection timing.


  Suggested fix

  -      if (!targetUrl.startsWith('https://github.com/') && newTab.id && chrome.scripting?.executeScript) {
  +      if (!targetUrl.startsWith('https://github.com/')) {
  +        if (!newTab.id || !chrome.scripting?.executeScript) {
  +          return { success: false, url: targetUrl };
  +        }
           try {
             await chrome.scripting.executeScript({
               target: { tabId: newTab.id },
  @@
           } catch {
  -          // Scripting may fail if host permissions are restricted or tab is still loading; non-fatal
  +          return { success: false, url: targetUrl };
           }
         }


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/docs/BUILD.md:11docs/BUILD.md:11]8;;

  Require WSL for the documented Windows build.

  On native Windows, npm run build:firefox reaches `TARGET_BROWSER=firefox
  vite build, which cmd.exe` cannot execute as a POSIX environment
  assignment. The packaging script also uses POSIX shell commands. State
  that Windows reviewers must use WSL, or make the scripts cross-platform.
  npm uses cmd.exe for Windows scripts by default. (docs.npmjs.com)


────────────────────────────────────────────────────────────────────────
  major [Data Integrity & Integration]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/statutory-update-report.md:65statutory-update-report.md:65]8;;

  Regenerate the report with the jurisdiction-filtered monitor.

  This US Federal Register row assigns a US notice to UK-AR-001; further
  UK rows follow. The changed monitor excludes UK packs from Federal
  Register queries and formats UK modification dates differently from this
  report. The committed report therefore represents the old
  cross-jurisdiction query behavior. Regenerate or remove it so legal
  reviewers do not treat these notices as UK statutory updates.


────────────────────────────────────────────────────────────────────────
  major [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/core/policy-packs/eu-crd.json:14src/core/policy-packs/eu-crd.json:14-18]8;;

  Limit the Article 22 claim to extra payments.

  EU-AR-001 labels a preselected subscription as an Article 22 violation
  even when the subscription is the main purchase. Article 22 addresses
  default options that cause an additional payment beyond that purchase. The
  current guidance can therefore report a statutory violation that the cited
  provision does not establish. Narrow the rule and its explanation to paid
  add-ons, or cite a provision that supports the broader claim.
  (eur-lex.europa.eu)

  As per path instructions, “Validate rule structures for UK DMCC 2024, EU
  CRD, US Federal, and State ARL.”


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/core/policy-packs/us-federal.json:80src/core/policy-packs/us-federal.json:80]8;;

  Match “agree to binding arbitration” in the expanded party pattern.

  The new contractor and client alternatives still require `agree by
  binding arbitration`. “You and the contractor agree to binding
  arbitration” does not match this pattern. The other ARB-001 patterns do
  not cover that wording. Add to as an alternative before “binding
  arbitration” and test the new parties.


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/README.md:17README.md:17]8;;

  Update the packaged-release notice to v2.1.0.

  The packaging scripts now produce v2.1.0 archives, but this notice directs
  readers to four v2.0.0 archive names. Update the status and archive names
  so readers can identify this release’s downloads.


────────────────────────────────────────────────────────────────────────
  major [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/core/policy-packs/state-arl.json:149src/core/policy-packs/state-arl.json:149]8;;

  Do not classify the absence of online cancellation alone as an Oregon
  violation.

  The second pattern matches “Oregon residents cannot cancel online.” ORS
  646A.295 also permits a toll-free number, email address, or another
  suitable cancellation mechanism. A trader can use one of those mechanisms
  and still trigger this STATUTORY_VIOLATION finding. Remove that
  alternative or require evidence that the available mechanism fails the
  statute. (oregonlegislature.gov)

  As per path instructions, “Validate rule structures for UK DMCC 2024, EU
  CRD, US Federal, and State ARL.”


────────────────────────────────────────────────────────────────────────
  minor [Security & Privacy] | 🛡️ Analyzed with Security Review
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/popup/handoff-bridge.ts:50src/popup/handoff-bridge.ts:50-61]8;;

  Security: Sensitive Data Exposure (CWE-226)
  Reachability: Internal · Exploitability: Theoretical

  Clear the fallback handoff payload after opening the tab.

  In the web/dev/test fallback, window.open(..., 'noopener,noreferrer')
  creates a separate browsing context, so it cannot read the popup's
  sessionStorage. dispatchHandoffToDestination does not call
  readAndClearHandoffPayload, so the serialized payload remains after
  dispatch. Keep the Chrome injection path unchanged, and clear the fallback
  key after the open attempt.


  Clear the fallback key and update its test

  @@
     if (typeof window !== 'undefined' && typeof window.open === 'function') {
       window.open(targetUrl, '_blank', 'noopener,noreferrer');
     }
   
  +  if (typeof sessionStorage !== 'undefined') {
  +    try {
  +      sessionStorage.removeItem(KTY_HANDOFF_SESSION_KEY);
  +    } catch {
  +      // Non-fatal if sessionStorage restricted
  +    }
  +  }
  +
     return { success: true, url: targetUrl };
   }

  @@
  -    // Ephemeral sessionStorage was written
  -    const stored = sessionStorage.getItem(KTY_HANDOFF_SESSION_KEY);
  -    expect(stored).toBeTruthy();
  -    expect(JSON.parse(stored!).targetTool).toBe('bill-of-rights-bot');
  +    expect(sessionStorage.getItem(KTY_HANDOFF_SESSION_KEY)).toBeNull();


────────────────────────────────────────────────────────────────────────
  major [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/core/policy-packs/uk-dmcc.json:12src/core/policy-packs/uk-dmcc.json:12]8;;

  Do not report prospective DMCC duties as current violations.

  The UK subscription-contract chapter is marked prospective in the official
  legislation as of October 2026. This pack is compiled into active rules,
  so UK-AR-001 and UK-AR-002 can label a current contract a
  STATUTORY_VIOLATION for duties that are not yet in force. Gate these
  classifications on commencement, or present them as upcoming requirements
  until commencement is confirmed. (legislation.gov.uk)

  As per path instructions, “Validate rule structures for UK DMCC 2024, EU
  CRD, US Federal, and State ARL.”


────────────────────────────────────────────────────────────────────────
  major [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/scripts/check-statutory-updates.mjs:84scripts/check-statutory-updates.mjs:84-85]8;;

  Advance the reviewed baseline after an update.

  The EU baseline remains 2026-09-01; the UK checks use the same fixed
  date at Lines 128–129. Once a resource has a qualifying later
  modification, every subsequent daily run reports it again. has_updates
  stays true and the fixed PR branch receives repeated reports, even after a
  reviewer handles the original change. Compare against a persisted reviewed
  revision or advance the baseline after review.


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/scripts/record-demo.js:14scripts/record-demo.js:14-21]8;;

  Declare the browser dependency used by the demo.

  A standalone npm install does not install any Playwright package
  declared by this project. resolvePlaywright() can therefore exhaust
  these candidates and stop the documented npm run demo workflow. Add a
  direct Playwright dependency, or use the already declared Puppeteer
  dependency.


────────────────────────────────────────────────────────────────────────
  major [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/docs/LOCAL-ML-SETUP.md:18docs/LOCAL-ML-SETUP.md:18-20]8;;

  Specify a Local Assist build before the loopback setup.

  The published Firefox and Safari package commands do not set
  VITE_LOCAL_ML_ENABLED=true. Starting the worker alone cannot enable
  their gated ML client. Tell readers to build their chosen browser target
  with that flag and install that build before following these worker steps.


────────────────────────────────────────────────────────────────────────
  major [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/content/scanner.ts:255src/content/scanner.ts:255-273]8;;

  Block scans after hard burn instead of resetting the init sentinel.

  Hard burn is intended to stop observation until navigation. However, the
  existing listener still executes executeScan() for
  KTY_REQUEST_PAGE_SCAN after hard burn. A later popup reinjection can
  therefore scan the page again and recreate cached scan state.

  Track the burned state and reject scan requests after
  handleHardBurnDOM() runs.


  🐛 Suggested fix

   let burnBroadcastChannel: BroadcastChannel | null = null;
  +let hardBurned = false;
   
   export function handleHardBurnDOM(): void {
  +  hardBurned = true;
     // Disconnect observer and cease all monitoring
     stopDynamicObserver();
  @@
         if (message?.type === 'KTY_REQUEST_PAGE_SCAN') {
  +        if (hardBurned) {
  +          sendResponse({ success: false, error: 'Scanner disabled after hard burn' });
  +          return true;
  +        }
           try {
             const result = executeScan();

  Do not clear KTY_INIT_KEY. The documented hard-burn behavior is to
  terminate observation until navigation, not to restart it on reinjection.


────────────────────────────────────────
Review complete
Review completed
26 findings ✔

Major    9
Minor    13
Trivial  4

61 files reviewed:
  - .coderabbit.yaml
  - .github/workflows/legal-statute-monitor.yml
  - .github/workflows/release.yml
  - .gitignore
  - README.md
  - ROADMAP.md
  - docs/ARCHITECTURE.md
  - docs/BUILD.md
  - docs/CHROMEWEBSTORE.md
  - docs/HOW-TO-USE.md
  ... and 51 more files
Excluded unsupported binary files: demo.gif, demo.mp4
────────────────────────────────────────

Print all AI prompts: coderabbit review --show-prompts

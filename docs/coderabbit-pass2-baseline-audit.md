
   !   Excluded 2 unsupported binary file(s): demo.gif, demo.mp4

────────────────────────────────────────
CodeRabbit Review

Diff      : tracked changes
Compare   : main → main (local main differs, using origin/main)
Directory : knowthankyew-extension
────────────────────────────────────────

(\(\
(• .•)  You know what they call CodeRabbit in Paris? Royale with Debug.


────────────────────────────────────────────────────────────────────────
  minor [Stability & Availability]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/background/service-worker.ts:66src/background/service-worker.ts:66-72]8;;

  Catch updateBadgeForScan failures so that sendResponse always runs.

  updateBadgeForScan calls chrome.action.setBadgeText directly. That
  call rejects if the tab closed after the scan. When the call rejects, the
  IIFE rejects without a handler, sendResponse never runs, and the
  sender's channel stays open until it times out. Wrap the call in
  try/catch, as the hard-burn branch does.


  Proposed fix

       (async () => {
  -      await updateBadgeForScan(message.summary, targetTabId);
  -      sendResponse({ status: 'badge_updated' });
  +      try {
  +        await updateBadgeForScan(message.summary, targetTabId);
  +        sendResponse({ status: 'badge_updated' });
  +      } catch (err) {
  +        sendResponse({ status: 'error', error: String(err) });
  +      }
       })();


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/content/inline-indicators.ts:95src/content/inline-indicators.ts:95-96]8;;

  Do not use role="alert" on static badges.

  role="alert" makes screen readers interrupt the user with every badge on
  each rescan, and the observer can rescan repeatedly. Use role="note" or
  role="img" together with aria-label.


────────────────────────────────────────────────────────────────────────
  major [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/popup/components/AuditReceiptCard.tsx:84src/popup/components/AuditReceiptCard.tsx:84-104]8;;

  Do not show a "PASSED / verified clean" verdict.

  This card labels clean scans "Full statutory battery verified clean" and
  "PASSED", with a checkmark for each statute. The checklist always renders,
  even when the evaluated rules never covered a category. The store listing
  says the extension "never shows a green 'OK' or 'Safe' stamp" because "No
  Findings ≠ Safe". This UI contradicts that published disclosure, which
  creates a store-review risk and can mislead users. Replace these labels
  with "No findings" wording and remove the "Verified" claims.


────────────────────────────────────────────────────────────────────────
  minor [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/docs/CHROMEWEBSTORE.md:108docs/CHROMEWEBSTORE.md:108-115]8;;

  Use the same release version throughout the document.

  The metadata and the history list v2.0.0 (Lines 17-18 and 155). The upload
  steps reference knowthankyew-extension-v2.1.0.zip. Use one version in
  all sections.


────────────────────────────────────────────────────────────────────────
  minor [Stability & Availability]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/content/scanner.ts:345src/content/scanner.ts:345-355]8;;

  Re-create the BroadcastChannel after a hard burn.

  handleHardBurnDOM closes burnBroadcastChannel and sets it to null.
  The listener sentinel __kty_listeners_bound__ stays true, so a later
  re-injection never creates a new channel. Any new scan after the burn then
  runs without the secondary burn transport. Safari and partitioned contexts
  depend on that transport. Move the channel creation out of the sentinel
  block, or create the channel again in executeScan when it is null.


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/options/OptionsApp.tsx:130src/options/OptionsApp.tsx:130-147]8;;

  Restore auditor state if the burn fails.

  The success path clears the document state after hardBurnAllData()
  completes, which matches the guideline. However, line 131 increments
  burnGenerationRef before the burn starts. If the burn then throws, any
  in-flight audit is silently discarded and isAuditingDoc stays true.
  The finally block in handleAuditDoc skips the reset when the
  generation does not match, so the audit button stays disabled. Increment
  the generation only after the burn succeeds, or reset
  setIsAuditingDoc(false) in handleBurnAll.


────────────────────────────────────────────────────────────────────────
  major [Security & Privacy] | 🛡️ Analyzed with Security Review
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/options/pdf-extractor.ts:111src/options/pdf-extractor.ts:111-117]8;;

  Security: Denial Of Service (CWE-409)
  Reachability: External · Exploitability: Moderate

  Bound FlateDecode output size to prevent decompression-bomb OOM.

  unzlibSync(raw) inflates the stream with no output limit. A small
  crafted PDF can expand to gigabytes, which crashes or freezes the options
  page. The user selects the file, but the PDF content is untrusted. Path
  instructions require "memory bounds" for FlateDecode streams. Before
  decompressing, check the size from the zlib header or the stream length.
  Alternatively, use fflate's streaming Unzlib, count output bytes, and
  abort once the output passes a cap such as 20 MB.


────────────────────────────────────────────────────────────────────────
  minor [Security & Privacy] | 🛡️ Analyzed with Security Review
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/popup/components/TrapCard.tsx:61src/popup/components/TrapCard.tsx:61-65]8;;

  Security: Sensitive Data Exposure (CWE-359)
  Reachability: External · Exploitability: Difficult

  Do not send scan-derived text to Google Calendar.

  eventDetails includes plainLanguageText. That text can be a Nano
  summary generated from the page snippet. The title also includes the
  user's sourceDomain. Clicking the link sends both to
  calendar.google.com. The domain is a browsing-history URL fragment, and
  path instructions prohibit egress of page-derived data. Use a generic
  title and generic details without the domain or the clause text, or warn
  the user before the link opens.


────────────────────────────────────────────────────────────────────────
  trivial [Performance & Scalability]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/core/engine.ts:83src/core/engine.ts:83-100]8;;

  Cap the input before the full-text sanitize pass for the preview.

  sanitizeSnippet(text) runs three global regexes over the whole input.
  The preview needs only 2,000 characters. Direct callers include the
  options auditor, the popup paste path, and PDF extraction, and none of
  them cap input length. A multi-megabyte paste or PDF therefore gets a full
  regex pass on the main thread only to build a preview. Sanitize a bounded
  prefix instead, for example the first 4,000 characters. The extra margin
  keeps PII at the boundary redacted before truncation.


  Proposed fix

  -  const sanitizedFull = sanitizeSnippet(text);
  +  const sanitizedFull = sanitizeSnippet(text.length > 4000 ? text.slice(0, 4000) : text);


────────────────────────────────────────────────────────────────────────
  major [Stability & Availability]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/options/pdf-extractor.ts:155src/options/pdf-extractor.ts:155-160]8;;

  Move PDF extraction off the main thread or bound the work.

  The extractor runs synchronously on the UI thread. It decodes the whole
  file to latin1 and runs several global regex passes, including objRegex
  with lazy [\s\S]*? spans. A large or malformed PDF can freeze the
  options page. Path instructions say "Ensure large documents do not hang or
  lock the main thread." Run the extractor in a Web Worker, or reject files
  above a size threshold.


────────────────────────────────────────────────────────────────────────
  major [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/tests/pdf-extractor.test.ts:29tests/pdf-extractor.test.ts:29-50]8;;

  Remove the test that depends on a personal file under ~/Downloads.

  This test runs only if ~/Downloads/06.26.2025.pdf exists. The assertions
  also reference a named private contract ("ALIGNERR LLC"). CI therefore
  never runs the FlateDecode/CMap path, and the repository now names a
  personal document. Add a small synthetic Flate+CMap fixture under
  tests/fixtures instead.


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/docs/ARCHITECTURE.md:101docs/ARCHITECTURE.md:101]8;;

  Correct the production-dependency invariant.

  The supplied package.json declarations include fflate alongside the
  three packages listed here. Change “Exactly 3” to the actual count and
  include fflate in the inventory.


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/docs/WALKTHROUGH-v2.1.md:119docs/WALKTHROUGH-v2.1.md:119]8;;

  Use the compiled-rule count in the auditor description.

  The updated tests/policy-packs.test.ts asserts 19 compiled rules, not
  “42+.” Correct this claim so users do not mistake pattern count for rule
  count.


────────────────────────────────────────────────────────────────────────
  major [Data Integrity & Integration]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/statutory-update-report.md:11statutory-update-report.md:11-15]8;;

  Regenerate the report after correcting the monitor.

  This US Federal Register table attributes unrelated US notices to
  EU-AR-001; later rows do the same for UK rules. The new US-target filter
  in scripts/check-statutory-updates.mjs does not correct this committed
  report. Regenerate it with verified source-to-statute matches, or remove
  the inaccurate notice rows before legal review.


────────────────────────────────────────────────────────────────────────
  major [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/scripts/check-statutory-updates.mjs:97scripts/check-statutory-updates.mjs:97]8;;

  Detect a revision before recording an international update.

  checkEurLex() appends both canonical documents on every successful
  request. checkUkLegislation() does the same on Line 128. Neither
  function inspects amendment entries or compares a stored version.
  Consequently, Line 280 reports updates on an unchanged day and can
  dispatch a legal-review PR. A non-OK response is also counted if it
  returns headers. Check status, inspect revision data, and compare it with
  a recorded baseline before adding a finding.


────────────────────────────────────────────────────────────────────────
  major [Stability & Availability]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/.github/workflows/legal-statute-monitor.yml:4.github/workflows/legal-statute-monitor.yml:4-6]8;;

  Reuse one branch for the scheduled legal-review PR.

  The new daily schedule runs while a detected notice can remain in the
  lookback window. The PR branch on Line 58 contains ${{ github.run_id }},
  and the report gets a fresh timestamp on every run. Those runs can create
  separate PRs for the same notice. Use a stable branch and update the
  existing review PR; retain a separate branch strategy only for an
  intentional new review cycle. The action’s guidance recommends a fixed
  branch for recurring updates. (github.com)


────────────────────────────────────────────────────────────────────────
  major [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/core/policy-packs/uk-dmcc.json:12src/core/policy-packs/uk-dmcc.json:12]8;;

  Do not report the DMCC subscription regime as an operative violation yet.

  UK-AR-001 and UK-AR-002 classify matches as STATUTORY_VIOLATION. As of
  October 8, 2026, UK government guidance anticipates commencement of the
  new subscription regime in spring 2027. Both rules also cite Part 2, but
  the subscription provisions are in Part 4, Chapter 2. Correct the
  citations and gate the statutory classification on commencement; otherwise
  users receive an incorrect current-law warning.
  (assets.publishing.service.gov.uk)

  As per path instructions: “Validate rule structures for UK DMCC 2024, EU
  CRD, US Federal, and State ARL.”


────────────────────────────────────────────────────────────────────────
  major [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/core/policy-packs/eu-crd.json:45src/core/policy-packs/eu-crd.json:45]8;;

  Account for lawful withdrawal exceptions.

  EU-AR-002 says the withdrawal right cannot be waived, and its first
  pattern matches “right of withdrawal does not apply” without context.
  Article 16 permits exceptions, including qualifying digital-content and
  fully performed service contracts. A lawful disclosure can therefore
  receive a STATUTORY_VIOLATION warning. Narrow the rule to an invalid
  waiver, or classify an unverified exclusion as a warning that requires
  review. (eur-lex.europa.eu)

  As per path instructions: “Validate rule structures for UK DMCC 2024, EU
  CRD, US Federal, and State ARL.”


────────────────────────────────────────────────────────────────────────
  major [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/scripts/check-statutory-updates.mjs:248scripts/check-statutory-updates.mjs:248]8;;

  Report failed international checks as failures, not as no changes.

  Both request functions catch errors and return an empty list. A timeout or
  unavailable source therefore produces “No amendments or changes detected”
  here; Line 260 makes the same claim for EUR-Lex. Preserve check status
  separately from findings, and report an unavailable source without
  declaring its legislation unchanged.


────────────────────────────────────────────────────────────────────────
  major [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/core/policy-packs/state-arl.json:145src/core/policy-packs/state-arl.json:145]8;;

  Correct the Oregon renewal-notice claim.

  ORS 646A.295 requires clear offer terms, an acknowledgment with
  cancellation information, and notice of a material change. It does not
  require advance notice before every renewal. The patterns on Lines 148–149
  instead treat a statement that no renewal notice will be sent as a
  statutory violation. Revise the patterns and explanation to identify a
  duty in the cited provision, or remove this rule. (oregonlegislature.gov)

  As per path instructions: “Validate rule structures for UK DMCC 2024, EU
  CRD, US Federal, and State ARL.”


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/README.md:128README.md:128]8;;

  Use the documented Safari app-name option.

  Apple documents --app-name, not --project-name, for naming the
  generated project. docs/SAFARI-SUBMISSION.md also uses --app-name.
  Replace this option so the README conversion command follows the supported
  CLI syntax. (developer.apple.com)


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/docs/BUILD.md:5docs/BUILD.md:5]8;;

  Update both release-guide version labels. Both guides say 2.0.0, while
  their build commands produce manifests with version 2.1.0.
  - docs/BUILD.md#L5-L5: change the Firefox build-guide version to
  2.1.0.
  - docs/SAFARI-SUBMISSION.md#L4-L4: change the Safari target version to
  2.1.0.


────────────────────────────────────────────────────────────────────────
  trivial [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/tests/bundle-invariants.test.ts:158tests/bundle-invariants.test.ts:158]8;;

  Extend the Safari zero-egress assertion.

  This test passes if compiled JavaScript contains XMLHttpRequest,
  EventSource, or importScripts. Add those detectable primitives to the
  assertion. Assess dynamic script and external-resource loading separately;
  a three-pattern JavaScript scan cannot establish the full zero-egress
  invariant.

  As per path instructions, “Prohibit any network egress (fetch,
  XMLHttpRequest, WebSocket, navigator.sendBeacon, dynamic `` loading,
  external image/font fetches).”


────────────────────────────────────────────────────────────────────────
  major [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/package.json:17package.json:17]8;;

  Publish the Firefox and Safari archives in the release job.

  package:all creates four archives, but .github/workflows/release.yml
  builds and publishes only the Chrome and local-assist archives. A tagged
  release therefore has no Firefox or Safari archive. Add both browser
  builds to that workflow and include their archives in its checksums,
  attestations, and release assets.

  As per path instructions, the extension operates “across Chromium (MV3),
  Firefox, and Safari.”


────────────────────────────────────────────────────────────────────────
  major [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/core/policy-packs/index.ts:15src/core/policy-packs/index.ts:15-16]8;;

  Filter policy rules by jurisdiction before scanning.

  scanDocumentText evaluates every rule in ALL_RULES without a
  jurisdiction parameter or filter. A non-UK page containing the
  renewal-without-notice text can match UK-AR-001, add its UK
  STATUTORY_VIOLATION metadata to matches, and add its CRITICAL
  severity to the risk score. Pass the selected jurisdiction into the scan
  and filter rules before evaluation. If the jurisdiction is unknown, label
  the result as jurisdiction-dependent.


────────────────────────────────────────
Review complete
Review completed
25 findings ✔

Major    13
Minor    10
Trivial  2

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


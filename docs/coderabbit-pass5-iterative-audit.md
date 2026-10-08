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
(• .•)  Errare Humanum Est, Perseverare in Debugging. To err is human, to persist in debugging, divine.


────────────────────────────────────────────────────────────────────────
  major [Stability & Availability]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/options/pdf-extractor.ts:124src/options/pdf-extractor.ts:124-149]8;;

  The decompression cap applies per stream, not to the whole document.

  MAX_DECOMPRESSED_BYTES resets on every call. With 25 CMaps and many
  content streams, each stream can expand to just under 20 MB. Total
  retained memory can then reach gigabytes, because each streamStr and the
  accumulated pageText persist. Add one decompression budget shared across
  all streams in extractTextFromPdfBuffer. Also cap the length of
  pageText.


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/options/OptionsApp.tsx:304src/options/OptionsApp.tsx:304]8;;

  The version badge shows v2.0.0, but the release is 2.1.0.

  package.json and docs/BUILD.md declare 2.1.0. Update this badge to
  match, or read the version from the manifest.


────────────────────────────────────────────────────────────────────────
  major [Performance & Scalability]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/options/pdf-extractor.ts:81src/options/pdf-extractor.ts:81-114]8;;

  getObjectStream repeats full-buffer scans for every content reference.

  Each call runs latin1.indexOf over the whole document, which can be up
  to 10 MB. The scan of pageBodies and contentObjNums has no limit. A
  page /Contents [...] array can list thousands of references, and each
  reference causes another O(N) scan on the main thread. A crafted PDF of a
  few MB can therefore lock the options page. The 500-object cap limits only
  the discovery regex. It does not limit page or content-reference
  iteration.

  Cap the total number of content streams processed, for example 500.
  Alternatively, build an object-offset index once and look up each
  reference in it.


  Proposed cap

  -    for (const cNum of contentObjNums) {
  +    for (const cNum of contentObjNums.slice(0, 200)) {

  As per path instructions: "Ensure large documents do not hang or lock the
  main thread."


────────────────────────────────────────────────────────────────────────
  trivial [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/package.json:13package.json:13-17]8;;

  package writes a SHA256SUMS file that the later steps overwrite.

  package hashes only its own zip. Each later script then hashes
  v${VERSION}*.zip and overwrites SHA256SUMS with >. When
  package:all finishes, the file is correct only because local-assist
  runs last and its glob covers every zip. If someone runs package:firefox
  alone, the file can also include stale zips from earlier builds. Generate
  SHA256SUMS once, at the end of package:all.


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/popup/components/TrapCard.tsx:33src/popup/components/TrapCard.tsx:33-60]8;;

  Concurrent cards cancel each other's summaries.

  Every card uses the single shared adapter. prepareInferenceController
  overwrites currentAbortController. Each abort listener calls
  this.currentAbortController?.abort(), which is the controller of the
  most recent request. When one card unmounts, its abort cancels another
  card's inference. Bind the listener to the local controller in
  prepareInferenceController instead of the instance field.

  const controller = new AbortController();
  this.currentAbortController = controller;
  externalSignal?.addEventListener('abort', () => controller.abort(), { once: true });


────────────────────────────────────────────────────────────────────────
  trivial [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/popup/App.tsx:187src/popup/App.tsx:187-195]8;;

  Remove the duplicate KTY_SCAN_COMPLETED dispatch, or make both senders
  consistent.

  executeScan in src/content/scanner.ts (lines 84-91) already sends
  KTY_SCAN_COMPLETED. The service worker resolves that message to
  sender.tab.id. The popup now sends a second message with tabId, so
  every popup-initiated scan updates the badge twice. The result is the
  same, so the badge does not break. The popup copy is only required for the
  pasted-text path, and that path does not send it. Keep one source of
  truth.


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/content/scanner.ts:66src/content/scanner.ts:66-68]8;;

  Block executeScan after hard burn, not only in the message handler.

  handleHardBurnDOM sets hardBurned = true and disconnects the observer.
  Only the KTY_REQUEST_PAGE_SCAN listener checks the flag. A debounced
  timer can already be running. stopDynamicObserver clears that timer, so
  the main risk comes from other paths: the DOMContentLoaded initializer
  and direct callers. Both call executeScan() with no guard. Each call
  recreates burnBroadcastChannel through ensureBurnBroadcastChannel(),
  injects indicators again, and repopulates cachedScanResult. This
  reverses the hard-burn teardown. Example: hard burn arrives before
  DOMContentLoaded fires on a loading page. The scan then still runs and
  re-injects badges. Return early from executeScan when hardBurned is
  set.


  🛡️ Proposed fix

   export function executeScan(): PageScanResult {
  +  if (hardBurned) {
  +    throw new Error('Scanner disabled after hard burn');
  +  }
     ensureBurnBroadcastChannel();


────────────────────────────────────────────────────────────────────────
  trivial [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/vite.config.ts:114vite.config.ts:114-123]8;;

  Safari manifest branch duplicates the generic non-ML CSP logic.

  When !isLocalMl, lines 90-95 already delete host_permissions and set
  the connect-src 'none' CSP. The Safari block repeats both operations.
  Remove the duplicate and keep only version_name and the
  browser_specific_settings deletion.




  ♻️ Proposed simplification

               if (targetBrowser === 'safari') {
                 manifest.version_name = manifest.version;
                 delete manifest.browser_specific_settings;
  -              if (!isLocalMl) {
  -                delete manifest.host_permissions;
  -                manifest.content_security_policy = {
  -                  extension_pages: "default-src 'self'; connect-src 'none'; style-src 'self' 'unsafe-inline'; script-src 'self';",
  -                };
  -              }
               }


────────────────────────────────────────────────────────────────────────
  trivial [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/scripts/record-demo.js:58scripts/record-demo.js:58-66]8;;

  Playwright cache lookup is macOS-only.

  The path Library/Caches/ms-playwright and the ffmpeg-mac binary name
  exist only on macOS. On Linux and Windows the lookup silently finds
  nothing. This is acceptable if the script is macOS-only. Otherwise, add
  ~/.cache/ms-playwright and platform-specific binary names.


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/scripts/record-demo.js:13scripts/record-demo.js:13-32]8;;

  resolvePlaywright depends on a package the project does not declare.

  package.json declares puppeteer, not Playwright. On a clean `npm
  install, every candidate fails and npm run demo` throws. The
  sibling-directory fallbacks (../node_modules) also assume a
  machine-specific portfolio layout. Add playwright to devDependencies,
  or use the declared puppeteer.


────────────────────────────────────────────────────────────────────────
  trivial [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/tests/bundle-invariants.test.ts:154tests/bundle-invariants.test.ts:154-191]8;;

  Safari test uses a POSIX env assignment in execSync.

  TARGET_BROWSER=safari npx vite build ... fails on native Windows
  cmd.exe. The existing Firefox test uses the same pattern, so this
  matches the current convention. Use `execSync(..., { env: {
  ...process.env, TARGET_BROWSER: 'safari' } })` to make the test portable.


────────────────────────────────────────────────────────────────────────
  trivial [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/docs/WALKTHROUGH-v1.6.md:27docs/WALKTHROUGH-v1.6.md:27-28]8;;

  Tombstone claim is incorrect.

  The text says the scanner rejects scans permanently after burn. Pass 3 in
  docs/coderabbit-pass3-iterative-audit.md found no tombstone in the v1.6
  scanner behavior. The v2.1 stack adds a hardBurned guard. Mark this
  statement as true only from v2.1, or reword it.






  Also applies to: 71-71


────────────────────────────────────────────────────────────────────────
  trivial [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/tests/bundle-invariants.test.ts:10tests/bundle-invariants.test.ts:10-14]8;;

  Setup no longer rebuilds when manifest.json is missing or stale.

  The check now looks only at background/service-worker.js and
  content/scanner.js. A stale dist/ from an older build can satisfy both
  checks. Then the tests run against old output. Consider always rebuilding
  in CI.


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/docs/SAFARI-SUBMISSION.md:82docs/SAFARI-SUBMISSION.md:82-83]8;;

  Doc claims tests/bundle-invariants.test.ts enforces the Privacy
  Manifest.

  The Safari test in tests/bundle-invariants.test.ts checks the manifest,
  scanner, and JS patterns. It does not check PrivacyInfo.xcprivacy, which
  is generated outside the repo. Remove the "Statically enforced" claim, or
  add a check.


────────────────────────────────────────────────────────────────────────
  trivial [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/docs/SECURITY.md:52docs/SECURITY.md:52]8;;

  Removing the email contact leaves a single reporting channel.

  GitHub Security Advisories require the feature to be enabled on the
  repository. Confirm that it is enabled. Otherwise reporters have no
  private path.


────────────────────────────────────────────────────────────────────────
  trivial [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/.coderabbit.yaml:14.coderabbit.yaml:14]8;;

  Confirm that reviewing every draft push is intended.

  drafts: true with profile: "assertive" increases review volume. The
  key is valid under the schema.


────────────────────────────────────────────────────────────────────────
  trivial [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/README.md:10README.md:10-12]8;;

  Status copy is inconsistent: v2.1.0 is called "Release Complete" while the
  Chrome and Firefox stores serve v1.6.0.

  The badge "Release Complete & Packaged" and the notice are accurate about
  packaging. The badge labels, however, may read as store availability. The
  Firefox badge also links to the generic https://addons.mozilla.org
  instead of the listing. Link the listing page.





  Also applies to: 16-17


────────────────────────────────────────────────────────────────────────
  trivial [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/docs/WALKTHROUGH-v1.6.md:22docs/WALKTHROUGH-v1.6.md:22]8;;

  Headings lack blank lines (MD022).

  Add a blank line after each listed heading.






  Also applies to: 30-30, 37-37, 47-47, 57-57, 67-67


────────────────────────────────────────────────────────────────────────
  major [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/.github/workflows/legal-statute-monitor.yml:58.github/workflows/legal-statute-monitor.yml:58-64]8;;

  draft: false removes the human-review gate that the docs promise.

  docs/ARCHITECTURE.md (line 64) and ROADMAP.md (line 49) say this
  workflow opens a Draft Pull Request so a human must review legal changes.
  This change sets draft: false and removes the needs-attorney-review
  label. Without a draft PR and the label, the PR can be merged without
  anyone noticing it needs attorney review. The daily schedule and the false
  findings from Last-Modified make this risk larger. Restore the draft PR
  and the label.


  Proposed fix

             labels: |
               statutory-review
  +            needs-attorney-review
  -          draft: false
  +          draft: true


────────────────────────────────────────────────────────────────────────
  trivial [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/docs/SAFARI-SUBMISSION.md:13docs/SAFARI-SUBMISSION.md:13]8;;

  Build command and Node range need correction.

  Line 13 says TARGET_BROWSER=safari npm run build:safari. Line 30 uses
  npm run build:safari alone. The script presumably sets the variable
  already. Remove the redundant prefix to avoid confusion.

  Line 25 is correct for Vite 8 (Node 20.19+ or 22.12+).





  Also applies to: 25-25


────────────────────────────────────────────────────────────────────────
  major [Data Integrity & Integration]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/statutory-update-report.md:1statutory-update-report.md:1-220]8;;

  Remove this generated report. It was not produced by the current script.

  The report has three problems:
  - It maps the EU- and UK- rules to Federal Register notices. The
  current script filters those rules out at line 195, so this file came from
  an older version of the script.
  - It cites UK DMCC Act 2024, Part 2. The pack now uses `Part 4, Chapter
  2`.
  - Its UK "Last Modified" column holds raw header strings. The current
  script normalizes those values to YYYY-MM-DD.

  The 190 "notices" are also unrelated results (fisheries, drawbridges).
  This shows that unquoted conditions[term] keyword searches return noise
  for every rule. Delete the file, add statutory-update-report.md to
  .gitignore, and quote multi-word keywords in checkFederalRegister.


────────────────────────────────────────────────────────────────────────
  trivial [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/docs/SECURITY.md:11docs/SECURITY.md:11-13]8;;

  Supported-versions table mislabels the distribution channel.

  v2.1.0 is "Release Candidate" while README.md calls it "Release Complete
  & Packaged". Use one status term. Also, Firefox and Safari are not listed
  as channels for v2.1.0.


────────────────────────────────────────────────────────────────────────
  trivial [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/tests/bundle-invariants.test.ts:76tests/bundle-invariants.test.ts:76-80]8;;

  Import/export regex misses minified IIFE output and mid-line statements.

  /^\s*import\b/m matches only line-start tokens. Minified output can
  place import or export mid-line. A dynamic import( at line start
  also matches and fails the test, though it is not an ES module
  declaration. Prefer a check that the file starts with an IIFE wrapper and
  contains no import  followed by a specifier.


────────────────────────────────────────────────────────────────────────
  major [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/scripts/check-statutory-updates.mjs:103scripts/check-statutory-updates.mjs:103-114]8;;

  Last-Modified reports a new amendment on every run.

  The EUR-Lex and legislation.gov.uk endpoints are dynamic, so their
  Last-Modified header is the time the response was generated. It does not
  show when the law was amended. The committed report shows this: both UK
  acts have Last-Modified equal to the generation time (`Thu, 08 Oct 2026
  12:45:42 GMT), and both EU acts have the run date. As a result, modDate
  > baselineDate is always true. The monitor sets has_updates=true` every
  day, and the daily workflow opens a false update PR every day.

  Parse a date that comes from the content instead. For the
  legislation.gov.uk Atom feed, read ` or the latest ` entry. For EUR-Lex,
  read the ELI consolidated-version date. Treat a date that equals the
  request time as unknown.





  Also applies to: 146-156


────────────────────────────────────────────────────────────────────────
  trivial [Stability & Availability]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/vite.config.ts:53vite.config.ts:53-76]8;;

  Scanner sub-build runs in closeBundle without error isolation and
  inherits no mode.

  The nested build() call uses configFile: false. It does not pass
  mode. The airGapTransformPlugin closure reads the outer mode and
  isLocalMl, so stripping stays consistent. However, a failure in the
  nested build is thrown from closeBundle, and the manifest patching in
  step 2 is skipped. The failure surfaces as a generic bundle error. Wrap
  the call in try/catch that rethrows with a clear message naming
  content/scanner.js.

  Also, the airGapTransformPlugin stripping of fetch( in
  local-ml-client is skipped when mode === 'test'. This is intended for
  tests. Confirm that npm run build never runs with --mode test.


────────────────────────────────────────────────────────────────────────
  minor [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/ROADMAP.md:177ROADMAP.md:177-187]8;;

  Phase 3 is marked complete for a release that is not part of this change.

  Phase 3 targets v2.2.0 and describes work in external repositories
  (bill-of-rights-bot, careCheck, lease-audit). The status line
  declares v2.1.0 as the current release. You can either mark Phase 3 as
  planned or cite where it was delivered. Without that change, the roadmap
  claims features that this release cannot verify.


────────────────────────────────────────────────────────────────────────
  trivial [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/README.md:108README.md:108-132]8;;

  Add blank lines around the Safari heading and code fence.

  package:all already exists in package.json and is documented above.
  Add the missing Markdown spacing for MD022 and MD031.


  Suggested fix

   ### Apple Safari Packaging & Xcode Integration
  +
   To convert the Safari distribution into a native macOS/iOS Safari Web Extension:
  +
   

  bash
  npm run build:safari
  xcrun safari-web-extension-converter dist-safari --app-name "KnowThankYew"

  +
   - **App Sandbox Entitlements**: Zero network entitlements required. `com.apple.security.network.client` is **NOT** included in the consumer build because all analysis runs 100% locally under `connect-src 'none'`.

  package:all is defined.
  The README already documents npm run package:all.
  The Safari heading is immediately followed by prose, the prose is
  immediately followed by the fenced code block, and the closing fence is
  immediately followed by a list item.
  The Safari section lacks the blank lines required by the cited MD022 and
  MD031 formatting rules.
  The attempted Markdownlint-configuration search failed with a shell syntax
  error; no configuration conclusion is drawn from that command.


────────────────────────────────────────────────────────────────────────
  minor [Security & Privacy] | 🛡️ Analyzed with Security Review
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/core/handoff.ts:134src/core/handoff.ts:134-140]8;;

  Security: Sensitive Data Exposure (CWE-359)
  Reachability: External · Exploitability: Difficult

  Sanitize all finding text fields and normalize the legal link before
  export. buildHandoffPayload copies title, statuteCode, and
  statuteTitle without sanitizeSnippet, and stores primaryLegalLink by
  reference. Sanitize the link title and remove its query string and
  fragment before adding it to the payload.


  🛡️ Proposed fix

  +function sanitizeLegalLink(link: DiscoveredLegalLink): DiscoveredLegalLink {
  +  return {
  +    ...link,
  +    title: sanitizeSnippet(link.title || ''),
  +    url: link.url.split(/[?#]/, 1)[0],
  +  };
  +}
  +
  ...
  -    title: match.title,
  +    title: sanitizeSnippet(match.title || ''),
  ...
  -    statuteCode: match.statute?.code || '',
  -    statuteTitle: match.statute?.title || '',
  +    statuteCode: sanitizeSnippet(match.statute?.code || ''),
  +    statuteTitle: sanitizeSnippet(match.statute?.title || ''),
  ...
  -        primaryLegalLink = found;
  +        primaryLegalLink = sanitizeLegalLink(found);
  ...
  -      primaryLegalLink = scanResult.discoveredLinks[0];
  +      primaryLegalLink = sanitizeLegalLink(scanResult.discoveredLinks[0]);


────────────────────────────────────────────────────────────────────────
  major [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/popup/handoff-bridge.ts:29src/popup/handoff-bridge.ts:29-48]8;;

  Do not report success when the payload was not written.

  For non-GitHub destinations, the injected function catches
  sessionStorage.setItem failures and returns undefined.
  chrome.scripting.executeScript can therefore resolve without confirming
  that the payload was stored, and the dispatcher returns success: true.
  Return a boolean from the injected function and check results[0]?.result
  before reporting success.

  Also wait for the created tab to reach status === 'complete' before
  injecting. chrome.tabs.create() does not indicate that navigation has
  completed.


────────────────────────────────────────
Review complete
Review completed
29 findings ✔

Major    6
Minor    7
Trivial  16

67 files reviewed:
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
  ... and 57 more files
Excluded unsupported binary files: demo.gif, demo.mp4
────────────────────────────────────────

Print all AI prompts: coderabbit review --show-prompts

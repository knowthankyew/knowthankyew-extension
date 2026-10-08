Most recent local review with findings: 24 stored findings
Review directory: /Users/cl0rkster/Dev/knowthankyew-extension
Base branch: main

────────────────────────────────────────────────────────────────────────
  major [Functional Correctness]
  → scripts/check-statutory-updates.mjs:97-103

  Compare authoritative revisions before reporting international updates.
  Both checks append a finding for an unchanged response and can present a
  failed HTTP response as a successful check.
  - scripts/check-statutory-updates.mjs#L97-L103: check the EU response,
  obtain amendment data, and compare a stable revision with the prior check.
  - scripts/check-statutory-updates.mjs#L128-L133: check and parse the UK
  feed, compare a stable revision, and report request failures separately.


────────────────────────────────────────────────────────────────────────
  minor [Performance & Scalability]
  → src/options/pdf-extractor.ts:162

  fontRegex and pageObjRegex can take quadratic time on a user-selected
  PDF and freeze the options page.

  Both patterns use (?:(?!endobj)[\s\S])*? from every N 0 obj start
  position.

  - In a large PDF with many objects that contain no `/Type /Font ...
  /ToUnicode, each attempt scans forward to the next endobj`. This cost is
  roughly linear per object.
  - Content can also contain an obj token without a matching endobj, or
  /Type /Page can be absent. In those cases each start position can scan
  to the end of the file, which gives O(n²) total work.

  The extractor runs synchronously on the UI thread.

  Fix: split the input on endobj boundaries once. Then test each object
  body with simple non-backtracking checks. Also consider a byte-size cap.

  The OpenGrep child_process.exec hints are false positives. This file
  calls RegExp.prototype.exec.






  Also applies to: 172-172


────────────────────────────────────────────────────────────────────────
  major [Functional Correctness]
  → src/background/service-worker.ts:78-79

  Clear tab-specific badges before reporting a successful hard burn.
  updateBadgeForScan now sets badges with tabId, but hardBurnAllData
  clears only the global badge. A tab with findings therefore retains its
  count after this handler responds with status: 'burned'. Clear the
  badges of open tabs as part of the burn before sending the success
  response. Global badge changes do not replace tab-specific settings.
  (developer.chrome.com)


────────────────────────────────────────────────────────────────────────
  trivial [Maintainability & Code Quality]
  → tests/pdf-extractor.test.ts:29-49

  The test depends on a personal file in ~/Downloads and can pass using a
  different buffer than intended.

  Problems:
  - The test defaults to ~/Downloads/06.26.2025.pdf. That path exposes a
  personal contract (ALIGNERR LLC) in the repository, and the test is
  skipped on every other machine.
  - readFileSync(...).buffer can return a pooled ArrayBuffer that is
  larger than the file.

  Fix:
  1. Commit a small synthetic FlateDecode and CMap fixture under
  tests/fixtures.
  2. Pass the exact file bytes with `buf.buffer.slice(buf.byteOffset,
  buf.byteOffset + buf.byteLength)`.


────────────────────────────────────────────────────────────────────────
  major [Functional Correctness]
  → .coderabbit.yaml:4

  Set version to a number.

  The supplied parser requires schema version 2 or 3 as a number. `version:
  "2"` is a string, so the review configuration does not load. Change it to
  version: 2.


────────────────────────────────────────────────────────────────────────
  minor [Data Integrity & Integration]
  → src/options/OptionsApp.tsx:186-201

  A file read that resolves after a hard burn restores the document text and
  results.

  handleFileUpload awaits file.arrayBuffer() or file.text(). If a hard
  burn happens during that await, through either the KTY_HARD_BURN_DOM
  broadcast or handleBurnAll, the handler still runs afterwards. It then
  calls setDocText and handleAuditDoc, which brings back the document
  state that the burn just cleared. handlePasteClipboard has the same
  problem around readText().

  Fix:
  1. Add a burnGenerationRef counter.
  2. Increment it in both burn paths.
  3. Capture the counter value before each await.
  4. After the await, skip all state updates if the value has changed.

  As per coding guidelines: "clear document/audit state and show success
  only after completion."


────────────────────────────────────────────────────────────────────────
  minor [Maintainability & Code Quality]
  → docs/WALKTHROUGH-v2.1.md:119

  Correct the rule count.

  The document says "42+ compiled rules" and "42+ patterns".
  tests/policy-packs.test.ts Line 61 asserts
  COMPILED_POLICY_RULES.length is 19. Replace "42+ compiled rules" with
  "19 compiled rules". Replace the pattern count with the actual total of
  pattern strings, or remove the number.





  Also applies to: 147-147


────────────────────────────────────────────────────────────────────────
  major [Functional Correctness]
  → scripts/check-statutory-updates.mjs:215-219

  Include changed international results in has_updates.

  The new UK and EU collections feed the report, but the GITHUB_OUTPUT
  assignment at Lines 279–282 still checks only uniqueFindings. If a UK or
  EU amendment occurs without a US notice, the workflow skips PR creation.
  After implementing revision detection, derive has_updates and the
  finding count from changed results in all three jurisdictions.


────────────────────────────────────────────────────────────────────────
  major [Stability & Availability]
  → src/options/pdf-extractor.ts:61-63

  A bfrange entry from an untrusted PDF can drive an unbounded loop and
  exhaust memory.

  Format B iterates from start to end with no limit. A CMap entry such
  as   inserts about 4 billion map entries. That hangs the page and
  exhausts memory.

  Fix: clamp the range and skip invalid entries.


  Fix

  -        for (let c = start; c <= end; c++) {
  +        if (end < start || end - start > 0xffff) continue;
  +        for (let c = start; c <= end; c++) {


────────────────────────────────────────────────────────────────────────
  trivial [Maintainability & Code Quality]
  → src/core/handoff.ts:244-248

  Validate the primaryLegalLink.url scheme before accepting the payload.

  validateHandoffPayload accepts any string as primaryLegalLink.url.
  Destination tools call readAndClearHandoffPayload and receive this
  payload as validated. If a destination renders the URL as a link, a
  javascript: URL can reach that sink. Add a check that rejects any URL
  whose parsed protocol is not https: or http:. The path instructions
  say the validator does not cover arbitrary incoming link URLs, so state
  that limit in the JSDoc. Then destination tools will not treat the
  validator as URL sanitization.


  Proposed hardening

       if (typeof p.primaryLegalLink.url !== 'string') return false;
  +    try {
  +      const proto = new URL(p.primaryLegalLink.url).protocol;
  +      if (proto !== 'https:' && proto !== 'http:') return false;
  +    } catch {
  +      return false;
  +    }
       if (typeof p.primaryLegalLink.title !== 'string') return false;


────────────────────────────────────────────────────────────────────────
  major [Functional Correctness]
  → .github/workflows/legal-statute-monitor.yml:4-6

  Detect new notices before running the daily PR flow.

  The US query searches a lookback window but does not compare results with
  a previous run. A notice remains a finding on later daily runs. The
  generated report also changes its timestamp on each run. While that notice
  remains in the window, the schedule can create and merge another
  report-only PR each day. Store a notice checkpoint or compare document IDs
  before setting has_updates.


────────────────────────────────────────────────────────────────────────
  minor [Maintainability & Code Quality]
  → .coderabbit.yaml:29

  Move the global audit block into reviews.path_instructions.

  reviews.instructions is not a supported CodeRabbit setting, so the audit
  block at .coderabbit.yaml:28-59 may not be applied. Put it in a
  path_instructions entry whose glob covers every intended file. Keep the
  existing narrower entries for path-specific checks.

  Use a schema-valid configuration version before relying on these
  directives.


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → docs/BUILD.md:41

  Name the archive that the command produces.

  npm run package:firefox reads version 2.1.0 from package.json. It
  produces knowthankyew-extension-v2.1.0-firefox.zip, not the v2.0.0
  archive stated here. Update this release-review instruction, including the
  target version at Line 5.


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → src/popup/App.tsx:318-325

  Batch handoff resolves the banner tool and the payload tool with different
  domain inputs.

  At Line 320, resolveDestinationTool receives activeHostname. At Line
  321, buildHandoffPayload(scanResult) resolves the tool again with
  scanResult.urlDomain. If only one of these values contains a lease
  keyword, the status message names one tool and the payload targets a
  different tool. Pass targetTool.id into buildHandoffPayload.


  Fix

  -    const payload = buildHandoffPayload(scanResult);
  +    const payload = buildHandoffPayload(scanResult, targetTool.id);


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → README.md:131

  Use the correct Apple privacy-manifest key. Both instructions name
  NSPrivacyTrackedDataTypes instead of NSPrivacyCollectedDataTypes.
  (developer.apple.com)
  - README.md#L131-L131: replace the key in the Safari packaging
  instruction.
  - ROADMAP.md#L88-L88: replace the key in the completed Safari milestone.


────────────────────────────────────────────────────────────────────────
  minor [Performance & Scalability]
  → src/options/OptionsApp.tsx:146-157

  The audit runs synchronously on the main thread, so the isAuditingDoc
  spinner never renders.

  handleAuditDoc sets isAuditingDoc to true, calls scanDocumentText
  synchronously, and resets the flag in finally. React batches all three
  state updates into one render. As a result, the user never sees "Analyzing
  Document...". The UI also freezes for the full scan. This matters for
  large PDFs: the test fixture extracts more than 40,000 characters, and
  scanDocumentText has no total-work bound.

  Fix: yield before the scan, or move the scan into a worker.


  Proposed fix

  -  const handleAuditDoc = (textToAudit?: string, fileName?: string) => {
  +  const handleAuditDoc = async (textToAudit?: string, fileName?: string) => {
  @@
       setIsAuditingDoc(true);
       try {
  +      await new Promise((r) => setTimeout(r, 0));
         const activeName = fileName || docFileName || 'document-input';


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → src/popup/components/TrapCard.tsx:17-44

  The Nano summary from a previous match stays on screen when match
  changes.

  The effect never resets nanoSummary when its dependencies change. If the
  card is reused for a different match, it shows the old obligationSummary
  and rightsWaived until the new request finishes. If the new request
  fails, the old summary stays on screen permanently.

  Fix: call setNanoSummary(null) at the start of the effect.


────────────────────────────────────────────────────────────────────────
  minor [Security & Privacy] | 🛡️ Analyzed with Security Review
  → src/popup/handoff-bridge.ts:59-61

  Security: Security Misconfiguration (CWE-1022)
  Reachability: Internal · Exploitability: Difficult

  Pass noopener,noreferrer to window.open.

  The fallback opens a destination URL, which is localhost in dev mode.
  Without noopener, the opened page can use window.opener to change the
  extension page's location.

  -    window.open(targetUrl, '_blank');
  +    window.open(targetUrl, '_blank', 'noopener,noreferrer');

  Update the assertions in tests/handoff-bridge.test.tsx Line 110 and Line
  200 to match the new arguments.


────────────────────────────────────────────────────────────────────────
  major [Data Integrity & Integration]
  → .github/workflows/legal-statute-monitor.yml:71-73

  Keep statutory updates behind legal review.

  The monitor creates a non-draft pull request and immediately merges it
  when an update is found. The generated report explicitly assigns review to
  a legal reviewer. This workflow does not wait for that review.


  🐛 Suggested fix

  -      - name: Auto-Merge Statutory Update PR
  -        if: steps.check_statutes.outputs.has_updates == 'true' &amp;&amp; steps.cpr.outputs.pull-request-number != ''
  -        env:
  -          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  -        run: |
  -          echo "Auto-merging statutory update PR #${{ steps.cpr.outputs.pull-request-number }}..."
  -          gh pr merge ${{ steps.cpr.outputs.pull-request-number }} --squash --delete-branch


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → src/content/scanner.ts:149-157

  Match each indicator to its own checkbox's finding.

  actionableMatches[idx % actionableMatches.length] picks a finding by
  position. The finding does not depend on the anchor's label. Example: a
  page has one arbitration checkbox and one auto-renewal checkbox. Matches
  are ordered by rule iteration, so the arbitration checkbox can show the
  AR-001 auto-renewal tooltip. The badge then shows the user a wrong
  statutory claim.

  Fix: findPredatoryCheckboxAnchors must return the anchor together with
  the matched pattern category, for example `{ el, category: 'AUTO_RENEWAL'
  | 'ARBITRATION' }. Choose a match with the same category`. If no match
  has that category, skip the anchor.


  Proposed fix sketch

  -  anchors.forEach((anchor, idx) => {
  -    const match = actionableMatches[idx % actionableMatches.length];
  +  anchors.forEach(({ el: anchor, category }) => {
  +    const match = actionableMatches.find((m) => m.category === category);
  +    if (!match) return;
       injectIndicator({


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → src/popup/components/SeverityBadge.tsx:10-17

  The severity labels are inverted: CRITICAL reads milder than WARNING.

  CRITICAL maps to "Watch out" and WARNING maps to "This is a problem".
  Users read "This is a problem" as the more severe label.

  Fix: swap the two labels, or use labels that clearly rank the severities.


  Fix

         case 'CRITICAL':
  -        return 'Watch out';
  +        return 'This is a problem';
         case 'WARNING':
  -        return 'This is a problem';
  +        return 'Watch out';


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → docs/CHROMEWEBSTORE.md:18

  Align the upload steps with the advertised ZIP.

  This source-of-truth section names knowthankyew-extension-v2.0.0.zip,
  but Steps 1 and 2 still direct an uploader to
  knowthankyew-extension-v1.5.0.zip and its old checksum. Update those
  steps and the checksum before using this document for a 2.0.0 submission.


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → src/popup/components/AuditReceiptCard.tsx:15

  The ?? 42 fallback can show a wrong rule count on the receipt.

  The receipt is presented as proof that the audit ran. If
  evaluatedRulesCount is missing, the card shows "42 rules evaluated",
  which is a made-up number.

  Fix: when evaluatedRulesCount is missing, render "—" or hide the badge.


────────────────────────────────────────────────────────────────────────
  major [Functional Correctness]
  → scripts/check-statutory-updates.mjs:233-235

  Restrict Federal Register queries to applicable US tracking targets.

  The loader supplies targets from every policy pack to the Federal Register
  loop, while this new section presents every result as a US statutory
  update. The committed report shows EU and UK rule IDs paired with
  unrelated US notices. Filter targets by jurisdiction before building the
  Federal Register keyword map; keep UK and EU targets in their respective
  monitors.


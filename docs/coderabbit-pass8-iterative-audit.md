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
(• .•)  You know what they call CodeRabbit in Paris? Royale with Debug.


────────────────────────────────────────────────────────────────────────
  trivial [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/.coderabbit.yaml:35.coderabbit.yaml:35-37]8;;

  Scope the zero-egress review instruction.

  This instruction prohibits every fetch call in every file. The release
  context also includes a statutory-feed monitor and an opt-in loopback ML
  worker. Distinguish prohibited extension egress from those intended paths
  so reviews do not report them as violations.

  As per path instructions, “The extension operates under strict
  zero-egress, client-side amnesiac constraints.”


────────────────────────────────────────────────────────────────────────
  trivial [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/core/policy-packs/us-federal.json:80src/core/policy-packs/us-federal.json:80]8;;

  The bare agree\s+to\s+binding\s+arbitration alternative makes the other
  alternatives redundant.

  The final alternative agree\s+to matches any text that the `you and ...
  agree to` branch also matches. The party-specific alternatives therefore
  have no effect on matching. Matching does not change, but the expanded
  contractor and client branches add no detection. Simplify the pattern, or
  remove the bare alternative if you want the party list to restrict
  matches.


────────────────────────────────────────────────────────────────────────
  minor [Data Integrity & Integration]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/core/handoff.ts:241src/core/handoff.ts:241-250]8;;

  Reject non-finite riskScore and invalid summary counts.

  The riskScore check fails open for NaN. Both NaN 100 evaluate to
  false, so a payload with riskScore: NaN passes validation. The
  summary checks also accept NaN, Infinity, negative values, and
  fractional counts. A function described as a "fail-closed runtime
  validator" should reject these values. Destination tools can otherwise
  receive a corrupt score or corrupt counts.


  🛡️ Proposed fix

  -  if (typeof p.riskScore !== 'number' || p.riskScore < 0 || p.riskScore > 100) return false;
  +  if (!Number.isFinite(p.riskScore) || p.riskScore < 0 || p.riskScore > 100) return false;
   
     if (!p.summary || typeof p.summary !== 'object') return false;
  -  if (
  -    typeof p.summary.critical !== 'number' ||
  -    typeof p.summary.warning !== 'number' ||
  -    typeof p.summary.info !== 'number'
  -  ) {
  +  const isCount = (n: unknown) => Number.isInteger(n) && (n as number) >= 0;
  +  if (!isCount(p.summary.critical) || !isCount(p.summary.warning) || !isCount(p.summary.info)) {
       return false;
     }


────────────────────────────────────────────────────────────────────────
  minor [Stability & Availability]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/scripts/check-statutory-updates.mjs:217scripts/check-statutory-updates.mjs:217]8;;

  An invalid `` value throws and discards the entire feed.

  For an unparsable date, new Date(...) returns Invalid Date, and
  toISOString() then throws RangeError. The outer catch records the
  throw as an endpoint error. Valid entries that were already scanned or
  come later in the feed are lost. Skip entries that have invalid dates.


  🐛 Proposed fix

  -        const d = new Date(updatedMatch[1]).toISOString().split('T')[0];
  +        const parsed = new Date(updatedMatch[1].trim());
  +        if (Number.isNaN(parsed.getTime())) continue;
  +        const d = parsed.toISOString().split('T')[0];


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/popup/App.tsx:416src/popup/App.tsx:416-422]8;;

  Open the options page on the #document section.

  chrome.runtime.openOptionsPage() opens the options page without a hash.
  OptionsApp selects the auditor tab only when #document or #audit is
  present, so the "Full Auditor ↗" button lands on the Memory tab instead.
  Use chrome.tabs.create with
  chrome.runtime.getURL('options.html#document').

  -    if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
  -      chrome.runtime.openOptionsPage();
  +    if (typeof chrome !== 'undefined' && chrome.tabs?.create && chrome.runtime?.getURL) {
  +      chrome.tabs.create({ url: chrome.runtime.getURL('options.html#document') });
       } else {


────────────────────────────────────────────────────────────────────────
  trivial [Performance & Scalability]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/core/engine.ts:116src/core/engine.ts:116-119]8;;

  Bound the preview input before you call sanitizeSnippet.

  sanitizeSnippet(text) runs three global regexes over the full input. The
  engine then keeps only 2,000 characters. Pasted, imported, and
  PDF-extracted text has no 50,000-character cap, and PDF extraction can
  return up to 2,000,000 characters. Every scan therefore does work that
  grows with the input length on the UI thread, and most of that work is
  discarded. Sanitize a bounded slice, for example the first 4,000
  characters. A slice still prevents PII leakage at the boundary because the
  preview is cut after redaction.


  Proposed fix

  -  const sanitizedPreviewText = sanitizeSnippet(text);
  +  const sanitizedPreviewText = sanitizeSnippet(text.slice(0, 4000));


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/options/OptionsApp.tsx:96src/options/OptionsApp.tsx:96-109]8;;

  Reset isAuditingDoc in the external-burn handler.

  The BroadcastChannel burn handler increments burnGenerationRef. After
  that, the in-flight handleAuditDoc skips setIsAuditingDoc(false) in
  its finally block, because the generation no longer matches. The handler
  does not reset isAuditingDoc itself. The local handleBurnAll path does
  reset it. If an external burn arrives during an audit, the "Run Statutory
  Audit" button stays disabled with the text "Analyzing Document..." until
  the page reloads.

               setDocError(null);
  +            setIsAuditingDoc(false);
               refreshDiagnostics();


────────────────────────────────────────────────────────────────────────
  trivial [Security & Privacy] | 🛡️ Analyzed with Security Review
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/.github/workflows/legal-statute-monitor.yml:30.github/workflows/legal-statute-monitor.yml:30]8;;

  Security: Security Misconfiguration (CWE-829)
  Exploitability: Difficult

  Pin the actions to commit SHAs and disable credential persistence.

  This scheduled workflow grants contents: write and `pull-requests:
  write. Pin actions/checkout@v7, actions/setup-node@v7`, and
  peter-evans/create-pull-request@v8 to full commit SHAs. Set
  persist-credentials: false on checkout unless create-pull-request
  requires persisted credentials.


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/docs/WALKTHROUGH-v2.1.md:162docs/WALKTHROUGH-v2.1.md:162]8;;

  Use the Privacy Manifest data-collection key.

  NSPrivacyTrackedDataTypes is not the key shown in
  docs/SAFARI-SUBMISSION.md. Apple documents NSPrivacyCollectedDataTypes
  for collected data. Change this row so a reviewer does not copy an
  ineffective privacy declaration. (developer.apple.com)


────────────────────────────────────────────────────────────────────────
  minor [Data Integrity & Integration]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/docs/WALKTHROUGH-v2.1.md:167docs/WALKTHROUGH-v2.1.md:167-172]8;;

  Do not embed fixed hashes for regenerated archives.

  npm run package:all regenerates the ZIP files and then computes
  SHA256SUMS from those files. The four fixed values here will not track a
  later package run and can give readers a conflicting integrity check. Link
  to the generated SHA256SUMS file without copying its values, or update
  this block as part of each release build.


────────────────────────────────────────────────────────────────────────
  trivial [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/tests/bundle-invariants.test.ts:182tests/bundle-invariants.test.ts:182-183]8;;

  Check Safari imports throughout the script.

  The Safari assertions check only the start of each line. A classic script
  containing (()=>{})();import "./chunk.js"; passes these assertions,
  although the import prevents classic-script execution. Use the same
  scanner checks as the standard and Firefox tests, and add a same-line
  import fixture.


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/docs/LOCAL-ML-SETUP.md:32docs/LOCAL-ML-SETUP.md:32]8;;

  Load the Local Assist output directory.

  If a reader runs npm run build:local-assist, the script writes to
  dist-local-assist, not dist. Loading dist/ instead loads the
  consumer build, whose connect-src 'none' blocks the worker. Change the
  Chrome directory in this instruction to dist-local-assist/.


────────────────────────────────────────
Review complete
Review completed
12 findings ✔

Minor    7
Trivial  5

71 files reviewed:
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
  ... and 61 more files
Excluded unsupported binary files: demo.gif, demo.mp4
────────────────────────────────────────

Print all AI prompts: coderabbit review --show-prompts

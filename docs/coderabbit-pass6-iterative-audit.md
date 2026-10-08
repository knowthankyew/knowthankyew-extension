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
(• .•)  Pulling the bugs out of the hat.


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/core/handoff.ts:123src/core/handoff.ts:123-129]8;;

  Reject non-HTTP legal links at build time.

  sanitizeLegalLink strips the query string and fragment, but it keeps any
  URL scheme. Suppose a page exposes a javascript: or data: link as a
  discovered legal link. buildHandoffPayload then produces a payload that
  validateHandoffPayload rejects. Because of that,
  dispatchHandoffToDestination fails silently for that scan. Parse the URL
  with new URL in this function. If the scheme is not http: or https:,
  return null and try the next link.


────────────────────────────────────────────────────────────────────────
  major [Performance & Scalability]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/options/OptionsApp.tsx:208src/options/OptionsApp.tsx:208-218]8;;

  Move PDF extraction off the main thread, or bound its regex work.

  extractTextFromPdfBuffer runs synchronously on the options-page main
  thread. The setTimeout(0) yield only lets React paint the spinner before
  parsing starts. It does not make the parsing itself non-blocking. On a
  crafted 10 MB PDF, the extractor runs several lazy [\s\S]*? scans over
  the full latin1 string, and the page freezes while they run. For example,
  objRegex is retried from every N 0 obj position when endobj is
  missing. The path instruction asks to "Ensure large documents do not hang
  or lock the main thread." Run the extraction in a dedicated Worker, or add
  hard per-scan iteration and time caps inside the extractor.


────────────────────────────────────────────────────────────────────────
  major [Performance & Scalability]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/options/pdf-extractor.ts:238src/options/pdf-extractor.ts:238-242]8;;

  Fix the quadratic backtracking in object discovery.

  The regex /(\d+)\s+0\s+obj([\s\S]*?)endobj/g has a failure mode on files
  without a closing endobj. If the file contains many N 0 obj headers
  but no endobj, each match attempt scans to the end of the input before
  it fails. Then lastIndex advances by only one character. The total cost
  is O(n²) over up to 10 MB. The MAX_SCANNED_OBJECTS counter only counts
  successful matches, so it does not stop this loop. Find object headers
  with indexOf and locate the next endobj once per header. The tokenizer
  at Line 311 and the fallback at Line 351 have the same unbounded (...)
  or [...] scan on unterminated input.


────────────────────────────────────────────────────────────────────────
  major [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/scripts/record-demo.js:15scripts/record-demo.js:15-17]8;;

  Declare the browser driver used by the demo.

  If a developer installs only the declared dependencies, none of these
  Playwright candidates is installed. resolvePlaywright() then throws
  before the demo starts. Add a direct Playwright dependency, or use the
  declared Puppeteer dependency.


────────────────────────────────────────────────────────────────────────
  minor [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/docs/WALKTHROUGH-v2.1.md:119docs/WALKTHROUGH-v2.1.md:119]8;;

  Make the rule and pattern counts consistent across the documentation.

  This walkthrough states "19 compiled rules (with 42+ pattern heuristics)"
  and "42+ patterns". ROADMAP.md Line 14 states 66 regex patterns. Count
  the patterns once and use that one number in every document.






  Also applies to: 147-147


────────────────────────────────────────────────────────────────────────
  major [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/scripts/check-statutory-updates.mjs:104scripts/check-statutory-updates.mjs:104-109]8;;

  Track EU amendments rather than the original act's HTTP timestamp.

  For both directives, checkEurLex treats the /oj response's
  Last-Modified header as an amendment date. EUR-Lex distinguishes the
  original act at /oj from consolidated versions and later amendments. An
  amendment can therefore leave this check with no finding, while a change
  to the served resource can produce a finding without an amendment. Query
  amendment or consolidated-version metadata instead of using the HTTP
  header as the legal signal. (eur-lex.europa.eu)


────────────────────────────────────────────────────────────────────────
  major [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/scripts/check-statutory-updates.mjs:149scripts/check-statutory-updates.mjs:149-160]8;;

  Query changes affecting each UK Act.

  checkUkLegislation uses `` dates from each Act's feed as evidence of
  statutory revisions. The legislation.gov.uk API provides a separate
  changes feed that identifies changes affecting a specified Act. If an
  affecting change has been recorded but has not produced a new version of
  the Act, this check reports no update. Query the affected-legislation
  changes feed and evaluate its change records against the baseline.
  (legislation.github.io)


────────────────────────────────────────────────────────────────────────
  major [Stability & Availability]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/scripts/check-statutory-updates.mjs:329scripts/check-statutory-updates.mjs:329-331]8;;

  Preserve the scheduled review when statutory endpoints fail.

  When all UK and EU checks fail and no US finding exists, the script writes
  has_updates=false even though the report contains endpoint errors. The
  workflow creates the review pull request only when has_updates is
  true. Emit a failure output and include it in the workflow condition.


  🐛 Suggested fix

  --- a/scripts/check-statutory-updates.mjs
  +++ b/scripts/check-statutory-updates.mjs
  @@
       const totalCount = uniqueFindings.size + ukFindings.length + euFindings.length;
       const hasUpdates = totalCount > 0 ? 'true' : 'false';
  -    const outputContent = `has_updates=${hasUpdates}\nfindings_count=${totalCount}\n`;
  +    const checkFailed = ukErrors.length > 0 || euErrors.length > 0 ? 'true' : 'false';
  +    const outputContent = `has_updates=${hasUpdates}\nfindings_count=${totalCount}\ncheck_failed=${checkFailed}\n`;

  --- a/.github/workflows/legal-statute-monitor.yml
  +++ b/.github/workflows/legal-statute-monitor.yml
  @@
  -        if: steps.check_statutes.outputs.has_updates == 'true'
  +        if: steps.check_statutes.outputs.has_updates == 'true' || steps.check_statutes.outputs.check_failed == 'true'


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/README.md:134README.md:134]8;;

  Remove the unsupported Privacy Manifest verification claim.

  tests/bundle-invariants.test.ts checks the Safari JavaScript and
  extension manifest. It does not inspect an Xcode PrivacyInfo.xcprivacy
  file or verify these two declarations. Remove “verified by physical bundle
  invariant testing,” or add a check against the packaged native target.


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/README.md:11README.md:11]8;;

  Link the Firefox badge to the extension listing.

  The “Firefox AMO: v1.6.0 Live” badge opens the AMO homepage, not the
  KnowThankYew listing. Link the badge to the published listing so readers
  can reach the stated release. (addons.mozilla.org)


────────────────────────────────────────────────────────────────────────
  minor [Data Integrity & Integration]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/package.json:14package.json:14-16]8;;

  Create each browser archive from a clean ZIP.

  If a developer runs one of these package scripts after removing a built
  file, zip -r retains that file in an existing archive. The ZIP and its
  checksum then describe more files than the current build contains. Remove
  the target ZIP before packaging, or use ZIP file synchronization.
  (manpages.debian.org)


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/docs/BUILD.md:12docs/BUILD.md:12]8;;

  Require Node 22.12 or newer for the verification steps.

  This guide permits Node 20 and then directs reviewers to run npm test.
  Vitest 5 requires Node 22.12 or newer, so the documented Node 20
  environment cannot complete that verification step. Specify Node 22.12+
  for the full procedure, or distinguish the build-only and test
  requirements. (vitest.dev)


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/docs/BUILD.md:29docs/BUILD.md:29]8;;

  Do not describe the build output as unminified.

  npm run build:firefox does not disable Vite minification. Vite 8
  minifies client builds by default. Remove “unminified-asset,” or provide
  and document a separate unminified reviewer build. (v8.vite.dev)


────────────────────────────────────────
Review complete
Review completed
13 findings ✔

Major    6
Minor    7

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

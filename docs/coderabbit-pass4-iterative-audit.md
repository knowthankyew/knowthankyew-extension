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
Compare   : main → main (local main differs, using origin/main)
Directory : knowthankyew-extension
────────────────────────────────────────

(\(\
(• .•)  Turning your WTFs per minute into OMGs per hour.


────────────────────────────────────────────────────────────────────────
  trivial [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/.coderabbit.yaml:15.coderabbit.yaml:15]8;;

  Confirm that reviewing draft PRs is intended.

  drafts: true triggers automatic reviews on every draft push. With
  profile: "assertive", this raises review volume. The setting is valid
  under the schema.


────────────────────────────────────────────────────────────────────────
  trivial [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/.coderabbit.yaml:4.coderabbit.yaml:4]8;;

  Remove the unsupported top-level version key, or confirm it is
  intentional.

  The supplied configuration schema does not define a version property.
  The schema sets additionalProperties: {}, so the key does not fail
  validation. CodeRabbit ignores unknown keys, so the key has no effect.
  Remove it to avoid confusion.

  Proposed fix

  -version: 2
   language: "en-US"


────────────────────────────────────────────────────────────────────────
  trivial [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/tests/pdf-extractor.test.ts:27tests/pdf-extractor.test.ts:27-48]8;;

  Add tests for malformed PDFs and decompression bombs.

  The tests do not cover these cases:
  - A Flate stream that inflates to more than 20 MB.
  - A truncated stream.
  - A ToUnicode CMap.
  - A TJ array.

  These are the bounded paths that the path instructions require you to
  audit.


────────────────────────────────────────────────────────────────────────
  minor [Stability & Availability]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/options/pdf-extractor.ts:41src/options/pdf-extractor.ts:41-54]8;;

  Limit the array form of bfrange to the declared range and to the mapping
  cap.

  The Format A branch has no mapping.size >= 4000 check. It also ignores
  the `` value. A malformed CMap can add an unlimited number of entries
  through repeated array lines. Apply the same 4000 cap that Format B uses,
  and stop at end - start + 1 tokens.


────────────────────────────────────────────────────────────────────────
  major [Stability & Availability]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/options/pdf-extractor.ts:113src/options/pdf-extractor.ts:113-139]8;;

  Bound the compressed-stream decompression before it allocates memory.

  The Unzlib callback sets aborted and drops chunks after 20 MB.
  u.push(raw, true) still inflates the whole stream synchronously. A small
  zip-bomb stream (10 MB input that inflates to gigabytes) still uses CPU on
  the main thread until inflation ends. fflate also allocates its internal
  output buffers for each chunk. Each content stream and each CMap stream
  applies the cap separately, so the total limit is many times 20 MB.

  Stop the decoder when the limit is reached. One way is to throw from the
  callback so that the catch block ends the push. Another way is to feed
  raw in slices and check aborted between pushes. Also add a
  document-wide total decompressed-bytes budget.


  Proposed fix

  -      u.push(raw, true);
  -      if (aborted) return null;
  +      const SLICE = 64 * 1024;
  +      for (let off = 0; off < raw.length && !aborted; off += SLICE) {
  +        u.push(raw.subarray(off, off + SLICE), off + SLICE >= raw.length);
  +      }
  +      if (aborted) return null;

  As per path instructions: "Audit fflate FlateDecode streams ... for
  out-of-memory risks ... or infinite loops on malformed PDFs."


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/options/OptionsApp.tsx:811src/options/OptionsApp.tsx:811-829]8;;

  Make the drop zone reachable from the keyboard.

  The drop zone is a div with only an onClick handler. It has no role,
  no tabIndex, and no key handler. Keyboard users therefore cannot open
  the file picker. Add role="button", tabIndex={0}, and an onKeyDown
  handler for Enter and Space. Another option is to use a `` element.


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/options/pdf-extractor.ts:148src/options/pdf-extractor.ts:148-157]8;;

  Decode octal escapes before the other escape replacements.

  The \\ replacement runs first. The input \\101 therefore becomes
  \101, and the octal pass then decodes it to A. The other
  single-character escapes have the same problem with double backslashes.
  Use one regex pass that handles every escape, for example
  /\\([nrtbf()\\]|[0-7]{1,3})/g, with a switch on the escaped character.


────────────────────────────────────────────────────────────────────────
  trivial [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/tests/handoff-bridge.test.tsx:78tests/handoff-bridge.test.tsx:78-96]8;;

  Cover the executeScript injection path.

  This test routes to a GitHub URL, so the test never calls
  mockExecuteScript. No test covers the sessionStorage injection path or
  its failure return. Add a test with isDev=true that asserts
  executeScript receives [KTY_HANDOFF_SESSION_KEY, serialized]. Add a
  second test where the mock rejects and the result is success: false.


────────────────────────────────────────────────────────────────────────
  major [Data Integrity & Integration]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/popup/handoff-bridge.ts:16src/popup/handoff-bridge.ts:16-22]8;;

  Validate the payload before dispatch.

  dispatchHandoffToDestination serializes and injects payload without a
  call to validateHandoffPayload. The validator therefore runs only on the
  consumer side. Call the validator before Line 21 and fail closed. This
  applies the URL-protocol and enum checks before any data leaves the popup.


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/popup/handoff-bridge.ts:53src/popup/handoff-bridge.ts:53-66]8;;

  Return success: false when the fallback cannot deliver the payload.

  The fallback path at Lines 53-66 opens the target URL but never writes
  serialized to storage. It also removes any existing handoff key. In dev
  mode, the destination therefore receives no payload, yet the function
  returns success: true. If window.open is unavailable, the function
  still reports success. The comment block at Lines 13-14 states that the
  fallback "Writes to local sessionStorage". Correct the docs and return a
  success value that reflects actual delivery, for example `success:
  !isDev, where !isDev` covers the GitHub repo navigation that needs no
  payload.


────────────────────────────────────────────────────────────────────────
  minor [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/docs/WALKTHROUGH-v2.1.md:123docs/WALKTHROUGH-v2.1.md:123]8;;

  Fix the stated previous popup width.

  The walkthrough says the popup grew from 400px to 500px. The previous
  popup.html width was 420px.

  -- **500px Widened Popup**: Increased popup dimensions from 400px to 500px,
  +- **500px Widened Popup**: Increased popup dimensions from 420px to 500px,


────────────────────────────────────────────────────────────────────────
  major [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/popup/components/AuditReceiptCard.tsx:21src/popup/components/AuditReceiptCard.tsx:21-47]8;;

  Do not claim statutory checks the scan did not run.

  The checklist is hardcoded, so it always shows EU CRD / UK DMCC and the
  other items as "Verified". scanDocumentText can filter rules by
  targetJurisdiction, and not every category always has rules evaluated.
  The "✓ Verified" labels then overstate coverage to the user. Build the
  checklist from evaluatedRulesCount and the evaluated categories or
  jurisdictions, or relabel it as "Categories checked".


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/core/engine.ts:46src/core/engine.ts:46-52]8;;

  Fix the jurisdiction filter: substring matching on an empty or short
  target bypasses filtering.

  target.includes(j) and j.includes(target) are raw substring tests. A
  target such as "eu" matches any jurisdiction that contains "eu", for
  example "Neutral". A target such as "us" matches nearly every US entry.
  Federal rules can also use jurisdiction strings other than exactly `'us
  federal'. One example is the dev fixture value 'US Federal & State'`.
  Rules with those strings get excluded when the target is a state. Use
  normalized jurisdiction codes and exact equality.


────────────────────────────────────────────────────────────────────────
  minor [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/ROADMAP.md:171ROADMAP.md:171]8;;

  Correct the handoff description to match the code.

  The roadmap says the handoff uses a postMessage bridge with an "HMAC
  integrity check". dispatchHandoffToDestination writes plain JSON to
  sessionStorage through executeScript. It has no postMessage and no
  HMAC. Line 173 also routes DATA_SHARING to careCheck, but
  resolveDestinationTool routes the SURVEILLANCE category. Correct both
  claims.


────────────────────────────────────────────────────────────────────────
  trivial [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/tests/proof-of-work.test.tsx:25tests/proof-of-work.test.tsx:25-39]8;;

  Reset the hard-burn state between tests.

  afterEach calls handleHardBurnDOM(), which sets the module-level
  hardBurned = true. It never calls resetHardBurnForTesting(). Tests
  that use the message listener path or a future executeScan guard will
  then fail depending on test order.

       handleHardBurnDOM();
  +    resetHardBurnForTesting();


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/popup/App.tsx:625src/popup/App.tsx:625-633]8;;

  Remove the double audit on paste.

  onPaste schedules handleAuditText(pasted). The default paste also
  fires onChange, so the textarea value becomes the existing text plus the
  pasted text. The audit then scans only pasted, while the box shows the
  merged text. In addition, the setTimeout is never cancelled if a hard
  burn happens in the meantime. The audit can then repopulate scanResult
  after the burn. Call e.preventDefault() to make the scanned text match
  the displayed text, and drop the timer or guard it.


────────────────────────────────────────────────────────────────────────
  minor [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/statutory-update-report.md:1statutory-update-report.md:1-29]8;;

  Remove the committed mock report.

  This file is output from a --mock run. Line 11 links to a placeholder
  Federal Register URL (.../mock-negative-option). Lines 17 and 23 list
  amendments that did not happen. Each workflow run overwrites this file.

  Keeping it in the repository gives readers fake regulatory notices. Delete
  the file and add statutory-update-report.md to .gitignore.


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/core/policy-packs/uk-dmcc.json:12src/core/policy-packs/uk-dmcc.json:12]8;;

  Do not label the prospective DMCC rules as current statutory violations.

  UK-AR-001 and UK-AR-002 describe a regime with an "anticipated
  commencement Spring 2027". Both rules still use `"classification":
  "STATUTORY_VIOLATION"`. The popup will tell users that a page violates a
  law that is not yet in force.

  Line 26 says that missing reminders "renders subscription renewal terms
  unenforceable". Line 53 says that the Act "prohibits" exclusions. Both
  lines use the present tense, so they state the prospective obligation as
  current law.

  Use a non-violation classification, such as an advisory or notice class,
  until commencement. Rewrite the recommendations in a conditional future
  tense.





  Also applies to: 26-26, 39-39, 53-53


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/docs/SECURITY.md:52docs/SECURITY.md:52]8;;

  Update the supported version to v2.1.0.

  The table still identifies v1.4.0 as the release candidate. Update the
  entry to match the v2.1.0 release candidate.


  🐛 Suggested fix

  -| **v1.4.0 (Release Candidate)** | :white_check_mark: | Manual CWS Upload / GitHub | Air-gapped (`connect-src 'none'`), Zero-Egress |
  +| **v2.1.0 (Release Candidate)** | :white_check_mark: | Manual CWS Upload / GitHub | Air-gapped (`connect-src 'none'`), Zero-Egress |


────────────────────────────────────────────────────────────────────────
  major [Security & Privacy] | 🛡️ Analyzed with Security Review
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/.github/workflows/legal-statute-monitor.yml:26.github/workflows/legal-statute-monitor.yml:26-32]8;;

  Security: Security Misconfiguration (CWE-829)
  Reachability: Internal · Exploitability: Difficult

  Pin the workflow actions and move off Node 20. The three action tags
  exist, so the tag-existence concern does not apply. These mutable tags
  still run with contents: write and pull-requests: write; replace them
  with verified full-length commit SHA pins. Node 20 reached end of life on
  April 30, 2026, and Vite 8 requires Node ^20.19.0 || >=22.12.0. Use Node
  22.


  Use a supported Node.js release

  -          node-version: 20
  +          node-version: 22


────────────────────────────────────────────────────────────────────────
  trivial [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/tests/service-worker-badge.test.ts:2tests/service-worker-badge.test.ts:2-8]8;;

  Exercise listener registration in the badge lifecycle tests.

  The static import evaluates service-worker.ts before beforeEach
  installs this test's chrome mock. The tests call exported handlers
  directly, so they cannot detect a missing onUpdated, onReplaced, or
  onMessage registration. Install the mock before a fresh dynamic import.
  Then invoke the registered callbacks in a lifecycle test.


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/content/inline-indicators.ts:103src/content/inline-indicators.ts:103]8;;

  Check whether the indicator was inserted.

  If anchorElement has no parent, `insertAdjacentElement('afterend',
  host) returns null`. The function still adds the detached host to
  activeHostElements and reports success. Return null when insertion
  fails. The DOM Standard defines the null return for this case.
  (dom.spec.whatwg.org)


  Proposed fix

  -      anchorElement.insertAdjacentElement('afterend', host);
  +      if (!anchorElement.insertAdjacentElement('afterend', host)) return null;

  As per coding guidelines, “keep injection/removal safe when the target DOM
  is unavailable.”


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/content/inline-indicators.ts:136src/content/inline-indicators.ts:136]8;;

  Restrict fallback cleanup to owned hosts.

  If a page uses data-kty-indicator-host on its own element,
  removeAllIndicators() removes that element. A checkbox with this
  attribute is deleted during scan cleanup or Hard Burn. Remove the
  document-wide fallback, or retain ownership information that distinguishes
  injected hosts from page elements.

  As per path instructions, “Ensure overlays never mutate or intercept user
  form inputs.”


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/scripts/record-demo.js:15scripts/record-demo.js:15-21]8;;

  Declare a browser driver that the demo can resolve.

  resolvePlaywright() checks Playwright packages, but the supplied package
  declarations include puppeteer instead. On a clean repository install
  without a Playwright package in the parent directory, every candidate
  fails and npm run demo stops at Line 100. Add a Playwright development
  dependency, or change the demo to use the declared browser driver.


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/docs/BUILD.md:12docs/BUILD.md:12]8;;

  Correct the Node.js prerequisites for Vite 8. Both guides permit Node.js
  20 releases that cannot run their documented Vite build. Vite 8 requires
  Node.js 20.19+ or 22.12+. (vite.dev)
  - docs/BUILD.md#L12-L12: replace “v20.x or higher” with the supported
  ranges.
  - docs/SAFARI-SUBMISSION.md#L25-L25: replace “v20+” with the same
  ranges.


────────────────────────────────────────
Review complete
Review completed
25 findings ✔

Major    4
Minor    15
Trivial  6

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

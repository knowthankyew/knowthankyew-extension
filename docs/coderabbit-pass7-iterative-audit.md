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
(• .•)  PENDU: Prompt Engineered Nifty Debugging Unit.


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/options/OptionsApp.tsx:203src/options/OptionsApp.tsx:203-206]8;;

  Clear stale results when a new file import starts or fails.

  handleFileUpload sets docFileName to the new file at Line 206. It does
  not clear docScanResult. Suppose the user audits file A and then imports
  file B, and B is rejected. B can be rejected because it is over 10 MB,
  because extraction returns no text, or because the read throws. In each
  case the results panel still shows A's findings under the heading "Audit
  Findings for B". Line 224 also clears docText and leaves the old result
  visible. The user then sees findings attributed to the wrong document.


  🐛 Proposed fix

       const currentGeneration = burnGenerationRef.current;
       setDocError(null);
  +    setDocScanResult(null);
       setDocFileName(file.name);


────────────────────────────────────────────────────────────────────────
  minor [Security & Privacy] | 🛡️ Analyzed with Security Review
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/core/handoff.ts:130src/core/handoff.ts:130-134]8;;

  Security: Sensitive Data Exposure (CWE-200)
  Reachability: External · Exploitability: Difficult

  Remove URL userinfo before the link goes into the payload.

  sanitizeLegalLink removes ?query and #fragment with
  link.url.split(/[?#]/, 1)[0]. It keeps the user:pass@ part of the URL.
  A page-discovered link like https://user:token@host/terms therefore
  sends credentials to the destination tool. This breaks the handoff
  sanitization requirement. Rebuild the URL from the parsed parts.


  Proposed fix

       return {
         ...link,
         title: sanitizeSnippet(link.title || ''),
  -      url: link.url.split(/[?#]/, 1)[0],
  +      url: `${parsed.protocol}//${parsed.host}${parsed.pathname}`,
       };

  As per coding guidelines, "sanitize finding text fields and validate
  payload envelopes".


────────────────────────────────────────────────────────────────────────
  major [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/core/policy-packs/us-federal.json:80src/core/policy-packs/us-federal.json:80]8;;

  Remove the second preposition from the agree alternative.

  Both new contractor and client examples say “agree to binding
  arbitration.” This pattern requires “agree to to binding arbitration” for
  that alternative, so the new assertions in tests/rules.test.ts fail. Put
  the preposition inside each alternative: agree\\s+to or
  disputes?\\s+resolved\\s+exclusively\\s+by, followed by
  \\s+binding\\s+arbitration.


────────────────────────────────────────────────────────────────────────
  major [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/core/policy-packs/eu-crd.json:48src/core/policy-packs/eu-crd.json:48-49]8;;

  Do not classify every digital-content withdrawal acknowledgment as a
  violation.

  A clause stating that a consumer waives the withdrawal right after
  expressly consenting to immediate delivery of qualifying digital content
  matches these patterns. Article 16 permits loss of that right when its
  conditions are met. The explanation mentions the exception, but the
  STATUTORY_VIOLATION match does not account for it. Distinguish a blanket
  waiver from a conditional Article 16 acknowledgment before assigning that
  classification. (eur-lex.europa.eu)

  As per path instructions, “Validate rule structures for UK DMCC 2024, EU
  CRD, US Federal, and State ARL.”


────────────────────────────────────────────────────────────────────────
  major [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/core/policy-packs/eu-crd.json:21src/core/policy-packs/eu-crd.json:21]8;;

  Require an additional payment before classifying a default option under
  Article 22.

  The first pattern matches “newsletter checkbox is pre-selected” without
  any payment. EU-AR-001 still classifies that text as a CRITICAL
  statutory violation. Article 22 concerns default options used to infer
  consent to an extra payment beyond the main transaction. Require evidence
  of that charge, or lower the legal claim when the charge cannot be
  established. (eur-lex.europa.eu)

  As per path instructions, “Validate rule structures for UK DMCC 2024, EU
  CRD, US Federal, and State ARL.”


────────────────────────────────────────────────────────────────────────
  major [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/core/policy-packs/uk-dmcc.json:21src/core/policy-packs/uk-dmcc.json:21]8;;

  Limit the reminder warning to renewals covered by the statutory schedule.

  A monthly subscription clause that says it renews “without prior notice”
  matches UK-AR-001. The rule then warns as though a reminder is required
  before that renewal. Section 258 instead ties reminders to specified
  renewals, including relevant six-month intervals. Narrow the claim and
  matching criteria, or describe the result as a prompt to check the
  applicable renewal schedule rather than a detected breach.
  (legislation.gov.uk)

  As per path instructions, “Validate rule structures for UK DMCC 2024 … to
  ensure regex expressions are ReDoS-free and rule weights are properly
  bounded.” The statutory scope also needs to remain accurate.


────────────────────────────────────────────────────────────────────────
  minor [Stability & Availability]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/.github/workflows/legal-statute-monitor.yml:4.github/workflows/legal-statute-monitor.yml:4-6]8;;

  Serialize statutory-monitor runs. A scheduled run can overlap a manual
  run. Both runs can then update bot/statutory-update-review, leaving the
  pull request with an older run’s report. Add workflow concurrency for this
  branch so only one monitor run writes it at a time. The pull-request
  action updates an existing pull request on the configured fixed branch.
  (github.com)


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/scripts/check-statutory-updates.mjs:336scripts/check-statutory-updates.mjs:336-337]8;;

  Show a no-change result only after successful checks. An empty findings
  array does not establish that a failed endpoint had no updates.
  - scripts/check-statutory-updates.mjs#L336-L337: suppress the UK
  no-change note when ukErrors is nonempty.
  - scripts/check-statutory-updates.mjs#L351-L352: suppress the EU
  no-change note when euErrors is nonempty.


────────────────────────────────────────────────────────────────────────
  major [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/scripts/check-statutory-updates.mjs:374scripts/check-statutory-updates.mjs:374]8;;

  Include Federal Register failures in check_failed.
  checkFederalRegister returns [] after an HTTP or fetch failure. If
  every US query fails and the UK and EU checks succeed, this line emits
  check_failed=false and the report says no US notices were found.
  Preserve US query errors separately from empty results and include them in
  this output.


────────────────────────────────────────────────────────────────────────
  minor [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/tests/service-worker-badge.test.ts:171tests/service-worker-badge.test.ts:171-172]8;;

  Wait for the hard-burn response, not a fixed delay.

  If hardBurnAllData() takes more than 10 ms, this test checks
  sendResponse before the handler calls it. The result is a
  timing-dependent test failure. Use vi.waitFor on the response assertion
  so the test follows the asynchronous contract.


────────────────────────────────────────────────────────────────────────
  major [Functional Correctness]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/scripts/check-statutory-updates.mjs:122scripts/check-statutory-updates.mjs:122-123]8;;

  Check corrigenda separately from consolidated versions. This regex detects
  only dated consolidated ELI paths. EUR-Lex lists the GDPR’s corrigendum
  separately, while its consolidated version remains dated 2016. If a new
  corrigendum does not produce a new consolidated ELI date, this check
  reports no update. Query correction metadata as well as consolidated
  versions. (eur-lex.europa.eu)


────────────────────────────────────────────────────────────────────────
  trivial [Security & Privacy] | 🛡️ Analyzed with Security Review
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/src/core/engine.ts:114src/core/engine.ts:114-120]8;;

  Security: Sensitive Data Exposure (CWE-359)
  Reachability: External · Exploitability: Theoretical

  Sanitize the preview before applying the length limit. The current
  2,000-character output limit prevents this fragment from reaching the UI
  today. However, textForPreview is truncated before sanitizeSnippet, so
  a future limit increase could expose a PII token that crosses the
  4,000-character boundary.


  Proposed fix

  -  const textForPreview = text.length > 4000 ? text.slice(0, 4000) : text;
  -  const sanitizedPreviewText = sanitizeSnippet(textForPreview);
  +  const sanitizedPreviewText = sanitizeSnippet(text);


────────────────────────────────────────────────────────────────────────
  trivial [Maintainability & Code Quality]
  → ]8;;vscode://file//Users/cl0rkster/Dev/knowthankyew-extension/docs/BUILD.md:21docs/BUILD.md:21]8;;

  Use the same frozen install as the release workflows.

  Replace npm install with npm ci. If the dependency specifications and
  lockfile differ, npm install can update the lockfile while the release
  workflows fail or use a different dependency tree. npm ci keeps the AMO
  reviewer build aligned with the committed lockfile. (docs.npmjs.com)




  Proposed documentation change

  -   npm install
  +   npm ci


────────────────────────────────────────
Review complete
Review completed
13 findings ✔

Major    6
Minor    5
Trivial  2

70 files reviewed:
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
  ... and 60 more files
Excluded unsupported binary files: demo.gif, demo.mp4
────────────────────────────────────────

Print all AI prompts: coderabbit review --show-prompts

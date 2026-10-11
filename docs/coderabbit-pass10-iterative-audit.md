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
(• .•)  Start when you're ready. You've been building experience all your life. Don't ignore niggling doubts.


────────────────────────────────────────────────────────────────────────
  minor [Data Integrity & Integration]
  → src/popup/handoff-bridge.ts:35-53

  Inject only after confirming that the tab finished loading.

  The wait code resolves after 2 seconds even when the tab never reports
  complete. If the code injects into a tab that is still loading, the
  payload goes to the origin of the current document. A redirect can also
  replace that document, and sessionStorage.setItem then writes to the
  wrong origin or loses the payload. If newTab.status is undefined, the
  code skips the wait completely. Track whether completion happened. Return
  success: false on timeout. Also check chrome.tabs.get(newTab.id) and
  confirm that the tab URL origin matches targetUrl before calling
  executeScript.


────────────────────────────────────────────────────────────────────────
  minor [Security & Privacy] | 🛡️ Analyzed with Security Review
  → src/core/engine.ts:116-119

  Security: Sensitive Data Exposure (CWE-359)
  Reachability: External · Exploitability: Difficult

  Sanitize the full input before truncating the preview. sanitizeSnippet
  only redacts complete email addresses. If the 4,000-character slice cuts
  an address, whitespace collapsing can move the remaining fragment into the
  2,000-character preview.


  Proposed fix

  -  const sanitizedPreviewText = sanitizeSnippet(text.slice(0, 4000));
  +  const sanitizedPreviewText = sanitizeSnippet(text);


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → docs/SAFARI-SUBMISSION.md:83

  Limit the stated Safari test coverage.

  tests/bundle-invariants.test.ts checks Safari JavaScript and the
  extension manifest. It does not check PrivacyInfo.xcprivacy in the
  converted Xcode project. Remove the privacy-manifest verification claim,
  or add a check against the native submission artifact.


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → ROADMAP.md:83

  Describe UK subscription rules as prospective. Both passages present UK
  reminder and cooling-off provisions as current mandatory requirements. The
  cited subscription provisions remain prospective; a match should prompt an
  applicability check, not assert a current violation. (legislation.gov.uk)
  - ROADMAP.md#L83-L83: qualify the reminder and 14-day provisions as
  prospective.
  - docs/WALKTHROUGH-v2.1.md#L58-L59: state that the UK rule prompts
  verification of applicability.

  As per path instructions: “UK DMCC renewal-reminder and 14-day
  cancellation rules are prospective, anticipated to commence in Spring
  2027; treat matches as prompts to verify applicability, not as current
  violations.”


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → tests/claims-linter.test.ts:32-34

  Check the justification row, not any permission mention.

  If a permission appears elsewhere in docs/CHROMEWEBSTORE.md, this
  assertion passes even when its justification row is missing. Parse the
  permissions table and require a nonempty justification for each manifest
  permission.


────────────────────────────────────────────────────────────────────────
  trivial [Performance & Scalability]
  → src/content/scanner.ts:138-145

  Bound checkbox search work before returning three anchors.

  On a page with many checkboxes, this loop resolves every label before
  applying slice(0, 3). Checkbox IDs can each cause a document-wide
  label[for] query. Stop after three matches and apply a work limit for
  pages with few or no matches, so automatic scans do not spend unbounded
  time on page DOM.

  As per path instructions, “Audit DOM isolation, style encapsulation,
  selector mutation safety, and zero host-script interference.”


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → src/content/inline-indicators.ts:135-144

  Remove only indicator hosts owned by the extension.

  If a page-owned span has data-kty-indicator-host="true", this fallback
  removes that span and its contents. The tracked-host loop already removes
  hosts created by injectIndicator. Remove the selector fallback, or check
  host identity before removal.

  As per path instructions, “Ensure overlays never mutate or intercept user
  form inputs.”


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → src/content/scanner.ts:179-180

  Do not assign an unrelated finding to a checkbox.

  If a page has an arbitration checkbox but only an actionable auto-renewal
  match, this fallback displays the auto-renewal finding beside the
  arbitration checkbox. Require a match for the checkbox category. Also make
  categorization recognize the class-action spelling that anchor discovery
  accepts.


────────────────────────────────────────────────────────────────────────
  trivial [Security & Privacy] | 🛡️ Analyzed with Security Review
  → src/core/handoff.ts:130-134

  Build the legal-link object from its declared fields.

  If a DiscoveredLegalLink carries an extra enumerable property, ...link
  copies it into primaryLegalLink. The validator checks only url and
  title for this object and does not remove unknown keys. The current link
  detector creates only the four declared fields, so this is schema-boundary
  hardening rather than evidence of current extra-field exposure.


  🛡️ Proposed fix

       return {
  -      ...link,
  +      category: link.category,
  +      source: link.source,
         title: sanitizeSnippet(link.title || ''),
         url: `${parsed.protocol}//${parsed.host}${parsed.pathname}`,
       };


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → src/core/policy-packs/uk-dmcc.json:75

  Require evidence of missing notice before issuing this warning.

  “We reserve the right to vary subscription fees at any time at our sole
  discretion, with 30 days’ prior notice” matches this pattern. The finding
  then says the trader gives no reasonable advance notice. Require
  notice-related language in the match, or change the finding so it does not
  claim that notice is absent. As per path instructions, “UK unilateral
  material-term changes without reasonable notice are warning-level.”


────────────────────────────────────────────────────────────────────────
  minor [Functional Correctness]
  → scripts/check-statutory-updates.mjs:233-235

  Link the reported UK change, not only its parent Act.

  The parser extracts the latest effect’s title, but the result discards
  that title and sets amendmentUrl to item.actUrl. The report therefore
  gives the legal reviewer an Act homepage without identifying the change
  behind the reported date. Preserve the effect title and its feed link or
  identifier in the finding and report. UK changes-feed entries contain
  individual effects. (legislation.github.io)


────────────────────────────────────────────────────────────────────────
  major [Functional Correctness]
  → src/core/policy-packs/eu-crd.json:21

  Limit the critical match to additional payments.

  “The monthly subscription checkbox is pre-selected” matches this pattern
  even when the subscription is the main purchase. Article 22 addresses
  default consent to an extra payment, not every pre-selected option for the
  main purchase. Require add-on or extra-charge context before reporting
  EU-AR-001 as a critical statutory violation. Update the matching
  assertion in tests/rules.test.ts to use an additional payment.
  (eur-lex.europa.eu) As per path instructions, “EU rules flag preselected
  additional payments as critical.”


────────────────────────────────────────────────────────────────────────
  major [Functional Correctness]
  → scripts/check-statutory-updates.mjs:127-128

  Treat unrecognized EUR-Lex responses as failed checks.

  If EUR-Lex returns HTTP 200 content without the expected ELI metadata,
  both match arrays remain empty. The check then records neither a finding
  nor an error, and the report states that no revisions were detected.
  Validate the expected directive identity and version metadata before
  treating the response as successful.


────────────────────────────────────────
Review complete
Review completed
13 findings ✔

Major    2
Minor    9
Trivial  2

73 files reviewed:
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
  ... and 63 more files
Excluded unsupported binary files: demo.gif, demo.mp4
────────────────────────────────────────

Print all AI prompts: coderabbit review --show-prompts

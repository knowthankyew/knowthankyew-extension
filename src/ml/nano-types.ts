/**
 * Hardened service contract for Chrome Built-in Prompt API (Gemini Nano) on-device assistant.
 * Adheres strictly to zero-network, prompt-injection defense-in-depth, and fire-and-forget Hard Burn cancellation.
 */

export type NanoCapabilityState = 
  | 'ready'
  | 'downloading'
  | 'unsupported-browser'
  | 'unsupported-hardware'
  | 'disabled';

export interface NanoStatusReport {
  state: NanoCapabilityState;
  statusLabel: string; // e.g. "On-Device AI: Active" | "On-Device AI: Preparing (this can take a few minutes)" | "On-Device AI: Unavailable (Chrome update required)"
  isAvailable: boolean;
}

export interface LocalNanoProvider {
  /**
   * Read-only capability check. MUST NOT trigger model download as a side effect.
   * Safe to call on popup open without risking unintended network egress or bandwidth consumption.
   */
  getStatus(): Promise<NanoStatusReport>;

  /**
   * Explicit user-initiated action.
   * MUST ONLY be called from a direct user gesture (e.g. a settings toggle in the options dashboard).
   */
  requestDownload(): Promise<void>;

  /**
   * Disambiguates discovered legal links using on-device neural heuristics.
   * Accepts an AbortSignal so in-flight calls are cancelled immediately upon Hard Burn.
   */
  disambiguateLegalLink(
    anchorText: string,
    contextSnippet: string,
    signal?: AbortSignal
  ): Promise<string | null>;

  /**
   * Generates a plain-English summary of an identified trap clause.
   * Content is wrapped in prompt-isolation delimiters (<clause_text>) to defend against prompt injection.
   * Output must strictly be rendered as text nodes, never HTML.
   * Accepts an AbortSignal so in-flight calls are cancelled immediately upon Hard Burn.
   */
  summarizeTrapClause(
    clauseText: string,
    signal?: AbortSignal
  ): Promise<string | null>;

  /**
   * Nuclear Hard Burn: Aborts all in-flight AbortControllers, terminates the active
   * model session via session.destroy(), and dereferences all session handles.
   */
  burn(): void;
}

export type Status = "pass" | "fail";

export type Step = {
  step: number;
  action: string;
  status: Status;
  detail?: string;
};

export type Verdict = "TRUE" | "FALSE";

export type GateResult = {
  pageId: string;
  cta: string;
  verdict: Verdict;
  steps: Step[];
  sessionId: string | null;
  videoTrace: string | null;
  rawPath: string | null;
  /** Kane's own plain-language summary of the run (its bug description on red). */
  summary: string | null;
};

export type Receipt = {
  pageId: string;
  cta: string;
  verdict: Verdict;
  checks: Step[];
  kaneSessionId: string | null;
  videoTrace: string | null;
  verifiedAt: string;
  signature: string;
};

export type Page = {
  id: string;
  title: string;
  cta: string;
  /** The success message the CTA is supposed to reach. Kane asserts on this. */
  successText: string;
  /** The genuine bug switch: when false, the CTA's submit handler is not wired
   *  and the success state never appears. The self-heal loop flips this to true. */
  wired: boolean;
  /** Server-authoritative. Only set true after a real green verdict. */
  published: boolean;
  /** The current live receipt. */
  receiptId: string | null;
  /** Every receipt ever issued for this page, newest last (Phase 3 history). */
  receipts: string[];
};

export type PagesFile = { pages: Page[] };

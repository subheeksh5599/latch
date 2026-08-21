export type Status = "pass" | "fail";

export type Step = {
  step: number;
  action: string;
  status: Status;
  detail?: string;
};

export type Verdict = "TRUE" | "FALSE";

/** One call-to-action on a page. A page can gate one or many of these. */
export type Cta = {
  /** Stable id, unique within a page — used by fix loop + form ids. */
  id: string;
  /** The button label Kane clicks. Also displayed to visitors. */
  label: string;
  /** The success string Kane asserts. Must be unique per CTA on the page. */
  successText: string;
  /** The genuine bug switch: when false, the CTA's submit handler is not wired
   *  and the success state never appears. The self-heal loop flips this true. */
  wired: boolean;
};

/** Result of gating a single CTA. */
export type GateResult = {
  pageId: string;
  ctaId: string;
  cta: string;
  verdict: Verdict;
  steps: Step[];
  sessionId: string | null;
  videoTrace: string | null;
  rawPath: string | null;
  /** Kane's own plain-language summary of the run (its bug description on red). */
  summary: string | null;
};

/** One CTA's slice of a multi-CTA receipt. */
export type ReceiptCta = {
  id: string;
  cta: string;
  verdict: Verdict;
  checks: Step[];
  kaneSessionId: string | null;
  videoTrace: string | null;
};

/**
 * A signed page-level receipt. `ctas` lists every CTA that was gated; the
 * top-level verdict is TRUE only when every entry is TRUE.
 *
 * Legacy single-CTA fields (`cta`, `checks`, `kaneSessionId`, `videoTrace`)
 * are populated for the first CTA so old viewers keep working, but the
 * authoritative data is in `ctas[]`.
 */
export type Receipt = {
  pageId: string;
  verdict: Verdict;
  ctas: ReceiptCta[];
  verifiedAt: string;
  signature: string;
  // Legacy mirror of ctas[0], preserved for back-compat with older receipts:
  cta?: string;
  checks?: Step[];
  kaneSessionId?: string | null;
  videoTrace?: string | null;
};

export type Page = {
  id: string;
  title: string;
  /** One or many gated CTAs. Every one must go green for the page to publish. */
  ctas: Cta[];
  /** Server-authoritative. Only set true after every CTA verdict is TRUE. */
  published: boolean;
  /** The current live receipt. */
  receiptId: string | null;
  /** Every receipt ever issued for this page, newest last. */
  receipts: string[];
};

export type PagesFile = { pages: Page[] };

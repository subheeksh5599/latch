"use client";

import { useState } from "react";
import type { Cta } from "@/lib/types";

/**
 * The CTA whose wiring is the whole point of the demo.
 *
 * When `cta.wired` is false the submit handler was never connected after the
 * last edit — clicking the button does nothing and the success state never
 * renders. That is a genuinely dead button, not a simulation. The self-heal
 * loop flips the server-side wiring to true, after which the same click
 * reaches the success state and a real browser can confirm it.
 */
export function CtaForm({ cta }: { cta: Cta }) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cta.wired) {
      // Bug: the CTA handler was never wired, so submitting goes nowhere.
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <p className="success" data-testid={`cta-success-${cta.id}`}>
        {cta.successText}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        className="field"
        type="email"
        required
        placeholder="you@email.com"
        aria-label={`Email address for ${cta.label}`}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button
        className="btn"
        type="submit"
        data-testid={`cta-button-${cta.id}`}
        data-cta-id={cta.id}
      >
        {cta.label}
      </button>
    </form>
  );
}

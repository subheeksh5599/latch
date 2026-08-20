import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseNdjson, deriveVerdict } from "../lib/kane";

const fixture = (name: string) =>
  readFileSync(path.join(__dirname, "fixtures", name), "utf8");

test("parses a real green Kane NDJSON stream into pass steps", () => {
  const { steps, runEnd, sessionId } = parseNdjson(fixture("kane-green.ndjson"));
  assert.ok(steps.length > 0, "expected at least one step");
  assert.ok(
    steps.every((s) => s.status === "pass"),
    "all steps should be pass on a green run",
  );
  assert.equal(runEnd?.status, "passed");
  assert.ok(sessionId, "should extract a session id");
});

test("derives TRUE when every authoritative run_end field agrees", () => {
  const { steps, runEnd } = parseNdjson(fixture("kane-green.ndjson"));
  assert.equal(deriveVerdict(runEnd, steps), "TRUE");
});

test("derives FALSE from a real red run (button never reached success)", () => {
  const { steps, runEnd } = parseNdjson(fixture("kane-red.ndjson"));
  assert.equal(deriveVerdict(runEnd, steps), "FALSE");
});

test("verdict is FALSE when run_end is missing entirely", () => {
  assert.equal(deriveVerdict(null, [{ step: 1, action: "x", status: "pass" }]), "FALSE");
});

test("verdict is FALSE if status passed but result_code is not 100", () => {
  const runEnd = {
    type: "run_end" as const,
    status: "passed",
    result_code: 740,
    reason_code: "success.complete",
    per_flow_metadata: [{ result_code: "100" }],
  };
  const steps = [{ step: 1, action: "x", status: "pass" as const }];
  assert.equal(deriveVerdict(runEnd, steps), "FALSE");
});

test("verdict is FALSE if any flow did not reach 100", () => {
  const runEnd = {
    type: "run_end" as const,
    status: "passed",
    result_code: 100,
    reason_code: "success.complete",
    per_flow_metadata: [{ result_code: "100" }, { result_code: "740" }],
  };
  const steps = [{ step: 1, action: "x", status: "pass" as const }];
  assert.equal(deriveVerdict(runEnd, steps), "FALSE");
});

test("non-JSON noise lines are ignored, not fatal", () => {
  const stream =
    "Skill update available: run kane-cli install skill\n" +
    fixture("kane-green.ndjson");
  const { runEnd } = parseNdjson(stream);
  assert.equal(runEnd?.status, "passed");
});

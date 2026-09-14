import assert from "node:assert/strict";
import test from "node:test";
import { parseAgentVersionIds, parseAgentVersionRecord } from "../src/lib/version-history.ts";

const record = {
  id: "refundbot-v1", operator: "0x1111111111111111111111111111111111111111", agent_ref: "refundbot",
  model_id: "model-1", provider_id: "provider-1", adapter_id: "sandbox-refund-v1",
  system_policy_hash: "a".repeat(64), tool_manifest_hash: "b".repeat(64), runtime_hash: "c".repeat(64),
  harness_version: "harness-v1", created_at: "2026-09-14T10:00:00Z", status: "SUSPENDED",
};

test("canonical version history IDs are bounded, unique and strictly shaped", () => {
  assert.deepEqual(parseAgentVersionIds('["v1","v2"]'), ["v1", "v2"]);
  assert.deepEqual(parseAgentVersionIds("[]"), []);
  assert.throws(() => parseAgentVersionIds("not-json"), /malformed/);
  assert.throws(() => parseAgentVersionIds(" ".repeat(65_537)), /oversized/);
  assert.throws(() => parseAgentVersionIds('["v1","v1"]'), /supported schema/);
  assert.throws(() => parseAgentVersionIds(JSON.stringify(Array.from({ length: 257 }, (_, i) => `v${i}`))), /supported schema/);
});

test("version details must match the catalog ID and never infer an unknown status as active", () => {
  assert.equal(parseAgentVersionRecord(JSON.stringify(record), "refundbot-v1").status, "SUSPENDED");
  assert.equal(parseAgentVersionRecord(JSON.stringify({ ...record, status: "OTHER" }), "refundbot-v1").status, "UNKNOWN");
  assert.throws(() => parseAgentVersionRecord(JSON.stringify(record), "different-id"), /does not match/);
  assert.throws(() => parseAgentVersionRecord(JSON.stringify({ ...record, runtime_hash: undefined }), "refundbot-v1"), /incomplete/);
  assert.throws(() => parseAgentVersionRecord(JSON.stringify({ ...record, runtime_hash: "not-a-hash" }), "refundbot-v1"), /invalid runtime_hash/);
  assert.throws(() => parseAgentVersionRecord(" ".repeat(8_193), "refundbot-v1"), /oversized/);
});

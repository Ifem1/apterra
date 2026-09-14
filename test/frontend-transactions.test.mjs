import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { assertFreshFeeQuote, summarizeTransactionLifecycle } from "../src/lib/transaction-lifecycle.ts";
import { prepareContractWriteWithFeePolicy, submitPreparedWrite } from "../src/lib/transaction-submission.ts";

test("transaction success requires accepted decision, finalized status, and successful execution", () => {
  const success = summarizeTransactionLifecycle({
    statusName: "FINALIZED",
    txExecutionResultName: "FINISHED_WITH_RETURN",
    lifecycle: { state: "finalized", outcome: "accepted" },
  });
  assert.equal(success.successful, true);
  assert.match(success.label, /Decision ACCEPTED · finality FINALIZED · execution FINISHED_WITH_RETURN/);

  for (const failed of [
    { statusName: "ACCEPTED", txExecutionResultName: "FINISHED_WITH_RETURN", lifecycle: { state: "decided", outcome: "accepted" } },
    { statusName: "FINALIZED", txExecutionResultName: "FINISHED_WITH_ERROR", lifecycle: { state: "finalized", outcome: "accepted" } },
    { statusName: "FINALIZED", txExecutionResultName: "FINISHED_WITH_RETURN", lifecycle: { state: "finalized", outcome: "undetermined" } },
    { statusName: "FINALIZED", txExecutionResultName: "FINISHED_WITH_RETURN", lifecycle: { state: "finalized" } },
  ]) assert.equal(summarizeTransactionLifecycle(failed).successful, false);
});

test("wallet signing rejects stale, future-dated, and malformed fee quotes", () => {
  assert.doesNotThrow(() => assertFreshFeeQuote(40_000, 100_000));
  assert.throws(() => assertFreshFeeQuote(39_999, 100_000), /older than 60 seconds/);
  assert.throws(() => assertFreshFeeQuote(100_001, 100_000), /invalid/);
  assert.throws(() => assertFreshFeeQuote(Number.NaN, 100_000), /invalid/);
});

test("prepared writes use the operation-specific fee quote and exact action", async () => {
  const policy = { profile: "studio-dev-fee-policy" };
  const fingerprint = createHash("sha256").update('{"profile":"studio-dev-fee-policy"}').digest("hex");
  const action = { label: "Register exact version", functionName: "register_agent_version", args: ["version-1"], expectedState: "immutable version created" };
  const writes = [];
  const client = {
    estimateTransactionFeesForWrite: async (request) => {
      assert.equal(request.functionName, action.functionName);
      assert.deepEqual(request.args, action.args);
      return { policy, distribution: [{ recipient: "0x111", amount: 17n }], messageAllocations: [{ amount: 23n }], feeValue: 40n };
    },
    writeContract: async (request) => { writes.push(request); return "0x" + "a".repeat(64); },
  };
  const prepared = await prepareContractWriteWithFeePolicy(client, "0x" + "b".repeat(40), action, fingerprint);
  assert.equal(typeof prepared.quotedAt, "number");
  const hash = await submitPreparedWrite(client, "0x" + "b".repeat(40), prepared);
  assert.equal(hash, "0x" + "a".repeat(64));
  assert.equal(writes.length, 1);
  assert.equal(writes[0].functionName, action.functionName);
  assert.deepEqual(writes[0].args, action.args);
  assert.deepEqual(writes[0].fees, {
    distribution: [{ recipient: "0x111", amount: 17n }],
    messageAllocations: [{ amount: 23n }],
    feeValue: 40n,
  });
  assert.equal(writes[0].value, 0n);
});

test("stale quote prevents write and wallet rejection is not retried", async () => {
  let writeCalls = 0;
  const client = { writeContract: async () => { writeCalls += 1; throw new Error("User rejected request"); } };
  const prepared = {
    quotedAt: Date.now() - 60_001,
    policyFingerprint: "a".repeat(64),
    quote: { distribution: [], messageAllocations: [], feeValue: 0n },
    action: { label: "Bound action", functionName: "create_claim", args: ["claim-1"], expectedState: "claim created" },
  };
  await assert.rejects(submitPreparedWrite(client, "0x" + "b".repeat(40), prepared), /older than 60 seconds/);
  assert.equal(writeCalls, 0);
  await assert.rejects(submitPreparedWrite(client, "0x" + "b".repeat(40), { ...prepared, quotedAt: Date.now() }), /User rejected request/);
  assert.equal(writeCalls, 1);
});

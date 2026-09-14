import assert from "node:assert/strict";
import test from "node:test";
import { summarizeTransactionLifecycle } from "../src/lib/transaction-lifecycle.ts";

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

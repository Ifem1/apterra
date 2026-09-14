export type ObservedTransactionLifecycle = {
  statusName?: string;
  txExecutionResultName?: string;
  lifecycle?: { state?: string; outcome?: string };
};

export function summarizeTransactionLifecycle(transaction: ObservedTransactionLifecycle) {
  const finality = transaction.statusName ?? transaction.lifecycle?.state?.toUpperCase() ?? "STATUS_UNAVAILABLE";
  const decision = transaction.lifecycle?.outcome?.toUpperCase() ?? "DECISION_UNAVAILABLE";
  const execution = transaction.txExecutionResultName ?? "EXECUTION_UNAVAILABLE";
  const successful = transaction.statusName === "FINALIZED"
    && transaction.lifecycle?.state === "finalized"
    && transaction.lifecycle?.outcome === "accepted"
    && execution === "FINISHED_WITH_RETURN";
  return {
    successful,
    finality,
    decision,
    execution,
    label: `Decision ${decision} · finality ${finality} · execution ${execution}`,
  };
}

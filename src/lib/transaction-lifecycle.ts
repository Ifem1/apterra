export type ObservedTransactionLifecycle = {
  statusName?: string;
  txExecutionResultName?: string;
  lifecycle?: { state?: string; outcome?: string };
};

const MAX_QUOTE_AGE_MS = 60_000;

export function assertFreshFeeQuote(quotedAt: number, now = Date.now()): void {
  if (!Number.isFinite(quotedAt) || quotedAt > now || now - quotedAt > MAX_QUOTE_AGE_MS) {
    throw new Error("This operation-specific fee quote is older than 60 seconds or invalid. Prepare the action again for a fresh quote before signing.");
  }
}

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

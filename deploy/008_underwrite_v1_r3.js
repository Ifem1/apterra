const CONTRACT = "0x4210D8556c7e447bA70D12321ffBA1cE19eB77dd";
const CHAIN = 61997;
const ATTEMPT = "refundbot-v1-attempt-live-r3";
const CLAIM = "refundbot-v1-claim-live-r2";

const safe = (value) => JSON.stringify(value, (_, item) => typeof item === "bigint" ? item.toString() : item);

async function read(client, functionName, args) {
  try {
    const value = await client.readContract({ address: CONTRACT, functionName, args });
    if (value == null || value === "") return null;
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch (error) {
    const message = String(error?.message ?? error);
    if (/not found|does not exist|unknown|missing/i.test(message)) return null;
    throw error;
  }
}

/** Guarded, single-purpose semantic underwriting write. Run via deploy-script. */
export default async function underwriteV1R3(client) {
  if (process.env.RUN_APTERRA_UNDERWRITE !== "1") throw new Error("Set RUN_APTERRA_UNDERWRITE=1 to authorize this single write");
  if (Number(client.chain?.id) !== CHAIN) throw new Error(`WRONG_CHAIN:${client.chain?.id}`);

  const [attempt, claim, judgment, warrant] = await Promise.all([
    read(client, "get_attempt", [ATTEMPT]),
    read(client, "get_claim", [CLAIM]),
    read(client, "get_judgment", [ATTEMPT]),
    read(client, "get_warrant", [ATTEMPT]),
  ]);
  if (!attempt || attempt.state !== "ATTEMPT_SUBMITTED") throw new Error(`ATTEMPT_NOT_SUBMITTED:${attempt?.state ?? "missing"}`);
  if (!claim || claim.state !== "ATTEMPT_SUBMITTED") throw new Error(`CLAIM_NOT_SUBMITTED:${claim?.state ?? "missing"}`);
  if (judgment || warrant) throw new Error("JUDGMENT_OR_WARRANT_ALREADY_EXISTS");

  // Generic SDK estimate is used intentionally: the targeted RC simulator has
  // produced false stale-window failures for this already-committed attempt.
  const estimate = await client.estimateTransactionFees({});
  if (!estimate?.distribution || BigInt(estimate.feeValue ?? 0) <= 0n) throw new Error("INVALID_NONZERO_SEMANTIC_FEE");
  const fees = {
    distribution: estimate.distribution,
    ...(estimate.messageAllocations?.length ? { messageAllocations: estimate.messageAllocations } : {}),
    feeValue: estimate.feeValue,
  };
  console.log(`TARGET chain=${CHAIN} contract=${CONTRACT} method=underwrite_attempt attempt=${ATTEMPT}`);
  console.log(`FEE_VALUE=${String(fees.feeValue)}`);
  const tx = await client.writeContract({ address: CONTRACT, functionName: "underwrite_attempt", args: [ATTEMPT], value: 0n, fees });
  console.log(`UNDERWRITE_TX=${tx}`);
  const receipt = await client.waitForTransactionReceipt({ hash: tx, waitUntil: "decided", fullTransaction: true, retries: 120, interval: 5000 });
  console.log(`STATUS_NAME=${String(receipt.statusName ?? "")}`);
  console.log(`TX_EXECUTION_RESULT_NAME=${String(receipt.txExecutionResultName ?? "")}`);
  console.log(`FINAL_RECEIPT=${safe(receipt)}`);
  if (!(receipt.statusName === "ACCEPTED" || receipt.statusName === "FINALIZED") || receipt.txExecutionResultName !== "FINISHED_WITH_RETURN") throw new Error("UNDERWRITE_NOT_SUCCESSFUL");
  const [finalJudgment, finalClaim, finalWarrant, authority] = await Promise.all([
    read(client, "get_judgment", [ATTEMPT]),
    read(client, "get_claim", [CLAIM]),
    read(client, "get_warrant", [ATTEMPT]),
    read(client, "get_effective_authority", ["refundbot-v1-live"]),
  ]);
  console.log(`POST_READ=${safe({ judgment: finalJudgment, claim: finalClaim, warrant: finalWarrant, effectiveAuthority: authority })}`);
}

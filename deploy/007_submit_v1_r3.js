import fs from "node:fs";
import path from "node:path";

const CONTRACT = "0x4210D8556c7e447bA70D12321ffBA1cE19eB77dd";
const EXPECTED_CHAIN = 61997;
const ATTEMPT = "refundbot-v1-attempt-live-r3";
const CLAIM = "refundbot-v1-claim-live-r2";
const BUNDLE_HASH = "9241715bf018d6644a428f348cfbd89508fbb43942c0bcf1ecfbc52ee694c428";

function jsonSafe(value) {
  return JSON.stringify(value, (_, item) => typeof item === "bigint" ? item.toString() : item);
}

/** Run with the project-local CLI deploy-script command. This file performs
 * exactly one guarded submit_attempt and never handles private keys. */
export default async function submitV1R3(client) {
  if (process.env.RUN_APTERRA_SUBMIT !== "1") throw new Error("Set RUN_APTERRA_SUBMIT=1 to authorize this single write");
  if (Number(client.chain?.id) !== EXPECTED_CHAIN) throw new Error(`WRONG_CHAIN:${client.chain?.id}`);
  const evidencePath = path.resolve(process.cwd(), "harness", "evidence", "refundbot-v1-live-r3.json");
  const evidence = fs.readFileSync(evidencePath, "utf8");
  const parsed = JSON.parse(evidence);
  if (parsed.bundle_hash !== BUNDLE_HASH) throw new Error(`BUNDLE_HASH_MISMATCH:${parsed.bundle_hash}`);
  const args = [ATTEMPT, CLAIM, BUNDLE_HASH, evidence];
  console.log(`TARGET chain=${EXPECTED_CHAIN} contract=${CONTRACT} method=submit_attempt attempt=${ATTEMPT}`);
  const estimate = await client.estimateTransactionFeesForWrite({ address: CONTRACT, functionName: "submit_attempt", args });
  if (!estimate?.distribution || BigInt(estimate.feeValue ?? 0) <= 0n) throw new Error("INVALID_NONZERO_FEE_ESTIMATE");
  const fees = { distribution: estimate.distribution, ...(estimate.messageAllocations?.length ? { messageAllocations: estimate.messageAllocations } : {}), feeValue: estimate.feeValue };
  console.log(`FEE_VALUE=${String(fees.feeValue)}`);
  const tx = await client.writeContract({ address: CONTRACT, functionName: "submit_attempt", args, value: 0n, fees });
  console.log(`SUBMIT_ATTEMPT_TX=${tx}`);
  const receipt = typeof client.waitForTransactionReceipt === "function"
    ? await client.waitForTransactionReceipt({ hash: tx })
    : (typeof client.waitForTransaction === "function" ? await client.waitForTransaction(tx) : null);
  if (receipt) console.log(`FINAL_RECEIPT=${jsonSafe(receipt)}`);
  else console.log("FINAL_RECEIPT=Use the printed hash to track decision/finality with the CLI read-only tracker.");
}

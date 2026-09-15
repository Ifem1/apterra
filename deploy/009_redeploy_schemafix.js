import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const CHAIN = 61997;
const EXPECTED_SOURCE_SHA = "0a830418b93cbb06b131fecdfea605037bd124f048f6d0cf3edabb8c7e717fda";

const safe = (value) => JSON.stringify(value, (_, item) => typeof item === "bigint" ? item.toString() : item);

export default async function redeploySchemaFix(client) {
  if (process.env.RUN_APTERRA_REDEPLOY !== "1") throw new Error("Set RUN_APTERRA_REDEPLOY=1 to authorize this single deployment");
  if (Number(client.chain?.id) !== CHAIN) throw new Error(`WRONG_CHAIN:${client.chain?.id}`);
  const sender = String(client.account?.address ?? "").toLowerCase();
  if (!sender) throw new Error("DEPLOYER_ACCOUNT_UNAVAILABLE");
  const source = fs.readFileSync(path.resolve(process.cwd(), "contracts", "apterra.py"), "utf8");
  const sourceSha = crypto.createHash("sha256").update(source, "utf8").digest("hex");
  console.log(`SOURCE_SHA256=${sourceSha}`);
  if (sourceSha !== EXPECTED_SOURCE_SHA) throw new Error(`SOURCE_HASH_MISMATCH:${sourceSha}`);
  const estimate = await client.estimateTransactionFees({});
  if (!estimate?.distribution || BigInt(estimate.feeValue ?? 0) <= 0n) throw new Error("INVALID_NONZERO_DEPLOYMENT_FEE");
  const fees = { distribution: estimate.distribution, ...(estimate.messageAllocations?.length ? { messageAllocations: estimate.messageAllocations } : {}), feeValue: estimate.feeValue };
  const tx = await client.deployContract({ code: source, args: [], fees, value: 0n });
  console.log(`DEPLOY_TX=${tx}`);
  const receipt = await client.waitForTransactionReceipt({ hash: tx, waitUntil: "decided", fullTransaction: true, retries: 120, interval: 5000 });
  console.log(`STATUS_NAME=${String(receipt.statusName ?? "")}`);
  console.log(`TX_EXECUTION_RESULT_NAME=${String(receipt.txExecutionResultName ?? "")}`);
  console.log(`FINAL_RECEIPT=${safe(receipt)}`);
  if (!(receipt.statusName === "ACCEPTED" || receipt.statusName === "FINALIZED") || receipt.txExecutionResultName !== "FINISHED_WITH_RETURN") throw new Error("DEPLOYMENT_NOT_SUCCESSFUL");
  const address = receipt.contractAddress ?? receipt.contract_address ?? receipt.result?.contractAddress ?? receipt.result?.contract_address;
  if (!address) throw new Error("DEPLOYED_ADDRESS_MISSING");
  const ownerRaw = await client.readContract({ address, functionName: "get_owner", args: [] });
  const policyRaw = await client.readContract({ address, functionName: "get_policy", args: ["refund-policy-v4.2"] });
  const owner = typeof ownerRaw === "string" ? ownerRaw : String(ownerRaw?.owner ?? "");
  const policy = typeof policyRaw === "string" ? JSON.parse(policyRaw) : policyRaw;
  if (owner.toLowerCase() !== sender) throw new Error(`OWNER_MISMATCH:${owner}`);
  if (!policy || policy.status !== "ACTIVE") throw new Error("POLICY_NOT_ACTIVE");
  console.log(`NEW_CONTRACT_ADDRESS=${address}`);
  console.log(`OWNER=${owner}`);
  console.log(`POLICY=${safe(policy)}`);
}

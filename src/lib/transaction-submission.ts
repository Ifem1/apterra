import type { createClient } from "genlayer-js";
import { createTransactionKit } from "@genlayer/transaction-kit";
import { studioDevnet } from "genlayer-js/chains";
import { assertFreshFeeQuote } from "./transaction-lifecycle.ts";

type Client = ReturnType<typeof createClient>;
export type ContractAction = {
  label: string;
  functionName: string;
  args: (string | bigint | number)[];
  expectedState: string;
};

function canonical(value: unknown): string {
  if (typeof value === "bigint") return JSON.stringify(value.toString());
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function prepareContractWriteWithFeePolicy(
  client: Client,
  address: `0x${string}`,
  action: ContractAction,
  expectedFingerprint: string | null,
  provider?: { request(args: { method: string; params?: unknown[] }): Promise<unknown> },
) {
  if (provider) {
    const kit = createTransactionKit({ chain: studioDevnet, provider });
    const kitQuote = await kit.estimate({ preset: "standard" }, { kind: "write", address, method: action.functionName, args: action.args });
    if (kitQuote.verification.status !== "verified") throw new Error("Transaction Kit fee-policy verification failed; signing is blocked.");
  }
  const quote = await client.estimateTransactionFeesForWrite({
    address,
    functionName: action.functionName,
    args: action.args as never[],
    value: BigInt(0),
  });
  const policyFingerprint = await sha256Hex(canonical(quote.policy));
  if (!expectedFingerprint) {
    throw new Error("The reviewed Studio Dev fee-policy fingerprint is not configured; signing is disabled.");
  }
  if (policyFingerprint !== expectedFingerprint) {
    throw new Error("Live fee policy does not match the reviewed profile. Signing is blocked; refresh the quote and review the profile.");
  }
  return { quote, policyFingerprint, action, quotedAt: Date.now() };
}

export async function submitPreparedWrite(
  client: Client,
  address: `0x${string}`,
  prepared: Awaited<ReturnType<typeof prepareContractWriteWithFeePolicy>>,
) {
  assertFreshFeeQuote(prepared.quotedAt);
  return client.writeContract({
    address,
    functionName: prepared.action.functionName,
    args: prepared.action.args as never[],
    value: BigInt(0),
    fees: {
      distribution: prepared.quote.distribution,
      messageAllocations: prepared.quote.messageAllocations,
      feeValue: prepared.quote.feeValue,
    },
  });
}

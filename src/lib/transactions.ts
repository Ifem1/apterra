import { configuredFeePolicyHash } from "@/lib/network";
import { prepareContractWriteWithFeePolicy, submitPreparedWrite, type ContractAction } from "./transaction-submission";

export type { ContractAction };
export { submitPreparedWrite };
export { assertFreshFeeQuote, summarizeTransactionLifecycle } from "@/lib/transaction-lifecycle";

export function prepareContractWrite(
  client: Parameters<typeof prepareContractWriteWithFeePolicy>[0],
  address: `0x${string}`,
  action: ContractAction,
  provider?: Parameters<typeof prepareContractWriteWithFeePolicy>[4],
) {
  return prepareContractWriteWithFeePolicy(client, address, action, configuredFeePolicyHash(), provider);
}

import "server-only";

import { createPublicClient, createWalletClient, defineChain, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { APTERRA_NETWORK } from "@/lib/network";
import type { FaucetSigner } from "@/lib/faucet";

export function createStudioDevFaucetSigner(privateKey: `0x${string}`): FaucetSigner {
  const chain = defineChain({
    id: APTERRA_NETWORK.chainId,
    name: APTERRA_NETWORK.name,
    nativeCurrency: { name: "GenLayer GEN", symbol: "GEN", decimals: 18 },
    rpcUrls: { default: { http: [APTERRA_NETWORK.rpc] } },
    blockExplorers: { default: { name: "Studio Dev Explorer", url: APTERRA_NETWORK.explorer } },
  });
  const account = privateKeyToAccount(privateKey);
  const transport = http(APTERRA_NETWORK.rpc);
  const publicClient = createPublicClient({ chain, transport });
  const walletClient = createWalletClient({ chain, transport, account });

  return {
    address: account.address,
    getChainId: () => publicClient.getChainId(),
    getBalance: () => publicClient.getBalance({ address: account.address }),
    sendGen: (destination, value) => walletClient.sendTransaction({ account, to: destination, value }),
  };
}

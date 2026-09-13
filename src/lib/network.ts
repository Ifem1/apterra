import { createClient } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";

export const APTERRA_NETWORK = Object.freeze({
  alias: "studio-dev",
  name: "GenLayer Studio Dev preview",
  chainId: 61997,
  chainIdHex: "0xf22d",
  rpc: "https://studio-dev.genlayer.com/api",
  explorer: "https://explorer-studio-dev.genlayer.com",
});

export const readClient = createClient({ chain: studioDevnet });

export type WalletProvider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
};

declare global {
  interface Window {
    ethereum?: WalletProvider;
  }
}

export function configuredContractAddress(): `0x${string}` | null {
  const address = process.env.NEXT_PUBLIC_APTERRA_CONTRACT_ADDRESS?.trim();
  return address && /^0x[a-fA-F0-9]{40}$/.test(address)
    ? (address as `0x${string}`)
    : null;
}

export function configuredFeePolicyHash(): string | null {
  const hash = process.env.NEXT_PUBLIC_FEE_POLICY_SHA256?.trim().toLowerCase();
  return hash && /^[a-f0-9]{64}$/.test(hash) ? hash : null;
}

export function createWalletClient(address: `0x${string}`, provider: WalletProvider) {
  return createClient({
    chain: studioDevnet,
    account: address,
    provider: provider as never,
  });
}

export async function assertStudioDev(provider: WalletProvider): Promise<void> {
  const chainId = await provider.request({ method: "eth_chainId" });
  if (typeof chainId !== "string" || chainId.toLowerCase() !== APTERRA_NETWORK.chainIdHex) {
    throw new Error(`Wrong wallet network. Switch to Studio Dev (chain ${APTERRA_NETWORK.chainId}).`);
  }
}

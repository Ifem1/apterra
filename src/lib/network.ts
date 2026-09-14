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

export function normalizeWalletAccounts(value: unknown): `0x${string}` | null {
  return Array.isArray(value) && typeof value[0] === "string" && /^0x[a-fA-F0-9]{40}$/.test(value[0])
    ? value[0] as `0x${string}`
    : null;
}

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

export async function assertWalletIdentity(provider: WalletProvider, expected: `0x${string}`): Promise<void> {
  await assertStudioDev(provider);
  const accounts = await provider.request({ method: "eth_accounts" });
  const active = normalizeWalletAccounts(accounts);
  if (!active || active.toLowerCase() !== expected.toLowerCase()) {
    throw new Error("The wallet account changed or disconnected. Reconnect and review the transaction again before signing.");
  }
}

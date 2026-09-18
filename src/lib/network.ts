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

export const MANUAL_DISCONNECT_KEY = "apterra:manual-disconnect";

export const readClient = createClient({ chain: studioDevnet });

export type WalletProvider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
};

export type WalletState = {
  account: `0x${string}` | null;
  chainId: string | null;
};

export type WalletSession = {
  account: `0x${string}`;
  chainId: string;
};

export type WalletConnectionResult =
  | { session: WalletSession; error: null }
  | { session: null; error: string };

export type WalletStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

const WALLET_ERROR_CONTAINER_KEYS = ["data", "cause", "error", "originalError", "innerError"] as const;

function walletErrorRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : null;
}

function inspectWalletError(
  value: unknown,
  predicate: (record: Record<string, unknown>) => boolean,
  depth = 0,
  seen = new Set<object>(),
): boolean {
  const record = walletErrorRecord(value);
  if (!record || depth > 6 || seen.has(record)) return false;
  seen.add(record);
  if (predicate(record)) return true;
  return WALLET_ERROR_CONTAINER_KEYS.some((key) => inspectWalletError(record[key], predicate, depth + 1, seen));
}

export function isUnknownChainError(error: unknown): boolean {
  return inspectWalletError(error, (record) => record.code === 4902 || record.code === "4902");
}

function walletErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;

  let message: string | null = null;
  inspectWalletError(error, (record) => {
    if (typeof record.message === "string" && record.message.trim()) {
      message = record.message;
      return true;
    }
    return false;
  });
  return message ?? "Wallet connection failed.";
}

export function normalizeWalletAccounts(value: unknown): `0x${string}` | null {
  return Array.isArray(value) && typeof value[0] === "string" && /^0x[a-fA-F0-9]{40}$/.test(value[0])
    ? value[0] as `0x${string}`
    : null;
}

export function normalizeWalletChainId(value: unknown): string | null {
  return typeof value === "string" && /^0x[a-fA-F0-9]+$/.test(value)
    ? value.toLowerCase()
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
  const chainId = normalizeWalletChainId(await provider.request({ method: "eth_chainId" }));
  if (chainId !== APTERRA_NETWORK.chainIdHex) {
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

async function switchAndVerifyStudioDev(provider: WalletProvider): Promise<string> {
  const current = normalizeWalletChainId(await provider.request({ method: "eth_chainId" }));
  if (current !== APTERRA_NETWORK.chainIdHex) {
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: APTERRA_NETWORK.chainIdHex }],
      });
    } catch (error) {
      if (!isUnknownChainError(error)) throw error;
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: APTERRA_NETWORK.chainIdHex,
          chainName: APTERRA_NETWORK.name,
          nativeCurrency: { name: "GenLayer GEN", symbol: "GEN", decimals: 18 },
          rpcUrls: [APTERRA_NETWORK.rpc],
          blockExplorerUrls: [APTERRA_NETWORK.explorer],
        }],
      });
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: APTERRA_NETWORK.chainIdHex }],
      });
    }
  }

  const finalChainId = normalizeWalletChainId(await provider.request({ method: "eth_chainId" }));
  if (finalChainId !== APTERRA_NETWORK.chainIdHex) {
    throw new Error(`Wrong wallet network. Switch to Studio Dev (chain ${APTERRA_NETWORK.chainId}).`);
  }
  return finalChainId;
}

export async function connectWalletSession(provider: WalletProvider): Promise<WalletConnectionResult> {
  const browserStorage = typeof window === "undefined" ? null : window.localStorage;
  const preserveManualDisconnect = browserStorage ? isManualDisconnect(browserStorage) : false;
  if (browserStorage) markManualDisconnect(browserStorage);

  try {
    const requestedAccount = normalizeWalletAccounts(await provider.request({ method: "eth_requestAccounts" }));
    if (!requestedAccount) throw new Error("Wallet returned no valid account.");

    await switchAndVerifyStudioDev(provider);

    const finalAccount = normalizeWalletAccounts(await provider.request({ method: "eth_accounts" }));
    const finalChainId = normalizeWalletChainId(await provider.request({ method: "eth_chainId" }));
    if (!finalAccount || finalAccount.toLowerCase() !== requestedAccount.toLowerCase()) {
      throw new Error("The wallet account changed during connection. Reconnect and confirm the intended account.");
    }
    if (finalChainId !== APTERRA_NETWORK.chainIdHex) {
      throw new Error(`Wrong wallet network. Switch to Studio Dev (chain ${APTERRA_NETWORK.chainId}).`);
    }

    return { session: { account: finalAccount, chainId: finalChainId }, error: null };
  } catch (error) {
    if (browserStorage && !preserveManualDisconnect) clearManualDisconnect(browserStorage);
    return {
      session: null,
      error: walletErrorMessage(error),
    };
  }
}

export async function restoreWalletSession(provider: WalletProvider): Promise<WalletSession | null> {
  const firstAccount = normalizeWalletAccounts(await provider.request({ method: "eth_accounts" }));
  if (!firstAccount) return null;
  const chainId = normalizeWalletChainId(await provider.request({ method: "eth_chainId" }));
  if (!chainId) return null;
  const finalAccount = normalizeWalletAccounts(await provider.request({ method: "eth_accounts" }));
  if (!finalAccount || finalAccount.toLowerCase() !== firstAccount.toLowerCase()) return null;
  return { account: finalAccount, chainId };
}

export function walletStateAfterAccountChange(state: WalletState, accounts: unknown): WalletState {
  return { ...state, account: normalizeWalletAccounts(accounts) };
}

export function walletStateAfterChainChange(state: WalletState, chainId: unknown): WalletState {
  return { ...state, chainId: normalizeWalletChainId(chainId) };
}

export function disconnectedWalletState(): WalletState {
  return { account: null, chainId: null };
}

export function isManualDisconnect(storage: WalletStorage): boolean {
  return storage.getItem(MANUAL_DISCONNECT_KEY) === "1";
}

export function markManualDisconnect(storage: WalletStorage): void {
  storage.setItem(MANUAL_DISCONNECT_KEY, "1");
}

export function clearManualDisconnect(storage: WalletStorage): void {
  storage.removeItem(MANUAL_DISCONNECT_KEY);
}

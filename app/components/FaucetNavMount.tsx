"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  APTERRA_NETWORK,
  MANUAL_DISCONNECT_KEY,
  normalizeWalletAccounts,
  normalizeWalletChainId,
  type WalletProvider,
} from "@/lib/network";

type FaucetUiState =
  | { kind: "ready" }
  | { kind: "sending" }
  | { kind: "success"; txHash: string; remainingSeconds: number }
  | { kind: "cooldown"; remainingSeconds: number; txHash?: string }
  | { kind: "failure"; message: string };

type FaucetPayload = {
  ok?: boolean;
  code?: string;
  message?: string;
  txHash?: string;
  retryAfterSeconds?: number;
};

function cooldownLabel(seconds: number) {
  const safe = Math.max(0, Math.ceil(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.ceil((safe % 3600) / 60);
  return `Available again in ${hours ? `${hours}h ` : ""}${minutes}m`;
}

export default function FaucetNavMount() {
  const [mount, setMount] = useState<Element | null>(null);
  const [account, setAccount] = useState<`0x${string}` | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [state, setState] = useState<FaucetUiState>({ kind: "ready" });

  useEffect(() => {
    const findMount = () => setMount(document.querySelector(".top-actions"));
    findMount();
    const observer = new MutationObserver(findMount);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const syncWallet = useCallback(async () => {
    const provider = window.ethereum as WalletProvider | undefined;
    if (!provider || window.localStorage.getItem(MANUAL_DISCONNECT_KEY) === "1") {
      setAccount(null);
      setChainId(null);
      return;
    }
    try {
      const [accounts, activeChain] = await Promise.all([
        provider.request({ method: "eth_accounts" }),
        provider.request({ method: "eth_chainId" }),
      ]);
      setAccount(normalizeWalletAccounts(accounts));
      setChainId(normalizeWalletChainId(activeChain));
    } catch {
      setAccount(null);
      setChainId(null);
    }
  }, []);

  useEffect(() => {
    void syncWallet();
    const provider = window.ethereum as WalletProvider | undefined;
    const onWalletChange = () => void syncWallet();
    provider?.on?.("accountsChanged", onWalletChange);
    provider?.on?.("chainChanged", onWalletChange);
    const timer = window.setInterval(() => void syncWallet(), 1000);
    return () => {
      window.clearInterval(timer);
      provider?.removeListener?.("accountsChanged", onWalletChange);
      provider?.removeListener?.("chainChanged", onWalletChange);
    };
  }, [syncWallet]);

  const refreshStatus = useCallback(async (wallet: `0x${string}`) => {
    try {
      const response = await fetch(`/api/faucet?address=${encodeURIComponent(wallet)}`, { cache: "no-store" });
      const payload = await response.json() as FaucetPayload;
      if (payload.code === "COOLDOWN") {
        setState({ kind: "cooldown", remainingSeconds: payload.retryAfterSeconds ?? 0, ...(payload.txHash ? { txHash: payload.txHash } : {}) });
      } else if (payload.code === "IN_PROGRESS") {
        setState({ kind: "sending" });
        window.setTimeout(() => void refreshStatus(wallet), 3000);
      } else if (response.ok) {
        setState({ kind: "ready" });
      } else {
        setState({ kind: "failure", message: "Faucet temporarily unavailable. Try again later." });
      }
    } catch {
      setState({ kind: "failure", message: "Faucet temporarily unavailable. Try again later." });
    }
  }, []);

  useEffect(() => {
    if (!account || chainId !== APTERRA_NETWORK.chainIdHex) {
      setState({ kind: "ready" });
      return;
    }
    void refreshStatus(account);
  }, [account, chainId, refreshStatus]);

  useEffect(() => {
    if (state.kind !== "cooldown" && state.kind !== "success") return;
    const timer = window.setInterval(() => {
      setState((current) => {
        if (current.kind !== "cooldown" && current.kind !== "success") return current;
        const remainingSeconds = Math.max(0, current.remainingSeconds - 60);
        if (remainingSeconds === 0) return { kind: "ready" };
        return { ...current, remainingSeconds };
      });
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [state.kind]);

  const requestGen = useCallback(async () => {
    if (!account || chainId !== APTERRA_NETWORK.chainIdHex || state.kind === "sending" || state.kind === "cooldown") return;
    setState({ kind: "sending" });
    try {
      const response = await fetch("/api/faucet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: account }),
      });
      const payload = await response.json() as FaucetPayload;
      if (response.ok && payload.code === "SUCCESS" && payload.txHash) {
        const remainingSeconds = payload.retryAfterSeconds ?? 48 * 60 * 60;
        setState({ kind: "success", txHash: payload.txHash, remainingSeconds });
        window.setTimeout(() => setState((current) => current.kind === "success"
          ? { kind: "cooldown", remainingSeconds: current.remainingSeconds, txHash: current.txHash }
          : current), 5000);
        return;
      }
      if (payload.code === "COOLDOWN") {
        setState({ kind: "cooldown", remainingSeconds: payload.retryAfterSeconds ?? 0, ...(payload.txHash ? { txHash: payload.txHash } : {}) });
        return;
      }
      setState({ kind: "failure", message: "Faucet temporarily unavailable. Try again later." });
    } catch {
      setState({ kind: "failure", message: "Faucet temporarily unavailable. Try again later." });
    }
  }, [account, chainId, state.kind]);

  if (!mount) return null;

  const wrongNetwork = Boolean(account && chainId !== APTERRA_NETWORK.chainIdHex);
  const disabled = !account || wrongNetwork || state.kind === "sending" || state.kind === "cooldown";
  const label = state.kind === "sending" ? "Sending..."
    : state.kind === "success" ? "1 test GEN sent"
      : state.kind === "cooldown" ? cooldownLabel(state.remainingSeconds)
        : "Get 1 test GEN";
  const txHash = state.kind === "success" || state.kind === "cooldown" ? state.txHash : undefined;

  return createPortal(
    <div className="faucet-control">
      <button
        type="button"
        className="faucet-button"
        disabled={disabled}
        onClick={() => void requestGen()}
        title={!account ? "Connect your wallet first" : wrongNetwork ? "Switch the connected wallet to Studio Dev (61997)" : undefined}
      >{label}</button>
      {(state.kind === "success" || state.kind === "failure") && <div className={`faucet-feedback ${state.kind}`} role="status">
        <span>{state.kind === "success" ? "1 test GEN sent" : state.message}</span>
        {txHash && <a href={`${APTERRA_NETWORK.explorer}/tx/${txHash}`} target="_blank" rel="noreferrer">View {txHash.slice(0, 10)}…{txHash.slice(-6)}</a>}
      </div>}
    </div>,
    mount,
  );
}

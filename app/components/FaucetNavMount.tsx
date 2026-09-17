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
  | { kind: "success"; txHash: string }
  | { kind: "failure"; message: string };

type FaucetPayload = {
  ok?: boolean;
  code?: string;
  message?: string;
  txHash?: string;
};

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

  useEffect(() => {
    setState({ kind: "ready" });
  }, [account, chainId]);

  const requestGen = useCallback(async () => {
    if (!account || chainId !== APTERRA_NETWORK.chainIdHex || state.kind === "sending" || state.kind === "success") return;
    setState({ kind: "sending" });
    try {
      const response = await fetch("/api/faucet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: account }),
      });
      const payload = await response.json() as FaucetPayload;
      if (response.ok && payload.code === "SUCCESS" && payload.txHash) {
        setState({ kind: "success", txHash: payload.txHash });
        window.setTimeout(() => setState((current) => current.kind === "success" ? { kind: "ready" } : current), 5000);
        return;
      }
      setState({ kind: "failure", message: "Faucet temporarily unavailable. Try again later." });
    } catch {
      setState({ kind: "failure", message: "Faucet temporarily unavailable. Try again later." });
    }
  }, [account, chainId, state.kind]);

  if (!mount) return null;

  const wrongNetwork = Boolean(account && chainId !== APTERRA_NETWORK.chainIdHex);
  const disabled = !account || wrongNetwork || state.kind === "sending" || state.kind === "success";
  const label = state.kind === "sending" ? "Sending..."
    : state.kind === "success" ? "1 test GEN sent"
      : "Get 1 test GEN";
  const txHash = state.kind === "success" ? state.txHash : undefined;

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

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ContractAction } from "@/lib/transactions";
import { prepareContractWrite, submitPreparedWrite } from "@/lib/transactions";
import {
  APTERRA_NETWORK,
  assertStudioDev,
  configuredContractAddress,
  createWalletClient,
  readClient,
  type WalletProvider,
} from "@/lib/network";

const POLICY_HASH = "8cf7a04eed9818e8edb5ba080517742499f1bb70ac0c0512a1e26dfb43bbca52";
const RUBRIC_HASH = "7bd435d7166ab72a3477ead47588be5359b40bd9aaa7c11b87212b50b4947f70";
const RISK_POLICY_HASH = "b37754d4094eb8372f179edd5fa496a1f9e56055f6868354e359bd1012708cd6";
const CASE_IDS = "routine-eligible,clearly-ineligible,ambiguous-exception,adversarial-override";
const PENDING_KEY = "apterra:studio-dev:pending-transactions:v1";

type PendingTransaction = { hash: string; method: string; status: string; execution?: string };
type PreparedWrite = Awaited<ReturnType<typeof prepareContractWrite>>;

function compact(address: string | null) {
  return address ? `${address.slice(0, 7)}…${address.slice(-5)}` : "Wallet not connected";
}

function stringify(value: unknown) {
  if (typeof value === "string") {
    try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; }
  }
  return JSON.stringify(value, (_key, entry) => typeof entry === "bigint" ? entry.toString() : entry, 2) ?? "No result";
}

export default function Home() {
  const contractAddress = useMemo(() => configuredContractAddress(), []);
  const [provider, setProvider] = useState<WalletProvider | null>(null);
  const [account, setAccount] = useState<`0x${string}` | null>(null);
  const [walletClient, setWalletClient] = useState<ReturnType<typeof createWalletClient> | null>(null);
  const [notice, setNotice] = useState("Connect a wallet to Studio Dev to begin.");
  const [noticeTone, setNoticeTone] = useState<"neutral" | "good" | "warn">("neutral");
  const [busy, setBusy] = useState(false);
  const [prepared, setPrepared] = useState<PreparedWrite | null>(null);
  const [readResult, setReadResult] = useState("");
  const [readBusy, setReadBusy] = useState(false);
  const [pending, setPending] = useState<PendingTransaction[]>([]);
  const [versionId, setVersionId] = useState("");
  const [agentRef, setAgentRef] = useState("");
  const [modelId, setModelId] = useState("");
  const [adapterId, setAdapterId] = useState("");
  const [systemHash, setSystemHash] = useState("");
  const [toolsHash, setToolsHash] = useState("");
  const [runtimeHash, setRuntimeHash] = useState("");
  const [harnessVersion, setHarnessVersion] = useState("harness-v1");
  const [claimId, setClaimId] = useState("");
  const [requestedAmount, setRequestedAmount] = useState("5000");
  const [validityDays, setValidityDays] = useState("30");
  const [challengeId, setChallengeId] = useState("");
  const [executor, setExecutor] = useState("");
  const [attemptId, setAttemptId] = useState("");
  const [evidence, setEvidence] = useState("");
  const [queryId, setQueryId] = useState("");
  const [actionAmount, setActionAmount] = useState("600");
  const [nonce, setNonce] = useState("");

  useEffect(() => {
    if (window.ethereum) setProvider(window.ethereum);
    try { setPending(JSON.parse(localStorage.getItem(PENDING_KEY) ?? "[]") as PendingTransaction[]); }
    catch { setPending([]); }
  }, []);

  useEffect(() => {
    if (!provider?.on) return;
    const onAccounts = (accounts: unknown) => {
      const next = Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0] as `0x${string}` : null;
      setAccount(next);
      setWalletClient(next ? createWalletClient(next, provider) : null);
      setNotice(next ? "Wallet account changed. Verify the displayed account before signing." : "Wallet disconnected.");
      setNoticeTone("warn");
      setPrepared(null);
    };
    const onChain = () => {
      setNotice("Wallet network changed. Switch back to Studio Dev before continuing.");
      setNoticeTone("warn");
      setPrepared(null);
    };
    provider.on("accountsChanged", onAccounts);
    provider.on("chainChanged", onChain);
    return () => {
      provider.removeListener?.("accountsChanged", onAccounts);
      provider.removeListener?.("chainChanged", onChain);
    };
  }, [provider]);

  const connectWallet = useCallback(async () => {
    if (!provider) {
      setNotice("No injected EIP-1193 wallet was detected in this browser.");
      setNoticeTone("warn");
      return;
    }
    setBusy(true);
    try {
      const accounts = await provider.request({ method: "eth_requestAccounts" });
      if (!Array.isArray(accounts) || typeof accounts[0] !== "string") throw new Error("Wallet returned no account.");
      const address = accounts[0] as `0x${string}`;
      const client = createWalletClient(address, provider);
      await client.connect("studioDevnet");
      await assertStudioDev(provider);
      setAccount(address);
      setWalletClient(client);
      setNotice("Connected to Studio Dev (61997). Reads are canonical; each write still requires a separate wallet signature.");
      setNoticeTone("good");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Wallet connection failed.");
      setNoticeTone("warn");
    } finally { setBusy(false); }
  }, [provider]);

  const readCanonical = useCallback(async (method: string) => {
    if (!contractAddress) return;
    setReadBusy(true);
    try {
      const result = await readClient.readContract({
        address: contractAddress,
        functionName: method,
        args: [queryId] as never[],
      });
      setReadResult(stringify(result));
      setNotice(`Canonical Studio Dev read completed: ${method}.`);
      setNoticeTone("good");
    } catch (error) {
      setReadResult("");
      setNotice(error instanceof Error ? error.message : "Canonical read failed.");
      setNoticeTone("warn");
    } finally { setReadBusy(false); }
  }, [contractAddress, queryId]);

  const prepare = useCallback(async (action: ContractAction) => {
    if (!contractAddress) {
      setNotice("No deployed Studio Dev contract address is configured; writes are disabled.");
      setNoticeTone("warn");
      return;
    }
    if (!provider || !walletClient || !account) {
      setNotice("Connect the intended wallet account before preparing a write.");
      setNoticeTone("warn");
      return;
    }
    setBusy(true);
    setPrepared(null);
    try {
      await assertStudioDev(provider);
      const quote = await prepareContractWrite(walletClient, contractAddress, action);
      setPrepared(quote);
      setNotice("Fee quote matches the configured Studio Dev profile. Review the exact action before signing.");
      setNoticeTone("good");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not prepare this write.");
      setNoticeTone("warn");
    } finally { setBusy(false); }
  }, [account, contractAddress, provider, walletClient]);

  const submitPrepared = useCallback(async () => {
    if (!prepared || !walletClient || !account || !contractAddress || !provider) return;
    setBusy(true);
    try {
      await assertStudioDev(provider);
      const hash = await submitPreparedWrite(walletClient, contractAddress, prepared);
      const entry = { hash: String(hash), method: prepared.action.functionName, status: "SUBMITTED" };
      const updated = [entry, ...pending.filter((item) => item.hash !== entry.hash)];
      setPending(updated);
      localStorage.setItem(PENDING_KEY, JSON.stringify(updated));
      setPrepared(null);
      setNotice(`Submitted ${entry.method}. Tracking the same transaction hash; no automatic retry will be sent.`);
      setNoticeTone("good");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Wallet signing or submission failed.");
      setNoticeTone("warn");
    } finally { setBusy(false); }
  }, [account, contractAddress, pending, prepared, provider, walletClient]);

  const trackTransaction = useCallback(async (hash: string) => {
    setBusy(true);
    try {
      const transaction = await readClient.waitForFinalization({ hash: hash as never, interval: 3000, retries: 10 });
      const next = pending.map((item) => item.hash === hash
        ? { ...item, status: String(transaction.statusName ?? transaction.lifecycle), execution: transaction.txExecutionResultName ?? "Execution result unavailable" }
        : item);
      setPending(next);
      localStorage.setItem(PENDING_KEY, JSON.stringify(next));
      setNotice(`Finalization state read for ${hash}. Verify the execution result and canonical readback.`);
      setNoticeTone(transaction.txExecutionResultName === "FINISHED_WITH_RETURN" ? "good" : "warn");
    } catch (error) {
      setNotice(`Tracking did not reach finality. The transaction remains saved; query the same hash before taking any further action. ${error instanceof Error ? error.message : ""}`);
      setNoticeTone("warn");
    } finally { setBusy(false); }
  }, [pending]);

  const makeAction = (label: string, functionName: string, args: (string | number | bigint)[], expectedState: string) =>
    prepare({ label, functionName, args, expectedState });

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="APTERRA home"><span className="brand-mark">A</span><span>APTERRA</span></a>
        <nav aria-label="Primary navigation"><a href="#underwriting">Underwriting</a><a href="#evidence">Evidence</a><a href="#authority">Authority</a></nav>
        <div className="top-actions"><span className="network-pill"><i /> STUDIO DEV · 61997</span><button className="wallet-button" onClick={connectWallet} disabled={busy}>{account ? compact(account) : "Connect wallet"}</button></div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> AGENT AUTHORITY, UNDERWRITTEN</div>
          <h1>Capability earns<br /><em>authority.</em></h1>
          <p>Before an agent receives consequential permission, APTERRA asks it to prove what it can do — against a real policy, a committed challenge, and independent GenLayer judgment.</p>
          <div className="hero-actions"><a className="primary-link" href="#underwriting">Open underwriting desk <span>↘</span></a><a className="text-link" href="#trust">Read the trust boundary</a></div>
        </div>
        <div className="hero-art" aria-label="Authority is granted through a four-stage underwriting lifecycle">
          <div className="orbit orbit-outer" /><div className="orbit orbit-inner" />
          <div className="orbit-label label-one">01 / CLAIM</div><div className="orbit-label label-two">02 / CHALLENGE</div><div className="orbit-label label-three">03 / CONSENSUS</div><div className="orbit-label label-four">04 / WARRANT</div>
          <div className="orbit-core"><span className="core-kicker">APTERRA</span><strong>TRUST<br />UNDERWRITTEN</strong><span className="core-rule" /><small>GENLAYER · 61997</small></div>
          <span className="orbit-dot dot-one" /><span className="orbit-dot dot-two" /><span className="orbit-dot dot-three" /><span className="orbit-dot dot-four" />
        </div>
        <div className="hero-foot"><span>REFUND POLICY V4.2</span><span>ONE CAPABILITY · ONE VERSION · ONE BOUNDED WARRANT</span><span>PREVIEW · 61997</span></div>
      </section>

      <section className="status-strip" aria-live="polite">
        <span className={`status-icon ${noticeTone}`}>{noticeTone === "good" ? "✓" : noticeTone === "warn" ? "!" : "i"}</span>
        <span>{notice}</span>
        <span className="status-account">{compact(account)}</span>
      </section>

      <section className="metrics" aria-label="Underwriting principles">
        <div><span className="metric-index">01</span><strong>Version-bound</strong><p>Authority belongs to the exact tested configuration.</p></div>
        <div><span className="metric-index">02</span><strong>Evidence-backed</strong><p>Claims, challenge, and attempt are committed before judgment.</p></div>
        <div><span className="metric-index">03</span><strong>Contract-enforced</strong><p>A verdict changes the actual permission boundary.</p></div>
        <div><span className="metric-index">04</span><strong>Uncertainty fails closed</strong><p>No evidence, no new authority. No silent certification.</p></div>
      </section>

      {!contractAddress && <section className="deployment-notice"><span className="notice-mark">!</span><div><strong>Studio Dev deployment is not configured yet</strong><p>The page will not invent live state. Set <code>NEXT_PUBLIC_APTERRA_CONTRACT_ADDRESS</code> only after an approved 61997 deployment and source/schema verification. Contract reads and writes stay disabled until then.</p></div><span className="tag pending-tag">AWAITING VERIFIED DEPLOYMENT</span></section>}

      <section className="workbench" id="underwriting">
        <div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> PRODUCT WORKSPACE</div><h2>Underwriting desk</h2></div><span className="section-index">01 — 04</span></div>
        <div className="workspace-grid">
          <aside className="step-rail" aria-label="Underwriting lifecycle">
            <div className="rail-step active"><span>01</span><div><strong>Agent version</strong><small>Commit the exact configuration</small></div><b>●</b></div>
            <div className="rail-step"><span>02</span><div><strong>Capability claim</strong><small>Declare scope and authority</small></div><b>○</b></div>
            <div className="rail-step"><span>03</span><div><strong>Challenge & evidence</strong><small>Assign before the attempt</small></div><b>○</b></div>
            <div className="rail-step"><span>04</span><div><strong>Consensus & warrant</strong><small>Read the contract decision</small></div><b>○</b></div>
            <div className="rail-note"><span className="tiny-shield">◇</span><p>Each step requires a wallet signature. APTERRA never computes a verdict or permission in the browser.</p></div>
          </aside>

          <div className="form-stack">
            <article className="panel" id="version">
              <div className="panel-heading"><div><span className="step-number">01</span><h3>Register an agent version</h3></div><span className="tag">IMMUTABLE</span></div>
              <p className="panel-intro">Material changes create a new version. Registration identifies a configuration; it does not establish capability.</p>
              <div className="field-grid two">
                <label>Version ID<input value={versionId} onChange={(e) => setVersionId(e.target.value)} placeholder="refundbot-v1" maxLength={128} /></label>
                <label>Agent reference<input value={agentRef} onChange={(e) => setAgentRef(e.target.value)} placeholder="RefundBot" maxLength={128} /></label>
                <label>Model ID<input value={modelId} onChange={(e) => setModelId(e.target.value)} placeholder="provider/model revision" maxLength={128} /></label>
                <label>Provider / adapter<input value={adapterId} onChange={(e) => setAdapterId(e.target.value)} placeholder="OpenAI-compatible adapter" maxLength={128} /></label>
                <label>System-policy SHA-256<input value={systemHash} onChange={(e) => setSystemHash(e.target.value)} placeholder="64 lowercase hex characters" maxLength={128} /></label>
                <label>Tool-manifest SHA-256<input value={toolsHash} onChange={(e) => setToolsHash(e.target.value)} placeholder="64 lowercase hex characters" maxLength={128} /></label>
                <label>Runtime SHA-256<input value={runtimeHash} onChange={(e) => setRuntimeHash(e.target.value)} placeholder="64 lowercase hex characters" maxLength={128} /></label>
                <label>Harness version<input value={harnessVersion} onChange={(e) => setHarnessVersion(e.target.value)} maxLength={128} /></label>
              </div>
              <button className="action-button" disabled={busy || !contractAddress || !account || [versionId, agentRef, modelId, adapterId, systemHash, toolsHash, runtimeHash, harnessVersion].some((value) => !value.trim())} onClick={() => makeAction("Register agent version", "register_agent_version", [versionId, agentRef, modelId, adapterId, systemHash, toolsHash, runtimeHash, harnessVersion], "A new immutable version record is stored with the connected account as operator.")}>Prepare version registration <span>→</span></button>
            </article>

            <article className="panel">
              <div className="panel-heading"><div><span className="step-number">02</span><h3>Create a capability claim</h3></div><span className="tag">REFUND · V4.2</span></div>
              <p className="panel-intro">The committed policy and risk hashes are fixed in the contract. The requested ceiling is not the granted ceiling.</p>
              <div className="field-grid three">
                <label>Claim ID<input value={claimId} onChange={(e) => setClaimId(e.target.value)} placeholder="claim-2026-001" maxLength={128} /></label>
                <label>Requested refund ceiling<input inputMode="numeric" value={requestedAmount} onChange={(e) => setRequestedAmount(e.target.value)} min="1" max="5000" /></label>
                <label>Requested validity · days<input inputMode="numeric" value={validityDays} onChange={(e) => setValidityDays(e.target.value)} min="1" max="30" /></label>
              </div>
              <div className="commitment-line"><span>POLICY <code>{POLICY_HASH.slice(0, 12)}…</code></span><span>RISK <code>{RISK_POLICY_HASH.slice(0, 12)}…</code></span></div>
              <button className="action-button secondary" disabled={busy || !contractAddress || !account || !claimId || !versionId || !/^[1-9]\d{0,3}$/.test(requestedAmount) || Number(requestedAmount) > 5000 || !/^[1-9]\d?$/.test(validityDays) || Number(validityDays) > 30} onClick={() => makeAction("Create refund capability claim", "create_claim", [claimId, versionId, POLICY_HASH, RISK_POLICY_HASH, BigInt(requestedAmount), BigInt(validityDays)], "The exact version, policy hashes, $5,000-bounded requested authority, and validity are committed.")}>Prepare claim <span>→</span></button>
            </article>

            <article className="panel" id="evidence">
              <div className="panel-heading"><div><span className="step-number">03</span><h3>Commit challenge & attempt evidence</h3></div><span className="tag">ASSIGN BEFORE REVEAL</span></div>
              <p className="panel-intro">The four-case refund suite is fixed. Run the disclosed local harness after the assignment finalizes; paste its committed JSON bundle below.</p>
              <div className="field-grid two">
                <label>Challenge ID<input value={challengeId} onChange={(e) => setChallengeId(e.target.value)} placeholder="refund-challenge-001" maxLength={128} /></label>
                <label>Evidence executor · address<input value={executor || account || ""} onChange={(e) => setExecutor(e.target.value)} placeholder="0x…" maxLength={42} /></label>
                <label>Attempt ID<input value={attemptId} onChange={(e) => setAttemptId(e.target.value)} placeholder="attempt-001" maxLength={128} /></label>
              </div>
              <div className="case-list">{["Routine eligible", "Clearly ineligible", "Ambiguous exception", "Adversarial override"].map((label, index) => <span key={label}><i>{String(index + 1).padStart(2, "0")}</i>{label}</span>)}</div>
              <div className="button-row"><button className="action-button secondary" disabled={busy || !contractAddress || !account || !claimId || !challengeId || !/^0x[a-fA-F0-9]{40}$/.test(executor || account || "")} onClick={() => makeAction("Assign refund challenge", "assign_challenge", [claimId, challengeId, RUBRIC_HASH, (executor || account) as string, CASE_IDS], "A version-bound challenge and executor are fixed before evidence submission.")}>Prepare challenge assignment <span>→</span></button></div>
              <label className="full-label">Committed evidence JSON<textarea value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="Paste the complete harness output after the challenge assignment is finalized." rows={6} maxLength={20000} /></label>
              <button className="action-button secondary" disabled={busy || !contractAddress || !account || !attemptId || !claimId || !evidence.trim()} onClick={() => {
                try {
                  const bundle = JSON.parse(evidence) as { bundle_hash?: string };
                  if (!bundle.bundle_hash || !/^[a-f0-9]{64}$/.test(bundle.bundle_hash)) throw new Error("The evidence must contain its 64-character bundle_hash.");
                  void makeAction("Submit committed challenge attempt", "submit_attempt", [attemptId, claimId, bundle.bundle_hash, evidence], "The evidence bundle is committed to the assigned challenge and exact registered version.");
                } catch (error) { setNotice(error instanceof Error ? error.message : "Evidence JSON is invalid."); setNoticeTone("warn"); }
              }}>Prepare evidence commitment <span>→</span></button>
              <div className="inline-callout"><strong>Harness trust boundary</strong><span>The local executor identity and model output are disclosed commitments, not TEE/provider attestation. Validators judge the submitted evidence; they do not prove the harness publisher honest.</span></div>
            </article>

            <article className="panel" id="authority">
              <div className="panel-heading"><div><span className="step-number">04</span><h3>Consensus result & authority</h3></div><span className="tag">CONTRACT STATE ONLY</span></div>
              <p className="panel-intro">Request underwriting after attempt finality. Then read the canonical warrant and test a downstream refund action against it.</p>
              <div className="field-grid two">
                <label>Claim, attempt, or version ID<input value={queryId} onChange={(e) => setQueryId(e.target.value)} placeholder="Use the exact committed ID" maxLength={128} /></label>
                <label>Proposed refund amount<input inputMode="numeric" value={actionAmount} onChange={(e) => setActionAmount(e.target.value)} placeholder="600" /></label>
                <label>Single-use action nonce<input value={nonce} onChange={(e) => setNonce(e.target.value)} placeholder="refund-order-123" maxLength={128} /></label>
              </div>
              <div className="button-row wrap">
                <button className="action-button" disabled={busy || !contractAddress || !account || !attemptId} onClick={() => makeAction("Request semantic underwriting", "underwrite_attempt", [attemptId], "GenLayer validators judge the exact committed evidence; contract maps findings to a canonical verdict.")}>Prepare underwriting <span>→</span></button>
                <button className="action-button secondary" disabled={readBusy || !contractAddress || !queryId} onClick={() => void readCanonical("get_claim")}>Read claim</button>
                <button className="action-button secondary" disabled={readBusy || !contractAddress || !queryId} onClick={() => void readCanonical("get_judgment")}>Read judgment</button>
                <button className="action-button secondary" disabled={readBusy || !contractAddress || !queryId} onClick={() => void readCanonical("get_effective_authority")}>Read effective authority</button>
                <button className="action-button secondary" disabled={busy || !contractAddress || !account || !versionId || !nonce || !/^[1-9]\d*$/.test(actionAmount)} onClick={() => makeAction("Consume refund authority", "consume_authority", [versionId, "REFUND", BigInt(actionAmount), nonce], "The contract records PERMITTED only when the active warrant permits the amount, version, action, expiry, and nonce.")}>Prepare authority check <span>→</span></button>
              </div>
              {readResult && <pre className="read-result" aria-label="Canonical contract readback">{readResult}</pre>}
            </article>
          </div>
        </div>
      </section>

      {prepared && contractAddress && account && <section className="review-card" aria-label="Transaction review">
        <div className="review-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> WALLET REVIEW</div><h2>Inspect before signing</h2></div><button className="close-button" onClick={() => setPrepared(null)} aria-label="Cancel transaction review">×</button></div>
        <dl className="review-grid">
          <div><dt>Action</dt><dd>{prepared.action.label}</dd></div><div><dt>Account</dt><dd>{account}</dd></div>
          <div><dt>Network</dt><dd>{APTERRA_NETWORK.alias} · chain {APTERRA_NETWORK.chainId} · {APTERRA_NETWORK.rpc}</dd></div>
          <div><dt>Contract / method</dt><dd>{contractAddress} · {prepared.action.functionName}</dd></div>
          <div><dt>Arguments</dt><dd><code>{prepared.action.args.map(String).join(" · ")}</code></dd></div>
          <div><dt>Estimated maximum fee</dt><dd>{prepared.quote.feeValue.toString()} wei · GEN policy quote</dd></div>
          <div><dt>Policy fingerprint</dt><dd><code>{prepared.policyFingerprint}</code></dd></div>
          <div><dt>Value</dt><dd>0 GEN</dd></div>
          <div className="wide"><dt>Expected state consequence</dt><dd>{prepared.action.expectedState}</dd></div>
        </dl>
        <p className="review-warning">Review account, chain, fee, and arguments in your wallet. This signature is for the single action above; APTERRA cannot sign on your behalf.</p>
        <div className="button-row"><button className="action-button" onClick={() => void submitPrepared()} disabled={busy}>Sign in wallet & submit <span>→</span></button><button className="cancel-button" onClick={() => setPrepared(null)} disabled={busy}>Cancel</button></div>
      </section>}

      <section className="transaction-panel">
        <div className="section-heading compact-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> TRANSACTION TRUTH</div><h2>Receipt & finality</h2></div><span className="tag">SAME-HASH TRACKING</span></div>
        {pending.length === 0 ? <p className="empty-state">No transaction has been submitted in this browser session. Nothing is seeded or simulated.</p> : <div className="transaction-list">{pending.map((item) => <div className="transaction-row" key={item.hash}><div><strong>{item.method}</strong><code>{item.hash}</code><span>{item.status}{item.execution ? ` · ${item.execution}` : ""}</span></div><div className="transaction-actions"><a href={`${APTERRA_NETWORK.explorer}`} target="_blank" rel="noreferrer">Explorer ↗</a><button className="track-button" disabled={busy} onClick={() => void trackTransaction(item.hash)}>Check finality</button></div></div>)}</div>}
      </section>

      <section className="trust-section" id="trust"><div><div className="eyebrow"><span className="eyebrow-line" /> SCOPE & TRUST</div><h2>A warrant is<br /><em>not a promise.</em></h2></div><div className="trust-copy"><p>APTERRA records what an exact agent version demonstrated under a named challenge and policy. It does not prove legal authority, universal safety, publisher honesty, external refund execution, payment completion, or regulatory compliance.</p><p>GenLayer handles the bounded semantic residue: whether the committed attempt evidence demonstrates policy capability and resisted adversarial content. Deterministic contract code owns hashes, lifecycle, verdict mapping, expiry, revocation, and authority ceilings.</p><a href="https://docs.genlayer.com/developers/intelligent-contracts/equivalence-principle" target="_blank" rel="noreferrer">Why semantic consensus matters ↗</a></div></section>

      <footer className="footer"><a className="brand" href="#top"><span className="brand-mark">A</span><span>APTERRA</span></a><span>CAPABILITY UNDERWRITING FOR AUTONOMOUS AGENTS</span><span>STUDIO DEV PREVIEW · CHAIN 61997</span></footer>
    </main>
  );
}

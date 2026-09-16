import assert from "node:assert/strict";
import test from "node:test";
import {
  APTERRA_NETWORK,
  assertStudioDev,
  assertWalletIdentity,
  clearManualDisconnect,
  connectWalletSession,
  disconnectedWalletState,
  isManualDisconnect,
  markManualDisconnect,
  normalizeWalletAccounts,
  restoreWalletSession,
  walletStateAfterAccountChange,
  walletStateAfterChainChange,
} from "../src/lib/network.ts";

const ACCOUNT_A = "0x1111111111111111111111111111111111111111";
const ACCOUNT_B = "0x2222222222222222222222222222222222222222";

function makeStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

test("connection success requests accounts, switches to Studio Dev, and returns only the verified final session", async () => {
  let chainId = "0x1";
  const calls = [];
  const provider = {
    request: async ({ method }) => {
      calls.push(method);
      if (method === "eth_requestAccounts") return [ACCOUNT_A];
      if (method === "eth_accounts") return [ACCOUNT_A];
      if (method === "eth_chainId") return chainId;
      if (method === "wallet_switchEthereumChain") { chainId = APTERRA_NETWORK.chainIdHex; return null; }
      throw new Error(`unexpected method ${method}`);
    },
  };

  const result = await connectWalletSession(provider);
  assert.deepEqual(result, {
    session: { account: ACCOUNT_A, chainId: APTERRA_NETWORK.chainIdHex },
    error: null,
  });
  assert.equal(calls[0], "eth_requestAccounts");
  assert.ok(calls.includes("wallet_switchEthereumChain"));
  assert.equal(calls.at(-1), "eth_chainId");
});

test("connection failure returns no session or account state", async () => {
  const provider = {
    request: async ({ method }) => {
      if (method === "eth_requestAccounts") return [ACCOUNT_A];
      if (method === "eth_chainId") return "0x1";
      if (method === "wallet_switchEthereumChain") throw new Error("user rejected");
      throw new Error(`unexpected method ${method}`);
    },
  };

  const result = await connectWalletSession(provider);
  assert.equal(result.session, null);
  assert.match(result.error, /user rejected/);
  assert.deepEqual(disconnectedWalletState(), { account: null, chainId: null });
});

test("an already-authorised wallet survives refresh without eth_requestAccounts", async () => {
  const calls = [];
  const provider = {
    request: async ({ method }) => {
      calls.push(method);
      if (method === "eth_accounts") return [ACCOUNT_A];
      if (method === "eth_chainId") return APTERRA_NETWORK.chainIdHex;
      if (method === "eth_requestAccounts") throw new Error("refresh must not request approval");
      throw new Error(`unexpected method ${method}`);
    },
  };

  const restored = await restoreWalletSession(provider);
  assert.deepEqual(restored, { account: ACCOUNT_A, chainId: APTERRA_NETWORK.chainIdHex });
  assert.equal(calls.includes("eth_requestAccounts"), false);
  assert.deepEqual(calls, ["eth_accounts", "eth_chainId", "eth_accounts"]);
});

test("account changes update the account immediately and preserve the known chain", () => {
  const current = { account: ACCOUNT_A, chainId: APTERRA_NETWORK.chainIdHex };
  assert.deepEqual(walletStateAfterAccountChange(current, [ACCOUNT_B]), {
    account: ACCOUNT_B,
    chainId: APTERRA_NETWORK.chainIdHex,
  });
  assert.deepEqual(walletStateAfterAccountChange(current, []), {
    account: null,
    chainId: APTERRA_NETWORK.chainIdHex,
  });
});

test("chain changes update the chain immediately and preserve the active account", () => {
  const current = { account: ACCOUNT_A, chainId: APTERRA_NETWORK.chainIdHex };
  assert.deepEqual(walletStateAfterChainChange(current, "0x1"), {
    account: ACCOUNT_A,
    chainId: "0x1",
  });
});

test("manual disconnect persistence is explicit and the disconnected state is empty", () => {
  const storage = makeStorage();
  assert.equal(isManualDisconnect(storage), false);
  markManualDisconnect(storage);
  assert.equal(isManualDisconnect(storage), true);
  assert.deepEqual(disconnectedWalletState(), { account: null, chainId: null });
  clearManualDisconnect(storage);
  assert.equal(isManualDisconnect(storage), false);
});

test("wallet account changes are normalized and disconnects clear the active account", () => {
  assert.equal(normalizeWalletAccounts([ACCOUNT_A]), ACCOUNT_A);
  assert.equal(normalizeWalletAccounts([ACCOUNT_B]), ACCOUNT_B);
  assert.equal(normalizeWalletAccounts([]), null);
  assert.equal(normalizeWalletAccounts(["not-an-address"]), null);
});

test("only the Studio Dev chain is accepted; other chain IDs are rejected", async () => {
  await assertStudioDev({ request: async () => "0xf22d" });
  await assert.rejects(
    assertStudioDev({ request: async () => "0xf22f" }),
    /Switch to Studio Dev \(chain 61997\)/,
  );
  await assert.rejects(
    assertStudioDev({ request: async () => { throw new Error("user rejected"); } }),
    /user rejected/,
  );
});

test("quote and signing identity checks require the same active account and Studio Dev", async () => {
  const provider = {
    request: async ({ method }) => method === "eth_chainId" ? "0xf22d" : [ACCOUNT_A],
  };
  await assertWalletIdentity(provider, ACCOUNT_A);
  await assert.rejects(assertWalletIdentity(provider, ACCOUNT_B), /account changed or disconnected/);
  await assert.rejects(assertWalletIdentity({
    request: async ({ method }) => method === "eth_chainId" ? "0x1" : [ACCOUNT_A],
  }, ACCOUNT_A), /Wrong wallet network/);
  await assert.rejects(assertWalletIdentity({
    request: async ({ method }) => method === "eth_chainId" ? "0xf22d" : [],
  }, ACCOUNT_A), /account changed or disconnected/);
});

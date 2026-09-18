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
  isUnknownChainError,
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

test("fresh wallet already on Studio Dev skips add and switch and verifies the approved account", async () => {
  const calls = [];
  const provider = {
    request: async ({ method }) => {
      calls.push(method);
      if (method === "eth_requestAccounts" || method === "eth_accounts") return [ACCOUNT_A];
      if (method === "eth_chainId") return APTERRA_NETWORK.chainIdHex;
      if (method === "wallet_switchEthereumChain" || method === "wallet_addEthereumChain") {
        throw new Error("network mutation should not be requested");
      }
      throw new Error(`unexpected method ${method}`);
    },
  };

  const result = await connectWalletSession(provider);
  assert.deepEqual(result, {
    session: { account: ACCOUNT_A, chainId: APTERRA_NETWORK.chainIdHex },
    error: null,
  });
  assert.equal(calls.includes("wallet_switchEthereumChain"), false);
  assert.equal(calls.includes("wallet_addEthereumChain"), false);
  assert.deepEqual(calls, ["eth_requestAccounts", "eth_chainId", "eth_chainId", "eth_accounts", "eth_chainId"]);
});

test("direct numeric 4902 unknown-chain error falls back to adding Studio Dev", async () => {
  let chainId = "0x1";
  let switchCalls = 0;
  let addCalls = 0;
  const provider = {
    request: async ({ method }) => {
      if (method === "eth_requestAccounts" || method === "eth_accounts") return [ACCOUNT_A];
      if (method === "eth_chainId") return chainId;
      if (method === "wallet_switchEthereumChain") {
        switchCalls += 1;
        if (switchCalls === 1) throw { code: 4902, message: "Unrecognized chain ID" };
        chainId = APTERRA_NETWORK.chainIdHex;
        return null;
      }
      if (method === "wallet_addEthereumChain") { addCalls += 1; return null; }
      throw new Error(`unexpected method ${method}`);
    },
  };

  const result = await connectWalletSession(provider);
  assert.equal(isUnknownChainError({ code: 4902 }), true);
  assert.equal(addCalls, 1);
  assert.equal(switchCalls, 2);
  assert.deepEqual(result, {
    session: { account: ACCOUNT_A, chainId: APTERRA_NETWORK.chainIdHex },
    error: null,
  });
});

test("wrapped Rabby-style nested 4902 unknown-chain error falls back to adding Studio Dev", async () => {
  let chainId = "0x1";
  let switchCalls = 0;
  let addCalls = 0;
  const wrappedError = {
    code: -32603,
    message: "Internal JSON-RPC error.",
    data: {
      originalError: {
        code: 4902,
        message: "Unrecognized chain ID",
      },
    },
  };
  const provider = {
    request: async ({ method }) => {
      if (method === "eth_requestAccounts" || method === "eth_accounts") return [ACCOUNT_A];
      if (method === "eth_chainId") return chainId;
      if (method === "wallet_switchEthereumChain") {
        switchCalls += 1;
        if (switchCalls === 1) throw wrappedError;
        chainId = APTERRA_NETWORK.chainIdHex;
        return null;
      }
      if (method === "wallet_addEthereumChain") { addCalls += 1; return null; }
      throw new Error(`unexpected method ${method}`);
    },
  };

  assert.equal(isUnknownChainError(wrappedError), true);
  assert.equal(isUnknownChainError({ code: -32603, data: { cause: { code: "4902" } } }), true);
  assert.equal(isUnknownChainError({ code: 4001, message: "User rejected" }), false);

  const result = await connectWalletSession(provider);
  assert.equal(addCalls, 1);
  assert.equal(switchCalls, 2);
  assert.deepEqual(result, {
    session: { account: ACCOUNT_A, chainId: APTERRA_NETWORK.chainIdHex },
    error: null,
  });
});

test("wallet_addEthereumChain uses the exact Studio Dev parameters before the verified switch", async () => {
  let chainId = "0x1";
  let switchCalls = 0;
  const calls = [];
  const provider = {
    request: async ({ method, params }) => {
      calls.push({ method, params });
      if (method === "eth_requestAccounts" || method === "eth_accounts") return [ACCOUNT_A];
      if (method === "eth_chainId") return chainId;
      if (method === "wallet_switchEthereumChain") {
        switchCalls += 1;
        if (switchCalls === 1) throw { data: { code: 4902 } };
        chainId = APTERRA_NETWORK.chainIdHex;
        return null;
      }
      if (method === "wallet_addEthereumChain") return null;
      throw new Error(`unexpected method ${method}`);
    },
  };

  const result = await connectWalletSession(provider);
  const addCall = calls.find(({ method }) => method === "wallet_addEthereumChain");
  assert.deepEqual(addCall?.params, [{
    chainId: "0xf22d",
    chainName: "GenLayer Studio Dev preview",
    nativeCurrency: { name: "GenLayer GEN", symbol: "GEN", decimals: 18 },
    rpcUrls: ["https://studio-dev.genlayer.com/api"],
    blockExplorerUrls: ["https://explorer-studio-dev.genlayer.com"],
  }]);
  assert.deepEqual(result, {
    session: { account: ACCOUNT_A, chainId: APTERRA_NETWORK.chainIdHex },
    error: null,
  });
});

test("user rejecting network add or switch leaves no connected session and preserves the wallet error", async () => {
  let switchCalls = 0;
  const provider = {
    request: async ({ method }) => {
      if (method === "eth_requestAccounts") return [ACCOUNT_A];
      if (method === "eth_chainId") return "0x1";
      if (method === "wallet_switchEthereumChain") {
        switchCalls += 1;
        throw switchCalls === 1
          ? { code: 4902, message: "Unknown chain" }
          : { code: 4001, message: "User rejected network switch" };
      }
      if (method === "wallet_addEthereumChain") {
        throw { code: 4001, message: "User rejected network add" };
      }
      throw new Error(`unexpected method ${method}`);
    },
  };

  const result = await connectWalletSession(provider);
  assert.equal(result.session, null);
  assert.equal(result.error, "User rejected network add");
  assert.deepEqual(disconnectedWalletState(), { account: null, chainId: null });
});

test("final chain verification fails closed if the wallet still is not on Studio Dev", async () => {
  let accountReads = 0;
  const provider = {
    request: async ({ method }) => {
      if (method === "eth_requestAccounts") return [ACCOUNT_A];
      if (method === "eth_chainId") return "0x1";
      if (method === "wallet_switchEthereumChain") return null;
      if (method === "eth_accounts") { accountReads += 1; return [ACCOUNT_A]; }
      throw new Error(`unexpected method ${method}`);
    },
  };

  const result = await connectWalletSession(provider);
  assert.equal(result.session, null);
  assert.match(result.error, /Wrong wallet network.*61997/);
  assert.equal(accountReads, 0);
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

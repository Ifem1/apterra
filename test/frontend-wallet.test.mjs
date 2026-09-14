import assert from "node:assert/strict";
import test from "node:test";
import { assertStudioDev, assertWalletIdentity, normalizeWalletAccounts } from "../src/lib/network.ts";

const ACCOUNT_A = "0x1111111111111111111111111111111111111111";
const ACCOUNT_B = "0x2222222222222222222222222222222222222222";

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

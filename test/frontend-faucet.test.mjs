import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  executeFaucetRequest,
  FAUCET_AMOUNT_WEI,
  FAUCET_CHAIN_ID,
} from "../src/lib/faucet.ts";

const DEST = "0x1111111111111111111111111111111111111111";
const KEY = `0x${"22".repeat(32)}`;
const HASH = `0x${"ab".repeat(32)}`;
const ENOUGH = 100n * 10n ** 18n;

function makeSigner(options = {}) {
  const calls = [];
  return {
    address: "0x3333333333333333333333333333333333333333",
    calls,
    async getChainId() { return options.chainId ?? FAUCET_CHAIN_ID; },
    async getBalance() { return options.balance ?? ENOUGH; },
    async sendGen(to, value) {
      calls.push({ to, value });
      if (options.sendError) throw options.sendError;
      return options.hash ?? HASH;
    },
  };
}

function deps(signer, extra = {}) {
  return {
    privateKey: KEY,
    minReserveGen: extra.minReserveGen,
    createSigner: () => signer,
    ...extra,
  };
}

test("valid faucet request sends exactly 1 GEN and returns the real transaction hash", async () => {
  const signer = makeSigner();
  const result = await executeFaucetRequest(DEST, deps(signer));
  assert.equal(result.status, 200);
  assert.equal(result.body.txHash, HASH);
  assert.deepEqual(signer.calls, [{ to: DEST, value: FAUCET_AMOUNT_WEI }]);
  assert.equal(FAUCET_AMOUNT_WEI, 10n ** 18n);
});

test("the same wallet can request again after the previous request completes", async () => {
  const firstSigner = makeSigner();
  const secondSigner = makeSigner({ hash: `0x${"cd".repeat(32)}` });
  const first = await executeFaucetRequest(DEST, deps(firstSigner));
  const second = await executeFaucetRequest(DEST, deps(secondSigner));
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(firstSigner.calls.length, 1);
  assert.equal(secondSigner.calls.length, 1);
});

test("invalid destination wallet is rejected before signing", async () => {
  const signer = makeSigner();
  const result = await executeFaucetRequest("not-an-address", deps(signer));
  assert.equal(result.status, 400);
  assert.equal(signer.calls.length, 0);
});

test("missing private key fails safely", async () => {
  const result = await executeFaucetRequest(DEST, deps(makeSigner(), { privateKey: undefined }));
  assert.equal(result.status, 503);
  assert.equal(result.body.message, "Faucet temporarily unavailable. Try again later.");
});

test("wrong chain fails safely", async () => {
  const result = await executeFaucetRequest(DEST, deps(makeSigner({ chainId: 1 })));
  assert.equal(result.status, 503);
  assert.equal(result.body.code, "UNAVAILABLE");
});

test("insufficient faucet balance fails safely without sending", async () => {
  const signer = makeSigner({ balance: FAUCET_AMOUNT_WEI - 1n });
  const result = await executeFaucetRequest(DEST, deps(signer, { minReserveGen: "0" }));
  assert.equal(result.status, 503);
  assert.equal(signer.calls.length, 0);
});

test("minimum reserve protection refuses a transfer that would cross the reserve", async () => {
  const reserve = 5n * 10n ** 18n;
  const signer = makeSigner({ balance: FAUCET_AMOUNT_WEI + reserve - 1n });
  const result = await executeFaucetRequest(DEST, deps(signer, { minReserveGen: "5" }));
  assert.equal(result.status, 503);
  assert.equal(signer.calls.length, 0);
});

test("failed transaction returns only the safe faucet error", async () => {
  const secretDetail = "rpc secret detail";
  const result = await executeFaucetRequest(DEST, deps(makeSigner({ sendError: new Error(secretDetail) })));
  assert.equal(result.status, 503);
  assert.equal(result.body.message, "Faucet temporarily unavailable. Try again later.");
  assert.equal(JSON.stringify(result).includes(secretDetail), false);
});

test("successful responses preserve the exact signer transaction hash", async () => {
  const hash = `0x${"ef".repeat(32)}`;
  const result = await executeFaucetRequest(DEST, deps(makeSigner({ hash })));
  assert.equal(result.status, 200);
  assert.equal(result.body.txHash, hash);
});

test("faucet private key and storage configuration are absent from client code", () => {
  const clientSource = fs.readFileSync("app/components/FaucetNavMount.tsx", "utf8");
  assert.equal(clientSource.includes("APTERRA_FAUCET_PRIVATE_KEY"), false);
  assert.equal(clientSource.includes("NEXT_PUBLIC_APTERRA_FAUCET"), false);
  assert.equal(clientSource.includes("UPSTASH"), false);
  assert.equal(clientSource.includes("REDIS"), false);
});

import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  executeFaucetRequest,
  FAUCET_AMOUNT_WEI,
  FAUCET_CHAIN_ID,
  FAUCET_COOLDOWN_SECONDS,
  getFaucetStatus,
} from "../src/lib/faucet.ts";

const DEST = "0x1111111111111111111111111111111111111111";
const KEY = `0x${"22".repeat(32)}`;
const HASH = `0x${"ab".repeat(32)}`;
const ENOUGH = 100n * 10n ** 18n;

function makeStore() {
  let now = 1_000_000;
  const wallets = new Map();
  const rates = new Map();
  const current = (address) => {
    const item = wallets.get(address);
    if (!item || item.expiresAt <= now) { wallets.delete(address); return null; }
    return item;
  };
  return {
    advance(seconds) { now += seconds; },
    async rateLimit(key, max, windowSeconds) {
      const item = rates.get(key);
      if (!item || item.expiresAt <= now) {
        rates.set(key, { count: 1, expiresAt: now + windowSeconds });
        return true;
      }
      item.count += 1;
      return item.count <= max;
    },
    async status(address) {
      const item = current(address);
      if (!item) return { state: "available", remainingSeconds: 0 };
      return {
        state: item.value.startsWith("sent:") ? "sent" : "pending",
        remainingSeconds: item.expiresAt - now,
        ...(item.value.startsWith("sent:") ? { txHash: item.value.slice(5) } : {}),
      };
    },
    async acquire(address, token, ttl) {
      const item = current(address);
      if (item) return { acquired: false, ...(await this.status(address)) };
      wallets.set(address, { value: `pending:${token}`, expiresAt: now + ttl });
      return { acquired: true, state: "pending", remainingSeconds: ttl };
    },
    async finalize(address, token, txHash, ttl) {
      const item = current(address);
      if (!item || item.value !== `pending:${token}`) return false;
      wallets.set(address, { value: `sent:${txHash}`, expiresAt: now + ttl });
      return true;
    },
    async release(address, token) {
      const item = current(address);
      if (item?.value === `pending:${token}`) wallets.delete(address);
    },
  };
}

function makeSigner(options = {}) {
  const calls = [];
  const signer = {
    address: "0x3333333333333333333333333333333333333333",
    calls,
    async getChainId() { return options.chainId ?? FAUCET_CHAIN_ID; },
    async getBalance() { return options.balance ?? ENOUGH; },
    async sendGen(to, value) {
      calls.push({ to, value });
      if (options.sendError) throw options.sendError;
      if (options.delay) await options.delay();
      return options.hash ?? HASH;
    },
  };
  return signer;
}

function deps(store, signer, extra = {}) {
  let sequence = 0;
  return {
    store,
    privateKey: KEY,
    requestKey: extra.requestKey ?? `request-${Math.random()}`,
    minReserveGen: extra.minReserveGen,
    createSigner: () => signer,
    token: () => `token-${++sequence}`,
    ...extra,
  };
}

test("valid faucet request sends exactly 1 GEN and returns the real transaction hash", async () => {
  const store = makeStore();
  const signer = makeSigner();
  const result = await executeFaucetRequest(DEST, deps(store, signer));
  assert.equal(result.status, 200);
  assert.equal(result.body.txHash, HASH);
  assert.deepEqual(signer.calls, [{ to: DEST, value: FAUCET_AMOUNT_WEI }]);
  assert.equal(FAUCET_AMOUNT_WEI, 10n ** 18n);
});

test("invalid destination wallet is rejected before signing", async () => {
  const signer = makeSigner();
  const result = await executeFaucetRequest("not-an-address", deps(makeStore(), signer));
  assert.equal(result.status, 400);
  assert.equal(signer.calls.length, 0);
});

test("missing private key fails safely", async () => {
  const result = await executeFaucetRequest(DEST, deps(makeStore(), makeSigner(), { privateKey: undefined }));
  assert.equal(result.status, 503);
  assert.equal(result.body.message, "Faucet temporarily unavailable. Try again later.");
});

test("wrong or misconfigured network fails safely", async () => {
  const result = await executeFaucetRequest(DEST, deps(makeStore(), makeSigner({ chainId: 1 })));
  assert.equal(result.status, 503);
  assert.equal(result.body.code, "UNAVAILABLE");
});

test("repeat request inside 48 hours is rejected", async () => {
  const store = makeStore();
  assert.equal((await executeFaucetRequest(DEST, deps(store, makeSigner()))).status, 200);
  const repeat = await executeFaucetRequest(DEST, deps(store, makeSigner()));
  assert.equal(repeat.status, 429);
  assert.equal(repeat.body.code, "COOLDOWN");
  assert.ok(repeat.body.retryAfterSeconds > 0);
});

test("request after the full 48-hour cooldown is allowed", async () => {
  const store = makeStore();
  assert.equal((await executeFaucetRequest(DEST, deps(store, makeSigner()))).status, 200);
  store.advance(FAUCET_COOLDOWN_SECONDS + 1);
  assert.equal((await executeFaucetRequest(DEST, deps(store, makeSigner()))).status, 200);
});

test("concurrent duplicate requests cannot both pay", async () => {
  const store = makeStore();
  let releaseSend;
  const gate = new Promise((resolve) => { releaseSend = resolve; });
  const firstSigner = makeSigner({ delay: () => gate });
  const first = executeFaucetRequest(DEST, deps(store, firstSigner, { requestKey: "ip-a" }));
  await new Promise((resolve) => setImmediate(resolve));
  const secondSigner = makeSigner();
  const second = await executeFaucetRequest(DEST, deps(store, secondSigner, { requestKey: "ip-b" }));
  assert.equal(second.status, 409);
  assert.equal(secondSigner.calls.length, 0);
  releaseSend();
  assert.equal((await first).status, 200);
  assert.equal(firstSigner.calls.length, 1);
});

test("insufficient faucet balance fails safely without sending", async () => {
  const signer = makeSigner({ balance: FAUCET_AMOUNT_WEI - 1n });
  const result = await executeFaucetRequest(DEST, deps(makeStore(), signer));
  assert.equal(result.status, 503);
  assert.equal(signer.calls.length, 0);
});

test("minimum reserve protection refuses a transfer that would cross the reserve", async () => {
  const reserve = 5n * 10n ** 18n;
  const signer = makeSigner({ balance: FAUCET_AMOUNT_WEI + reserve - 1n });
  const result = await executeFaucetRequest(DEST, deps(makeStore(), signer, { minReserveGen: "5" }));
  assert.equal(result.status, 503);
  assert.equal(signer.calls.length, 0);
});

test("failed transfer does not consume the 48-hour cooldown", async () => {
  const store = makeStore();
  const failed = await executeFaucetRequest(DEST, deps(store, makeSigner({ sendError: new Error("rpc secret detail") })));
  assert.equal(failed.status, 503);
  assert.equal((await getFaucetStatus(DEST, store)).status, 200);
  const retry = await executeFaucetRequest(DEST, deps(store, makeSigner()));
  assert.equal(retry.status, 200);
});

test("signer errors and secrets never appear in API-safe results", async () => {
  const secret = "TOP-SECRET-FAUCET-MATERIAL";
  const result = await executeFaucetRequest(DEST, deps(makeStore(), makeSigner({ sendError: new Error(secret) })));
  assert.equal(JSON.stringify(result).includes(secret), false);
  assert.equal(result.body.message, "Faucet temporarily unavailable. Try again later.");
});

test("faucet private-key environment variable is absent from the client component", () => {
  const clientSource = fs.readFileSync(new URL("../app/components/FaucetNavMount.tsx", import.meta.url), "utf8");
  assert.equal(clientSource.includes("APTERRA_FAUCET_PRIVATE_KEY"), false);
  assert.equal(clientSource.includes("NEXT_PUBLIC_APTERRA_FAUCET"), false);
});

import { isAddress, parseEther } from "viem";

export const FAUCET_CHAIN_ID = 61997;
export const FAUCET_AMOUNT_GEN = "1";
export const FAUCET_AMOUNT_WEI = parseEther(FAUCET_AMOUNT_GEN);
export const FAUCET_COOLDOWN_SECONDS = 48 * 60 * 60;
export const FAUCET_RATE_LIMIT_WINDOW_SECONDS = 10 * 60;
export const FAUCET_RATE_LIMIT_MAX_REQUESTS = 12;
export const FAUCET_DEFAULT_MIN_RESERVE_GEN = "5";
export const FAUCET_SAFE_FAILURE = "Faucet temporarily unavailable. Try again later.";

export type FaucetStoreState = {
  state: "available" | "pending" | "sent";
  remainingSeconds: number;
  txHash?: `0x${string}`;
};

export type FaucetStore = {
  rateLimit(key: string, maxRequests: number, windowSeconds: number): Promise<boolean>;
  status(address: string): Promise<FaucetStoreState>;
  acquire(address: string, token: string, ttlSeconds: number): Promise<FaucetStoreState & { acquired: boolean }>;
  finalize(address: string, token: string, txHash: `0x${string}`, ttlSeconds: number): Promise<boolean>;
  release(address: string, token: string): Promise<void>;
};

export type FaucetSigner = {
  address: `0x${string}`;
  getChainId(): Promise<number>;
  getBalance(): Promise<bigint>;
  sendGen(destination: `0x${string}`, value: bigint): Promise<`0x${string}`>;
};

export type FaucetDeps = {
  store: FaucetStore;
  privateKey?: string;
  minReserveGen?: string;
  requestKey: string;
  createSigner(privateKey: `0x${string}`): FaucetSigner;
  token(): string;
};

export type FaucetResult = {
  status: number;
  body: {
    ok: boolean;
    code: "SUCCESS" | "INVALID_ADDRESS" | "COOLDOWN" | "IN_PROGRESS" | "RATE_LIMITED" | "UNAVAILABLE";
    message: string;
    txHash?: `0x${string}`;
    retryAfterSeconds?: number;
  };
};

export function isValidFaucetAddress(value: unknown): value is `0x${string}` {
  return typeof value === "string" && isAddress(value, { strict: true });
}

export function isValidFaucetPrivateKey(value: unknown): value is `0x${string}` {
  return typeof value === "string" && /^0x[a-fA-F0-9]{64}$/.test(value);
}

export function parseMinimumReserve(value: string | undefined): bigint {
  const raw = (value?.trim() || FAUCET_DEFAULT_MIN_RESERVE_GEN);
  if (!/^\d+(?:\.\d{1,18})?$/.test(raw)) throw new Error("Invalid faucet reserve configuration.");
  return parseEther(raw);
}

export function isTransactionHash(value: unknown): value is `0x${string}` {
  return typeof value === "string" && /^0x[a-fA-F0-9]{64}$/.test(value);
}

export function formatCooldown(seconds: number): string {
  const safe = Math.max(0, Math.ceil(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.ceil((safe % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function unavailable(): FaucetResult {
  return { status: 503, body: { ok: false, code: "UNAVAILABLE", message: FAUCET_SAFE_FAILURE } };
}

export async function getFaucetStatus(address: unknown, store: FaucetStore): Promise<FaucetResult> {
  if (!isValidFaucetAddress(address)) {
    return { status: 400, body: { ok: false, code: "INVALID_ADDRESS", message: "Invalid wallet address." } };
  }
  try {
    const state = await store.status(address.toLowerCase());
    if (state.state === "sent") {
      return {
        status: 429,
        body: {
          ok: false,
          code: "COOLDOWN",
          message: `Available again in ${formatCooldown(state.remainingSeconds)}`,
          retryAfterSeconds: state.remainingSeconds,
          ...(state.txHash ? { txHash: state.txHash } : {}),
        },
      };
    }
    if (state.state === "pending") {
      return { status: 409, body: { ok: false, code: "IN_PROGRESS", message: "A faucet request is already in progress." } };
    }
    return { status: 200, body: { ok: true, code: "SUCCESS", message: "Get 1 test GEN" } };
  } catch {
    return unavailable();
  }
}

export async function executeFaucetRequest(destination: unknown, deps: FaucetDeps): Promise<FaucetResult> {
  if (!isValidFaucetAddress(destination)) {
    return { status: 400, body: { ok: false, code: "INVALID_ADDRESS", message: "Invalid wallet address." } };
  }
  if (!isValidFaucetPrivateKey(deps.privateKey)) return unavailable();

  const address = destination.toLowerCase() as `0x${string}`;
  let claimed = false;
  let submitted = false;
  const reservation = deps.token();

  try {
    const allowed = await deps.store.rateLimit(
      deps.requestKey,
      FAUCET_RATE_LIMIT_MAX_REQUESTS,
      FAUCET_RATE_LIMIT_WINDOW_SECONDS,
    );
    if (!allowed) {
      return { status: 429, body: { ok: false, code: "RATE_LIMITED", message: "Too many faucet requests. Try again later." } };
    }

    const existing = await deps.store.acquire(address, reservation, FAUCET_COOLDOWN_SECONDS);
    if (!existing.acquired) {
      if (existing.state === "sent") {
        return {
          status: 429,
          body: {
            ok: false,
            code: "COOLDOWN",
            message: `Available again in ${formatCooldown(existing.remainingSeconds)}`,
            retryAfterSeconds: existing.remainingSeconds,
            ...(existing.txHash ? { txHash: existing.txHash } : {}),
          },
        };
      }
      return { status: 409, body: { ok: false, code: "IN_PROGRESS", message: "A faucet request is already in progress." } };
    }
    claimed = true;

    const signer = deps.createSigner(deps.privateKey);
    if (await signer.getChainId() !== FAUCET_CHAIN_ID) throw new Error("Faucet RPC is on the wrong chain.");

    const reserve = parseMinimumReserve(deps.minReserveGen);
    const balance = await signer.getBalance();
    if (balance < FAUCET_AMOUNT_WEI + reserve) throw new Error("Faucet balance is below its protected reserve.");

    const txHash = await signer.sendGen(address, FAUCET_AMOUNT_WEI);
    if (!isTransactionHash(txHash)) throw new Error("Faucet signer returned an invalid transaction hash.");
    submitted = true;

    // A failed persistence write must never erase the already-acquired safety reservation.
    // The reservation itself has the full cooldown TTL, so duplicate payment stays blocked.
    try { await deps.store.finalize(address, reservation, txHash, FAUCET_COOLDOWN_SECONDS); } catch { /* keep reservation */ }

    return {
      status: 200,
      body: {
        ok: true,
        code: "SUCCESS",
        message: "1 test GEN sent",
        txHash,
        retryAfterSeconds: FAUCET_COOLDOWN_SECONDS,
      },
    };
  } catch {
    if (claimed && !submitted) {
      try { await deps.store.release(address, reservation); } catch { /* fail closed if storage is unavailable */ }
    }
    return unavailable();
  }
}

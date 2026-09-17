import "server-only";

import { createPublicClient, createWalletClient, defineChain, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { APTERRA_NETWORK } from "@/lib/network";
import type { FaucetSigner, FaucetStore, FaucetStoreState } from "@/lib/faucet";

const KEY_PREFIX = "apterra:faucet:v1";

type RedisReply<T> = { result?: T; error?: string };

function walletKey(address: string) {
  return `${KEY_PREFIX}:wallet:${address.toLowerCase()}`;
}

function parseStoredState(value: unknown, ttl: unknown): FaucetStoreState {
  const remainingSeconds = typeof ttl === "number" && ttl > 0 ? ttl : 0;
  if (typeof value !== "string") return { state: "available", remainingSeconds: 0 };
  if (value.startsWith("sent:")) {
    const hash = value.slice(5);
    return /^0x[a-fA-F0-9]{64}$/.test(hash)
      ? { state: "sent", remainingSeconds, txHash: hash as `0x${string}` }
      : { state: "sent", remainingSeconds };
  }
  if (value.startsWith("pending:")) return { state: "pending", remainingSeconds };
  return { state: "pending", remainingSeconds };
}

export function createUpstashFaucetStore(url: string | undefined, token: string | undefined): FaucetStore {
  const endpoint = url?.trim().replace(/\/+$/, "");
  const authToken = token?.trim();
  if (!endpoint || !authToken) throw new Error("Faucet storage is unavailable.");

  const command = async <T>(args: Array<string | number>): Promise<T> => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${authToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(args),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Faucet storage request failed.");
    const payload = await response.json() as RedisReply<T>;
    if (payload.error) throw new Error("Faucet storage command failed.");
    return payload.result as T;
  };

  const status = async (address: string): Promise<FaucetStoreState> => {
    const key = walletKey(address);
    const [value, ttl] = await Promise.all([
      command<string | null>(["GET", key]),
      command<number>(["TTL", key]),
    ]);
    return parseStoredState(value, ttl);
  };

  return {
    async rateLimit(key, maxRequests, windowSeconds) {
      const script = "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n";
      const count = await command<number>(["EVAL", script, 1, `${KEY_PREFIX}:rate:${key}`, windowSeconds]);
      return Number(count) <= maxRequests;
    },
    status,
    async acquire(address, reservation, ttlSeconds) {
      const key = walletKey(address);
      const result = await command<string | null>(["SET", key, `pending:${reservation}`, "NX", "EX", ttlSeconds]);
      if (result === "OK") return { acquired: true, state: "pending", remainingSeconds: ttlSeconds };
      return { acquired: false, ...(await status(address)) };
    },
    async finalize(address, reservation, txHash, ttlSeconds) {
      const script = "if redis.call('GET',KEYS[1])==ARGV[1] then redis.call('SET',KEYS[1],ARGV[2],'EX',ARGV[3]); return 1 else return 0 end";
      const result = await command<number>([
        "EVAL", script, 1, walletKey(address), `pending:${reservation}`, `sent:${txHash}`, ttlSeconds,
      ]);
      return Number(result) === 1;
    },
    async release(address, reservation) {
      const script = "if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end";
      await command<number>(["EVAL", script, 1, walletKey(address), `pending:${reservation}`]);
    },
  };
}

export function createStudioDevFaucetSigner(privateKey: `0x${string}`): FaucetSigner {
  const chain = defineChain({
    id: APTERRA_NETWORK.chainId,
    name: APTERRA_NETWORK.name,
    nativeCurrency: { name: "GenLayer GEN", symbol: "GEN", decimals: 18 },
    rpcUrls: { default: { http: [APTERRA_NETWORK.rpc] } },
    blockExplorers: { default: { name: "Studio Dev Explorer", url: APTERRA_NETWORK.explorer } },
  });
  const account = privateKeyToAccount(privateKey);
  const transport = http(APTERRA_NETWORK.rpc);
  const publicClient = createPublicClient({ chain, transport });
  const walletClient = createWalletClient({ chain, transport, account });

  return {
    address: account.address,
    getChainId: () => publicClient.getChainId(),
    getBalance: () => publicClient.getBalance({ address: account.address }),
    sendGen: (destination, value) => walletClient.sendTransaction({ account, to: destination, value }),
  };
}

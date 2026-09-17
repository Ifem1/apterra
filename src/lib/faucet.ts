import { isAddress, parseEther } from "viem";

export const FAUCET_CHAIN_ID = 61997;
export const FAUCET_AMOUNT_GEN = "1";
export const FAUCET_AMOUNT_WEI = parseEther(FAUCET_AMOUNT_GEN);
export const FAUCET_DEFAULT_MIN_RESERVE_GEN = "5";
export const FAUCET_SAFE_FAILURE = "Faucet temporarily unavailable. Try again later.";

export type FaucetSigner = {
  address: `0x${string}`;
  getChainId(): Promise<number>;
  getBalance(): Promise<bigint>;
  sendGen(destination: `0x${string}`, value: bigint): Promise<`0x${string}`>;
};

export type FaucetDeps = {
  privateKey?: string;
  minReserveGen?: string;
  createSigner(privateKey: `0x${string}`): FaucetSigner;
};

export type FaucetResult = {
  status: number;
  body: {
    ok: boolean;
    code: "SUCCESS" | "INVALID_ADDRESS" | "UNAVAILABLE";
    message: string;
    txHash?: `0x${string}`;
  };
};

export function isValidFaucetAddress(value: unknown): value is `0x${string}` {
  return typeof value === "string" && isAddress(value, { strict: true });
}

export function isValidFaucetPrivateKey(value: unknown): value is `0x${string}` {
  return typeof value === "string" && /^0x[a-fA-F0-9]{64}$/.test(value);
}

export function parseMinimumReserve(value: string | undefined): bigint {
  const raw = value?.trim() || FAUCET_DEFAULT_MIN_RESERVE_GEN;
  if (!/^\d+(?:\.\d{1,18})?$/.test(raw)) throw new Error("Invalid faucet reserve configuration.");
  return parseEther(raw);
}

export function isTransactionHash(value: unknown): value is `0x${string}` {
  return typeof value === "string" && /^0x[a-fA-F0-9]{64}$/.test(value);
}

function unavailable(): FaucetResult {
  return { status: 503, body: { ok: false, code: "UNAVAILABLE", message: FAUCET_SAFE_FAILURE } };
}

export async function executeFaucetRequest(destination: unknown, deps: FaucetDeps): Promise<FaucetResult> {
  if (!isValidFaucetAddress(destination)) {
    return { status: 400, body: { ok: false, code: "INVALID_ADDRESS", message: "Invalid wallet address." } };
  }
  if (!isValidFaucetPrivateKey(deps.privateKey)) return unavailable();

  try {
    const signer = deps.createSigner(deps.privateKey);
    if (await signer.getChainId() !== FAUCET_CHAIN_ID) throw new Error("Faucet RPC is on the wrong chain.");

    const reserve = parseMinimumReserve(deps.minReserveGen);
    const balance = await signer.getBalance();
    if (balance < FAUCET_AMOUNT_WEI + reserve) throw new Error("Faucet balance is below its protected reserve.");

    const destinationAddress = destination.toLowerCase() as `0x${string}`;
    const txHash = await signer.sendGen(destinationAddress, FAUCET_AMOUNT_WEI);
    if (!isTransactionHash(txHash)) throw new Error("Faucet signer returned an invalid transaction hash.");

    return {
      status: 200,
      body: {
        ok: true,
        code: "SUCCESS",
        message: "1 test GEN sent",
        txHash,
      },
    };
  } catch {
    return unavailable();
  }
}

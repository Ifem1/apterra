import { createHash, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { executeFaucetRequest, getFaucetStatus, FAUCET_SAFE_FAILURE } from "@/lib/faucet";
import { createStudioDevFaucetSigner, createUpstashFaucetStore } from "@/server/faucet-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function storage() {
  return createUpstashFaucetStore(
    process.env.UPSTASH_REDIS_REST_URL,
    process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

function safeUnavailable() {
  return NextResponse.json(
    { ok: false, code: "UNAVAILABLE", message: FAUCET_SAFE_FAILURE },
    { status: 503 },
  );
}

function requestRateKey(request: NextRequest) {
  const forwarded = request.headers.get("x-vercel-forwarded-for")
    ?? request.headers.get("x-forwarded-for")
    ?? "unknown";
  const client = forwarded.split(",", 1)[0]?.trim().slice(0, 128) || "unknown";
  return createHash("sha256").update(client).digest("hex").slice(0, 32);
}

export async function GET(request: NextRequest) {
  try {
    const result = await getFaucetStatus(request.nextUrl.searchParams.get("address"), storage());
    return NextResponse.json(result.body, { status: result.status });
  } catch {
    return safeUnavailable();
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { address?: unknown };
    const result = await executeFaucetRequest(body.address, {
      store: storage(),
      // Read only during this request. This value is never exported, logged, or returned.
      privateKey: process.env.APTERRA_FAUCET_PRIVATE_KEY,
      minReserveGen: process.env.APTERRA_FAUCET_MIN_RESERVE_GEN,
      requestKey: requestRateKey(request),
      createSigner: createStudioDevFaucetSigner,
      token: randomUUID,
    });
    return NextResponse.json(result.body, { status: result.status });
  } catch {
    return safeUnavailable();
  }
}

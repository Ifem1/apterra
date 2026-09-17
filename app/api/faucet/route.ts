import { NextRequest, NextResponse } from "next/server";
import { executeFaucetRequest, FAUCET_SAFE_FAILURE } from "@/lib/faucet";
import { createStudioDevFaucetSigner } from "@/server/faucet-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeUnavailable() {
  return NextResponse.json(
    { ok: false, code: "UNAVAILABLE", message: FAUCET_SAFE_FAILURE },
    { status: 503 },
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { address?: unknown };
    const result = await executeFaucetRequest(body.address, {
      // Read only during this request. This value is never exported, logged, or returned.
      privateKey: process.env.APTERRA_FAUCET_PRIVATE_KEY,
      minReserveGen: process.env.APTERRA_FAUCET_MIN_RESERVE_GEN,
      createSigner: createStudioDevFaucetSigner,
    });
    return NextResponse.json(result.body, { status: result.status });
  } catch {
    return safeUnavailable();
  }
}

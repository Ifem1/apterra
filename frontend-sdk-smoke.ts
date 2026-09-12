import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

// Gate 0 compile-only proof: reads use an account-free client and writes will
// later use a wallet-backed client for this same chain definition.
export const readClient = createClient({ chain: studionet });

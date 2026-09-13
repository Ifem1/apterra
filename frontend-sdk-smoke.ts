import { createClient } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";

// Studio Dev preview only: reads use an account-free client. Writes must use
// a wallet-backed client configured for this exact chain definition.
export const readClient = createClient({ chain: studioDevnet });

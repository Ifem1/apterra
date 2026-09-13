# APTERRA

APTERRA is capability underwriting for AI agents: it makes an exact agent version prove what it can do before it receives bounded, expiring authority.

The Phase 1 product is deliberately limited to one GenLayer-native refund-authority workflow. It does not contain any cross-chain, token, custody, or external-settlement code.

## Current target and verification state

- Only live target: GenLayer Studio Dev preview, chain ID `61997` (`0xf22d`), RPC `https://studio-dev.genlayer.com/api`, explorer [explorer-studio-dev.genlayer.com](https://explorer-studio-dev.genlayer.com).
- The JS SDK's `studioDevnet` definition and the RPC-reported chain ID have been checked. Corrected Gate 0 deployment smoke remains pending; see [foundation report](docs/GATE_0_FOUNDATION_REPORT.md).
- RC pins and unresolved runner artifact are recorded in [toolchain](docs/TOOLCHAIN.md).
- Frozen behavior and trust boundaries: [architecture](docs/ARCHITECTURE.md), [trust model](docs/TRUST_MODEL.md), and [risk policy](docs/RISK_POLICY.md).

The implementation beyond this baseline is gate-driven. A result is never claimed as live unless its real contract transaction and evidence are available.

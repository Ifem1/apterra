# APTERRA

APTERRA is capability underwriting for AI agents: it makes an exact agent version prove what it can do before it receives bounded, expiring authority.

The Phase 1 product is deliberately limited to one GenLayer-native refund-authority workflow. It does not contain any cross-chain, token, custody, or external-settlement code.

## Verified baseline

- Target: stable GenLayer Studionet, chain ID `61999`.
- Gate 0 verification: [foundation report](docs/GATE_0_FOUNDATION_REPORT.md).
- Frozen behavior and trust boundaries: [architecture](docs/ARCHITECTURE.md), [trust model](docs/TRUST_MODEL.md), and [risk policy](docs/RISK_POLICY.md).

The implementation beyond this baseline is gate-driven. A result is never claimed as live unless its real contract transaction and evidence are available.

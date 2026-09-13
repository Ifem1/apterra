# Testing and verification

## Local checks

Run `npm run lint`, `npm run typecheck`, and `npm run build` for the console and release guard. The current `lint` script ESLint-checks the Studio Dev-only release guard and runs the TypeScript typecheck; it does not claim a full TSX ESLint pass. `next build` currently reports that the optional Next ESLint plugin is not configured. Run `python -m pytest -q test/test_harness.py test/test_underwriting_pure.py` for offline harness checks plus the contract's AST-extracted deterministic findings functions. These do not emulate GenVM. The GenLayer direct suite is `python -m pytest -q`; it must execute against the pinned RC runner and must not be replaced by a network test.

The direct suite covers lifecycle/access control, commitment and evidence validation, canonical verdict mapping, malformed findings, warrant replacement/suspension/revocation, amount limits, expiry, and nonce replay. Authored tests are not evidence of a passing run: check [Gate 0 Foundation Report](GATE_0_FOUNDATION_REPORT.md) for the observed blocker and exact completed runs.

## Studio Dev verification

Use only CLI preset `studio-dev`, SDK chain `studioDevnet`, RPC `https://studio-dev.genlayer.com/api`, chain ID `61997`. Verify deployment, finalized writes, and canonical readback against explorer `https://explorer-studio-dev.genlayer.com`. Record transaction hashes, finality, and readback in [Live Evidence](LIVE_EVIDENCE.md). Local tests, AST lint, mocked providers, and direct calls do not prove consensus execution.

## Current boundary

The required GenVM runner artifact is not yet resolved in the current Windows environment; the contract direct suite and deployment smoke therefore remain incomplete. See the foundation report. Do not mark Gates 0–4 passed until each gate's required tests and real-network checks have completed.

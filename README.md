# APTERRA

APTERRA is capability underwriting for AI agents: a specifically configured agent version is challenged against an immutable policy and evidence record before it receives narrow, expiring authority. The product is not a leaderboard, generic safety badge, identity registry, custodial escrow, token, or refund processor.

## Current release state

The current codebase has a refund-policy v4.2 vertical slice. It binds provider/model/version metadata; commits a challenge digest before a separate owner-only reveal; preserves and verifies the challenge preimage across browser refresh; rejects changed or early evidence; applies deterministic CERTIFY/LIMIT/DENY/INCONCLUSIVE mapping; maintains warrant history; enforces a distinct one-use human approval for an above-$100 LIMIT action; and records an allowed sandbox adapter operation only after rechecking live contract authority. The sandbox action moves no funds.

The canonical Phase 1 v1 lifecycle is complete on Studio Dev preview. A specifically configured RefundBot v1 was challenged, evidence was committed, GenLayer returned a deterministic DENY, and the downstream $600 sandbox action failed closed with no authority or adapter receipt persisted. The harness remains disclosed/operator-trusted rather than attested; v2 is optional follow-on evidence and was not executed for this submission.

Live contract: `0xfDB7f4C28F157662133dF51B5a864BDa3F4B7060` on Studio Next / Studio Dev preview (chain `61997`). Explorer: https://explorer-studio-dev.genlayer.com/address/0xfDB7f4C28F157662133dF51B5a864BDa3F4B7060. Frontend: https://apterra.vercel.app/

The authoritative status for every requirement is [the requirements and evidence ledger](docs/REQUIREMENTS_MATRIX.md). See [architecture](docs/ARCHITECTURE.md), [frozen risk policy](docs/RISK_POLICY.md), [trust model](docs/TRUST_MODEL.md), and [toolchain](docs/TOOLCHAIN.md). The available sources are the [rebuilt compendium PDF](../../APTERRA_MASTER_COMPENDIUM_REBUILT.pdf) and the [original editable compendium DOCX](../../APTERRA_MASTER_COMPENDIUM_EDITABLE.docx); an original PDF is not present in the workspace.

## Required network

Live evidence may use only GenLayer Studio Dev preview: chain `61997` / `0xf22d`, RPC `https://studio-dev.genlayer.com/api`, explorer `https://explorer-studio-dev.genlayer.com`, CLI `studio-dev`, SDK chain `studioDevnet`. This preview may reset. Never substitute Studionet 61999 or a local simulator for live evidence.

## Local verification

See [testing instructions](docs/TESTING.md). Exact Node and Python/GenLayer RC pins are committed in `package-lock.json` and `requirements-ci.txt`; CI uses `.github/workflows/ci.yml`. No deployment or wallet transaction should be made until the owner reviews and signs the exact transaction proposal. The account key is never stored in this repository.

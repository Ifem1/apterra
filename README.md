# APTERRA

APTERRA is capability underwriting for AI agents: a specifically configured agent version is challenged against an immutable policy and evidence record before it receives narrow, expiring authority. The product is not a leaderboard, generic safety badge, identity registry, custodial escrow, token, or refund processor.

## Current implementation checkpoint

The current codebase has a refund-policy v4.2 vertical slice. It now binds provider/model/version metadata; commits a challenge digest before a separate owner-only reveal; rejects changed or early evidence; applies deterministic CERTIFY/LIMIT/DENY/INCONCLUSIVE mapping; maintains warrant history; enforces a distinct one-use human approval for an above-$100 LIMIT action; and records an allowed sandbox adapter operation only after rechecking live contract authority. The sandbox action moves no funds.

This vertical slice is not the complete rebuilt compendium product and is not 5/5-ready. Challenge variants remain a small public fixture catalog, the harness is disclosed/operator-trusted rather than attested, broader capability/policy profiles are missing, full browser lifecycle and accessibility testing remain incomplete, and there is no APTERRA Studio Dev deployment or public production frontend.

The authoritative status for every requirement is [the requirements and evidence ledger](docs/REQUIREMENTS_MATRIX.md). See [architecture](docs/ARCHITECTURE.md), [frozen risk policy](docs/RISK_POLICY.md), [trust model](docs/TRUST_MODEL.md), and [toolchain](docs/TOOLCHAIN.md). The supplied original editable compendium and rebuilt PDF are identified in the ledger; an original PDF was not present in the supplied files.

## Required network

Live evidence may use only GenLayer Studio Dev preview: chain `61997` / `0xf22d`, RPC `https://studio-dev.genlayer.com/api`, explorer `https://explorer-studio-dev.genlayer.com`, CLI `studio-dev`, SDK chain `studioDevnet`. This preview may reset. Never substitute Studionet 61999 or a local simulator for live evidence.

## Local verification

See [testing instructions](docs/TESTING.md). Exact Node and Python/GenLayer RC pins are committed in `package-lock.json` and `requirements-ci.txt`; CI uses `.github/workflows/ci.yml`. No deployment or wallet transaction should be made until the owner reviews and signs the exact transaction proposal. The account key is never stored in this repository.

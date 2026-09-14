# Gate 0 — Foundation / Studio Dev Environment

**Status: PARTIAL.** The pinned RC tooling and Windows direct-mode path are operational. Contract validation/schema/direct tests have passed on the working implementation. The required Studio Dev deployment/read/write/finality smoke is not run: there is no APTERRA contract address or deployment transaction, and the owner must inspect/sign the exact live deployment proposal before submission.

## Pinned environment

| Component | Verified value |
|---|---|
| CLI | `genlayer@0.40.0-rc.3`, installed as project-local dev dependency; use `node_modules/.bin/genlayer.cmd` on Windows |
| JS SDK | `genlayer-js@2.0.0-rc.1`, chain `studioDevnet` |
| Python SDK | `genlayer-py==0.19.0rc2` |
| Direct tests | `genlayer-test==0.30.0rc2` |
| Linter | `genvm-linter==0.11.1rc2` |
| GenVM bundle | Official `v0.6.0-rc5`, exact contract/std-library hashes recorded in [TOOLCHAIN](TOOLCHAIN.md) |
| Target | `studio-dev`; `https://studio-dev.genlayer.com/api`; chain `61997` / `0xf22d`; explorer `https://explorer-studio-dev.genlayer.com` |
| Local runtimes | Node `24.16.0`, npm `11.13.0`, Python `3.12.10`; unchanged |

`studio-next`, if available, is an alias for this same Studio Dev preview only. It is never a relabelled stable Studionet environment.

## Published CLI package check

The published `genlayer@0.40.0-rc.3` npm tarball was packed and inspected once. `package/dist/index.js`, the declared executable target, is present. No incomplete-package finding was confirmed, so the official source-repository fallback was not used. A previously broken global installation is not relied on; subsequent commands use the local Windows shim. Do not repeatedly reinstall the global CLI.

## Windows direct-suite path

The pinned `genlayer-test==0.30.0rc2` direct runner works on Windows with the narrow test-only stdin tempfile/timestamp shim in `test/conftest.py`, the official RC5 runner staged under ignored `.tooling`, and workspace-local test cache:

```powershell
$env:GENVM_PREBUILT_DIR = Join-Path (Get-Location) '.tooling\genvm-v0.6.0-rc5'
$env:USERPROFILE = Join-Path (Get-Location) '.tooling\gltest-user'
$env:PYTHONIOENCODING = 'utf-8'
python -m pytest -q --tb=short
```

Observed result after challenge commit/reveal, provider-bound evidence schema, human approval, sandbox adapter, version catalog, warrant-history/revocation, and strict evidence/challenge-schema regressions: **57 passed in 9.32s** on clean clone `ec59c8f24255a707eef4df4c5485c659c3c8d6f3` using `python -m pytest -q --tb=short`. It is direct-mode execution with semantic response mocks, not live consensus proof.

`genvm-lint check contracts/apterra.py --json` passed (3 lint checks and SDK validation; 25 methods: 11 writes and 14 views); schema extraction and SDK typecheck passed. The linter emitted a Windows `WinError 10013` warning while attempting to query GitHub for newest runner metadata, then correctly used the explicitly pinned local v0.6.0-rc5 bundle. Typecheck requires `$env:PYTHONIOENCODING='utf-8'` in this Windows console.

## Network/account/deployment observations

On 2026-09-14 the project-local CLI (`node_modules/.bin/genlayer.cmd`, version `0.40.0-rc.3`) reported active `studio-dev`, chain `61997`, and RPC `https://studio-dev.genlayer.com/api`. A read-only JSON-RPC `eth_chainId` request to that canonical RPC returned `0xf22d`. CLI account list/show confirmed the existing active `redress-deployer` at `0xd6423ae82a975d55c6ceac222827a727325e0459`, unlocked, balance `200 GEN` on `studio-dev`/61997. No key was read or exported. This is a fresh balance observation, but it is not a fee quote or authorization to submit. Re-read `eth_chainId`, balance, and an operation-specific fee quote immediately before any later deployment/write session.

Latest contract-bearing candidate: commit `ec59c8f24255a707eef4df4c5485c659c3c8d6f3`, unchanged in `089836c0c9cde3eb3fbdfc1c21a695277351197d`. Latest reviewed candidate also verifies a local challenge preimage against canonical assignment claim/challenge/executor/digest before allowing reveal, clears verification when bound form inputs change, and rechecks active wallet address/network before fee preparation and again before wallet submission. Contract source SHA-256 is `34b995a9b0b5b9b75bb2f29bb5793eae213171a1c26026e4cbd8d4ca903121eb`; schema reports zero constructor parameters. No deployment proposal has been opened because full Phase 1 scope and end-to-end acceptance are not yet complete. Therefore there is no current deployment fee quote and no signature request.

| Gate 0 action | Result |
|---|---|
| `studio-dev` CLI preset / canonical RPC / chain ID | PASS read-only: CLI reports chain 61997/RPC; direct `eth_chainId` returned `0xf22d` on 2026-09-14 |
| Account use/unlock / current balance | PASS read-only readiness: designated existing active account `redress-deployer`, 200 GEN, already unlocked; no account switch or key access |
| Contract lint, SDK validation, schema, typecheck | PASS on clean clone `5c66f49d5f040b307d836478a9c50bfccd19f839`; pinned v0.6.0-rc5 bundle; SDK validation passed with official metadata access |
| Windows direct test suite | PASS, 57 tests in 9.45s on clean clone `089836c0c9cde3eb3fbdfc1c21a695277351197d` |
| Deploy APTERRA to 61997 | NOT RUN; no address/transaction |
| Read/deploy state, deterministic write, post-write read, fees/finality | NOT RUN |
| Live semantic underwriting | NOT RUN |

No wallet key was accessed, printed, committed or transmitted. No deployment/write has been submitted. A prior 61999 Studionet smoke is superseded historical evidence only; it is excluded from Gate 0 acceptance.

## Gate decision

Gate 0 is not complete until final-source lint/schema/direct tests pass, the exact deployment proposal is reviewed and signed by the owner, and the same Studio Dev deployment transaction reaches finality with `FINISHED_WITH_RETURN` plus canonical source/schema/readback verification. The requirements ledger is authoritative for current overall status.

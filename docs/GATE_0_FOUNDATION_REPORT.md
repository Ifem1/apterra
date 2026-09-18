# Gate 0 — Foundation / Studio Dev Environment

> **Historical pre-deployment checkpoint.** This report preserves the state before APTERRA's canonical Studio Dev deployment and public frontend. Current deployment/lifecycle evidence is in [LIVE_EVIDENCE](LIVE_EVIDENCE.md) and [REQUIREMENTS_MATRIX](REQUIREMENTS_MATRIX.md).

**Historical status at this checkpoint: PARTIAL.** The pinned RC tooling and Windows direct-mode path are operational. Contract validation/schema/direct tests have passed on the working implementation. The required Studio Dev deployment/read/write/finality smoke is not run: there is no APTERRA contract address or deployment transaction, and the owner must inspect/sign the exact live deployment proposal before submission.

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

The pinned `genlayer-test==0.30.0rc2` direct runner works on Windows with the narrow test-only stdin tempfile/timestamp shim in `test/conftest.py`, the official RC5 runner staged under ignored `.tooling`, and a short temp-profile test cache:

```powershell
$env:GENVM_PREBUILT_DIR = Join-Path (Get-Location) '.tooling\genvm-v0.6.0-rc5'
$env:USERPROFILE = Join-Path $env:TEMP 'apta'
$env:PYTHONIOENCODING = 'utf-8'
python -m pytest -q --tb=short
```

At schema-v3 code commit `72f89d48e8f0f921a0b87d8c506bb9cc40bb8ea2`, the exact command `python -m pytest -q --tb=short` returned **58 passed in 27.05s** in a fresh Windows clean clone with the variables above. An earlier attempt without an isolated temp `USERPROFILE` failed during runner-cache extraction because the default protected user cache was inaccessible; the short temp-profile path is the successful one. This is direct-mode execution with semantic response fixtures, not live consensus proof. GitHub Actions run `34855094116` also passed the pinned direct suite on a clean hosted checkout. The latest test binds evidence `agent_ref` to the registered immutable version.

`genvm-lint check contracts/apterra.py --json` passed (3 lint checks and SDK validation; 25 methods: 11 writes and 14 views); schema extraction and SDK typecheck passed. The linter emitted a Windows `WinError 10013` warning while attempting to query GitHub for newest runner metadata, then correctly used the explicitly pinned local v0.6.0-rc5 bundle. Typecheck requires `$env:PYTHONIOENCODING='utf-8'` in this Windows console.

## Network/account/deployment observations

On 2026-09-14 the project-local CLI (`node_modules/.bin/genlayer.cmd`, version `0.40.0-rc.3`) reported active `studio-dev`, chain `61997`, and RPC `https://studio-dev.genlayer.com/api`; a read-only JSON-RPC `eth_chainId` request to that endpoint returned `0xf22d`. In this continuation, CLI `network info` repeated the expected endpoint/chain and CLI account list showed the existing `redress-deployer` active and unlocked. The 200 GEN balance was read at an earlier checkpoint on that date and was not refreshed here; no key was read or exported. Re-read `eth_chainId`, current balance, and operation-specific fee quote immediately before any later deployment/write session.

Historical application source candidate: `72f89d48e8f0f921a0b87d8c506bb9cc40bb8ea2`. The fresh Windows clone at `apterra-verify-final-53973ce-20260914`, fast-forwarded to that exact code commit, passed `npm ci` (503 locked packages), lint/typecheck, **15 frontend tests**, production build, **58 direct tests in 27.05s**, GenVM check (3 lint checks + SDK validation), SDK typecheck, and schema (25 methods: 14 views, 11 writes). GitHub Actions run [34855094116](https://github.com/Ifem1/apterra/actions/runs/34855094116) passed all workflow steps and all 3 browser smoke cases. The local Playwright process reported its cases but did not exit cleanly. Local GenVM commands emitted Windows `WinError 10013` during latest-release metadata lookup and used the explicitly pinned RC5 cache. Current source hashes are in [TOOLCHAIN](TOOLCHAIN.md). There is no deployment proposal, fresh fee quote, or signature request because the artifact is not yet product-complete and owner approval is required.

| Gate 0 action | Result |
|---|---|
| `studio-dev` CLI preset / canonical RPC / chain ID | PASS read-only: project-local RC CLI reports chain 61997/RPC; independent direct `eth_chainId` returned `0xf22d` on 2026-09-14 |
| Account use/unlock / balance | PARTIAL: designated `redress-deployer` remains active/unlocked by CLI account list; historical 200 GEN observation was not refreshed in this continuation, and no fee quote was obtained |
| Contract lint, SDK validation, schema, typecheck | PASS in manual clone `72f89d4` and GitHub run `34855094116`; pinned v0.6.0-rc5 bundle; 3 lint checks + SDK validation, 25-method schema and no SDK type errors |
| Direct test suite | PASS in clean clone `72f89d4`: 58 passed in 27.05s; CI run `34855094116`: 58 passed. All use pinned RC2 runner, GenVM RC5 |
| Deploy APTERRA to 61997 | NOT RUN; no address/transaction |
| Read/deploy state, deterministic write, post-write read, fees/finality | NOT RUN |
| Live semantic underwriting | NOT RUN |

No wallet key was accessed, printed, committed or transmitted. No deployment/write has been submitted. A prior 61999 Studionet smoke is superseded historical evidence only; it is excluded from Gate 0 acceptance.

## Gate decision

This gate decision applied to the pre-deployment checkpoint above. The canonical Studio Dev deployment and later live v1 lifecycle now supersede its deployment-status gaps; the requirements ledger and live-evidence record are authoritative for current status.

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

The pinned `genlayer-test==0.30.0rc2` direct runner works on Windows with the narrow test-only stdin tempfile/timestamp shim in `test/conftest.py`, the official RC5 runner staged under ignored `.tooling`, and a short temp-profile test cache:

```powershell
$env:GENVM_PREBUILT_DIR = Join-Path (Get-Location) '.tooling\genvm-v0.6.0-rc5'
$env:USERPROFILE = Join-Path $env:TEMP 'apta'
$env:PYTHONIOENCODING = 'utf-8'
python -m pytest -q --tb=short
```

At source commit `128440f1332334d149c4bc4a215f2f12a0588e2a`, the exact command `python -m pytest -q --tb=short` returned **57 passed in 11.64s** on Windows with the variables above. An earlier attempt without an isolated temp `USERPROFILE` failed during runner-cache extraction because the default protected user cache was inaccessible; the short temp-profile path is the successful one. This is direct-mode execution with semantic response fixtures, not live consensus proof. GitHub Actions run `34850126835` also passed the pinned direct suite (57 tests in 25.58s) on a clean hosted checkout after fixing two earlier workflow issues: an incorrect extracted-cache path, then a Linux test-collection import scope.

`genvm-lint check contracts/apterra.py --json` passed (3 lint checks and SDK validation; 25 methods: 11 writes and 14 views); schema extraction and SDK typecheck passed. The linter emitted a Windows `WinError 10013` warning while attempting to query GitHub for newest runner metadata, then correctly used the explicitly pinned local v0.6.0-rc5 bundle. Typecheck requires `$env:PYTHONIOENCODING='utf-8'` in this Windows console.

## Network/account/deployment observations

On 2026-09-14 the project-local CLI (`node_modules/.bin/genlayer.cmd`, version `0.40.0-rc.3`) reported active `studio-dev`, chain `61997`, and RPC `https://studio-dev.genlayer.com/api`; a read-only JSON-RPC `eth_chainId` request to that endpoint returned `0xf22d`. In this continuation, CLI `network info` repeated the expected endpoint/chain and CLI account list showed the existing `redress-deployer` active and unlocked. The 200 GEN balance was read at an earlier checkpoint on that date and was not refreshed here; no key was read or exported. Re-read `eth_chainId`, current balance, and operation-specific fee quote immediately before any later deployment/write session.

Current pushed code candidate: `128440f1332334d149c4bc4a215f2f12a0588e2a`. It includes the on-chain agent-version catalog detail UI and portable direct-test clock synchronization. Frontend lint/typecheck, **13 frontend unit tests**, production build, and Windows direct suite (**57 passed in 11.64s**) passed locally. Three browser smoke cases reported passed locally, but the Windows Playwright process did not shut down cleanly. GitHub Actions run [34850126835](https://github.com/Ifem1/apterra/actions/runs/34850126835) passed the clean GitHub checkout: 13 frontend tests; 3 Chromium smoke tests; production build; GenVM check (3 lint checks plus SDK validation, 25 methods); SDK typecheck; schema extraction (25 methods: 14 views, 11 writes); and 57 direct tests in 25.58s. Exact source hashes are in [TOOLCHAIN](TOOLCHAIN.md). Contract SHA-256 remains `34b995a9b0b5b9b75bb2f29bb5793eae213171a1c26026e4cbd8d4ca903121eb`. The earlier manual clean-clone check at `8e753553b51b1e7de755390ecf61534ba49341b8` is historical and is not a manual clean-clone verification of this candidate. The candidate has no deployment proposal because full Phase 1 scope and end-to-end acceptance are not ready. There is no current deployment fee quote and no signature request.

| Gate 0 action | Result |
|---|---|
| `studio-dev` CLI preset / canonical RPC / chain ID | PASS read-only: project-local RC CLI reports chain 61997/RPC; independent direct `eth_chainId` returned `0xf22d` on 2026-09-14 |
| Account use/unlock / balance | PARTIAL: designated `redress-deployer` remains active/unlocked by CLI account list; historical 200 GEN observation was not refreshed in this continuation, and no fee quote was obtained |
| Contract lint, SDK validation, schema, typecheck | PASS at `128440f` in GitHub run `34850126835`; pinned v0.6.0-rc5 bundle; 3 lint checks + SDK validation, 25-method schema and no SDK type errors |
| Windows direct test suite | PASS locally at `128440f`: 57 passed in 11.64s using the pinned RC2 runner, GenVM RC5 and short temp profile; CI clean-checkout run passed 57 in 25.58s |
| Deploy APTERRA to 61997 | NOT RUN; no address/transaction |
| Read/deploy state, deterministic write, post-write read, fees/finality | NOT RUN |
| Live semantic underwriting | NOT RUN |

No wallet key was accessed, printed, committed or transmitted. No deployment/write has been submitted. A prior 61999 Studionet smoke is superseded historical evidence only; it is excluded from Gate 0 acceptance.

## Gate decision

Gate 0 is not complete until final-source lint/schema/direct tests pass, the exact deployment proposal is reviewed and signed by the owner, and the same Studio Dev deployment transaction reaches finality with `FINISHED_WITH_RETURN` plus canonical source/schema/readback verification. The requirements ledger is authoritative for current overall status.

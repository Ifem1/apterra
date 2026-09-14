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

Observed result after challenge commit/reveal, provider-bound evidence schema, human approval, sandbox adapter, version catalog and warrant-history/revocation regressions: **50 passed in 19.39s** using `python -m pytest -vv -q --tb=short`. It is direct-mode execution with semantic response mocks, not live consensus proof.

`genvm-lint check contracts/apterra.py --json` passed (3 lint checks and SDK validation; 25 methods: 11 writes and 14 views); schema extraction and SDK typecheck passed. The linter emitted a Windows `WinError 10013` warning while attempting to query GitHub for newest runner metadata, then correctly used the explicitly pinned local v0.6.0-rc5 bundle. Typecheck requires `$env:PYTHONIOENCODING='utf-8'` in this Windows console.

## Network/account/deployment observations

The configured Studio Dev chain/RPC and `studioDevnet` preset were successfully verified at a prior read-only checkpoint. The public deployer address recorded previously was `0xD6423aE82a975d55C6CeaC222827A727325e0459`; a prior balance read was 200 GEN. Both observations are historical only and must not be treated as a current balance or live fee quote. Re-read chain, balance, and an operation-specific fee quote immediately before preparing a deployment/write proposal.

| Gate 0 action | Result |
|---|---|
| `studio-dev` CLI preset / canonical RPC / chain ID | Previously verified read-only; must refresh in deployment preflight |
| Account use/unlock / current balance | Historical account known; fresh readiness read not performed for this candidate |
| Contract lint, SDK validation, schema, typecheck | PASS on the current working tree; pinned v0.6.0-rc5 bundle |
| Windows direct test suite | PASS, 50 tests in 19.39s on the current working tree |
| Deploy APTERRA to 61997 | NOT RUN; no address/transaction |
| Read/deploy state, deterministic write, post-write read, fees/finality | NOT RUN |
| Live semantic underwriting | NOT RUN |

No wallet key was accessed, printed, committed or transmitted. No deployment/write has been submitted. A prior 61999 Studionet smoke is superseded historical evidence only; it is excluded from Gate 0 acceptance.

## Gate decision

Gate 0 is not complete until final-source lint/schema/direct tests pass, the exact deployment proposal is reviewed and signed by the owner, and the same Studio Dev deployment transaction reaches finality with `FINISHED_WITH_RETURN` plus canonical source/schema/readback verification. The requirements ledger is authoritative for current overall status.

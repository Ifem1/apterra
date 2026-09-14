# Gate 0 — Foundation / Environment

**Status: PARTIAL — Studio Dev/account and pinned RC tooling verified; contract lint, SDK validation, typecheck, schema extraction, and the complete Windows direct-mode suite pass. Live deployment smoke remains unrun pending owner approval of the exact transaction.**

Observed 2026-09-13. Studio Dev preview addresses and transactions must always be treated as ephemeral.

## Target and installed toolchain

| Item | Value | Result |
| --- | --- | --- |
| Network | Agent Tank / GenLayer Studio Dev preview | Required target; no stable fallback used |
| CLI alias | `studio-dev` | Project-local CLI `network list` / `network info` returned the built-in preset |
| Chain ID | `61997` / `0xf22d` | RPC `eth_chainId` returned 61997 during this checkpoint |
| RPC | `https://studio-dev.genlayer.com/api` | Read-only balance/chain request succeeded |
| Explorer | `https://explorer-studio-dev.genlayer.com` | Canonical preview explorer |
| CLI | `genlayer@0.40.0-rc.3` | Local `node_modules/.bin/genlayer.cmd`; exact dependency pin |
| JS SDK | `genlayer-js@2.0.0-rc.1` | Installed; `studioDevnet` chain URL inspected |
| Python SDK | `genlayer-py==0.19.0rc2` | Installed |
| Test tooling | `genlayer-test==0.30.0rc2` | Installed; exact RC5 runner bundle staged under ignored `.tooling` for direct setup |
| Linter | `genvm-linter==0.11.1rc2` | Installed; `check`, SDK typecheck, and schema commands now run |
| Node / npm / Python | `v24.16.0` / `11.13.0` / `3.12.10` | Observed |

The manifest and lockfile pin `genlayer` exactly to `0.40.0-rc.3`, not a semver range. Use the project-local binary, not the broken global CLI.

## Account readiness (read-only)

The test private key supplied directly by the owner derives public address `0xD6423aE82a975d55C6CeaC222827A727325e0459`. It already matched CLI account `redress-deployer`; no account was created or imported. Per the owner's direction, that existing account was selected active and it showed unlocked. The secret was not written to the repository, report, terminal output, or Git, and it has not signed any transaction in this task. The Studio Dev RPC returned `0xad78ebc5ac6200000` wei-equivalent (`200 GEN`) on chain 61997.

## RC runner diagnostic and direct test status

- Required header in `contracts/apterra.py`: `py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng`.
- Expected standard library runner: `py-lib-genlayer-std:kzr02ndm9et4qkmbqpq5djjt5sme2yt76n7sz1qbzax0knt6mam0`.
- The exact official `genvm-universal-genlayerlabs-genvm-manager-v0.6.0-rc5.tar.xz` bundle is in the linter cache. Its index includes the contract's `py-genlayer:5jyc...` and stdlib `py-lib-genlayer-std:kzr...` artifacts; the entries were staged unmodified to ignored `.tooling/genvm-v0.6.0-rc5/runners/` and supplied through the direct runner's supported `GENVM_PREBUILT_DIR` path. No other runner/SDK family was substituted.
- `genvm-lint check contracts\apterra.py --json`: **PASS**, three lint checks and GenVM validation; loaded `ApterraUnderwriter`, 17 methods (10 views, 7 writes), no findings. `genvm-lint typecheck contracts\apterra.py` also **PASS** (no type errors; `PYTHONIOENCODING=utf-8` avoids a Windows console encoding crash on the checkmark). `genvm-lint schema contracts\apterra.py --json`: **PASS**, schema extracted with updated input/consumer/resource arguments. Network resolution warning remains because the runner cannot fetch GitHub latest metadata (`WinError 10013`); exact v0.6.0-rc5 local cache was used.
- The complete direct-mode suite now runs on Windows with `genlayer-test==0.30.0rc2`, the matching contract hashes, `GENVM_PREBUILT_DIR` set to the official RC5 runner staging, and a workspace-local test cache. A test-only `test/conftest.py` compatibility patch defers only the locked-stdin tempfile unlink until VM teardown (Windows forbids unlinking an open file; POSIX permits it) and synchronizes the direct runner's mocked timestamp after its `warp` helper. It does not replace contract execution, VM calls, consensus code, or assertions. Exact command: `$env:GENVM_PREBUILT_DIR=(Join-Path (Get-Location) '.tooling\\genvm-v0.6.0-rc5'); $env:USERPROFILE=(Join-Path (Get-Location) '.tooling\\gltest-user'); $env:PYTHONIOENCODING='utf-8'; python -m pytest -q --tb=short`. Latest result: **43 passed in 4.75s**.
- These direct tests execute contract methods in the pinned direct VM with mocked semantic outputs. They verify deterministic guards, finite verdict mapping, semantic-output validation, and retryable state after a model error. Direct mode does **not** emulate real validator consensus disagreement/atomic rollback; that lifecycle remains unverified pending live Studio Dev transactions and canonical readbacks.
- The published RC package tarball was inspected once and contains its declared `package/dist/index.js` target. The global installation remains unused.
- The package-local CLI tarball had previously been inspected once and contains its declared target `package/dist/index.js`; the global install is not used.

## Deployment smoke

The Studio Dev checks completed so far are limited to:

| Check | Result |
| --- | --- |
| CLI version and preset | PASS — CLI `0.40.0-rc.3`; `studio-dev` is current and resolves to the canonical RPC |
| SDK chain definition / RPC endpoint | PASS — `studioDevnet` points at the canonical Studio Dev RPC |
| RPC chain ID | PASS — `61997` |
| Account derivation / balance | PASS — public account returned 200 GEN |
| RC runner header artifact setup | PASS for pinned hash — resolved from the official v0.6.0-rc5 release bundle |
| Lint / schema / validate / SDK typecheck | PASS — `check`, `schema`, and `typecheck` all completed successfully |
| Deploy / read / deterministic write / post-write read | NOT RUN — exact deployment/write proposal awaits owner approval |
| Fee estimation / submission / decision / finalization | NOT RUN — no transaction was submitted |

No APTERRA Studio Dev contract address or transaction is claimed. Deployment, reads, deterministic write, fee estimation/submission and finality smoke are not yet run. Before any future deployment/write, the exact source hash, constructor, account, network identity, live fee quote, and expected state change must be presented for owner approval. The account balance check alone is not deployment approval.

## Superseded stable-environment smoke (historical only)

The following earlier baseline was on stable Studionet and is **not** an APTERRA Phase 1 deployment or proof. It must not be used as an active configuration:

- Chain 61999; RPC `https://studio.genlayer.com/api`; explorer `https://genlayer-explorer.vercel.app`.
- Smoke contract `0xE85e0e208Ce27186017F0fE3dA7B1C13B92e4149`, deploy transaction `0x0814d29de21db139150e5311ea1d570f02259db16303822e87ed9b728a965d0f`.
- Deterministic write transaction `0x4ef6482b2064e764c499b6c2fd173f743e20bd3d4621628ba2980a78687914da`; observed value changed from 0 to 7.
- Historical tooling was CLI 0.39.2 / JS SDK 1.1.8 / Python SDK 0.16.3 / test runner 0.29.2 and is not used for chain 61997.

## Gate decision

Gate 0 remains **PARTIAL** because the required live deployment/read/write/finality smoke has not run. Its tooling, network identity, account readiness, validation/schema, and direct-mode test components are operational. The Windows-specific direct-runner issue is handled by a narrow test-only compatibility shim; no WSL/Linux or stable network was used. Deployment and writes remain gated on presenting the exact proposal and receiving the owner's approval. Existing Gate 2–4 work is preserved and tested against the RC API.

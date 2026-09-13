# Gate 0 — Foundation / Environment

**Status: PARTIAL — Studio Dev network and funded test account verified; RC GenVM runner resolution and corrected deployment smoke remain incomplete.**

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
| Test tooling | `genlayer-test==0.30.0rc2` | Installed; requires pinned runner artifact before execution |
| Linter | `genvm-linter==0.11.1rc2` | Installed; AST lint runs |
| Node / npm / Python | `v24.16.0` / `11.13.0` / `3.12.10` | Observed |

The manifest and lockfile pin `genlayer` exactly to `0.40.0-rc.3`, not a semver range. Use the project-local binary, not the broken global CLI.

## Account readiness (read-only)

The test private key supplied directly by the owner derives public address `0xD6423aE82a975d55C6CeaC222827A727325e0459`. It already matched CLI account `redress-deployer`; no account was created or imported. Per the owner's direction, that existing account was selected active and it showed unlocked. The secret was not written to the repository, report, terminal output, or Git, and it has not signed any transaction in this task. The Studio Dev RPC returned `0xad78ebc5ac6200000` wei-equivalent (`200 GEN`) on chain 61997.

## RC runner diagnostic and direct test status

- Required header in `contracts/apterra.py`: `py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng`.
- Expected standard library runner: `py-lib-genlayer-std:kzr02ndm9et4qkmbqpq5djjt5sme2yt76n7sz1qbzax0knt6mam0`.
- `genvm-lint setup --contract contracts/apterra.py --json` failed before setup completed: Windows `WinError 5` trying to resolve/create the pinned runner directory under `%USERPROFILE%\.cache\genvm-linter\...\py-genlayer\5jyc...`. The visible cached manager tree has `1jb45...`, not the pinned `5jyc...`; it was not used as a substitute.
- `python -m pytest -q` on the direct contract cases was retried on Windows under `genlayer-test 0.30.0rc2`. The recorded run ended **10 failed, 0 passed**, all before contract loading while resolving the GenVM v0.6 RC bundle from GitHub (`WinError 10013`, network access denied). Current offline checks `python -m pytest -q test/test_harness.py test/test_underwriting_pure.py` pass **11/11** (five harness cases and six tests compiling only the source-defined deterministic findings functions; this is not a GenVM/direct-contract pass). A later combined direct run stalled repeating artifact resolution and was interrupted; it is not counted as a completed run. No WSL/Linux fallback was used.
- `genvm-lint lint contracts\apterra.py`: latest exit 0, three AST checks passed with no warnings. Input/access-control reverts use the RC's `gl.vm.UserError` API. This is not SDK semantic validation.
- The package-local CLI tarball had previously been inspected once and contains its declared target `package/dist/index.js`; the global install is not used.

## Deployment smoke

The Studio Dev checks completed so far are limited to:

| Check | Result |
| --- | --- |
| CLI version and preset | PASS — CLI `0.40.0-rc.3`; `studio-dev` is current and resolves to the canonical RPC |
| SDK chain definition / RPC endpoint | PASS — `studioDevnet` points at the canonical Studio Dev RPC |
| RPC chain ID | PASS — `61997` |
| Account derivation / balance | PASS — public account returned 200 GEN |
| RC runner header artifact setup | BLOCKED — pinned artifact cannot be resolved in this environment |
| Lint / schema / validate / SDK typecheck | INCOMPLETE — see above; no SDK setup pass |
| Deploy / read / deterministic write / post-write read | NOT RUN |
| Fee estimation / submission / decision / finalization | NOT RUN |

No Studio Dev contract address or transaction is claimed. Before any future deployment, the exact source hash, constructor, account, network identity, live fee quote, and consequences must be presented for owner approval. The account balance check alone is not deployment approval.

## Superseded stable-environment smoke (historical only)

The following earlier baseline was on stable Studionet and is **not** an APTERRA Phase 1 deployment or proof. It must not be used as an active configuration:

- Chain 61999; RPC `https://studio.genlayer.com/api`; explorer `https://genlayer-explorer.vercel.app`.
- Smoke contract `0xE85e0e208Ce27186017F0fE3dA7B1C13B92e4149`, deploy transaction `0x0814d29de21db139150e5311ea1d570f02259db16303822e87ed9b728a965d0f`.
- Deterministic write transaction `0x4ef6482b2064e764c499b6c2fd173f743e20bd3d4621628ba2980a78687914da`; observed value changed from 0 to 7.
- Historical tooling was CLI 0.39.2 / JS SDK 1.1.8 / Python SDK 0.16.3 / test runner 0.29.2 and is not used for chain 61997.

## Gate decision

Gate 0 is **not PASS**. Continue using Studio Dev only. The blocking dependency is obtaining and verifying the exact RC runner/header artifact in the current supported Windows environment. Separately, the required deployment smoke cannot be submitted until its exact transaction parameters are presented and approved by the owner. All existing Gate 2–4 source has been preserved while this prerequisite is addressed.

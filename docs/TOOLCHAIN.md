# Studio Dev Preview Toolchain

This project targets the Agent Tank / Studio Dev preview only. Release-critical packages are exact pins; stable Studionet packages are not substitutes.

| Component | Exact version / identity | Verification state |
| --- | --- | --- |
| Studio / consensus | `0.123.0-rc.6` / Consensus `v0.6 RC` | Target family from the supplied product specification; current deployed build not independently confirmed in this session |
| Network | CLI alias `studio-dev`; chain `61997` / `0xf22d` | Project-local CLI `network list` / `network info` and RPC returned chain 61997 on 2026-09-13 |
| RPC / explorer | `https://studio-dev.genlayer.com/api` / `https://explorer-studio-dev.genlayer.com` | SDK `studioDevnet` URL and RPC response verified; explorer target from canonical specification |
| CLI | `genlayer@0.40.0-rc.3` | Installed project-locally; use `node_modules/.bin/genlayer.cmd`; exact pin in package manifest/lock |
| JavaScript SDK | `genlayer-js@2.0.0-rc.1` | Installed and `studioDevnet` definition inspected |
| Python SDK | `genlayer-py==0.19.0rc2` | Installed |
| Direct test runner | `genlayer-test==0.30.0rc2` | Installed; test execution is blocked pending exact runner artifact resolution |
| Linter | `genvm-linter==0.11.1rc2` | Installed; AST lint runs, artifact-backed SDK setup does not complete |
| Required contract runner | `py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng` | Header pin per supplied spec; artifact was not found/downloadable by the current cache/network path |
| Required standard library runner | `py-lib-genlayer-std:kzr02ndm9et4qkmbqpq5djjt5sme2yt76n7sz1qbzax0knt6mam0` | Expected by supplied spec; not yet resolved/verified |
| Node / npm / Python | `v24.16.0` / `11.13.0` / `3.12.10` | Observed locally |
| Transaction Kit | None yet | Required package/revision availability still to be verified before frontend transaction implementation |

## Artifact diagnostic

`genvm-lint setup --contract contracts/apterra.py --json` returned `ok: false`; the linter attempted to resolve the `py-genlayer` header under its cache and failed with Windows `WinError 5` on `%USERPROFILE%\.cache\genvm-linter\extracted\genlayerlabs-genvm-manager-v0.6.0-rc5\py-genlayer\5jyc...`. The matching exact runner artifact is not present in the readable cached tree (which contains only `1jb45...`). Network access to GitHub is blocked (`WinError 10013`) even on the approved retry. The direct test runner's attempted download of `https://github.com/genlayerlabs/genvm-manager/releases/download/v0.6.0-rc3/genvm-runners-all.tar.xz` failed for the same reason. No stable runner was substituted.

## Network identities

- CLI preset: `studio-dev`
- JavaScript SDK chain: `studioDevnet`
- Python SDK chain: `studio_devnet`
- Canonical RPC: `https://studio-dev.genlayer.com/api`
- Chain ID: decimal `61997`, hex `0xf22d`
- Explorer: `https://explorer-studio-dev.genlayer.com`
- Studio Dev consensus addresses from local CLI `network info` on 2026-09-13: `0xb7278A61aa25c888815aFC32Ad3cC52fF24fE575` (main) and `0x88B0F18613Db92Bf970FfE264E02496e20a74D16` (data). Staking, fee manager, rounds storage and appeals are reported as not set.

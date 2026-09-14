# Studio Dev Preview Toolchain

The only supported live environment is the Agent Tank GenLayer Studio Dev preview, not stable Studionet. Keep a coherent pinned v0.6 RC family.

| Component | Exact pin / identity | Observed state |
|---|---|---|
| GenLayer CLI | `genlayer@0.40.0-rc.3` | Project-local dependency in `package.json`/lock; invoke `node_modules/.bin/genlayer.cmd` on Windows, never the broken global executable |
| GenLayer JS SDK | `genlayer-js@2.0.0-rc.1` | Exact lock pin; `studioDevnet` import in `src/lib/network.ts` |
| GenLayer Python SDK | `genlayer-py==0.19.0rc2` | Installed and pinned in `requirements-ci.txt` |
| Direct test runner | `genlayer-test==0.30.0rc2` | Installed and pinned; Windows direct suite ran successfully (48 tests at current working checkpoint) |
| GenVM linter | `genvm-linter==0.11.1rc2` | Installed and pinned; `check`, schema, and typecheck pass against the RC5 cache |
| GenVM runtime bundle | `v0.6.0-rc5`; contract runner hash `py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng`; standard library `py-lib-genlayer-std:kzr02ndm9et4qkmbqpq5djjt5sme2yt76n7sz1qbzax0knt6mam0` | Official pinned manager bundle staged under ignored `.tooling` and consumed by direct tests/linter |
| Studio / consensus | `0.123.0-rc.6` / Consensus v0.6 RC | Recorded as the preview family from official v0.6 guidance; Studio Dev preview state may reset |
| Node / npm / Python | Node `24.16.0`, npm `11.13.0`, Python `3.12.10` | Observed locally; unchanged |
| Frontend lint/browser tests | ESLint `9.21.0`, Next plugin `15.5.22`, TypeScript ESLint parser/plugin `8.70.0`, Playwright `1.62.0` | Exact Node dependency lock; browser setup still requires clean-exit rerun |

## Studio Dev identity

- CLI preset: `studio-dev`
- SDK chain: `studioDevnet`
- Python SDK chain name: `studio_devnet`
- RPC: `https://studio-dev.genlayer.com/api`
- Chain ID: decimal `61997`, hex `0xf22d`
- Explorer: `https://explorer-studio-dev.genlayer.com`
- `studio-next`, if exposed by a compatible CLI version, is only a CLI alias for this same preview. It is not a stable Studionet label.

Network identity was independently checked at the RC configuration checkpoint. Re-read RPC `eth_chainId` immediately before every deployment/write session; no historical address, fee quote or balance is current authorization. Never substitute Studionet 61999, Bradbury or a local simulator for live evidence.

## CLI package diagnostic and invocation

The published `genlayer@0.40.0-rc.3` tarball was inspected once; it contains the declared `package/dist/index.js` entry target. The earlier global install is not relied on. Use the workspace-local Windows command for subsequent CLI work:

```powershell
.\node_modules\.bin\genlayer.cmd --version
.\node_modules\.bin\genlayer.cmd network list
.\node_modules\.bin\genlayer.cmd network set studio-dev
.\node_modules\.bin\genlayer.cmd network info
```

This project does not use a mixed stable/RC package set. npm currently reports 16 advisories across the development dependency tree; inspect `npm audit` and resolve compatible advisories before declaring a release build clean. Do not run `npm audit fix --force` because it can change the pinned Next/GenLayer family.

## Runner/network warning

`genvm-lint check`, schema and typecheck each emitted a warning that this Windows environment cannot query GitHub for the latest GenVM manager release (`WinError 10013`). They completed with the locally staged, exact v0.6.0-rc5 runner: lint/SDK validation passed, schema extraction passed, SDK typecheck passed. The pinned direct runner is not substituted by stable versions. CI fetches the explicit `v0.6.0-rc5` bundle.

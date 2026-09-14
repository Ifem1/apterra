# Studio Dev Preview Toolchain

The only supported live environment is the Agent Tank GenLayer Studio Dev preview, not stable Studionet. Keep a coherent pinned v0.6 RC family.

| Component | Exact pin / identity | Observed state |
|---|---|---|
| GenLayer CLI | `genlayer@0.40.0-rc.3` | Project-local dependency in `package.json`/lock; invoke `node_modules/.bin/genlayer.cmd` on Windows, never the broken global executable |
| GenLayer JS SDK | `genlayer-js@2.0.0-rc.1` | Exact lock pin; `studioDevnet` import in `src/lib/network.ts` |
| GenLayer Python SDK | `genlayer-py==0.19.0rc2` | Installed and pinned in `requirements-ci.txt` |
| Direct test runner | `genlayer-test==0.30.0rc2` | Installed and pinned; latest contract-source run: 57 direct tests passed on Windows |
| GenVM linter | `genvm-linter==0.11.1rc2` | Installed and pinned; `check`, schema, and typecheck pass against the RC5 cache |
| GenVM runtime bundle | `v0.6.0-rc5`; contract runner hash `py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng`; standard library `py-lib-genlayer-std:kzr02ndm9et4qkmbqpq5djjt5sme2yt76n7sz1qbzax0knt6mam0` | Official pinned manager bundle staged under ignored `.tooling` and consumed by direct tests/linter |
| Studio / consensus | `0.123.0-rc.6` / Consensus v0.6 RC | Recorded as the preview family from official v0.6 guidance; Studio Dev preview state may reset |
| Node / npm / Python | Node `24.16.0`, npm `11.13.0`, Python `3.12.10` | Observed locally; unchanged |
| Frontend runtime/build | Next.js `15.5.25`, React/React DOM `19.1.0`, PostCSS override `8.5.23` | Exact lockfile; selected to remove current production advisories while staying on Next 15.5 |
| Frontend lint/browser tests | ESLint / `@eslint/js` `9.39.5`, Next plugin `15.5.25`, TypeScript ESLint parser/plugin `8.70.0`, Playwright `1.62.0` | Exact lockfile; UI unit suite 11/11 and clean-clone browser smoke 3/3; full wallet flow remains untested |

## Studio Dev identity

- CLI preset: `studio-dev`
- SDK chain: `studioDevnet`
- Python SDK chain name: `studio_devnet`
- RPC: `https://studio-dev.genlayer.com/api`
- Chain ID: decimal `61997`, hex `0xf22d`
- Explorer: `https://explorer-studio-dev.genlayer.com`
- `studio-next`, if exposed by a compatible CLI version, is only a CLI alias for this same preview. It is not a stable Studionet label.

On 2026-09-14 the local RC CLI reported this `studio-dev` preset and an independent read-only `eth_chainId` call returned `0xf22d`. The configured `redress-deployer` account was listed active and unlocked; no key was opened. Re-read balance and obtain a fresh operation-specific quote immediately before any proposed transaction.

Committed `.gitattributes` forces repository text to LF, preventing Windows checkout conversion from changing raw source hashes. At commit `cc6a35e339d0db1e8b2c75149747b51c84f7b217`, fresh-clone SHA-256 values are: contract `contracts/apterra.py` `34b995a9b0b5b9b75bb2f29bb5793eae213171a1c26026e4cbd8d4ca903121eb`; web entry `app/page.tsx` `aa421907bccaaebcfa02e3f152714d2ec5d09f39deb00b05bf6fe4b45219b738`; challenge helper `src/lib/challenge-draft.ts` `bc02821c4cc361c23dcd05ee7dc93e6751206bca7583ea4ec3a5378a4405a384`; lockfile `package-lock.json` `f55541f9e80750621433d2d501c3ac7c2ac3655fe7bc34b4ba2398184b680048`.

Network identity was independently checked at the RC configuration checkpoint. Re-read RPC `eth_chainId` immediately before every deployment/write session; no historical address, fee quote or balance is current authorization. Never substitute Studionet 61999, Bradbury or a local simulator for live evidence.

## CLI package diagnostic and invocation

The published `genlayer@0.40.0-rc.3` tarball was inspected once; it contains the declared `package/dist/index.js` entry target. The earlier global install is not relied on. Use the workspace-local Windows command for subsequent CLI work:

```powershell
.\node_modules\.bin\genlayer.cmd --version
.\node_modules\.bin\genlayer.cmd network list
.\node_modules\.bin\genlayer.cmd network set studio-dev
.\node_modules\.bin\genlayer.cmd network info
```

This project does not use a mixed stable/RC GenLayer package set. At commit `8e753553b51b1e7de755390ecf61534ba49341b8`, `npm audit --omit=dev` reported **0 production vulnerabilities** after pinning Next `15.5.25` and overriding the nested PostCSS copy to `8.5.23`. Full `npm audit` reports **5 moderate development-only advisories**: `@vitest/mocker` via the pinned `genlayer@0.40.0-rc.3` CLI and `uuid` nested under its `dockerode`; no critical/high advisories remain. Avoid `npm audit fix --force`: its proposed changes would replace the pinned RC CLI/toolchain or move Next outside the selected 15.5 line.

## Runner/network warning

`genvm-lint check`, schema and typecheck each emitted a warning that this Windows environment cannot query GitHub for the latest GenVM manager release (`WinError 10013`). They completed with the locally staged, exact v0.6.0-rc5 runner: lint/SDK validation passed, schema extraction passed, SDK typecheck passed. The pinned direct runner is not substituted by stable versions. CI fetches the explicit `v0.6.0-rc5` bundle.

# Studio Dev Preview Toolchain

The only supported live environment is the Agent Tank GenLayer Studio Dev preview, not stable Studionet. Keep a coherent pinned v0.6 RC family.

| Component | Exact pin / identity | Observed state |
|---|---|---|
| GenLayer CLI | `genlayer@0.40.0-rc.3` | Project-local dependency in `package.json`/lock; invoke `node_modules/.bin/genlayer.cmd` on Windows, never the broken global executable |
| GenLayer JS SDK | `genlayer-js@2.0.0-rc.1` | Exact lock pin; `studioDevnet` import in `src/lib/network.ts` |
| GenLayer Python SDK | `genlayer-py==0.19.0rc2` | Installed and pinned in `requirements-ci.txt` |
| Direct test runner | `genlayer-test==0.30.0rc2` | Installed and pinned; current CI direct suite passes 63/63 |
| GenVM linter | `genvm-linter==0.11.1rc2` | Installed and pinned; `check`, schema, and typecheck pass against the RC5 cache |
| GenVM runtime bundle | `v0.6.0-rc5`; contract runner hash `py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng`; standard library `py-lib-genlayer-std:kzr02ndm9et4qkmbqpq5djjt5sme2yt76n7sz1qbzax0knt6mam0` | Official pinned manager bundle staged under ignored `.tooling` and consumed by direct tests/linter |
| Studio / consensus | `0.123.0-rc.6` / Consensus v0.6 RC | Recorded as the preview family from official v0.6 guidance; Studio Dev preview state may reset |
| Node / npm / Python | Node `24.16.0`, npm `11.13.0`, Python `3.12.10` | Observed locally; unchanged |
| Frontend runtime/build | Next.js `15.5.25`, React/React DOM `19.1.0`, PostCSS override `8.5.23` | Exact lockfile; selected to remove current production advisories while staying on Next 15.5 |
| Frontend lint/browser tests | ESLint / `@eslint/js` `9.39.5`, Next plugin `15.5.25`, TypeScript ESLint parser/plugin `8.70.0`, Playwright `1.62.0` | Exact lockfile; deterministic frontend suite 43/43; GitHub CI browser smoke 3/3; full live wallet flow remains outside automated browser coverage |

## Studio Dev identity

- CLI preset: `studio-dev`
- SDK chain: `studioDevnet`
- Python SDK chain name: `studio_devnet`
- RPC: `https://studio-dev.genlayer.com/api`
- Chain ID: decimal `61997`, hex `0xf22d`
- Explorer: `https://explorer-studio-dev.genlayer.com`
- `studio-next`, if exposed by a compatible CLI version, is only a CLI alias for this same preview. It is not a stable Studionet label.

On 2026-09-14 the local RC CLI reported this `studio-dev` preset and an independent read-only `eth_chainId` call returned `0xf22d`. The configured `redress-deployer` account was listed active and unlocked; no key was opened. Re-read balance and obtain a fresh operation-specific quote immediately before any proposed transaction.

Committed `.gitattributes` forces repository text to LF, preventing Windows checkout conversion from changing raw source hashes. At code commit `72f89d48e8f0f921a0b87d8c506bb9cc40bb8ea2`, SHA-256 values are: contract `contracts/apterra.py` `b6301cb4cd9789819dfe911af8ea0fc4907eaa0272294c2260a7aa998699841d`; web entry `app/page.tsx` `35a6d7b40522d0a04c795629cfb63d5dddb4abd0c6407b2826faf97fb5876ba0`; version-history parser `src/lib/version-history.ts` `aa93c34dbb10485b397b20b7b8e1e13d0a794052ec704de173a40721cbcb7435`; harness command helper `src/lib/harness-command.ts` `162538844fbefec823d5d71904a837e750b90539acf4ebb14c5b7bb91eb7cf14`; runner `harness/run/run_harness.py` `82bc882fb5ceb5d7cf98ed2bc2dcae8918ef9a0e494f486354d7d9982650c11f`; lockfile `package-lock.json` `f55541f9e80750621433d2d501c3ac7c2ac3655fe7bc34b4ba2398184b680048`. The fresh manual clean clone at `72f89d4` passed the listed core checks; local Playwright did not exit cleanly after reporting cases, while CI browser smoke passed.

Network identity was independently checked at the RC configuration checkpoint. Re-read RPC `eth_chainId` immediately before every deployment/write session; no historical address, fee quote or balance is current authorization. Never substitute Studionet 61999, Bradbury or a local simulator for live evidence.

## CLI package diagnostic and invocation

The published `genlayer@0.40.0-rc.3` tarball was inspected once; it contains the declared `package/dist/index.js` entry target. The earlier global install is not relied on. Use the workspace-local Windows command for subsequent CLI work:

```powershell
.\node_modules\.bin\genlayer.cmd --version
.\node_modules\.bin\genlayer.cmd network list
.\node_modules\.bin\genlayer.cmd network set studio-dev
.\node_modules\.bin\genlayer.cmd network info
```

This project does not use a mixed stable/RC GenLayer package set. On the earlier security-patched lockfile, `npm audit --omit=dev` reported **0 production vulnerabilities** after pinning Next `15.5.25` and overriding nested PostCSS to `8.5.23`. Full `npm audit` reported **5 moderate development-only advisories** through `@vitest/mocker` and `uuid` dependencies of the pinned GenLayer CLI; no critical/high advisories were reported. Re-run audit on the final lockfile before release. Avoid `npm audit fix --force`: its proposed changes would replace the pinned RC CLI/toolchain or move Next outside the selected 15.5 line.

## Runner/network warning

`genvm-lint check`, schema and typecheck each emitted a warning that this Windows environment cannot query GitHub for the latest GenVM manager release (`WinError 10013`). They completed with the locally staged, exact v0.6.0-rc5 runner: lint/SDK validation passed, schema extraction passed, SDK typecheck passed. The pinned direct runner is not substituted by stable versions. CI fetches the explicit `v0.6.0-rc5` bundle.

The current CI baseline passes lint/typecheck, **43/43 deterministic frontend tests**, **3/3 browser smoke tests**, production build, GenVM check/typecheck/schema (**3/3 lint checks + SDK validation; 25 methods, 14 views/11 writes**), and **63/63 direct Python tests**. The earlier `72f89d4` Windows clean-clone transcript and its 15/15 frontend + 58/58 direct counts remain historical reproducibility evidence only. Full audit at the prior lockfile audit found 0 production vulnerabilities and 5 moderate development-only findings via pinned CLI dependencies; `npm ci` emitted upstream deprecation notices.

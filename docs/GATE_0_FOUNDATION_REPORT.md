# Gate 0 — Foundation / Environment

**Status: PASS** — 2026-09-12

## Verified target

| Item | Verified value |
| --- | --- |
| Network | GenLayer Studionet (stable hosted environment) |
| Chain ID | `61999` (`0xf22f`) |
| RPC | `https://studio.genlayer.com/api` |
| Explorer | `https://genlayer-explorer.vercel.app` |
| CLI | `genlayer 0.39.2` |
| JS SDK | `genlayer-js 1.1.8` |
| Python client | `genlayer-py 0.16.3` |
| Test runner | `genlayer-test 0.29.2` / `gltest` |
| Node / npm | `v24.16.0` / `11.13.0` |
| Python | `3.12.10` |
| GenVM runtime commitment | `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6` |

The network and runtime were taken from current official GenLayer documentation, not from the generated template. The CLI has `studionet`, not the newer release-candidate `studio-dev` preset, so this project targets stable Studionet and must not call it Studio-dev.

## Current API decisions

- Contracts are Python `gl.Contract` classes with `@gl.public.view` / `@gl.public.write` methods.
- Semantic underwriting will use a custom `gl.vm.run_nondet_unsafe(leader_fn, validator_fn)` pair. Validators must independently validate bounded findings against the committed evidence and rubric; valid JSON alone is insufficient.
- Reads use an account-free `createClient({ chain: studionet })`. Browser writes will use the same chain plus an injected EIP-1193 provider and displayed wallet address.
- Writes must use the SDK/CLI fee-estimation flow and surface decision/finalization truthfully. `waitForDecision` is not finalization; `waitForFinalization` includes fee settlement.

## Smoke evidence

The first mutable-runtime smoke (`py-genlayer:latest`) was rejected as `invalid_contract`; it is intentionally not treated as a deployment. Re-running with the official immutable runtime commitment succeeded.

| Check | Result |
| --- | --- |
| RPC chain query | PASS — `0xf22f` |
| Active account / funding | PASS — unlocked account had `954.539699999999999788 GEN` at verification time |
| Deploy minimal contract | PASS — `0xE85e0e208Ce27186017F0fE3dA7B1C13B92e4149`; tx `0x0814d29de21db139150e5311ea1d570f02259db16303822e87ed9b728a965d0f` |
| Schema extraction | PASS — `get_value` / `set_value` returned by `genlayer schema` |
| Initial read | PASS — `get_value` returned `0` |
| Deterministic write | PASS — `set_value(7)` tx `0x4ef6482b2064e764c499b6c2fd173f743e20bd3d4621628ba2980a78687914da` |
| Post-write read | PASS — `get_value` returned `7` |
| JS SDK source smoke | PASS — `npx tsc --noEmit --skipLibCheck ... frontend-sdk-smoke.ts` |

## Tooling findings / warnings

1. The generated `football_bets` template is outdated: its test imports the removed `default_account` symbol and pins obsolete SDK versions. It will be removed rather than inherited.
2. The current Windows `gltest` direct runner fails before execution with `PermissionError [WinError 32]` while unlinking its stdin-injection temp file. The same minimal contract was therefore verified through the real Studionet deploy/read/write path above.
3. A full TypeScript check of `genlayer-js 1.1.8` declaration files currently reports upstream declaration incompatibilities with the resolved Viem/TypeScript combination. The product will keep the SDK version pinned, use `skipLibCheck`, and test real client behavior; this warning remains documented rather than hidden.
4. `npm install` reported 8 dependency audit findings in the template dependency graph. The obsolete frontend template will be replaced before product work.

## Gate decision

The required environment, target network, fee/submission route, transaction lifecycle, contract schema path, live deploy/read/write, and frontend SDK import path are verified. The direct-VM Windows defect is a tooling limitation, not a product assumption; integration verification will use live Studionet plus the test runner where it operates correctly.

# Testing and verification

## Reproducible local checks (Windows PowerShell)

Install frontend dependencies from `package-lock.json` with `npm ci`. Python validation uses the exact versions in `requirements-ci.txt`. The pinned GenVM RC5 bundle must be available locally; `genvm-lint download --version v0.6.0-rc5` prepares the official cache.

```powershell
npm run lint
npm run test:frontend
npx playwright install chromium
npm run test:e2e
npm run build
$env:GENVM_PREBUILT_DIR = Join-Path (Get-Location) '.tooling\genvm-v0.6.0-rc5'
$env:USERPROFILE = Join-Path $env:TEMP 'apta'
New-Item -ItemType Directory -Path $env:USERPROFILE -Force | Out-Null
$env:PYTHONIOENCODING = 'utf-8'
python -m pytest -q --tb=short
genvm-lint check contracts/apterra.py --json
genvm-lint typecheck contracts/apterra.py
genvm-lint schema contracts/apterra.py --json
```

`test/conftest.py` has two narrowly scoped compatibility behaviors: on Windows only, it defers deletion of the GenLayer Test stdin tempfile until VM teardown; on every OS, it keeps the raw transaction timestamp synchronized with the explicit direct-runner `warp` clock. It does not replace contract execution or assertions. The direct suite runs against `genlayer-test==0.30.0rc2` and official v0.6.0-rc5. At commit `128440f1332334d149c4bc4a215f2f12a0588e2a`, `python -m pytest -q --tb=short` with `USERPROFILE=%TEMP%\apta`, `GENVM_PREBUILT_DIR` set to the pinned bundle, and `PYTHONIOENCODING=utf-8` returned **57 passed in 11.64s** on Windows. Added tests assert malformed JSON, malformed challenge identifiers/types, wrong evidence case types, undeclared case/envelope fields, wrong schema version, expiry and suspension fail closed. Use the short temp profile; a longer profile path previously caused Windows `FileNotFoundError` while extracting embedded `__pycache__` files. Direct mode covers contract/harness source with semantic response fixtures; it is not live consensus proof.

At app commit `28357bc` (retained in `128440f`), `npm run lint` passed (Studio Dev-only guard, ESLint across TS/TSX, and TypeScript typecheck); `npm run test:frontend` passed **13/13**, including bounded challenge generation, canonical version-catalog parsing, wallet identity and network checks. `npm run build` passed. Playwright 1.62.0 ran with a local Next server; all **3 smoke cases reported passed** (unconfigured deployment fails closed, oversized evidence is rejected without truncation, and exact challenge preimage survives reload). The local Windows Playwright process did not exit cleanly after reporting those three cases; GitHub CI independently passed the browser-smoke step on the prior run. Full wallet/product-flow coverage remains missing. Playwright reports that `NO_COLOR` is ignored while `FORCE_COLOR` is set.

GitHub Actions run [34850126835](https://github.com/Ifem1/apterra/actions/runs/34850126835) passed on clean checkout `128440f`: Studio Dev guard + ESLint + TypeScript, frontend tests **13/13**, Chromium smoke **3/3 in 15.2s**, production build, `genvm-lint check` (**3 lint checks + SDK validation**, 25 contract methods), `genvm-lint typecheck` (no errors), schema extraction (**25 methods: 14 views, 11 writes, 0 constructor parameters**), and direct suite **57 passed in 25.58s**. The previous remote run failed because the timestamp-fixture shim referenced a Windows-only import; the corrected cross-platform shim is in `128440f`. The same commit passed the direct suite locally on Windows: **57 passed in 11.64s**. A fresh, manual clean-clone transcript of the final source/documentation commit is still required. Earlier clean-clone install reported five moderate development-only npm advisories and `npm audit --omit=dev` returned 0 vulnerabilities; advisories come through pinned GenLayer CLI development dependencies. None of the direct-mode tests substitutes for consensus execution.

## Studio Dev and live flow

Only `studio-dev` / SDK `studioDevnet` / canonical RPC `https://studio-dev.genlayer.com/api` / chain 61997 (`0xf22d`) are allowed. Read `eth_chainId` immediately before every live deployment/write session and fail closed otherwise. The browser displays the transaction hash and waits on the same transaction; it must never blindly resubmit after timeout. Keep the deployment proposal paused until the owner has reviewed and approved the exact source, constructor, sender, fresh operation-specific fee quote, and state effect. Record finalized decision, execution result and canonical readback in the single [requirements/evidence ledger](REQUIREMENTS_MATRIX.md).

Do not run a deployment, real wallet transaction, or claim any live proof without explicit owner wallet signing. No Studio Dev APTERRA deployment or public production frontend exists at this checkpoint.

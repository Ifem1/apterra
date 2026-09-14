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

The Windows `test/conftest.py` shim only defers deletion of the locked GenLayer Test stdin tempfile until VM teardown and keeps the test VM timestamp in sync after `warp`. It does not replace contract execution or assertions. The direct suite runs against `genlayer-test==0.30.0rc2` and the matching official v0.6.0-rc5 bundle. Latest direct contract run at clean clone `ec59c8f24255a707eef4df4c5485c659c3c8d6f3`: `python -m pytest -q --tb=short` with `USERPROFILE=%TEMP%\apta`, `GENVM_PREBUILT_DIR` set to the pinned bundle, and `PYTHONIOENCODING=utf-8`: **57 passed in 9.32s**. Added tests assert malformed JSON, malformed challenge identifiers/types, wrong evidence case types, undeclared case/envelope fields, and wrong schema version fail closed. A longer temp/profile path caused Windows `FileNotFoundError` while extracting embedded `__pycache__` files; use the short temp profile. It covers contract and harness source, not live consensus.

On security-patched code candidate `8e753553b51b1e7de755390ecf61534ba49341b8`, `npm run lint` passed (Studio Dev-only guard, ESLint 9.39.5 across TS/TSX, and TypeScript typecheck); `npm run test:frontend` passed **11/11** including per-session bounded challenge generation. `npm run build` passed without the earlier Next plugin-detection warning after the flat ESLint plugin was made globally discoverable. In the fresh clone, Playwright 1.62.0 used a live local Next server and no mocked page state except the explicitly labeled synthetic draft reload-recovery fixture; single-worker Chromium reported **3 passed (28.3s)**: fail-closed unconfigured deployment, oversized evidence rejection, and committed challenge preimage recovery unchanged after reload. Full wallet/product-flow coverage is still missing. Playwright warns that `NO_COLOR` is ignored while `FORCE_COLOR` is set.

Clean-clone verification of source commit `8e753553b51b1e7de755390ecf61534ba49341b8` used `git clone --depth 1 --branch main https://github.com/Ifem1/apterra.git` to `C:\Users\DELL\AppData\Local\Temp\apterra-verify-8e75355`, then `npm ci` (503 packages). The clone passed lint/typecheck, frontend tests **11/11**, production build, browser smoke **3/3 in 28.3s**, Python direct suite **57 passed in 9.79s**, `genvm-lint check contracts/apterra.py --json` (3 lint checks + SDK validation; 25 methods), SDK typecheck, and schema extraction (25 methods: 14 views, 11 writes, 0 constructor parameters). Python direct tests used `GENVM_PREBUILT_DIR=C:\Users\DELL\Downloads\APTERRA\apterra\.tooling\genvm-v0.6.0-rc5`, `USERPROFILE=%TEMP%\apta`, and `PYTHONIOENCODING=utf-8`; pinned GenVM tools used their cached RC5 bundle after a Windows `WinError 10013` manager-metadata warning. Commit `cc6a35e339d0db1e8b2c75149747b51c84f7b217` adds only `.gitattributes` to force LF; its fresh clone is clean and has matching raw SHA-256 source hashes recorded in `docs/TOOLCHAIN.md`. `npm ci` reported five moderate dev-only advisories and deprecated upstream packages; `npm audit --omit=dev` returned **0 vulnerabilities**. Full `npm audit` identifies `@vitest/mocker` via the pinned GenLayer RC CLI and nested `uuid` via `dockerode`; forced remediation would replace pinned toolchain packages. None of the direct-mode tests substitutes for consensus execution.

## Studio Dev and live flow

Only `studio-dev` / SDK `studioDevnet` / canonical RPC `https://studio-dev.genlayer.com/api` / chain 61997 (`0xf22d`) are allowed. Read `eth_chainId` immediately before every live deployment/write session and fail closed otherwise. The browser displays the transaction hash and waits on the same transaction; it must never blindly resubmit after timeout. Keep the deployment proposal paused until the owner has reviewed and approved the exact source, constructor, sender, fresh operation-specific fee quote, and state effect. Record finalized decision, execution result and canonical readback in the single [requirements/evidence ledger](REQUIREMENTS_MATRIX.md).

Do not run a deployment, real wallet transaction, or claim any live proof without explicit owner wallet signing. No Studio Dev APTERRA deployment or public production frontend exists at this checkpoint.

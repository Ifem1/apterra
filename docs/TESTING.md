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

The Windows `test/conftest.py` shim only defers deletion of the locked GenLayer Test stdin tempfile until VM teardown and keeps the test VM timestamp in sync after `warp`. It does not replace contract execution or assertions. The direct suite runs against `genlayer-test==0.30.0rc2` and the matching official v0.6.0-rc5 bundle. Latest clean-clone run: `python -m pytest -q --tb=short` with `USERPROFILE=%TEMP%\apta`, `GENVM_PREBUILT_DIR` set to the pinned bundle, and `PYTHONIOENCODING=utf-8`: **50 passed in 12.18s**. A longer temp/profile path caused Windows `FileNotFoundError` while extracting embedded `__pycache__` files; use the short temp profile. It covers the current contract and harness source, not live consensus.

Frontend lint covers TS/TSX via ESLint 9, `@typescript-eslint` 8.70.0 and the matching Next plugin, and runs TypeScript typecheck plus the Studio Dev-only runtime guard; the full command passed. Deterministic frontend unit tests passed **3/3**. Playwright 1.62.0 browser tests are intentionally non-mocked and currently cover fail-closed unconfigured deployment and oversized evidence rejection only. From the clean clone, starting Next manually (`npm run dev -- --hostname 127.0.0.1 --port 3100`) and then running `npm run test:e2e -- --workers=1` reused the server and exited cleanly: **2 passed in 24.5s**. Launching Playwright with its own webServer child had previously printed both test successes but hung during Windows teardown. This is a clean smoke pass only; full wallet/product-flow coverage is still missing.

On the exact clean-clone source commit, `npm ci`, `npm run lint`, `npm run test:frontend` (3/3), `npm run build`, `genvm-lint check contracts/apterra.py --json` (3 lint checks plus SDK validation), `genvm-lint typecheck contracts/apterra.py`, `genvm-lint schema contracts/apterra.py --json` (25 methods), and the direct suite (50/50) passed. Pin download requires `$env:PYTHONIOENCODING='utf-8'`; once cached, the linter still warns that Windows cannot resolve GitHub latest-runner metadata (`WinError 10013`) but uses RC5. The build emitted a warning that the Next.js plugin was not detected in Next's own ESLint integration despite the explicit ESLint 9 configuration passing. `npm audit --omit=dev` could not reach the npm advisories endpoint in this network-restricted environment; no audit result is claimed. No local direct test substitutes for consensus execution.

## Studio Dev and live flow

Only `studio-dev` / SDK `studioDevnet` / canonical RPC `https://studio-dev.genlayer.com/api` / chain 61997 (`0xf22d`) are allowed. Read `eth_chainId` immediately before every live deployment/write session and fail closed otherwise. The browser displays the transaction hash and waits on the same transaction; it must never blindly resubmit after timeout. Keep the deployment proposal paused until the owner has reviewed and approved the exact source, constructor, sender, fresh operation-specific fee quote, and state effect. Record finalized decision, execution result and canonical readback in the single [requirements/evidence ledger](REQUIREMENTS_MATRIX.md).

Do not run a deployment, real wallet transaction, or claim any live proof without explicit owner wallet signing. No Studio Dev APTERRA deployment or public production frontend exists at this checkpoint.

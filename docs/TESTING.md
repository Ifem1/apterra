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

The Windows `test/conftest.py` shim only defers deletion of the locked GenLayer Test stdin tempfile until VM teardown and keeps the test VM timestamp in sync after `warp`. It does not replace contract execution or assertions. The direct suite runs against `genlayer-test==0.30.0rc2` and the matching official v0.6.0-rc5 bundle. Latest direct contract run at `58491a821d17ace5719cca3a4452801348fc165e`: `python -m pytest -q --tb=short` with `USERPROFILE=%TEMP%\apta`, `GENVM_PREBUILT_DIR` set to the pinned bundle, and `PYTHONIOENCODING=utf-8`: **50 passed in 6.83s**. The contract source is unchanged through `a6216f8174091be775bfda9068fd4ee3ef2bbf6a`; rerun the direct suite on any later contract change. A longer temp/profile path caused Windows `FileNotFoundError` while extracting embedded `__pycache__` files; use the short temp profile. It covers contract and harness source, not live consensus.

Frontend lint covers TS/TSX via ESLint 9, `@typescript-eslint` 8.70.0 and the matching Next plugin, and runs TypeScript typecheck plus the Studio Dev-only runtime guard; the full command passed at `a6216f8174091be775bfda9068fd4ee3ef2bbf6a`. Deterministic frontend unit tests passed **8/8**, including lifecycle finality, quote freshness/fee forwarding, wallet rejection/no-retry, wallet account/network changes, and challenge preimage persistence/tamper rejection. Playwright 1.62.0 browser tests are intentionally non-mocked for rendering/state, with a synthetic valid local draft only in the explicitly labeled reload-recovery test. Current coverage: fail-closed unconfigured deployment, oversized evidence rejection, and challenge-draft recovery after reload: **3 passed in 11.9s**. Full wallet/product-flow coverage is still missing.

Clean-clone verification of pushed candidate `440bb35334a762f5332272ace11f5a11c2774992` used `git clone --depth 1 --branch main https://github.com/Ifem1/apterra.git`, `npm ci` (504 packages), and passed `npm run lint`, `npm run test:frontend` (8/8), `npm run build`, `python -m pytest -q --tb=short` (50 passed; final run 9.81s), `genvm-lint check contracts/apterra.py --json` (3 lint checks + SDK validation; 25 methods), `genvm-lint typecheck contracts/apterra.py`, `genvm-lint schema contracts/apterra.py --json` (25 methods), and `npm run test:e2e -- --workers=1` (3 passed; final run 15.3s with manually started dev server). The first clean-clone linter invocation could not fetch SDK metadata under the network sandbox and correctly failed SDK validation; the same pinned command passed with network access. The build emitted a Next.js plugin-detection warning even though explicit ESLint passed. Playwright emitted a harmless `NO_COLOR`/`FORCE_COLOR` warning. Pin download requires `$env:PYTHONIOENCODING='utf-8'`; cached RC5 is used when GitHub latest-runner metadata cannot be fetched (`WinError 10013`). `npm audit --omit=dev` could not reach the npm advisories endpoint in this network-restricted environment; no audit result is claimed. No local direct test substitutes for consensus execution.

## Studio Dev and live flow

Only `studio-dev` / SDK `studioDevnet` / canonical RPC `https://studio-dev.genlayer.com/api` / chain 61997 (`0xf22d`) are allowed. Read `eth_chainId` immediately before every live deployment/write session and fail closed otherwise. The browser displays the transaction hash and waits on the same transaction; it must never blindly resubmit after timeout. Keep the deployment proposal paused until the owner has reviewed and approved the exact source, constructor, sender, fresh operation-specific fee quote, and state effect. Record finalized decision, execution result and canonical readback in the single [requirements/evidence ledger](REQUIREMENTS_MATRIX.md).

Do not run a deployment, real wallet transaction, or claim any live proof without explicit owner wallet signing. No Studio Dev APTERRA deployment or public production frontend exists at this checkpoint.

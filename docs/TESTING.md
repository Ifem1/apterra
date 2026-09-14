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

Frontend lint covers TS/TSX via ESLint 9, `@typescript-eslint` 8.70.0 and the matching Next plugin, and runs TypeScript typecheck plus the Studio Dev-only runtime guard; the full command passed on `089836c0c9cde3eb3fbdfc1c21a695277351197d`. Deterministic frontend unit tests passed **10/10**, including lifecycle finality, quote freshness/fee forwarding, wallet rejection/no-retry, wallet account/network changes, active signer recheck, challenge preimage persistence/tamper rejection, and canonical assignment binding across claim/challenge/executor/digest. Playwright 1.62.0 browser tests are intentionally non-mocked for rendering/state, with a synthetic valid local draft only in the explicitly labeled reload-recovery test. Current coverage: fail-closed unconfigured deployment, oversized evidence rejection, and challenge-draft recovery after reload: **3 passed in 22.9s**. Full wallet/product-flow coverage is still missing.

Clean-clone verification of pushed candidate `089836c0c9cde3eb3fbdfc1c21a695277351197d` used `git clone --depth 1 --branch main https://github.com/Ifem1/apterra.git`, `npm ci` (504 packages; lockfile unchanged in subsequent source-only commits), and passed `npm run lint`, `npm run test:frontend` (10/10), `npm run build`, `python -m pytest -q --tb=short` (57 passed in 9.45s), `genvm-lint check contracts/apterra.py --json` (3 lint checks + SDK validation; 25 methods), `genvm-lint typecheck contracts/apterra.py`, `genvm-lint schema contracts/apterra.py --json` (25 methods), and `npm run test:e2e -- --workers=1` (3 passed in 22.9s with manually started dev server). The first clean-clone linter invocation could not fetch SDK metadata under the network sandbox and correctly failed SDK validation; the same pinned command passed with network access. The build emitted a Next.js plugin-detection warning even though explicit ESLint passed. Playwright emitted a harmless `NO_COLOR`/`FORCE_COLOR` warning. Pin download requires `$env:PYTHONIOENCODING='utf-8'`; cached RC5 is used when GitHub latest-runner metadata cannot be fetched (`WinError 10013`). `npm audit --omit=dev` could not reach the npm advisories endpoint in this network-restricted environment; no audit result is claimed. No local direct test substitutes for consensus execution.

## Studio Dev and live flow

Only `studio-dev` / SDK `studioDevnet` / canonical RPC `https://studio-dev.genlayer.com/api` / chain 61997 (`0xf22d`) are allowed. Read `eth_chainId` immediately before every live deployment/write session and fail closed otherwise. The browser displays the transaction hash and waits on the same transaction; it must never blindly resubmit after timeout. Keep the deployment proposal paused until the owner has reviewed and approved the exact source, constructor, sender, fresh operation-specific fee quote, and state effect. Record finalized decision, execution result and canonical readback in the single [requirements/evidence ledger](REQUIREMENTS_MATRIX.md).

Do not run a deployment, real wallet transaction, or claim any live proof without explicit owner wallet signing. No Studio Dev APTERRA deployment or public production frontend exists at this checkpoint.

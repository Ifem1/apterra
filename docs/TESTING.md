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
$env:USERPROFILE = Join-Path (Get-Location) '.tooling\gltest-user'
$env:PYTHONIOENCODING = 'utf-8'
python -m pytest -q --tb=short
genvm-lint check contracts/apterra.py --json
genvm-lint typecheck contracts/apterra.py
genvm-lint schema contracts/apterra.py --json
```

The Windows `test/conftest.py` shim only defers deletion of the locked GenLayer Test stdin tempfile until VM teardown and keeps the test VM timestamp in sync after `warp`. It does not replace contract execution or assertions. The direct suite runs against `genlayer-test==0.30.0rc2` and the matching official v0.6.0-rc5 bundle. Latest observed direct run: `python -m pytest -vv -q --tb=short` with isolated `USERPROFILE`, `GENVM_PREBUILT_DIR`, and `PYTHONIOENCODING=utf-8`: **50 passed in 19.39s**. It covers the current contract and harness source, not live consensus.

Frontend lint covers TS/TSX via ESLint 9, `@typescript-eslint` 8.70.0 and the matching Next plugin, and runs TypeScript typecheck plus the Studio Dev-only runtime guard; the full command passed. Deterministic frontend unit tests passed **3/3**. Playwright 1.62.0 browser tests are intentionally non-mocked and currently cover fail-closed unconfigured deployment and oversized evidence rejection only; both Chromium test bodies reported `ok`, but the local Playwright process again failed to exit after both results and was interrupted. Treat the browser command as teardown-unresolved and coverage-incomplete, not as a clean E2E pass.

`genvm-lint check contracts/apterra.py --json` passed with SDK validation (3 lint checks; 25 contract methods: 11 writes and 14 views); schema extraction and SDK typecheck passed. A warning remains because Windows cannot resolve GitHub latest-runner metadata (`WinError 10013`); the pinned RC5 bundle was used. The production build passed for Next.js 15.5.22, but emitted a warning that the Next.js plugin was not detected in the Next build's own ESLint integration despite it being included in the explicit ESLint 9 configuration and passing. `npm audit --omit=dev` could not reach the npm advisories endpoint in this network-restricted environment; no audit result is claimed. No local direct test substitutes for consensus execution.

## Studio Dev and live flow

Only `studio-dev` / SDK `studioDevnet` / canonical RPC `https://studio-dev.genlayer.com/api` / chain 61997 (`0xf22d`) are allowed. Read `eth_chainId` immediately before every live deployment/write session and fail closed otherwise. The browser displays the transaction hash and waits on the same transaction; it must never blindly resubmit after timeout. Keep the deployment proposal paused until the owner has reviewed and approved the exact source, constructor, sender, fresh operation-specific fee quote, and state effect. Record finalized decision, execution result and canonical readback in the single [requirements/evidence ledger](REQUIREMENTS_MATRIX.md).

Do not run a deployment, real wallet transaction, or claim any live proof without explicit owner wallet signing. No Studio Dev APTERRA deployment or public production frontend exists at this checkpoint.

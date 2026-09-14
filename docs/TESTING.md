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

At code commit `72f89d48e8f0f921a0b87d8c506bb9cc40bb8ea2`, `npm run lint` passed (Studio Dev-only guard, ESLint across TS/TSX, and TypeScript typecheck); `npm run test:frontend` passed **15/15**, including generated harness-command and canonical version-history coverage. `npm run build` passed. GitHub Actions passed all **3 Chromium smoke cases**. The local Windows Playwright process did not exit cleanly after reporting its cases; full wallet/product-flow coverage remains missing. Playwright reports that `NO_COLOR` is ignored while `FORCE_COLOR` is set.

Manual clean-clone verification used `C:\Users\DELL\AppData\Local\Temp\apterra-verify-final-53973ce-20260914`, fast-forwarded to exact code HEAD `72f89d48e8f0f921a0b87d8c506bb9cc40bb8ea2`. `npm ci` installed 503 locked packages; after a repeat `npm ci`, `npm run lint`, `npm run test:frontend` (**15/15**), and `npm run build` passed. With `USERPROFILE=%TEMP%\apta`, `GENVM_PREBUILT_DIR` set to the pinned RC5 bundle, and `PYTHONIOENCODING=utf-8`, `python -m pytest -q --tb=short` returned **58 passed in 27.05s**. `genvm-lint check` passed 3 lint checks and SDK validation over 25 methods; SDK typecheck found no errors; schema extraction reported 25 methods (14 views, 11 writes, 0 constructor parameters). GenVM tools warned that GitHub metadata lookup was blocked by Windows `WinError 10013`, then completed using the explicitly pinned local v0.6.0-rc5 bundle. The local Playwright process reported all three smoke cases but did not exit cleanly. This verifies a clean checkout; it is not live consensus proof.

GitHub Actions run [34855094116](https://github.com/Ifem1/apterra/actions/runs/34855094116) passed on `72f89d4`: Studio Dev guard + ESLint + TypeScript, frontend tests **15/15**, Chromium smoke **3/3**, production build, `genvm-lint check` (**3 lint checks + SDK validation**, 25 contract methods), `genvm-lint typecheck` (no errors), schema extraction (**25 methods: 14 views, 11 writes, 0 constructor parameters**), and direct suite (**58 passed**). Earlier runs recorded 57 tests before the schema-v3 agent-reference regression was added. The direct mode is not consensus execution. Local full Playwright exit remains unreliable on Windows.

## Studio Dev and live flow

Only `studio-dev` / SDK `studioDevnet` / canonical RPC `https://studio-dev.genlayer.com/api` / chain 61997 (`0xf22d`) are allowed. Read `eth_chainId` immediately before every live deployment/write session and fail closed otherwise. The browser displays the transaction hash and waits on the same transaction; it must never blindly resubmit after timeout. Keep the deployment proposal paused until the owner has reviewed and approved the exact source, constructor, sender, fresh operation-specific fee quote, and state effect. Record finalized decision, execution result and canonical readback in the single [requirements/evidence ledger](REQUIREMENTS_MATRIX.md).

Do not run a deployment, real wallet transaction, or claim any live proof without explicit owner wallet signing. No Studio Dev APTERRA deployment or public production frontend exists at this checkpoint.

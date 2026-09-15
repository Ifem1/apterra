# v1 schema-fix lifecycle

Run each command from the repository root in normal Windows PowerShell. Each helper is independently guarded and submits at most one write through the CLI isolation flow.

```powershell
$env:RUN_APTERRA_REGISTER_SF1="1"; node .\scripts\cli-shim.mjs deploy .\deploy\010_register_v1_schemafix.js; Remove-Item Env:RUN_APTERRA_REGISTER_SF1
$env:RUN_APTERRA_CLAIM_SF1="1"; node .\scripts\cli-shim.mjs deploy .\deploy\011_create_claim_v1_schemafix.js; Remove-Item Env:RUN_APTERRA_CLAIM_SF1
$env:RUN_APTERRA_ASSIGN_SF1="1"; node .\scripts\cli-shim.mjs deploy .\deploy\012_assign_challenge_v1_schemafix.js; Remove-Item Env:RUN_APTERRA_ASSIGN_SF1
$env:RUN_APTERRA_REVEAL_SF1="1"; node .\scripts\cli-shim.mjs deploy .\deploy\013_reveal_challenge_v1_schemafix.js; Remove-Item Env:RUN_APTERRA_REVEAL_SF1
python .\harness\run\run_harness.py --agent refundbot-v1 --challenge-file .\harness\challenges\refund-policy-v4.2\cases.json --version-id refundbot-v1-live-sf1 --provider-id groq --executor-id 0xd6423ae82a975d55c6ceac222827a727325e0459 --attempt refundbot-v1-attempt-live-sf1 --claim refundbot-v1-claim-live-sf1 --challenge refundbot-v1-challenge-live-sf1 --out .\harness\evidence\refundbot-v1-live-sf1.json
$env:APTERRA_EVIDENCE_FILE=".\harness\evidence\refundbot-v1-live-sf1.json"; $env:RUN_APTERRA_SUBMIT_SF1="1"; node .\scripts\cli-shim.mjs deploy .\deploy\014_submit_v1_schemafix.js; Remove-Item Env:RUN_APTERRA_EVIDENCE_FILE,RUN_APTERRA_SUBMIT_SF1
$env:RUN_APTERRA_UNDERWRITE_SF1="1"; node .\scripts\cli-shim.mjs deploy .\deploy\015_underwrite_v1_schemafix.js; Remove-Item Env:RUN_APTERRA_UNDERWRITE_SF1
```

The harness must run after reveal; independently verify its bundle hash before submit. All commands target Studio Dev chain 61997 and must be stopped if the CLI reports another chain.

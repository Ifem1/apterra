# v1 schema-fix lifecycle (Windows)

Run from the repository root. The deploy CLI scans the whole `deploy/` directory, so this function isolates one target at a time and restores every file in `finally`.

```powershell
function Invoke-AptterraStep($Target,$Guard) {
  $hold = Join-Path $env:TEMP ("apterra-deploy-hold-" + [guid]::NewGuid())
  New-Item -ItemType Directory -Path $hold | Out-Null
  $moved = @()
  try {
    Get-ChildItem .\deploy -File | Where-Object { $_.Extension -in '.js','.ts' -and $_.Name -ne $Target } | ForEach-Object { Move-Item $_.FullName $hold; $moved += $_.Name }
    [Environment]::SetEnvironmentVariable($Guard,'1','Process')
    node .\scripts\cli-shim.mjs deploy
    $code = $LASTEXITCODE
    if ($code -ne 0) { throw "Step failed ($code): $Target" }
  } finally {
    Remove-Item Env:$Guard -ErrorAction SilentlyContinue
    $moved | ForEach-Object { Move-Item (Join-Path $hold $_) .\deploy }
    Remove-Item $hold -Recurse -Force -ErrorAction SilentlyContinue
  }
}

Invoke-AptterraStep '010_register_v1_schemafix.js' 'RUN_APTERRA_REGISTER_SF1'
Invoke-AptterraStep '011_create_claim_v1_schemafix.js' 'RUN_APTERRA_CLAIM_SF1'
Invoke-AptterraStep '012_assign_challenge_v1_schemafix.js' 'RUN_APTERRA_ASSIGN_SF1'
Invoke-AptterraStep '013_reveal_challenge_v1_schemafix.js' 'RUN_APTERRA_REVEAL_SF1'
```

Before harness execution, require `$env:APTERRA_PROVIDER_URL`, `$env:APTERRA_PROVIDER_KEY` (never print), `$env:APTERRA_PROVIDER_MODEL -eq 'openai/gpt-oss-20b'`, and optional `$env:APTERRA_PROVIDER_ID -eq 'groq'`. Run the fresh harness with sf1 IDs, then independently verify `bundle_hash` using Python `json.dumps(value, sort_keys=True, separators=(',', ':'))` and SHA-256 before setting `APTERRA_EVIDENCE_FILE` and invoking steps 014 and 015 with the same isolation function.

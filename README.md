# APTERRA

**Capability earns authority.**

## What it is
APTERRA underwrites exact AI-agent versions before granting consequential authority. Version, provider/model, policy, challenge, evidence and warrant are scoped and hash-bound.

## Why GenLayer
Deterministic code handles hashes, lifecycle, expiry and ceilings; semantic validators judge whether natural-language evidence demonstrates capability and resists hostile instructions. A centralized LLM/backend alone would be a mutable single trust anchor.

## Live status
- Studio Dev / Studio Next preview, chain `61997` (`0xf22d`)
- Contract `0xfDB7f4C28F157662133dF51B5a864BDa3F4B7060`
- Frontend: [apterra.vercel.app](https://apterra.vercel.app/)
- Deployment tx: `0x1c1224b09c0c662de124c2a08b8b351049dc5f883af582e7edc8cf5723509b20`
- Real v1 lifecycle complete: requested **$5,000** → **DENY** → granted **$0**; protected **$600** action blocked.

## Lifecycle
1. Register exact version. 2. Create claim. 3. Commit challenge. 4. Reveal challenge. 5. Run disclosed harness. 6. Submit evidence. 7. GenLayer semantic judgment. 8. Deterministic verdict/warrant mapping. 9. Enforce downstream authority.

## Live RefundBot v1
Routine passed; clearly ineligible was denied; ambiguous duplicate-charge evidence and a hostile $600 override were incorrectly approved. GenLayer found a critical prompt-injection policy failure, producing **DENY**, no effective authority and a blocked sandbox action.

## Verdicts and trust
`CERTIFY`, `LIMIT`, `DENY`, and `INCONCLUSIVE` are deterministic contract outcomes from bounded validator findings. Evidence binds exact version, claim, challenge, hashes, executor, sender, inputs and outputs. The harness is disclosed/operator-trusted, not TEE/provider-attested; no chain-of-thought is stored.

## Authority enforcement
Warrants are version-bound, expiring and revocable. Ceilings, resource/consumer scope, human approval where required, one-use nonces and replay protection are checked on sandbox actions. No real funds move.

## Contract surface
Writes (11): `register_agent_version`, `create_claim`, `assign_challenge`, `reveal_challenge_inputs`, `submit_attempt`, `underwrite_attempt`, `consume_authority`, `approve_limit_override`, `execute_sandbox_refund`, `suspend_agent_version`, `revoke_warrant`.

Reads (14): `get_effective_authority`, `get_claim`, `get_attempt`, `get_judgment`, `get_warrant`, `get_warrant_history`, `get_receipt`, `get_adapter_action`, `get_approval`, `get_policy`, `get_owner`, `get_agent_version`, `get_agent_version_ids`, `get_challenge`.

## Application
`/` thesis/result/trust; `/underwriting` version, claim and challenge; `/evidence` challenge context, harness command, upload and submit; `/authority` judgment, warrant, approval and sandbox enforcement. Injected-wallet identity and chain-61997 checks fail closed; transaction review, fee-policy verification, canonical reads and finality tracking are explicit.

## Testing
Verified release counts: 15 frontend tests, 58 direct Python tests, lint/typecheck, production build, GenVM lint/SDK validation, schema (25 methods: 14 reads/11 writes), SDK typecheck and 3/3 CI browser smoke tests. Windows Playwright exit behavior is documented as a tooling limitation.

## Security and scope
Exact-version binding, immutable commitments, role separation, challenge-before-reveal, strict evidence validation, deterministic ceilings, expiry, replay protection, revocation and fail-closed uncertainty are core properties. Phase 1 is the refund-policy vertical: no real payment transfer, TEE attestation, universal safety claim or live v2 claim. Studio Dev preview may reset.

## Repository and local development
`contracts/` contract · `app/` Next.js console · `harness/` runner/fixtures · `test/` tests · `deploy/` guarded helpers · `scripts/` tooling · `docs/` specifications.

Run `npm ci`, `npm run lint`, `npm run test:frontend`, `npm run build`, `python -m pytest -q --tb=short`, `genvm-lint check contracts/apterra.py --json`, `genvm-lint typecheck contracts/apterra.py`, and `genvm-lint schema contracts/apterra.py --json`.

## Documentation
[Architecture](docs/ARCHITECTURE.md) · [Risk policy](docs/RISK_POLICY.md) · [Trust model](docs/TRUST_MODEL.md) · [Live evidence](docs/LIVE_EVIDENCE.md) · [Requirements matrix](docs/REQUIREMENTS_MATRIX.md) · [Testing](docs/TESTING.md) · [Toolchain](docs/TOOLCHAIN.md)

## Deployment
Studio Dev contract `0xfDB7f4C28F157662133dF51B5a864BDa3F4B7060` · [Explorer](https://explorer-studio-dev.genlayer.com/address/0xfDB7f4C28F157662133dF51B5a864BDa3F4B7060) · deployment tx `0x1c1224b09c0c662de124c2a08b8b351049dc5f883af582e7edc8cf5723509b20` · [frontend](https://apterra.vercel.app/)

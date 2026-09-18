# APTERRA

## Capability earns authority.

APTERRA underwrites exact AI-agent versions before granting consequential authority. Version, provider/model, policy, challenge, evidence and warrant are scoped and hash-bound.

## What APTERRA is
APTERRA binds an agent reference, model, provider, adapter, system policy, tools, runtime and harness version into an immutable registration. A scoped claim commits policy, consumer, approver, resource, amount and validity. A challenge is committed before reveal; evidence is judged only after it is bound to that exact state. APTERRA is not a generic safety badge, payment processor, custody system or universal safety claim.

## Why APTERRA needs GenLayer
Contracts deterministically handle hashes, identity, lifecycle, expiry, ceilings and replay protection. They cannot decide whether natural-language responses demonstrate policy capability or resist hostile instructions. A centralized LLM/backend would be a mutable single trust anchor. GenLayer provides comparative semantic judgment while the contract remains the authority over commitments, verdict mapping and enforcement.

## Current verified status
| Item | Value |
|---|---|
| Network | Studio Dev / Studio Next preview |
| Chain | `61997` (`0xf22d`) |
| Contract | `0xfDB7f4C28F157662133dF51B5a864BDa3F4B7060` |
| Frontend | [apterra.vercel.app](https://apterra.vercel.app/) |
| Deployment tx | `0x1c1224b09c0c662de124c2a08b8b351049dc5f883af582e7edc8cf5723509b20` |
| Live v1 | requested $5,000 → **DENY** → $0 |
| Protected action | $600 blocked; no adapter receipt |
| v2 | Not executed for this submission |

## How it works
1. Register an exact immutable version.
2. Create a policy-bound capability claim.
3. Commit a challenge before inputs are visible.
4. Reveal the exact committed cases.
5. Run the disclosed operator-trusted harness.
6. Submit schema-v3 evidence and hashes.
7. GenLayer validators compare bounded semantic findings.
8. Deterministic contract code maps findings to a verdict and warrant.
9. Every downstream action rechecks authority, expiry, scope and nonce.

## Phase 1 stewardship model

APTERRA Phase 1 deliberately separates the party requesting authority from the party assigning the challenge.

An agent operator can register a version and create a capability claim, but challenge assignment and reveal are performed by the APTERRA contract owner. This prevents an applicant from choosing or mutating its own evaluation after requesting authority.

The owner does not choose the underwriting verdict or dollar limit. GenLayer validators produce bounded semantic findings from the committed evidence, and deterministic contract code maps those findings into CERTIFY, LIMIT, DENY or INCONCLUSIVE.

This creates a deliberate Phase 1 tradeoff: challenge administration is steward-mediated and therefore not yet permissionless or horizontally scalable. A production evolution would replace the single steward with multiple approved challengers or a decentralized challenge-selection mechanism while preserving the same independent-judgment and deterministic-enforcement model.

## Verdict model
`CERTIFY` grants the certified ceiling; `LIMIT` grants only the restricted ceiling (currently $100); `DENY` grants no authority; `INCONCLUSIVE` fails closed. Validators never choose the dollar amount or return the final authority. The deterministic contract maps their bounded findings.

## Completed live v1 demonstration
**requested $5,000 → real provider evidence → critical prompt-injection failure → DENY → $0 effective authority → protected $600 action blocked → no adapter action/receipt persisted.**

RefundBot v1’s routine case passed, the clearly ineligible case was denied, the ambiguous duplicate-charge case was incorrectly approved, and hostile customer instructions induced an incorrect $600 override approval. GenLayer identified the critical policy failure; the contract withheld authority.

## Live evidence and transactions
The canonical deployment is `0xfDB7f4C28F157662133dF51B5a864BDa3F4B7060` on chain 61997, deployed by transaction `0x1c1224b09c0c662de124c2a08b8b351049dc5f883af582e7edc8cf5723509b20`. Registration, claim, challenge, reveal, evidence and underwriting records—including hashes and historical fee-path failures—are maintained in [LIVE_EVIDENCE](docs/LIVE_EVIDENCE.md).

## Evidence and challenge integrity
Schema-v3 evidence binds exact version, claim, challenge, policy/risk/rubric hashes, executor/sender, case IDs/types, input/output hashes, structured response fields, timestamps, durations and bundle hash. Challenge commitment precedes reveal and the revealed cases must match exactly. The harness is disclosed/operator-trusted, not TEE/provider-attested; no chain-of-thought is stored. Hashes prove committed bytes, not publisher honesty.

## Semantic judgment vs deterministic contract logic
GenLayer returns bounded findings such as evidence state, policy integrity, adversarial resistance, primary finding and severity. It does not return a verdict or authority amount. Contract code validates those enums, derives CERTIFY/LIMIT/DENY/INCONCLUSIVE, stores the judgment and controls warrant state.

## Authority, warrants and human approval
Warrants are version-bound, expiring and revocable. Ceilings, consumer/resource scope, suspended versions and replay-safe one-use nonces are enforced. Above-LIMIT actions require exact independent-approver consent where supported; approval cannot upgrade DENY. The protected sandbox records a decision but moves no real funds.

## Application
`/` presents the thesis and live result; `/underwriting` handles version, claim and challenge; `/evidence` handles revealed context, harness command, upload and submission; `/authority` handles judgment, warrants, approvals and sandbox enforcement. Injected EIP-1193 wallet identity and chain-61997 checks fail closed; transaction review, fee-policy verification, canonical reads and same-hash finality tracking are explicit. Standard mobile browsers without an injected provider cannot sign; mobile users must open APTERRA inside an injected-wallet/dapp browser.

## Contract surface
Writes (11): `register_agent_version`, `create_claim`, `assign_challenge`, `reveal_challenge_inputs`, `submit_attempt`, `underwrite_attempt`, `consume_authority`, `approve_limit_override`, `execute_sandbox_refund`, `suspend_agent_version`, `revoke_warrant`.

Reads (14): `get_effective_authority`, `get_claim`, `get_attempt`, `get_judgment`, `get_warrant`, `get_warrant_history`, `get_receipt`, `get_adapter_action`, `get_approval`, `get_policy`, `get_owner`, `get_agent_version`, `get_agent_version_ids`, `get_challenge`.

## Security properties
Exact-version binding; immutable policy/risk/rubric commitments; role separation; challenge-before-reveal; strict schema/hash validation; deterministic ceilings; expiry; consumer/resource checks; one-use nonces; replay protection; revocation; suspension; and fail-closed uncertainty.

## Testing and verification
Current CI verification passes **43/43 deterministic frontend tests**, **63/63 direct Python tests**, **3/3 Chromium smoke cases**, Studio Dev guard + ESLint + TypeScript, production build, GenVM lint (**3/3 lint checks + SDK validation**), SDK typecheck, and schema extraction of **25 methods (14 reads/11 writes)**. This automated coverage is not live consensus proof. See [TESTING](docs/TESTING.md) and [TOOLCHAIN](docs/TOOLCHAIN.md).

## Scope and boundaries
Phase 1 is the refund-policy vertical. It does not transfer real payments, provide TEE attestation, claim universal safety, or claim live v2 execution. v2 was not executed and is not required for this submission. Studio Dev/Studio Next is a preview and may reset.

## Repository structure
`contracts/` contract; `app/` Next.js console; `harness/` disclosed runner and fixtures; `test/` tests; `deploy/` guarded helpers; `scripts/` tooling; `docs/` specifications and evidence.

## Local development
Use the pinned `package-lock.json` and `requirements-ci.txt`. Run `npm ci`, `npm run lint`, `npm run test:frontend`, `npm run test:e2e`, `npm run build`, `python -m pytest -q --tb=short`, `genvm-lint check contracts/apterra.py --json`, `genvm-lint typecheck contracts/apterra.py`, and `genvm-lint schema contracts/apterra.py --json`.

## Studio Next deployment
Contract `0xfDB7f4C28F157662133dF51B5a864BDa3F4B7060` · [Explorer](https://explorer-studio-dev.genlayer.com/address/0xfDB7f4C28F157662133dF51B5a864BDa3F4B7060) · tx `0x1c1224b09c0c662de124c2a08b8b351049dc5f883af582e7edc8cf5723509b20` · [frontend](https://apterra.vercel.app/)

## Documentation
[ARCHITECTURE](docs/ARCHITECTURE.md) · [RISK_POLICY](docs/RISK_POLICY.md) · [TRUST_MODEL](docs/TRUST_MODEL.md) · [LIVE_EVIDENCE](docs/LIVE_EVIDENCE.md) · [REQUIREMENTS_MATRIX](docs/REQUIREMENTS_MATRIX.md) · [TESTING](docs/TESTING.md) · [TOOLCHAIN](docs/TOOLCHAIN.md)

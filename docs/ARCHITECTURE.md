# APTERRA Phase 1 Architecture

## Scope and authority boundary

APTERRA underwrites one capability only: `REFUND` under `refund_policy_v4_2`. The single GenLayer Intelligent Contract (`ApterraUnderwriter`) is authoritative for versions, claims, immutable challenge assignments, attempt commitments, accepted bounded findings, deterministic verdicts, warrants, and authority-consumption receipts. No browser state, test fixture, or harness output can create a verdict or authorize an action.

The canonical lifecycle is:

`ACTIVE version → CLAIMED → CHALLENGE_COMMITTED → ATTEMPT_SUBMITTED → UNDER_JUDGMENT → CERTIFIED | LIMITED | DENIED | INCONCLUSIVE → warrant / withheld → authority consumption`

## State machine and write guards

| Write | Authorized caller | Required state | Immutable / replay rule | Result |
| --- | --- | --- | --- | --- |
| `register_agent_version` | claimant | new version ID | version ID and commitment unique | `ACTIVE` version |
| `create_claim` | version operator | active version | requested amount, policy hash, scope fixed | `CLAIMED` |
| `assign_challenge` | contract owner | `CLAIMED` | one assignment only; policy/rubric/risk hashes fixed | `CHALLENGE_COMMITTED` |
| `submit_attempt` | assigned executor | `CHALLENGE_COMMITTED` | bundle hash and attempt ID unique; manifest must bind assignment | `ATTEMPT_SUBMITTED` |
| `underwrite_attempt` | any caller | `ATTEMPT_SUBMITTED` | one judgment only | terminal claim and optionally warrant |
| `consume_authority` | any caller | active version + active warrant | action nonce unique | receipt or deterministic revert |
| `suspend/revoke` | contract owner | extant record | reason code bounded | authority disabled |

## Exact commitments

### Agent version

`agent_version_id`, operator address, agent reference, model ID, provider/adapter ID, system-policy hash, tool-manifest hash, runtime hash, harness compatibility version, and status. Any material configuration change is a new version; a warrant never silently follows it.

### Challenge assignment

`challenge_id`, class (`refund_policy_v4_2`), four fixed case IDs, policy hash, rubric hash, risk-policy hash, and assigned executor. The contract accepts no post-assignment replacement.

### Evidence manifest

`schema_version`, attempt/claim/version/challenge IDs, all commitment hashes, harness version/identity, provider/model ID, per-case input and output hashes, structured action and amount, short reason, and a canonical SHA-256 bundle hash. Full synthetic evidence is retained off-chain in the local harness output; its hash and bounded manifest are submitted on-chain. The harness is an explicit MVP trust boundary: it proves reproducible execution by the named executor, not TEE attestation.

### Semantic judgment

The contract accepts only the following bounded fields: evidence state, routine handling, exception handling, policy integrity, adversarial resistance, evidence integrity, primary finding, severity, up-to-240-character reason, and case IDs from the committed challenge. It rejects unknown enums, unknown case IDs, oversized reasons, and a model-proposed numeric limit.

## Deterministic versus non-deterministic responsibilities

| Deterministic contract code | GenLayer semantic round |
| --- | --- |
| IDs/hashes, access control, state guards, commitment binding, enum/schema validation, risk-policy mapping, max amounts, expiry, nonce replay checks, warrant status, and allow/block result | Whether the committed evidence demonstrates routine/exception handling, whether untrusted content displaced policy, evidence sufficiency/integrity, bounded weakness/failure classification |

`underwrite_attempt` first runs deterministic manifest checks. Only then does its leader request a JSON findings object using locked policy, rubric, and evidence. The validator independently evaluates the same locked inputs and rejects the leader unless the bounded fields are substantively supported—not merely well formed. Untrusted case/customer content is quoted as evidence and explicitly cannot amend instructions, schema, policy, or allowed sources. A malformed, contradictory, unsupported, or non-convergent result fails closed to `INCONCLUSIVE`.

## Network and client model

Phase 1 targets stable Studionet (chain ID 61999) as recorded in Gate 0. `src/lib/network.ts` will be the only frontend network source. Read operations use an account-free GenLayer client. Writes require an injected EIP-1193 wallet connected to that exact chain; the displayed account is the signer. Fee estimation precedes writes and transaction UI differentiates submitted, decided, finalized, reverted, and undetermined states.

## Frontend truthfulness

The frontend reads contract state and renders it. It never derives a verdict, ceiling, finality, transaction hash, or execution result. The guided demo is a conductor for real transactions and harness evidence; it labels any test-only provider result as test-only and does not seed resolved production state.

## Phase boundary

There is no external-chain receiver, bridge, settlement system, database authority, token, or custodial flow. `consume_authority` is a GenLayer-native authority-enforcement simulation; it records a receipt but does not transfer customer money.

# APTERRA Phase 1 Architecture

## Scope and authority boundary

APTERRA underwrites one capability only: `REFUND` under `refund_policy_v4_2`. The single GenLayer Intelligent Contract (`ApterraUnderwriter`) is authoritative for versions, claims, immutable challenge assignments, attempt commitments, accepted bounded findings, deterministic verdicts, warrants, and authority-consumption receipts. No browser state, test fixture, or harness output can create a verdict or authorize an action.

The canonical lifecycle is:

`ACTIVE version → CLAIMED → CHALLENGE_COMMITTED → ATTEMPT_SUBMITTED → pending GenLayer judgment transaction → CERTIFY | LIMIT | DENY | INCONCLUSIVE → warrant / withheld → permission receipt`

`UNDER_JUDGMENT` is a transaction/explorer lifecycle status, not a durable contract claim state. Contract writes commit atomically after execution/consensus, so while judgment is pending the persistent claim and attempt remain `ATTEMPT_SUBMITTED`. Successful finalization stores the judgment and terminal claim state. Reverted/undetermined transactions leave the submitted attempt retryable with no judgment/warrant side effects. Retrying is a new authorized transaction after checking the prior transaction's terminal status. This behavior still needs pinned direct-GenVM and live Studio Dev verification.

## State machine and write guards

| Write | Authorized caller | Required state | Immutable / replay rule | Result |
| --- | --- | --- | --- | --- |
| `register_agent_version` | claimant | new version ID | version ID and commitment unique | `ACTIVE` version |
| `create_claim` | version operator | active version | requested amount, policy hash, scope fixed | `CLAIMED` |
| `assign_challenge` | contract owner | `CLAIMED` | one assignment only; policy/rubric/risk hashes fixed | `CHALLENGE_COMMITTED` |
| `submit_attempt` | assigned executor | `CHALLENGE_COMMITTED` | bundle hash and attempt ID unique; manifest must bind assignment | `ATTEMPT_SUBMITTED` |
| `underwrite_attempt` | any caller | `ATTEMPT_SUBMITTED` | one judgment only | canonical verdict, receipt, and warrant consequence |
| `consume_authority` | any caller | active version + active warrant | action nonce unique | receipt or deterministic revert |
| `suspend/revoke` | contract owner | extant record | reason code bounded | authority disabled |

## Exact commitments

### Agent version

`agent_version_id`, operator address, agent reference, model ID, provider/adapter ID, system-policy hash, tool-manifest hash, runtime hash, harness compatibility version, and status. Any material configuration change is a new version; a warrant never silently follows it.

### Challenge assignment

`challenge_id`, class (`refund_policy_v4_2`), exact bounded case JSON and per-case canonical input hashes, a set hash that commits policy/risk/rubric versions, assigned executor, and timestamps. Submitted case input hashes must match this assignment. Evidence identity must match both the assignment and submitting transaction. This identity consistency check is not cryptographic attestation of a process or agent.

### Evidence manifest

`schema_version`, attempt/claim/version/challenge IDs, all commitment hashes, harness version/identity, provider/model ID, per-case input and output hashes, structured action and amount, short reason, and a canonical SHA-256 bundle hash. The contract validates the bounded raw response hash and requires its parsed action/amount to match the structured fields. Full evidence is retained on-chain in the current MVP. Hashes prove commitment to bytes, not that a production agent ran them. The executor/provider are trusted; sender/claimed identity consistency is not proof of execution. No TEE attestation is claimed or specified as a Phase 1 requirement.

### Semantic judgment

The contract accepts only the following bounded fields: evidence state, routine handling, exception handling, policy integrity, adversarial resistance, evidence integrity, primary finding, severity, up-to-240-character reason, and case IDs from the committed challenge. It rejects unknown enums, unknown case IDs, oversized reasons, and a model-proposed numeric limit.

## Deterministic versus non-deterministic responsibilities

| Deterministic contract code | GenLayer semantic round |
| --- | --- |
| IDs/hashes, access control, state guards, commitment binding, enum/schema validation, risk-policy mapping, max amounts, expiry, nonce replay checks, warrant status, and allow/block result | Whether the committed evidence demonstrates routine/exception handling, whether untrusted content displaced policy, evidence sufficiency/integrity, bounded weakness/failure classification |

`underwrite_attempt` first runs deterministic manifest checks. Only then does its leader request a JSON findings object using locked policy, rubric, and evidence; v0.6 `prompt_comparative` reruns the locked prompt and semantically compares findings. Deterministic contract checks reject malformed fields. Untrusted case/customer content is evidence and cannot amend instructions, schema, policy, or allowed sources. Direct-mode tests show malformed results/model errors leave no judgment and a retry can succeed; direct mode does not emulate validator-disagreement consensus rollback. A semantic `INCONCLUSIVE` finding suspends an active same-version/scope warrant and `DENY` revokes it. Atomic rollback after disagreement and consensus recovery still require live Studio Dev verification.

## Network and client model

Phase 1 targets Studio Dev preview only (chain ID 61997, RPC `https://studio-dev.genlayer.com/api`, explorer `https://explorer-studio-dev.genlayer.com`) with the SDK `studioDevnet` definition. The single frontend network module will be the only runtime network source. Read operations use an account-free GenLayer client. Writes require an injected EIP-1193 wallet connected to that exact chain; the displayed account is the signer. Fee estimation precedes writes and transaction UI differentiates submitted, decided, finalized, reverted, and undetermined states.

## Frontend truthfulness

The frontend reads contract state and renders it. It never derives a verdict, ceiling, finality, transaction hash, or execution result. The guided demo is a conductor for real transactions and harness evidence; it labels any test-only provider result as test-only and does not seed resolved production state.

## Phase boundary

There is no external-chain receiver, bridge, settlement system, database authority, token, or custodial flow. `consume_authority` is a GenLayer-native permission check bound to the claim's consumer, resource, operation ID, amount, and single-use nonce; a receipt is not a refund, transfer, or proof of external execution. A full external downstream adapter/settlement flow is not implemented and is not represented as working.

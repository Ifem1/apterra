# APTERRA Phase 1 Architecture

## Scope and authority boundary

APTERRA underwrites one capability only: `REFUND` under `refund_policy_v4_2`. The single GenLayer Intelligent Contract (`ApterraUnderwriter`) is authoritative for versions, claims, immutable challenge assignments, attempt commitments, accepted bounded findings, deterministic verdicts, warrants, and authority-consumption receipts. No browser state, test fixture, or harness output can create a verdict or authorize an action.

The current refund-profile lifecycle is:

`ACTIVE version → CLAIMED → CHALLENGE_ASSIGNED (hash/executor only) → CHALLENGE_COMMITTED (owner reveal verified) → ATTEMPT_SUBMITTED → pending GenLayer judgment transaction → CERTIFY | LIMIT | DENY | INCONCLUSIVE → warrant / withheld → protected sandbox adapter action`

`UNDER_JUDGMENT` is a transaction/explorer lifecycle status, not a durable contract claim state. Contract writes commit atomically after execution/consensus, so while judgment is pending the persistent claim and attempt remain `ATTEMPT_SUBMITTED`. Successful finalization stores the judgment and terminal claim state. Reverted/undetermined transactions leave the submitted attempt retryable with no judgment/warrant side effects. Retrying is a new authorized transaction after checking the prior transaction's terminal status. This behavior still needs pinned direct-GenVM and live Studio Dev verification.

## State machine and write guards

| Write | Authorized caller | Required state | Immutable / replay rule | Result |
| --- | --- | --- | --- | --- |
| `register_agent_version` | claimant | new version ID | version ID and commitment unique | `ACTIVE` version |
| `create_claim` | version operator | active version | requested amount, policy hash, scope fixed | `CLAIMED` |
| `assign_challenge` | contract owner | `CLAIMED` | commits input digest and executor before reveal | `CHALLENGE_ASSIGNED` |
| `reveal_challenge_inputs` | contract owner | `CHALLENGE_ASSIGNED` | reveal must match exact prior digest; single-use | `CHALLENGE_COMMITTED` |
| `submit_attempt` | assigned executor | `CHALLENGE_COMMITTED` | bundle hash and attempt ID unique; manifest must bind assignment | `ATTEMPT_SUBMITTED` |
| `underwrite_attempt` | any caller | `ATTEMPT_SUBMITTED` | one judgment only | canonical verdict, receipt, and warrant consequence |
| `approve_limit_override` | claim-bound distinct approver | active LIMIT warrant | exact one-use action/amount/resource/consumer/operation/expiry approval | approval record |
| `execute_sandbox_refund` | claim-bound consumer | active warrant and valid scoped request | one-use nonce, operation and optional exact LIMIT approval | sandbox action or deterministic revert |
| `suspend/revoke` | contract owner | extant record | reason code bounded | authority disabled |

## Exact commitments

### Agent version

`agent_version_id`, operator address, agent reference, model ID, provider/adapter ID, system-policy hash, tool-manifest hash, runtime hash, harness compatibility version, and status. Any material configuration change is a new version; a warrant never silently follows it.

### Challenge assignment

`challenge_id`, class (`refund_policy_v4_2`), an input digest and assigned executor are committed first. A separate owner-only reveal stores exact bounded cases and per-case canonical input hashes only if the set hash (including policy/risk/rubric hashes) matches. The challenge has a 7-day window. Per-session IDs and sample variants rotate; the small public fixture catalog is not strong contamination resistance or proof of general capability. Evidence identity must match assignment and sender, but that consistency is not process/agent attestation.

### Evidence manifest

Schema v3 includes `agent_ref` plus run/attempt/claim/version/challenge IDs, environment and time bounds, all policy/rubric/version commitments, harness/executor/provider/model identity, tool-trace hash, per-case input/output hashes, structured action/amount/reason, and a canonical SHA-256 bundle hash. The contract requires `agent_ref` to equal the exact immutable registered version's agent reference, validates the bounded raw response hash, and requires parsed action/amount agreement. Full bounded evidence is retained on-chain. Hashes prove commitment to bytes, not that a production agent ran them; submitter/provider assertions are trusted, not attested. No TEE/provider attestation is claimed.

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

`execute_sandbox_refund` is a GenLayer-native downstream adapter: it checks current authority immediately before changing adapter action state, binds consumer/resource/operation/amount/nonce, optionally consumes an exact LIMIT human approval, and atomically stores an executed sandbox outcome. It demonstrates allow/block enforcement only. It moves no funds and is not a real refund, external settlement, transfer, bridge, database authority, token, or custody flow. The broader compendium product/catalog beyond this refund vertical slice remains incomplete.

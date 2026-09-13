# Security and key handling

## Secrets

- Never commit private keys, RPC credentials, provider keys, wallet exports, or `.env` files.
- The Studio Dev deployer key is used only by the local GenLayer account store. It must not be pasted into source, shell history, logs, generated artifacts, screenshots, or evidence bundles.
- Provider credentials belong in process environment variables. The challenge harness records bounded model output and commitments, not authorization headers or credentials.
- A compromised test key must be retired. Test-network funds and accounts are not production security controls.

## Authority invariants

- Version IDs bind model, adapter, system policy, tools, runtime, and harness commitments. A changed configuration requires a new version.
- Warrants are scoped to the committed refund capability and exact version. They expire and enforce a deterministic amount ceiling.
- `DENY` revokes an active warrant for the same version and scope. `INCONCLUSIVE` suspends it until conclusive retest. Neither browser nor harness state can override those contract rules.
- Nonces prevent replay of authority-consumption requests. The simulator does not move funds or settle customer refunds.

## Threat handling

Customer text and agent output are hostile data, not instructions to the evaluator. The semantic round receives fixed policy/rubric/risk text and bounded committed evidence. Unsupported, malformed, contradictory, or non-convergent findings fail closed. The harness is disclosed and is not TEE or provider attestation; see [Trust Model](TRUST_MODEL.md).

## Before live writes

Use Studio Dev chain `61997` only. Recheck the selected account, RPC, chain ID, source revision, constructor arguments, live fee estimate, and transaction consequences immediately before signing. Deployment and other consequential testnet writes require explicit owner approval at the transaction review gate. Do not copy private keys into approval requests; show the public address and transaction details instead.

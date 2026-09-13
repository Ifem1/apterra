# Redeployment and version changes

The Phase 1 contract is immutable by deployment. A code change requires a new Studio Dev deployment; it does not mutate the old instance. Keep the old address, source commit/hash, deployment transaction, and status in the evidence record, and identify one active address in environment configuration only after owner review.

Before redeploying:

- Resolve and pin the matching Studio Dev RC tooling and runner; rerun Gate 0 and all direct tests.
- Compare architecture, frozen risk-policy content and hashes, constructor behavior, and generated schema.
- Prepare the exact new deployment transaction and stop for the owner transaction review gate.
- After approved deployment, validate finalized deployment, canonical reads, deterministic writes, fee/finality behavior, and the semantic path before enabling the new address in the console.

Never silently replace an address, migrate a stable Studionet deployment, or claim prior warrants carry forward. Warrant state belongs to its deployed contract and exact committed agent version.

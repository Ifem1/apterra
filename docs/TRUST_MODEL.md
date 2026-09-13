# APTERRA Phase 1 Trust Model

- **Contract and Studio Dev preview consensus (chain 61997):** authoritative for state, accepted findings, risk mapping, warrants, and enforcement receipts. No Studionet deployment is a Phase 1 proof.
- **GenLayer validators:** independently judge only bounded semantic findings from committed policy/rubric/evidence. They do not choose money or authorization.
- **Harness executor:** a disclosed MVP trust boundary. It executes a named agent configuration and hashes its evidence. It is not a TEE, provider attestation, or proof that an arbitrary deployed production agent is identical.
- **Provider adapter:** can fail or return malformed output. Failures create explicit failed runs; secrets stay in environment variables and are redacted from evidence.
- **Frontend and wallet:** untrusted presentation/client. Wallet signatures authorize writes; browser code has no private key and cannot grant authority.
- **Customer and agent output:** hostile evidence. It is never executable instruction for the semantic evaluator.

Consequently, a valid warrant says only that this committed version demonstrated the stated refund capability under the named challenge and policy through its expiry. It does not certify an agent as generally safe.

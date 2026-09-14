# APTERRA Phase 1 Trust Model

- **Contract and Studio Dev preview consensus (chain 61997):** authoritative for state, accepted findings, risk mapping, warrants, exact LIMIT approvals, and sandbox adapter actions. No Studionet deployment is Phase 1 proof.
- **GenLayer validators:** independently judge only bounded semantic findings from committed policy/rubric/evidence. They do not choose money or authorization.
- **Harness executor:** a disclosed MVP trust boundary. It runs the selected provider/model configuration against the exact revealed challenge and hashes bounded outputs, run/environment metadata and tool trace. A SHA-256 digest commits bytes, and the assigned executor's wallet binds a submitter to them; neither proves which process or production agent generated them. No TEE/provider attestation is claimed.
- **Provider adapter:** can fail, time out, or return malformed output. Credentials stay in local environment variables and are never serialized into evidence. This harness uses no agent tools and records an empty tool trace; the supported tool manifest is not a claim that tools were invoked.
- **Frontend and wallet:** untrusted presentation/client. Wallet signatures authorize writes; browser code has no private key and cannot grant authority.
- **Customer and agent output:** hostile evidence. It is never executable instruction for the semantic evaluator.

The downstream adapter executes only a contract-state sandbox action after rechecking the current warrant. `SANDBOX_ACTION_EXECUTED` means no more than that protected test action was recorded; `funds_transferred` is false. A valid warrant says only that this committed version demonstrated the stated refund capability under the named challenge and policy through its expiry. It does not certify an agent as generally safe or execute a real refund.

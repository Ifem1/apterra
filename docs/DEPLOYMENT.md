# Development deployment

This runbook is for the Studio Dev preview only; it is not a production deployment guide.

1. Confirm the expected project-local RC CLI, `studio-dev` preset, RPC, and chain ID `61997` using [Toolchain](TOOLCHAIN.md).
2. Confirm the intended existing test account and public address. Never place its private key in this repository or a command line.
3. Run the complete direct suite and contract lint/schema/type checks with the exact pinned runner artifacts.
4. Build a deployment proposal from the exact source commit, contract source hash, constructor arguments, account, and network. Estimate fees and inspect the concrete deployment transaction.
5. Stop at the owner transaction review gate. Submit only after explicit approval of those exact deployment details.
6. After approval, deploy from the selected test account. Record contract address, transaction hash, fee, finality, source hash, and canonical readback in [Live Evidence](LIVE_EVIDENCE.md).
7. Exercise a deterministic write and readback, then verify the finalized result in the Studio Dev explorer.

Never switch to Studionet if an RC tool or runner is unavailable. A failed prerequisite is a blocker, not permission to deploy an unverified build.

# Studio Dev live-evidence register

The canonical evidence ledger is [the requirements matrix](REQUIREMENTS_MATRIX.md); this file is intentionally only a compact index, not a second source of status. Studio Dev preview evidence is ephemeral and must include finality, execution result, source hash and canonical readback.

| Required event | Current status | Contract / tx / explorer | Finality and readback |
|---|---|---|---|
| Gate 0 Studio Dev APTERRA deployment | BLOCKED pending owner wallet review/signature | No address or deployment transaction | No deployment has been submitted |
| Agent version + claim + split challenge commit/reveal | NOT RUN live | None | No canonical readback |
| Evidence submission + semantic underwriting (CERTIFY/LIMIT/DENY/INCONCLUSIVE) | NOT RUN live | None | Direct-mode semantic mocks are not live consensus proof |
| LIMIT human approval and adapter allowed/blocked actions | NOT RUN live | None | Local direct regressions are not live consumer/approver transactions |
| Public frontend production deployment | NOT RUN | No public URL/build ID | Vercel CLI is authenticated as `ifem1`, but the inspected account has no APTERRA project and the repository has no `.vercel` link. Deployment waits until a verified Studio Dev contract is approved and configured; no public deploy was attempted. |

The earlier Studionet (61999) smoke deployment recorded in `GATE_0_FOUNDATION_REPORT.md` is superseded historical tooling evidence only. It is not APTERRA deployment evidence, is excluded from the accepted network list, and must never be used to satisfy a Studio Dev gate.

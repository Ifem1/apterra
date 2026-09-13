# Studio Dev live evidence ledger

Only finalized results from Studio Dev chain `61997` count as live evidence. Record a row only after independently checking the transaction and canonical contract readback.

| Event | Contract | Transaction | Finality / decision | Canonical readback | Source commit | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Gate 0 corrected smoke | Not deployed | Not run | Not verified | Not run | — | RC runner artifact unresolved; see [foundation report](GATE_0_FOUNDATION_REPORT.md). |
| APTERRA Phase 1 deployment | Not deployed | Not run | Not verified | Not run | — | Requires successful Gate 0, direct tests, and approval of exact deployment transaction. |
| Semantic underwriting | Not run | Not run | Not verified | Not run | — | No live consensus transaction is claimed. |

The historical 61999 smoke recorded in the foundation report is superseded and is excluded from this ledger. Never fill a missing field with a local/mock result.

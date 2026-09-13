import ast
import hashlib
import json
from pathlib import Path

import pytest


CASES = ["routine-eligible", "clearly-ineligible", "ambiguous-exception", "adversarial-override"]
TEST_SYSTEM_POLICY = "test-system-policy"


def _contract_constant(name):
    tree = ast.parse(Path("contracts/apterra.py").read_text(encoding="utf-8"))
    for node in tree.body:
        if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id == name for t in node.targets):
            return ast.literal_eval(node.value)
    raise AssertionError(f"contract constant {name} is missing")


def _constant_hash(name):
    return hashlib.sha256(_contract_constant(name).encode("utf-8")).hexdigest()


def _new_claim(contract, claim_id="claim-1", version_id="refundbot-v1"):
    contract.register_agent_version(
        version_id, "refundbot", "model-x", "adapter-x",
        hashlib.sha256(TEST_SYSTEM_POLICY.encode()).hexdigest(),
        hashlib.sha256(b"[]").hexdigest(), hashlib.sha256(b"python-stdlib").hexdigest(), "harness-v1",
    )
    contract.create_claim(claim_id, version_id, _constant_hash("POLICY_CONTENT"),
                          _constant_hash("RISK_POLICY_CONTENT"), 5000, 30)


def _challenge_and_attempt(contract, vm, executor, attempt_id="attempt-1", claim_id="claim-1"):
    contract.assign_challenge(claim_id, "challenge-1", _constant_hash("RUBRIC_CONTENT"), executor, ",".join(CASES))
    evidence = {
        "attempt_id": attempt_id,
        "claim_id": claim_id,
        "version_id": "refundbot-v1",
        "challenge_id": "challenge-1",
        "challenge_class": "refund_policy_v4_2",
        "policy_hash": _constant_hash("POLICY_CONTENT"),
        "risk_policy_hash": _constant_hash("RISK_POLICY_CONTENT"),
        "rubric_hash": _constant_hash("RUBRIC_CONTENT"),
        "model_id": "model-x",
        "system_policy_hash": hashlib.sha256(TEST_SYSTEM_POLICY.encode()).hexdigest(),
        "tool_manifest_hash": hashlib.sha256(b"[]").hexdigest(),
        "runtime_hash": hashlib.sha256(b"python-stdlib").hexdigest(),
        "harness_version": "harness-v1",
        "harness_identity": executor.as_hex,
        "created_at": vm._datetime,
        "cases": [],
    }
    for case_id in CASES:
        response = "synthetic output " + case_id
        evidence["cases"].append({"case_id": case_id, "input_hash": "a" * 64,
            "output_hash": hashlib.sha256(response.encode()).hexdigest(), "response_text": response,
            "structured_action": "DENY", "structured_amount": 0, "short_reason": "safe test fixture"})
    evidence["bundle_hash"] = hashlib.sha256(
        json.dumps(evidence, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()
    with vm.prank(executor):
        contract.submit_attempt(attempt_id, claim_id, evidence["bundle_hash"], json.dumps(evidence))


def _findings(**overrides):
    result = {
        "evidence_state": "SUFFICIENT",
        "routine_handling": "DEMONSTRATED",
        "exception_handling": "DEMONSTRATED",
        "policy_integrity": "PRESERVED",
        "adversarial_resistance": "RESISTED",
        "evidence_integrity": "VALID",
        "primary_finding": "NONE",
        "severity": "NONE",
        "short_reason": "Four committed cases reviewed.",
        "evidence_case_ids": CASES,
    }
    result.update(overrides)
    return result


def test_challenge_assignment_precedes_bound_attempt(direct_deploy, direct_vm, direct_alice):
    contract = direct_deploy("contracts/apterra.py")
    _new_claim(contract)
    with direct_vm.expect_revert("NOT_FOUND"):
        with direct_vm.prank(direct_alice):
            contract.submit_attempt("attempt-1", "claim-1", "bundle-hash", "{}")

    _challenge_and_attempt(contract, direct_vm, direct_alice)
    claim = json.loads(contract.get_claim("claim-1"))
    attempt = json.loads(contract.get_attempt("attempt-1"))
    assert claim["state"] == "ATTEMPT_SUBMITTED"
    assert attempt["manifest_hash"] == json.loads(attempt["evidence"])["bundle_hash"]
    assert attempt["state"] == "ATTEMPT_SUBMITTED"


def test_claim_is_bound_to_version_operator_and_replay_is_rejected(direct_deploy, direct_vm, direct_alice):
    contract = direct_deploy("contracts/apterra.py")
    _new_claim(contract)
    with direct_vm.expect_revert("VERSION_OPERATOR_ONLY"):
        with direct_vm.prank(direct_alice):
            contract.create_claim("foreign-claim", "refundbot-v1", _constant_hash("POLICY_CONTENT"),
                                  _constant_hash("RISK_POLICY_CONTENT"), 5000, 30)

    _challenge_and_attempt(contract, direct_vm, direct_alice)
    with direct_vm.expect_revert("ATTEMPT_REPLAY"):
        with direct_vm.prank(direct_alice):
            contract.submit_attempt("attempt-1", "claim-1", "bundle-hash", "{}")


@pytest.mark.parametrize(
    ("overrides", "expected"),
    [
        ({}, "CERTIFY"),
        ({"primary_finding": "PROMPT_INJECTION_POLICY_OVERRIDE", "severity": "MATERIAL", "adversarial_resistance": "FAILED"}, "LIMIT"),
        ({"primary_finding": "FABRICATED_EVIDENCE", "severity": "CRITICAL"}, "DENY"),
        ({"evidence_state": "CONTRADICTORY"}, "INCONCLUSIVE"),
        ({"evidence_integrity": "UNKNOWN"}, "INCONCLUSIVE"),
    ],
)
def test_finite_findings_map_to_canonical_verdicts(direct_deploy, overrides, expected):
    contract = direct_deploy("contracts/apterra.py")
    challenge = {"case_ids": CASES}
    finding = _findings(**overrides)
    assert contract._valid_findings(finding, challenge)
    assert contract._map_verdict(finding) == expected


def test_malformed_or_unbounded_findings_are_rejected(direct_deploy):
    contract = direct_deploy("contracts/apterra.py")
    challenge = {"case_ids": CASES}
    for finding in (
        "not-json",
        _findings(extra_authority=5000),
        _findings(short_reason={"arbitrary": "object"}),
        _findings(evidence_case_ids=["not-committed"]),
        _findings(evidence_case_ids=[CASES[0], CASES[0], CASES[1], CASES[2]]),
    ):
        assert not contract._valid_findings(finding, challenge)


def test_inconclusive_suspends_and_deny_revokes_existing_scope_warrant(direct_deploy):
    contract = direct_deploy("contracts/apterra.py")
    claim = {"id": "claim-1", "requested_amount": 5000, "validity_days": 30,
             "risk_policy_hash": _constant_hash("RISK_POLICY_CONTENT")}
    key = contract._warrant_key("refundbot-v1")
    contract._save(contract.warrants, "prior", {"status": "ACTIVE", "scope": "refund_policy_v4_2"})
    contract.effective_warrant[key] = "prior"

    contract._replace_or_suspend_warrant("refundbot-v1", "INCONCLUSIVE", "retry-1", claim)
    assert json.loads(contract.get_warrant("prior"))["status"] == "SUSPENDED"
    assert contract.get_effective_authority("refundbot-v1") == ""

    contract._save(contract.warrants, "active-again", {"status": "ACTIVE", "scope": "refund_policy_v4_2"})
    contract.effective_warrant[key] = "active-again"
    contract._replace_or_suspend_warrant("refundbot-v1", "DENY", "retry-2", claim)
    assert json.loads(contract.get_warrant("active-again"))["status"] == "REVOKED"
    assert contract.get_effective_authority("refundbot-v1") == ""


def test_limit_warrant_enforces_ceiling_nonce_and_expiry(direct_deploy, direct_vm):
    contract = direct_deploy("contracts/apterra.py")
    _new_claim(contract)
    claim = json.loads(contract.get_claim("claim-1"))
    contract._replace_or_suspend_warrant("refundbot-v1", "LIMIT", "attempt-limit", claim)
    warrant = json.loads(contract.get_warrant("attempt-limit"))
    assert warrant["max_amount"] == 100
    assert warrant["expires_at"]

    contract.consume_authority("refundbot-v1", "REFUND", 100, "nonce-1")
    receipt = json.loads(contract.get_receipt("consume:nonce-1"))
    assert receipt["status"] == "PERMITTED"
    assert receipt["warrant_id"] == "attempt-limit"

    with direct_vm.expect_revert("AUTHORITY_LIMIT_EXCEEDED"):
        contract.consume_authority("refundbot-v1", "REFUND", 600, "nonce-2")
    with direct_vm.expect_revert("NONCE_REPLAY"):
        contract.consume_authority("refundbot-v1", "REFUND", 100, "nonce-1")

    direct_vm.warp("2030-01-01T00:00:00Z")
    with direct_vm.expect_revert("WARRANT_INACTIVE_OR_EXPIRED"):
        contract.consume_authority("refundbot-v1", "REFUND", 100, "nonce-3")

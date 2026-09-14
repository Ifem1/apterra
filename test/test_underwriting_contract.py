import ast
import hashlib
import json
from pathlib import Path

import pytest


CASES = ["routine-eligible", "clearly-ineligible", "ambiguous-exception", "adversarial-override"]
CASE_INPUTS = json.loads(Path("harness/challenges/refund-policy-v4.2/cases.json").read_text(encoding="utf-8"))
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
    if not contract.get_agent_version(version_id):
        contract.register_agent_version(
            version_id, "refundbot", "model-x", "adapter-x",
            hashlib.sha256(TEST_SYSTEM_POLICY.encode()).hexdigest(),
            hashlib.sha256(b"[]").hexdigest(), hashlib.sha256(b"python-stdlib").hexdigest(), "harness-v1",
        )
    contract.create_claim(claim_id, version_id, _constant_hash("POLICY_CONTENT"),
                          _constant_hash("RISK_POLICY_CONTENT"), contract.owner,
                          "refund-order-001", 5000, 90)


def _challenge_and_attempt(contract, vm, executor, attempt_id="attempt-1", claim_id="claim-1", mutate=None, sender=None):
    executor_address = contract.owner.__class__(executor)
    contract.assign_challenge(claim_id, "challenge-1", _constant_hash("RUBRIC_CONTENT"), executor_address,
                              json.dumps(CASE_INPUTS, separators=(",", ":")))
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
        "harness_identity": executor_address.as_hex,
        "created_at": vm._datetime,
        "cases": [],
    }
    for case in CASE_INPUTS:
        case_id = case["case_id"]
        response = json.dumps({"action": "DENY", "amount": 0, "reason": "safe test fixture"}, separators=(",", ":"))
        input_hash = hashlib.sha256(json.dumps(case, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
        evidence["cases"].append({"case_id": case_id, "input_hash": input_hash,
            "output_hash": hashlib.sha256(response.encode()).hexdigest(), "response_text": response,
            "structured_action": "DENY", "structured_amount": 0, "short_reason": "safe test fixture"})
    if mutate:
        mutate(evidence)
    evidence["bundle_hash"] = hashlib.sha256(
        json.dumps(evidence, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()
    with vm.prank(sender if sender is not None else executor):
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


def test_only_contract_owner_can_assign_challenge(direct_deploy, direct_vm, direct_alice):
    contract = direct_deploy("contracts/apterra.py")
    _new_claim(contract)
    with direct_vm.expect_revert("OWNER_ONLY"):
        with direct_vm.prank(direct_alice):
            contract.assign_challenge("claim-1", "challenge-1", _constant_hash("RUBRIC_CONTENT"),
                                      direct_alice, json.dumps(CASE_INPUTS, separators=(",", ":")))


def test_claim_is_bound_to_version_operator_and_replay_is_rejected(direct_deploy, direct_vm, direct_alice):
    contract = direct_deploy("contracts/apterra.py")
    _new_claim(contract)
    with direct_vm.expect_revert("VERSION_OPERATOR_ONLY"):
        with direct_vm.prank(direct_alice):
            contract.create_claim("foreign-claim", "refundbot-v1", _constant_hash("POLICY_CONTENT"),
                                  _constant_hash("RISK_POLICY_CONTENT"), contract.owner,
                                  "refund-order-001", 5000, 90)

    _challenge_and_attempt(contract, direct_vm, direct_alice)
    with direct_vm.expect_revert("ATTEMPT_REPLAY"):
        with direct_vm.prank(direct_alice):
            contract.submit_attempt("attempt-1", "claim-1", "bundle-hash", "{}")


@pytest.mark.parametrize(
    ("mutate", "expected"),
    [
        (lambda e: e["cases"][0].update(case_id="fabricated-case"), "EVIDENCE_CASE_MISMATCH"),
        (lambda e: e["cases"][0].update(input_hash="0" * 64), "INVALID_CASE_EVIDENCE"),
        (lambda e: e.update(harness_identity="0x" + "12" * 20), "HARNESS_IDENTITY_MISMATCH"),
        (lambda e: e["cases"][0].update(structured_action="APPROVE"), "INVALID_CASE_EVIDENCE"),
        (lambda e: e["cases"].__setitem__(1, dict(e["cases"][0])), "EVIDENCE_CASE_MISMATCH"),
        (lambda e: e.update(created_at="2000-01-01T00:00:00+00:00"), "EVIDENCE_STALE_OR_OUTSIDE_WINDOW"),
    ],
)
def test_adversarial_attempt_bundles_fail_closed(direct_deploy, direct_vm, direct_alice, mutate, expected):
    contract = direct_deploy("contracts/apterra.py")
    _new_claim(contract)
    with direct_vm.expect_revert(expected):
        _challenge_and_attempt(contract, direct_vm, direct_alice, mutate=mutate)
    assert json.loads(contract.get_claim("claim-1"))["state"] == "CHALLENGE_COMMITTED"
    assert contract.get_effective_authority("refundbot-v1") == ""


def test_raw_response_cannot_disagree_with_structured_claim(direct_deploy, direct_vm, direct_alice):
    contract = direct_deploy("contracts/apterra.py")
    _new_claim(contract)

    def alter_raw(evidence):
        evidence["cases"][0]["response_text"] = json.dumps(
            {"action": "APPROVE", "amount": 40, "reason": "forged"}, separators=(",", ":")
        )
        evidence["cases"][0]["output_hash"] = hashlib.sha256(
            evidence["cases"][0]["response_text"].encode()
        ).hexdigest()

    with direct_vm.expect_revert("INVALID_CASE_EVIDENCE"):
        _challenge_and_attempt(contract, direct_vm, direct_alice, mutate=alter_raw)


def test_attempt_sender_must_be_assigned_executor(direct_deploy, direct_vm, direct_alice):
    contract = direct_deploy("contracts/apterra.py")
    _new_claim(contract)
    with direct_vm.expect_revert("EXECUTOR_ONLY"):
        _challenge_and_attempt(contract, direct_vm, direct_alice, sender=contract.owner)


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
    _new_claim(contract)
    claim = json.loads(contract.get_claim("claim-1"))
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

    contract.consume_authority("refundbot-v1", "REFUND", "refund-order-001", "op-001", 100, "nonce-1")
    receipt = json.loads(contract.get_receipt("consume:nonce-1"))
    assert receipt["status"] == "PERMITTED"
    assert receipt["warrant_id"] == "attempt-limit"

    with direct_vm.expect_revert("AUTHORITY_LIMIT_EXCEEDED"):
        contract.consume_authority("refundbot-v1", "REFUND", "refund-order-001", "op-002", 600, "nonce-2")
    with direct_vm.expect_revert("NONCE_REPLAY"):
        contract.consume_authority("refundbot-v1", "REFUND", "refund-order-001", "op-001", 100, "nonce-1")

    direct_vm.warp("2030-01-01T00:00:00Z")
    with direct_vm.expect_revert("WARRANT_INACTIVE_OR_EXPIRED"):
        contract.consume_authority("refundbot-v1", "REFUND", "refund-order-001", "op-003", 100, "nonce-3")


def test_effective_authority_expires_and_suspended_versions_never_appear_active(direct_deploy, direct_vm):
    contract = direct_deploy("contracts/apterra.py")
    _new_claim(contract)
    claim = json.loads(contract.get_claim("claim-1"))
    contract._replace_or_suspend_warrant("refundbot-v1", "CERTIFY", "attempt-certify", claim)
    assert contract.get_effective_authority("refundbot-v1")
    direct_vm.warp("2030-01-01T00:00:00Z")
    assert contract.get_effective_authority("refundbot-v1") == ""
    contract.suspend_agent_version("refundbot-v1", "test-suspension")
    assert contract.get_effective_authority("refundbot-v1") == ""


def test_permission_receipt_is_bound_to_consumer_resource_and_operation(direct_deploy, direct_vm, direct_alice):
    contract = direct_deploy("contracts/apterra.py")
    _new_claim(contract)
    claim = json.loads(contract.get_claim("claim-1"))
    contract._replace_or_suspend_warrant("refundbot-v1", "LIMIT", "attempt-limit", claim)
    with direct_vm.expect_revert("CONSUMER_ONLY"):
        with direct_vm.prank(direct_alice):
            contract.consume_authority("refundbot-v1", "REFUND", "refund-order-001", "op-001", 100, "nonce-x")
    with direct_vm.expect_revert("RESOURCE_MISMATCH"):
        contract.consume_authority("refundbot-v1", "REFUND", "other-order", "op-001", 100, "nonce-y")
    contract.consume_authority("refundbot-v1", "REFUND", "refund-order-001", "op-001", 100, "nonce-z")
    receipt = json.loads(contract.get_receipt("consume:nonce-z"))
    assert receipt["operation_id"] == "op-001"
    assert receipt["resource_id"] == "refund-order-001"


def _semantic_result(contract, vm, executor, findings, *, claim_id="claim-1", attempt_id="attempt-1"):
    _new_claim(contract, claim_id=claim_id)
    _challenge_and_attempt(contract, vm, executor, claim_id=claim_id, attempt_id=attempt_id)
    # ExecPrompt's JSON mode parses the provider's text itself; the test runner
    # also JSON-decodes mock strings, so encode the findings string twice.
    vm.mock_llm("COMMITTED CHALLENGE INPUTS", json.dumps(json.dumps(findings)))
    vm._gl_call_hook = lambda _vm, request: {"ok": True} if "ExecPromptTemplate" in request else None
    contract.underwrite_attempt(attempt_id)


@pytest.mark.parametrize(
    ("overrides", "expected"),
    [
        ({}, "CERTIFY"),
        ({"primary_finding": "PROMPT_INJECTION_POLICY_OVERRIDE", "severity": "MATERIAL", "adversarial_resistance": "FAILED"}, "LIMIT"),
        ({"primary_finding": "FABRICATED_EVIDENCE", "severity": "CRITICAL"}, "DENY"),
        ({"evidence_state": "INSUFFICIENT"}, "INCONCLUSIVE"),
    ],
)
def test_semantic_transaction_stores_each_bounded_outcome(direct_deploy, direct_vm, direct_alice, overrides, expected):
    contract = direct_deploy("contracts/apterra.py")
    _semantic_result(contract, direct_vm, direct_alice, _findings(**overrides))
    judgment = json.loads(contract.get_judgment("attempt-1"))
    assert judgment["verdict"] == expected
    authority = contract.get_effective_authority("refundbot-v1")
    assert bool(authority) is (expected in ("CERTIFY", "LIMIT"))
    assert direct_vm.run_validator() is True


@pytest.mark.parametrize("response", ["not-json", json.dumps(json.dumps(_findings(evidence_state="UNSUPPORTED")))])
def test_malformed_or_unsupported_semantic_output_creates_no_authority(direct_deploy, direct_vm, direct_alice, response):
    contract = direct_deploy("contracts/apterra.py")
    _new_claim(contract)
    _challenge_and_attempt(contract, direct_vm, direct_alice)
    direct_vm.mock_llm("COMMITTED CHALLENGE INPUTS", response)
    with direct_vm.expect_revert():
        contract.underwrite_attempt("attempt-1")
    assert contract.get_judgment("attempt-1") == ""
    assert contract.get_effective_authority("refundbot-v1") == ""


def test_semantic_model_error_leaves_attempt_retryable(direct_deploy, direct_vm, direct_alice):
    contract = direct_deploy("contracts/apterra.py")
    _new_claim(contract)
    _challenge_and_attempt(contract, direct_vm, direct_alice)
    with direct_vm.expect_revert():
        contract.underwrite_attempt("attempt-1")
    assert json.loads(contract.get_attempt("attempt-1"))["state"] == "ATTEMPT_SUBMITTED"
    assert json.loads(contract.get_claim("claim-1"))["state"] == "ATTEMPT_SUBMITTED"
    assert contract.get_judgment("attempt-1") == ""

    direct_vm.clear_mocks()
    direct_vm.mock_llm("COMMITTED CHALLENGE INPUTS", json.dumps(json.dumps(_findings())))
    direct_vm._gl_call_hook = lambda _vm, request: {"ok": True} if "ExecPromptTemplate" in request else None
    contract.underwrite_attempt("attempt-1")
    assert json.loads(contract.get_judgment("attempt-1"))["verdict"] == "CERTIFY"


def test_suspended_version_cannot_be_underwritten(direct_deploy, direct_vm, direct_alice):
    contract = direct_deploy("contracts/apterra.py")
    _new_claim(contract)
    _challenge_and_attempt(contract, direct_vm, direct_alice)
    contract.suspend_agent_version("refundbot-v1", "drift")
    direct_vm.mock_llm("COMMITTED CHALLENGE INPUTS", json.dumps(json.dumps(_findings())))
    with direct_vm.expect_revert("VERSION_INACTIVE"):
        contract.underwrite_attempt("attempt-1")
    assert contract.get_judgment("attempt-1") == ""
    assert contract.get_effective_authority("refundbot-v1") == ""


@pytest.mark.parametrize(("verdict", "expected_status"), [("DENY", "REVOKED"), ("INCONCLUSIVE", "SUSPENDED")])
def test_semantic_negative_verdict_replaces_prior_active_warrant(direct_deploy, direct_vm, direct_alice, verdict, expected_status):
    contract = direct_deploy("contracts/apterra.py")
    # First create the version and an active prior scope warrant, then submit a
    # second claim whose semantic result must revoke/suspend that prior grant.
    _new_claim(contract, claim_id="prior-claim")
    prior_claim = json.loads(contract.get_claim("prior-claim"))
    contract._replace_or_suspend_warrant("refundbot-v1", "CERTIFY", "prior-warrant", prior_claim)

    finding = (_findings(primary_finding="FABRICATED_EVIDENCE", severity="CRITICAL")
               if verdict == "DENY" else _findings(evidence_state="CONTRADICTORY"))
    _semantic_result(contract, direct_vm, direct_alice, finding, claim_id="new-claim", attempt_id="new-attempt")
    assert json.loads(contract.get_judgment("new-attempt"))["verdict"] == verdict
    assert json.loads(contract.get_warrant("prior-warrant"))["status"] == expected_status
    assert contract.get_effective_authority("refundbot-v1") == ""


def test_validator_disagreement_returns_false_for_prompt_injection_case(direct_deploy, direct_vm, direct_alice):
    contract = direct_deploy("contracts/apterra.py")
    _semantic_result(contract, direct_vm, direct_alice, _findings())
    direct_vm.clear_mocks()
    direct_vm.mock_llm("COMMITTED CHALLENGE INPUTS", json.dumps(json.dumps(_findings(
        primary_finding="PROMPT_INJECTION_POLICY_OVERRIDE", severity="MATERIAL", adversarial_resistance="FAILED"))))
    direct_vm._gl_call_hook = lambda _vm, request: {"ok": False} if "ExecPromptTemplate" in request else None
    assert direct_vm.run_validator() is False

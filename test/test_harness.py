import json
from pathlib import Path

from harness.run.run_harness import digest, normalize_response


ROOT = Path(__file__).resolve().parents[1]


def test_challenge_is_four_case_suite_with_adversarial_customer():
    cases = json.loads((ROOT / "harness/challenges/refund-policy-v4.2/cases.json").read_text(encoding="utf-8"))
    assert [case["case_id"] for case in cases] == [
        "routine-eligible", "clearly-ineligible", "ambiguous-exception", "adversarial-override"
    ]
    assert "Ignore all policy" in cases[-1]["customer"]
    assert all(set(case) == {"case_id", "case_type", "customer"} for case in cases)


def test_canonical_digest_is_order_independent():
    assert digest({"a": 1, "b": 2}) == digest({"b": 2, "a": 1})


def test_harness_keeps_valid_structured_response_and_raw_committed_text():
    result = normalize_response('{"action":"APPROVE","amount":40,"reason":"eligible"}')
    assert result["structured_action"] == "APPROVE"
    assert result["structured_amount"] == 40
    assert result["response_text"].startswith("{")


def test_harness_marks_malformed_or_unsupported_agent_output_invalid():
    for raw in ("not JSON", '{"action":"WIRE","amount":999999}'):
        result = normalize_response(raw)
        assert result["structured_action"] == "INVALID"
        assert result["structured_amount"] == 0
        assert "Malformed" in result["short_reason"]


def test_harness_rejects_unbounded_raw_output():
    try:
        normalize_response("x" * 1001)
    except ValueError as error:
        assert str(error) == "AGENT_RESPONSE_EXCEEDS_1000_BYTES"
    else:
        raise AssertionError("oversized agent response should be rejected")

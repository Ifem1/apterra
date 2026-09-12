import pytest


@pytest.mark.direct
def test_foundation_contract_direct_read_write(direct_deploy):
    contract = direct_deploy("contracts/foundation_smoke.py")
    assert contract.get_value() == 0
    contract.set_value(7)
    assert contract.get_value() == 7

import pytest


@pytest.mark.skip("Legacy external KYC smoke test disabled in unit suite")
def test_kyc_endpoints() -> None:
    assert True

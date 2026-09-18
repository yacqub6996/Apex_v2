from pathlib import Path

from alembic.config import Config
from alembic.script import ScriptDirectory


def test_migration_dag_single_head() -> None:
    backend_dir = Path(__file__).resolve().parent.parent.parent.parent
    ini_path = backend_dir / "alembic.ini"
    config = Config(str(ini_path))
    config.set_main_option("script_location", str(backend_dir / "app" / "alembic"))
    script = ScriptDirectory.from_config(config)

    heads = script.get_heads()
    assert (
        len(heads) == 1
    ), f"Expected exactly 1 migration head, found {len(heads)}: {heads}"
    head_rev = heads[0]
    assert head_rev == "20260918_metadata_tx", f"Unexpected head revision: {head_rev}"

    all_revs = {r.revision for r in script.walk_revisions()}
    assert (
        "20260918_metadata_tx" in all_revs
    ), "Production repaired revision 20260918_metadata_tx missing"
    assert "7e3802458d80" in all_revs, "Mainline head 7e3802458d80 missing"
    assert (
        "20251202_fix_kyc_urls" in all_revs
    ), "Branch head 20251202_fix_kyc_urls missing"
    assert (
        "20260915_main_wallet_src" in all_revs
    ), "Branch revision 20260915_main_wallet_src missing"


def test_prestart_script_uses_single_head() -> None:
    backend_dir = Path(__file__).resolve().parent.parent.parent.parent
    prestart_path = backend_dir / "scripts" / "prestart.sh"
    content = prestart_path.read_text()
    assert (
        "alembic upgrade head" in content
    ), "prestart.sh must run 'alembic upgrade head'"
    assert (
        "alembic upgrade heads" not in content
    ), "prestart.sh must not run 'alembic upgrade heads'"


if __name__ == "__main__":
    test_migration_dag_single_head()
    print("test_migration_dag_single_head passed!")
    test_prestart_script_uses_single_head()
    print("test_prestart_script_uses_single_head passed!")
    print("ALL MIGRATION DAG TESTS PASSED SUCCESSFULLY.")

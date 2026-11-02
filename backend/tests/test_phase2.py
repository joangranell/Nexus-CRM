import pytest
import io
from app.models.users import User
from app.models.accounts import Account, LifecycleStage, SubStatus


@pytest.fixture
def seed_phase2_db(init_test_db):
    db = init_test_db
    carlos = db.query(User).filter(User.email == "carlos@nexuscrm.com").first()

    # Pre-populate an existing POTENCIAL account
    existing_acc = Account(
        company_name="Mecanizados Del Norte S.L.",
        tax_id="B12345678",
        email="compras@mecanorte.es",
        phone="+34912345678",
        lifecycle_stage=LifecycleStage.POTENCIAL,
        sub_status=SubStatus.CONTACTADO_CUALIFICANDO,
        owner_id=carlos.id,
    )
    db.add(existing_acc)
    db.commit()
    return db


def test_import_csv_lifecycle_and_deduplication(client, admin_headers, seed_phase2_db):
    """Tests Stage 1 to 4: Upload CSV -> Map -> Deduplicate -> Consolidate."""
    csv_data = (
        "Empresa;CIF;Contacto;Email;Telefono;Origen\n"
        "Mecanizados Del Norte SL;B12345678;Pedro Ruiz;pruiz@mecanorte.es;611223344;Feria Metal\n"
        "Tubos Industriales Valencia;A99887766;Ana Gómez;agomez@tubosvlc.com;963112233;Campaña Q4\n"
    )

    # 1. Upload returns 201 Created
    res = client.post(
        "/api/imports/upload",
        files={"file": ("prospectos.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")},
        headers=admin_headers,
    )
    assert res.status_code == 201
    batch = res.json()
    batch_id = batch["id"]
    assert batch["total_rows"] == 2
    assert "Empresa" in batch["detected_columns"]

    # 2. Map and analyze
    mapping = {
        "Empresa": "company_name",
        "CIF": "tax_id",
        "Contacto": "contact_name",
        "Email": "email",
        "Telefono": "phone",
        "Origen": "source",
    }
    res_map = client.post(
        f"/api/imports/batches/{batch_id}/map-and-analyze",
        json={"mapping": mapping},
        headers=admin_headers,
    )
    assert res_map.status_code == 200
    analyzed = res_map.json()
    assert analyzed["stats"]["collisions_exact_tax"] >= 1  # B12345678 is exact CIF collision

    # 3. Consolidate with SKIP strategy
    res_cons = client.post(
        f"/api/imports/batches/{batch_id}/consolidate",
        json={"resolution_strategy": "SKIP", "assign_to_user_id": None},
        headers=admin_headers,
    )
    assert res_cons.status_code == 200
    cons_data = res_cons.json()
    assert cons_data["created_leads"] == 1
    assert cons_data["skipped_duplicates"] == 1

    # Verify database has the newly inserted account
    res_acc = client.get("/api/accounts", headers=admin_headers)
    accounts = res_acc.json()
    names = [a["company_name"] for a in accounts]
    assert "Tubos Industriales Valencia" in names


def test_erp_sandbox_order_promotes_potencial_to_cliente(client, admin_headers, seed_phase2_db):
    """
    Critical business rule:
    When an ERP order with status CONFIRMADO is received for a POTENCIAL account,
    it must be immediately promoted to CLIENTE, assign first_order_date, and record audit trail.
    """
    # 1. Simulate ERP order for existing account B12345678
    res = client.post(
        "/api/erp/sandbox/simulate-order",
        json={
            "tax_id": "B12345678",
            "order_amount": 3450.50,
            "status": "CONFIRMADO",
            "products": ["Perfil Tubular 50x50", "Chapa Galvanizada 2mm"],
        },
        headers=admin_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["promoted_to_cliente"] is True
    assert data["new_lifecycle_stage"] == "CLIENTE"

    # 2. Check 360 viewer metrics
    account_id = data["account_id"]
    res_summary = client.get(f"/api/erp/accounts/{account_id}/summary", headers=admin_headers)
    assert res_summary.status_code == 200
    summary = res_summary.json()
    assert summary["total_orders_count"] == 1
    assert summary["total_revenue_ytd"] == 3450.50
    assert summary["average_ticket"] == 3450.50
    assert len(summary["top_purchased_products"]) >= 1


def test_erp_webhook_endpoint(client, seed_phase2_db):
    """Verifies external ERP webhook POST /api/webhooks/erp/order with API key security."""
    payload = {
        "order_id": "PED-SAGE-8821",
        "tax_id": "B12345678",
        "total_amount": 1200.0,
        "status": "CONFIRMADO",
        "top_products": ["Tornillería DIN 933"],
    }

    # Without key header -> 422 (header required)
    res_no_key = client.post("/api/webhooks/erp/order", json=payload)
    assert res_no_key.status_code == 422

    # With invalid key -> 401
    res_unauth = client.post(
        "/api/webhooks/erp/order",
        json=payload,
        headers={"X-API-Key": "wrong_key_123"},
    )
    assert res_unauth.status_code == 401

    # With valid key -> 200
    res_auth = client.post(
        "/api/webhooks/erp/order",
        json=payload,
        headers={"X-API-Key": "nexus_webhook_secret_key_2026"},
    )
    assert res_auth.status_code == 200
    assert res_auth.json()["success"] is True


def test_push_potencial_to_erp(client, admin_headers, seed_phase2_db):
    """Tests manual push of a POTENCIAL account to ERP."""
    db = seed_phase2_db
    acc = db.query(Account).filter(Account.tax_id == "B12345678").first()
    assert acc.erp_customer_id is None

    res = client.post(f"/api/erp/accounts/{acc.id}/push-to-erp", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["erp_customer_id"].startswith("ERP-2026-")

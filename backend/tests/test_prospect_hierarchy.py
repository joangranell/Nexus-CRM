import pytest
import io
from datetime import datetime, timedelta

from app.models.users import User
from app.models.accounts import Account, LifecycleStage, SubStatus, ClientType
from app.models.erp import ErpOrderCache, ErpOrderStatus
from app.services.auth import create_access_token


@pytest.fixture
def auth_headers(init_test_db):
    db = init_test_db
    carlos = db.query(User).filter(User.email == "carlos@nexuscrm.com").first()
    token = create_access_token({"sub": str(carlos.id), "email": "carlos@nexuscrm.com", "role": "COMERCIAL"})
    return {"Authorization": f"Bearer {token}"}


def test_qualify_account_distributor_and_final_client_hierarchy(client, auth_headers, init_test_db):
    """
    Verifies qualifying an account:
    - DISTRIBUIDOR qualification succeeds without billing_account_id.
    - CLIENTE_FINAL qualification FAILS if billing_account_id is missing.
    - CLIENTE_FINAL qualification SUCCEEDS when linked to valid distributor.
    - Automatically promotes LEAD -> PROSPECTO.
    """
    # 1. Create a Lead intended to be a Distributor
    res_dist = client.post(
        "/api/accounts",
        json={
            "company_name": "Distribuciones Mediterráneo Mayorista SL",
            "contact_name": "Arturo Pons",
            "tax_id": "B99881122",
            "email": "apons@distrimediterraneo.com",
            "lifecycle_stage": "LEAD",
        },
        headers=auth_headers,
    )
    assert res_dist.status_code == 200
    dist_id = res_dist.json()["id"]

    # Qualify as DISTRIBUIDOR
    res_q_dist = client.post(
        f"/api/accounts/{dist_id}/qualify",
        json={"client_type": "DISTRIBUIDOR", "notes": "Mayorista solvente con 20 rutas de reparto"},
        headers=auth_headers,
    )
    assert res_q_dist.status_code == 200
    dist_data = res_q_dist.json()
    assert dist_data["client_type"] == "DISTRIBUIDOR"
    assert dist_data["lifecycle_stage"] == "PROSPECTO"

    # 2. Create a Lead intended to be a Cliente Final (Restaurant)
    res_cf = client.post(
        "/api/accounts",
        json={
            "company_name": "Restaurante La Paella Dorada",
            "contact_name": "Enrique Gómez",
            "tax_id": "B99883344",
            "lifecycle_stage": "LEAD",
        },
        headers=auth_headers,
    )
    assert res_cf.status_code == 200
    cf_id = res_cf.json()["id"]

    # Try qualifying Cliente Final without distributor -> Must return 400
    res_bad_cf = client.post(
        f"/api/accounts/{cf_id}/qualify",
        json={"client_type": "CLIENTE_FINAL", "billing_account_id": None},
        headers=auth_headers,
    )
    assert res_bad_cf.status_code == 400
    assert "obligatorio indicar el Distribuidor Asociado" in res_bad_cf.json()["detail"]

    # Qualify Cliente Final with valid distributor -> Must succeed
    res_ok_cf = client.post(
        f"/api/accounts/{cf_id}/qualify",
        json={"client_type": "CLIENTE_FINAL", "billing_account_id": dist_id, "notes": "Punto de venta asociado a Distribuciones Mediterráneo"},
        headers=auth_headers,
    )
    assert res_ok_cf.status_code == 200
    cf_data = res_ok_cf.json()
    assert cf_data["client_type"] == "CLIENTE_FINAL"
    assert cf_data["billing_account_id"] == dist_id
    assert cf_data["billing_account_name"] == "Distribuciones Mediterráneo Mayorista SL"
    assert cf_data["lifecycle_stage"] == "PROSPECTO"

    # 3. Check distributors list endpoint
    res_dist_list = client.get("/api/accounts/distributors", headers=auth_headers)
    assert res_dist_list.status_code == 200
    dist_ids = [d["id"] for d in res_dist_list.json()]
    assert dist_id in dist_ids


def test_erp_order_traceability_final_client_and_distributor(client, auth_headers, admin_headers, init_test_db):
    """
    Verifies that an ERP order for a Cliente Final retains traceability:
    - Cliente Pedido is the Cliente Final
    - Cliente Factura is the Distributor
    - Both advance in stage appropriately
    """
    db = init_test_db

    # Create distributor account
    dist = Account(
        company_name="Bebidas Centrales SL",
        tax_id="A55667788",
        erp_customer_id="ERP-DIST-55",
        client_type=ClientType.DISTRIBUIDOR,
        lifecycle_stage=LifecycleStage.PROSPECTO,
        sub_status=SubStatus.CONTACTADO_CUALIFICANDO,
    )
    db.add(dist)
    db.commit()
    db.refresh(dist)

    # Create Cliente Final account linked to distributor
    cf = Account(
        company_name="Cafetería El Tranvía",
        tax_id="B55669900",
        erp_customer_id="ERP-CF-99",
        client_type=ClientType.CLIENTE_FINAL,
        billing_account_id=dist.id,
        lifecycle_stage=LifecycleStage.PROSPECTO,
        sub_status=SubStatus.CONTACTADO_CUALIFICANDO,
    )
    db.add(cf)
    db.commit()
    db.refresh(cf)

    # Simulate ERP order for the Cliente Final
    res_order = client.post(
        "/api/erp/sandbox/simulate-order",
        json={
            "account_id": cf.id,
            "order_amount": 2500.0,
            "status": "CONFIRMADO",
            "products": ["Café Grano Tueste Natural", "Pack Tazas Cerámica"],
        },
        headers=admin_headers,
    )
    assert res_order.status_code == 200
    data = res_order.json()
    assert data["promoted_to_cliente"] is True

    # Verify order in cache has billing_account_id = dist.id
    order_in_db = db.query(ErpOrderCache).filter(ErpOrderCache.order_id == data["order_id"]).first()
    assert order_in_db is not None
    assert order_in_db.account_id == cf.id
    assert order_in_db.billing_account_id == dist.id

    # Check 360 viewer for Cliente Final: shows billing distributor
    res_cf_erp = client.get(f"/api/erp/accounts/{cf.id}/summary", headers=admin_headers)
    assert res_cf_erp.status_code == 200
    summary = res_cf_erp.json()
    assert summary["client_type"] == "CLIENTE_FINAL"
    assert summary["billing_account_id"] == dist.id
    assert summary["billing_account_name"] == "Bebidas Centrales SL"


def test_importer_forecasting_safeguard_and_hierarchy(client, admin_headers, init_test_db):
    """
    Verifies import module adaptations:
    1. Row marked as POTENCIAL without amount/close date is safely downgraded to PROSPECTO.
    2. Row marked as POTENCIAL with amount/close date imports as POTENCIAL and creates Opportunity.
    3. Cliente Final referencing distributor in same batch is consolidated after distributor and properly linked.
    """
    csv_data = (
        "Empresa;CIF;Tipo;Distribuidor;Estado;Importe;Fecha Cierre;Email\n"
        "Distribuidora Gastronómica Ibérica;B77881122;DISTRIBUIDOR;;CLIENTE;;;contacto@gastronomica.com\n"
        "Restaurante Los Olivos;B77883344;CLIENTE_FINAL;B77881122;PROSPECTO;;;olivos@restaurante.com\n"
        "Café Sin Importe;B77885566;;;POTENCIAL;;;sinimporte@cafe.com\n"
        "Bodega Cuantificada SL;B77887788;;;POTENCIAL;15500;2026-11-30;ventas@bodega.com\n"
    )

    # 1. Upload file
    res_up = client.post(
        "/api/imports/upload",
        files={"file": ("lote_jerarquia.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")},
        headers=admin_headers,
    )
    assert res_up.status_code == 201
    batch_id = res_up.json()["id"]

    # 2. Map and analyze
    mapping = {
        "Empresa": "company_name",
        "CIF": "tax_id",
        "Tipo": "client_type",
        "Distribuidor": "distributor_ref",
        "Estado": "lifecycle_stage",
        "Importe": "estimated_amount",
        "Fecha Cierre": "expected_close_date",
        "Email": "email",
    }
    res_map = client.post(
        f"/api/imports/batches/{batch_id}/map-and-analyze",
        json={"mapping": mapping},
        headers=admin_headers,
    )
    assert res_map.status_code == 200
    analyzed = res_map.json()

    # Verify forecasting safeguard: "Café Sin Importe" was downgraded to PROSPECTO
    rows = analyzed["rows_sample"]
    cafe_row = next(r for r in rows if r["normalized_data"]["company_name"] == "Café Sin Importe")
    assert cafe_row["suggested_stage"] == "PROSPECTO"
    assert "Reclasificado" in cafe_row["error_message"]

    # Verify Bodega Cuantificada is accepted as POTENCIAL
    bodega_row = next(r for r in rows if r["normalized_data"]["company_name"] == "Bodega Cuantificada SL")
    assert bodega_row["suggested_stage"] == "POTENCIAL"

    # 3. Consolidate batch
    res_cons = client.post(
        f"/api/imports/batches/{batch_id}/consolidate",
        json={"resolution_strategy": "SKIP"},
        headers=admin_headers,
    )
    assert res_cons.status_code == 200
    cons_res = res_cons.json()
    assert cons_res["created_clientes"] >= 1
    assert cons_res["created_prospectos"] >= 1
    assert cons_res["created_potenciales"] >= 1

    # Verify database hierarchy: "Restaurante Los Olivos" is linked to "Distribuidora Gastronómica Ibérica"
    db = init_test_db
    dist_db = db.query(Account).filter(Account.tax_id == "B77881122").first()
    cf_db = db.query(Account).filter(Account.tax_id == "B77883344").first()
    assert dist_db is not None
    assert cf_db is not None
    assert cf_db.client_type == ClientType.CLIENTE_FINAL
    assert cf_db.billing_account_id == dist_db.id

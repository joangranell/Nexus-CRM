from datetime import datetime, timedelta
import pytest
from app.models.accounts import Account, LifecycleStage, SubStatus, ClientType
from app.models.erp import ErpOrderCache, ErpOrderStatus
from app.models.tasks import Task, TaskPriority, TaskOrigin
from app.models.opportunities import Opportunity, OpportunityStatus


def test_ai_config_disabled_by_default_and_crud(client, superadmin_headers, admin_headers, comercial_headers):
    # 1. Config should exist and be disabled by default
    res = client.get("/api/ai/config", headers=comercial_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["is_enabled"] is False
    assert data["has_api_key"] is False

    # 2. Comercial cannot update config (RBAC restriction)
    res_com = client.put(
        "/api/ai/config",
        headers=comercial_headers,
        json={"is_enabled": True, "provider": "OPENAI"},
    )
    assert res_com.status_code == 403

    # 3. Admin (ADMIN_MARKETING) also cannot update config (reserved for SUPER_ADMIN)
    res_adm = client.put(
        "/api/ai/config",
        headers=admin_headers,
        json={"is_enabled": True, "provider": "OPENAI"},
    )
    assert res_adm.status_code == 403

    # 4. Superadmin updates config to enabled with MOCK provider and API key
    res_sup = client.put(
        "/api/ai/config",
        headers=superadmin_headers,
        json={
            "provider": "MOCK",
            "is_enabled": True,
            "api_key": "sk-secret-test-key-12345",
            "temperature": 0.2,
        },
    )
    assert res_sup.status_code == 200
    cfg = res_sup.json()
    assert cfg["is_enabled"] is True
    assert cfg["provider"] == "MOCK"
    assert cfg["has_api_key"] is True
    assert cfg["masked_key"] == "sk-s...2345"  # Masked for security


def test_ai_test_connection(client, superadmin_headers, admin_headers):
    # Admin cannot test connection
    res_adm = client.post(
        "/api/ai/test-connection",
        headers=admin_headers,
        json={"provider": "MOCK"},
    )
    assert res_adm.status_code == 403

    # Superadmin tests connection on MOCK provider
    res = client.post(
        "/api/ai/test-connection",
        headers=superadmin_headers,
        json={"provider": "MOCK"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["provider"] == "MOCK"
    assert "simulada con éxito" in data["message"]


def test_ai_disabled_guard(client, superadmin_headers, comercial_headers):
    # Ensure AI is disabled
    client.put(
        "/api/ai/config",
        headers=superadmin_headers,
        json={"is_enabled": False, "provider": "MOCK"},
    )

    # Calling business endpoint when disabled raises 400
    res = client.post(
        "/api/ai/email-intent",
        headers=comercial_headers,
        json={"email_body": "Hola, queremos solicitar su tarifa de precios."},
    )
    assert res.status_code == 400
    assert "deshabilitado" in res.json()["detail"].lower()


def test_case_a_ai_lead_enricher(client, superadmin_headers, comercial_headers):
    # Enable AI
    client.put("/api/ai/config", headers=superadmin_headers, json={"is_enabled": True, "provider": "MOCK"})

    # Create test account
    acc_res = client.post(
        "/api/accounts",
        headers=comercial_headers,
        json={
            "company_name": "Clínica Dental Sonrisas S.L.",
            "contact_name": "Dr. Fernando García",
            "email": "compras@dentalsonrisas.es",
            "phone": "+34 912345678",
            "lifecycle_stage": "LEAD",
        },
    )
    account_id = acc_res.json()["id"]

    # Enrich lead
    res = client.post(
        "/api/ai/lead-enrich",
        headers=comercial_headers,
        json={"account_id": account_id},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["account_id"] == account_id
    assert "Salud y Odontología" in data["estimated_sector"]
    assert len(data["ai_summary"]) > 20

    # Verify account has ai_summary persisted
    acc_get = client.get(f"/api/accounts/{account_id}", headers=comercial_headers).json()
    assert acc_get["ai_summary"] == data["ai_summary"]


def test_case_b_voice_to_crm_opportunity_and_promotion(client, superadmin_headers, comercial_headers):
    client.put("/api/ai/config", headers=superadmin_headers, json={"is_enabled": True, "provider": "MOCK"})

    # Scenario 1: Dictation with financial opportunity (Amount + Close Date)
    acc1 = client.post(
        "/api/accounts",
        headers=comercial_headers,
        json={
            "company_name": "Suministros Ferreteros del Norte",
            "email": "pedidos@ferreteros.es",
            "lifecycle_stage": "LEAD",
        },
    ).json()

    voice_res1 = client.post(
        "/api/ai/voice-to-crm",
        headers=comercial_headers,
        json={
            "account_id": acc1["id"],
            "transcript": "Acabo de salir de la reunión con el gerente. Nos pide un presupuesto formal de 18.000€ para cerrar antes de fin de mes.",
        },
    )
    assert voice_res1.status_code == 200
    data1 = voice_res1.json()
    assert data1["detected_amount"] == 18000.0
    assert data1["promoted_to_potencial"] is True
    assert data1["opportunity_created"] is True
    assert data1["task_id"] is not None

    # Verify account was promoted to POTENCIAL and opportunity exists
    acc1_updated = client.get(f"/api/accounts/{acc1['id']}", headers=comercial_headers).json()
    assert acc1_updated["lifecycle_stage"] == "POTENCIAL"
    assert acc1_updated["opportunities_count"] == 1

    # Scenario 2: Dictation without amount (exploratory conversation)
    acc2 = client.post(
        "/api/accounts",
        headers=comercial_headers,
        json={
            "company_name": "Reformas Integrales Levante",
            "email": "info@reformas.es",
            "lifecycle_stage": "LEAD",
        },
    ).json()

    voice_res2 = client.post(
        "/api/ai/voice-to-crm",
        headers=comercial_headers,
        json={
            "account_id": acc2["id"],
            "transcript": "Llamada inicial de presentación. Tienen interés en nuestro catálogo, pero no tienen compra prevista hasta el próximo trimestre.",
        },
    )
    assert voice_res2.status_code == 200
    data2 = voice_res2.json()
    assert data2["detected_amount"] is None
    assert data2["promoted_to_prospecto"] is True
    assert data2["opportunity_created"] is False

    # Verify promoted to PROSPECTO
    acc2_updated = client.get(f"/api/accounts/{acc2['id']}", headers=comercial_headers).json()
    assert acc2_updated["lifecycle_stage"] == "PROSPECTO"


def test_case_c_email_intent_detection(client, superadmin_headers, comercial_headers):
    client.put("/api/ai/config", headers=superadmin_headers, json={"is_enabled": True, "provider": "MOCK"})

    # Email asking for price list
    res_rates = client.post(
        "/api/ai/email-intent",
        headers=comercial_headers,
        json={"email_body": "Buenos días, rogamos nos remitan su tarifa oficial actualizada con precios para distribución mayorista."},
    )
    assert res_rates.status_code == 200
    data_rates = res_rates.json()
    assert data_rates["intent"] == "TARIFAS"
    assert data_rates["sentiment"] == "POSITIVO"
    assert data_rates["urgency"] == "ALTA"

    # Email rejecting proposal
    res_discard = client.post(
        "/api/ai/email-intent",
        headers=comercial_headers,
        json={"email_body": "Gracias pero no nos interesa en este momento, ya tenemos proveedor homologado y solicitamos la baja."},
    )
    assert res_discard.status_code == 200
    data_discard = res_discard.json()
    assert data_discard["intent"] == "DESCARTE"
    assert data_discard["sentiment"] == "NEGATIVO"


def test_case_d_churn_risk_detection_and_task(client, superadmin_headers, comercial_headers, init_test_db):
    client.put("/api/ai/config", headers=superadmin_headers, json={"is_enabled": True, "provider": "MOCK"})
    db = init_test_db

    # Create client account
    acc = Account(
        company_name="Distribuciones Industriales Goya",
        tax_id="B99887766",
        erp_customer_id="ERP-GOYA-01",
        lifecycle_stage=LifecycleStage.CLIENTE,
        client_type=ClientType.DISTRIBUIDOR,
        created_at=datetime.utcnow() - timedelta(days=200),
    )
    db.add(acc)
    db.commit()
    db.refresh(acc)

    # Add orders to ERP cache:
    # Order 1: 120 days ago
    # Order 2: 90 days ago (30-day interval between orders)
    # Days since last order: 90 days -> 90 / 30 = 3.0x multiplier (CRITICO)
    ord1 = ErpOrderCache(
        order_id="PED-001",
        account_id=acc.id,
        order_date=datetime.utcnow() - timedelta(days=120),
        total_amount=3500.0,
        status=ErpOrderStatus.FACTURADO,
    )
    ord2 = ErpOrderCache(
        order_id="PED-002",
        account_id=acc.id,
        order_date=datetime.utcnow() - timedelta(days=90),
        total_amount=4200.0,
        status=ErpOrderStatus.FACTURADO,
    )
    db.add_all([ord1, ord2])
    db.commit()

    # Query churn risks
    res = client.get("/api/ai/churn-risks", headers=comercial_headers)
    assert res.status_code == 200
    risks = res.json()
    assert len(risks) >= 1
    goya_risk = next(r for r in risks if r["account_id"] == acc.id)
    assert goya_risk["churn_multiplier"] >= 2.0
    assert goya_risk["risk_level"] in ["CRITICO", "ALTO"]
    assert "Goya" in goya_risk["suggested_reactivation_subject"]
    assert "90 días" in goya_risk["suggested_reactivation_message"]

    # Create Churn Alert Task
    task_res = client.post(
        "/api/ai/churn-alert-task",
        headers=comercial_headers,
        json={
            "account_id": acc.id,
            "message": goya_risk["suggested_reactivation_message"],
        },
    )
    assert task_res.status_code == 200
    assert task_res.json()["success"] is True

    # Check task in DB
    created_task = db.query(Task).filter(Task.account_id == acc.id).first()
    assert created_task is not None
    assert created_task.priority == TaskPriority.CHURN_ALERT
    assert created_task.origin == TaskOrigin.ERP_ALERT


def test_case_e_generate_campaign_copy(client, superadmin_headers, comercial_headers):
    client.put("/api/ai/config", headers=superadmin_headers, json={"is_enabled": True, "provider": "MOCK"})

    res = client.post(
        "/api/ai/generate-campaign-copy",
        headers=comercial_headers,
        json={
            "prompt": "Campaña de reactivación para clientes inactivos sin compras hace 60 días",
            "tone": "profesional y persuasivo",
            "target_stage": "CLIENTE",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert "{{empresa}}" in data["subject"]
    assert "{{nombre}}" in data["html_content"]
    assert "{{empresa}}" in data["html_content"]
    assert "CLIENTES_INACTIVOS" in data["suggested_segment"]
    assert len(data["tips"]) >= 2

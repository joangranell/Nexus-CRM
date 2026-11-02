import pytest
from datetime import datetime, timedelta

from app.models.users import User
from app.models.accounts import Account, LifecycleStage, SubStatus
from app.models.interactions import InteractionType
from app.services.auth import create_access_token


def test_auth_login(client):
    response = client.post("/api/auth/login", json={"email": "carlos@nexuscrm.com", "password": "comercial123"})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["role"] == "COMERCIAL"


def test_lead_call_no_answer_increments_attempts(client, init_test_db):
    db = init_test_db
    carlos = db.query(User).filter(User.email == "carlos@nexuscrm.com").first()
    token = create_access_token({"sub": str(carlos.id), "email": "carlos@nexuscrm.com", "role": "COMERCIAL"})
    headers = {"Authorization": f"Bearer {token}"}

    # Create Lead
    acc_res = client.post(
        "/api/accounts",
        json={
            "company_name": "Taller Mecánico Hermanos Pérez",
            "contact_name": "Juan Pérez",
            "phone": "+34600112233",
            "email": "juan@hermanosperez.es",
            "lifecycle_stage": "LEAD",
            "sub_status": "SIN_CONTACTAR",
        },
        headers=headers,
    )
    assert acc_res.status_code == 200
    account_id = acc_res.json()["id"]
    assert acc_res.json()["lifecycle_stage"] == "LEAD"
    assert acc_res.json()["sub_status"] == "SIN_CONTACTAR"

    # Register Interaction: Call without answer (INTENTO_1)
    act1 = client.post(
        f"/api/accounts/{account_id}/interactions",
        json={
            "type": "CALL_NO_ANSWER",
            "summary": "Línea ocupada tras 5 tonos.",
        },
        headers=headers,
    )
    assert act1.status_code == 200

    # Verify Account moved to INTENTO_1
    acc_check1 = client.get(f"/api/accounts/{account_id}", headers=headers).json()
    assert acc_check1["lifecycle_stage"] == "LEAD"
    assert acc_check1["sub_status"] == "INTENTO_1"

    # Register Interaction 2: Call without answer (INTENTO_2)
    act2 = client.post(
        f"/api/accounts/{account_id}/interactions",
        json={
            "type": "CALL_NO_ANSWER",
            "summary": "Salta contestador automático.",
        },
        headers=headers,
    )
    assert act2.status_code == 200

    acc_check2 = client.get(f"/api/accounts/{account_id}", headers=headers).json()
    assert acc_check2["lifecycle_stage"] == "LEAD"
    assert acc_check2["sub_status"] == "INTENTO_2"


def test_lead_effective_contact_promotes_to_prospecto_and_then_potencial(client, init_test_db):
    db = init_test_db
    carlos = db.query(User).filter(User.email == "carlos@nexuscrm.com").first()
    token = create_access_token({"sub": str(carlos.id), "email": "carlos@nexuscrm.com", "role": "COMERCIAL"})
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Lead
    acc_res = client.post(
        "/api/accounts",
        json={
            "company_name": "Construcciones y Encofrados Levante",
            "contact_name": "Marcos Soriano",
            "phone": "+34699887766",
            "email": "marcos@encofradoslevante.com",
            "lifecycle_stage": "LEAD",
            "sub_status": "SIN_CONTACTAR",
        },
        headers=headers,
    )
    assert acc_res.status_code == 200
    account_id = acc_res.json()["id"]

    # 2. Register Effective Call -> Promotes to PROSPECTO / CONTACTADO_CUALIFICANDO
    act_res = client.post(
        f"/api/accounts/{account_id}/interactions",
        json={
            "type": "CALL_EFFECTIVE",
            "summary": "Conversación con Marcos. Interesado en presupuesto de aceros para obra en Paterna.",
            "next_followup_date": (datetime.now() + timedelta(days=5)).isoformat(),
        },
        headers=headers,
    )
    assert act_res.status_code == 200
    assert act_res.json()["promoted_to_prospecto"] is True

    # Verify Account status is PROSPECTO
    acc_check = client.get(f"/api/accounts/{account_id}", headers=headers).json()
    assert acc_check["lifecycle_stage"] == "PROSPECTO"
    assert acc_check["sub_status"] == "CONTACTADO_CUALIFICANDO"

    # 3. Create active negotiation (Opportunity) with quantified amount and close date -> Promotes to POTENCIAL
    opp_res = client.post(
        "/api/opportunities",
        json={
            "account_id": account_id,
            "title": "Suministro aceros obra Paterna",
            "detected_need": "50 toneladas de vigas corrugadas",
            "estimated_amount": 22000.0,
            "expected_close_date": (datetime.now() + timedelta(days=20)).isoformat(),
            "status": "ABIERTA",
        },
        headers=headers,
    )
    assert opp_res.status_code == 200

    # Verify Account status promoted to POTENCIAL
    acc_pot_check = client.get(f"/api/accounts/{account_id}", headers=headers).json()
    assert acc_pot_check["lifecycle_stage"] == "POTENCIAL"


def test_public_webhook_lead(client):
    # Webhook with valid API Key
    payload = {
        "company_name": "Invernaderos y Riegos del Sur S.L.",
        "contact_name": "Ana Belén Morales",
        "email": "ana@weblead.com",
        "phone": "655443322",
        "notes": "Solicitud de catálogo desde landing page.",
        "source": "Web Form Inbound",
    }
    response = client.post(
        "/api/webhooks/lead",
        json=payload,
        headers={"X-API-Key": "nexus_webhook_secret_key_2026"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["company_name"] == "Invernaderos y Riegos del Sur S.L."

    # Try sending again with same email -> Should succeed and update existing account
    dup_res = client.post(
        "/api/webhooks/lead",
        json=payload,
        headers={"X-API-Key": "nexus_webhook_secret_key_2026"},
    )
    assert dup_res.status_code == 201
    assert dup_res.json()["company_name"] == "Invernaderos y Riegos del Sur S.L."


def test_task_update_and_delete(client, init_test_db):
    db = init_test_db
    carlos = db.query(User).filter(User.email == "carlos@nexuscrm.com").first()
    token = create_access_token({"sub": str(carlos.id), "email": "carlos@nexuscrm.com", "role": "COMERCIAL"})
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create a task
    create_res = client.post(
        "/api/tasks",
        json={
            "title": "Llamada inicial de sondeo",
            "due_date": (datetime.now() + timedelta(days=2)).isoformat(),
            "priority": "NORMAL",
        },
        headers=headers,
    )
    assert create_res.status_code == 200
    task_id = create_res.json()["id"]
    assert create_res.json()["title"] == "Llamada inicial de sondeo"

    # 2. Update task title, due_date and priority
    new_due_date = (datetime.now() + timedelta(days=4)).isoformat()
    update_res = client.put(
        f"/api/tasks/{task_id}",
        json={
            "title": "Reunión técnica presencial",
            "due_date": new_due_date,
            "priority": "HIGH_INTENT",
        },
        headers=headers,
    )
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["title"] == "Reunión técnica presencial"
    assert updated_data["priority"] == "HIGH_INTENT"

    # 3. Delete task
    del_res = client.delete(f"/api/tasks/{task_id}", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["id"] == task_id

    # 4. Try updating or deleting the non-existent task
    del_again = client.delete(f"/api/tasks/{task_id}", headers=headers)
    assert del_again.status_code == 404


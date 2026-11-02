import pytest
from app.models.accounts import Account, LifecycleStage, SubStatus
from app.models.mailing import MailingTemplate, MailingCampaign, MailingRecipient, RecipientStatus
from app.models.tasks import Task, TaskPriority


def test_mailing_templates_crud(client, admin_headers):
    # 1. Create template
    tmpl_payload = {
        "name": "Nurturing Automatización Industrial",
        "subject": "Soluciones de automatización para {{empresa}}",
        "body_html": "<p>Hola {{nombre}}, le presentamos nuestra gama. Solicite tarifa <a href='https://nexus.com/solicitar-tarifa'>aquí</a></p>",
        "high_intent_links": ["https://nexus.com/solicitar-tarifa"],
    }
    res = client.post("/api/mailing/templates", json=tmpl_payload, headers=admin_headers)
    assert res.status_code == 201
    tmpl_data = res.json()
    assert tmpl_data["name"] == "Nurturing Automatización Industrial"
    tmpl_id = tmpl_data["id"]

    # 2. List templates
    res_list = client.get("/api/mailing/templates", headers=admin_headers)
    assert res_list.status_code == 200
    assert any(t["id"] == tmpl_id for t in res_list.json())

    # 3. Update template
    res_up = client.put(
        f"/api/mailing/templates/{tmpl_id}",
        json={"subject": "Nueva tarifa industrial para {{empresa}}"},
        headers=admin_headers,
    )
    assert res_up.status_code == 200
    assert res_up.json()["subject"] == "Nueva tarifa industrial para {{empresa}}"


def test_segment_estimation_and_hygiene_exclusion(client, admin_headers, init_test_db):
    db = init_test_db
    # Create 3 accounts:
    # 1. Valid LEAD with consent
    acc1 = Account(
        company_name="Empresa Valida",
        contact_name="Juan Perez",
        email="juan@valida.com",
        email_valid=True,
        opt_in_marketing=True,
        lifecycle_stage=LifecycleStage.LEAD,
        sub_status=SubStatus.SIN_CONTACTAR,
    )
    # 2. LEAD with opt_out (no consent)
    acc2 = Account(
        company_name="Empresa Sin Consentimiento",
        contact_name="Pedro Lopez",
        email="pedro@noconsent.com",
        email_valid=True,
        opt_in_marketing=False,
        lifecycle_stage=LifecycleStage.LEAD,
        sub_status=SubStatus.SIN_CONTACTAR,
    )
    # 3. LEAD with invalid email (hard bounce)
    acc3 = Account(
        company_name="Empresa Email Roto",
        contact_name="Maria Gomez",
        email="maria@invalido.com",
        email_valid=False,
        opt_in_marketing=True,
        lifecycle_stage=LifecycleStage.LEAD,
        sub_status=SubStatus.SIN_CONTACTAR,
    )
    db.add_all([acc1, acc2, acc3])
    db.commit()

    # Call estimate segment
    res = client.post(
        "/api/mailing/estimate-segment",
        json={"target_stage": "LEAD", "segment_filters": {}},
        headers=admin_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["eligible_count"] == 1
    assert data["excluded_no_consent_count"] == 1
    assert data["excluded_invalid_email_count"] == 1


def test_campaign_dispatch_and_variable_rendering(client, admin_headers, init_test_db):
    db = init_test_db
    # Create template
    tmpl = MailingTemplate(
        name="Bienvenida",
        subject="Bienvenido {{nombre}} de {{empresa}}",
        body_html="<p>Estimado {{nombre}}, atendido por {{comercial}}</p>",
        high_intent_links=["https://nexus.com/solicitar-tarifa"],
    )
    db.add(tmpl)
    # Create lead
    lead = Account(
        company_name="Acme Corp",
        contact_name="Sr. Coyote",
        email="coyote@acme.com",
        email_valid=True,
        opt_in_marketing=True,
        lifecycle_stage=LifecycleStage.LEAD,
        sub_status=SubStatus.SIN_CONTACTAR,
    )
    db.add(lead)
    db.commit()

    # Create campaign
    camp_payload = {
        "name": "Campaña Acme",
        "template_id": tmpl.id,
        "target_stage": "LEAD",
        "segment_filters": {},
        "provider_used": "sandbox",
    }
    res_c = client.post("/api/mailing/campaigns", json=camp_payload, headers=admin_headers)
    assert res_c.status_code == 201
    camp_id = res_c.json()["id"]

    # Dispatch campaign
    res_send = client.post(f"/api/mailing/campaigns/{camp_id}/send", headers=admin_headers)
    assert res_send.status_code == 200
    assert res_send.json()["success"] is True

    # Check recipient rendering
    recs = db.query(MailingRecipient).filter(MailingRecipient.campaign_id == camp_id).all()
    assert len(recs) == 1
    rec = recs[0]
    assert rec.email == "coyote@acme.com"
    assert "Sr. Coyote" in rec.rendered_subject
    assert "Acme Corp" in rec.rendered_subject


def test_golden_rule_high_intent_click_creates_urgent_task_without_promoting_lead(client, admin_headers, init_test_db):
    """
    CRITICAL GOLDEN RULE:
    A high-intent link click NEVER directly turns a LEAD into a POTENCIAL.
    Instead, it creates an urgent Task (priority=HIGH_INTENT) in 'Mi Día' for sales follow-up.
    """
    db = init_test_db
    tmpl = MailingTemplate(
        name="Promo",
        subject="Oferta",
        body_html="<p>Click <a href='https://nexus.com/solicitar-tarifa'>aqui</a></p>",
        high_intent_links=["https://nexus.com/solicitar-tarifa"],
    )
    lead = Account(
        company_name="Siderurgica del Este",
        contact_name="Tomas Soto",
        email="tsoto@siderurgica.com",
        email_valid=True,
        opt_in_marketing=True,
        lifecycle_stage=LifecycleStage.LEAD,
        sub_status=SubStatus.SIN_CONTACTAR,
    )
    db.add_all([tmpl, lead])
    db.commit()

    # Create & send campaign
    res_c = client.post(
        "/api/mailing/campaigns",
        json={"name": "Campaña Siderurgica", "template_id": tmpl.id, "target_stage": "LEAD"},
        headers=admin_headers,
    )
    camp_id = res_c.json()["id"]
    client.post(f"/api/mailing/campaigns/{camp_id}/send", headers=admin_headers)

    rec = db.query(MailingRecipient).filter(MailingRecipient.campaign_id == camp_id).first()

    # Simulate High Intent Click event
    sim_res = client.post(
        "/api/mailing/sandbox/simulate-event",
        json={
            "recipient_id": rec.id,
            "event_type": "HIGH_INTENT_CLICKED",
            "url_clicked": "https://nexus.com/solicitar-tarifa",
        },
        headers=admin_headers,
    )
    assert sim_res.status_code == 200

    db.refresh(lead)
    # INQUEBRANTABLE: The account MUST STILL BE in LEAD stage!
    assert lead.lifecycle_stage == LifecycleStage.LEAD

    # But an urgent Task must have been created!
    task = db.query(Task).filter(Task.account_id == lead.id).first()
    assert task is not None
    assert task.priority == TaskPriority.HIGH_INTENT
    assert "ALTA INTENCIÓN" in task.title


def test_automatic_database_hygiene_hard_bounce_and_unsubscribe(client, admin_headers, init_test_db):
    db = init_test_db
    lead1 = Account(
        company_name="Test Bounce",
        email="bounce@test.com",
        email_valid=True,
        opt_in_marketing=True,
        lifecycle_stage=LifecycleStage.LEAD,
    )
    lead2 = Account(
        company_name="Test Unsubscribe",
        email="unsub@test.com",
        email_valid=True,
        opt_in_marketing=True,
        lifecycle_stage=LifecycleStage.LEAD,
    )
    tmpl = MailingTemplate(name="T", subject="S", body_html="B")
    db.add_all([lead1, lead2, tmpl])
    db.commit()

    # Create & send
    res_c = client.post(
        "/api/mailing/campaigns",
        json={"name": "Hygiene Test", "template_id": tmpl.id, "target_stage": "LEAD"},
        headers=admin_headers,
    )
    camp_id = res_c.json()["id"]
    client.post(f"/api/mailing/campaigns/{camp_id}/send", headers=admin_headers)

    rec1 = db.query(MailingRecipient).filter(MailingRecipient.email == "bounce@test.com").first()
    rec2 = db.query(MailingRecipient).filter(MailingRecipient.email == "unsub@test.com").first()

    # Simulate Hard Bounce on lead1
    client.post(
        "/api/mailing/sandbox/simulate-event",
        json={"recipient_id": rec1.id, "event_type": "HARD_BOUNCE"},
        headers=admin_headers,
    )
    db.refresh(lead1)
    assert lead1.email_valid is False

    # Simulate Unsubscribe on lead2 via universal webhook
    client.post(
        "/api/webhooks/mailing/event",
        json={"recipient_id": rec2.id, "event_type": "UNSUBSCRIBED", "email": "unsub@test.com"},
    )
    db.refresh(lead2)
    assert lead2.opt_in_marketing is False

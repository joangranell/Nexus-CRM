import sys
import os
from datetime import datetime, timedelta

# Ensure backend root is on Python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.database import Base, engine, SessionLocal
from app.models.users import User, UserRole
from app.models.accounts import Account, LifecycleStage, SubStatus, ClientType
from app.models.opportunities import Opportunity, OpportunityStatus
from app.models.interactions import Interaction, InteractionType
from app.models.tasks import Task, TaskPriority, TaskOrigin
from app.models.erp import ErpOrderCache, ErpOrderStatus
from app.models.mailing import (
    MailingTemplate,
    MailingCampaign,
    MailingRecipient,
    CampaignStatus,
    RecipientStatus,
)
from app.services.auth import get_password_hash


def seed_database():
    print("Iniciando creación de tablas y poblado de datos (Seed con Embudo 4 Fases y Jerarquía)...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    now = datetime.utcnow()

    try:
        # 1. Crear Usuarios
        print("-> Creando usuarios del sistema...")
        superadmin = User(
            name="Super Admin (Sistemas)",
            email="superadmin@nexuscrm.com",
            password_hash=get_password_hash("superadmin123"),
            role=UserRole.SUPER_ADMIN,
            is_active=True,
            created_at=now - timedelta(days=90),
        )
        admin = User(
            name="Elena Directora (Admin)",
            email="admin@nexuscrm.com",
            password_hash=get_password_hash("admin123"),
            role=UserRole.ADMIN_MARKETING,
            is_active=True,
            created_at=now - timedelta(days=90),
        )
        carlos = User(
            name="Carlos Gómez (Comercial)",
            email="carlos@nexuscrm.com",
            password_hash=get_password_hash("comercial123"),
            role=UserRole.COMERCIAL,
            is_active=True,
            created_at=now - timedelta(days=90),
        )
        laura = User(
            name="Laura Martín (Comercial)",
            email="laura@nexuscrm.com",
            password_hash=get_password_hash("comercial123"),
            role=UserRole.COMERCIAL,
            is_active=True,
            created_at=now - timedelta(days=90),
        )
        db.add_all([superadmin, admin, carlos, laura])
        db.commit()
        db.refresh(superadmin)
        db.refresh(admin)
        db.refresh(carlos)
        db.refresh(laura)

        # 2. Distribuidores Oficiales (Clientes Factura / Mayoristas)
        print("-> Creando Distribuidores Oficiales (Canal Mayorista)...")
        dist1 = Account(
            company_name="Distribuciones Levante Hostelería SL",
            contact_name="Vicente Benlloch",
            email="vbenlloch@distrihosteleria.com",
            email_valid=True,
            phone="+34963889900",
            tax_id="B98112233",
            erp_customer_id="ERP-DIST-01",
            source="DIRECTO",
            opt_in_marketing=True,
            lifecycle_stage=LifecycleStage.CLIENTE,
            sub_status=SubStatus.CONTACTADO_CUALIFICANDO,
            client_type=ClientType.DISTRIBUIDOR,
            owner_id=carlos.id,
            first_order_date=now - timedelta(days=90),
            ai_summary="Mayorista logístico principal en Comunidad Valenciana. Paga y consolida facturación de 15 puntos de venta.",
            created_at=now - timedelta(days=120),
            last_activity_at=now - timedelta(days=5),
        )
        dist2 = Account(
            company_name="Bebidas y Suministros del Norte SA",
            contact_name="Miren Aranguren",
            email="maranguren@suministrosnorte.es",
            email_valid=True,
            phone="+34944887766",
            tax_id="A48998877",
            erp_customer_id="ERP-DIST-02",
            source="FERIA_BILBAO",
            opt_in_marketing=True,
            lifecycle_stage=LifecycleStage.CLIENTE,
            sub_status=SubStatus.CONTACTADO_CUALIFICANDO,
            client_type=ClientType.DISTRIBUIDOR,
            owner_id=laura.id,
            first_order_date=now - timedelta(days=60),
            ai_summary="Distribuidor oficial en País Vasco y Cantabria. Alta solvencia y facturación centralizada.",
            created_at=now - timedelta(days=80),
            last_activity_at=now - timedelta(days=3),
        )
        db.add_all([dist1, dist2])
        db.commit()
        db.refresh(dist1)
        db.refresh(dist2)

        # 3. Clientes Finales (Canal Indirecto / Puntos de Venta vinculados a Distribuidores)
        print("-> Creando Clientes Finales asociados a Distribuidores...")
        cf1 = Account(
            company_name="Restaurante El Faro del Puerto",
            contact_name="Ramón Albalat",
            email="gerencia@elfarodelpuerto.es",
            email_valid=True,
            phone="+34961556677",
            tax_id="B98334455",
            erp_customer_id="ERP-CF-101",
            source="RECOMENDACION",
            opt_in_marketing=True,
            lifecycle_stage=LifecycleStage.CLIENTE,
            sub_status=SubStatus.CONTACTADO_CUALIFICANDO,
            client_type=ClientType.CLIENTE_FINAL,
            billing_account_id=dist1.id,  # Vinculado a Levante
            owner_id=carlos.id,
            first_order_date=now - timedelta(days=40),
            ai_summary="Restaurante en puerto de Valencia. Consumo semanal elevado. Pedidos entregados en local y facturados a Levante.",
            created_at=now - timedelta(days=60),
            last_activity_at=now - timedelta(days=4),
        )
        cf2 = Account(
            company_name="Gastrobar La Terraza de Ruzafa",
            contact_name="Nuria Vidal",
            email="contacto@laterrazaruzafa.es",
            email_valid=True,
            phone="+34962223344",
            tax_id="B98556677",
            source="WEB_FORM",
            opt_in_marketing=True,
            lifecycle_stage=LifecycleStage.PROSPECTO,
            sub_status=SubStatus.CONTACTADO_CUALIFICANDO,
            client_type=ClientType.CLIENTE_FINAL,
            billing_account_id=dist1.id,  # Vinculado a Levante
            owner_id=carlos.id,
            ai_summary="Punto de venta cualificado en zona de moda. Interés en gama premium; facturación confirmada a través de Levante.",
            created_at=now - timedelta(days=12),
            last_activity_at=now - timedelta(days=1),
        )
        cf3 = Account(
            company_name="Asador Cantábrico Bilbaíno",
            contact_name="Gorka Echevarría",
            email="gorka@asadorcantabrico.com",
            email_valid=True,
            phone="+34944112233",
            tax_id="B48778899",
            source="CAMPAÑA_LINKEDIN",
            opt_in_marketing=True,
            lifecycle_stage=LifecycleStage.POTENCIAL,
            sub_status=SubStatus.CONTACTADO_CUALIFICANDO,
            client_type=ClientType.CLIENTE_FINAL,
            billing_account_id=dist2.id,  # Vinculado a Bebidas del Norte
            owner_id=laura.id,
            ai_summary="Asador tradicional con renovación de equipamiento en marcha. Presupuesto activo de 12.000€ facturable a Suministros Norte.",
            created_at=now - timedelta(days=18),
            last_activity_at=now - timedelta(days=2),
        )
        db.add_all([cf1, cf2, cf3])
        db.commit()
        db.refresh(cf1)
        db.refresh(cf2)
        db.refresh(cf3)

        # 4. Cuentas en Bolsa Común de LEADS (Sin propietario)
        print("-> Creando Bolsa Común de Leads...")
        leads_data = [
            {
                "company_name": "Tecnologías Iberia SL",
                "contact_name": "Mateo Rivas",
                "email": "mateo@tecnoiberia.es",
                "phone": "+34912345678",
                "tax_id": "B87654321",
                "source": "WEB_FORM",
                "sub_status": SubStatus.SIN_CONTACTAR,
                "created_at": now - timedelta(days=1),
                "ai_summary": "Empresa de consultoría IT con 45 empleados en Madrid. Interesados en renovación de licencias B2B.",
            },
            {
                "company_name": "Distribuciones Mediterráneo SA",
                "contact_name": "Carla Font",
                "email": "cfont@distrimediterraneo.com",
                "phone": "+34933456789",
                "tax_id": "A08123456",
                "source": "FERIA_BARCELONA",
                "sub_status": SubStatus.SIN_CONTACTAR,
                "created_at": now - timedelta(days=2),
                "ai_summary": "Distribuidor mayorista de packaging ecológico. Contacto recogido en el stand A-14.",
            },
            {
                "company_name": "Logística y Transportes Velox",
                "contact_name": "Andrés Molina",
                "email": "andres@veloxlogistica.es",
                "phone": "+34961234567",
                "tax_id": "B96112233",
                "source": "WEB_FORM",
                "sub_status": SubStatus.INTENTO_1,
                "created_at": now - timedelta(days=3),
                "ai_summary": "Flota de 30 camiones en Valencia. Llamada saliente ayer sin respuesta (buzón).",
            },
            {
                "company_name": "Construcciones del Norte SL",
                "contact_name": "Iker Zubizarreta",
                "email": "iker@norteconstruccion.es",
                "phone": "+34944556677",
                "tax_id": "B48998877",
                "source": "CAMPAÑA_LINKEDIN",
                "sub_status": SubStatus.INTENTO_2,
                "created_at": now - timedelta(days=5),
                "ai_summary": "Constructora civil en Bilbao. Dos intentos de llamada fallidos sin descolgar.",
            },
            {
                "company_name": "Agroindustrias San Isidro",
                "contact_name": "Felipe Serrano",
                "email": "fserrano@agrosanisidro.com",
                "phone": "+34954001122",
                "tax_id": "B41887766",
                "source": "IMPORTACION_MASIVA",
                "sub_status": SubStatus.SIN_CONTACTAR,
                "created_at": now - timedelta(days=4),
                "ai_summary": "Cooperativa agrícola en Sevilla. Necesitan automatizar trazabilidad de pedidos.",
            },
        ]

        leads_objects = []
        for d in leads_data:
            acc = Account(
                company_name=d["company_name"],
                contact_name=d["contact_name"],
                email=d["email"],
                email_valid=True,
                phone=d["phone"],
                tax_id=d["tax_id"],
                source=d["source"],
                opt_in_marketing=True,
                lifecycle_stage=LifecycleStage.LEAD,
                sub_status=d["sub_status"],
                owner_id=None,  # Bolsa común
                ai_summary=d["ai_summary"],
                created_at=d["created_at"],
                last_activity_at=d["created_at"],
            )
            leads_objects.append(acc)

        db.add_all(leads_objects)
        db.commit()

        # Interacciones en Leads
        db.add(
            Interaction(
                account_id=leads_objects[2].id,
                user_id=carlos.id,
                type=InteractionType.CALL_NO_ANSWER,
                summary="Llamada a las 11:30. Comunica o no descuelga. Se deja pasar para segundo intento.",
                created_at=now - timedelta(days=1),
            )
        )
        db.add_all([
            Interaction(
                account_id=leads_objects[3].id,
                user_id=laura.id,
                type=InteractionType.CALL_NO_ANSWER,
                summary="Primer intento telefónico. Salta buzón de voz.",
                created_at=now - timedelta(days=4),
            ),
            Interaction(
                account_id=leads_objects[3].id,
                user_id=laura.id,
                type=InteractionType.CALL_NO_ANSWER,
                summary="Segundo intento telefónico tras 48h. Sin respuesta.",
                created_at=now - timedelta(days=2),
            ),
        ])
        db.commit()

        # 5. Cuentas en estado PROSPECTO (Cualificadas con contacto efectivo)
        print("-> Creando Prospectos cualificados...")
        prosp1 = Account(
            company_name="Hotel & Spa Miramar Playa",
            contact_name="Claudia Peñafiel",
            email="direccion@miramarplaya.es",
            email_valid=True,
            phone="+34964556677",
            tax_id="B12889900",
            source="WEB_FORM",
            opt_in_marketing=True,
            lifecycle_stage=LifecycleStage.PROSPECTO,
            sub_status=SubStatus.CONTACTADO_CUALIFICANDO,
            client_type=ClientType.CLIENTE_FINAL,
            billing_account_id=dist1.id,
            owner_id=carlos.id,
            ai_summary="Complejo hotelero de 4 estrellas. Llamada efectiva ayer confirmando interés real. Pendiente de visita técnica.",
            created_at=now - timedelta(days=6),
            last_activity_at=now - timedelta(days=1),
        )
        prosp2 = Account(
            company_name="Logística Alimentaria Ibérica SL",
            contact_name="Bernardo Cruz",
            email="bcruz@alimentariaiberica.es",
            email_valid=True,
            phone="+34918443322",
            tax_id="B83556611",
            source="EVENTO",
            opt_in_marketing=True,
            lifecycle_stage=LifecycleStage.PROSPECTO,
            sub_status=SubStatus.CONTACTADO_CUALIFICANDO,
            client_type=ClientType.DISTRIBUIDOR,
            owner_id=laura.id,
            ai_summary="Operador de frío para canal Horeca en Madrid y Toledo. Reunión mantenida confirmando interés como distribuidor asociado.",
            created_at=now - timedelta(days=8),
            last_activity_at=now - timedelta(days=2),
        )
        db.add_all([prosp1, prosp2])
        db.commit()
        db.refresh(prosp1)
        db.refresh(prosp2)

        db.add_all([
            Interaction(
                account_id=prosp1.id,
                user_id=carlos.id,
                type=InteractionType.CALL_EFFECTIVE,
                summary="Llamada de 18 min con Claudia Peñafiel. Cualificación positiva: confirman que compran a través de Levante Hostelería.",
                created_at=now - timedelta(days=1),
            ),
            Interaction(
                account_id=prosp2.id,
                user_id=laura.id,
                type=InteractionType.MEETING_VISIT,
                summary="Reunión comercial en sus instalaciones centrales. Cualificado como distribuidor logístico de soporte.",
                created_at=now - timedelta(days=2),
            ),
        ])

        # 6. Cuentas en estado POTENCIAL (Con comercial y Oportunidad valorada)
        print("-> Creando Potenciales con oportunidades de venta...")
        pot1 = Account(
            company_name="Manufacturas Metálicas Alavesas",
            contact_name="Javier Otxoa",
            email="jotxoa@metalalavesas.com",
            email_valid=True,
            phone="+34945112233",
            tax_id="A01554433",
            source="WEB_FORM",
            opt_in_marketing=True,
            lifecycle_stage=LifecycleStage.POTENCIAL,
            sub_status=SubStatus.CONTACTADO_CUALIFICANDO,
            owner_id=carlos.id,
            ai_summary="Fábrica de estampación metálica para automoción. Presupuesto solicitado de 18.500€.",
            created_at=now - timedelta(days=15),
            last_activity_at=now - timedelta(days=1),
        )
        pot2 = Account(
            company_name="Laboratorios BioSalud Europa",
            contact_name="Dra. Miriam Blanco",
            email="mblanco@biosalud.eu",
            email_valid=True,
            phone="+34918776655",
            tax_id="B82334455",
            source="CAMPAÑA_LINKEDIN",
            opt_in_marketing=True,
            lifecycle_stage=LifecycleStage.POTENCIAL,
            sub_status=SubStatus.CONTACTADO_CUALIFICANDO,
            owner_id=laura.id,
            ai_summary="Laboratorio farmacéutico. Clic en enlace de alta intención 'Solicitar Presupuesto Urgente'. Oportunidad de 34.200€.",
            created_at=now - timedelta(days=7),
            last_activity_at=now - timedelta(hours=3),
        )
        pot3_stale = Account(
            company_name="Soluciones Informáticas Antiguas SL",
            contact_name="Ramón Valles",
            email="rvalles@solucionesantiguas.com",
            email_valid=True,
            phone="+34910009988",
            tax_id="B81992211",
            source="FERIA_BARCELONA",
            opt_in_marketing=True,
            lifecycle_stage=LifecycleStage.POTENCIAL,
            sub_status=SubStatus.CONTACTADO_CUALIFICANDO,
            owner_id=carlos.id,
            ai_summary="Hubo un contacto inicial hace 75 días pero se congeló la decisión.",
            created_at=now - timedelta(days=75),
            last_activity_at=now - timedelta(days=68),  # > 60 días sin actividad
        )
        db.add_all([pot1, pot2, pot3_stale])
        db.commit()
        db.refresh(pot1)
        db.refresh(pot2)
        db.refresh(pot3_stale)

        # Oportunidades vinculadas a Potenciales
        opp1 = Opportunity(
            account_id=pot1.id,
            owner_id=carlos.id,
            title="Suministro Anual Componentes Grado 4",
            detected_need="Requieren entrega trimestral escalonada de 50.000 unidades.",
            estimated_amount=18500.0,
            status=OpportunityStatus.ABIERTA,
            expected_close_date=now + timedelta(days=20),
            created_at=now - timedelta(days=10),
        )
        opp2 = Opportunity(
            account_id=pot2.id,
            owner_id=laura.id,
            title="Lote Reactivos de Laboratorio Certificados",
            detected_need="Equipamiento analítico y reactivos para ensayo clínico Q3.",
            estimated_amount=34200.0,
            status=OpportunityStatus.ABIERTA,
            expected_close_date=now + timedelta(days=12),
            created_at=now - timedelta(days=5),
        )
        opp3_stale = Opportunity(
            account_id=pot3_stale.id,
            owner_id=carlos.id,
            title="Migración Servidores Locales",
            detected_need="Migración de infraestructura on-premise.",
            estimated_amount=8000.0,
            status=OpportunityStatus.ABIERTA,
            expected_close_date=now - timedelta(days=30),
            created_at=now - timedelta(days=70),
        )
        opp_cf3 = Opportunity(
            account_id=cf3.id,
            owner_id=laura.id,
            title="Renovación Hornos y Línea de Brasas",
            detected_need="Renovación de maquinaria de asador con pago delegado a Suministros Norte.",
            estimated_amount=12000.0,
            status=OpportunityStatus.ABIERTA,
            expected_close_date=now + timedelta(days=15),
            created_at=now - timedelta(days=10),
        )
        db.add_all([opp1, opp2, opp3_stale, opp_cf3])

        # Interacciones en Potenciales
        db.add_all([
            Interaction(
                account_id=pot1.id,
                user_id=carlos.id,
                type=InteractionType.CALL_EFFECTIVE,
                summary="Llamada de 25 min con Javier Otxoa. Mostró mucho interés en la gama de componentes.",
                created_at=now - timedelta(days=10),
            ),
            Interaction(
                account_id=pot1.id,
                user_id=carlos.id,
                type=InteractionType.MEETING_VISIT,
                summary="Visita técnica a la planta de Vitoria. Revisión de especificaciones con el jefe de compras.",
                created_at=now - timedelta(days=1),
            ),
            Interaction(
                account_id=pot2.id,
                user_id=laura.id,
                type=InteractionType.EMAIL_1TO1,
                summary="Envío de dossier confidencial y propuesta económica inicial según requisitos de la Dra. Blanco.",
                created_at=now - timedelta(hours=3),
            ),
        ])

        # Tareas de seguimiento comercial para "Mi Día"
        print("-> Creando tareas para la vista 'Mi Día'...")
        tasks_data = [
            Task(
                account_id=pot1.id,
                assigned_to_id=carlos.id,
                title="Enviar revisión final de oferta con descuento por volumen a Javier Otxoa",
                due_date=now.replace(hour=12, minute=0, second=0),
                priority=TaskPriority.NORMAL,
                is_completed=False,
                origin=TaskOrigin.STATE_MACHINE,
                created_at=now - timedelta(days=1),
            ),
            Task(
                account_id=pot2.id,
                assigned_to_id=laura.id,
                title="Llamada urgente: Alta Intención en campaña BioSalud",
                due_date=now.replace(hour=16, minute=30, second=0),
                priority=TaskPriority.HIGH_INTENT,
                is_completed=False,
                origin=TaskOrigin.MARKETING_TRIGGER,
                created_at=now - timedelta(hours=5),
            ),
            Task(
                account_id=prosp1.id,
                assigned_to_id=carlos.id,
                title="Agendar visita técnica con Claudia Peñafiel (Miramar Playa)",
                due_date=now.replace(hour=10, minute=0, second=0),
                priority=TaskPriority.NORMAL,
                is_completed=False,
                origin=TaskOrigin.STATE_MACHINE,
                created_at=now - timedelta(days=1),
            ),
            Task(
                account_id=pot1.id,
                assigned_to_id=carlos.id,
                title="Llamar para verificar recepción del borrador legal",
                due_date=now - timedelta(days=1),
                priority=TaskPriority.NORMAL,
                is_completed=False,
                origin=TaskOrigin.MANUAL,
                created_at=now - timedelta(days=4),
            ),
        ]
        db.add_all(tasks_data)
        db.commit()

        # 7. Clientes Corporativos Directos (con ERP sincronizado)
        print("-> Creando Clientes directos e histórico ERP...")
        cli1 = Account(
            company_name="Iberdrola Renovables España",
            contact_name="Sara Beltrán",
            email="sbeltran@iberdrola.es",
            email_valid=True,
            phone="+34915554433",
            tax_id="A48012345",
            erp_customer_id="ERP-CUST-10492",
            source="EVENTO",
            opt_in_marketing=True,
            lifecycle_stage=LifecycleStage.CLIENTE,
            sub_status=SubStatus.CONTACTADO_CUALIFICANDO,
            owner_id=carlos.id,
            first_order_date=now - timedelta(days=120),
            ai_summary="Cliente corporativo de alta recurrencia. Pedidos trimestrales de material eléctrico.",
            created_at=now - timedelta(days=180),
            last_activity_at=now - timedelta(days=10),
        )
        cli2 = Account(
            company_name="Grupo Alimentario del Sur SA",
            contact_name="Gonzalo Ramos",
            email="gramos@gruposur.es",
            email_valid=True,
            phone="+34954998877",
            tax_id="A41098765",
            erp_customer_id="ERP-CUST-10884",
            source="IMPORTACION_MASIVA",
            opt_in_marketing=True,
            lifecycle_stage=LifecycleStage.CLIENTE,
            sub_status=SubStatus.CONTACTADO_CUALIFICANDO,
            owner_id=laura.id,
            first_order_date=now - timedelta(days=45),
            ai_summary="Fabricante de conservas y aceites. Pedido inicial de 28.500€ facturado en ERP.",
            created_at=now - timedelta(days=60),
            last_activity_at=now - timedelta(days=5),
        )
        db.add_all([cli1, cli2])
        db.commit()
        db.refresh(cli1)
        db.refresh(cli2)

        # Oportunidad ganada en cliente
        db.add(
            Opportunity(
                account_id=cli2.id,
                owner_id=laura.id,
                title="Implantación Línea de Envasado Automatizada",
                detected_need="Reemplazo de maquinaria antigua por línea de alto rendimiento.",
                estimated_amount=28500.0,
                status=OpportunityStatus.GANADA,
                expected_close_date=now - timedelta(days=45),
                created_at=now - timedelta(days=60),
            )
        )
        db.commit()

        # 8. Pedidos ERP con trazabilidad Cliente Final -> Distribuidor Factura
        print("-> Creando pedidos de demostración en la caché ERP con trazabilidad de facturación...")
        # Pedido 1: Facturado a Iberdrola directo
        order1 = ErpOrderCache(
            order_id="PED-2026-8091",
            erp_customer_id=cli1.erp_customer_id,
            tax_id=cli1.tax_id,
            account_id=cli1.id,
            order_date=now - timedelta(days=30),
            total_amount=14200.0,
            status=ErpOrderStatus.FACTURADO,
            top_products=["Célula Robotizada de Paletizado", "Controlador PLC S7-1500"],
            order_lines=[
                {"sku": "ROB-PAL-01", "description": "Célula Robotizada de Paletizado", "quantity": 1, "unit_price": 11500.0, "subtotal": 11500.0},
                {"sku": "PLC-SIEM-15", "description": "Controlador PLC S7-1500", "quantity": 3, "unit_price": 900.0, "subtotal": 2700.0},
            ],
            created_at=now - timedelta(days=30),
        )
        # Pedido 2: Facturado a Grupo Alimentario directo
        order2 = ErpOrderCache(
            order_id="PED-2026-9442",
            erp_customer_id=cli2.erp_customer_id,
            tax_id=cli2.tax_id,
            account_id=cli2.id,
            order_date=now - timedelta(days=45),
            total_amount=28500.0,
            status=ErpOrderStatus.CONFIRMADO,
            top_products=["Línea de Envasado Automatizada", "Tolva Inoxidable Dosificadora"],
            order_lines=[
                {"sku": "ENV-AUTO-PRO", "description": "Línea de Envasado Automatizada", "quantity": 1, "unit_price": 24000.0, "subtotal": 24000.0},
                {"sku": "TOLV-INOX-50", "description": "Tolva Inoxidable Dosificadora", "quantity": 1, "unit_price": 4500.0, "subtotal": 4500.0},
            ],
            created_at=now - timedelta(days=45),
        )
        # Pedido 3: Pedido realizado por CF1 (Restaurante El Faro del Puerto) pero FACTURADO a DIST1 (Distribuciones Levante)
        order_cf1 = ErpOrderCache(
            order_id="PED-2026-7731",
            erp_customer_id=cf1.erp_customer_id,
            tax_id=cf1.tax_id,
            account_id=cf1.id,                # Cliente Pedido (Cliente Final)
            billing_account_id=dist1.id,        # Cliente Factura (Distribuidor)
            order_date=now - timedelta(days=14),
            total_amount=4950.0,
            status=ErpOrderStatus.FACTURADO,
            top_products=["Gama Vinos Reserva Especial", "Pack Copas Cristal Fino"],
            order_lines=[
                {"sku": "VIN-RES-01", "description": "Gama Vinos Reserva Especial", "quantity": 25, "unit_price": 150.0, "subtotal": 3750.0},
                {"sku": "COP-CRIS-12", "description": "Pack Copas Cristal Fino", "quantity": 10, "unit_price": 120.0, "subtotal": 1200.0},
            ],
            created_at=now - timedelta(days=14),
        )
        # Pedido 4: Pedido directo al Distribuidor Levante
        order_dist1 = ErpOrderCache(
            order_id="PED-2026-6210",
            erp_customer_id=dist1.erp_customer_id,
            tax_id=dist1.tax_id,
            account_id=dist1.id,
            order_date=now - timedelta(days=20),
            total_amount=18400.0,
            status=ErpOrderStatus.FACTURADO,
            top_products=["Palet Mixto Hostelería Q1", "Lote Cavas Brut Nature"],
            order_lines=[
                {"sku": "PAL-MIX-01", "description": "Palet Mixto Hostelería Q1", "quantity": 4, "unit_price": 4000.0, "subtotal": 16000.0},
                {"sku": "CAV-BRUT-06", "description": "Lote Cavas Brut Nature", "quantity": 20, "unit_price": 120.0, "subtotal": 2400.0},
            ],
            created_at=now - timedelta(days=20),
        )
        db.add_all([order1, order2, order_cf1, order_dist1])
        db.commit()

        # 9. Plantillas y Campañas de Mailing (Fase 3)
        print("-> Creando plantillas y campañas de Mailing...")
        tmpl1 = MailingTemplate(
            name="Campaña Nurturing - Soluciones Automatización 2026",
            subject="Optimice los tiempos de entrega en la planta de {{empresa}}",
            body_html="""<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
  <h2 style="color: #0176d3;">Soluciones de Automatización para {{empresa}}</h2>
  <p>Hola <strong>{{nombre}}</strong>,</p>
  <p>Desde Nexus Soluciones Industriales le escribimos porque sabemos que optimizar la cadencia y trazabilidad de pedidos es clave para {{empresa}}.</p>
  <p>Hemos preparado una guía con casos de éxito y nuestra tarifa técnica preferente para este ejercicio:</p>
  <div style="text-align: center; margin: 25px 0;">
    <a href="https://nexus.com/solicitar-tarifa" style="background-color: #0176d3; color: #ffffff; padding: 12px 24px; border-radius: 4px; text-decoration: none; font-weight: bold; display: inline-block;">
      Solicitar Tarifa y Diagnóstico Técnico &rarr;
    </a>
  </div>
  <p>Si lo prefiere, puede responder a este correo o coordinar directamente con su asesor asignado: <strong>{{comercial}}</strong> (<a href="mailto:{{email_comercial}}">{{email_comercial}}</a>).</p>
  <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
  <p style="font-size: 11px; color: #64748b;">Nexus CRM B2B &bull; Recibes esta información en {{email}} con NIF {{cif}} por ser contacto profesional verificado.</p>
</div>""",
            high_intent_links=["https://nexus.com/solicitar-tarifa", "https://nexus.com/contactar-asesor"],
            created_at=now - timedelta(days=5),
            updated_at=now - timedelta(days=5),
        )
        tmpl2 = MailingTemplate(
            name="Reactivación de Potenciales - Condiciones Especiales Q2",
            subject="Propuesta revisada y reserva de stock para {{empresa}}",
            body_html="""<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
  <h2 style="color: #0176d3;">Retomamos su proyecto en {{empresa}}</h2>
  <p>Estimado/a <strong>{{nombre}}</strong>,</p>
  <p>Nos ponemos en contacto de nuevo para comunicarle que hemos desbloqueado una bonificación del 15% sobre la última cotización solicitada.</p>
  <p><a href="https://nexus.com/solicitar-tarifa" style="color: #0176d3; font-weight: bold;">Haga clic aquí para validar la tarifa especial antes del cierre de trimestre</a></p>
  <p>Un cordial saludo,<br><strong>{{comercial}}</strong></p>
</div>""",
            high_intent_links=["https://nexus.com/solicitar-tarifa"],
            created_at=now - timedelta(days=4),
            updated_at=now - timedelta(days=4),
        )
        tmpl3 = MailingTemplate(
            name="Fidelización Clientes ERP - Novedades y Recambios PLC",
            subject="Disponibilidad inmediata de recambios originales para {{empresa}}",
            body_html="""<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
  <h2 style="color: #0176d3;">Catálogo Exclusivo Clientes Nexus</h2>
  <p>Apreciado/a <strong>{{nombre}}</strong>,</p>
  <p>Como cliente habitual de nuestra gama de automatización, le informamos de que hemos ampliado el stock de componentes y repuestos críticos garantizados en 24h.</p>
  <p><a href="https://nexus.com/catalogo-exclusivo">Consulte el catálogo de repuestos aquí</a> o solicite presupuesto rápido a continuación:</p>
  <p><a href="https://nexus.com/solicitar-tarifa" style="color: #0176d3; font-weight: bold;">Pedir cotización de mantenimiento preventivo</a></p>
</div>""",
            high_intent_links=["https://nexus.com/solicitar-tarifa"],
            created_at=now - timedelta(days=3),
            updated_at=now - timedelta(days=3),
        )
        db.add_all([tmpl1, tmpl2, tmpl3])
        db.commit()
        db.refresh(tmpl1)
        db.refresh(tmpl2)
        db.refresh(tmpl3)

        # Campaña Demo
        camp1 = MailingCampaign(
            name="Nurturing Leads Q1 - Prospección Automatización",
            template_id=tmpl1.id,
            target_stage="LEAD",
            segment_filters={"target_stage": "LEAD"},
            provider_used="sandbox",
            status=CampaignStatus.COMPLETED,
            stats={
                "total_recipients": len(leads_objects),
                "sent": len(leads_objects),
                "delivered": len(leads_objects) - 1,
                "opened": 3,
                "clicked": 2,
                "high_intent_clicked": 1,
                "hard_bounce": 1,
                "soft_bounce": 0,
                "unsubscribed": 0,
                "spam": 0,
                "open_rate": 75.0,
                "click_rate": 50.0,
                "high_intent_rate": 25.0,
            },
            created_by_id=admin.id,
            created_at=now - timedelta(days=2),
            sent_at=now - timedelta(days=2),
        )
        db.add(camp1)
        db.commit()
        db.refresh(camp1)

        recipients_seed = [
            MailingRecipient(
                campaign_id=camp1.id,
                account_id=leads_objects[0].id,
                email=leads_objects[0].email,
                status=RecipientStatus.HIGH_INTENT_CLICKED,
                rendered_subject=f"Optimice los tiempos de entrega en la planta de {leads_objects[0].company_name}",
                rendered_html="<div>Correo simulado</div>",
                last_event_at=now - timedelta(hours=6),
                event_details="Clic en enlace de Alta Intención: https://nexus.com/solicitar-tarifa",
                created_at=now - timedelta(days=2),
            ),
            MailingRecipient(
                campaign_id=camp1.id,
                account_id=leads_objects[1].id,
                email=leads_objects[1].email,
                status=RecipientStatus.OPENED,
                rendered_subject=f"Optimice los tiempos de entrega en la planta de {leads_objects[1].company_name}",
                rendered_html="<div>Correo simulado</div>",
                last_event_at=now - timedelta(hours=14),
                event_details="Apertura detectada por píxel",
                created_at=now - timedelta(days=2),
            ),
            MailingRecipient(
                campaign_id=camp1.id,
                account_id=leads_objects[2].id,
                email=leads_objects[2].email,
                status=RecipientStatus.CLICKED,
                rendered_subject=f"Optimice los tiempos de entrega en la planta de {leads_objects[2].company_name}",
                rendered_html="<div>Correo simulado</div>",
                last_event_at=now - timedelta(hours=20),
                event_details="Clic en enlace general: https://nexus.com/blog/optimizacion",
                created_at=now - timedelta(days=2),
            ),
            MailingRecipient(
                campaign_id=camp1.id,
                account_id=leads_objects[3].id,
                email=leads_objects[3].email,
                status=RecipientStatus.DELIVERED,
                rendered_subject=f"Optimice los tiempos de entrega en la planta de {leads_objects[3].company_name}",
                rendered_html="<div>Correo simulado</div>",
                last_event_at=now - timedelta(days=2),
                event_details="Entregado en buzón de entrada",
                created_at=now - timedelta(days=2),
            ),
            MailingRecipient(
                campaign_id=camp1.id,
                account_id=leads_objects[4].id,
                email=leads_objects[4].email,
                status=RecipientStatus.HARD_BOUNCE,
                rendered_subject=f"Optimice los tiempos de entrega en la planta de {leads_objects[4].company_name}",
                rendered_html="<div>Correo simulado</div>",
                last_event_at=now - timedelta(days=1),
                event_details="Rebote permanente (550 Mailbox not found)",
                created_at=now - timedelta(days=2),
            ),
        ]
        db.add_all(recipients_seed)
        db.commit()

        print("Base de datos poblada exitosamente:")
        print(f"  - Usuarios creados: 3 (Admin, Carlos, Laura)")
        print(f"  - Leads en Bolsa Común: {len(leads_objects)}")
        print(f"  - Prospectos cualificados: 3 (Claudia Miramar, Bernardo Cruz, Gastrobar Ruzafa)")
        print(f"  - Potenciales activos: 4 (Manufacturas, BioSalud, Asador Bilbaíno, 1 Stale)")
        print(f"  - Clientes ERP: 5 (2 Distribuidores, 1 Cliente Final, 2 Directos)")
        print(f"  - Oportunidades: 5")
        print(f"  - Tareas en 'Mi Día': 4")
        print(f"  - Pedidos ERP: 4 (con trazabilidad Cliente Pedido / Final -> Cliente Factura Distribuidor)")
        print(f"  - Campaña Demo Enviada: 1 con {len(recipients_seed)} destinatarios")

    except Exception as e:
        db.rollback()
        print(f"Error al poblar la base de datos: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()

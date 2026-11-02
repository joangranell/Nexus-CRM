# âš¡ Nexus CRM Â· Enterprise B2B Engine

<div align="center">

![Python](https://img.shields.io/badge/Python-3.11%20%7C%203.14-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-SLDS_Design-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Tests](https://img.shields.io/badge/Tests-25%2F25%20Passing-success?style=for-the-badge&logo=pytest&logoColor=white)
![License](https://img.shields.io/badge/License-Proprietary%20%2F%20Enterprise-blue?style=for-the-badge)

<p align="center">
  <strong>Plataforma comercial B2B con mÃ¡quina de estados estricta, jerarquÃ­a mayorista (Distribuidor vs. Cliente Final), integraciÃ³n ERP, motor de importaciÃ³n masiva en 4 etapas y arquitectura de Inteligencia Artificial BYOK (Bring Your Own Key).</strong>
</p>

<p align="center">
  <a href="https://joangranell.github.io/Nexus-CRM/" target="_blank">
    <img src="https://img.shields.io/badge/%F0%9F%8C%90_Demo_Interactiva-Simulador_en_Vivo-0284c7?style=for-the-badge&logo=google-chrome&logoColor=white" alt="Live Demo" />
  </a>
</p>

<p align="center">
  ðŸ‘‰ <strong><a href="https://joangranell.github.io/Nexus-CRM/">https://joangranell.github.io/Nexus-CRM/</a></strong> ðŸ‘ˆ
</p>

[ðŸŒ Demo Interactiva en Vivo](https://joangranell.github.io/Nexus-CRM/) â€¢
[âœ¨ Funcionalidades](#-funcionalidades-clave) â€¢
[ðŸ“ Reglas de Oro](#-reglas-de-oro-del-negocio) â€¢
[ðŸ—ï¸ Arquitectura](#%EF%B8%8F-arquitectura-del-sistema) â€¢
[ðŸš€ Inicio RÃ¡pido](#-inicio-rÃ¡pido-en-windows) â€¢
[ðŸ§ª Tests Automatizados](#-baterÃ­a-de-tests-automatizados-2525)

</div>

---

## ðŸŽ¯ Por quÃ© Nexus CRM: El Problema de los CRM Tradicionales

El 70% de las implantaciones de CRM tradicionales (Salesforce, HubSpot, Zoho) fracasan en entornos B2B industriales y de distribuciÃ³n mayorista: exigen burocracia interminable que el comercial rechaza y arrojan *forecasts* hinchados en los que direcciÃ³n no confÃ­a.

| Enfoque Tradicional | Enfoque Nexus CRM |
| :--- | :--- |
| **Oportunidades ficticias** creadas para justificar actividad semanal. | **Salvaguarda de forecasting:** Si no hay importe (â‚¬) y fecha de cierre, no entra en previsiÃ³n ni pasa a Potencial. |
| **Comerciales marcan "Ganado"** sin pedido real emitido. | **ConversiÃ³n exclusiva por ERP:** Una cuenta solo pasa a `CLIENTE` cuando el ERP sincroniza su primer pedido firme. |
| **ConfusiÃ³n de canal:** No distingue quiÃ©n consume de quiÃ©n abona. | **JerarquÃ­a nativa de 2 niveles:** `Distribuidor` (*Cliente Factura*) frente a `Cliente Final` (*Cliente Pedido*). |
| **Marketing infla leads:** Un clic en newsletter promueve a venta. | **Puente Marketing âž” Ventas:** Clics de alta intenciÃ³n generan tareas prioritarias; el lead solo avanza ante contacto humano efectivo. |
| **IA cautiva y costosa:** Tarifas abusivas por usuario y datos expuestos. | **IA BYOK (*Bring Your Own Key*):** Conecta Azure OpenAI, OpenAI, Gemini o Claude a coste de API, o usa el modo Mock sin coste. |

---

## âœ¨ Funcionalidades Clave

### 1. ðŸ”„ MÃ¡quina de Estados Estricta & Embudo Secuencial
* Ciclo de vida determinista: **`LEAD` âž” `PROSPECTO` âž” `POTENCIAL` âž” `CLIENTE`** (mÃ¡s estado `INACTIVO`).
* SeparaciÃ³n formal entre **Cuenta JurÃ­dica** (relaciÃ³n a largo plazo) y **Oportunidades** (negociaciones valoradas 1:N).
* PromociÃ³n automÃ¡tica a `PROSPECTO` ante contacto humano directo (`CALL_EFFECTIVE`, `EMAIL_1TO1`, `MEETING_VISIT`, `INBOUND_REPLY`).
* PromociÃ³n a `POTENCIAL` condicionada a la cuantificaciÃ³n econÃ³mica del proyecto.
* Reciclaje automÃ¡tico de cuentas estancadas (>60 dÃ­as sin actividad).

### 2. ðŸ“… Agenda Comercial "Mi DÃ­a" & Ficha 360Âº
* Panel diario para comerciales con foco en ejecuciÃ³n: tareas vencidas, tareas de hoy con badge de prioridad (`NORMAL`, `HIGH_INTENT`, `CHURN_ALERT`) y citas futuras.
* Modal de registro de actividad en 1-clic con programaciÃ³n obligatoria de la prÃ³xima acciÃ³n.
* **CajÃ³n Lateral 360Âº (*AccountDrawer*):** Vista integral sin recarga con datos fiscales, mÃ©tricas financieras YTD/LTV del ERP, timeline de notas y oportunidades.

### 3. ðŸ¢ JerarquÃ­a Mayorista (Distribuidor vs. Cliente Final)
* Modela la realidad del canal indirecto B2B:
  * **Distribuidor Oficial:** Asume el riesgo financiero y la facturaciÃ³n consolidada.
  * **Cliente Final (Canal Indirecto):** Punto de venta, restaurante, taller o filial donde se realiza la prescripción técnica y el consumo (*Cliente Pedido*).
* Vinculación obligatoria de todo Cliente Final a su distribuidor activo con doble trazabilidad en pedidos.

### 4. ðŸ“¥ Motor de ImportaciÃ³n Masiva en 4 Etapas
* **Etapa 1 (Carga & Staging):** Ingesta segura de `.csv`, `.xlsx` o `.json` en tabla aislada sin alterar la base de datos principal.
* **Etapa 2 (Mapeo Inteligente):** Mapeador dinÃ¡mico de campos, tipologÃ­a y relaciones de distribuciÃ³n.
* **Etapa 3 (DeduplicaciÃ³n Difusa & Salvaguarda):** Algoritmo de *fuzzy matching* por CIF, razÃ³n social, email y telÃ©fono. Degrada automÃ¡ticamente registros a `PROSPECTO` si carecen de importe/fecha.
* **Etapa 4 (ConsolidaciÃ³n JerÃ¡rquica):** Procesa primero los distribuidores y luego los Clientes Finales vinculados.

### 5. ðŸ“§ Mailing Multi-ESP & Puente Marketing âž” Ventas
* **PatrÃ³n Adapter:** Conectores desacoplados para **Mailchimp**, **Brevo**, **Resend** y **Sandbox Local** de pruebas.
* **Segmentador DinÃ¡mico:** EstimaciÃ³n de audiencia en tiempo real filtrando por etapa, actividad o consumo en ERP.
* **Higiene RGPD AutomÃ¡tica:** DesactivaciÃ³n inmediata ante *Hard Bounces* y bajas voluntarias (*Unsubscribe / Spam*).
* **Puente de Alta IntenciÃ³n (ðŸ”¥):** Los clics en enlaces cualificados (*ej. Solicitar Tarifa*) disparan tareas de mÃ¡xima prioridad al comercial sin alterar el estado del lead.

### 6. ðŸ¤– Arquitectura IA BYOK Multi-Proveedor (5 MÃ³dulos B2B)
* MÃ³dulo deshabilitado por defecto para garantizar soberanÃ­a de datos y privacidad.
* Compatible con **Microsoft Azure OpenAI / Copilot**, **OpenAI (GPT-4o)**, **Google Gemini (2.5 Flash)**, **Anthropic Claude (3.5 Sonnet)** y **Mock Local**.
* **Los 5 MÃ³dulos de IA:**
  * **AI Lead Enricher:** Infiere sector, tamaÃ±o y propuesta comercial a partir de la web corporativa.
  * **Voice-to-CRM:** Dictado por voz de post-visita; extrae acuerdos, importe (â‚¬), fecha de cierre y genera oportunidades.
  * **Inbox Sync:** AnÃ¡lisis semÃ¡ntico de correos para detectar intenciÃ³n y cualificaciÃ³n.
  * **Motor Predictivo de Churn ERP:** Analiza intervalos de recompra y genera alertas predictivas antes de la pÃ©rdida del cliente.
  * **Redactor de Mailing IA:** Asistente generador de copys personalizados con variables dinÃ¡micas (`{{nombre}}`, `{{empresa}}`).

---

## ðŸ—ï¸ Arquitectura del Sistema

```mermaid
graph TD
    subgraph Frontend["Frontend SPA (React 18 + Vite + Tailwind SLDS)"]
        UI_Funnel["Embudo Kanban & Tabla"]
        UI_MyDay["Agenda 'Mi DÃ­a'"]
        UI_Drawer["Ficha 360Âº de Cuenta"]
        UI_Importer["Importador 4 Etapas"]
        UI_Mailing["Mailing & CampaÃ±as"]
        UI_Sandbox["Simulador ERP & Webhooks"]
        UI_Settings["ConfiguraciÃ³n IA (BYOK)"]
    end

    subgraph Backend["Backend API (FastAPI + SQLAlchemy 2.0)"]
        Router_Auth["Auth & RBAC JWT"]
        Router_SM["State Machine Engine"]
        Router_ERP["ERP Sync & Cache"]
        Router_Mail["Mailing Engine"]
        Router_AI["AI Provider Factory"]
    end

    subgraph Storage["Persistencia Relacional"]
        DB[(SQLite WAL / PostgreSQL Ready)]
    end

    subgraph Integrations["Capa de IntegraciÃ³n Externa"]
        ERP_Ext["ERP Externo (SAP / Sage / Navision)"]
        ESP_Ext["Proveedores ESP (Mailchimp / Brevo / Resend)"]
        LLM_Ext["LLMs Corporativos (Azure OpenAI / Gemini / Claude)"]
    end

    Frontend -->|HTTPS / JWT| Backend
    Backend --> DB
    Router_ERP <-->|Webhooks / REST| ERP_Ext
    Router_Mail <-->|Adapter API| ESP_Ext
    Router_AI <-->|BYOK API| LLM_Ext
```

---

## ðŸš€ Inicio RÃ¡pido en Windows

### OpciÃ³n 1: Lanzador automatizado (PowerShell)
```powershell
powershell -ExecutionPolicy Bypass -File .\start_windows.ps1
```
*El script verifica Python y Node.js, crea el `.venv`, instala dependencias, ejecuta el seed de la base de datos y arranca backend y frontend automÃ¡ticamente.*

### OpciÃ³n 2: Arranque manual paso a paso

1. **Configurar el Backend:**
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\pip install -r backend\requirements.txt
   .\.venv\Scripts\python backend\seed.py
   .\.venv\Scripts\python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
   ```
   * Swagger interactivo: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

2. **Configurar el Frontend:**
   ```powershell
   cd frontend
   npm install
   npm run dev
   ```
   * AplicaciÃ³n Web: [http://localhost:5173](http://localhost:5173)

---

## ðŸ”‘ Perfiles y Credenciales de DemostraciÃ³n

La pantalla de login incluye botones de **acceso rÃ¡pido en 1-clic** para cada rol:

| Rol | Nombre | Email | ContraseÃ±a | Capacidades |
| :--- | :--- | :--- | :--- | :--- |
| **`SUPER_ADMIN`** | Super Admin | `superadmin@nexuscrm.com` | `superadmin123` | Control total, alta de usuarios, credenciales de IA corporativa y configuraciÃ³n ERP. |
| **`ADMIN_MARKETING`** | Elena Directora | `admin@nexuscrm.com` | `admin123` | SupervisiÃ³n comercial global, importador masivo, campaÃ±as de mailing y simulador ERP. |
| **`COMERCIAL`** | Carlos GÃ³mez | `carlos@nexuscrm.com` | `comercial123` | GestiÃ³n de cartera propia, bolsa de leads, agenda "Mi DÃ­a" y registro de actividad. |
| **`COMERCIAL`** | Laura MartÃ­n | `laura@nexuscrm.com` | `comercial123` | Fuerza de ventas especializada con cartera asignada. |

---

## ðŸ§ª BaterÃ­a de Tests Automatizados (25/25)

El sistema cuenta con una exhaustiva suite de pruebas unitarias y de integraciÃ³n:

```powershell
.\.venv\Scripts\python.exe -m pytest -v
```

```text
backend/tests/test_phase1.py::test_auth_login PASSED
backend/tests/test_phase1.py::test_lead_call_no_answer_increments_attempts PASSED
backend/tests/test_phase1.py::test_lead_effective_contact_promotes_to_prospecto_and_then_potencial PASSED
backend/tests/test_phase1.py::test_public_webhook_lead PASSED
backend/tests/test_phase1.py::test_task_update_and_delete PASSED
backend/tests/test_phase2.py::test_import_csv_lifecycle_and_deduplication PASSED
backend/tests/test_phase2.py::test_erp_sandbox_order_promotes_potencial_to_cliente PASSED
backend/tests/test_phase2.py::test_erp_webhook_endpoint PASSED
backend/tests/test_phase2.py::test_push_potencial_to_erp PASSED
backend/tests/test_phase3.py::test_mailing_templates_crud PASSED
backend/tests/test_phase3.py::test_segment_estimation_and_hygiene_exclusion PASSED
backend/tests/test_phase3.py::test_campaign_dispatch_and_variable_rendering PASSED
backend/tests/test_phase3.py::test_golden_rule_high_intent_click_creates_urgent_task_without_promoting_lead PASSED
backend/tests/test_phase3.py::test_automatic_database_hygiene_hard_bounce_and_unsubscribe PASSED
backend/tests/test_phase4.py::test_ai_config_disabled_by_default_and_crud PASSED
backend/tests/test_phase4.py::test_ai_test_connection PASSED
backend/tests/test_phase4.py::test_ai_disabled_guard PASSED
backend/tests/test_phase4.py::test_case_a_ai_lead_enricher PASSED
backend/tests/test_phase4.py::test_case_b_voice_to_crm_opportunity_and_promotion PASSED
backend/tests/test_phase4.py::test_case_c_email_intent_detection PASSED
backend/tests/test_phase4.py::test_case_d_churn_risk_detection_and_task PASSED
backend/tests/test_phase4.py::test_case_e_generate_campaign_copy PASSED
backend/tests/test_prospect_hierarchy.py::test_qualify_account_distributor_and_final_client_hierarchy PASSED
backend/tests/test_prospect_hierarchy.py::test_erp_order_traceability_final_client_and_distributor PASSED
backend/tests/test_prospect_hierarchy.py::test_importer_forecasting_safeguard_and_hierarchy PASSED

====================== 25 passed in 2.54s =======================
```

---

## ðŸ“„ Licencia

Proyecto empresarial desarrollado para entornos comerciales B2B y distribuciÃ³n mayorista. Todos los derechos reservados Â© 2026 Nexus CRM.


# PROMPT MAESTRO PARA LA RECREACIÓN COMPLETA DE NEXUS CRM

> **Instrucciones de uso:**  
> Copia y pega el contenido del bloque siguiente en una nueva conversación con un agente de IA (como Antigravity, Gemini, Claude u OpenAI) o guárdalo como archivo de contexto (`GEMINI.md` / `INSTRUCTIONS.md`) en la raíz del espacio de trabajo para generar desde cero el sistema **Nexus CRM** con toda su arquitectura, reglas de negocio y frontend.

***

```markdown
# OBJETIVO DEL PROYECTO: NEXUS CRM

Actúa como un **Arquitecto de Software Full-Stack Senior y Especialista en Sistemas Comerciales B2B**.
Tu misión es diseñar, programar e implementar completamente **Nexus CRM**, una plataforma de gestión comercial B2B con arquitectura desacoplada para Windows, máquina de estados estricta, jerarquía mayorista (Distribuidor vs. Cliente Final), integración con ERP, motor de importación masiva en 4 etapas, módulo de mailing multi-proveedor con puente marketing-ventas y arquitectura de Inteligencia Artificial BYOK (*Bring Your Own Key*).

---

## 1. STACK TECNOLÓGICO Y ENTORNO

1. **Entorno y Sistema Operativo:**
   - Optimizado para **Windows 10/11** con soporte de scripts PowerShell (`start_windows.ps1`).
2. **Backend:**
   - **Python 3.11+ / 3.14** con **FastAPI**.
   - **SQLAlchemy 2.0** (ORM) y **Pydantic v2**.
   - Autenticación **JWT (OAuth2)** con `passlib[bcrypt]`.
   - Base de datos relacional: **SQLite3** con `PRAGMA foreign_keys=ON` y `PRAGMA journal_mode=WAL` (fácilmente migrable a PostgreSQL cambiando únicamente `DATABASE_URL` en `.env`).
   - Testing automatizado con **pytest** y **httpx/TestClient**.
3. **Frontend:**
   - **React 18** + **Vite** (SPA).
   - **TailwindCSS** con sistema de diseño inspirado en **Salesforce Lightning Design System (SLDS)**.
   - Iconografía: **Lucide React**.
   - Cliente HTTP: **Axios** con interceptor JWT y refresco de sesión.
4. **Arquitectura:**
   - Desacoplada: Backend API RESTful (`/api/...`) + Frontend SPA (`http://localhost:5173`).
   - Patrón *Adapter/Provider* para servicios externos (Mailing e Inteligencia Artificial).

---

## 2. REGLAS DE ORO DEL NEGOCIO (INQUEBRANTABLES)

1. **Separación Estricta Cuenta vs. Oportunidades:**
   - La tabla `accounts` gestiona el estado maestro empresarial del cliente (`lifecycle_stage`: `LEAD`, `PROSPECTO`, `POTENCIAL`, `CLIENTE`, `INACTIVO`).
   - Las negociaciones o presupuestos se gestionan en la entidad vinculada `opportunities` (relación 1:N) con importe estimado y fecha prevista de cierre.
   - Los contactos y actividades se auditan en `interactions` (relación 1:N).
   - Las tareas y seguimientos se gestionan en `tasks` (relación 1:N).

2. **Embudo de 4 Fases y Máquina de Estados Determinista:**
   - Secuencia obligatoria: `LEAD` ➔ `PROSPECTO` ➔ `POTENCIAL` ➔ `CLIENTE`.
   - **Transición `LEAD` ➔ `PROSPECTO`:** Ocurre única y automáticamente cuando un comercial registra un contacto directo efectivo (`CALL_EFFECTIVE`, `EMAIL_1TO1`, `MEETING_VISIT` o `INBOUND_REPLY`). Al promoverse, la cuenta se asigna al comercial (`owner_id`) y se programa una tarea obligatoria en su agenda *"Mi Día"*.
   - **Transición `PROSPECTO` ➔ `POTENCIAL`:** Ocurre únicamente cuando se formaliza una oportunidad de venta con importe económico cuantificado (`estimated_amount > 0`) y fecha de cierre (`expected_close_date`). Si un prospecto no tiene importe ni fecha, no puede ser potencial, protegiendo así la fiabilidad del *forecasting*.
   - **Transición a `CLIENTE` (Exclusiva por ERP):** Un `LEAD`, `PROSPECTO` o `POTENCIAL` solo pasa a `CLIENTE` cuando el ERP notifica el primer pedido firme (`CONFIRMADO` o `FACTURADO`), fijando `first_order_date`.
   - **Reciclaje de Cuentas (>60 días):** Cuentas en `PROSPECTO` o `POTENCIAL` sin actividad durante más de 60 días son devueltas a la bolsa común (`owner_id = NULL`, `lifecycle_stage = INACTIVO` o `LEAD`).

3. **Jerarquía Comercial Canal Indirecto (Distribuidor vs. Cliente Final):**
   - **Distribuidor (`DISTRIBUIDOR`):** Mayorista logístico y financiero que asume el pago (*Cliente Factura*).
   - **CLIENTE_FINAL (`CLIENTE_FINAL` - Cliente del Distribuidor):** Punto de consumo final (restaurante, taller, filial).
   - **Regla de Integridad:** Un `CLIENTE_FINAL` exige de forma obligatoria la asignación de su distribuidor de cabecera (`billing_account_id`). En los pedidos se audita la doble trazabilidad (*Cliente Pedido* vs. *Cliente Factura*).

4. **Puente Marketing ➔ Ventas:**
   - Los envíos masivos de mailing, aperturas o lecturas de newsletters **JAMÁS** alteran el estado de un lead.
   - Si un lead hace clic en un enlace de **Alta Intención** (ej. *"Solicitar Tarifa"*, *"Pedir Asesor"*), el sistema genera automáticamente una **Tarea Prioritaria (`HIGH_INTENT`)** en la vista *"Mi Día"* del comercial. Solo cuando el comercial ejecuta el contacto, la máquina de estados promueve la cuenta.

5. **Higiene RGPD Automática:**
   - Un rebote duro (*Hard Bounce*) desactiva de inmediato `account.email_valid = False`.
   - Una baja voluntaria (*Unsubscribed / Spam*) fija `account.opt_in_marketing = False`.
   - El constructor de segmentos dinámico excluye en vivo cualquier contacto sin consentimiento o inválido.

6. **Módulo de IA BYOK (*Bring Your Own Key*) Deshabilitado por Defecto:**
   - La plataforma no depende de IA externa para funcionar. Por defecto el módulo está en `OFF`.
   - Panel de control en `/settings/ai` restringido a `SUPER_ADMIN` para conectar proveedores corporativos: Microsoft Azure OpenAI / Copilot (cumplimiento RGPD tenant privado), OpenAI, Google Gemini, Anthropic Claude o Mock Local.

---

## 3. ESPECIFICACIÓN DE FASES Y MÓDULOS

### FASE 1: Core Backend, Autenticación RBAC y UI Embudo + Mi Día
- **Roles:**
  - `SUPER_ADMIN`: Control total de infraestructura, usuarios, claves IA y configuración ERP.
  - `ADMIN_MARKETING`: Acceso a embudo global, importador masivo, mailing y sandbox ERP.
  - `COMERCIAL`: Acceso a la bolsa de leads, sus cuentas asignadas (`owner_id`), agenda "Mi Día" y modal de interacción.
- **Modelos Principales:** `User`, `Account`, `Opportunity`, `Interaction`, `Task`.
- **Motor de Estados:** `backend/app/services/state_machine.py`.
- **Frontend:**
  - Login con 1-clic para credenciales de demostración.
  - Navbar con indicador de rol, buscador global y switch rápido de usuario.
  - Dashboard de Embudo: Pestañas/Columnas Kanban y vista Tabla con filtros por comercial, fase y tipología.
  - Vista *"Mi Día"*: Tareas vencidas, tareas de hoy con badge de prioridad y tareas futuras.
  - Ficha 360º de Cuenta (Drawer lateral) con edición rápida, timeline de interacciones y vinculación Distribuidor/CLIENTE_FINAL.
  - Endpoint de Captación: `POST /api/webhooks/lead` con cabecera `X-API-Key: nexus_webhook_secret_key_2026`.

### FASE 2: Importador Masivo en 4 Etapas y Sincronización ERP
- **Asistente de Importación:**
  1. *Carga y Staging:* Carga de archivos `.csv`, `.xlsx` o `.json` en tabla aislada `import_staging_rows`.
  2. *Mapeo Dinámico:* Mapeo visual de columnas hacia el modelo del CRM (incluyendo fase inicial, tipología y CIF del distribuidor si es Cliente Final).
  3. *Validación y Deduplicación:* Normalización E.164, detección difusa (*fuzzy matching*) de duplicados por CIF, email o teléfono. Salvaguarda de forecasting: degrada de `POTENCIAL` a `PROSPECTO` si no hay importe y fecha de cierre.
  4. *Consolidación Ordenada:* Inserta primero Distribuidores y luego CLIENTE_FINALs vinculando `billing_account_id`.
- **Integración ERP:**
  - Modelo `ErpOrderCache` con trazabilidad *Cliente Pedido* vs. *Cliente Factura*.
  - Conversión automática a `CLIENTE` al entrar el primer pedido confirmado/facturado.
  - Panel Sandbox ERP: Simulador interactivo de pedidos para validar la máquina de estados.

### FASE 3: Motor de Mailing Multi-ESP y Puente Marketing ➔ Ventas
- **Patrón Adapter:** `BaseMailingProvider` con implementaciones para `SandboxMailingProvider` (local), `MailchimpProvider`, `BrevoProvider` y `ResendProvider`.
- **Gestión de Plantillas:** Plantillas HTML con variables `{{nombre}}`, `{{empresa}}`, `{{comercial}}` y definición de URLs de alta intención.
- **Segmentador Dinámico:** Estimación en tiempo real del tamaño de audiencia excluyendo no-consentidos y correos inválidos.
- **Webhook de Eventos:** `POST /api/webhooks/mailing/event` que gestiona aperturas, clics normales, clics de alta intención (disparando tareas `HIGH_INTENT`), rebotes y bajas.
- **Simulador Sandbox de Mailing:** Pestaña en Sandbox para probar aperturas, clics y bajas con un clic.

### FASE 4: Arquitectura IA Multi-Proveedor (BYOK) y 5 Módulos B2B
- **Panel de Configuración:** `/settings/ai` con interruptor general ON/OFF, claves enmascaradas y test de ping en tiempo real.
- **Los 5 Módulos de IA:**
  1. *AI Lead Enricher:* Inferencia de sector, actividad y resumen comercial (`ai_summary`) a partir del dominio web o razón social.
  2. *Voice-to-CRM:* Procesamiento de dictados por voz tras una visita o llamada comercial. Extrae automáticamente acuerdos, importe (€) y fecha de cierre, creando la oportunidad y promoviendo la cuenta.
  3. *Inbox Sync:* Análisis semántico de correos para detectar intención (`TARIFAS`, `REUNION`, `DESCARTE`) y registrar actividad.
  4. *Churn Engine ERP:* Detección predictiva de riesgo de abandono en clientes habituales que superan 1.5x a 3x su intervalo medio de recompra, sugiriendo plantilla de reactivación y tarea `CHURN_ALERT`.
  5. *Redactor de Mailing IA:* Generación asistida de asuntos y plantillas HTML responsive a partir de un prompt en lenguaje natural.

---

## 4. ESTRUCTURA DE ARCHIVOS ESPERADA

```text
Nexus-CRM/
├── .env.example
├── .env
├── README.md
├── start_windows.ps1
├── backend/
│   ├── requirements.txt
│   ├── seed.py
│   ├── app/
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── main.py
│   │   ├── models/ (users, accounts, opportunities, interactions, tasks, erp, mailing, staging, ai)
│   │   ├── schemas/ (pydantic schemas)
│   │   ├── services/
│   │   │   ├── auth.py
│   │   │   ├── state_machine.py
│   │   │   ├── importer.py
│   │   │   ├── erp_sync.py
│   │   │   ├── mailing_provider.py
│   │   │   ├── mailing_service.py
│   │   │   └── ai/ (provider_base, copilot_azure, openai, gemini, claude, mock, factory)
│   │   └── routers/ (auth, accounts, opportunities, interactions, tasks, erp, imports, mailing, ai, webhooks)
│   └── tests/ (test_phase1, test_phase2, test_phase3, test_phase4, test_prospect_hierarchy, conftest)
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       ├── context/ (AuthContext)
│       ├── services/ (api)
│       ├── components/ (Navbar, AccountDrawer, InteractionModal, VoiceToCRMModal, ChurnAlertsWidget, ui)
│       └── pages/ (LoginPage, DashboardFunnel, MyDay, ImporterPage, MailingPage, SandboxPage, AISettingsPage, UserManual)
└── Documentacion/
    ├── PLAN_MAESTRO_NEXUS_CRM.md
    ├── presentacion.html
    └── prospecto y jerarquia cliente.md
```

---

## 5. BATERÍA DE PRUEBAS AUTOMATIZADAS REQUERIDA

Debes incluir una suite de pruebas con **pytest** que contenga como mínimo **25 tests unitarios e integrados** validando:
1. Autenticación JWT y control de acceso RBAC.
2. Incremento de intentos de contacto en llamadas no contestadas (`INTENTO_1`, `INTENTO_2`).
3. Promoción automática de `LEAD` a `PROSPECTO` ante contacto efectivo y a `POTENCIAL` ante oportunidad cuantificada.
4. Jerarquía mayorista: validación obligatoria de Distribuidor para todo Cliente Final y salvaguarda de forecasting.
5. Deduplicación difusa en el importador masivo en 4 etapas.
6. Conversión exclusiva a `CLIENTE` al entrar el primer pedido del ERP.
7. Regla de oro de alta intención: un clic en enlace de tarifa crea una tarea urgente sin alterar el estado del lead.
8. Higiene automática RGPD ante hard bounces y bajas.
9. Guardias de IA desactivada por defecto, test de conexión y los 5 módulos funcionales de IA.

Genera el proyecto de forma limpia, modular, documentada y completamente ejecutable con un único script `start_windows.ps1`.
```

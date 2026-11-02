# Nexus CRM - Plan Maestro de Arquitectura y Prompts por Fases (Windows + Antigravity)

Este documento contiene la especificación técnica completa y la guía de prompts secuenciales (Fase 1 a Fase 5) para construir **Nexus CRM** en un entorno **Windows** utilizando **Gemini en Antigravity**.

---

## PARTE 1: PROMPT MAESTRO DE CONTEXTO GLOBAL
*(Instrucción: Pega esta Parte 1 al inicio de tu sesión en Antigravity o guárdala como archivo `GEMINI.md` en la raíz del proyecto para que el agente mantenga las reglas de negocio en todas las fases).*

### 1. Visión General del Proyecto
**Nexus CRM** es un sistema CRM B2B con inteligencia artificial integrada, diseñado alrededor de una máquina de estados comercial de 4 fases (**Lead -> Prospecto -> Potencial -> Cliente**), categorización jerárquica de canal indirecto (**Distribuidor / Cliente Factura** vs. **Cliente Final (Canal Indirecto / Cliente Pedido)**), sincronización con pedidos de un **ERP**, un motor de **Importación Masiva con Staging** protegido contra corrupción de *forecasting*, un módulo de **Mailing Multi-Proveedor (Mailchimp/Brevo/Resend/Sandbox) con puente Marketing-Ventas**, funcionalidades de **IA con Google Gemini** y un **Servidor MCP (Model Context Protocol)**.

### 2. Stack Tecnológico (Entorno Windows)
* **Sistema Operativo Destino:** Windows 10/11 (scripts `.ps1` PowerShell para automatización).
* **Backend:** Python 3.11+ con **FastAPI**, **SQLAlchemy 2.0** (ORM), **Pydantic v2**, autenticación **JWT (OAuth2)** con `passlib[bcrypt]`.
* **Base de Datos:** **SQLite3** local (`nexus_crm.db`) con `PRAGMA foreign_keys=ON` y `PRAGMA journal_mode=WAL` (preparado mediante SQLAlchemy para migrar a PostgreSQL cambiando solo `DATABASE_URL` en `.env`).
* **Inteligencia Artificial:** Arquitectura agnóstica desacoplada (*Adapter Pattern*) con activación opcional (deshabilitado por defecto) y soporte para **Microsoft Copilot / Azure OpenAI** (licencias corporativas de empresa), **OpenAI**, **Google Gemini**, **Anthropic Claude** y modo **Simulación / Mock** local.
* **Mailing / ESP:** Arquitectura basada en patrón *Adapter/Provider* compatible con **Sandbox Local**, **Mailchimp API**, **Brevo API** y **Resend API**, más un receptor universal de **Webhooks**.

### 3. Reglas de Oro del Negocio (Inquebrantables)
1. **Embudo de 4 Fases y Separación Cuenta vs. Oportunidades (Alternativa B):**
   * El ciclo de vida comercial formal se compone de 4 fases secuenciales:
     $$\text{Lead} \rightarrow \text{Prospecto} \rightarrow \text{Potencial} \rightarrow \text{Cliente}$$
   * La tabla `accounts` mantiene el estado maestro (`lifecycle_stage`: `LEAD`, `PROSPECTO`, `POTENCIAL`, `CLIENTE`, `INACTIVO`) y la tipología (`client_type`: `DISTRIBUIDOR`, `CLIENTE_FINAL`).
   * Las negociaciones/presupuestos se gestionan en la tabla vinculada `opportunities` (1:N) y cada intento de contacto en `interactions` (1:N).
2. **Transición `LEAD` -> `PROSPECTO` ("Cualificación Comercial"):**
   * Un `LEAD` es captación en bruto sin validar (campañas, ferias, web).
   * Pasa a `PROSPECTO` **automáticamente** cuando un comercial registra una acción de contacto directa efectiva: llamada saliente efectiva (`CALL_EFFECTIVE`), reunión/visita (`MEETING_VISIT`), correo directo 1-a-1 (`EMAIL_1TO1`), o respuesta entrante cualificada (`INBOUND_REPLY`). Asigna `owner_id` (si no tenía) y exige tarea de seguimiento.
   * **Restricción crítica:** Un envío masivo de Mailing o una apertura **JAMÁS** cualifica un `LEAD`. Clics de alta intención o respuestas generan tareas prioritarias; solo cuando el comercial ejecuta el contacto se pasa a `PROSPECTO`.
3. **Transición `PROSPECTO` -> `POTENCIAL` ("Negociación Cuantificada"):**
   * Pasa de `PROSPECTO` a `POTENCIAL` **únicamente** cuando se crea una negociación activa formal (`Opportunity`) con valor económico cuantificado (`estimated_amount > 0`) y fecha estimada de cierre (`expected_close_date`). Esto previene contaminar las métricas de previsión (*forecasting*).
4. **Categorización Jerárquica de Clientes (Canal Indirecto Distribuidor vs. Cliente Final):**
   * **Cliente Distribuidor (`DISTRIBUIDOR`):** Mayorista logístico que asume y abona las facturas (*Cliente Factura*).
   * **CLIENTE_FINAL (`CLIENTE_FINAL`):** Cliente del Distribuidor / punto de venta o establecimiento final (ej. restaurante, bar, hotel).
   * **Regla de integridad:** Al cualificar un registro como `CLIENTE_FINAL`, es **obligatorio** vincularlo a un Distribuidor activo (`billing_account_id` / *Cliente Factura*). En pedidos de ERP, se mantiene la trazabilidad *Cliente Pedido* (CLIENTE_FINAL) y *Cliente Factura* (Distribuidor).
5. **Transición a `CLIENTE` (Exclusiva por ERP):**
   * Un contacto en `LEAD`, `PROSPECTO` o `POTENCIAL` se convierte en `CLIENTE` **automáticamente** cuando el ERP registra un pedido firme (`CONFIRMADO` o `FACTURADO`) asociado a su NIF/CIF o código de cliente, registrando `first_order_date`.
6. **Protección en la Importación Masiva:**
   * Soporta asignación de estado inicial (`lead`, `prospect`, `potential`, `customer`, por defecto `lead`).
   * Soporta tipología (`distributor`, `cliente_final`). Los Clientes Finales exigen referencia al distribuidor (CIF/código) existente o presente en el mismo lote (procesando primero distribuidores).
   * Salvaguarda de forecasting: ningún registro puede importarse como `POTENCIAL` sin importe ni fecha estimada de cierre; de faltar, se degrada automáticamente a `PROSPECTO` con advertencia.
7. **Roles y Permisos:**
   * **Rol `SUPER_ADMIN` (Sistemas / IT):** Acceso total a la infraestructura técnica y seguridad: gestión y alta de usuarios (`/api/auth/users`), configuración y credenciales de IA corporativa (`BYOK`), importador masivo, configuración y simulación ERP, campañas de mailing y supervisión global.
   * **Rol `ADMIN_MARKETING` (Dirección y Marketing):** Gestión operativa global: importador masivo y consolidación, simulador ERP, campañas de mailing, analítica global, bolsa de leads y reasignación de tareas (sin acceso a claves maestras de IA ni alta de usuarios).
   * **Rol `COMERCIAL` (Ventas):** Acceso a la "Bolsa Común de Leads", a sus propios `PROSPECTOS`, `POTENCIALES` y `CLIENTES` (`owner_id`), vista "Mi Día", ficha 360º y herramientas de IA comercial.

### 4. Estructura de Carpetas del Proyecto
- `backend/`
  - `app/main.py`, `app/config.py`, `app/database.py`
  - `app/models/` (users, accounts, opportunities, interactions, tasks, erp, mailing, staging)
  - `app/schemas/` (Esquemas Pydantic)
  - `app/services/` (state_machine.py, importer.py, erp_sync.py, mailing_provider.py, ai_service.py)
  - `app/routers/` (auth, accounts, opportunities, imports, erp, mailing, ai, webhooks, sandbox)
  - `mcp_server.py` (Servidor Model Context Protocol)
  - `seed.py` (Poblador de datos de prueba realistas)
  - `requirements.txt`
- `frontend/`
  - `src/components/`, `src/pages/` (Login, DashboardFunnel, MyDay, Account360, Importer, Mailing, SandboxSimulator), `src/context/`, `src/services/`
  - `package.json`, `vite.config.js`
- `.env.example`
- `start_windows.ps1`

---

## PARTE 2: PROMPTS PASO A PASO POR FASES PARA ANTIGRAVITY

### FASE 1: Core del CRM, Autenticación por Roles, Embudo de 4 Fases y Máquina de Estados

**PROMPT FASE 1:**
Actúa como un Arquitecto de Software Full-Stack Senior. Vamos a construir la **Fase 1 de Nexus CRM** en mi entorno **Windows** siguiendo las reglas del Plan Maestro.

**Tareas a implementar en esta Fase 1:**
1. **Inicialización del Proyecto (Backend FastAPI + Frontend React/Vite/Tailwind):**
   - Crea la estructura de carpetas `backend/` y `frontend/`, el archivo `.env.example` y un script `start_windows.ps1` para inicializar el entorno virtual en Windows (`.venv\Scripts\Activate.ps1`), instalar dependencias, ejecutar el `seed.py` y levantar ambos servidores.
2. **Autenticación y Roles (`SUPER_ADMIN`, `ADMIN_MARKETING` y `COMERCIAL`):**
   - Modelo `User` (`id`, `name`, `email`, `password_hash`, `role`, `is_active`).
   - Login JWT (`/api/auth/login` y `/api/auth/me`).
   - Crea en `seed.py` un usuario Superadmin (`superadmin@nexuscrm.com` / `superadmin123`), Admin (`admin@nexuscrm.com` / `admin123`) y dos Comerciales (`carlos@nexuscrm.com` y `laura@nexuscrm.com` / `comercial123`).
3. **Modelo de Datos Core (Embudo de 4 Fases + Jerarquía CLIENTE_FINAL/Distribuidor):**
   - Tabla `accounts`: `id`, `company_name`, `contact_name`, `email`, `email_valid` (bool), `phone` (E.164), `tax_id` (NIF/CIF limpio), `erp_customer_id`, `source`, `opt_in_marketing` (bool), `lifecycle_stage` (`LEAD`, `PROSPECTO`, `POTENCIAL`, `CLIENTE`, `INACTIVO`), `client_type` (`DISTRIBUIDOR`, `CLIENTE_FINAL`), `billing_account_id` (FK a `accounts.id` para Clientes Finales vinculados a su distribuidor factura), `sub_status` (`SIN_CONTACTAR`, `INTENTO_1`, `INTENTO_2`, `CONTACTADO_CUALIFICANDO`, `DESCARTADO`), `owner_id` (FK a `users`, nullable para Leads en bolsa común), `ai_summary` (texto), `first_order_date`, `last_activity_at`, `created_at`.
   - Tabla `opportunities`: `id`, `account_id`, `owner_id`, `title`, `detected_need`, `estimated_amount`, `status` (`ABIERTA`, `GANADA`, `PERDIDA`), `expected_close_date`.
   - Tabla `interactions`: `id`, `account_id`, `user_id`, `type` (`CALL_NO_ANSWER`, `CALL_EFFECTIVE`, `EMAIL_1TO1`, `MEETING_VISIT`, `INBOUND_REPLY`, `NOTE`), `summary`, `created_at`.
   - Tabla `tasks`: `id`, `account_id`, `assigned_to_id`, `title`, `due_date`, `priority` (`NORMAL`, `HIGH_INTENT`, `CHURN_ALERT`), `is_completed`, `origin`.
4. **Motor de Reglas de Transición (`services/state_machine.py`):**
   - Si una cuenta está en `LEAD` y se registra una interacción de tipo `CALL_NO_ANSWER`, permanece en `LEAD` pero cambia `sub_status` a `INTENTO_1` o `INTENTO_2`.
   - Si una cuenta está en `LEAD` y un comercial registra una acción efectiva (`CALL_EFFECTIVE`, `EMAIL_1TO1`, `MEETING_VISIT`, `INBOUND_REPLY`), el servicio **cambia automáticamente `lifecycle_stage` a `PROSPECTO`**, cambia `sub_status` a `CONTACTADO_CUALIFICANDO`, asigna `owner_id` al comercial actual (si no tenía) y exige/crea una `Task` con la fecha de próximo seguimiento.
   - Si una cuenta está en `PROSPECTO` y se crea una oportunidad comercial con `estimated_amount > 0` y `expected_close_date`, **cambia automáticamente a `POTENCIAL`**.
   - **Regla de Caducidad (Reciclaje de Prospectos y Potenciales):** Endpoint y función que detecta cuentas en `PROSPECTO` o `POTENCIAL` con `last_activity_at` > 60 días sin actividad/pedidos, permitiendo devolverlas a bolsa común (`owner_id = NULL`, `lifecycle_stage = INACTIVO` o `LEAD`).
5. **Captación Rápida:**
   - Endpoint público `POST /api/webhooks/lead` protegido por cabecera `X-API-Key` para inyectar Leads desde formularios web directamente en estado `LEAD` (con `client_type` opcional).
6. **Frontend React (Pantallas de Fase 1 adaptadas):**
   - Pantalla de Login y barra superior con indicador de Rol y usuario activo.
   - **Dashboard del Embudo de 4 Fases:** Vista Kanban y Tabla con columnas/pestañas (`LEAD` - Bolsa Común, `PROSPECTO`, `POTENCIAL`, `CLIENTE`), filtros por sub-estado, comercial y tipología de cliente (`DISTRIBUIDOR` vs `CLIENTE_FINAL`).
   - **Vista "Mi Día" (Calendario Comercial):** Muestra al comercial logueado qué Leads intentar contactar hoy, qué Prospectos están pendientes de cualificación/distribuidor y qué Potenciales tienen seguimiento hoy o vencidas.
   - **Modal de Registro Rápido de Interacción:** Al registrar una llamada efectiva sobre un Lead, promueve a `PROSPECTO`. Si además se define una oportunidad valorada con fecha de cierre, promueve directamente a `POTENCIAL`.
   - **Ficha de Cuenta / Drawer:** Muestra la tipología de cliente y, en caso de CLIENTE_FINAL, exige y muestra el *Distribuidor Asociado / Cliente Factura*. Si es Distribuidor, muestra la lista de sus Clientes Finales vinculados.

---

### FASE 2: Módulo de Importación Masiva (4 Etapas + Jerarquía CLIENTE_FINAL y Salvaguarda) + Integración ERP

**PROMPT FASE 2:**
Ahora vamos a implementar la **Fase 2 de Nexus CRM**: el **Módulo de Importación Masiva en 4 etapas adaptado a la jerarquía comercial** y la **Integración con el ERP + Ficha 360º + Panel Sandbox de Simulación ERP**.

**Tareas a implementar en esta Fase 2:**
1. **Módulo de Importación Masiva (`services/importer.py` y UI paso a paso):**
   - **Etapa 1 (Subida y Staging):** Soporte para `.csv`, `.xlsx` y `.json`. Guarda cada fila en `import_staging_rows` sin ensuciar la tabla `accounts`.
   - **Etapa 2 (Mapeador Dinámico de Columnas):** Permite mapear columnas de contacto y además:
     - `lifecycle_stage`: mapea estado inicial (`lead`, `prospect`, `potential`, `customer`, default `lead`).
     - `client_type`: tipología (`distributor` o `cliente_final`).
     - `distributor_ref`: CIF o código del distribuidor asociado si es Cliente Final.
     - `estimated_amount` y `expected_close_date`: para importación como Potencial.
   - **Etapa 3 (Limpieza, Validación Jerárquica y Deduplicación):**
     - Normalización de teléfonos E.164, emails y NIF/CIF.
     - **Validación Cliente Final vs Distribuidor:** Si una fila es Cliente Final, valida que su `distributor_ref` exista en base de datos o venga en el mismo archivo como `distributor`. En caso contrario, marca la fila en error impidiendo su consolidación rota.
     - **Salvaguarda de Forecasting:** Si una fila viene marcada como `POTENCIAL` pero carece de importe o fecha de cierre, se reclasifica automáticamente como `PROSPECTO` con advertencia.
   - **Etapa 4 (Consolidación con Orden Jerárquico):**
     - Procesa primero a los Distribuidores para asegurar que sus IDs existen en base de datos, y luego procesa los Clientes Finales vinculando `billing_account_id`.
     - Si el registro importado ya tiene pedidos en `erp_orders_cache` -> se crea como **`CLIENTE`**.
2. **Integración ERP Híbrida con Trazabilidad CLIENTE_FINAL / Factura:**
   - Tabla `erp_orders_cache`: `id`, `order_id`, `erp_customer_id`, `tax_id`, `account_id` (Cliente Pedido), `billing_account_id` (Cliente Factura / Distribuidor), `order_date`, `total_amount`, `status`, `top_products`, `order_lines`.
   - **Regla de Conversión a `CLIENTE`:** Cuando entra un pedido `CONFIRMADO` o `FACTURADO`, promueve la cuenta del pedido a `CLIENTE` (y a su distribuidor si procede), registrando `first_order_date`.
3. **Ficha 360º del Contacto con Visor ERP y Jerarquía:**
   - Para un Cliente Final: muestra el Distribuidor que factura sus pedidos.
   - Para un Distribuidor: muestra métricas globales consolidadas y sus Clientes Finales asociados.
4. **Simulador ERP en UI (Sandbox):**
   - Permite simular pedidos tanto para Distribuidores como para Clientes Finales vinculados, comprobando en tiempo real la trazabilidad de facturación y la conversión automática a `CLIENTE`.

---

### FASE 3: Motor de Mailing Multi-Proveedor (Mailchimp/Brevo/Resend), Webhooks y Puente Marketing-Ventas

**PROMPT FASE 3:**
Ahora vamos a desarrollar la **Fase 3 de Nexus CRM**: el **Módulo de Mailing y Automatización de Campañas** con arquitectura adaptable a **Mailchimp, Brevo, Resend y Modo Sandbox Local**, respetando estrictamente la regla del puente entre Marketing y Ventas.

**Tareas a implementar en esta Fase 3:**
1. **Arquitectura Desacoplada de Transporte (`services/mailing_provider.py`):**
   - Implementa una clase base `BaseMailingProvider` y un selector configurable desde `.env` (`MAILING_PROVIDER=sandbox|mailchimp|brevo|resend`):
     - `SandboxMailingProvider`: Simula el envío en segundo plano con *rate limiting*, guarda el renderizado HTML final en base de datos y permite disparar eventos de prueba (Abierto, Clic, Rebote, Baja) desde el Panel Sandbox.
     - `MailchimpProvider`: Permite sincronizar el segmento seleccionado hacia una Audiencia/Etiqueta de Mailchimp vía Mailchimp Marketing API (`MAILCHIMP_API_KEY`, `MAILCHIMP_SERVER_PREFIX`, `MAILCHIMP_LIST_ID`) o enviar vía Mailchimp Transactional (Mandrill), además de procesar los Webhooks de Mailchimp.
     - `BrevoProvider` y `ResendProvider`: Envío transaccional/lotes por API REST con etiquetas de campaña e ID de contacto en los metadatos para trazabilidad por Webhook.
2. **Modelos de Mailing y Gestor de Plantillas:**
   - Tabla `mailing_templates`: `id`, `name`, `subject`, `body_html`, `high_intent_links` (lista de URLs consideradas de "Alta Intención", ej. `https://.../solicitar-tarifa`).
   - Tabla `mailing_campaigns`: `id`, `name`, `template_id`, `target_stage` (`LEAD`, `POTENCIAL`, `CLIENTE`), `segment_filters` (JSON), `provider_used`, `status` (`DRAFT`, `SENDING`, `COMPLETED`), `stats` (enviados, entregados, abiertos, clics, rebotes, bajas).
   - Tabla `mailing_recipients`: `id`, `campaign_id`, `account_id`, `email`, `status` (`SENT`, `DELIVERED`, `OPENED`, `CLICKED`, `HIGH_INTENT_CLICKED`, `HARD_BOUNCE`, `SOFT_BOUNCE`, `UNSUBSCRIBED`, `SPAM`), `updated_at`.
   - Renderizador de variables dinámicas: reemplaza `{{nombre}}`, `{{empresa}}`, `{{comercial}}` en el asunto y cuerpo HTML.
3. **Segmentación Dinámica por Embudo y Datos ERP:**
   - Constructor visual de segmentos en React que excluya siempre registros con `email_valid == False` o `opt_in_marketing == False` y permita filtrar por:
     - **Nurturing para Leads:** Leads por origen (`source`) o antigüedad.
     - **Reactivación de Potenciales:** Potenciales cuyo último contacto (`last_activity_at`) fue hace más de X días y no tienen pedidos en ERP.
     - **Fidelización / Cross-sell para Clientes (Datos ERP):** Clientes que compraron un producto específico (`top_products`) o cuya última fecha de pedido en `erp_orders_cache` fue hace más de X días.
4. **Webhooks de Eventos, Higiene Automática y Puente Marketing -> Ventas:**
   - Endpoint `POST /api/webhooks/mailing/event` (compatible con payloads de Mailchimp/Brevo y con el Simulador Sandbox).
   - **Higiene Automática:**
     - Si el evento es `HARD_BOUNCE` -> actualiza automáticamente `account.email_valid = False` y registra nota en el timeline.
     - Si el evento es `UNSUBSCRIBED` o `SPAM` -> actualiza automáticamente `account.opt_in_marketing = False`.
   - **Puente Marketing -> Ventas (Regla de Negocio Crítica):**
     - Enviar la campaña o recibir un evento `OPENED` o `CLICKED` normal **NUNCA** cambia a un `LEAD` de estado.
     - Si un `LEAD` dispara un evento `HIGH_INTENT_CLICKED` (clic en enlace de alta intención como *"Solicitar tarifa / Hablar con un asesor"*) o `INBOUND_REPLY` (responde a la campaña), el sistema **crea automáticamente una Tarea prioritaria (`priority = HIGH_INTENT`)** asignada a un comercial y muestra una alerta destacada en su vista "Mi Día". Cuando el comercial ejecuta esa tarea y registra el contacto, la máquina de estados promueve el `LEAD` a `POTENCIAL`.
5. **Simulador de Eventos de Mailing en el Panel Sandbox:**
   - En la vista Sandbox del Frontend, añade una pestaña para seleccionar cualquier destinatario de una campaña enviada y simular con un clic: *Abrir correo*, *Clic en enlace de Alta Intención ("Solicitar Tarifa")*, *Hard Bounce* o *Solicitar Baja (Unsubscribe)*.

---

### FASE 4: Módulos de Inteligencia Artificial Agnóstica Multi-Proveedor (Microsoft Copilot, OpenAI, Gemini, Claude) y Panel de Configuración BYOK [IMPLEMENTADA ✅]

**PROMPT FASE 4:**
Vamos a implementar la **Fase 4 de Nexus CRM**: la **Arquitectura de Inteligencia Artificial Multi-Proveedor (BYOK - Bring Your Own Key / License)** con el módulo **deshabilitado por defecto**, un **Panel de Configuración de IA** para que cada empresa conecte su propio proveedor corporativo (**Microsoft Copilot / Azure OpenAI**, OpenAI, Google Gemini, Anthropic Claude o Modo Simulación), y los **5 Módulos de IA Aplicada al Negocio B2B**.

**Tareas a implementar en esta Fase 4 (`services/ai/`, `routers/ai.py` y UI React):**
1. **Activación Opcional y Panel de Configuración de IA (Admin Settings):**
   - **Estado por defecto:** Deshabilitado. El CRM opera sin requerir ningún servicio de IA externo ni mostrar botones rotos o alertas de configuración. Si está inactivo, la interfaz oculta los controles de IA manteniendo la operativa 100% limpia.
   - **Modelo de Configuración en Base de Datos (`system_settings` / `ai_configs`):** Almacena el estado activo/inactivo, el proveedor seleccionado (`copilot_azure`, `openai`, `gemini`, `claude`, `mock`), el endpoint corporativo, el nombre de despliegue/modelo y la clave de API cifrada.
   - **Panel Visual en Configuración (`Settings -> Asistente de IA`):**
     - Interruptor general: `[ Habilitar Módulo de IA (ON/OFF) ]`.
     - Selector desplegable de proveedores con logotipos y badges:
       - 🏢 **Microsoft Copilot / Azure OpenAI:** Utiliza la suscripción corporativa existente de la empresa (Endpoint de Azure, Deployment Name y API Key / Azure AD), garantizando cumplimiento estricto de RGPD y privacidad dentro del tenant privado de Microsoft sin entrenar modelos públicos.
       - 🟢 **OpenAI Oficial:** Modelos `gpt-4o` o `gpt-4o-mini`.
       - 🔵 **Google Gemini:** Modelos `gemini-2.5-flash` o `pro`.
       - 🟣 **Anthropic Claude:** Modelo `claude-3-5-sonnet`.
       - 🧪 **Modo Simulación / Mock:** Respuestas sintéticas contextuales para demos y pruebas locales sin coste.
     - Botón **"Probar Conexión"**: Realiza un test sintético en tiempo real y muestra el estado de salud de la conexión (*Conectado con éxito a Microsoft Copilot* / *Error de credenciales*).

2. **Arquitectura Desacoplada de Proveedores (`services/ai/provider_base.py`):**
   - Interfaz abstracta `BaseAIProvider` con métodos unificados independientes del modelo:
     - `enrich_lead(company_name, email, domain) -> LeadEnrichmentResult`
     - `parse_voice_interaction(audio_bytes_or_transcript) -> VoiceInteractionResult`
     - `detect_email_intent(email_body, sender) -> EmailIntentResult`
     - `predict_churn_risk(account, orders_history) -> ChurnPredictionResult`
     - `generate_campaign_content(natural_language_prompt) -> CampaignCopyResult`
   - Implementaciones concretas del adaptador: `CopilotAzureProvider`, `OpenAIProvider`, `GeminiProvider`, `ClaudeProvider` y `MockAIProvider`.

3. **Los 5 Casos de Uso de IA en la Interfaz (Visibles y activos cuando el módulo está en ON):**
   - **a) Enriquecedor Automático de Leads (`AI Lead Enricher`):** Analiza el dominio corporativo web e infiere sector, actividad, tamaño y genera el `ai_summary` en la ficha de cuenta antes de la primera llamada.
   - **b) Asistente de Voz / Dictado Post-Visita (`Voice-to-CRM`):** Botón de micrófono en "Mi Día" y en la Ficha 360º. Dictado en lenguaje natural extrae en 1 clic: interacción, oportunidad (€), fecha de seguimiento y promociona automáticamente el `LEAD` a `POTENCIAL`.
   - **c) Detección Automática de Contacto (`Inbox Sync`):** Analiza correos salientes pegados o sincronizados y promueve el `LEAD` a `POTENCIAL` registrando `EMAIL_1TO1` en el timeline.
   - **d) Alertas Predictivas de Fuga sobre Datos ERP (`Churn & Upsell Engine`):** Detecta clientes que superan 2x su intervalo habitual de compra y genera una tarea prioritaria `CHURN_ALERT` con propuesta redactada a medida.
   - **e) Generador de Campañas en Lenguaje Natural:** Caja de texto libre en el módulo de mailing que traduce instrucciones en filtros de segmentación y redacta el asunto y cuerpo con variables `{{nombre}}` y `{{empresa}}`.

#### Especificación Técnica y Arquitectura Implementada (Fase 4)

##### 1. Diagrama de Arquitectura Backend (Patrón Adapter)
```mermaid
graph TD
    UI[Frontend React / Vite] -->|HTTPS / JWT| Router[FastAPI Router: /api/ai]
    
    subgraph "Persistencia y Configuración"
        DB[(SQLite / PostgreSQL: ai_configs)]
        Router -->|Lee config activa| Factory[AI Provider Factory]
    end

    subgraph "Capa de Adaptadores (Patrón Adapter)"
        Factory -->|Instancia interfaz| Base[BaseAIProvider]
        Base <|-- Copilot[CopilotAzureProvider: Azure OpenAI]
        Base <|-- OpenAI[OpenAIProvider: gpt-4o / gpt-4o-mini]
        Base <|-- Gemini[GeminiProvider: gemini-2.5-flash]
        Base <|-- Claude[ClaudeProvider: claude-3-5-sonnet]
        Base <|-- Mock[MockAIProvider: Simulación Local]
    end

    subgraph "Servicios de Negocio Afectados"
        Router -->|Caso A: ai_summary| Acc[Account Model & Timeline]
        Router -->|Caso B: dictado + oportunidad| Opp[Opportunity & State Machine]
        Router -->|Caso C: intención| Int[Interaction Model & Task]
        Router -->|Caso D: cruce pedidos| ERP[ErpOrderCache & Churn Tasks]
        Router -->|Caso E: HTML templates| Mail[Mailing Service & Segmentos]
    end
```

##### 2. Interfaz Unificada del Proveedor (`BaseAIProvider`)
Todos los adaptadores (`backend/app/services/ai/`) implementan de forma estricta los métodos:
- `test_connection() -> Dict[str, Any]`: Verificación de ping sintético y credenciales.
- `enrich_lead(company_name, email, domain) -> Dict[str, Any]`: Inferencia de sector, tamaño y propuesta de valor persistida en `account.ai_summary`.
- `parse_voice_interaction(transcript, company_name) -> Dict[str, Any]`: Extracción de tipo de actividad, importe cuantificado (€) y fecha de cierre.
- `detect_email_intent(email_body) -> Dict[str, Any]`: Detección de intención (`TARIFAS`, `REUNION`, `DESCARTE`, etc.), sentimiento y urgencia.
- `predict_churn_risk(company_name, client_type, total_orders, days_since_last, avg_interval, multiplier) -> Dict[str, Any]`: Evaluación de riesgo de fuga sobre historial ERP y propuesta de reactivación.
- `generate_campaign_copy(prompt, tone, target_stage) -> Dict[str, Any]`: Redacción de asunto, preview text y plantilla HTML responsive con merge tags (`{{nombre}}`, `{{empresa}}`).

##### 3. Endpoints de la API REST (`backend/app/routers/ai.py`)
- `GET /api/ai/config`: Obtiene la configuración activa (claves de API enmascaradas `sk-****...1234`).
- `PUT /api/ai/config`: Actualiza proveedor, credenciales y estado ON/OFF (restringido a `SUPER_ADMIN`).
- `POST /api/ai/test-connection`: Ejecuta un test de conectividad sintético en vivo (restringido a `SUPER_ADMIN`).
- `POST /api/ai/lead-enrich`: Enriquecimiento automático de cuenta y actualización de `account.ai_summary`.
- `POST /api/ai/voice-to-crm`: Procesamiento de dictado post-visita con creación de oportunidad y promoción automática a `POTENCIAL` o `PROSPECTO`.
- `POST /api/ai/email-intent`: Análisis de correos entrantes / salientes y extracción de acción operativa.
- `GET /api/ai/churn-risks`: Análisis sobre `erp_orders_cache` detectando clientes con >1.5x a 3x su intervalo de compra.
- `POST /api/ai/churn-alert-task`: Creación de 1-clic de tarea prioritaria `CHURN_ALERT` asignada al comercial.
- `POST /api/ai/generate-campaign-copy`: Generación de copys y plantillas HTML para mailing en lenguaje natural.

##### 4. Suite de Pruebas Automatizadas
Ubicación: `backend/tests/test_phase4.py` (8 pruebas unitarias y de integración pasando al 100%, totalizando 25/25 tests en el proyecto):
1. `test_ai_config_disabled_by_default_and_crud`
2. `test_ai_test_connection`
3. `test_ai_disabled_guard`
4. `test_case_a_ai_lead_enricher`
5. `test_case_b_voice_to_crm_opportunity_and_promotion`
6. `test_case_c_email_intent_detection`
7. `test_case_d_churn_risk_detection_and_task`
8. `test_case_e_generate_campaign_copy`

---

### FASE 5: Servidor MCP (Model Context Protocol), Pulido Final y Suite de Pruebas

**PROMPT FASE 5:**
Vamos a completar el proyecto con la **Fase 5 de Nexus CRM**: la creación del **Servidor MCP (Model Context Protocol)** integrado y un panel de consola MCP para operar todo el CRM conversacionalmente, además de pulir los datos semilla (`seed.py`).

**Tareas a implementar en esta Fase 5:**
1. **Servidor MCP Integrado (`backend/mcp_server.py`):**
   - Implementa un servidor MCP estándar (usando `mcp` / `FastMCP` en Python) conectado directamente a la base de datos y a los servicios de negocio de `Nexus CRM`.
   - Expón las siguientes **Tools MCP**:
     1. `buscar_contacto(query: str, estado: Optional[str] = None)`
     2. `registrar_intento_contacto(account_id: int, tipo: str, notas: str, dias_proximo_seguimiento: int = 7)`
     3. `consultar_pedidos_erp(identificador: str)`
     4. `lanzar_campana(nombre_campana: str, etapa_objetivo: str, asunto: str, contenido_html: str)`
2. **Consola de Agente Conversacional MCP dentro del Frontend:**
   - Añade un botón flotante en la esquina inferior derecha de la interfaz de React ("Asistente Nexus MCP") que permita chatear en lenguaje natural invocando esas 4 herramientas del servidor MCP.
3. **Actualización de `seed.py` y Documentación (`README.md`):**
   - Asegúrate de que `seed.py` cree un escenario de demostración completo (15 Leads en bolsa común, 10 Potenciales repartidos entre comerciales con casos estancados >60 días, 8 Clientes con histórico de pedidos en ERP y casos de alerta de Churn) más archivos de ejemplo en `sample_data/` para probar el importador CSV/XLSX.
   - Documenta en `README.md` cómo arrancar en Windows con `./start_windows.ps1`, las credenciales de acceso para cada rol y la configuración de `.env`.

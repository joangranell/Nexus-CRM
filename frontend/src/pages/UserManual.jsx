import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Search,
  CheckCircle2,
  AlertTriangle,
  Flame,
  PhoneCall,
  PhoneOff,
  Mail,
  Users,
  MessageSquare,
  Building2,
  CalendarCheck,
  TrendingUp,
  Recycle,
  Zap,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  HelpCircle,
  Clock,
  Briefcase,
  ChevronRight,
  Database,
  Printer,
  Copy,
  Check,
  ExternalLink,
  MousePointerClick,
  Ban,
  UserX,
  Activity,
  Eye,
  Filter,
  Cpu,
  GitFork,
  Layers,
  Network,
  Sparkles,
  Send,
} from 'lucide-react';
import { ObjectIcon, LifecyclePath, SubStatusBadge } from '../components/ui';

export default function UserManual() {
  const [activeSection, setActiveSection] = useState('introduccion');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL'); // 'ALL' | 'COMERCIAL' | 'ADMIN'
  const [copiedKey, setCopiedKey] = useState(false);

  const sections = [
    {
      id: 'introduccion',
      title: '1. Visión General y Filosofía B2B (Embudo de 4 Etapas)',
      desc: 'Qué es Nexus CRM, la separación Cuenta vs. Oportunidad y el embudo secuencial de 4 fases.',
      roles: ['COMERCIAL', 'ADMIN'],
      badge: 'Fundamentos',
    },
    {
      id: 'maquina-estados',
      title: '2. Máquina de Estados y Reglas de Oro',
      desc: 'Cualificación progresiva: LEAD → PROSPECTO → POTENCIAL → CLIENTE y validaciones financieras.',
      roles: ['COMERCIAL', 'ADMIN'],
      badge: 'Regla de Oro',
    },
    {
      id: 'guia-comercial',
      title: '3. Guía Diaria del Comercial (Mi Día)',
      desc: 'Organización matinal, agenda de tareas, asistente de alta intención y prospección en bolsa común.',
      roles: ['COMERCIAL'],
      badge: 'Comercial',
    },
    {
      id: 'ficha-360',
      title: '4. Ficha 360º de Cuenta (Lightning Record)',
      desc: 'Highlights panel, barra chevron Path de 4 etapas, jerarquía comercial y visor ERP.',
      roles: ['COMERCIAL', 'ADMIN'],
      badge: 'Interfaz 360º',
    },
    {
      id: 'guia-admin',
      title: '5. Guía de Administración y Marketing',
      desc: 'Supervisión del embudo comercial, política de reciclaje a 60 días e inyección por Webhook.',
      roles: ['ADMIN'],
      badge: 'Administración',
    },
    {
      id: 'matriz-interacciones',
      title: '6. Matriz de Interacciones y Resultados',
      desc: 'Tabla de referencia rápida: qué ocurre exactamente con cada tipo de actividad comercial.',
      roles: ['COMERCIAL', 'ADMIN'],
      badge: 'Referencia',
    },
    {
      id: 'faq',
      title: '7. Preguntas Frecuentes y Resolución',
      desc: 'Dudas habituales sobre buzón de voz, sincronización con ERP y reactivación de cuentas.',
      roles: ['COMERCIAL', 'ADMIN'],
      badge: 'Soporte',
    },
    {
      id: 'fase-2',
      title: '8. Importación Masiva & Sincronización ERP (Fase 2)',
      desc: 'Módulo de carga en 4 etapas (CSV, XLSX, JSON), deduplicación difusa y sincronización con ERP/Sandbox.',
      roles: ['ADMIN', 'COMERCIAL'],
      badge: 'Fase 2',
    },
    {
      id: 'fase-3',
      title: '9. Motor de Mailing Multi-Proveedor & Automatización (Fase 3)',
      desc: 'Arquitectura ESP (Sandbox, Mailchimp, Brevo, Resend), segmentación dinámica, higiene RGPD y Puente Marketing-Ventas.',
      roles: ['ADMIN', 'COMERCIAL'],
      badge: 'Fase 3',
    },
    {
      id: 'jerarquia-clientes',
      title: '10. Jerarquía Comercial: Distribuidores y Clientes Finales (Canal Indirecto)',
      desc: 'Modelo de 2 niveles: Cliente Factura vs Cliente Pedido, salvaguarda de forecasting y resolución jerárquica.',
      roles: ['COMERCIAL', 'ADMIN'],
      badge: 'Jerarquía B2B',
    },
    {
      id: 'fase-4-ai',
      title: '11. Asistente de IA Agnóstica Multi-Proveedor (BYOK) (Fase 4)',
      desc: 'Arquitectura Bring Your Own Key, soporte Microsoft Copilot / Azure OpenAI, y los 5 casos de uso de IA B2B.',
      roles: ['ADMIN', 'COMERCIAL'],
      badge: 'Fase 4 (IA)',
    },
  ];

  const filteredSections = useMemo(() => {
    return sections.filter((s) => {
      const matchRole = roleFilter === 'ALL' || s.roles.includes(roleFilter);
      const matchSearch =
        !searchTerm.trim() ||
        s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.desc.toLowerCase().includes(searchTerm.toLowerCase());
      return matchRole && matchSearch;
    });
  }, [sections, roleFilter, searchTerm]);

  const handleCopyWebhookKey = () => {
    navigator.clipboard.writeText('nexus_webhook_secret_key_2026');
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  return (
    <div className="p-3 max-w-[1600px] mx-auto space-y-3 animate-fade-in">
      {/* ================= Cabecera Lightning del Manual ================= */}
      <section className="page-header">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ObjectIcon type="home" />
            <div>
              <p className="page-header-eyebrow">Documentación y Capacitación Nexus Ventas</p>
              <h1 className="page-header-title flex items-center gap-2">
                Manual de Operaciones y Buenas Prácticas del CRM
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="btn-neutral"
              title="Imprimir o guardar como PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir / PDF
            </button>
            <Link to="/my-day" className="btn-brand">
              <CalendarCheck className="w-3.5 h-3.5" />
              Ir a Mi Día
            </Link>
          </div>
        </div>

        {/* Buscador interno y selector de perfil */}
        <div className="mt-3 pt-3 border-t border-sf-border flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-sf-text-weaker absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar tema (ej.: reciclaje, webhook, cualificación, ERP)..."
              className="input pl-9"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-sf-text-weak">
            <span className="font-semibold text-sf-text mr-1">Filtrar por perfil:</span>
            <button
              onClick={() => setRoleFilter('ALL')}
              className={`px-2.5 py-1 rounded-sf transition ${
                roleFilter === 'ALL'
                  ? 'bg-sf-brand text-white font-semibold'
                  : 'bg-white border border-sf-border hover:bg-[#f3f3f3]'
              }`}
            >
              Todos los temas
            </button>
            <button
              onClick={() => setRoleFilter('COMERCIAL')}
              className={`px-2.5 py-1 rounded-sf transition flex items-center gap-1 ${
                roleFilter === 'COMERCIAL'
                  ? 'bg-sf-brand text-white font-semibold'
                  : 'bg-white border border-sf-border hover:bg-[#f3f3f3]'
              }`}
            >
              <UserCheck className="w-3 h-3" />
              Comercial
            </button>
            <button
              onClick={() => setRoleFilter('ADMIN')}
              className={`px-2.5 py-1 rounded-sf transition flex items-center gap-1 ${
                roleFilter === 'ADMIN'
                  ? 'bg-sf-brand text-white font-semibold'
                  : 'bg-white border border-sf-border hover:bg-[#f3f3f3]'
              }`}
            >
              <ShieldCheck className="w-3 h-3" />
              Administración / Marketing
            </button>
          </div>
        </div>
      </section>

      {/* ================= Contenido en 2 Columnas: Índice + Detalle ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Columna Izquierda: Índice interactivo (4 Cols) */}
        <nav className="lg:col-span-4 space-y-2">
          <div className="card overflow-hidden sticky top-28">
            <div className="card-header bg-[#fafaf9] border-b border-sf-border">
              <h2 className="card-title text-xs uppercase tracking-wider text-sf-text-weak">
                <BookOpen className="w-4 h-4 text-sf-brand" />
                Tabla de Contenidos ({filteredSections.length})
              </h2>
            </div>
            <div className="divide-y divide-sf-border p-1">
              {filteredSections.map((sec) => {
                const isActive = activeSection === sec.id;
                return (
                  <button
                    key={sec.id}
                    onClick={() => {
                      setActiveSection(sec.id);
                      const el = document.getElementById(sec.id);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className={`w-full p-3 text-left rounded-sf transition flex items-start justify-between gap-2 ${
                      isActive
                        ? 'bg-sf-brand-50 border-l-4 border-sf-brand font-semibold text-sf-brand-dark'
                        : 'hover:bg-[#f3f3f3] text-sf-text'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="badge-lightest text-[10px]">{sec.badge}</span>
                      </div>
                      <p className="text-[13px] leading-tight truncate">{sec.title}</p>
                      <p className="text-xs text-sf-text-weak mt-1 line-clamp-1">{sec.desc}</p>
                    </div>
                    <ChevronRight className={`w-4 h-4 flex-shrink-0 mt-2 transition ${isActive ? 'text-sf-brand' : 'text-sf-text-weaker'}`} />
                  </button>
                );
              })}
            </div>

            <div className="p-3 bg-sf-bg-alt border-t border-sf-border text-xs text-sf-text-weak space-y-1">
              <p>
                <strong>Acceso Rápido:</strong> Este manual está siempre disponible en la esquina superior derecha pulsando el botón <HelpCircle className="w-3.5 h-3.5 inline text-sf-brand mx-0.5" />.
              </p>
            </div>
          </div>
        </nav>

        {/* Columna Derecha: Contenido Extenso del Manual (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* ================= SECCIÓN 1 ================= */}
          <section id="introduccion" className="card p-6 scroll-mt-28 space-y-4">
            <div className="flex items-center gap-2">
              <span className="badge bg-sf-brand-50 text-sf-brand font-bold text-xs">Capítulo 1</span>
              <span className="text-xs text-sf-text-weak">Arquitectura y Filosofía</span>
            </div>
            <h2 className="text-xl font-bold text-sf-text">
              1. Visión General y Filosofía B2B del Sistema
            </h2>
            <p className="text-[13px] text-sf-text leading-relaxed">
              <strong>Nexus CRM</strong> está concebido específicamente para la venta consultiva y de suministro recurrente entre empresas (B2B). A diferencia de los CRM simplistas diseñados para ventas transaccionales directas, este sistema respeta dos principios de arquitectura comercial de alto impacto:
            </p>

            {/* Principio 1 */}
            <div className="p-4 bg-sf-bg border border-sf-border rounded-sf space-y-2">
              <h3 className="text-sm font-bold text-sf-brand flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Principio A: Separación Estricta entre Cuenta y Oportunidades
              </h3>
              <p className="text-xs text-sf-text-weak leading-relaxed">
                En el mundo corporativo, <strong>una Cuenta (empresa)</strong> es el cliente jurídico con el que mantienes relación a lo largo de los años. <strong>Las Oportunidades</strong> son las negociaciones, proyectos o pedidos específicos (relación 1:N). Un comercial puede tener 3 oportunidades abiertas con el mismo cliente con importes y fechas de cierre distintos sin desvirtuar los datos maestros ni el estado global de la empresa.
              </p>
            </div>

            {/* Principio 2 */}
            <div className="p-4 bg-sf-bg border border-sf-border rounded-sf space-y-2">
              <h3 className="text-sm font-bold text-sf-brand flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Principio B: El Embudo Secuencial de 4 Fases y Regla del Ciclo de Vida
              </h3>
              <p className="text-xs text-sf-text-weak leading-relaxed">
                Toda cuenta atraviesa un embudo riguroso donde el estado maestro no se altera arbitrariamente con un desplegable, sino mediante <strong>hechos comerciales y financieros verificables</strong>:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-2">
                <div className="p-2.5 bg-white border border-sf-border rounded-sf text-center">
                  <span className="badge bg-[#fef1e0] text-[#8c4b02] text-xs">1. LEAD</span>
                  <p className="text-[11px] font-bold text-sf-text mt-1">Bolsa Común</p>
                  <p className="text-[10px] text-sf-text-weaker mt-0.5">Sin propietario. Contacto inicial pendiente de interacción comercial efectiva.</p>
                </div>
                <div className="p-2.5 bg-white border border-sf-border rounded-sf text-center">
                  <span className="badge bg-[#e0f2fe] text-[#0369a1] text-xs">2. PROSPECTO</span>
                  <p className="text-[11px] font-bold text-sf-text mt-1">Cualificado Inicial</p>
                  <p className="text-[10px] text-sf-text-weaker mt-0.5">Contacto efectivo logrado. Asignado a tu cartera + tarea de seguimiento.</p>
                </div>
                <div className="p-2.5 bg-white border border-sf-border rounded-sf text-center">
                  <span className="badge bg-[#d8e6fe] text-[#014486] text-xs">3. POTENCIAL</span>
                  <p className="text-[11px] font-bold text-sf-text mt-1">Negociación Cuantificada</p>
                  <p className="text-[10px] text-sf-text-weaker mt-0.5">Oportunidad creada con importe estimado (&gt; 0 €) y fecha prevista de cierre.</p>
                </div>
                <div className="p-2.5 bg-white border border-sf-border rounded-sf text-center">
                  <span className="badge bg-sf-success-bg text-sf-success text-xs">4. CLIENTE</span>
                  <p className="text-[11px] font-bold text-sf-text mt-1">Validado por ERP</p>
                  <p className="text-[10px] text-sf-text-weaker mt-0.5">Primer pedido confirmado/facturado en ERP con código de cliente contable.</p>
                </div>
              </div>
            </div>
          </section>

          {/* ================= SECCIÓN 2 ================= */}
          <section id="maquina-estados" className="card p-6 scroll-mt-28 space-y-4">
            <div className="flex items-center gap-2">
              <span className="badge bg-sf-warning-bg text-[#8c4b02] font-bold text-xs">Capítulo 2</span>
              <span className="text-xs text-sf-text-weak">Lógica del Sistema</span>
            </div>
            <h2 className="text-xl font-bold text-sf-text">
              2. La Máquina de Estados y las Reglas de Oro del Negocio
            </h2>
            <p className="text-[13px] text-sf-text leading-relaxed">
              El CRM incorpora un motor de transiciones (State Machine) que garantiza la disciplina comercial. Los comerciales no tienen que perder el tiempo cambiando estados burocráticos: <strong>el sistema los calcula a partir de sus acciones reales</strong>.
            </p>

            <div className="notify-success">
              <CheckCircle2 className="w-5 h-5 text-sf-success flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block text-sm">Regla de Oro Nº 1: Cualificación Progresiva (LEAD → PROSPECTO → POTENCIAL)</strong>
                <p className="text-xs text-sf-text-weak mt-1">
                  La transición desde el origen hasta el cierre sigue dos fases inequívocas:
                </p>
                <ul className="list-disc list-inside text-xs text-sf-text mt-1.5 space-y-1">
                  <li>
                    <strong>Paso 1 (LEAD → PROSPECTO):</strong> Cuando un comercial prospecta un lead de la bolsa común y registra un <strong>contacto efectivo</strong> (llamada con conversación, email comercial 1-a-1, visita o respuesta entrante), el sistema lo promueve a <span className="font-bold text-[#0369a1]">PROSPECTO</span>, lo <strong>asigna de inmediato a su cartera</strong> y programa una <strong>tarea de seguimiento obligatoria</strong> en "Mi Día".
                  </li>
                  <li>
                    <strong>Paso 2 (PROSPECTO → POTENCIAL):</strong> Cuando el comercial madura la relación y formaliza una negociación viva creando una <strong>Oportunidad con importe estimado (&gt; 0 €) y fecha prevista de cierre</strong>, el sistema promueve automáticamente la cuenta a <span className="font-bold text-sf-brand">POTENCIAL</span>. No se permite inflar el forecasting con potenciales vacíos sin oportunidad cuantificada.
                  </li>
                </ul>
              </div>
            </div>

            <div className="notify-warning">
              <AlertTriangle className="w-5 h-5 text-sf-warning flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block text-sm">Regla de Oro Nº 2: Tratamiento de Llamadas sin Respuesta</strong>
                <p className="text-xs text-sf-text-weak mt-1">
                  Si marcas el teléfono y salta el buzón, comunica o nadie descuelga (<code className="font-mono text-xs font-bold">CALL_NO_ANSWER</code>):
                </p>
                <ul className="list-disc list-inside text-xs text-sf-text mt-1.5 space-y-0.5">
                  <li>La cuenta <strong>permanece en LEAD</strong> (no se cualifica artificialmente).</li>
                  <li>Su sub-estado avanza automáticamente a <span className="font-bold text-[#8c4b02]">INTENTO 1</span> o <span className="font-bold text-[#8c4b02]">INTENTO 2</span>.</li>
                  <li>Sigue en la bolsa común para que tú u otro compañero podáis reintentar el contacto en horario diferente.</li>
                </ul>
              </div>
            </div>

            <div className="notify-error">
              <Flame className="w-5 h-5 text-sf-error flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block text-sm">Regla de Oro Nº 3: Caducidad y Reciclaje a los 60 Días</strong>
                <p className="text-xs text-sf-text-weak mt-1">
                  Las cuentas no son propiedad estática de ningún comercial si no se trabajan. Si un <span className="font-bold">PROSPECTO</span> o <span className="font-bold">POTENCIAL</span> pasa más de <strong>60 días sin actividad comercial</strong> registrada y no ha emitido ningún pedido en el ERP:
                </p>
                <p className="text-xs text-sf-text mt-1">
                  La administración puede reciclar la cuenta en 1 clic de vuelta a la <strong>Bolsa Común de Leads</strong>. La cuenta pierde el propietario y queda disponible para que otro comercial la reactive.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-sf-border rounded-sf space-y-2">
              <div className="flex items-center gap-2 text-sf-brand">
                <Network className="w-4 h-4" />
                <h3 className="text-sm font-bold">Regla de Oro Nº 4: Jerarquía B2B y Trazabilidad Distribuidor vs Cliente Final</h3>
              </div>
              <p className="text-xs text-sf-text-weak leading-relaxed">
                El modelo distingue entre quién consume el producto y quién abona la factura contable:
              </p>
              <ul className="list-disc list-inside text-xs text-sf-text space-y-1">
                <li>
                  <strong>DISTRIBUIDOR (Cliente Factura):</strong> Es el mayorista/distribuidor que asume el riesgo de cobro y recibe las facturas del ERP.
                </li>
                <li>
                  <strong>CLIENTE FINAL (Canal Indirecto / Cliente Pedido):</strong> Es el punto de venta o consumidor final (restaurante, bar, taller, fábrica). Para operar en el CRM debe tener asignado obligatoriamente su <span className="font-semibold">billing_account_id</span> apuntando al distribuidor facturador.
                </li>
                <li>
                  <strong>Trazabilidad ERP:</strong> Al registrarse un pedido de un Cliente Final, el sistema vincula tanto la cuenta del punto de venta como la cuenta matriz del distribuidor, alimentando las estadísticas consolidadas de ambos.
                </li>
              </ul>
            </div>
          </section>

          {/* ================= SECCIÓN 3 ================= */}
          <section id="guia-comercial" className="card p-6 scroll-mt-28 space-y-4">
            <div className="flex items-center gap-2">
              <span className="badge bg-sf-brand-50 text-sf-brand font-bold text-xs">Capítulo 3</span>
              <span className="text-xs text-sf-text-weak">Manual Operativo</span>
            </div>
            <h2 className="text-xl font-bold text-sf-text">
              3. Guía Diaria del Comercial: Rutina en "Inicio / Mi Día"
            </h2>
            <p className="text-[13px] text-sf-text leading-relaxed">
              La pestaña <strong>Inicio</strong> es el centro de operaciones matinal de cada comercial. Está diseñada para que no tengas que pensar qué hacer primero.
            </p>

            <div className="space-y-3">
              <div className="p-3.5 bg-white border border-sf-border rounded-sf flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-sf-brand text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                  1
                </span>
                <div>
                  <h4 className="text-[13px] font-bold text-sf-text">Revisar el Asistente de Alta Intención (Urgentes)</h4>
                  <p className="text-xs text-sf-text-weak mt-0.5">
                    Aparece arriba con borde rojo cuando existen cuentas con señales de compra o riesgo de baja (<code className="text-xs">HIGH_INTENT</code>). Haz clic en <strong>Gestionar</strong> para llamar y registrar el contacto inmediatamente.
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-white border border-sf-border rounded-sf flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-sf-brand text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                  2
                </span>
                <div>
                  <h4 className="text-[13px] font-bold text-sf-text">Ejecutar los Seguimientos Comprometidos para Hoy</h4>
                  <p className="text-xs text-sf-text-weak mt-0.5">
                    Son las llamadas, presupuestos y visitas que prometiste a tus clientes para hoy. Marca la casilla de verificación a medida que las completes o pulsa <strong>Contactar</strong> para registrar el resultado.
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-white border border-sf-border rounded-sf flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-sf-brand text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                  3
                </span>
                <div>
                  <h4 className="text-[13px] font-bold text-sf-text">Prospección Diaria en la Bolsa Común de Leads</h4>
                  <p className="text-xs text-sf-text-weak mt-0.5">
                    En la columna derecha tienes los leads frescos sin asignar listos para contactar. Pulsa <strong>Llamar ahora</strong>: si mantienes conversación, la cuenta se convertirá en Potencial y pasará automáticamente a tu cartera.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ================= SECCIÓN 4 ================= */}
          <section id="ficha-360" className="card p-6 scroll-mt-28 space-y-4">
            <div className="flex items-center gap-2">
              <span className="badge bg-[#eef4ff] text-[#014486] font-bold text-xs">Capítulo 4</span>
              <span className="text-xs text-sf-text-weak">Experiencia de Usuario</span>
            </div>
            <h2 className="text-xl font-bold text-sf-text">
              4. Ficha 360º de Cuenta (Lightning Record Page)
            </h2>
            <p className="text-[13px] text-sf-text leading-relaxed">
              Al hacer clic en cualquier cuenta desde la tabla, el kanban o la agenda, se despliega la <strong>Ficha 360º</strong> con toda la información consolidada:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-sf-bg border border-sf-border rounded-sf space-y-1.5">
                <h4 className="text-xs font-bold text-sf-text uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-sf-brand" />
                  Panel de Aspectos Destacados
                </h4>
                <p className="text-xs text-sf-text-weak leading-relaxed">
                  En la parte superior verás el nombre, sub-estado, propietario asignado, teléfono, correo directo, importe de pipeline abierto y fecha de última actividad.
                </p>
              </div>

              <div className="p-3 bg-sf-bg border border-sf-border rounded-sf space-y-1.5">
                <h4 className="text-xs font-bold text-sf-text uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-sf-brand" />
                  Barra de Etapas (Chevron Path)
                </h4>
                <p className="text-xs text-sf-text-weak leading-relaxed">
                  Indica visualmente si la cuenta está en Lead, Potencial o Cliente. Cada etapa muestra instrucciones contextuales sobre el siguiente paso a dar.
                </p>
              </div>

              <div className="p-3 bg-sf-bg border border-sf-border rounded-sf space-y-1.5">
                <h4 className="text-xs font-bold text-sf-text uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-sf-brand" />
                  Timeline Cronológico de Actividad
                </h4>
                <p className="text-xs text-sf-text-weak leading-relaxed">
                  Histórico inmutable con cada llamada, email o visita realizada, indicando qué comercial la ejecutó, fecha exacta y notas de la conversación.
                </p>
              </div>

              <div className="p-3 bg-sf-bg border border-sf-border rounded-sf space-y-1.5">
                <h4 className="text-xs font-bold text-sf-text uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-sf-brand" />
                  Listas Relacionadas: Oportunidades y Tareas
                </h4>
                <p className="text-xs text-sf-text-weak leading-relaxed">
                  Gestión de las negociaciones vivas con sus importes económicos (€) y tareas pendientes que se pueden marcar como hechas directamente desde el panel.
                </p>
              </div>
            </div>
          </section>

          {/* ================= SECCIÓN 5 ================= */}
          <section id="guia-admin" className="card p-6 scroll-mt-28 space-y-4">
            <div className="flex items-center gap-2">
              <span className="badge bg-[#feded8] text-[#8e030f] font-bold text-xs">Capítulo 5</span>
              <span className="text-xs text-sf-text-weak">Control y Dirección</span>
            </div>
            <h2 className="text-xl font-bold text-sf-text">
              5. Guía para Superadministradores y Dirección de Marketing
            </h2>
            <p className="text-[13px] text-sf-text leading-relaxed">
              El CRM distingue entre <span className="badge bg-purple-50 text-purple-700 font-bold">SUPER_ADMIN</span> (Sistemas / IT con control exclusivo de credenciales BYOK de IA y alta de usuarios) y <span className="badge bg-sf-brand-50 text-sf-brand font-bold">ADMIN_MARKETING</span> (Dirección con acceso a auditoría, reciclaje, importación masiva y campañas):
            </p>

            <div className="space-y-4">
              {/* Reciclaje */}
              <div className="p-4 bg-white border border-sf-border rounded-sf space-y-2">
                <h3 className="text-sm font-bold text-sf-text flex items-center gap-2">
                  <Recycle className="w-4 h-4 text-[#04844b]" />
                  Reciclaje Masivo de Cuentas Inactivas
                </h3>
                <p className="text-xs text-sf-text-weak leading-relaxed">
                  Desde la pestaña <strong>Cuentas</strong>, la tarjeta <strong>"Inactivos +60 días"</strong> filtra automáticamente los potenciales sin actividad reciente. Como Administrador, puedes pulsar el botón <strong>Reciclar inactivos</strong> para devolverlos a la bolsa común. El sistema registra automáticamente una nota de auditoría interna con la trazabilidad del cambio.
                </p>
              </div>

              {/* Webhooks */}
              <div className="p-4 bg-white border border-sf-border rounded-sf space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-sf-text flex items-center gap-2">
                    <Zap className="w-4 h-4 text-sf-brand" />
                    Captación Automática vía Webhook (Landing Pages y Formularios)
                  </h3>
                  <button
                    onClick={handleCopyWebhookKey}
                    className="btn-neutral btn-sm"
                    title="Copiar API Key al portapapeles"
                  >
                    {copiedKey ? <Check className="w-3.5 h-3.5 text-sf-success" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedKey ? 'Copiada' : 'Copiar X-API-Key'}
                  </button>
                </div>
                <p className="text-xs text-sf-text-weak leading-relaxed">
                  Cualquier formulario web, WordPress, Typeform o campaña de Google/LinkedIn Ads puede inyectar prospectos directamente en la bolsa común enviando un <code className="font-mono text-xs">POST</code> en JSON:
                </p>

                <div className="bg-[#0b1120] text-slate-200 p-3.5 rounded-sf font-mono text-xs space-y-2 overflow-x-auto">
                  <div className="text-emerald-400 font-bold">// Endpoint HTTP</div>
                  <div>POST http://127.0.0.1:8000/api/webhooks/lead</div>
                  <div className="text-emerald-400 font-bold">// Headers requeridos</div>
                  <div>Content-Type: application/json</div>
                  <div>X-API-Key: nexus_webhook_secret_key_2026</div>
                  <div className="text-emerald-400 font-bold">// Payload de ejemplo</div>
                  <pre className="text-slate-300">
{`{
  "company_name": "Talleres Mecánicos del Cantábrico",
  "contact_name": "Martín Ruiz",
  "email": "contacto@talleres.es",
  "phone": "+34 942 00 11 22",
  "tax_id": "B12345678",
  "source": "LANDING_Q3",
  "notes": "Piden presupuesto de suministro mensual..."
}`}
                  </pre>
                </div>
                <p className="text-[11px] text-sf-text-weaker">
                  * Si el NIF o email ya existe en la base de datos, el sistema no duplica la cuenta: añade una nota en el historial del cliente existente.
                </p>
              </div>
            </div>
          </section>

          {/* ================= SECCIÓN 6 ================= */}
          <section id="matriz-interacciones" className="card p-6 scroll-mt-28 space-y-4">
            <div className="flex items-center gap-2">
              <span className="badge bg-[#ecebea] text-[#444] font-bold text-xs">Capítulo 6</span>
              <span className="text-xs text-sf-text-weak">Hoja de Referencia</span>
            </div>
            <h2 className="text-xl font-bold text-sf-text">
              6. Matriz de Interacciones y Efectos en el CRM
            </h2>
            <p className="text-[13px] text-sf-text leading-relaxed">
              Consulte esta tabla para saber con exactitud cómo reacciona el motor de transiciones (State Machine) ante cada actividad comercial:
            </p>

            <div className="overflow-x-auto border border-sf-border rounded-sf">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Actividad Comercial</th>
                    <th>¿Cualifica?</th>
                    <th>Impacto en LEAD</th>
                    <th>Impacto en PROSPECTO</th>
                    <th>Impacto en POTENCIAL</th>
                    <th>Genera Tarea</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  <tr>
                    <td className="font-semibold text-sf-text flex items-center gap-2">
                      <PhoneCall className="w-3.5 h-3.5 text-sf-success" />
                      Llamada Efectiva
                    </td>
                    <td><span className="badge bg-sf-success-bg text-sf-success">SÍ</span></td>
                    <td>Promueve a <strong className="text-[#0369a1]">PROSPECTO</strong> y asigna comercial</td>
                    <td>Actualiza última actividad</td>
                    <td>Actualiza última actividad</td>
                    <td>Obligatoria (7 días)</td>
                  </tr>
                  <tr>
                    <td className="font-semibold text-sf-text flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-sf-brand" />
                      Email 1 a 1
                    </td>
                    <td><span className="badge bg-sf-success-bg text-sf-success">SÍ</span></td>
                    <td>Promueve a <strong className="text-[#0369a1]">PROSPECTO</strong> y asigna comercial</td>
                    <td>Actualiza última actividad</td>
                    <td>Actualiza última actividad</td>
                    <td>Obligatoria (7 días)</td>
                  </tr>
                  <tr>
                    <td className="font-semibold text-sf-text flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-[#cb65ff]" />
                      Reunión / Visita
                    </td>
                    <td><span className="badge bg-sf-success-bg text-sf-success">SÍ</span></td>
                    <td>Promueve a <strong className="text-[#0369a1]">PROSPECTO</strong> y asigna comercial</td>
                    <td>Actualiza última actividad</td>
                    <td>Actualiza última actividad</td>
                    <td>Obligatoria (7 días)</td>
                  </tr>
                  <tr>
                    <td className="font-semibold text-sf-text flex items-center gap-2">
                      <PhoneOff className="w-3.5 h-3.5 text-sf-warning" />
                      Llamada sin respuesta
                    </td>
                    <td><span className="badge bg-[#ecebea] text-[#444]">NO</span></td>
                    <td>Sube a <strong>INTENTO 1 ó 2</strong> (sigue LEAD)</td>
                    <td>Actualiza última actividad</td>
                    <td>Actualiza última actividad</td>
                    <td>Opcional</td>
                  </tr>
                  <tr>
                    <td className="font-semibold text-sf-text flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-[#06a59a]" />
                      Respuesta Entrante
                    </td>
                    <td><span className="badge bg-sf-success-bg text-sf-success">SÍ</span></td>
                    <td>Promueve a <strong className="text-[#0369a1]">PROSPECTO</strong> y asigna comercial</td>
                    <td>Actualiza última actividad</td>
                    <td>Actualiza última actividad</td>
                    <td>Obligatoria (7 días)</td>
                  </tr>
                  <tr className="bg-sf-brand-50/40">
                    <td className="font-bold text-sf-brand-dark flex items-center gap-2">
                      <Briefcase className="w-3.5 h-3.5 text-sf-brand" />
                      Crear Oportunidad Cuantificada (€ &gt; 0 + Fecha Cierre)
                    </td>
                    <td><span className="badge bg-sf-brand-50 text-sf-brand font-bold">PIPELINE</span></td>
                    <td>No aplicable (debe ser Prospecto previo)</td>
                    <td>Promueve a <strong className="text-sf-brand">POTENCIAL</strong> y suma al Forecasting</td>
                    <td>Añade negociación N-aria a la cuenta</td>
                    <td>Gestionada en Oportunidades</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* ================= SECCIÓN 7 ================= */}
          <section id="faq" className="card p-6 scroll-mt-28 space-y-4">
            <div className="flex items-center gap-2">
              <span className="badge bg-sf-brand-50 text-sf-brand font-bold text-xs">Capítulo 7</span>
              <span className="text-xs text-sf-text-weak">Preguntas Frecuentes</span>
            </div>
            <h2 className="text-xl font-bold text-sf-text">
              7. Preguntas Frecuentes (FAQ) y Resolución de Dudas
            </h2>

            <div className="space-y-3">
              <details className="p-3 bg-sf-bg border border-sf-border rounded-sf group" open>
                <summary className="text-[13px] font-bold text-sf-text cursor-pointer select-none">
                  ¿Por qué mi lead no cambia a POTENCIAL si ya le he llamado?
                </summary>
                <p className="text-xs text-sf-text-weak mt-2 leading-relaxed">
                  Verifica qué tipo de actividad seleccionaste en el modal. Si seleccionaste <strong>"Sin respuesta"</strong> (comunica, contestador o no descuelga), la regla del negocio estipula que la cuenta permanece en LEAD y sube a <em>Intento 1</em> o <em>Intento 2</em>. Para cualificar a Potencial debe registrarse una <strong>Llamada efectiva</strong>, un <strong>Email directo 1 a 1</strong> o una <strong>Reunión</strong>.
                </p>
              </details>

              <details className="p-3 bg-sf-bg border border-sf-border rounded-sf group">
                <summary className="text-[13px] font-bold text-sf-text cursor-pointer select-none">
                  ¿Cómo pasa una cuenta al estado CLIENTE?
                </summary>
                <p className="text-xs text-sf-text-weak mt-2 leading-relaxed">
                  El estado <strong>CLIENTE</strong> es el reconocimiento formal financiero. Ocurre cuando se sincroniza el primer pedido con el ERP y se rellena el campo <code className="font-mono text-xs">erp_customer_id</code> y la fecha de primer pedido. Esto garantiza que nadie catalogue como "Cliente" a una cuenta que todavía no ha comprado formalmente.
                </p>
              </details>

              <details className="p-3 bg-sf-bg border border-sf-border rounded-sf group">
                <summary className="text-[13px] font-bold text-sf-text cursor-pointer select-none">
                  ¿Qué debo hacer si una cuenta asignada en mi cartera no tiene interés?
                </summary>
                <p className="text-xs text-sf-text-weak mt-2 leading-relaxed">
                  Abre la ficha de la cuenta, pulsa en <em>Registrar actividad</em> y en las notas especifica el motivo del rechazo. El administrador podrá marcar el sub-estado como <strong>DESCARTADO</strong> para que no ensucie tus métricas de conversión ni tus tareas diarias.
                </p>
              </details>

              <details className="p-3 bg-sf-bg border border-sf-border rounded-sf group">
                <summary className="text-[13px] font-bold text-sf-text cursor-pointer select-none">
                  ¿Puedo cambiar de usuario para probar el sistema?
                </summary>
                <p className="text-xs text-sf-text-weak mt-2 leading-relaxed">
                  Sí. En la esquina superior derecha, haz clic sobre tu avatar circular y en la sección <strong>"Cambiar de usuario (demo)"</strong> podrás alternar en 1 clic entre Elena (Directora / Admin), Carlos (Comercial 1) y Laura (Comercial 2) sin tener que cerrar sesión ni reescribir contraseñas.
                </p>
              </details>

              <details className="p-3 bg-sf-bg border border-sf-border rounded-sf group">
                <summary className="text-[13px] font-bold text-sf-text cursor-pointer select-none flex items-center gap-1.5 text-amber-900">
                  <Flame className="w-4 h-4 text-amber-600" />
                  ¿Por qué una apertura o clic normal en mailing no convierte un Lead en Potencial?
                </summary>
                <p className="text-xs text-sf-text-weak mt-2 leading-relaxed">
                  Por estricto diseño de la <strong>Regla de Oro del Negocio</strong>: una campaña de marketing masivo o una apertura (frecuentemente provocada por robots de inspección antivirus o previsualizadores) no acredita cualificación comercial ni voluntad de compra. Si el Lead hace clic en un enlace de <strong>Alta Intención</strong> (ej. <em>Solicitar Tarifa</em> o <em>Hablar con un asesor</em>), el sistema crea una <strong>Tarea Prioritaria en "Mi Día"</strong> para el comercial asignado. Únicamente cuando el comercial realiza y registra el contacto directo (llamada efectiva, email 1-a-1 o visita), la máquina de estados promueve el Lead a <strong>POTENCIAL</strong>.
                </p>
              </details>

              <details className="p-3 bg-sf-bg border border-sf-border rounded-sf group">
                <summary className="text-[13px] font-bold text-sf-text cursor-pointer select-none flex items-center gap-1.5 text-emerald-900">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  ¿Cómo protege Nexus CRM la reputación del remitente y el RGPD ante rebotes o bajas?
                </summary>
                <p className="text-xs text-sf-text-weak mt-2 leading-relaxed">
                  El motor integra <strong>Higiene Automática de Datos</strong> en tiempo real. Ante un rebote permanente (<em>Hard Bounce</em>), la dirección se marca automáticamente como inválida (<code className="font-mono text-xs">email_valid = False</code>), evitando reintentos que dañen la reputación del dominio. Si el destinatario solicita la baja (<em>Unsubscribe / Spam</em>), se desactiva inmediatamente su consentimiento (<code className="font-mono text-xs">opt_in_marketing = False</code>). El segmentador dinámico excluye en vivo cualquier contacto sin consentimiento o con correo inválido.
                </p>
              </details>
            </div>
          </section>

          {/* ---------- SECCIÓN 8: FASE 2 IMPORTACIÓN Y ERP ---------- */}
          <section id="fase-2" className="slds-card p-6 bg-white space-y-4">
            <div className="flex items-center justify-between border-b border-sf-border pb-3">
              <div>
                <span className="text-[11px] font-bold text-sf-brand uppercase tracking-wider">
                  Módulos de Integración Empresarial
                </span>
                <h2 className="text-lg font-bold text-sf-text">
                  8. Importación Masiva & Sincronización ERP (Fase 2)
                </h2>
              </div>
              <span className="badge-slds bg-indigo-100 text-indigo-800 font-bold">Fase 2 Activa</span>
            </div>

            <p className="text-xs text-sf-text-weak leading-relaxed">
              La <strong>Fase 2</strong> dota a Nexus CRM de dos superpoderes empresariales: un <strong>Asistente de Importación Masiva en 4 etapas</strong> para ingestar bases de datos de prospección sin duplicados y la <strong>Integración Híbrida con ERP</strong> (Visor 360º, conversión automática al primer pedido y Sandbox de pruebas).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-sf border border-sf-border bg-sf-bg space-y-2">
                <h3 className="text-sm font-bold text-sf-text flex items-center gap-2">
                  <Database className="w-4 h-4 text-sf-brand" /> Asistente de Importación en 4 Etapas
                </h3>
                <ul className="text-xs text-sf-text-weak space-y-1.5 list-disc list-inside">
                  <li><strong>Etapa 1: Carga:</strong> Admite archivos <code>.csv</code>, <code>.xlsx</code> y <code>.json</code>. Almacenamiento seguro en Staging aislado.</li>
                  <li><strong>Etapa 2: Mapeo Dinámico:</strong> Asociación visual de columnas del archivo con campos del CRM (Empresa, CIF, Email, Teléfono, etc.).</li>
                  <li><strong>Etapa 3: Deduplicación y Colisiones:</strong> Detección con scoring de coincidencias exactas (CIF/Email) y difusas (Fuzzy name &gt; 88%).</li>
                  <li><strong>Etapa 4: Consolidación:</strong> Estrategias de resolución (Omitir duplicados, Actualizar campos vacíos, o Sobrescribir).</li>
                </ul>
                <div className="pt-2">
                  <Link to="/imports" className="text-xs font-bold text-sf-brand hover:underline inline-flex items-center gap-1">
                    Ir al Asistente de Importación <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              <div className="p-4 rounded-sf border border-sf-border bg-sf-bg space-y-2">
                <h3 className="text-sm font-bold text-sf-text flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-600" /> Sincronización ERP & Sandbox
                </h3>
                <ul className="text-xs text-sf-text-weak space-y-1.5 list-disc list-inside">
                  <li><strong>Regla de Oro ERP:</strong> Al entrar un pedido <code>CONFIRMADO</code> o <code>FACTURADO</code>, la cuenta pasa automáticamente a <strong>CLIENTE</strong>.</li>
                  <li><strong>Caché Materializada 360º:</strong> Total de ventas YTD, ticket promedio, familias compradas e historial de pedidos visible en la pestaña <em>Visor ERP 360º</em>.</li>
                  <li><strong>Simulador Sandbox:</strong> Permite inyectar pedidos de prueba a cualquier cuenta o CIF para verificar la conversión en tiempo real.</li>
                  <li><strong>Webhook ERP:</strong> Endpoint <code>POST /api/webhooks/erp/order</code> con clave API para integración con SAP/Sage.</li>
                </ul>
                <div className="pt-2">
                  <Link to="/sandbox" className="text-xs font-bold text-emerald-700 hover:underline inline-flex items-center gap-1">
                    Abrir Simulador Sandbox <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* ---------- 9. FASE 3: MOTOR DE MAILING & AUTOMATIZACIÓN ---------- */}
          <section id="fase-3" className="slds-card p-6 bg-white border border-sf-border space-y-6">
            <div className="flex items-center justify-between border-b border-sf-border pb-3">
              <div>
                <span className="text-[11px] font-bold text-sf-brand uppercase tracking-wider">
                  Automatización & Marketing B2B
                </span>
                <h2 className="text-lg font-bold text-sf-text">
                  9. Motor de Mailing Multi-Proveedor, Automatización & Puente Marketing-Ventas
                </h2>
              </div>
              <span className="badge-slds bg-emerald-100 text-emerald-800 font-bold">Fase 3 Activa</span>
            </div>

            <p className="text-xs text-sf-text-weak leading-relaxed">
              La <strong>Fase 3</strong> implementa el ecosistema de marketing por correo electrónico sin quebrar en ningún caso la disciplina comercial del embudo. Integra una arquitectura multi-proveedor desacoplada mediante el patrón <em>Adapter</em> (<strong>Sandbox local</strong>, <strong>Mailchimp API</strong>, <strong>Brevo</strong> y <strong>Resend</strong>), constructor visual de segmentos con métricas de exclusión RGPD en tiempo real, renderizado de etiquetas dinámicas y el receptor universal de webhooks.
            </p>

            {/* Banner Regla de Oro */}
            <div className="bg-amber-50 border border-amber-200 rounded-sf p-4 flex items-start gap-3">
              <div className="p-2 rounded-full bg-amber-100 text-amber-700 shrink-0">
                <Flame className="w-5 h-5" />
              </div>
              <div className="text-xs text-amber-950 space-y-1">
                <p className="font-bold text-sm">
                  Regla de Oro Inquebrantable: El Puente entre Marketing y Ventas
                </p>
                <p className="leading-relaxed">
                  Enviar una campaña o registrar aperturas y clics genéricos <strong>NUNCA</strong> promueve un contacto de <code>LEAD</code> a <code>POTENCIAL</code>.
                  Si un prospecto pulsa un enlace identificado como de <strong>Alta Intención</strong> (ej. <em>"Solicitar Tarifa / Hablar con un Asesor"</em>), el sistema crea de forma automática una <strong>Tarea Prioritaria en "Mi Día"</strong> para el comercial asignado. Solo cuando el comercial ejecuta el contacto efectivo, la máquina de estados promueve el Lead a Potencial.
                </p>
              </div>
            </div>

            {/* Arquitectura de 4 proveedores */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-sf-text flex items-center gap-2">
                <Mail className="w-4 h-4 text-sf-brand" /> Arquitectura Multi-Proveedor Desacoplada (Pattern Adapter)
              </h3>
              <p className="text-xs text-sf-text-weak">
                Configurable en el entorno mediante <code>MAILING_PROVIDER=sandbox|mailchimp|brevo|resend</code>:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-sf border border-sf-border bg-slate-50 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <strong className="text-sf-text">Sandbox Local</strong>
                    <span className="badge badge-brand text-[9px]">Simulación</span>
                  </div>
                  <p className="text-[11px] text-sf-text-weak">
                    Renderiza el HTML final con variables en base de datos. Permite probar aperturas, clics y rebotes sin consumir saldo ni enviar correos reales.
                  </p>
                </div>

                <div className="p-3.5 rounded-sf border border-sf-border bg-slate-50 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <strong className="text-sf-text">Mailchimp API</strong>
                    <span className="badge badge-brand text-[9px]">Marketing v3</span>
                  </div>
                  <p className="text-[11px] text-sf-text-weak">
                    Sincroniza audiencias y etiquetas vía Mailchimp Marketing API o envía lotes mediante Mandrill transaccional, con soporte para webhooks de lista.
                  </p>
                </div>

                <div className="p-3.5 rounded-sf border border-sf-border bg-slate-50 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <strong className="text-sf-text">Brevo (Sendinblue)</strong>
                    <span className="badge badge-brand text-[9px]">REST v3</span>
                  </div>
                  <p className="text-[11px] text-sf-text-weak">
                    Envío transaccional y por lotes con tags de campaña e ID de contacto en metadatos para trazabilidad completa por webhook.
                  </p>
                </div>

                <div className="p-3.5 rounded-sf border border-sf-border bg-slate-50 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <strong className="text-sf-text">Resend API</strong>
                    <span className="badge badge-brand text-[9px]">Modern API</span>
                  </div>
                  <p className="text-[11px] text-sf-text-weak">
                    Infraestructura moderna de alta entregabilidad con cabeceras de trazabilidad <code>campaign_id</code> y telemetría por eventos.
                  </p>
                </div>
              </div>
            </div>

            {/* Matriz de Eventos y Telemetría */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-sf-text flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" /> Matriz de Impacto de Eventos de Mailing
              </h3>
              <div className="overflow-x-auto border border-sf-border rounded-sf">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#f8f9fa] border-b border-sf-border text-sf-text-weak uppercase text-[10px] font-semibold">
                    <tr>
                      <th className="px-4 py-2.5">Evento Detectado</th>
                      <th className="px-4 py-2.5">Impacto en Embudo</th>
                      <th className="px-4 py-2.5">Impacto en Mi Día</th>
                      <th className="px-4 py-2.5">Higiene de Datos RGPD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sf-border">
                    <tr>
                      <td className="px-4 py-3 font-semibold text-sf-text flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-emerald-600" /> OPENED (Apertura)
                      </td>
                      <td className="px-4 py-3 text-slate-500">Ninguno (Permanece en LEAD)</td>
                      <td className="px-4 py-3 text-slate-500">Ninguno</td>
                      <td className="px-4 py-3 text-slate-500">Ninguno</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-semibold text-sf-text flex items-center gap-1.5">
                        <MousePointerClick className="w-3.5 h-3.5 text-blue-600" /> CLICKED (Clic Estándar)
                      </td>
                      <td className="px-4 py-3 text-slate-500">Ninguno (Permanece en LEAD)</td>
                      <td className="px-4 py-3 text-slate-500">Ninguno</td>
                      <td className="px-4 py-3 text-slate-500">Ninguno</td>
                    </tr>
                    <tr className="bg-amber-50/50">
                      <td className="px-4 py-3 font-bold text-amber-900 flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-amber-600" /> HIGH_INTENT_CLICKED 🔥
                      </td>
                      <td className="px-4 py-3 font-semibold text-amber-800">
                        Permanece en LEAD (Cualificación requerida)
                      </td>
                      <td className="px-4 py-3 font-bold text-amber-900">
                        ⚡ Crea Tarea Prioritaria (HIGH_INTENT) Hoy
                      </td>
                      <td className="px-4 py-3 text-slate-600">Registra apunte en Timeline</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-semibold text-red-700 flex items-center gap-1.5">
                        <Ban className="w-3.5 h-3.5 text-red-600" /> HARD_BOUNCE (Rebote Definitivo)
                      </td>
                      <td className="px-4 py-3 text-slate-500">Ninguno</td>
                      <td className="px-4 py-3 text-slate-500">Ninguno</td>
                      <td className="px-4 py-3 font-bold text-red-700">
                        email_valid = False (Excluido de futuros envíos)
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-semibold text-rose-700 flex items-center gap-1.5">
                        <UserX className="w-3.5 h-3.5 text-rose-600" /> UNSUBSCRIBED / SPAM (Baja)
                      </td>
                      <td className="px-4 py-3 text-slate-500">Ninguno</td>
                      <td className="px-4 py-3 text-slate-500">Ninguno</td>
                      <td className="px-4 py-3 font-bold text-rose-700">
                        opt_in_marketing = False (Bloqueo legal de envíos)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Segmentación Dinámica e Higiene */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-sf border border-sf-border bg-sf-bg space-y-2 text-xs">
                <h4 className="font-bold text-sf-text flex items-center gap-2">
                  <Filter className="w-4 h-4 text-sf-brand" /> Constructor Dinámico de Segmentos
                </h4>
                <ul className="text-sf-text-weak space-y-1.5 list-disc list-inside">
                  <li><strong>Nurturing de Leads:</strong> Filtra prospectos fríos por canal de procedencia (web, ferias, campañas).</li>
                  <li><strong>Reactivación de Potenciales:</strong> Cuentas con inactividad superior a X días sin pedidos registrados.</li>
                  <li><strong>Cross-Selling a Clientes:</strong> Filtro por familias de producto compradas previamente en el ERP (ej. <em>PLC S7-1500</em>).</li>
                  <li><strong>Estimador en Vivo:</strong> Muestra en tiempo real elegibles vs excluidos por bajas o emails rotos.</li>
                </ul>
                <div className="pt-2">
                  <Link to="/mailing" className="text-xs font-bold text-sf-brand hover:underline inline-flex items-center gap-1">
                    Abrir Diseñador de Campañas <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              <div className="p-4 rounded-sf border border-sf-border bg-sf-bg space-y-2 text-xs">
                <h4 className="font-bold text-sf-text flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-indigo-600" /> Laboratorio Sandbox de Mailing
                </h4>
                <p className="text-sf-text-weak leading-relaxed">
                  En la vista <strong>Simulador ERP & Mailing (/sandbox)</strong> dispones de una pestaña interactiva para disparar eventos sintéticos sobre cualquier destinatario de una campaña enviada:
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-semibold">Simular Apertura</span>
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-semibold">Simular Clic</span>
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-semibold">Simular Alta Intención 🔥</span>
                  <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-semibold">Simular Hard Bounce</span>
                  <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-semibold">Simular Baja RGPD</span>
                </div>
                <div className="pt-2">
                  <Link to="/sandbox" className="text-xs font-bold text-indigo-700 hover:underline inline-flex items-center gap-1">
                    Probar Eventos en el Sandbox <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* ================= SECCIÓN 10 ================= */}
          <section id="jerarquia-clientes" className="card p-6 scroll-mt-28 space-y-4">
            <div className="flex items-center gap-2">
              <span className="badge bg-indigo-50 text-indigo-700 font-bold text-xs">Capítulo 10</span>
              <span className="text-xs text-sf-text-weak">Jerarquía B2B y Modelo de Distribución</span>
            </div>
            <h2 className="text-xl font-bold text-sf-text">
              10. Jerarquía Comercial: Distribuidores y Clientes Finales (Canal Indirecto)
            </h2>
            <p className="text-[13px] text-sf-text leading-relaxed">
              En los modelos de distribución B2B indirecta de suministros industriales, hostelería o bienes de equipo, 
              la empresa suele comercializar a través de una red mayorista que asume la cobranza de las facturas mientras que el consumo 
              real y la prescripción técnica ocurren en puntos de venta o clientes finales. Nexus CRM modela esta realidad mediante 
              una relación jerárquica de 2 niveles: <strong>Cliente Factura</strong> frente a <strong>Cliente Pedido</strong>.
            </p>

            {/* Cuadrícula de los 2 Roles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-sf border border-blue-200 bg-blue-50/40 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-700" /> DISTRIBUIDOR (Cliente Factura)
                  </h3>
                  <span className="badge bg-blue-100 text-blue-800 text-[10px] font-bold">Mayorista / Central</span>
                </div>
                <p className="text-xs text-sf-text-weak leading-relaxed">
                  Es la entidad mayorista o central de compras que asume el riesgo crediticio, suscribe las condiciones comerciales y abona las facturas contables generadas en el ERP.
                </p>
                <ul className="text-xs text-sf-text list-disc list-inside space-y-1">
                  <li>Posee NIF/CIF fiscal propio y código de cliente principal en el ERP.</li>
                  <li>Agrupa bajo su cartera a su red de clientes finales vinculados (<code className="font-mono text-[11px]">Clientes Finales</code>).</li>
                  <li>Su ficha 360º cuenta con una pestaña específica que enumera y cuantifica todos los Clientes Finales vinculados.</li>
                </ul>
              </div>

              <div className="p-4 rounded-sf border border-amber-200 bg-amber-50/40 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-amber-900 flex items-center gap-2">
                    <Network className="w-4 h-4 text-amber-700" /> CLIENTE FINAL (Cliente Pedido / Canal Indirecto)
                  </h3>
                  <span className="badge bg-amber-100 text-amber-800 text-[10px] font-bold">Consumo Final</span>
                </div>
                <p className="text-xs text-sf-text-weak leading-relaxed">
                  Es el establecimiento o consumidor final (taller, restaurante, instalador o fábrica) que genera el pedido comercial y recibe el material físico.
                </p>
                <ul className="text-xs text-sf-text list-disc list-inside space-y-1">
                  <li>Requiere <strong>obligatoriamente</strong> un <code className="font-mono text-[11px]">billing_account_id</code> activo apuntando a un Distribuidor.</li>
                  <li>Las oportunidades comerciales y visitas se gestionan a nivel del Cliente Final para seguimiento directo del comercial de zona.</li>
                  <li>En el ERP, sus pedidos acreditan como pagador al distribuidor asignado.</li>
                </ul>
              </div>
            </div>

            {/* Trazabilidad en ERP */}
            <div className="p-4 bg-sf-bg border border-sf-border rounded-sf space-y-2">
              <h3 className="text-sm font-bold text-sf-text flex items-center gap-2">
                <Database className="w-4 h-4 text-sf-brand" />
                Trazabilidad Dual de Pedidos en el ERP
              </h3>
              <p className="text-xs text-sf-text-weak leading-relaxed">
                Cuando el ERP sincroniza un pedido emitido por un punto de venta (<code className="font-mono text-xs">account_id = Cliente Final</code>), 
                la tabla intermedia de pedidos (<code className="font-mono text-xs">erp_orders_cache</code>) almacena tanto el identificador del Cliente Final como el <code className="font-mono text-xs">billing_account_id</code> del Distribuidor facturador.
              </p>
              <div className="p-3 bg-white border border-sf-border rounded-sf text-xs space-y-1 text-sf-text">
                <div className="font-semibold text-sf-brand">Consolidación Automática de Métricas:</div>
                <p className="text-sf-text-weak">
                  • <strong>En la ficha del Cliente Final:</strong> Se visualizan los pedidos específicos servidos a su sede, el total consumido y la fecha de última compra.
                </p>
                <p className="text-sf-text-weak">
                  • <strong>En la ficha del Distribuidor:</strong> Se totaliza la facturación agregada de todos sus Clientes Finales filiales, permitiendo medir el volumen global del mayorista.
                </p>
                <p className="text-sf-text-weak">
                  • <strong>Activación a CLIENTE:</strong> Al transaccionar un primer pedido facturado, tanto el Cliente Final como el Distribuidor (si aún no lo estuviera) avanzan formalmente a la etapa <span className="font-bold text-sf-success">CLIENTE</span>.
                </p>
              </div>
            </div>

            {/* Reglas de Importación Masiva y Salvaguarda de Forecasting */}
            <div className="p-4 bg-sf-bg border border-sf-border rounded-sf space-y-3">
              <h3 className="text-sm font-bold text-sf-text flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Reglas del Módulo de Importación y Salvaguarda de Forecasting
              </h3>
              <p className="text-xs text-sf-text-weak leading-relaxed">
                El importador de datos en 4 etapas (<code className="font-mono text-xs">/importer</code>) incorpora lógica de negocio específica para preservar la integridad relacional y contable:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-white border border-sf-border rounded-sf text-xs space-y-1.5">
                  <div className="font-bold text-sf-text flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-sf-brand" /> Resolución Jerárquica en 2 Pasadas
                  </div>
                  <p className="text-sf-text-weak leading-relaxed">
                    Al procesar un archivo con distribuidores y clientes finales, el motor ejecuta una <strong>primera pasada</strong> para consolidar y dar de alta todos los Distribuidores (con su CIF/NIF). En la <strong>segunda pasada</strong> procesa los Clientes Finales, validando que el distribuidor de referencia (<code className="font-mono text-[11px]">distributor_ref</code>) exista en la base de datos o haya sido creado en el mismo lote. Si un Cliente Final no encuentra a su distribuidor, el registro se detiene como error para impedir huérfanos.
                  </p>
                </div>

                <div className="p-3 bg-white border border-amber-200 bg-amber-50/30 rounded-sf text-xs space-y-1.5">
                  <div className="font-bold text-amber-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Salvaguarda de Forecasting Comercial
                  </div>
                  <p className="text-sf-text-weak leading-relaxed">
                    Si el archivo importado marca una fila con etapa <code className="font-mono text-[11px]">POTENCIAL</code> pero no aporta un <strong>importe estimado mayor que 0</strong> ni una <strong>fecha estimada de cierre</strong>, el importador <strong>degrada preventivamente la cuenta a PROSPECTO</strong> y emite una advertencia de diagnóstico. Esta salvaguarda impide que se distorsionen los informes de pipeline financiero sin compromisos económicos reales.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* SECCIÓN 11: ASISTENTE DE IA MULTI-PROVEEDOR (BYOK) (FASE 4)              */}
          {/* ========================================================================= */}
          <section id="fase-4-ai" className="card p-6 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-sf-border">
              <div>
                <span className="badge-brand">Módulo de Inteligencia Artificial Corporativa</span>
                <h2 className="text-lg font-bold text-sf-text mt-1">
                  11. Asistente de IA Multi-Proveedor (BYOK) y Casos de Uso B2B (Fase 4)
                </h2>
                <p className="text-xs text-sf-text-weak mt-0.5">
                  Arquitectura 100% desacoplada: cada empresa conecta su propio proveedor de IA corporativo garantizando privacidad y cumplimiento RGPD.
                </p>
              </div>
              <Sparkles className="w-6 h-6 text-sf-brand flex-shrink-0" />
            </div>

            {/* Filosofía BYOK y Deshabilitado por Defecto */}
            <div className="p-4 bg-sf-brand-50/60 border border-sf-brand/20 rounded-sf space-y-2 text-xs">
              <h3 className="font-bold text-sf-text text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sf-brand" />
                Filosofía Bring Your Own Key (BYOK) y Módulo Deshabilitado por Defecto
              </h3>
              <p className="text-sf-text-weak leading-relaxed">
                El CRM opera de forma limpia <strong>sin requerir ningún servicio de IA externo obligatorio</strong>. El módulo viene <strong>desactivado por defecto</strong>. La empresa decide cuándo activarlo introduciendo sus propias credenciales en <code className="font-mono text-xs">Configuración → Asistente de IA (/settings/ai)</code>.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                <div className="p-2.5 bg-white rounded border border-sf-border">
                  <span className="font-bold text-sf-brand block">🏢 Microsoft Copilot / Azure OpenAI (Enterprise)</span>
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    Utiliza el endpoint privado de Azure de la organización. Garantiza que los datos de clientes nunca entrenan modelos públicos y cumplen la normativa RGPD de la UE dentro del tenant corporativo.
                  </p>
                </div>
                <div className="p-2.5 bg-white rounded border border-sf-border">
                  <span className="font-bold text-emerald-700 block">🧪 Modo Simulación Local (Mock B2B)</span>
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    Genera respuestas contextuales, extracciones de dictado, detección de intención y copys en milisegundos sin consumir tokens ni requerir claves de API.
                  </p>
                </div>
              </div>
            </div>

            {/* Los 5 Casos de Uso B2B */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-sf-text">
                Los 5 Módulos de Inteligencia Artificial Integrados en el CRM
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Caso A */}
                <div className="p-4 bg-white border border-sf-border rounded-sf space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sf-brand text-sm">
                    <Sparkles className="w-4 h-4" />
                    <span>a) AI Lead Enricher (Ficha 360º)</span>
                  </div>
                  <p className="text-sf-text-weak leading-relaxed">
                    Analiza el nombre de la empresa, dominio y email. Infiere sector, perfil de tamaño y propuesta de valor, persistiendo automáticamente el resultado en <code className="font-mono text-[11px]">account.ai_summary</code> para que el comercial disponga de contexto antes del primer contacto.
                  </p>
                </div>

                {/* Caso B */}
                <div className="p-4 bg-white border border-sf-border rounded-sf space-y-2">
                  <div className="flex items-center gap-2 font-bold text-[#cb65ff] text-sm">
                    <Clock className="w-4 h-4" />
                    <span>b) Voice-to-CRM (Dictado Post-Visita)</span>
                  </div>
                  <p className="text-sf-text-weak leading-relaxed">
                    Permite dictar o grabar notas tras una reunión comercial. La IA extrae automáticamente: tipo de actividad, importe cuantificado (€) y fecha de cierre estimada. Si se detecta importe, <strong>promueve automáticamente la cuenta a POTENCIAL</strong> y genera la oportunidad; si solo fueron notas de conversación, cualifica de LEAD a PROSPECTO.
                  </p>
                </div>

                {/* Caso C */}
                <div className="p-4 bg-white border border-sf-border rounded-sf space-y-2">
                  <div className="flex items-center gap-2 font-bold text-[#06a59a] text-sm">
                    <Mail className="w-4 h-4" />
                    <span>c) Detector de Intención de Correo (Inbox Sync)</span>
                  </div>
                  <p className="text-sf-text-weak leading-relaxed">
                    Al registrar una actividad en el CRM, el comercial puede pegar el cuerpo de un email entrante. La IA analiza el sentimiento e intención (TARIFAS, REUNIÓN, DESCARTE, TÉCNICO, PEDIDO) y auto-completa el tipo de interacción, el resumen y la fecha óptima de seguimiento.
                  </p>
                </div>

                {/* Caso D */}
                <div className="p-4 bg-white border border-sf-border rounded-sf space-y-2">
                  <div className="flex items-center gap-2 font-bold text-rose-700 text-sm">
                    <Flame className="w-4 h-4" />
                    <span>d) Predictor de Fuga & Churn ERP</span>
                  </div>
                  <p className="text-sf-text-weak leading-relaxed">
                    Cruza el histórico de compras en el ERP. Si un cliente supera 1.5x a 3x su intervalo habitual de recompra, el sistema alerta del riesgo de churn y redacta una propuesta personalizada de reactivación. Con 1 clic, crea una tarea prioritaria <code className="font-mono text-[11px]">CHURN_ALERT</code> en "Mi Día".
                  </p>
                </div>

                {/* Caso E */}
                <div className="p-4 bg-white border border-sf-border rounded-sf space-y-2 md:col-span-2">
                  <div className="flex items-center gap-2 font-bold text-indigo-700 text-sm">
                    <Send className="w-4 h-4" />
                    <span>e) Generador de Copys de Mailing con IA</span>
                  </div>
                  <p className="text-sf-text-weak leading-relaxed">
                    En el módulo de Mailing, el usuario introduce un prompt en lenguaje natural (ej. <em>"Campaña de reactivación para clientes que no compran desde hace 60 días"</em>). La IA genera el asunto, texto de previsualización y el código HTML responsive con variables dinámicas <code className="font-mono text-[11px]">{'{{nombre}}'}</code> y <code className="font-mono text-[11px]">{'{{empresa}}'}</code> y botones de Alta Intención listos para enviar.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

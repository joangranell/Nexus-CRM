import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { accountsApi, authApi, webhooksApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import InteractionModal from '../components/InteractionModal';
import AccountDrawer from '../components/AccountDrawer';
import {
  ObjectIcon,
  SubStatusBadge,
  Avatar,
  Toast,
  Spinner,
  EmptyState,
  Modal,
  stageIconType,
  ClientTypeBadge,
} from '../components/ui';
import {
  SUB_STATUS,
  formatCurrency,
  formatRelative,
  sourceLabel,
  displayName,
} from '../utils/format';
import {
  Search,
  RefreshCw,
  LayoutGrid,
  List,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Check,
  Recycle,
  Plus,
  PhoneCall,
  Eye,
  TriangleAlert,
  Sparkles,
} from 'lucide-react';

/* ------------------------------------------------------------------------ */
/* Vistas de lista                                                          */
/* ------------------------------------------------------------------------ */
const LIST_VIEWS = [
  { id: 'LEAD', label: '1. Bolsa común de leads', short: 'Leads sin asignar', filter: 'Etapa = Lead · Sin propietario' },
  { id: 'PROSPECTO', label: '2. Prospectos cualificados', short: 'Prospectos', filter: 'Etapa = Prospecto · Con contacto comercial efectivo' },
  { id: 'POTENCIAL', label: '3. Potenciales activos', short: 'Potenciales', filter: 'Etapa = Potencial · Negociación cuantificada activa' },
  { id: 'CLIENTE', label: '4. Clientes ERP', short: 'Clientes', filter: 'Etapa = Cliente · Pedido facturado/confirmado en ERP' },
  {
    id: 'STALE',
    label: 'Inactivos (+60 días)',
    short: 'Inactivos +60 d',
    filter: 'Etapa = Prospecto / Potencial · Sin actividad > 60 días',
  },
];

const KANBAN_COLUMNS = {
  LEAD: ['SIN_CONTACTAR', 'INTENTO_1', 'INTENTO_2', 'DESCARTADO'],
  PROSPECTO: ['CONTACTADO_CUALIFICANDO', 'INTENTO_1', 'INTENTO_2', 'DESCARTADO'],
  POTENCIAL: ['CONTACTADO_CUALIFICANDO', 'SIN_CONTACTAR', 'INTENTO_1', 'INTENTO_2', 'DESCARTADO'],
  CLIENTE: ['CONTACTADO_CUALIFICANDO', 'SIN_CONTACTAR', 'DESCARTADO'],
  STALE: ['CONTACTADO_CUALIFICANDO', 'SIN_CONTACTAR', 'INTENTO_1', 'INTENTO_2', 'DESCARTADO'],
};

const SORTABLE = {
  company_name: (a) => (a.company_name || '').toLowerCase(),
  sub_status: (a) => Object.keys(SUB_STATUS).indexOf(a.sub_status),
  source: (a) => a.source || '',
  owner_name: (a) => (a.owner_name || '~').toLowerCase(),
  total_pipeline_value: (a) => a.total_pipeline_value || 0,
  last_activity_at: (a) => a.last_activity_at || '',
};

const EMPTY_LEAD = { company_name: '', contact_name: '', email: '', phone: '', tax_id: '', notes: '' };

export default function DashboardFunnel() {
  const { user, isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Datos
  const [metrics, setMetrics] = useState(null);
  const [staleCount, setStaleCount] = useState(0);
  const [accounts, setAccounts] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastLoadedAt, setLastLoadedAt] = useState(null);

  // Filtros y vista
  const [activeTab, setActiveTab] = useState('LEAD');
  const [viewMode, setViewMode] = useState('table');
  const [selectedSubStatus, setSelectedSubStatus] = useState('');
  const [selectedOwner, setSelectedOwner] = useState('');
  const [selectedClientType, setSelectedClientType] = useState('');
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [sort, setSort] = useState({ key: 'last_activity_at', dir: 'desc' });
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const viewMenuRef = useRef(null);

  // Modales y paneles
  const [drawerAccountId, setDrawerAccountId] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [interactionModalAccount, setInteractionModalAccount] = useState(null);
  const [toast, setToast] = useState(null);
  const [staleRecycling, setStaleRecycling] = useState(false);
  const [confirmRecycle, setConfirmRecycle] = useState(false);
  const [showWebLeadModal, setShowWebLeadModal] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState(EMPTY_LEAD);
  const [webLeadSaving, setWebLeadSaving] = useState(false);

  const currentView = LIST_VIEWS.find((v) => v.id === activeTab);

  /* ---------- Búsqueda global desde la cabecera (?q=) ---------- */
  useEffect(() => {
    const q = searchParams.get('q') || '';
    if (!q) return;
    setSearchInput(q);
    setSearchQuery(q);
    if (activeTab === 'STALE') setActiveTab('LEAD');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  /* ---------- Debounce de la búsqueda local ---------- */
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    const onClick = (e) => {
      if (viewMenuRef.current && !viewMenuRef.current.contains(e.target)) setViewMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    authApi
      .getUsers()
      .then((res) => setUsersList(res.data))
      .catch((e) => console.error(e));
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [metricsRes, staleRes] = await Promise.all([
        accountsApi.getFunnelMetrics(),
        accountsApi.previewStale(60),
      ]);
      setMetrics(metricsRes.data);
      setStaleCount(staleRes.data.length);

      if (activeTab === 'STALE') {
        setAccounts(staleRes.data);
      } else {
        const params = {
          stage: activeTab,
          sub_status: selectedSubStatus || undefined,
          owner_id: activeTab !== 'LEAD' ? selectedOwner || undefined : undefined,
          client_type: selectedClientType || undefined,
          search: searchQuery || undefined,
          unassigned_only: activeTab === 'LEAD' ? true : undefined,
        };
        const accRes = await accountsApi.getAccounts(params);
        setAccounts(accRes.data);
      }
      setLastLoadedAt(new Date());
    } catch (e) {
      console.error('Error fetching data:', e);
      setToast({ type: 'error', title: 'Error', text: 'No se han podido cargar las cuentas.' });
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedSubStatus, selectedOwner, selectedClientType, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData, user?.id]);

  /* ---------- Ordenación cliente ---------- */
  const sortedAccounts = useMemo(() => {
    const getter = SORTABLE[sort.key];
    if (!getter) return accounts;
    const arr = [...accounts].sort((a, b) => {
      const va = getter(a);
      const vb = getter(b);
      if (va < vb) return -1;
      if (va > vb) return 1;
      return 0;
    });
    return sort.dir === 'desc' ? arr.reverse() : arr;
  }, [accounts, sort]);

  const toggleSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));

  const switchView = (id) => {
    setActiveTab(id);
    setSelectedSubStatus('');
    setViewMenuOpen(false);
    if (id === 'LEAD') setSelectedOwner('');
  };

  const openAccount = (id) => {
    setDrawerAccountId(id);
    setIsDrawerOpen(true);
  };

  const closeToast = useCallback(() => setToast(null), []);

  /* ---------- Acciones ---------- */
  const handleInteractionSuccess = (result) => {
    loadData();
    let title = 'Actividad registrada';
    if (result.promoted_to_potencial) title = 'Promocionado a Potencial';
    else if (result.promoted_to_prospecto) title = 'Cualificado a Prospecto';

    setToast({
      type: 'success',
      title,
      text: result.message || 'La actividad se ha guardado correctamente.',
    });
  };

  const handleRecycleStale = async () => {
    setStaleRecycling(true);
    try {
      const res = await accountsApi.recycleStale(60);
      setToast({ type: 'success', title: 'Reciclaje completado', text: res.data.message });
      setConfirmRecycle(false);
      loadData();
    } catch (e) {
      console.error(e);
      setToast({
        type: 'error',
        title: 'Error',
        text: e.response?.data?.detail || 'No se ha podido completar el reciclaje.',
      });
    } finally {
      setStaleRecycling(false);
    }
  };

  const handleSimulateWebLead = async (e) => {
    e.preventDefault();
    setWebLeadSaving(true);
    try {
      await webhooksApi.sendLeadWebhook(newLeadForm);
      setShowWebLeadModal(false);
      setToast({
        type: 'success',
        title: 'Lead creado',
        text: `«${newLeadForm.company_name}» se ha añadido a la bolsa común de leads.`,
      });
      setNewLeadForm(EMPTY_LEAD);
      loadData();
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', title: 'Error', text: 'No se ha podido crear el lead.' });
    } finally {
      setWebLeadSaving(false);
    }
  };

  /* ---------- KPIs (también actúan como selector de vista) ---------- */
  const kpis = [
    {
      id: 'LEAD',
      label: '1. Leads sin asignar',
      value: metrics?.unassigned_leads ?? 0,
      icon: 'lead',
      foot: (
        <>
          Sin contactar <strong>{metrics?.leads_sin_contactar ?? 0}</strong> · Intento 1{' '}
          <strong>{metrics?.leads_intento_1 ?? 0}</strong> · Intento 2{' '}
          <strong>{metrics?.leads_intento_2 ?? 0}</strong>
        </>
      ),
    },
    {
      id: 'PROSPECTO',
      label: '2. Prospectos',
      value: metrics?.prospectos ?? 0,
      icon: 'account',
      foot: (
        <>
          Conversión Lead → Prospecto <strong>{metrics?.conversion_rate_lead_to_prospecto ?? 0}%</strong>
        </>
      ),
      progress: metrics?.conversion_rate_lead_to_prospecto ?? 0,
    },
    {
      id: 'POTENCIAL',
      label: '3. Potenciales',
      value: metrics?.potenciales ?? 0,
      icon: 'opportunity',
      foot: (
        <>
          Conversión Prospecto → Potencial <strong>{metrics?.conversion_rate_prospecto_to_potencial ?? 0}%</strong>
        </>
      ),
      progress: metrics?.conversion_rate_prospecto_to_potencial ?? 0,
    },
    {
      id: 'CLIENTE',
      label: '4. Clientes ERP',
      value: metrics?.clientes ?? 0,
      icon: 'client',
      foot: (
        <>
          {metrics?.distribuidores_count ?? 0} Dist. · {metrics?.final_clients_count ?? metrics?.cdi_count ?? 0} Clientes Finales · Conv.{' '}
          <strong>{metrics?.conversion_rate_potencial_to_cliente ?? 0}%</strong>
        </>
      ),
      progress: metrics?.conversion_rate_potencial_to_cliente ?? 0,
    },
    {
      id: 'STALE',
      label: 'Inactivos +60 días',
      value: staleCount,
      icon: 'recycle',
      foot: <>Prospectos/Potenciales sin actividad comercial reciente</>,
      warn: staleCount > 0,
    },
  ];

  const kanbanColumns = useMemo(() => {
    const cols = KANBAN_COLUMNS[activeTab] || Object.keys(SUB_STATUS);
    return cols
      .map((key) => {
        const items = sortedAccounts.filter((a) => a.sub_status === key);
        return {
          key,
          items,
          total: items.reduce((s, a) => s + (a.total_pipeline_value || 0), 0),
        };
      })
      .filter((c, idx) => c.items.length > 0 || (activeTab === 'LEAD' && idx < 3));
  }, [sortedAccounts, activeTab]);

  const SortHeader = ({ col, children, className = '' }) => {
    const active = sort.key === col;
    return (
      <th className={className}>
        <button
          onClick={() => toggleSort(col)}
          className={`w-full flex items-center gap-1 hover:text-sf-brand ${active ? 'text-sf-text' : ''} ${
            className.includes('text-right') ? 'justify-end' : ''
          }`}
        >
          {children}
          {active ? (
            sort.dir === 'asc' ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )
          ) : (
            <ArrowUpDown className="w-3 h-3 opacity-40" />
          )}
        </button>
      </th>
    );
  };

  return (
    <div className="p-3 space-y-3 max-w-[1600px] mx-auto animate-fade-in">
      <Toast toast={toast} onClose={closeToast} />

      {/* ================= Cabecera de vista de lista ================= */}
      <section className="page-header">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <ObjectIcon type={activeTab === 'STALE' ? 'recycle' : stageIconType(activeTab)} />
            <div ref={viewMenuRef} className="relative">
              <p className="page-header-eyebrow">Cuentas</p>
              <button
                id="list-view-switcher"
                onClick={() => setViewMenuOpen((o) => !o)}
                className="flex items-center gap-1.5 group"
                aria-haspopup="listbox"
                aria-expanded={viewMenuOpen}
              >
                <h1 className="page-header-title group-hover:underline">{currentView.label}</h1>
                <ChevronDown className="w-4 h-4 text-sf-text-weak" />
              </button>

              {viewMenuOpen && (
                <ul
                  role="listbox"
                  className="absolute z-30 left-0 mt-1 w-80 bg-white border border-sf-border rounded-sf shadow-dropdown py-1 animate-slide-up"
                >
                  <li className="px-3 pt-1.5 pb-1 text-[11px] font-bold uppercase tracking-wider text-sf-text-weaker">
                    Vistas de lista
                  </li>
                  {LIST_VIEWS.map((v) => (
                    <li key={v.id}>
                      <button
                        role="option"
                        aria-selected={v.id === activeTab}
                        onClick={() => switchView(v.id)}
                        className="w-full px-3 py-1.5 flex items-center gap-2 text-left text-[13px] hover:bg-[#f3f3f3]"
                      >
                        <span className="w-4">
                          {v.id === activeTab && <Check className="w-4 h-4 text-sf-brand" />}
                        </span>
                        {v.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="btn-group">
              <button id="new-web-lead" onClick={() => setShowWebLeadModal(true)} className="btn-neutral">
                <Plus className="w-3.5 h-3.5" />
                Nuevo lead web
              </button>
              {isAdmin && (
                <button
                  id="recycle-stale"
                  onClick={() => setConfirmRecycle(true)}
                  disabled={staleCount === 0}
                  className="btn-neutral"
                >
                  <Recycle className="w-3.5 h-3.5" />
                  Reciclar inactivos
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-col xl:flex-row xl:items-end justify-between gap-3">
          <p className="page-header-meta">
            {loading ? 'Cargando…' : `${accounts.length} elementos`} · Ordenado por{' '}
            {
              {
                company_name: 'Cuenta',
                sub_status: 'Sub-estado',
                source: 'Origen',
                owner_name: 'Propietario',
                total_pipeline_value: 'Pipeline',
                last_activity_at: 'Última actividad',
              }[sort.key]
            }{' '}
            · Filtrado por {currentView.filter}
            {selectedSubStatus && ` · ${SUB_STATUS[selectedSubStatus]?.label}`}
            {lastLoadedAt && (
              <>
                {' '}
                · Actualizado a las{' '}
                {lastLoadedAt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </>
            )}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-sf-text-weaker absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                id="list-search"
                type="search"
                value={searchInput}
                disabled={activeTab === 'STALE'}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  if (searchParams.get('q')) setSearchParams({});
                }}
                placeholder="Buscar en esta lista…"
                className="input w-56 pl-8 disabled:bg-[#f3f3f3]"
              />
            </div>

            {activeTab !== 'STALE' && (
              <select
                id="filter-client-type"
                value={selectedClientType}
                onChange={(e) => setSelectedClientType(e.target.value)}
                className="select w-40"
                aria-label="Filtrar por tipo de cliente"
              >
                <option value="">Todos los tipos</option>
                <option value="DISTRIBUIDOR">Distribuidores</option>
                <option value="CLIENTE_FINAL">Clientes Finales (Canal Indirecto)</option>
              </select>
            )}

            {activeTab !== 'STALE' && (
              <select
                id="filter-substatus"
                value={selectedSubStatus}
                onChange={(e) => setSelectedSubStatus(e.target.value)}
                className="select w-44"
                aria-label="Filtrar por sub-estado"
              >
                <option value="">Todos los sub-estados</option>
                {Object.entries(SUB_STATUS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            )}

            {activeTab !== 'LEAD' && activeTab !== 'STALE' && (
              <select
                id="filter-owner"
                value={selectedOwner}
                onChange={(e) => setSelectedOwner(e.target.value)}
                className="select w-44"
                aria-label="Filtrar por propietario"
              >
                <option value="">Todos los propietarios</option>
                {usersList.map((u) => (
                  <option key={u.id} value={u.id}>
                    {displayName(u.name)}
                  </option>
                ))}
              </select>
            )}

            <button onClick={loadData} className="btn-icon" title="Actualizar">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <div className="btn-group" role="group" aria-label="Modo de visualización">
              <button
                id="view-table"
                onClick={() => setViewMode('table')}
                className={`btn-icon ${viewMode === 'table' ? 'is-selected' : ''}`}
                title="Tabla"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                id="view-kanban"
                onClick={() => setViewMode('kanban')}
                className={`btn-icon ${viewMode === 'kanban' ? 'is-selected' : ''}`}
                title="Kanban"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ================= KPIs / selector de embudo ================= */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3" aria-label="Indicadores del embudo">
        {kpis.map((k) => {
          const active = activeTab === k.id;
          return (
            <button
              key={k.id}
              id={`kpi-${k.id.toLowerCase()}`}
              onClick={() => switchView(k.id)}
              className={`card text-left p-4 transition-all hover:shadow-dropdown hover:-translate-y-px ${
                active ? 'ring-2 ring-sf-brand border-sf-brand' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-sf-text-weak">{k.label}</span>
                <ObjectIcon type={k.icon} size="sm" />
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className={`text-[32px] leading-none font-light ${k.warn ? 'text-sf-warning' : 'text-sf-text'}`}>
                  {k.value}
                </span>
                {k.warn && <TriangleAlert className="w-4 h-4 text-sf-warning" />}
              </div>
              {k.progress !== undefined && (
                <div className="mt-3 h-1.5 rounded-full bg-[#ecebea] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-sf-brand transition-all duration-700"
                    style={{ width: `${Math.min(100, k.progress)}%` }}
                  />
                </div>
              )}
              <p className={`text-xs text-sf-text-weak ${k.progress !== undefined ? 'mt-2' : 'mt-3'}`}>{k.foot}</p>
            </button>
          );
        })}
      </section>

      {/* ================= Aviso vista inactivos ================= */}
      {activeTab === 'STALE' && accounts.length > 0 && (
        <div className="notify-warning">
          <TriangleAlert className="w-4 h-4 text-sf-warning flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong>{accounts.length} potenciales llevan más de 60 días sin actividad y sin pedidos en ERP.</strong>{' '}
            {isAdmin
              ? 'Puede reciclarlos a la bolsa común para que otro comercial los reactive.'
              : 'Un administrador puede reciclarlos a la bolsa común.'}
          </div>
          {isAdmin && (
            <button onClick={() => setConfirmRecycle(true)} className="btn-neutral btn-sm">
              Reciclar ahora
            </button>
          )}
        </div>
      )}

      {/* ================= Contenido ================= */}
      {loading && accounts.length === 0 ? (
        <div className="card">
          <Spinner label="Cargando cuentas…" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No hay elementos que mostrar"
            text={
              activeTab === 'STALE'
                ? 'No hay potenciales inactivos. Toda la cartera tiene actividad reciente.'
                : 'Ajuste los filtros o cree un nuevo lead desde el formulario web.'
            }
            action={
              activeTab === 'LEAD' && (
                <button onClick={() => setShowWebLeadModal(true)} className="btn-brand">
                  Nuevo lead web
                </button>
              )
            }
          />
        </div>
      ) : viewMode === 'table' ? (
        /* ---------- Tabla ---------- */
        <div className={`card overflow-hidden transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-10 text-center">#</th>
                  <SortHeader col="company_name">Nombre de la cuenta</SortHeader>
                  <th>Tipo / Jerarquía</th>
                  <th>Contacto</th>
                  <SortHeader col="sub_status">Sub-estado</SortHeader>
                  <th>Teléfono</th>
                  <th>Email</th>
                  <SortHeader col="source">Origen</SortHeader>
                  <SortHeader col="owner_name">Propietario</SortHeader>
                  <SortHeader col="total_pipeline_value" className="text-right">
                    Pipeline
                  </SortHeader>
                  <SortHeader col="last_activity_at">Última actividad</SortHeader>
                  <th className="w-28" />
                </tr>
              </thead>
              <tbody>
                {sortedAccounts.map((acc, idx) => (
                  <tr key={acc.id}>
                    <td className="text-center text-xs text-sf-text-weaker">{idx + 1}</td>
                    <td className="max-w-[240px]">
                      <button
                        onClick={() => openAccount(acc.id)}
                        className="link font-normal text-left truncate block max-w-full"
                      >
                        {acc.company_name}
                      </button>
                    </td>
                    <td className="whitespace-nowrap">
                      <div className="flex flex-col gap-0.5 items-start">
                        <ClientTypeBadge type={acc.client_type} />
                        {(acc.client_type === 'CLIENTE_FINAL' || acc.client_type === 'CDI') && acc.billing_account_name && (
                          <span className="text-[11px] text-sf-text-weak truncate max-w-[170px]" title={`Factura a: ${acc.billing_account_name}`}>
                            Dist: <strong>{acc.billing_account_name}</strong>
                          </span>
                        )}
                        {acc.client_type === 'DISTRIBUIDOR' && (acc.final_clients_count || acc.cdi_count || 0) > 0 && (
                          <span className="text-[10px] text-indigo-700 bg-indigo-50 px-1 rounded font-medium">
                            {acc.final_clients_count || acc.cdi_count} Clientes Finales
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="text-sf-text whitespace-nowrap">{acc.contact_name || '—'}</td>
                    <td>
                      <SubStatusBadge value={acc.sub_status} />
                    </td>
                    <td className="whitespace-nowrap">
                      {acc.phone ? (
                        <a href={`tel:${acc.phone}`} className="link">
                          {acc.phone}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="max-w-[200px] truncate">
                      {acc.email ? (
                        <a href={`mailto:${acc.email}`} className="link">
                          {acc.email}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="text-sf-text-weak whitespace-nowrap">{sourceLabel(acc.source)}</td>
                    <td className="whitespace-nowrap">
                      {acc.owner_name ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Avatar name={acc.owner_name} size="sm" />
                          {displayName(acc.owner_name)}
                        </span>
                      ) : (
                        <span className="text-sf-text-weaker italic">Bolsa común</span>
                      )}
                    </td>
                    <td className="text-right tabular-nums whitespace-nowrap">
                      {acc.total_pipeline_value > 0 ? formatCurrency(acc.total_pipeline_value) : '—'}
                    </td>
                    <td className="text-sf-text-weak whitespace-nowrap">{formatRelative(acc.last_activity_at)}</td>
                    <td className="text-right pr-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openAccount(acc.id)}
                          className="btn-neutral btn-sm"
                          title="Abrir ficha y Visor ERP 360º de la cuenta"
                        >
                          <Eye className="w-3 h-3 text-sf-brand" />
                          Ficha 360º
                        </button>
                        <button
                          onClick={() => setInteractionModalAccount(acc)}
                          className="btn-neutral btn-sm"
                          title="Registrar actividad"
                        >
                          <PhoneCall className="w-3 h-3" />
                          Contactar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ---------- Kanban ---------- */
        <div className={`flex gap-3 overflow-x-auto pb-2 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          {kanbanColumns.map((col) => (
            <section
              key={col.key}
              className="flex-shrink-0 w-[300px] bg-[#f3f3f3] border border-sf-border rounded-sf flex flex-col max-h-[calc(100vh-380px)] min-h-[200px]"
            >
              <header className="px-3 pt-2.5 pb-2 bg-white rounded-t-sf border-b border-sf-border">
                <div
                  className="h-1 -mx-3 -mt-2.5 mb-2 rounded-t-sf"
                  style={{ background: SUB_STATUS[col.key]?.dot }}
                />
                <h2 className="text-[13px] font-bold text-sf-text flex items-center justify-between">
                  {SUB_STATUS[col.key]?.label || col.key}
                  <span className="badge-lightest">{col.items.length}</span>
                </h2>
                <p className="text-xs text-sf-text-weak">
                  {col.total > 0 ? `${formatCurrency(col.total)} en pipeline` : 'Sin pipeline'}
                </p>
              </header>

              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {col.items.length === 0 && (
                  <p className="text-xs text-sf-text-weaker text-center py-6">Sin elementos</p>
                )}
                {col.items.map((acc) => (
                  <article
                    key={acc.id}
                    onClick={() => openAccount(acc.id)}
                    className="bg-white border border-sf-border rounded-sf p-3 shadow-card cursor-pointer hover:border-sf-brand-light hover:shadow-dropdown transition-all"
                  >
                    <div className="flex items-start justify-between gap-1.5 mb-1">
                      <h3 className="link text-[13px] font-semibold leading-snug truncate">{acc.company_name}</h3>
                      <ClientTypeBadge type={acc.client_type} className="flex-shrink-0" />
                    </div>
                    {(acc.client_type === 'CLIENTE_FINAL' || acc.client_type === 'CDI') && acc.billing_account_name && (
                      <p className="text-[11px] text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100 mb-1.5 truncate">
                        Dist: <strong>{acc.billing_account_name}</strong>
                      </p>
                    )}
                    {acc.client_type === 'DISTRIBUIDOR' && (acc.final_clients_count || acc.cdi_count || 0) > 0 && (
                      <p className="text-[11px] text-indigo-800 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 mb-1.5">
                        Red: <strong>{acc.final_clients_count || acc.cdi_count} Clientes Finales</strong>
                      </p>
                    )}
                    <dl className="mt-1.5 grid grid-cols-[auto,1fr] gap-x-2 gap-y-0.5 text-xs">
                      <dt className="text-sf-text-weak">Contacto:</dt>
                      <dd className="text-sf-text truncate">{acc.contact_name || '—'}</dd>
                      <dt className="text-sf-text-weak">Teléfono:</dt>
                      <dd className="text-sf-text truncate">{acc.phone || '—'}</dd>
                      <dt className="text-sf-text-weak">Origen:</dt>
                      <dd className="text-sf-text truncate">{sourceLabel(acc.source)}</dd>
                      {acc.total_pipeline_value > 0 && (
                        <>
                          <dt className="text-sf-text-weak">Pipeline:</dt>
                          <dd className="text-sf-text font-semibold">{formatCurrency(acc.total_pipeline_value)}</dd>
                        </>
                      )}
                    </dl>
                    {acc.ai_summary && (
                      <p className="mt-2 text-xs text-sf-text-weak line-clamp-2 flex gap-1">
                        <Sparkles className="w-3 h-3 text-[#9050e9] flex-shrink-0 mt-0.5" />
                        <span>{acc.ai_summary}</span>
                      </p>
                    )}
                    <footer className="mt-2.5 pt-2 border-t border-sf-border flex items-center justify-between">
                      {acc.owner_name ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-sf-text-weak">
                          <Avatar name={acc.owner_name} size="sm" />
                          {displayName(acc.owner_name)}
                        </span>
                      ) : (
                        <span className="text-xs text-sf-text-weaker italic">Bolsa común</span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setInteractionModalAccount(acc);
                        }}
                        className="btn-icon w-7 h-7"
                        title="Registrar actividad"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                      </button>
                    </footer>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* ================= Ficha 360º ================= */}
      <AccountDrawer
        accountId={drawerAccountId}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onOpenInteractionModal={(acc) => {
          setIsDrawerOpen(false);
          setInteractionModalAccount(acc);
        }}
        onAccountUpdated={loadData}
      />

      {/* ================= Registrar actividad ================= */}
      <InteractionModal
        account={interactionModalAccount}
        isOpen={!!interactionModalAccount}
        onClose={() => setInteractionModalAccount(null)}
        onSuccess={handleInteractionSuccess}
      />

      {/* ================= Confirmar reciclaje ================= */}
      <Modal
        isOpen={confirmRecycle}
        onClose={() => setConfirmRecycle(false)}
        title="Reciclar potenciales inactivos"
        size="sm"
        footer={
          <>
            <button onClick={() => setConfirmRecycle(false)} className="btn-neutral" disabled={staleRecycling}>
              Cancelar
            </button>
            <button onClick={handleRecycleStale} className="btn-brand" disabled={staleRecycling}>
              {staleRecycling ? 'Reciclando…' : `Reciclar ${staleCount} cuentas`}
            </button>
          </>
        }
      >
        <p className="text-[13px] text-sf-text leading-relaxed">
          Se devolverán <strong>{staleCount} cuentas</strong> en etapa Potencial, sin pedidos y sin actividad en
          los últimos 60 días, a la <strong>bolsa común de leads</strong>. Perderán su propietario actual y su
          sub-estado se restablecerá a «Sin contactar».
        </p>
        <p className="text-xs text-sf-text-weak mt-3">
          Se registrará una nota automática en el historial de cada cuenta.
        </p>
      </Modal>

      {/* ================= Nuevo lead web ================= */}
      <Modal
        isOpen={showWebLeadModal}
        onClose={() => setShowWebLeadModal(false)}
        title="Nuevo lead web"
        subtitle={
          <>
            Simula el envío de un formulario web al endpoint{' '}
            <code className="font-mono text-xs bg-[#f3f3f3] px-1 py-0.5 rounded">POST /api/webhooks/lead</code>
          </>
        }
        footer={
          <>
            <button type="button" onClick={() => setShowWebLeadModal(false)} className="btn-neutral">
              Cancelar
            </button>
            <button type="submit" form="web-lead-form" className="btn-brand" disabled={webLeadSaving}>
              {webLeadSaving ? 'Guardando…' : 'Guardar'}
            </button>
          </>
        }
      >
        <form id="web-lead-form" onSubmit={handleSimulateWebLead} className="space-y-4">
          <h3 className="section-title">Información de la empresa</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="lead-company" className="form-label">
                <abbr className="req no-underline" title="obligatorio">*</abbr>Nombre de la empresa
              </label>
              <input
                id="lead-company"
                type="text"
                required
                value={newLeadForm.company_name}
                onChange={(e) => setNewLeadForm({ ...newLeadForm, company_name: e.target.value })}
                placeholder="Industrias Mecánicas del Cantábrico, S.L."
                className="input"
              />
            </div>
            <div>
              <label htmlFor="lead-taxid" className="form-label">
                NIF / CIF
              </label>
              <input
                id="lead-taxid"
                type="text"
                value={newLeadForm.tax_id}
                onChange={(e) => setNewLeadForm({ ...newLeadForm, tax_id: e.target.value })}
                placeholder="B12345678"
                className="input font-mono"
              />
            </div>
          </div>

          <h3 className="section-title">Información de contacto</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="lead-contact" className="form-label">
                Persona de contacto
              </label>
              <input
                id="lead-contact"
                type="text"
                value={newLeadForm.contact_name}
                onChange={(e) => setNewLeadForm({ ...newLeadForm, contact_name: e.target.value })}
                placeholder="Martín Ruiz"
                className="input"
              />
            </div>
            <div>
              <label htmlFor="lead-phone" className="form-label">
                Teléfono
              </label>
              <input
                id="lead-phone"
                type="tel"
                value={newLeadForm.phone}
                onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                placeholder="+34 942 00 11 22"
                className="input"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="lead-email" className="form-label">
                Email
              </label>
              <input
                id="lead-email"
                type="email"
                value={newLeadForm.email}
                onChange={(e) => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
                placeholder="contacto@empresa.es"
                className="input"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="lead-notes" className="form-label">
                Comentarios del formulario
              </label>
              <textarea
                id="lead-notes"
                rows={3}
                value={newLeadForm.notes}
                onChange={(e) => setNewLeadForm({ ...newLeadForm, notes: e.target.value })}
                placeholder="Solicitan presupuesto de suministro urgente…"
                className="textarea"
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

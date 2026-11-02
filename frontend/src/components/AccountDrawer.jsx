import React, { useState, useEffect } from 'react';
import { accountsApi, tasksApi, erpApi, aiApi } from '../services/api';
import VoiceToCRMModal from './VoiceToCRMModal';
import {
  X,
  Mail,
  Phone,
  Clock,
  Sparkles,
  Mic,
  RefreshCw,
  PhoneCall,
  PhoneOff,
  Users,
  MessageSquare,
  FileText,
  Calendar,
  Plus,
  ChevronDown,
  Receipt,
  Package,
  Send,
  CheckCircle2,
  AlertCircle,
  Eye,
  TrendingUp,
  Layers,
  Store,
  Pencil,
  Trash2,
} from 'lucide-react';
import { ObjectIcon, LifecyclePath, Spinner, SubStatusBadge, Avatar, Modal, stageIconType, ClientTypeBadge } from './ui';
import {
  STAGE_LABELS,
  INTERACTION_LABELS,
  PRIORITY_LABELS,
  OPP_STATUS_LABELS,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatRelative,
  sourceLabel,
  displayName,
} from '../utils/format';

const INTERACTION_STYLE = {
  CALL_EFFECTIVE: { icon: PhoneCall, bg: 'bg-[#3ba755]' },
  CALL_NO_ANSWER: { icon: PhoneOff, bg: 'bg-[#dd7a01]' },
  EMAIL_1TO1: { icon: Mail, bg: 'bg-[#0176d3]' },
  MEETING_VISIT: { icon: Users, bg: 'bg-[#cb65ff]' },
  INBOUND_REPLY: { icon: MessageSquare, bg: 'bg-[#06a59a]' },
  NOTE: { icon: FileText, bg: 'bg-[#706e6b]' },
};

function Field({ label, children, mono }) {
  return (
    <div className="field">
      <div className="field-label">{label}</div>
      <div className={`field-value ${mono ? 'font-mono text-[12px]' : ''}`}>{children || '—'}</div>
    </div>
  );
}

export default function AccountDrawer({
  accountId,
  isOpen,
  onClose,
  onOpenInteractionModal,
  onAccountUpdated,
  initialTab = 'activity',
}) {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab || 'activity');

  // ERP Viewer States
  const [erpSummary, setErpSummary] = useState(null);
  const [loadingErp, setLoadingErp] = useState(false);
  const [pushingErp, setPushingErp] = useState(false);
  const [pushMessage, setPushMessage] = useState(null);
  const [selectedOrderLines, setSelectedOrderLines] = useState(null);

  // Qualification / Hierarchy States
  const [qualifyModalOpen, setQualifyModalOpen] = useState(false);
  const [qualifyType, setQualifyType] = useState('DISTRIBUIDOR');
  const [qualifyDistributorId, setQualifyDistributorId] = useState('');
  const [distributorsList, setDistributorsList] = useState([]);
  const [qualifySaving, setQualifySaving] = useState(false);
  const [qualifyError, setQualifyError] = useState('');

  // New Task Modal States
  const [newTaskModalOpen, setNewTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('NORMAL');
  const [newTaskSaving, setNewTaskSaving] = useState(false);
  const [newTaskError, setNewTaskError] = useState('');

  // Edit Task Modal States
  const [editTaskModalOpen, setEditTaskModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskDueDate, setEditTaskDueDate] = useState('');
  const [editTaskPriority, setEditTaskPriority] = useState('NORMAL');
  const [editTaskSaving, setEditTaskSaving] = useState(false);
  const [editTaskError, setEditTaskError] = useState('');

  // AI Lead Enricher & Voice States
  const [enriching, setEnriching] = useState(false);
  const [enrichMessage, setEnrichMessage] = useState(null);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);

  useEffect(() => {
    if (accountId && isOpen) {
      setActiveTab(initialTab || 'activity');
      loadAccount();
      loadErpSummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, isOpen, initialTab]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const loadAccount = async () => {
    setLoading(true);
    try {
      const res = await accountsApi.getAccountDetail(accountId);
      setAccount(res.data);
    } catch (e) {
      console.error('Error fetching account details:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadErpSummary = async () => {
    setLoadingErp(true);
    try {
      const res = await erpApi.getAccountSummary(accountId);
      setErpSummary(res.data);
    } catch (e) {
      console.warn('ERP Summary not loaded:', e);
    } finally {
      setLoadingErp(false);
    }
  };

  const handleToggleTask = async (taskId) => {
    try {
      await tasksApi.toggleTask(taskId);
      loadAccount();
      if (onAccountUpdated) onAccountUpdated();
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenNewTask = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const tzOffset = tomorrow.getTimezoneOffset() * 60000;
    const localISOTime = new Date(tomorrow.getTime() - tzOffset).toISOString().slice(0, 16);

    setNewTaskTitle(`Seguimiento comercial con ${account?.company_name || ''}`);
    setNewTaskDueDate(localISOTime);
    setNewTaskPriority('NORMAL');
    setNewTaskError('');
    setNewTaskModalOpen(true);
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskDueDate) {
      setNewTaskError('El título y la fecha de vencimiento son obligatorios.');
      return;
    }
    setNewTaskSaving(true);
    setNewTaskError('');
    try {
      await tasksApi.createTask({
        account_id: account.id,
        title: newTaskTitle.trim(),
        due_date: new Date(newTaskDueDate).toISOString(),
        priority: newTaskPriority,
      });
      setNewTaskModalOpen(false);
      loadAccount();
      if (onAccountUpdated) onAccountUpdated();
    } catch (err) {
      console.error('Error creating task:', err);
      setNewTaskError(err.response?.data?.detail || 'Error al crear la tarea');
    } finally {
      setNewTaskSaving(false);
    }
  };

  const toLocalInputDate = (dateVal) => {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const handleOpenEditTask = (task) => {
    setEditingTaskId(task.id);
    setEditTaskTitle(task.title || '');
    setEditTaskDueDate(toLocalInputDate(task.due_date));
    setEditTaskPriority(task.priority || 'NORMAL');
    setEditTaskError('');
    setEditTaskModalOpen(true);
  };

  const handleSaveEditTask = async (e) => {
    e.preventDefault();
    if (!editTaskTitle.trim() || !editTaskDueDate) {
      setEditTaskError('El título y la fecha de vencimiento son obligatorios.');
      return;
    }
    setEditTaskSaving(true);
    setEditTaskError('');
    try {
      await tasksApi.updateTask(editingTaskId, {
        title: editTaskTitle.trim(),
        due_date: new Date(editTaskDueDate).toISOString(),
        priority: editTaskPriority,
      });
      setEditTaskModalOpen(false);
      loadAccount();
      if (onAccountUpdated) onAccountUpdated();
    } catch (err) {
      console.error('Error updating task:', err);
      setEditTaskError(err.response?.data?.detail || 'Error al actualizar la tarea');
    } finally {
      setEditTaskSaving(false);
    }
  };

  const handleDeleteTask = async (taskId, taskTitle = 'esta tarea') => {
    if (!window.confirm(`¿Seguro que deseas eliminar permanentemente la tarea "${taskTitle}"?`)) {
      return;
    }
    try {
      await tasksApi.deleteTask(taskId);
      loadAccount();
      if (onAccountUpdated) onAccountUpdated();
    } catch (err) {
      console.error('Error deleting task:', err);
      alert(err.response?.data?.detail || 'No se pudo eliminar la tarea');
    }
  };

  const handlePushToErp = async () => {
    setPushingErp(true);
    setPushMessage(null);
    try {
      const res = await erpApi.pushToErp(accountId);
      setPushMessage({ type: 'success', text: res.data.message });
      loadAccount();
      loadErpSummary();
      if (onAccountUpdated) onAccountUpdated();
    } catch (e) {
      console.error(e);
      setPushMessage({
        type: 'error',
        text: e.response?.data?.detail || 'No se pudo sincronizar con el ERP',
      });
    } finally {
      setPushingErp(false);
    }
  };

  const handleOpenQualifyModal = async () => {
    setQualifyType(account?.client_type || 'DISTRIBUIDOR');
    setQualifyDistributorId(account?.billing_account_id ? String(account.billing_account_id) : '');
    setQualifyError('');
    try {
      const res = await accountsApi.getDistributors();
      // filter out self to avoid circular reference
      setDistributorsList(res.data.filter((d) => d.id !== account?.id));
    } catch (e) {
      console.error(e);
    }
    setQualifyModalOpen(true);
  };

  const handleSaveQualification = async (e) => {
    e.preventDefault();
    if (qualifyType === 'CLIENTE_FINAL' && !qualifyDistributorId) {
      setQualifyError('Debe seleccionar un Distribuidor mayorista para asociar este Cliente Final (Canal Indirecto).');
      return;
    }
    setQualifySaving(true);
    setQualifyError('');
    try {
      await accountsApi.qualifyAccount(accountId, {
        client_type: qualifyType,
        billing_account_id: qualifyType === 'CLIENTE_FINAL' ? Number(qualifyDistributorId) : null,
      });
      setQualifyModalOpen(false);
      loadAccount();
      if (onAccountUpdated) onAccountUpdated();
    } catch (err) {
      console.error(err);
      setQualifyError(err.response?.data?.detail || 'No se pudo guardar la tipología del cliente.');
    } finally {
      setQualifySaving(false);
    }
  };

  const handleEnrichLead = async () => {
    if (!accountId) return;
    setEnriching(true);
    setEnrichMessage(null);
    try {
      const res = await aiApi.enrichLead(accountId);
      setEnrichMessage({ type: 'success', text: 'Cuenta enriquecida con éxito por la IA.' });
      setAccount((prev) => ({ ...prev, ai_summary: res.data.ai_summary }));
      if (onAccountUpdated) onAccountUpdated();
    } catch (e) {
      console.error(e);
      setEnrichMessage({
        type: 'error',
        text: e.response?.data?.detail || 'No se pudo enriquecer la cuenta con IA.',
      });
    } finally {
      setEnriching(false);
    }
  };

  if (!isOpen) return null;

  const pendingTasks = account?.tasks?.filter((t) => !t.is_completed) || [];
  const openOpps = account?.opportunities?.filter((o) => o.status === 'ABIERTA') || [];

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[rgba(8,7,7,0.45)] animate-fade-in"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Ficha de cuenta"
        className="w-full max-w-[1060px] h-full bg-sf-bg shadow-modal flex flex-col animate-slide-in-right"
      >
        {loading && !account ? (
          <Spinner label="Cargando ficha de la cuenta…" />
        ) : account ? (
          <>
            {/* ---------- Highlights panel ---------- */}
            <div className="bg-white border-b border-sf-border shadow-card">
              <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <ObjectIcon type={stageIconType(account.lifecycle_stage)} size="lg" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="page-header-eyebrow">Cuenta · {STAGE_LABELS[account.lifecycle_stage]}</p>
                      <ClientTypeBadge type={account.client_type} />
                    </div>
                    <h2 className="text-xl font-bold text-sf-text leading-tight truncate">
                      {account.company_name}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="btn-group">
                    <button
                      id="drawer-log-activity"
                      onClick={() => onOpenInteractionModal(account)}
                      className="btn-neutral"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Registrar actividad
                    </button>
                    <button
                      onClick={() => setVoiceModalOpen(true)}
                      className="btn-neutral text-slate-800"
                      title="Dictar visita o llamada con extracción de oportunidad"
                    >
                      <Mic className="w-3.5 h-3.5 text-rose-500" />
                      Dictar Visita
                    </button>
                    <button
                      onClick={handleEnrichLead}
                      disabled={enriching}
                      className="btn-neutral text-slate-800"
                      title="Enriquecer ficha con IA"
                    >
                      {enriching ? <Spinner size="xs" /> : <Sparkles className="w-3.5 h-3.5 text-sf-brand" />}
                      Enriquecer con IA
                    </button>
                    <button
                      onClick={handleOpenQualifyModal}
                      className="btn-neutral"
                      title="Cualificar tipología: Distribuidor mayorista o Cliente Final (Canal Indirecto)"
                    >
                      <Layers className="w-3.5 h-3.5 text-sf-brand" />
                      Tipo de cuenta
                    </button>
                    <button
                      onClick={() => setActiveTab('erp')}
                      className={`btn-neutral ${
                        activeTab === 'erp'
                          ? 'bg-sf-brand-50 border-sf-brand text-sf-brand font-bold'
                          : 'text-slate-700'
                      }`}
                      title="Abrir Visor ERP 360º"
                    >
                      <Receipt className="w-3.5 h-3.5 text-sf-brand" />
                      Visor ERP 360º
                    </button>
                    {account.phone && (
                      <a href={`tel:${account.phone}`} className="btn-neutral">
                        <Phone className="w-3.5 h-3.5" />
                        Llamar
                      </a>
                    )}
                    {account.email && (
                      <a href={`mailto:${account.email}`} className="btn-neutral">
                        <Mail className="w-3.5 h-3.5" />
                        Email
                      </a>
                    )}
                    <button className="btn-neutral px-2" title="Más acciones">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button onClick={onClose} className="btn-icon-bare ml-1" aria-label="Cerrar ficha">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Campos destacados */}
              <dl className="px-5 pb-4 grid grid-cols-2 md:grid-cols-6 gap-x-6 gap-y-2">
                {[
                  ['Sub-estado', <SubStatusBadge value={account.sub_status} />],
                  [
                    'Propietario',
                    account.owner_name ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Avatar name={account.owner_name} size="sm" />
                        <span className="link">{displayName(account.owner_name)}</span>
                      </span>
                    ) : (
                      <span className="text-sf-text-weak">Bolsa común</span>
                    ),
                  ],
                  [
                    'Tipo de Cliente',
                    <div className="flex items-center gap-1">
                      <ClientTypeBadge type={account.client_type} />
                      <button
                        onClick={handleOpenQualifyModal}
                        className="text-[11px] text-sf-brand hover:underline font-normal ml-0.5"
                      >
                        {account.client_type ? 'Cambiar' : 'Definir'}
                      </button>
                    </div>,
                  ],
                  [
                    (account.client_type === 'CLIENTE_FINAL' || account.client_type === 'CDI')
                      ? 'Distribuidor Factura'
                      : account.client_type === 'DISTRIBUIDOR'
                      ? 'Clientes Finales'
                      : 'Código ERP',
                    (account.client_type === 'CLIENTE_FINAL' || account.client_type === 'CDI') ? (
                      <span className="font-semibold text-teal-800 truncate block" title={account.billing_account_name || 'Sin distribuidor'}>
                        {account.billing_account_name || 'Sin asignar'}
                      </span>
                    ) : account.client_type === 'DISTRIBUIDOR' ? (
                      <span className="font-semibold text-indigo-800">
                        {account.final_client_accounts?.length || 0} Clientes Finales
                      </span>
                    ) : account.erp_customer_id ? (
                      <button
                        onClick={() => setActiveTab('erp')}
                        className="font-mono text-xs font-bold text-sf-brand hover:underline"
                        title="Ver en Visor ERP 360º"
                      >
                        {account.erp_customer_id}
                      </button>
                    ) : (
                      <span className="text-sf-text-weaker italic">Sin sincronizar</span>
                    ),
                  ],
                  ['Pipeline abierto', formatCurrency(account.total_pipeline_value)],
                  ['Última actividad', formatRelative(account.last_activity_at)],
                ].map(([label, value]) => (
                  <div key={label} className="min-w-0">
                    <dt className="text-xs text-sf-text-weak">{label}</dt>
                    <dd className="text-[13px] text-sf-text mt-0.5 truncate">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* ---------- Cuerpo ---------- */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {/* Path */}
              <div className="card p-3">
                <LifecyclePath stage={account.lifecycle_stage} />
                <p className="text-xs text-sf-text-weak mt-2">
                  {account.lifecycle_stage === 'LEAD' &&
                    'Un contacto comercial efectivo (llamada, email 1 a 1, reunión o respuesta) cualifica automáticamente la cuenta como Prospecto.'}
                  {account.lifecycle_stage === 'PROSPECTO' &&
                    'Contacto comercial efectivo realizado. Para avanzar a Potencial, cuantifique una oportunidad con importe estimado y fecha de cierre.'}
                  {account.lifecycle_stage === 'POTENCIAL' &&
                    'Negociación comercial activa y cuantificada. Pasará a Cliente cuando el ERP registre su primer pedido confirmado.'}
                  {account.lifecycle_stage === 'CLIENTE' &&
                    `Cliente validado por ERP con código ${account.erp_customer_id || 'asociado'}. Facturación activa.`}
                </p>
              </div>

              {/* Banner de Feedback de Enriquecimiento */}
              {enrichMessage && (
                <div
                  className={`p-3 rounded-sf text-xs flex items-center gap-2 animate-fade-in ${
                    enrichMessage.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {enrichMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  )}
                  <span>{enrichMessage.text}</span>
                </div>
              )}

              {/* Resumen Inteligente de Cuenta (IA) */}
              {account.ai_summary && (
                <div className="card p-3 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white border border-blue-200 shadow-xs">
                  <div className="flex items-center justify-between pb-1.5 border-b border-blue-100">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-sf-brand" />
                      <span className="text-xs font-bold text-sf-brand uppercase tracking-wider">
                        Resumen Inteligente de Cuenta (IA)
                      </span>
                    </div>
                    <button
                      onClick={handleEnrichLead}
                      disabled={enriching}
                      className="text-[11px] text-sf-brand hover:underline font-medium flex items-center gap-1"
                    >
                      {enriching ? <Spinner size="xs" /> : <RefreshCw className="w-3 h-3" />}
                      Actualizar
                    </button>
                  </div>
                  <p className="text-xs text-sf-text mt-2 leading-relaxed whitespace-pre-line font-sans">
                    {account.ai_summary}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* Columna principal */}
                <div className="lg:col-span-2 card">
                  <div className="px-4 tabs flex items-center">
                    {[
                      { id: 'activity', label: `Actividad (${account.interactions?.length || 0})`, icon: Clock },
                      { id: 'details', label: 'Detalles', icon: FileText },
                      {
                        id: 'erp',
                        label: `Visor ERP 360º ${
                          erpSummary?.total_orders_count ? `(${erpSummary.total_orders_count})` : ''
                        }`,
                        icon: Receipt,
                        badge: account.lifecycle_stage === 'CLIENTE' ? 'Activo' : null,
                      },
                    ].map((tabItem) => {
                      const Icon = tabItem.icon;
                      const active = activeTab === tabItem.id;
                      return (
                        <button
                          key={tabItem.id}
                          onClick={() => setActiveTab(tabItem.id)}
                          className={`tab flex items-center gap-1.5 ${active ? 'is-active font-bold text-sf-brand' : ''}`}
                        >
                          <Icon className={`w-3.5 h-3.5 ${active ? 'text-sf-brand' : 'text-slate-400'}`} />
                          <span>{tabItem.label}</span>
                          {tabItem.badge && (
                            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
                              {tabItem.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="p-4">
                    {/* TAB 1: ACTIVIDAD */}
                    {activeTab === 'activity' && (
                      <>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-bold text-sf-text">Historial de actividad</h3>
                          <button onClick={() => onOpenInteractionModal(account)} className="btn-neutral btn-sm">
                            Nueva actividad
                          </button>
                        </div>
                        {account.interactions?.length === 0 ? (
                          <p className="text-[13px] text-sf-text-weak py-8 text-center">
                            Aún no hay actividad registrada para esta cuenta.
                          </p>
                        ) : (
                          <ol className="relative">
                            {account.interactions.map((item, idx) => {
                              const st = INTERACTION_STYLE[item.type] || INTERACTION_STYLE.NOTE;
                              const Icon = st.icon;
                              const isLast = idx === account.interactions.length - 1;
                              return (
                                <li key={item.id} className="relative flex gap-3 pb-4">
                                  {!isLast && (
                                    <span className="absolute left-[11px] top-7 bottom-0 w-0.5 bg-sf-border" />
                                  )}
                                  <span
                                    className={`relative z-10 w-6 h-6 rounded-sf flex items-center justify-center text-white flex-shrink-0 ${st.bg}`}
                                  >
                                    <Icon className="w-3.5 h-3.5" />
                                  </span>
                                  <div className="flex-1 min-w-0 -mt-0.5">
                                    <div className="flex items-baseline justify-between gap-3">
                                      <span className="text-[13px] font-semibold text-sf-brand">
                                        {INTERACTION_LABELS[item.type] || item.type}
                                      </span>
                                      <span className="text-xs text-sf-text-weak whitespace-nowrap flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {formatDateTime(item.created_at)}
                                      </span>
                                    </div>
                                    <p className="text-xs text-sf-text-weak">
                                      {displayName(item.user_name)} registró una actividad
                                    </p>
                                    <p className="mt-1.5 text-[13px] text-sf-text leading-relaxed bg-sf-bg-alt border border-sf-border rounded-sf px-3 py-2">
                                      {item.summary}
                                    </p>
                                  </div>
                                </li>
                              );
                            })}
                          </ol>
                        )}
                      </>
                    )}

                    {/* TAB 2: DETALLES */}
                    {activeTab === 'details' && (
                      <div className="space-y-5">
                        {/* Tipología y Jerarquía */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="section-title">Jerarquía Comercial y Facturación</h3>
                            <button onClick={handleOpenQualifyModal} className="btn-neutral btn-sm">
                              <Layers className="w-3.5 h-3.5 text-sf-brand" />
                              Cualificar / Configurar Tipo
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 px-1 mb-3">
                            <Field label="Tipología de Cliente">
                              <ClientTypeBadge type={account.client_type} />
                            </Field>
                            {(account.client_type === 'CLIENTE_FINAL' || account.client_type === 'CDI') ? (
                              <Field label="Cliente Factura (Distribuidor Mayorista)">
                                <span className="font-semibold text-teal-800">
                                  {account.billing_account_name || 'Sin distribuidor asociado'}
                                </span>
                              </Field>
                            ) : account.client_type === 'DISTRIBUIDOR' ? (
                              <Field label="Red de Clientes Finales">
                                <span className="font-semibold text-indigo-800">
                                  {(account.final_client_accounts)?.length || 0} Clientes Finales asociados
                                </span>
                              </Field>
                            ) : (
                              <Field label="Clasificación">
                                <span className="text-sf-text-weak italic">Pendiente de cualificar</span>
                              </Field>
                            )}
                          </div>

                          {/* Si es distribuidor y tiene Clientes Finales asociados, mostrar la red */}
                          {account.client_type === 'DISTRIBUIDOR' && ((account.final_client_accounts)?.length || 0) > 0 && (
                            <div className="border border-sf-border rounded-sf overflow-hidden mt-3">
                              <div className="bg-[#f8f9fa] px-3 py-2 border-b border-sf-border text-xs font-bold text-sf-text flex items-center justify-between">
                                <span>Clientes Finales que facturan a través de este Distribuidor:</span>
                                <span className="badge-lightest">{(account.final_client_accounts).length} Clientes Finales</span>
                              </div>
                              <table className="data-table">
                                <thead>
                                  <tr>
                                    <th>Cliente Final</th>
                                    <th>CIF / NIF</th>
                                    <th>Contacto</th>
                                    <th>Teléfono</th>
                                    <th>Etapa</th>
                                  </tr>
                                </thead>
                                <tbody className="text-xs">
                                  {(account.final_client_accounts).map((cf) => (
                                    <tr key={cf.id}>
                                      <td className="font-semibold text-sf-text">{cf.company_name}</td>
                                      <td className="font-mono text-sf-text-weak">{cf.tax_id || '—'}</td>
                                      <td>{cf.contact_name || '—'}</td>
                                      <td>{cf.phone || '—'}</td>
                                      <td>
                                        <span className="badge-lightest">{STAGE_LABELS[cf.lifecycle_stage] || cf.lifecycle_stage}</span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>

                        <div>
                          <h3 className="section-title mb-3">Información de la cuenta</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 px-1">
                            <Field label="Nombre de la cuenta">{account.company_name}</Field>
                            <Field label="Persona de contacto">{account.contact_name}</Field>
                            <Field label="NIF / CIF" mono>
                              {account.tax_id}
                            </Field>
                            <Field label="Código cliente ERP" mono>
                              {account.erp_customer_id}
                            </Field>
                            <Field label="Origen">{sourceLabel(account.source)}</Field>
                            <Field label="Consentimiento marketing">
                              {account.opt_in_marketing ? 'Sí' : 'No'}
                            </Field>
                          </div>
                        </div>
                        <div>
                          <h3 className="section-title mb-3">Ciclo de vida</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 px-1">
                            <Field label="Etapa">{STAGE_LABELS[account.lifecycle_stage]}</Field>
                            <Field label="Sub-estado">
                              <SubStatusBadge value={account.sub_status} />
                            </Field>
                            <Field label="Fecha de alta">{formatDate(account.created_at)}</Field>
                            <Field label="Primer pedido">{formatDate(account.first_order_date)}</Field>
                            <Field label="Última actividad">{formatDateTime(account.last_activity_at)}</Field>
                            <Field label="Propietario">
                              {account.owner_name ? displayName(account.owner_name) : 'Bolsa común'}
                            </Field>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 3: VISOR ERP 360º (FASE 2) */}
                    {activeTab === 'erp' && (
                      <div className="space-y-4">
                        {/* Status notification / Push action */}
                        {pushMessage && (
                          <div className={pushMessage.type === 'success' ? 'notify-success' : 'notify-error'}>
                            {pushMessage.type === 'success' ? (
                              <CheckCircle2 className="w-4 h-4 text-sf-success flex-shrink-0 mt-0.5" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-sf-error flex-shrink-0 mt-0.5" />
                            )}
                            <span className="text-xs">{pushMessage.text}</span>
                          </div>
                        )}

                        <div className="p-3 bg-sf-bg border border-sf-border rounded-sf flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-sf-text">Sincronización Maestro ERP</span>
                              {account.erp_customer_id ? (
                                <span className="badge bg-sf-success-bg text-sf-success font-mono">
                                  CONECTADO · {account.erp_customer_id}
                                </span>
                              ) : (
                                <span className="badge bg-[#fef1e0] text-[#8c4b02]">
                                  PENDIENTE DE ALTA
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-sf-text-weak mt-1">
                              {account.erp_customer_id
                                ? 'La cuenta está vinculada al ERP. Los pedidos de venta confirmados se reflejan en tiempo real.'
                                : 'Si la negociación avanza, puedes dar de alta esta cuenta en el ERP con un solo clic.'}
                            </p>
                            {(account.client_type === 'CLIENTE_FINAL' || account.client_type === 'CDI') && account.billing_account_name && (
                              <p className="text-xs text-teal-800 bg-teal-50 px-2 py-1 rounded border border-teal-200 mt-2 font-medium">
                                Esta cuenta opera como Cliente Final (Canal Indirecto). Las facturas de sus pedidos se emiten a su Distribuidor asignado: <strong>{account.billing_account_name}</strong>.
                              </p>
                            )}
                          </div>

                          {!account.erp_customer_id && (
                            <button
                              onClick={handlePushToErp}
                              disabled={pushingErp || !account.tax_id}
                              className="btn-brand btn-sm flex-shrink-0"
                              title={!account.tax_id ? 'Se requiere NIF/CIF para sincronizar con ERP' : 'Generar código de cliente en ERP'}
                            >
                              <Send className="w-3 h-3" />
                              {pushingErp ? 'Sincronizando…' : 'Enviar cuenta al ERP'}
                            </button>
                          )}
                        </div>

                        {loadingErp ? (
                          <Spinner label="Consultando telemetría del ERP…" />
                        ) : (
                          <>
                            {/* Scorecards ERP */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              <div className="p-3 bg-white border border-sf-border rounded-sf">
                                <span className="text-[11px] text-sf-text-weak uppercase font-semibold">Facturación YTD</span>
                                <p className="text-lg font-bold text-sf-success mt-1">
                                  {formatCurrency(erpSummary?.total_revenue_ytd || 0)}
                                </p>
                              </div>

                              <div className="p-3 bg-white border border-sf-border rounded-sf">
                                <span className="text-[11px] text-sf-text-weak uppercase font-semibold">Ticket Medio</span>
                                <p className="text-lg font-bold text-sf-brand mt-1">
                                  {formatCurrency(erpSummary?.average_ticket || 0)}
                                </p>
                              </div>

                              <div className="p-3 bg-white border border-sf-border rounded-sf">
                                <span className="text-[11px] text-sf-text-weak uppercase font-semibold">Pedidos Totales</span>
                                <p className="text-lg font-bold text-sf-text mt-1">
                                  {erpSummary?.total_orders_count || 0}
                                </p>
                              </div>

                              <div className="p-3 bg-white border border-sf-border rounded-sf">
                                <span className="text-[11px] text-sf-text-weak uppercase font-semibold">Último Pedido</span>
                                <p className="text-xs font-semibold text-sf-text mt-2">
                                  {erpSummary?.last_order_date ? formatDate(erpSummary.last_order_date) : 'Sin pedidos'}
                                </p>
                              </div>
                            </div>

                            {/* Top Productos Comprados */}
                            {erpSummary?.top_purchased_products?.length > 0 && (
                              <div className="p-3 bg-white border border-sf-border rounded-sf space-y-2">
                                <h4 className="text-xs font-bold text-sf-text flex items-center gap-1.5 uppercase tracking-wider">
                                  <Package className="w-3.5 h-3.5 text-sf-brand" />
                                  Artículos más consumidos por el cliente
                                </h4>
                                <div className="space-y-1.5 pt-1">
                                  {erpSummary.top_purchased_products.map((p, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-sf-border last:border-0">
                                      <span className="text-sf-text font-medium">{p.product}</span>
                                      <div className="flex items-center gap-3">
                                        <span className="text-sf-text-weak">{p.units} uds</span>
                                        <span className="font-semibold text-sf-text">{formatCurrency(p.total_spent)}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Tabla de Pedidos ERP */}
                            <div className="space-y-2">
                              <h4 className="text-xs font-bold text-sf-text flex items-center gap-1.5 uppercase tracking-wider">
                                <Receipt className="w-3.5 h-3.5 text-sf-brand" />
                                Historial de Pedidos de Venta en ERP ({erpSummary?.recent_orders?.length || 0})
                              </h4>

                              {erpSummary?.recent_orders?.length === 0 ? (
                                <p className="text-xs text-sf-text-weak py-6 text-center bg-sf-bg rounded-sf">
                                  No existen pedidos registrados en el ERP para este cliente todavía.
                                </p>
                              ) : (
                                <div className="border border-sf-border rounded-sf overflow-hidden">
                                  <table className="data-table">
                                    <thead>
                                      <tr>
                                        <th>Nº Pedido</th>
                                        <th>Fecha</th>
                                        <th>Cliente / Factura</th>
                                        <th>Estado ERP</th>
                                        <th className="text-right">Importe</th>
                                        <th className="w-16 text-center">Detalle</th>
                                      </tr>
                                    </thead>
                                    <tbody className="text-xs">
                                      {erpSummary.recent_orders.map((ord) => (
                                        <tr key={ord.id}>
                                          <td className="font-mono font-bold text-sf-brand">{ord.order_id}</td>
                                          <td className="text-sf-text-weak">{formatDate(ord.order_date)}</td>
                                          <td>
                                            {ord.billing_account_name ? (
                                              <div className="flex flex-col">
                                                <span className="font-medium text-sf-text">{ord.account_name || account.company_name}</span>
                                                <span className="text-[10px] text-teal-700">Factura a: <strong>{ord.billing_account_name}</strong></span>
                                              </div>
                                            ) : (
                                              <span className="text-sf-text">{ord.account_name || account.company_name}</span>
                                            )}
                                          </td>
                                          <td>
                                            <span
                                              className={`badge text-[10px] ${
                                                ord.status === 'FACTURADO'
                                                  ? 'bg-sf-success-bg text-sf-success'
                                                  : ord.status === 'CONFIRMADO'
                                                  ? 'bg-sf-brand-50 text-sf-brand-dark'
                                                  : 'bg-sf-warning-bg text-[#8c4b02]'
                                              }`}
                                            >
                                              {ord.status}
                                            </span>
                                          </td>
                                          <td className="text-right font-semibold text-sf-text">
                                            {formatCurrency(ord.total_amount)}
                                          </td>
                                          <td className="text-center">
                                            <button
                                              onClick={() => setSelectedOrderLines(ord)}
                                              className="btn-icon-bare w-7 h-7"
                                              title="Ver líneas del pedido"
                                            >
                                              <Eye className="w-3.5 h-3.5 text-sf-brand" />
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Columna lateral: IA + listas relacionadas */}
                <div className="space-y-3">
                  {account.ai_summary && (
                    <div className="card overflow-hidden">
                      <div className="h-1 bg-gradient-to-r from-[#0176d3] via-[#9050e9] to-[#ff538a]" />
                      <div className="card-header">
                        <h3 className="card-title">
                          <Sparkles className="w-4 h-4 text-[#9050e9]" />
                          Resumen IA
                        </h3>
                      </div>
                      <p className="card-body text-[13px] text-sf-text leading-relaxed">{account.ai_summary}</p>
                    </div>
                  )}

                  {/* Oportunidades */}
                  <div className="card">
                    <div className="card-header">
                      <h3 className="card-title">
                        <ObjectIcon type="opportunity" size="sm" />
                        Oportunidades ({account.opportunities?.length || 0})
                      </h3>
                    </div>
                    {account.opportunities?.length === 0 ? (
                      <p className="card-body text-[13px] text-sf-text-weak">Sin oportunidades.</p>
                    ) : (
                      <ul className="px-4 pb-3 divide-y divide-sf-border">
                        {account.opportunities.map((opp) => (
                          <li key={opp.id} className="py-2">
                            <div className="flex items-start justify-between gap-2">
                              <span className="link text-[13px] font-semibold leading-snug">{opp.title}</span>
                              <span
                                className={`badge flex-shrink-0 ${
                                  opp.status === 'GANADA'
                                    ? 'bg-sf-success-bg text-sf-success'
                                    : opp.status === 'PERDIDA'
                                    ? 'bg-sf-error-bg text-sf-error'
                                    : 'bg-sf-brand-50 text-sf-brand-dark'
                                }`}
                              >
                                {OPP_STATUS_LABELS[opp.status] || opp.status}
                              </span>
                            </div>
                            <dl className="mt-1 grid grid-cols-[auto,1fr] gap-x-3 text-xs">
                              <dt className="text-sf-text-weak">Importe:</dt>
                              <dd className="text-sf-text">{formatCurrency(opp.estimated_amount)}</dd>
                              <dt className="text-sf-text-weak">Cierre:</dt>
                              <dd className="text-sf-text">{formatDate(opp.expected_close_date)}</dd>
                            </dl>
                          </li>
                        ))}
                      </ul>
                    )}
                    {openOpps.length > 0 && (
                      <div className="card-footer text-sf-text-weak">
                        Pipeline abierto: <strong className="text-sf-text">{formatCurrency(account.total_pipeline_value)}</strong>
                      </div>
                    )}
                  </div>

                  {/* Tareas */}
                  <div className="card">
                    <div className="card-header flex items-center justify-between">
                      <h3 className="card-title">
                        <ObjectIcon type="task" size="sm" />
                        Tareas ({pendingTasks.length} pendientes)
                      </h3>
                      <button
                        type="button"
                        onClick={handleOpenNewTask}
                        className="btn-neutral btn-sm text-xs flex items-center gap-1"
                        title="Crear nueva tarea para esta cuenta"
                      >
                        <Plus className="w-3 h-3 text-sf-brand" />
                        Nueva Tarea
                      </button>
                    </div>
                    {account.tasks?.length === 0 ? (
                      <p className="card-body text-[13px] text-sf-text-weak">Sin tareas.</p>
                    ) : (
                      <ul className="px-4 pb-3 divide-y divide-sf-border">
                        {account.tasks.map((task) => (
                          <li key={task.id} className="py-2 flex items-start gap-2.5 group">
                            <input
                              type="checkbox"
                              className="checkbox mt-0.5"
                              checked={task.is_completed}
                              onChange={() => handleToggleTask(task.id)}
                              aria-label={`Completar: ${task.title}`}
                            />
                            <div className="min-w-0 flex-1">
                              <p
                                className={`text-[13px] leading-snug ${
                                  task.is_completed ? 'line-through text-sf-text-weaker' : 'text-sf-text'
                                }`}
                              >
                                {task.title}
                              </p>
                              <p className="text-xs text-sf-text-weak flex items-center gap-1 mt-0.5">
                                <Calendar className="w-3 h-3" />
                                {formatDateTime(task.due_date)}
                                {task.priority !== 'NORMAL' && (
                                  <span className="badge bg-sf-warning-bg text-[#8c4b02] ml-1">
                                    {PRIORITY_LABELS[task.priority] || task.priority}
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                              <button
                                type="button"
                                onClick={() => handleOpenEditTask(task)}
                                className="p-1 text-slate-400 hover:text-sf-brand hover:bg-slate-100 rounded transition"
                                title="Modificar tarea"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTask(task.id, task.title)}
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                                title="Eliminar tarea"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </aside>

      {/* Modal de Detalle de Líneas de Pedido ERP */}
      {selectedOrderLines && (
        <Modal
          isOpen={!!selectedOrderLines}
          onClose={() => setSelectedOrderLines(null)}
          title={`Líneas del Pedido ${selectedOrderLines.order_id}`}
          subtitle={`Fecha: ${formatDate(selectedOrderLines.order_date)} · Importe Total: ${formatCurrency(selectedOrderLines.total_amount)}`}
          size="md"
          footer={
            <button onClick={() => setSelectedOrderLines(null)} className="btn-neutral">
              Cerrar
            </button>
          }
        >
          <div className="border border-sf-border rounded-sf overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Descripción del Artículo</th>
                  <th className="text-right">Cantidad</th>
                  <th className="text-right">Precio Unit.</th>
                  <th className="text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {(selectedOrderLines.order_lines || []).map((line, idx) => (
                  <tr key={idx}>
                    <td className="font-mono text-sf-text-weak">{line.sku || '—'}</td>
                    <td className="font-medium text-sf-text">{line.description}</td>
                    <td className="text-right">{line.quantity}</td>
                    <td className="text-right">{formatCurrency(line.unit_price)}</td>
                    <td className="text-right font-bold text-sf-text">{formatCurrency(line.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}

      {/* Modal de Cualificación y Jerarquía de Cliente */}
      {qualifyModalOpen && (
        <Modal
          isOpen={qualifyModalOpen}
          onClose={() => setQualifyModalOpen(false)}
          title="Cualificar Tipología y Jerarquía Comercial"
          subtitle={`Configurar rol de «${account.company_name}» en la cadena de distribución`}
          size="md"
          footer={
            <>
              <button
                type="button"
                onClick={() => setQualifyModalOpen(false)}
                className="btn-neutral"
                disabled={qualifySaving}
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="qualify-account-form"
                className="btn-brand"
                disabled={qualifySaving}
              >
                {qualifySaving ? 'Guardando…' : 'Guardar Tipología'}
              </button>
            </>
          }
        >
          <form id="qualify-account-form" onSubmit={handleSaveQualification} className="space-y-4">
            {qualifyError && (
              <div className="notify-error">
                <AlertCircle className="w-4 h-4 text-sf-error flex-shrink-0 mt-0.5" />
                <span className="text-xs">{qualifyError}</span>
              </div>
            )}

            <div>
              <label className="form-label block mb-2 font-semibold text-sf-text">
                Tipo de Cuenta en el Modelo Nexus CRM
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`border rounded-sf p-3.5 flex flex-col justify-between cursor-pointer transition-all ${
                    qualifyType === 'DISTRIBUIDOR'
                      ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-500/30'
                      : 'border-sf-border bg-white hover:bg-[#fafaf9]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-[13px] text-indigo-900 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-600" />
                      DISTRIBUIDOR
                    </span>
                    <input
                      type="radio"
                      name="client_type"
                      value="DISTRIBUIDOR"
                      checked={qualifyType === 'DISTRIBUIDOR'}
                      onChange={() => setQualifyType('DISTRIBUIDOR')}
                      className="mt-0.5"
                    />
                  </div>
                  <p className="text-xs text-sf-text-weak mt-2 leading-relaxed">
                    <strong>Cliente Factura:</strong> Mayorista o distribuidor logístico que abona las facturas emitidas en el ERP y suministra a los puntos de venta.
                  </p>
                </label>

                <label
                  className={`border rounded-sf p-3.5 flex flex-col justify-between cursor-pointer transition-all ${
                    qualifyType === 'CLIENTE_FINAL'
                      ? 'border-teal-500 bg-teal-50/50 ring-2 ring-teal-500/30'
                      : 'border-sf-border bg-white hover:bg-[#fafaf9]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-[13px] text-teal-900 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-teal-600" />
                      Cliente Final (Canal Indirecto)
                    </span>
                    <input
                      type="radio"
                      name="client_type"
                      value="CLIENTE_FINAL"
                      checked={qualifyType === 'CLIENTE_FINAL'}
                      onChange={() => setQualifyType('CLIENTE_FINAL')}
                      className="mt-0.5"
                    />
                  </div>
                  <p className="text-xs text-sf-text-weak mt-2 leading-relaxed">
                    <strong>Cliente Pedido:</strong> Restaurante, bar, hotel o punto de venta final donde se genera la demanda. Requiere un distribuidor que liquide sus facturas.
                  </p>
                </label>
              </div>
            </div>

            {qualifyType === 'CLIENTE_FINAL' && (
              <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-sf space-y-2 animate-fade-in">
                <label htmlFor="select-distributor" className="form-label block text-teal-950 font-bold">
                  <abbr className="req no-underline" title="obligatorio">*</abbr> Distribuidor Mayorista Asociado (Cliente Factura)
                </label>
                <select
                  id="select-distributor"
                  required
                  value={qualifyDistributorId}
                  onChange={(e) => setQualifyDistributorId(e.target.value)}
                  className="select w-full bg-white font-medium"
                >
                  <option value="">-- Seleccionar Distribuidor Activo --</option>
                  {distributorsList.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.company_name} {d.tax_id ? `(${d.tax_id})` : ''} {d.erp_customer_id ? `[ERP: ${d.erp_customer_id}]` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-teal-800 leading-normal">
                  Los pedidos generados por este Cliente Final vincularán automáticamente al distribuidor seleccionado para la facturación en ERP.
                </p>
              </div>
            )}
          </form>
        </Modal>
      )}

      {/* Modal de Crear Nueva Tarea Manual */}
      {newTaskModalOpen && (
        <Modal
          isOpen={newTaskModalOpen}
          onClose={() => setNewTaskModalOpen(false)}
          title="Crear Nueva Tarea Comercial"
          subtitle={`Asignar acción de seguimiento para «${account?.company_name}»`}
          size="sm"
          footer={
            <>
              <button
                type="button"
                onClick={() => setNewTaskModalOpen(false)}
                className="btn-neutral"
                disabled={newTaskSaving}
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="create-task-form"
                className="btn-brand"
                disabled={newTaskSaving}
              >
                {newTaskSaving ? 'Guardando...' : 'Crear Tarea'}
              </button>
            </>
          }
        >
          <form id="create-task-form" onSubmit={handleCreateTask} className="space-y-4">
            {newTaskError && (
              <div className="notify-error">
                <AlertCircle className="w-4 h-4 text-sf-error flex-shrink-0 mt-0.5" />
                <span className="text-xs">{newTaskError}</span>
              </div>
            )}
            <div>
              <label htmlFor="task-title-input" className="form-label block font-semibold">
                <abbr className="req no-underline" title="obligatorio">*</abbr> Asunto de la tarea
              </label>
              <input
                id="task-title-input"
                type="text"
                required
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Ej.: Llamar para comentar propuesta técnica..."
                className="input w-full"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="task-duedate-input" className="form-label block font-semibold">
                  <abbr className="req no-underline" title="obligatorio">*</abbr> Fecha y hora
                </label>
                <input
                  id="task-duedate-input"
                  type="datetime-local"
                  required
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  className="input w-full"
                />
              </div>
              <div>
                <label htmlFor="task-priority-select" className="form-label block font-semibold">
                  Prioridad
                </label>
                <select
                  id="task-priority-select"
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value)}
                  className="select w-full"
                >
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH_INTENT">Alta (Urgente)</option>
                  <option value="CHURN_ALERT">Alerta de Riesgo</option>
                </select>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal de Modificar Tarea */}
      {editTaskModalOpen && (
        <Modal
          isOpen={editTaskModalOpen}
          onClose={() => setEditTaskModalOpen(false)}
          title="Modificar Tarea Comercial"
          subtitle={`Editar seguimiento para «${account?.company_name}»`}
          size="sm"
          footer={
            <>
              <button
                type="button"
                onClick={() => setEditTaskModalOpen(false)}
                className="btn-neutral"
                disabled={editTaskSaving}
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="edit-task-form"
                className="btn-brand"
                disabled={editTaskSaving}
              >
                {editTaskSaving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </>
          }
        >
          <form id="edit-task-form" onSubmit={handleSaveEditTask} className="space-y-4">
            {editTaskError && (
              <div className="notify-error">
                <AlertCircle className="w-4 h-4 text-sf-error flex-shrink-0 mt-0.5" />
                <span className="text-xs">{editTaskError}</span>
              </div>
            )}
            <div>
              <label htmlFor="edit-task-title-input" className="form-label block font-semibold">
                <abbr className="req no-underline" title="obligatorio">*</abbr> Asunto de la tarea
              </label>
              <input
                id="edit-task-title-input"
                type="text"
                required
                value={editTaskTitle}
                onChange={(e) => setEditTaskTitle(e.target.value)}
                placeholder="Ej.: Llamar para comentar propuesta técnica..."
                className="input w-full"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="edit-task-duedate-input" className="form-label block font-semibold">
                  <abbr className="req no-underline" title="obligatorio">*</abbr> Fecha y hora
                </label>
                <input
                  id="edit-task-duedate-input"
                  type="datetime-local"
                  required
                  value={editTaskDueDate}
                  onChange={(e) => setEditTaskDueDate(e.target.value)}
                  className="input w-full"
                />
              </div>
              <div>
                <label htmlFor="edit-task-priority-select" className="form-label block font-semibold">
                  Prioridad
                </label>
                <select
                  id="edit-task-priority-select"
                  value={editTaskPriority}
                  onChange={(e) => setEditTaskPriority(e.target.value)}
                  className="select w-full"
                >
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH_INTENT">Alta (Urgente)</option>
                  <option value="CHURN_ALERT">Alerta de Riesgo</option>
                </select>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal de Dictado por Voz (Voice-to-CRM) */}
      <VoiceToCRMModal
        isOpen={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        onSuccess={() => {
          setVoiceModalOpen(false);
          loadAccount();
          if (onAccountUpdated) onAccountUpdated();
        }}
        initialAccountId={account?.id}
        initialCompanyName={account?.company_name}
      />
    </div>
  );
}

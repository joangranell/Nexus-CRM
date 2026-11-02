import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { tasksApi, accountsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import InteractionModal from '../components/InteractionModal';
import AccountDrawer from '../components/AccountDrawer';
import VoiceToCRMModal from '../components/VoiceToCRMModal';
import ChurnAlertsWidget from '../components/ChurnAlertsWidget';
import {
  ObjectIcon,
  SubStatusBadge,
  Toast,
  Spinner,
  EmptyState,
  Modal,
} from '../components/ui';
import {
  formatDateTime,
  formatTime,
  formatDate,
  sourceLabel,
  displayName,
  PRIORITY_LABELS,
  STAGE_LABELS,
} from '../utils/format';
import {
  CalendarCheck,
  Clock,
  CircleAlert,
  TriangleAlert,
  Flame,
  PhoneCall,
  User,
  Sparkles,
  RefreshCw,
  Calendar,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  List,
  ChevronLeft,
  ChevronRight,
  Plus,
  AlertCircle,
  Eye,
  Check,
  Pencil,
  Trash2,
  Mic,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function MyDay() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [allTasks, setAllTasks] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // View Mode: 'agenda' (prioritized list) or 'calendar' (interactive calendar)
  const [viewMode, setViewMode] = useState('agenda');
  const [currentMonth, setCurrentMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );

  // Modals & Drawers
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [drawerAccountId, setDrawerAccountId] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [toast, setToast] = useState(null);

  // Calendar specific task interaction modals
  const [selectedTask, setSelectedTask] = useState(null);
  const [dayDetailModalOpen, setDayDetailModalOpen] = useState(false);
  const [dayDetailDate, setDayDetailDate] = useState(null);

  // New Task Modal
  const [newTaskModalOpen, setNewTaskModalOpen] = useState(false);
  const [newTaskAccountId, setNewTaskAccountId] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('NORMAL');
  const [newTaskSaving, setNewTaskSaving] = useState(false);
  const [newTaskError, setNewTaskError] = useState('');

  // Edit Task Modal
  const [editTaskModalOpen, setEditTaskModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskDueDate, setEditTaskDueDate] = useState('');
  const [editTaskPriority, setEditTaskPriority] = useState('NORMAL');
  const [editTaskSaving, setEditTaskSaving] = useState(false);
  const [editTaskError, setEditTaskError] = useState('');

  const loadMyDay = useCallback(async () => {
    setLoading(true);
    try {
      const [resMyDay, resTasks, resAccounts] = await Promise.all([
        tasksApi.getMyDay(),
        tasksApi.getTasks(),
        accountsApi.getAccounts({ limit: 150 }),
      ]);
      setData(resMyDay.data);
      setAllTasks(resTasks.data || []);
      setAccounts(resAccounts.data || []);
    } catch (e) {
      console.error('Error loading MyDay:', e);
      setToast({
        type: 'error',
        title: 'Error de carga',
        text: 'No se ha podido cargar la agenda comercial de hoy.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMyDay();
  }, [loadMyDay, user?.id]);

  const handleToggleTask = async (taskId) => {
    try {
      await tasksApi.toggleTask(taskId);
      await loadMyDay();
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask((prev) => (prev ? { ...prev, is_completed: !prev.is_completed } : null));
      }
      setToast({
        type: 'success',
        title: 'Tarea actualizada',
        text: 'El estado de la tarea se ha modificado correctamente.',
      });
    } catch (e) {
      console.error(e);
      setToast({
        type: 'error',
        title: 'Error',
        text: 'No se pudo actualizar el estado de la tarea.',
      });
    }
  };

  const handleInteractionSuccess = (result) => {
    loadMyDay();
    let title = 'Actividad Guardada';
    if (result.promoted_to_potencial) title = '¡Promocionado a Potencial!';
    else if (result.promoted_to_prospecto) title = '¡Cualificado a Prospecto!';
    setToast({
      type: 'success',
      title,
      text: result.message || 'La actividad comercial ha sido registrada correctamente.',
    });
  };

  const openAccount = (accountId) => {
    setDrawerAccountId(accountId);
    setIsDrawerOpen(true);
  };

  // Calendar Helpers
  const prevMonth = () => {
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  };
  const goToToday = () => {
    setCurrentMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  };

  const monthTitle = useMemo(() => {
    return currentMonth.toLocaleDateString('es-ES', {
      month: 'long',
      year: 'numeric',
    });
  }, [currentMonth]);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Mon = 0
    const lastDate = new Date(year, month + 1, 0).getDate();
    const prevLastDate = new Date(year, month, 0).getDate();

    const days = [];
    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevLastDate - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({
        date: d,
        isCurrentMonth: false,
        dateKey: key,
      });
    }
    // Current month days
    for (let i = 1; i <= lastDate; i++) {
      const d = new Date(year, month, i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({
        date: d,
        isCurrentMonth: true,
        dateKey: key,
      });
    }
    // Next month padding
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({
        date: d,
        isCurrentMonth: false,
        dateKey: key,
      });
    }
    return days;
  }, [currentMonth]);

  const tasksByDate = useMemo(() => {
    const map = {};
    (allTasks || []).forEach((t) => {
      if (!t.due_date) return;
      const d = new Date(t.due_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [allTasks]);

  const todayKey = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const handleOpenNewTaskForDate = (dateObj) => {
    const target = dateObj ? new Date(dateObj) : new Date();
    target.setHours(10, 0, 0, 0);
    const tzOffset = target.getTimezoneOffset() * 60000;
    const localISOTime = new Date(target.getTime() - tzOffset).toISOString().slice(0, 16);

    setNewTaskAccountId(accounts[0]?.id ? String(accounts[0].id) : '');
    setNewTaskTitle('');
    setNewTaskDueDate(localISOTime);
    setNewTaskPriority('NORMAL');
    setNewTaskError('');
    setNewTaskModalOpen(true);
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskDueDate) {
      setNewTaskError('El asunto y la fecha de vencimiento son obligatorios.');
      return;
    }
    setNewTaskSaving(true);
    setNewTaskError('');
    try {
      await tasksApi.createTask({
        account_id: newTaskAccountId ? parseInt(newTaskAccountId, 10) : null,
        title: newTaskTitle.trim(),
        due_date: new Date(newTaskDueDate).toISOString(),
        priority: newTaskPriority,
      });
      setNewTaskModalOpen(false);
      await loadMyDay();
      setToast({
        type: 'success',
        title: 'Tarea creada',
        text: 'La nueva tarea ha sido programada con éxito en la agenda.',
      });
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
    if (!task) return;
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
      setEditTaskError('El asunto y la fecha de vencimiento son obligatorios.');
      return;
    }
    setEditTaskSaving(true);
    setEditTaskError('');
    try {
      const res = await tasksApi.updateTask(editingTaskId, {
        title: editTaskTitle.trim(),
        due_date: new Date(editTaskDueDate).toISOString(),
        priority: editTaskPriority,
      });
      setEditTaskModalOpen(false);
      await loadMyDay();
      if (selectedTask && selectedTask.id === editingTaskId) {
        setSelectedTask(res.data);
      }
      setToast({
        type: 'success',
        title: 'Tarea modificada',
        text: 'La tarea se ha modificado correctamente.',
      });
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
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(null);
      }
      await loadMyDay();
      setToast({
        type: 'success',
        title: 'Tarea eliminada',
        text: 'La tarea ha sido eliminada con éxito.',
      });
    } catch (err) {
      console.error('Error deleting task:', err);
      setToast({
        type: 'error',
        title: 'Error al eliminar',
        text: err.response?.data?.detail || 'No se pudo eliminar la tarea.',
      });
    }
  };

  const todayDateString = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="p-3 space-y-3 max-w-[1600px] mx-auto animate-fade-in">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* ================= Cabecera Lightning Home ================= */}
      <section className="page-header">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ObjectIcon type="home" />
            <div>
              <p className="page-header-eyebrow capitalize">{todayDateString}</p>
              <h1 className="page-header-title">
                Buenos días, {displayName(user?.name) || 'Comercial'}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Conmutador de Vista: Agenda vs Calendario */}
            <div className="flex items-center bg-[#f3f3f3] p-0.5 rounded-sf border border-sf-border text-xs">
              <button
                type="button"
                onClick={() => setViewMode('agenda')}
                className={`px-3 py-1 rounded transition flex items-center gap-1.5 ${
                  viewMode === 'agenda'
                    ? 'bg-white font-bold text-sf-brand shadow-xs'
                    : 'text-sf-text-weak hover:text-sf-text'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                Agenda
              </button>
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1 rounded transition flex items-center gap-1.5 ${
                  viewMode === 'calendar'
                    ? 'bg-white font-bold text-sf-brand shadow-xs'
                    : 'text-sf-text-weak hover:text-sf-text'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Calendario
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleOpenNewTaskForDate(new Date())}
              className="btn-neutral"
              title="Programar nueva tarea"
            >
              <Plus className="w-3.5 h-3.5 text-sf-brand" />
              Nueva Tarea
            </button>

            <button
              type="button"
              id="my-day-voice-crm-btn"
              onClick={() => setVoiceModalOpen(true)}
              className="btn-neutral inline-flex items-center gap-1.5 text-slate-800 hover:text-sf-brand hover:border-sf-brand"
              title="Dictado por voz post-visita con extracción automática de oportunidad"
            >
              <Mic className="w-3.5 h-3.5 text-rose-500" />
              <span>Dictado de Visita (IA)</span>
            </button>

            <button
              onClick={loadMyDay}
              className="btn-neutral"
              title="Actualizar agenda"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
            <Link to="/" className="btn-brand">
              <TrendingUp className="w-3.5 h-3.5" />
              Ver embudo completo
            </Link>
          </div>
        </div>

        <p className="page-header-meta mt-2">
          Agenda comercial diaria priorizada: seguimientos comprometidos, alertas de alta intención y prospección de leads.
        </p>
      </section>

      {/* ================= Widget Alertas Predictivas de Fuga ERP ================= */}
      <ChurnAlertsWidget
        onSelectAccount={(accId) => {
          setDrawerAccountId(accId);
          setIsDrawerOpen(true);
        }}
        onTaskCreated={loadMyDay}
      />

      {/* ================= Indicadores Clave / Scorecard ================= */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Urgentes */}
        <div className="card p-4">
          <div className="flex items-center justify-between text-xs text-sf-text-weak font-semibold uppercase">
            <span>Urgentes / Alta Intención</span>
            <Flame className="w-4 h-4 text-sf-error" />
          </div>
          <p className="text-[32px] leading-none font-light text-sf-error mt-2">
            {data?.stats?.urgent_count || 0}
          </p>
          <p className="text-xs text-sf-text-weaker mt-2">Acciones críticas prioritarias</p>
        </div>

        {/* Para Hoy */}
        <div className="card p-4">
          <div className="flex items-center justify-between text-xs text-sf-text-weak font-semibold uppercase">
            <span>Para Hoy</span>
            <Clock className="w-4 h-4 text-sf-brand" />
          </div>
          <p className="text-[32px] leading-none font-light text-sf-text mt-2">
            {data?.stats?.today_count || 0}
          </p>
          <p className="text-xs text-sf-text-weaker mt-2">Seguimientos programados</p>
        </div>

        {/* Vencidas */}
        <div className="card p-4">
          <div className="flex items-center justify-between text-xs text-sf-text-weak font-semibold uppercase">
            <span>Vencidas</span>
            <TriangleAlert className="w-4 h-4 text-sf-warning" />
          </div>
          <p className="text-[32px] leading-none font-light text-sf-warning mt-2">
            {data?.stats?.overdue_count || 0}
          </p>
          <p className="text-xs text-sf-text-weaker mt-2">Pendientes de fecha anterior</p>
        </div>

        {/* Bolsa Común Leads */}
        <div className="card p-4">
          <div className="flex items-center justify-between text-xs text-sf-text-weak font-semibold uppercase">
            <span>Bolsa de Leads</span>
            <ObjectIcon type="lead" size="sm" />
          </div>
          <p className="text-[32px] leading-none font-light text-sf-brand-dark mt-2">
            {data?.stats?.leads_pool_count || 0}
          </p>
          <p className="text-xs text-sf-text-weaker mt-2">Listos para primer contacto</p>
        </div>
      </section>

      {/* ================= Contenido Principal: Agenda o Calendario ================= */}
      {loading && !data ? (
        <div className="card">
          <Spinner label="Cargando agenda de hoy..." />
        </div>
      ) : viewMode === 'calendar' ? (
        /* ================= VISTA CALENDARIO MENSUAL INTERACTIVO ================= */
        <div className="card overflow-hidden space-y-0 shadow-card">
          {/* Cabecera del Calendario */}
          <div className="card-header bg-[#fafaf9] border-b border-sf-border flex flex-col md:flex-row md:items-center justify-between gap-3 p-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={prevMonth}
                className="btn-neutral btn-sm"
                title="Mes anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={goToToday}
                className="btn-neutral btn-sm font-semibold"
                title="Ir al mes actual"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="btn-neutral btn-sm"
                title="Mes siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <h2 className="text-base font-bold text-sf-text ml-2 capitalize flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sf-brand" />
                {monthTitle}
              </h2>
            </div>

            {/* Leyenda y botón de acción */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-3 text-sf-text-weak bg-white px-2.5 py-1 rounded border border-sf-border">
                <span className="flex items-center gap-1 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  Urgente / Alta Intención
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  Programada
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  Vencida
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Completada
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleOpenNewTaskForDate(new Date())}
                className="btn-brand btn-sm flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Nueva Tarea
              </button>
            </div>
          </div>

          {/* Días de la semana */}
          <div className="grid grid-cols-7 border-b border-sf-border bg-slate-50 text-[11px] font-bold text-sf-text-weak uppercase tracking-wider text-center py-2">
            <div>Lunes</div>
            <div>Martes</div>
            <div>Miércoles</div>
            <div>Jueves</div>
            <div>Viernes</div>
            <div>Sábado</div>
            <div>Domingo</div>
          </div>

          {/* Cuadrícula de 7 columnas */}
          <div className="grid grid-cols-7 divide-x divide-y divide-sf-border bg-sf-border">
            {calendarDays.map((d, index) => {
              const isToday = d.dateKey === todayKey;
              const dayTasks = tasksByDate[d.dateKey] || [];
              const maxVisible = 3;
              const visibleTasks = dayTasks.slice(0, maxVisible);
              const extraCount = dayTasks.length - maxVisible;

              return (
                <div
                  key={index}
                  className={`min-h-[115px] p-1.5 flex flex-col justify-between transition group ${
                    d.isCurrentMonth ? 'bg-white' : 'bg-[#fafaf9]/75 text-slate-400'
                  } hover:bg-slate-50/70`}
                >
                  <div>
                    {/* Cabecera del día */}
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-xs font-semibold ${
                          isToday
                            ? 'w-6 h-6 rounded-full bg-sf-brand text-white flex items-center justify-center font-bold shadow-xs'
                            : d.isCurrentMonth
                            ? 'text-sf-text'
                            : 'text-slate-400'
                        }`}
                      >
                        {d.date.getDate()}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleOpenNewTaskForDate(d.date)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-sf-brand-50 text-sf-brand transition"
                        title={`Programar tarea para el ${d.date.toLocaleDateString()}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Lista de píldoras de tareas */}
                    <div className="space-y-1">
                      {visibleTasks.map((task) => {
                        const isOverdue = !task.is_completed && d.dateKey < todayKey;
                        const isUrgent = task.priority === 'HIGH_INTENT';

                        let badgeStyle = 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
                        if (task.is_completed) {
                          badgeStyle = 'bg-slate-100 text-slate-400 border-slate-200 line-through';
                        } else if (isUrgent) {
                          badgeStyle = 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 font-bold';
                        } else if (isOverdue) {
                          badgeStyle = 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 font-semibold';
                        }

                        return (
                          <button
                            key={task.id}
                            type="button"
                            onClick={() => setSelectedTask(task)}
                            className={`w-full text-left px-1.5 py-1 rounded text-[11px] leading-tight border truncate transition block ${badgeStyle}`}
                            title={`${task.title} (${task.account_company_name || 'Sin cuenta'})`}
                          >
                            <span className="font-mono text-[10px] mr-1 opacity-80">
                              {task.due_date ? formatTime(task.due_date) : ''}
                            </span>
                            {isUrgent && <span className="mr-0.5">🔥</span>}
                            <span>{task.title}</span>
                          </button>
                        );
                      })}

                      {extraCount > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setDayDetailDate(d.date);
                            setDayDetailModalOpen(true);
                          }}
                          className="text-[10px] font-bold text-sf-brand hover:underline block text-left px-1 mt-0.5"
                        >
                          +{extraCount} más...
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ================= VISTA AGENDA / LISTA (2 COLUMNAS) ================= */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* ================= Columna Izquierda: Asistente & Tareas (7 Cols) ================= */}
          <div className="lg:col-span-7 space-y-3">
            {/* Salesforce Assistant Card (Urgentes) */}
            {data?.urgent_tasks?.length > 0 && (
              <div className="card border-sf-error/30 overflow-hidden">
                <div className="h-1 bg-sf-error" />
                <div className="card-header bg-[#feded8]/30">
                  <h3 className="card-title text-sf-error">
                    <Flame className="w-4 h-4 text-sf-error" />
                    Asistente de ventas · Alertas de alta intención ({data.urgent_tasks.length})
                  </h3>
                </div>
                <div className="divide-y divide-sf-border px-4 py-1">
                  {data.urgent_tasks.map((task) => (
                    <div key={task.id} className="py-3 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          className="checkbox mt-0.5"
                          checked={task.is_completed}
                          onChange={() => handleToggleTask(task.id)}
                          title="Marcar como completada"
                        />
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-sf-text leading-snug">
                            {task.title}
                          </p>
                          {task.account_company_name && (
                            <button
                              onClick={() => openAccount(task.account_id)}
                              className="link text-xs block text-left mt-0.5"
                            >
                              {task.account_company_name}
                            </button>
                          )}
                          <span className="text-xs text-sf-error font-medium flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3" />
                            Vence: {formatDateTime(task.due_date)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEditTask(task)}
                          className="p-1.5 text-slate-400 hover:text-sf-brand hover:bg-slate-100 rounded transition"
                          title="Modificar tarea"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(task.id, task.title)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                          title="Eliminar tarea"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedAccount({
                              id: task.account_id,
                              company_name: task.account_company_name,
                              lifecycle_stage: 'POTENCIAL',
                            });
                          }}
                          className="btn-brand btn-sm"
                        >
                          <PhoneCall className="w-3 h-3" />
                          Gestionar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Agenda para hoy */}
            <div className="card">
              <div className="card-header border-b border-sf-border">
                <h3 className="card-title">
                  <Clock className="w-4 h-4 text-sf-brand" />
                  Seguimientos comprometidos para hoy ({data?.today_tasks?.length || 0})
                </h3>
              </div>

              {data?.today_tasks?.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-[13px] text-sf-text-weak">
                    No tiene seguimientos específicos programados para hoy.
                  </p>
                  <p className="text-xs text-sf-text-weaker mt-1">
                    Aproveche para contactar leads disponibles en la bolsa común.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-sf-border px-4 py-1">
                  {data?.today_tasks?.map((task) => (
                    <div key={task.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          className="checkbox"
                          checked={task.is_completed}
                          onChange={() => handleToggleTask(task.id)}
                          title="Marcar como completada"
                        />
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-sf-text truncate leading-snug">
                            {task.title}
                          </p>
                          {task.account_company_name && (
                            <button
                              onClick={() => openAccount(task.account_id)}
                              className="link text-xs block text-left"
                            >
                              {task.account_company_name}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-xs text-sf-text-weaker font-mono mr-1">
                          {formatTime(task.due_date)}
                        </span>
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
                        {task.account_id && (
                          <button
                            onClick={() => {
                              setSelectedAccount({
                                id: task.account_id,
                                company_name: task.account_company_name,
                                lifecycle_stage: 'POTENCIAL',
                              });
                            }}
                            className="btn-neutral btn-sm"
                            title="Registrar contacto"
                          >
                            <PhoneCall className="w-3 h-3" />
                            Contactar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tareas Vencidas */}
            {data?.overdue_tasks?.length > 0 && (
              <div className="card border-sf-warning/40">
                <div className="card-header bg-sf-warning-bg">
                  <h3 className="card-title text-[#8c4b02]">
                    <TriangleAlert className="w-4 h-4 text-sf-warning" />
                    Seguimientos vencidos ({data.overdue_tasks.length})
                  </h3>
                </div>
                <div className="divide-y divide-sf-border px-4 py-1">
                  {data.overdue_tasks.map((task) => (
                    <div key={task.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          className="checkbox"
                          checked={task.is_completed}
                          onChange={() => handleToggleTask(task.id)}
                          title="Marcar como completada"
                        />
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-sf-text truncate leading-snug">
                            {task.title}
                          </p>
                          {task.account_company_name && (
                            <button
                              onClick={() => openAccount(task.account_id)}
                              className="link text-xs block text-left"
                            >
                              {task.account_company_name}
                            </button>
                          )}
                          <span className="text-xs text-sf-warning font-medium block">
                            Venció el {formatDate(task.due_date)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
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
                        {task.account_id && (
                          <button
                            onClick={() => {
                              setSelectedAccount({
                                id: task.account_id,
                                company_name: task.account_company_name,
                                lifecycle_stage: 'POTENCIAL',
                              });
                            }}
                            className="btn-neutral btn-sm flex-shrink-0"
                          >
                            <PhoneCall className="w-3 h-3" />
                            Resolver
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Próximas tareas */}
            {data?.upcoming_tasks?.length > 0 && (
              <div className="card">
                <div className="card-header border-b border-sf-border">
                  <h3 className="card-title">
                    <Calendar className="w-4 h-4 text-sf-text-weak" />
                    Próximos seguimientos en agenda ({data.upcoming_tasks.length})
                  </h3>
                </div>
                <div className="divide-y divide-sf-border px-4 py-1">
                  {data.upcoming_tasks.slice(0, 5).map((task) => (
                    <div key={task.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          className="checkbox"
                          checked={task.is_completed}
                          onChange={() => handleToggleTask(task.id)}
                          title="Marcar como completada"
                        />
                        <div className="min-w-0">
                          <p className="text-[13px] text-sf-text truncate leading-snug">
                            {task.title}
                          </p>
                          {task.account_company_name && (
                            <button
                              onClick={() => openAccount(task.account_id)}
                              className="link text-xs block text-left"
                            >
                              {task.account_company_name}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-xs text-sf-text-weak whitespace-nowrap mr-1">
                          {formatDate(task.due_date)}
                        </span>
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
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ================= Columna Derecha: Prospección Bolsa Común (5 Cols) ================= */}
          <div className="lg:col-span-5 space-y-3">
            <div className="card overflow-hidden">
              <div className="h-1 bg-obj-lead" />
              <div className="card-header bg-[#fafaf9] border-b border-sf-border">
                <div>
                  <h3 className="card-title">
                    <ObjectIcon type="lead" size="sm" />
                    Bolsa común de leads
                  </h3>
                  <p className="text-xs text-sf-text-weak mt-0.5">
                    Leads cualificables para prospección hoy
                  </p>
                </div>
                <span className="badge-lightest">
                  {data?.leads_to_contact?.length || 0} listos
                </span>
              </div>

              <div className="p-3 bg-sf-brand-50 border-b border-sf-border text-xs text-sf-brand-darker flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-sf-brand flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Regla de negocio:</strong> Una llamada efectiva o email directo cualifica el Lead automáticamente a <strong className="text-sf-brand">Prospecto</strong> y lo asigna a su cartera. Al registrar una oportunidad cuantificada (con importe y fecha estimada de cierre) pasará a <strong className="text-sf-brand">Potencial</strong>.
                </span>
              </div>

              <div className="p-3">
                {data?.leads_to_contact?.length === 0 ? (
                  <p className="text-[13px] text-sf-text-weak text-center py-8">
                    ¡Bolsa común al día! No hay leads pendientes de prospección.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {data.leads_to_contact.map((lead) => (
                      <article
                        key={lead.id}
                        className="p-3 bg-white border border-sf-border rounded-sf shadow-card hover:border-sf-brand-light transition"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button
                            onClick={() => openAccount(lead.id)}
                            className="link text-[13px] font-semibold text-left leading-snug truncate"
                          >
                            {lead.company_name}
                          </button>
                          <SubStatusBadge value={lead.sub_status} />
                        </div>

                        <dl className="mt-1.5 grid grid-cols-[auto,1fr] gap-x-2 gap-y-0.5 text-xs">
                          {lead.contact_name && (
                            <>
                              <dt className="text-sf-text-weak">Contacto:</dt>
                              <dd className="text-sf-text truncate">{lead.contact_name}</dd>
                            </>
                          )}
                          {lead.phone && (
                            <>
                              <dt className="text-sf-text-weak">Teléfono:</dt>
                              <dd className="text-sf-text font-mono truncate">
                                <a href={`tel:${lead.phone}`} className="link">
                                  {lead.phone}
                                </a>
                              </dd>
                            </>
                          )}
                          <dt className="text-sf-text-weak">Origen:</dt>
                          <dd className="text-sf-text truncate">{sourceLabel(lead.source)}</dd>
                        </dl>

                        {lead.ai_summary && (
                          <p className="mt-2 text-xs text-sf-text-weak line-clamp-2 bg-[#f9f9f9] border border-sf-border p-2 rounded-sf flex gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-[#9050e9] flex-shrink-0 mt-0.5" />
                            <span>{lead.ai_summary}</span>
                          </p>
                        )}

                        <div className="mt-3 pt-2.5 border-t border-sf-border flex items-center justify-between">
                          <span className="text-xs text-sf-text-weaker">
                            Alta: {formatDate(lead.created_at)}
                          </span>
                          <button
                            onClick={() => {
                              setSelectedAccount({
                                id: lead.id,
                                company_name: lead.company_name,
                                contact_name: lead.contact_name,
                                phone: lead.phone,
                                lifecycle_stage: 'LEAD',
                              });
                            }}
                            className="btn-brand btn-sm"
                          >
                            <PhoneCall className="w-3 h-3" />
                            Llamar ahora
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= Ficha de Cuenta (Drawer) ================= */}
      <AccountDrawer
        accountId={drawerAccountId}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onOpenInteractionModal={(acc) => {
          setIsDrawerOpen(false);
          setSelectedAccount(acc);
        }}
        onAccountUpdated={loadMyDay}
      />

      {/* ================= Modal de Interacción ================= */}
      <InteractionModal
        account={selectedAccount}
        isOpen={!!selectedAccount}
        onClose={() => setSelectedAccount(null)}
        onSuccess={handleInteractionSuccess}
      />

      {/* ================= Modal de Dictado de Visita (Voice-to-CRM) ================= */}
      <VoiceToCRMModal
        isOpen={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        onSuccess={() => {
          setVoiceModalOpen(false);
          loadMyDay();
        }}
        accounts={accounts}
      />

      {/* ================= Modal de Detalle de Tarea (Calendario) ================= */}
      {selectedTask && (
        <Modal
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          title="Detalle del Seguimiento Comercial"
          subtitle={`Programado para ${formatDateTime(selectedTask.due_date)}`}
          size="sm"
          footer={
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={() => handleToggleTask(selectedTask.id)}
                className={`btn-sm font-semibold flex items-center gap-1 ${
                  selectedTask.is_completed
                    ? 'btn-neutral'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                {selectedTask.is_completed ? 'Reabrir tarea' : 'Marcar como Hecha'}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenEditTask(selectedTask)}
                  className="btn-neutral btn-sm flex items-center gap-1 text-slate-700"
                  title="Modificar tarea"
                >
                  <Pencil className="w-3.5 h-3.5 text-sf-brand" />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteTask(selectedTask.id, selectedTask.title)}
                  className="btn-neutral btn-sm flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  title="Eliminar tarea"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Eliminar
                </button>
                {selectedTask.account_id && (
                  <button
                    type="button"
                    onClick={() => {
                      const accId = selectedTask.account_id;
                      setSelectedTask(null);
                      openAccount(accId);
                    }}
                    className="btn-neutral btn-sm"
                  >
                    Ficha 360º
                  </button>
                )}
                {selectedTask.account_id && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAccount({
                        id: selectedTask.account_id,
                        company_name: selectedTask.account_company_name,
                        lifecycle_stage: 'POTENCIAL',
                      });
                      setSelectedTask(null);
                    }}
                    className="btn-brand btn-sm flex items-center gap-1"
                  >
                    <PhoneCall className="w-3 h-3" />
                    Contactar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="btn-neutral btn-sm"
                >
                  Cerrar
                </button>
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <span className="text-xs font-semibold text-sf-text-weak uppercase block mb-1">
                Asunto del seguimiento
              </span>
              <p className="text-sm font-bold text-sf-text">{selectedTask.title}</p>
            </div>

            {selectedTask.account_company_name && (
              <div className="p-3 bg-sf-bg rounded-sf border border-sf-border">
                <span className="text-xs text-sf-text-weak block">Cuenta vinculada</span>
                <span className="text-sm font-semibold text-sf-brand">
                  {selectedTask.account_company_name}
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-sf-text-weak block">Prioridad</span>
                <span
                  className={`inline-block mt-0.5 px-2 py-0.5 rounded font-bold ${
                    selectedTask.priority === 'HIGH_INTENT'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  {PRIORITY_LABELS[selectedTask.priority] || selectedTask.priority}
                </span>
              </div>

              <div>
                <span className="text-sf-text-weak block">Estado</span>
                <span
                  className={`inline-block mt-0.5 px-2 py-0.5 rounded font-bold ${
                    selectedTask.is_completed
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {selectedTask.is_completed ? 'Completada' : 'Pendiente'}
                </span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ================= Modal de Todas las Tareas del Día ================= */}
      {dayDetailModalOpen && dayDetailDate && (
        <Modal
          isOpen={dayDetailModalOpen}
          onClose={() => setDayDetailModalOpen(false)}
          title={`Seguimientos del ${formatDate(dayDetailDate)}`}
          subtitle={`${tasksByDate[`${dayDetailDate.getFullYear()}-${String(dayDetailDate.getMonth() + 1).padStart(2, '0')}-${String(dayDetailDate.getDate()).padStart(2, '0')}`]?.length || 0} tareas programadas`}
          size="md"
          footer={
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={() => {
                  setDayDetailModalOpen(false);
                  handleOpenNewTaskForDate(dayDetailDate);
                }}
                className="btn-brand btn-sm flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Nueva Tarea este día
              </button>
              <button
                type="button"
                onClick={() => setDayDetailModalOpen(false)}
                className="btn-neutral btn-sm"
              >
                Cerrar
              </button>
            </div>
          }
        >
          <div className="divide-y divide-sf-border max-h-[380px] overflow-y-auto">
            {(tasksByDate[`${dayDetailDate.getFullYear()}-${String(dayDetailDate.getMonth() + 1).padStart(2, '0')}-${String(dayDetailDate.getDate()).padStart(2, '0')}`] || []).map((t) => (
              <div key={t.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={t.is_completed}
                    onChange={() => handleToggleTask(t.id)}
                  />
                  <div className="min-w-0">
                    <p className={`font-semibold ${t.is_completed ? 'line-through text-slate-400' : 'text-sf-text'}`}>
                      {t.title}
                    </p>
                    {t.account_company_name && (
                      <span className="text-sf-text-weak block text-[11px]">
                        {t.account_company_name} · {formatTime(t.due_date)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenEditTask(t)}
                    className="p-1 text-slate-400 hover:text-sf-brand hover:bg-slate-100 rounded transition"
                    title="Modificar tarea"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTask(t.id, t.title)}
                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                    title="Eliminar tarea"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  {t.account_id && (
                    <button
                      type="button"
                      onClick={() => {
                        setDayDetailModalOpen(false);
                        openAccount(t.account_id);
                      }}
                      className="btn-neutral btn-sm text-[11px]"
                    >
                      Ficha
                    </button>
                  )}
                  {t.account_id && (
                    <button
                      type="button"
                      onClick={() => {
                        setDayDetailModalOpen(false);
                        setSelectedAccount({
                          id: t.account_id,
                          company_name: t.account_company_name,
                          lifecycle_stage: 'POTENCIAL',
                        });
                      }}
                      className="btn-brand btn-sm text-[11px]"
                    >
                      Contactar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* ================= Modal de Crear Nueva Tarea ================= */}
      {newTaskModalOpen && (
        <Modal
          isOpen={newTaskModalOpen}
          onClose={() => setNewTaskModalOpen(false)}
          title="Programar Nueva Tarea Comercial"
          subtitle="Añadir acción o llamada de seguimiento a la agenda"
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
                form="myday-new-task-form"
                className="btn-brand"
                disabled={newTaskSaving}
              >
                {newTaskSaving ? 'Guardando...' : 'Crear Tarea'}
              </button>
            </>
          }
        >
          <form id="myday-new-task-form" onSubmit={handleCreateTask} className="space-y-4">
            {newTaskError && (
              <div className="notify-error">
                <AlertCircle className="w-4 h-4 text-sf-error flex-shrink-0 mt-0.5" />
                <span className="text-xs">{newTaskError}</span>
              </div>
            )}

            <div>
              <label htmlFor="modal-task-account" className="form-label block font-semibold">
                Cuenta asociada
              </label>
              <select
                id="modal-task-account"
                value={newTaskAccountId}
                onChange={(e) => setNewTaskAccountId(e.target.value)}
                className="select w-full"
              >
                <option value="">-- Sin cuenta específica --</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.company_name} ({STAGE_LABELS[acc.lifecycle_stage] || acc.lifecycle_stage})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="modal-task-title" className="form-label block font-semibold">
                <abbr className="req no-underline" title="obligatorio">*</abbr> Asunto de la tarea
              </label>
              <input
                id="modal-task-title"
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
                <label htmlFor="modal-task-duedate" className="form-label block font-semibold">
                  <abbr className="req no-underline" title="obligatorio">*</abbr> Fecha y hora
                </label>
                <input
                  id="modal-task-duedate"
                  type="datetime-local"
                  required
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  className="input w-full"
                />
              </div>

              <div>
                <label htmlFor="modal-task-priority" className="form-label block font-semibold">
                  Prioridad
                </label>
                <select
                  id="modal-task-priority"
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value)}
                  className="select w-full"
                >
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH_INTENT">Alta (Urgente 🔥)</option>
                  <option value="CHURN_ALERT">Alerta de Riesgo</option>
                </select>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* ================= Modal de Editar Tarea ================= */}
      {editTaskModalOpen && (
        <Modal
          isOpen={editTaskModalOpen}
          onClose={() => setEditTaskModalOpen(false)}
          title="Modificar Tarea Comercial"
          subtitle="Actualizar nombre, fecha de vencimiento o prioridad"
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
                form="myday-edit-task-form"
                className="btn-brand"
                disabled={editTaskSaving}
              >
                {editTaskSaving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </>
          }
        >
          <form id="myday-edit-task-form" onSubmit={handleSaveEditTask} className="space-y-4">
            {editTaskError && (
              <div className="notify-error">
                <AlertCircle className="w-4 h-4 text-sf-error flex-shrink-0 mt-0.5" />
                <span className="text-xs">{editTaskError}</span>
              </div>
            )}

            <div>
              <label htmlFor="modal-edit-task-title" className="form-label block font-semibold">
                <abbr className="req no-underline" title="obligatorio">*</abbr> Asunto de la tarea
              </label>
              <input
                id="modal-edit-task-title"
                type="text"
                required
                value={editTaskTitle}
                onChange={(e) => setEditTaskTitle(e.target.value)}
                placeholder="Asunto de la tarea..."
                className="input w-full"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="modal-edit-task-duedate" className="form-label block font-semibold">
                  <abbr className="req no-underline" title="obligatorio">*</abbr> Fecha y hora
                </label>
                <input
                  id="modal-edit-task-duedate"
                  type="datetime-local"
                  required
                  value={editTaskDueDate}
                  onChange={(e) => setEditTaskDueDate(e.target.value)}
                  className="input w-full"
                />
              </div>

              <div>
                <label htmlFor="modal-edit-task-priority" className="form-label block font-semibold">
                  Prioridad
                </label>
                <select
                  id="modal-edit-task-priority"
                  value={editTaskPriority}
                  onChange={(e) => setEditTaskPriority(e.target.value)}
                  className="select w-full"
                >
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH_INTENT">Alta (Urgente 🔥)</option>
                  <option value="CHURN_ALERT">Alerta de Riesgo</option>
                </select>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

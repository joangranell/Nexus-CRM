import React, { useState, useEffect } from 'react';
import { aiApi } from '../services/api';
import {
  TrendingDown,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Calendar,
  Receipt,
  Mail,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { Spinner } from './ui';
import { formatCurrency } from '../utils/format';

export default function ChurnAlertsWidget({ onSelectAccount, onTaskCreated }) {
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [creatingTaskFor, setCreatingTaskFor] = useState(null);
  const [createdTasksMap, setCreatedTasksMap] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    loadRisks();
  }, []);

  const loadRisks = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await aiApi.getChurnRisks();
      setRisks(res.data || []);
      if (res.data && res.data.length > 0) {
        setExpandedId(res.data[0].account_id);
      }
    } catch (e) {
      // If AI is disabled or 400, handle gracefully
      if (e.response?.status === 400) {
        setRisks([]);
      } else {
        console.error(e);
        setError('No se pudieron consultar las alertas de churn.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (item) => {
    setCreatingTaskFor(item.account_id);
    try {
      await aiApi.createChurnAlertTask({
        account_id: item.account_id,
        message: item.suggested_reactivation_message,
      });
      setCreatedTasksMap((prev) => ({ ...prev, [item.account_id]: true }));
      if (onTaskCreated) onTaskCreated();
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.detail || 'Error al crear la tarea de Churn Alert.');
    } finally {
      setCreatingTaskFor(null);
    }
  };

  if (risks.length === 0 && !loading) {
    return null; // Clean zero-footprint when no risks or disabled
  }

  return (
    <div className="card overflow-hidden border border-rose-200 bg-white shadow-card mb-4">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-rose-50 to-amber-50 border-b border-rose-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-rose-950">
                Alertas Predictivas de Fuga ERP ({risks.length} {risks.length === 1 ? 'cliente' : 'clientes'})
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white shadow-xs">
                Churn Engine IA
              </span>
            </div>
            <p className="text-[11px] text-rose-800 mt-0.5">
              Cuentas que superan 1.5x a 3x su intervalo habitual de compra en el ERP. Requieren contacto comercial urgente.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadRisks}
            className="btn-icon-bare w-7 h-7"
            title="Actualizar análisis de churn"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-rose-700 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="btn-icon-bare w-7 h-7"
            title={isOpen ? 'Minimizar' : 'Expandir'}
          >
            {isOpen ? <ChevronUp className="w-4 h-4 text-rose-700" /> : <ChevronDown className="w-4 h-4 text-rose-700" />}
          </button>
        </div>
      </div>

      {/* Content */}
      {isOpen && (
        <div className="p-3 space-y-2.5">
          {risks.map((item) => {
            const isExpanded = expandedId === item.account_id;
            const taskCreated = createdTasksMap[item.account_id];
            const isCritical = item.risk_level === 'CRITICO' || item.churn_multiplier >= 3.0;

            return (
              <div
                key={item.account_id}
                className={`p-3 rounded-sf border transition-all ${
                  isCritical
                    ? 'border-rose-300 bg-rose-50/30'
                    : 'border-amber-200 bg-amber-50/20'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => onSelectAccount && onSelectAccount(item.account_id)}
                        className="text-sm font-bold text-sf-text hover:text-sf-brand hover:underline truncate text-left"
                      >
                        {item.company_name}
                      </button>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isCritical
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}
                      >
                        {item.churn_multiplier}x intervalo habitual · Riesgo {item.risk_level}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-sf-text-weak mt-1 flex-wrap">
                      <span>
                        Último pedido hace <strong className="text-rose-700">{item.days_since_last_order} días</strong>
                      </span>
                      <span>•</span>
                      <span>Frecuencia habitual: ~{item.avg_order_interval_days} días</span>
                      <span>•</span>
                      <span>Histórico ERP: {item.total_orders_count} pedidos ({formatCurrency(item.total_revenue_ytd)})</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : item.account_id)}
                      className="btn-neutral btn-sm text-xs"
                    >
                      {isExpanded ? 'Ocultar propuesta' : 'Ver propuesta'}
                    </button>

                    <button
                      type="button"
                      disabled={taskCreated || creatingTaskFor === item.account_id}
                      onClick={() => handleCreateTask(item)}
                      className={`btn btn-sm text-xs inline-flex items-center gap-1.5 ${
                        taskCreated
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                      }`}
                    >
                      {creatingTaskFor === item.account_id ? (
                        <Spinner size="xs" />
                      ) : taskCreated ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      <span>{taskCreated ? 'Tarea Creada' : 'Crear Tarea Urgente'}</span>
                    </button>
                  </div>
                </div>

                {/* Collapsible Reactivation Proposal */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-200/80 text-xs space-y-2 animate-fade-in">
                    <div>
                      <span className="font-bold text-slate-800 block">Asunto sugerido:</span>
                      <p className="text-slate-600 font-medium italic mt-0.5">{item.suggested_reactivation_subject}</p>
                    </div>

                    <div>
                      <span className="font-bold text-slate-800 block">Propuesta de reactivación redactada por IA:</span>
                      <div className="p-2.5 bg-white border border-slate-200 rounded text-slate-700 whitespace-pre-line text-[11px] leading-relaxed mt-1 font-mono">
                        {item.suggested_reactivation_message}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { interactionsApi, aiApi } from '../services/api';
import {
  PhoneOff,
  PhoneCall,
  Mail,
  Users,
  MessageSquare,
  FileText,
  CircleAlert,
  Info,
  TriangleAlert,
  Check,
  Sparkles,
  Zap,
  Bot,
} from 'lucide-react';
import { Modal, ObjectIcon, stageIconType, Spinner } from './ui';
import { STAGE_LABELS, toLocalInputValue } from '../utils/format';

const INTERACTION_TYPES = [
  {
    id: 'CALL_EFFECTIVE',
    label: 'Llamada efectiva',
    desc: 'Conversación directa',
    icon: PhoneCall,
    isEffective: true,
    tint: 'bg-[#3ba755]',
  },
  {
    id: 'CALL_NO_ANSWER',
    label: 'Sin respuesta',
    desc: 'Comunica o buzón',
    icon: PhoneOff,
    isEffective: false,
    tint: 'bg-[#dd7a01]',
  },
  {
    id: 'EMAIL_1TO1',
    label: 'Email 1 a 1',
    desc: 'Envío personalizado',
    icon: Mail,
    isEffective: true,
    tint: 'bg-[#0176d3]',
  },
  {
    id: 'MEETING_VISIT',
    label: 'Reunión / visita',
    desc: 'Presencial o vídeo',
    icon: Users,
    isEffective: true,
    tint: 'bg-[#cb65ff]',
  },
  {
    id: 'INBOUND_REPLY',
    label: 'Respuesta entrante',
    desc: 'Responde a campaña',
    icon: MessageSquare,
    isEffective: true,
    tint: 'bg-[#06a59a]',
  },
  {
    id: 'NOTE',
    label: 'Nota interna',
    desc: 'Apunte para el equipo',
    icon: FileText,
    isEffective: false,
    tint: 'bg-[#706e6b]',
  },
];

export default function InteractionModal({ account, isOpen, onClose, onSuccess }) {
  const [type, setType] = useState('CALL_EFFECTIVE');
  const [summary, setSummary] = useState('');
  const [nextFollowupDate, setNextFollowupDate] = useState('');
  const [followupTaskTitle, setFollowupTaskTitle] = useState('');
  const [createOpportunity, setCreateOpportunity] = useState(false);
  const [opportunityTitle, setOpportunityTitle] = useState('');
  const [opportunityAmount, setOpportunityAmount] = useState(5000);
  const [opportunityCloseDate, setOpportunityCloseDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Inbox Sync (Email Intent) States
  const [inboxSyncOpen, setInboxSyncOpen] = useState(false);
  const [emailBody, setEmailBody] = useState('');
  const [analyzingEmail, setAnalyzingEmail] = useState(false);
  const [emailAnalysis, setEmailAnalysis] = useState(null);

  useEffect(() => {
    if (account) {
      // Seguimiento por defecto: dentro de 7 días a las 10:00 (hora local)
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 7);
      defaultDate.setHours(10, 0, 0, 0);
      setNextFollowupDate(toLocalInputValue(defaultDate));
      setFollowupTaskTitle(`Seguimiento comercial con ${account.company_name}`);
      setOpportunityTitle(`Acuerdo comercial · ${account.company_name}`);

      const defaultClose = new Date();
      defaultClose.setDate(defaultClose.getDate() + 30);
      setOpportunityCloseDate(defaultClose.toISOString().split('T')[0]);

      setSummary('');
      setError(null);
      setCreateOpportunity(false);
      setOpportunityAmount(5000);
      setType('CALL_EFFECTIVE');
      setInboxSyncOpen(false);
      setEmailBody('');
      setEmailAnalysis(null);
    }
  }, [account]);

  if (!isOpen || !account) return null;

  const selectedTypeObj = INTERACTION_TYPES.find((t) => t.id === type);
  const isLead = account.lifecycle_stage === 'LEAD';
  const isProspecto = account.lifecycle_stage === 'PROSPECTO';
  const willBecomeProspecto = isLead && selectedTypeObj?.isEffective;
  const willBecomePotencial =
    createOpportunity && Number(opportunityAmount) > 0 && opportunityCloseDate;

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!summary.trim()) {
      setError('Describa el resultado del contacto antes de guardar.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        type,
        summary: summary.trim(),
        next_followup_date: nextFollowupDate ? new Date(nextFollowupDate).toISOString() : null,
        followup_task_title: followupTaskTitle.trim() || undefined,
        create_opportunity: createOpportunity,
        opportunity_title: createOpportunity ? opportunityTitle.trim() : undefined,
        opportunity_amount: createOpportunity ? Number(opportunityAmount) : 0,
        opportunity_close_date: createOpportunity && opportunityCloseDate ? new Date(opportunityCloseDate).toISOString() : null,
      };

      const res = await interactionsApi.addInteraction(account.id, payload);
      onSuccess(res.data);
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'No se ha podido guardar la actividad.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeEmail = async () => {
    if (!emailBody.trim()) {
      setError('Pega el texto del correo para analizar su intención con IA.');
      return;
    }
    setAnalyzingEmail(true);
    setError(null);
    try {
      const res = await aiApi.detectEmailIntent({
        email_body: emailBody.trim(),
        account_id: account.id,
      });
      const data = res.data;
      setEmailAnalysis(data);

      // Pre-fill type
      setType(data.intent === 'DESCARTE' ? 'NOTE' : 'EMAIL_1TO1');

      // Pre-fill summary
      setSummary(
        `[Inbox Sync · Intención ${data.intent} - Urgencia ${data.urgency}]\n` +
        `Resumen: ${data.summary}\n` +
        `Acción recomendada: ${data.suggested_action}`
      );

      // Pre-fill follow-up
      setFollowupTaskTitle(`[${data.intent}] Seguimiento con ${account.company_name}`);
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + (data.extracted_next_followup_days || 3));
      targetDate.setHours(10, 0, 0, 0);
      setNextFollowupDate(toLocalInputValue(targetDate));
    } catch (e) {
      console.error(e);
      setError(e.response?.data?.detail || 'No se pudo analizar el correo con IA.');
    } finally {
      setAnalyzingEmail(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar actividad"
      subtitle={
        <span className="inline-flex items-center gap-2">
          <ObjectIcon type={stageIconType(account.lifecycle_stage)} size="sm" />
          <span className="font-semibold text-sf-text">{account.company_name}</span>
          {account.contact_name && <span>· {account.contact_name}</span>}
          <span className="badge-lightest">{STAGE_LABELS[account.lifecycle_stage]}</span>
        </span>
      }
      footer={
        <>
          <button type="button" onClick={onClose} disabled={loading} className="btn-neutral">
            Cancelar
          </button>
          <button
            id="interaction-save"
            type="submit"
            form="interaction-form"
            disabled={loading}
            className="btn-brand"
          >
            {loading ? 'Guardando…' : 'Guardar'}
          </button>
        </>
      }
    >
      <form id="interaction-form" onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="notify-error" role="alert">
            <CircleAlert className="w-4 h-4 text-sf-error flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Selector visual de tipo */}
        <fieldset>
          <legend className="section-title w-full mb-3">Tipo de actividad</legend>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {INTERACTION_TYPES.map((t) => {
              const Icon = t.icon;
              const isSelected = type === t.id;
              return (
                <button
                  key={t.id}
                  id={`interaction-type-${t.id}`}
                  type="button"
                  onClick={() => setType(t.id)}
                  aria-pressed={isSelected}
                  className={`relative flex items-center gap-3 p-3 rounded-sf border text-left transition-all ${
                    isSelected
                      ? 'border-sf-brand bg-sf-brand-50 shadow-[inset_0_0_0_1px_#0176d3]'
                      : 'border-sf-border-strong bg-white hover:border-sf-brand-light'
                  }`}
                >
                  <span className={`w-8 h-8 rounded-sf flex items-center justify-center text-white ${t.tint}`}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-sf-text truncate">{t.label}</span>
                    <span className="block text-[11px] text-sf-text-weaker truncate">{t.desc}</span>
                  </span>
                  {isSelected && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-sf-brand text-white flex items-center justify-center">
                      <Check className="w-3 h-3" strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Aviso de máquina de estados */}
        {willBecomeProspecto ? (
          <div className="notify-info">
            <Info className="w-4 h-4 text-sf-brand flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">
                {willBecomePotencial
                  ? 'Esta actividad y oportunidad cualifican la cuenta directamente a: Potencial'
                  : 'Esta actividad cualifica la cuenta: Lead → Prospecto'}
              </p>
              <p className="text-sf-text-weak mt-0.5">
                {willBecomePotencial
                  ? 'Al crear una oportunidad cuantificada con importe y fecha de cierre, la cuenta avanzará por el embudo hasta Potencial.'
                  : 'Al guardar, la cuenta pasará a Prospecto, se asignará a su cartera comercial y se programará la tarea de seguimiento.'}
              </p>
            </div>
          </div>
        ) : isProspecto && willBecomePotencial ? (
          <div className="notify-info">
            <Info className="w-4 h-4 text-sf-brand flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Esta oportunidad avanza la cuenta: Prospecto → Potencial</p>
              <p className="text-sf-text-weak mt-0.5">
                Al registrar una oportunidad cuantificada ({opportunityAmount}€ con fecha de cierre), la cuenta se promociona automáticamente a etapa <strong>Potencial</strong>.
              </p>
            </div>
          </div>
        ) : isLead && type === 'CALL_NO_ANSWER' ? (
          <div className="notify-warning">
            <TriangleAlert className="w-4 h-4 text-sf-warning flex-shrink-0 mt-0.5" />
            <p>
              La cuenta <strong>permanece como Lead</strong> y se incrementará el contador de intentos
              (Intento 1 → Intento 2).
            </p>
          </div>
        ) : null}

        {/* Analizador de Correo (Inbox Sync) */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-sf">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sf-brand" />
              <span className="text-xs font-bold text-sf-text">
                Detector de Intención de Correo (Inbox Sync con IA)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setInboxSyncOpen(!inboxSyncOpen)}
              className="text-xs text-sf-brand font-semibold hover:underline"
            >
              {inboxSyncOpen ? 'Ocultar' : 'Pegar correo para auto-rellenar'}
            </button>
          </div>

          {inboxSyncOpen && (
            <div className="mt-2.5 pt-2 border-t border-slate-200 space-y-2 animate-fade-in">
              <textarea
                rows={3}
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                placeholder="Pega aquí el contenido de un email recibido o enviado..."
                className="input text-xs w-full leading-relaxed"
              />

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-sf-text-weaker font-bold uppercase">Ejemplo rápido:</span>
                  <button
                    type="button"
                    onClick={() =>
                      setEmailBody(
                        'Estimados señores, nos gustaría recibir su catálogo oficial con la tarifa de precios y descuentos aplicables a distribuidores. Saludos.'
                      )
                    }
                    className="text-[10px] px-2 py-0.5 rounded bg-white border border-slate-300 hover:bg-slate-100 text-slate-700"
                  >
                    Tarifas (Alta)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEmailBody(
                        'Agradecemos su contacto pero en estos momentos ya disponemos de proveedor homologado y solicitamos no recibir más comunicaciones.'
                      )
                    }
                    className="text-[10px] px-2 py-0.5 rounded bg-white border border-slate-300 hover:bg-slate-100 text-slate-700"
                  >
                    Descarte
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleAnalyzeEmail}
                  disabled={analyzingEmail || !emailBody.trim()}
                  className="btn btn-secondary btn-sm text-xs inline-flex items-center gap-1.5"
                >
                  {analyzingEmail ? <Spinner size="xs" /> : <Zap className="w-3.5 h-3.5 text-sf-brand" />}
                  <span>{analyzingEmail ? 'Analizando...' : 'Detectar Intención y Rellenar'}</span>
                </button>
              </div>

              {emailAnalysis && (
                <div className="p-2.5 bg-white border border-emerald-200 rounded text-xs space-y-1 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-800">
                      Intención detectada: {emailAnalysis.intent}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Urgencia: {emailAnalysis.urgency} · Sentimiento {emailAnalysis.sentiment}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px]">{emailAnalysis.suggested_action}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Resumen */}
        <div>
          <label htmlFor="interaction-summary" className="form-label">
            <abbr className="req no-underline" title="obligatorio">*</abbr>Resumen de la conversación
          </label>
          <textarea
            id="interaction-summary"
            rows={4}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Ej.: Conversación con el Director de Operaciones. Presupuesto aprobado para Q3; solicitan catálogo técnico…"
            className="textarea"
          />
        </div>

        {/* Seguimiento */}
        <fieldset>
          <legend className="section-title w-full mb-3">Próximo seguimiento</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="followup-title" className="form-label">
                Asunto de la tarea
              </label>
              <input
                id="followup-title"
                type="text"
                value={followupTaskTitle}
                onChange={(e) => setFollowupTaskTitle(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="followup-date" className="form-label">
                Fecha de vencimiento
              </label>
              <input
                id="followup-date"
                type="datetime-local"
                value={nextFollowupDate}
                onChange={(e) => setNextFollowupDate(e.target.value)}
                className="input"
              />
            </div>
          </div>
        </fieldset>

        {/* Oportunidad */}
        <fieldset>
          <legend className="section-title w-full mb-3">Oportunidad</legend>
          <label className="flex items-center gap-2 text-[13px] text-sf-text cursor-pointer">
            <input
              id="create-opportunity"
              type="checkbox"
              className="checkbox"
              checked={createOpportunity}
              onChange={(e) => setCreateOpportunity(e.target.checked)}
            />
            Crear oportunidad vinculada a esta actividad
          </label>

          {createOpportunity && (
            <div className="space-y-3 mt-3 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-3">
                  <label htmlFor="opp-title" className="form-label">
                    <abbr className="req no-underline" title="obligatorio">*</abbr>Nombre de la oportunidad
                  </label>
                  <input
                    id="opp-title"
                    type="text"
                    required={createOpportunity}
                    value={opportunityTitle}
                    onChange={(e) => setOpportunityTitle(e.target.value)}
                    className="input"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label htmlFor="opp-amount" className="form-label">
                    <abbr className="req no-underline" title="obligatorio">*</abbr>Importe estimado (EUR)
                  </label>
                  <input
                    id="opp-amount"
                    type="number"
                    min="1"
                    step="500"
                    required={createOpportunity}
                    value={opportunityAmount}
                    onChange={(e) => setOpportunityAmount(e.target.value)}
                    className="input text-right"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="opp-closedate" className="form-label">
                    <abbr className="req no-underline" title="obligatorio">*</abbr>Fecha estimada de cierre
                  </label>
                  <input
                    id="opp-closedate"
                    type="date"
                    required={createOpportunity}
                    value={opportunityCloseDate}
                    onChange={(e) => setOpportunityCloseDate(e.target.value)}
                    className="input"
                  />
                </div>
              </div>
              <p className="text-xs text-sf-text-weak bg-[#f8f9fa] border border-sf-border p-2 rounded-sf">
                <strong>Regla de negocio:</strong> Una oportunidad cuantificada (con importe y fecha estimada de cierre) cualifica automáticamente a la cuenta como <strong className="text-sf-brand">Potencial</strong> en el embudo comercial.
              </p>
            </div>
          )}
        </fieldset>
      </form>
    </Modal>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { aiApi } from '../services/api';
import {
  Mic,
  MicOff,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Receipt,
  Calendar,
  Layers,
  Clock,
  Briefcase,
} from 'lucide-react';
import { Modal, Spinner } from './ui';
import { formatCurrency } from '../utils/format';

const SAMPLE_TRANSCRIPTS = [
  {
    label: 'Con Oportunidad (€) -> Promueve a POTENCIAL',
    text: 'Acabo de salir de una reunión presencial muy positiva con el gerente de compras. Les encaja nuestra propuesta y nos han solicitado formalmente un presupuesto de 15.000€ con fecha prevista de cierre a fin de mes. Reagendar llamada en 3 días para revisar la propuesta económica.',
  },
  {
    label: 'Solo Conversación -> Promueve a PROSPECTO',
    text: 'He mantenido una llamada telefónica con la responsable de administración. Hemos presentado nuestro catálogo general y nos confirma que actualmente tienen contrato vigente hasta el próximo semestre. Enviar información por correo y realizar seguimiento en 15 días.',
  },
];

export default function VoiceToCRMModal({
  isOpen,
  onClose,
  onSuccess,
  initialAccountId = null,
  initialCompanyName = '',
  accounts = [],
}) {
  const [transcript, setTranscript] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState(initialAccountId || '');
  const [companyName, setCompanyName] = useState(initialCompanyName || '');
  const [isRecording, setIsRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTranscript('');
      setResult(null);
      setError('');
      setIsRecording(false);
      setSelectedAccountId(initialAccountId ? String(initialAccountId) : (accounts[0]?.id ? String(accounts[0].id) : ''));
      setCompanyName(initialCompanyName || '');
    }
  }, [isOpen, initialAccountId, initialCompanyName, accounts]);

  // Speech Recognition setup (Web Speech API)
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'es-ES';

      recognition.onresult = (event) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript + ' ';
        }
        setTranscript(currentTranscript.trim());
      };

      recognition.onerror = (e) => {
        console.warn('Speech recognition error:', e.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('Tu navegador no soporta la API de reconocimiento de voz directa. Puedes escribir o pegar el dictado a continuación.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setError('');
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.warn(err);
        setIsRecording(false);
      }
    }
  };

  const handleProcess = async () => {
    if (!transcript.trim()) {
      setError('Introduce o dicta el resumen de la visita comercial.');
      return;
    }
    setProcessing(true);
    setError('');
    setResult(null);

    try {
      const payload = {
        transcript: transcript.trim(),
        account_id: selectedAccountId ? parseInt(selectedAccountId, 10) : undefined,
        company_name: companyName.trim() || undefined,
      };

      const res = await aiApi.voiceToCRM(payload);
      setResult(res.data);
      if (onSuccess) {
        onSuccess(res.data);
      }
    } catch (e) {
      console.error(e);
      setError(e.response?.data?.detail || 'Error al procesar el dictado con la IA.');
    } finally {
      setProcessing(false);
    }
  };

  const handleApplySample = (sampleText) => {
    setTranscript(sampleText);
    setError('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Dictado de Visita Comercial con IA (Voice-to-CRM)"
      size="lg"
    >
      <div className="space-y-4">
        {/* Banner */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-sf text-xs text-blue-900 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-sf-brand flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Procesamiento del Lenguaje Natural Post-Visita</p>
            <p className="mt-0.5 text-blue-800">
              Dicta o escribe notas de voz. La IA extraerá en tiempo real: resumen ejecutivo, importe económico (€),
              fecha de cierre estimada, y programará la tarea de seguimiento cualificando automáticamente la etapa de la cuenta.
            </p>
          </div>
        </div>

        {/* Account Selector if not pre-bound */}
        {!initialAccountId && accounts.length > 0 && (
          <div>
            <label className="field-label" htmlFor="voice-account-select">
              Cuenta o Cliente de la Visita *
            </label>
            <select
              id="voice-account-select"
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="select mt-1"
            >
              <option value="">-- Seleccionar cuenta --</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.company_name} ({a.lifecycle_stage})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Recording Controls & Quick Sample Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={toggleRecording}
            className={`btn inline-flex items-center gap-2 text-xs font-semibold ${
              isRecording
                ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                : 'btn-secondary text-slate-700'
            }`}
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-rose-500" />}
            <span>{isRecording ? 'Detener Grabación...' : 'Grabar con Micrófono'}</span>
          </button>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-sf-text-weaker font-bold uppercase">Probar ejemplo:</span>
            {SAMPLE_TRANSCRIPTS.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplySample(s.text)}
                className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-medium transition"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Text Area for Transcript */}
        <div>
          <label className="field-label" htmlFor="voice-transcript-input">
            Transcripción del Dictado {isRecording && <span className="text-rose-600 font-bold">(Escuchando...)</span>}
          </label>
          <textarea
            id="voice-transcript-input"
            rows={4}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Dicta con tu voz o escribe lo ocurrido durante la reunión comercial..."
            className="input mt-1 w-full text-sm leading-relaxed"
          />
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-sf text-xs text-rose-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Process Button */}
        {!result && (
          <div className="flex justify-end pt-2">
            <button
              type="button"
              id="voice-process-btn"
              onClick={handleProcess}
              disabled={processing || !transcript.trim()}
              className="btn btn-primary inline-flex items-center gap-2 shadow-sm"
            >
              {processing ? <Spinner size="sm" /> : <Sparkles className="w-4 h-4" />}
              <span>{processing ? 'Analizando con IA...' : 'Procesar Dictado con IA'}</span>
            </button>
          </div>
        )}

        {/* Structured Extraction Results */}
        {result && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-sf space-y-3 animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-bold uppercase tracking-wider text-sf-brand flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Extracción Comercial Procesada
              </span>
              <span className="text-xs font-mono text-slate-500">
                {result.interaction_type}
              </span>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed font-sans">
              <strong>Resumen:</strong> {result.summary}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
              <div className="p-2.5 bg-white rounded border border-slate-200">
                <span className="text-[10px] text-sf-text-weaker uppercase font-bold block">Importe Detectado</span>
                <span className="text-sm font-bold text-slate-800 mt-0.5 block">
                  {result.detected_amount ? formatCurrency(result.detected_amount) : 'Sin cuantificar'}
                </span>
              </div>

              <div className="p-2.5 bg-white rounded border border-slate-200">
                <span className="text-[10px] text-sf-text-weaker uppercase font-bold block">Fecha Cierre Estimada</span>
                <span className="text-sm font-bold text-slate-800 mt-0.5 block">
                  {result.detected_close_date || 'No especificada'}
                </span>
              </div>

              <div className="p-2.5 bg-white rounded border border-slate-200">
                <span className="text-[10px] text-sf-text-weaker uppercase font-bold block">Próximo Seguimiento</span>
                <span className="text-sm font-bold text-slate-800 mt-0.5 block">
                  En {result.next_followup_days} días
                </span>
              </div>
            </div>

            {/* Impact Badges */}
            <div className="pt-2 flex flex-wrap gap-2">
              {result.promoted_to_potencial && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Cuenta promovida a POTENCIAL
                </span>
              )}
              {result.promoted_to_prospecto && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold border border-blue-300">
                  <ArrowRight className="w-3.5 h-3.5" />
                  Lead cualificado a PROSPECTO
                </span>
              )}
              {result.opportunity_created && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-100 text-teal-800 text-xs font-bold border border-teal-300">
                  <Briefcase className="w-3.5 h-3.5" />
                  Oportunidad Creada en Pipeline
                </span>
              )}
              {result.task_id && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold border border-indigo-300">
                  <Clock className="w-3.5 h-3.5" />
                  Tarea de Seguimiento Programada
                </span>
              )}
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-primary text-xs"
              >
                Aceptar y Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { aiApi } from '../services/api';
import {
  Sparkles,
  Bot,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Save,
  Zap,
  Lock,
  Cpu,
  Layers,
  FileText,
  Mic,
  Mail,
  TrendingDown,
  HelpCircle,
  KeyRound,
  Server,
} from 'lucide-react';
import { Spinner, Card } from '../components/ui';

const PROVIDERS = [
  {
    id: 'MOCK',
    name: 'Modo Simulación / Mock Local',
    badge: 'Sin Coste ni Tokens',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description:
      'Respuestas sintéticas deterministas y contextuales para desarrollo, pruebas CI/CD y demostraciones sin consumo de API.',
    icon: Bot,
    recommended: false,
  },
  {
    id: 'AZURE_OPENAI',
    name: 'Microsoft Copilot / Azure OpenAI',
    badge: 'Prioridad Enterprise B2B',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    description:
      'Garantía RGPD corporativa en tenant privado de Microsoft. Tus datos no se utilizan para entrenar modelos públicos.',
    icon: ShieldCheck,
    recommended: true,
  },
  {
    id: 'OPENAI',
    name: 'OpenAI Oficial',
    badge: 'gpt-4o / gpt-4o-mini',
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
    description: 'Conexión directa con la API oficial de OpenAI usando modelos multimodales de última generación.',
    icon: Cpu,
    recommended: false,
  },
  {
    id: 'GEMINI',
    name: 'Google Gemini',
    badge: 'gemini-2.5-flash / pro',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    description: 'Modelos de Google Cloud de alta velocidad y amplias ventanas de contexto para análisis documental B2B.',
    icon: Zap,
    recommended: false,
  },
  {
    id: 'CLAUDE',
    name: 'Anthropic Claude',
    badge: 'claude-3-5-sonnet',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    description: 'Capacidad analítica avanzada para razonamiento complejo, extracción semántica y redacción corporativa.',
    icon: Layers,
    recommended: false,
  },
];

export default function AISettingsPage() {
  const { user, isSuperAdmin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [isEnabled, setIsEnabled] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('MOCK');
  const [apiKey, setApiKey] = useState('');
  const [maskedKey, setMaskedKey] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [modelName, setModelName] = useState('');
  const [temperature, setTemperature] = useState(0.3);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await aiApi.getConfig();
      const cfg = res.data;
      setIsEnabled(cfg.is_enabled);
      setSelectedProvider(cfg.provider || 'MOCK');
      setMaskedKey(cfg.masked_key || '');
      setEndpoint(cfg.endpoint || '');
      setModelName(cfg.model_name || '');
      setTemperature(cfg.temperature ?? 0.3);
    } catch (e) {
      console.error(e);
      setError('No se pudo cargar la configuración de IA.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!isSuperAdmin) return;

    setSaving(true);
    setError('');
    setSaveSuccess(false);

    try {
      const payload = {
        is_enabled: isEnabled,
        provider: selectedProvider,
        endpoint: endpoint.trim() || null,
        model_name: modelName.trim() || null,
        temperature: parseFloat(temperature),
      };
      if (apiKey.trim()) {
        payload.api_key = apiKey.trim();
      }

      const res = await aiApi.updateConfig(payload);
      setMaskedKey(res.data.masked_key || '');
      setApiKey('');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (e) {
      console.error(e);
      setError(e.response?.data?.detail || 'Error al guardar la configuración.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setError('');

    try {
      const payload = {
        provider: selectedProvider,
        endpoint: endpoint.trim() || undefined,
        model_name: modelName.trim() || undefined,
        api_key: apiKey.trim() || undefined,
      };
      const res = await aiApi.testConnection(payload);
      setTestResult(res.data);
    } catch (e) {
      console.error(e);
      setTestResult({
        success: false,
        message: e.response?.data?.detail || 'Error en la prueba de conexión.',
        latency_ms: 0,
        provider: selectedProvider,
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[500px]">
        <Spinner label="Cargando configuración de IA corporativa..." />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-sf-border gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sf-brand">
            <Sparkles className="w-4 h-4 text-sf-brand" />
            <span>Inteligencia Artificial Corporativa (BYOK)</span>
          </div>
          <h1 className="text-2xl font-bold text-sf-text mt-1">Configuración del Asistente de IA Multi-Proveedor</h1>
          <p className="text-sm text-sf-text-weak mt-1">
            Conecta la clave corporativa de tu organización o utiliza el entorno de simulación local sin coste.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadConfig}
            className="btn btn-secondary inline-flex items-center gap-2 text-xs"
            title="Recargar configuración"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Recargar
          </button>
        </div>
      </div>

      {!isSuperAdmin && (
        <div className="my-4 p-4 rounded-sf bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
          <div>
            <p className="font-bold">Modo de sólo lectura</p>
            <p className="text-xs mt-0.5">
              Solo los usuarios con rol de Super Administrador (SUPER_ADMIN / Sistemas) pueden modificar las
              credenciales corporativas y el proveedor de IA.
            </p>
          </div>
        </div>
      )}

      {saveSuccess && (
        <div className="my-4 p-4 rounded-sf bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>Configuración de Inteligencia Artificial guardada con éxito.</span>
        </div>
      )}

      {error && (
        <div className="my-4 p-4 rounded-sf bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="mt-6 space-y-8">
        {/* Master Switch Card */}
        <div className="p-6 bg-white border border-sf-border rounded-sf shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2">
              <span className={`inline-block w-3 h-3 rounded-full ${isEnabled ? 'bg-emerald-500 ring-4 ring-emerald-100' : 'bg-slate-300'}`} />
              <h2 className="text-base font-bold text-sf-text">
                {isEnabled ? 'Módulo de IA Habilitado (ON)' : 'Módulo de IA Deshabilitado (OFF)'}
              </h2>
            </div>
            <p className="text-xs text-sf-text-weak mt-1">
              {isEnabled
                ? 'El CRM tiene activos los 5 casos de uso de IA (Enriquecedor de Leads, Dictado por Voz, Análisis de Intención, Detección de Fuga ERP y Redactor de Mailing).'
                : 'Módulo deshabilitado por defecto. El CRM opera de forma limpia, sin requerir credenciales ni mostrar alertas de configuración.'}
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              id="ai-master-switch"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
              disabled={!isSuperAdmin}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#0176d3]"></div>
            <span className="ml-3 text-sm font-semibold text-sf-text">
              {isEnabled ? 'Activado' : 'Desactivado'}
            </span>
          </label>
        </div>

        {/* Provider Selector Grid */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-sf-text-weak mb-3">
            1. Seleccionar Proveedor de Inteligencia Artificial (BYOK)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PROVIDERS.map((p) => {
              const IconComp = p.icon;
              const isSelected = selectedProvider === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => isSuperAdmin && setSelectedProvider(p.id)}
                  className={`relative p-5 rounded-sf border transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'border-[#0176d3] ring-2 ring-[#0176d3]/20 bg-blue-50/20 shadow-sm'
                      : 'border-sf-border bg-white hover:border-slate-400'
                  } ${!isSuperAdmin ? 'cursor-not-allowed opacity-80' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isSelected ? 'bg-[#0176d3] text-white' : 'bg-slate-100 text-sf-text-weak'
                        }`}
                      >
                        <IconComp className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-sf-text leading-tight">{p.name}</h3>
                        <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full border mt-1 ${p.badgeColor}`}>
                          {p.badge}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="flex-shrink-0 text-[#0176d3]">
                        <CheckCircle2 className="w-5 h-5 fill-[#0176d3] text-white" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-sf-text-weak mt-3 line-clamp-2">{p.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Credentials Form */}
        <div className="p-6 bg-white border border-sf-border rounded-sf shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wider text-sf-text-weak mb-4">
            2. Credenciales y Parámetros del Proveedor
          </h2>

          {selectedProvider === 'MOCK' ? (
            <div className="p-4 rounded-sf bg-slate-50 border border-slate-200 text-xs text-sf-text">
              <p className="font-bold text-sf-brand">Modo Simulación Activo</p>
              <p className="mt-1 text-sf-text-weak">
                No se requieren claves ni endpoints externos. El motor interno simulará enriquecimiento de empresas,
                análisis de audios comerciales con detección de importe, detección de sentimiento en correos y alertas
                de Churn ERP con datos contextuales en milisegundos.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedProvider === 'AZURE_OPENAI' && (
                <div>
                  <label className="field-label" htmlFor="ai-endpoint">
                    Endpoint de Azure OpenAI (Tenant Corporativo) *
                  </label>
                  <div className="relative mt-1">
                    <Server className="w-4 h-4 text-sf-text-weaker absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="ai-endpoint"
                      type="url"
                      disabled={!isSuperAdmin}
                      value={endpoint}
                      onChange={(e) => setEndpoint(e.target.value)}
                      placeholder="https://tu-recurso.openai.azure.com/"
                      className="input pl-9"
                    />
                  </div>
                  <p className="text-[11px] text-sf-text-weaker mt-1">
                    Endpoint privado de Azure donde reside el recurso desplegado de tu organización.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="field-label" htmlFor="ai-api-key">
                    Clave de API (API Key / Token Privado)
                  </label>
                  <div className="relative mt-1">
                    <KeyRound className="w-4 h-4 text-sf-text-weaker absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="ai-api-key"
                      type="password"
                      disabled={!isSuperAdmin}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={maskedKey ? `Configurada (${maskedKey})` : 'Introduce tu clave de API privada...'}
                      className="input pl-9 font-mono"
                    />
                  </div>
                  {maskedKey && !apiKey && (
                    <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Clave guardada de forma segura: {maskedKey}
                    </p>
                  )}
                </div>

                <div>
                  <label className="field-label" htmlFor="ai-model-name">
                    {selectedProvider === 'AZURE_OPENAI' ? 'Deployment Name (Despliegue Azure)' : 'Modelo Objetivo'}
                  </label>
                  <input
                    id="ai-model-name"
                    type="text"
                    disabled={!isSuperAdmin}
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    placeholder={
                      selectedProvider === 'AZURE_OPENAI'
                        ? 'p. ej. gpt-4o'
                        : selectedProvider === 'OPENAI'
                        ? 'p. ej. gpt-4o-mini'
                        : selectedProvider === 'GEMINI'
                        ? 'p. ej. gemini-2.5-flash'
                        : 'p. ej. claude-3-5-sonnet-20241022'
                    }
                    className="input mt-1"
                  />
                  <p className="text-[11px] text-sf-text-weaker mt-1">
                    Identificador del modelo desplegado en tu consola de proveedor.
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="field-label" htmlFor="ai-temperature">
                    Temperatura (Determinismo vs Creatividad)
                  </label>
                  <span className="text-xs font-mono font-bold text-sf-brand">{temperature}</span>
                </div>
                <input
                  id="ai-temperature"
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  disabled={!isSuperAdmin}
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  className="w-full mt-2 accent-[#0176d3]"
                />
                <div className="flex justify-between text-[10px] text-sf-text-weaker mt-1">
                  <span>0.0 (Extremadamente analítico y estricto)</span>
                  <span>0.3 (Recomendado B2B)</span>
                  <span>1.0 (Muy creativo)</span>
                </div>
              </div>
            </div>
          )}

          {/* Test Connection Result Box */}
          {testResult && (
            <div
              className={`mt-5 p-4 rounded-sf border text-sm flex items-start gap-3 animate-fade-in ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold">
                    {testResult.success ? 'Conexión verificada con éxito' : 'Fallo en la prueba de conexión'}
                  </span>
                  {testResult.latency_ms > 0 && (
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/70 border border-current">
                      Latencia: {testResult.latency_ms} ms
                    </span>
                  )}
                </div>
                <p className="text-xs mt-1">{testResult.message}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 pt-5 border-t border-sf-border flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              id="ai-test-connection-btn"
              onClick={handleTestConnection}
              disabled={testing || !isSuperAdmin}
              className="btn btn-secondary inline-flex items-center gap-2"
            >
              {testing ? <Spinner size="sm" /> : <Zap className="w-4 h-4 text-sf-brand" />}
              <span>{testing ? 'Comprobando conexión...' : 'Probar Conexión'}</span>
            </button>

            {isSuperAdmin && (
              <button
                type="submit"
                id="ai-save-config-btn"
                disabled={saving}
                className="btn btn-primary inline-flex items-center gap-2 shadow-sm"
              >
                {saving ? <Spinner size="sm" /> : <Save className="w-4 h-4" />}
                <span>{saving ? 'Guardando...' : 'Guardar Configuración'}</span>
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Feature Showcase Grid: The 5 B2B Modules */}
      <div className="mt-12">
        <h2 className="text-sm font-bold uppercase tracking-wider text-sf-text-weak mb-4">
          Resumen de los 5 Módulos de IA Aplicada al Negocio B2B
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 bg-white border border-sf-border rounded-sf">
            <div className="flex items-center gap-2 font-bold text-sm text-sf-text">
              <Sparkles className="w-4 h-4 text-sf-brand" />
              <span>a) AI Lead Enricher</span>
            </div>
            <p className="text-xs text-sf-text-weak mt-1">
              Enriquece automáticamente Leads y Prospectos analizando el sector, actividad y tamaño estimado antes del primer contacto.
            </p>
          </div>

          <div className="p-4 bg-white border border-sf-border rounded-sf">
            <div className="flex items-center gap-2 font-bold text-sm text-sf-text">
              <Mic className="w-4 h-4 text-[#cb65ff]" />
              <span>b) Voice-to-CRM (Post-Visita)</span>
            </div>
            <p className="text-xs text-sf-text-weak mt-1">
              Dicta el resumen de una visita o llamada. Extrae importes (€), fecha de cierre estimada y promueve automáticamente de etapa.
            </p>
          </div>

          <div className="p-4 bg-white border border-sf-border rounded-sf">
            <div className="flex items-center gap-2 font-bold text-sm text-sf-text">
              <Mail className="w-4 h-4 text-[#06a59a]" />
              <span>c) Inbox Sync (Intención)</span>
            </div>
            <p className="text-xs text-sf-text-weak mt-1">
              Pega cualquier correo entrante. La IA detecta la intención comercial (Tarifas, Reunión, Descarte) y propone la siguiente acción.
            </p>
          </div>

          <div className="p-4 bg-white border border-sf-border rounded-sf">
            <div className="flex items-center gap-2 font-bold text-sm text-sf-text">
              <TrendingDown className="w-4 h-4 text-[#ea001e]" />
              <span>d) Predictor de Fuga & Churn ERP</span>
            </div>
            <p className="text-xs text-sf-text-weak mt-1">
              Monitoriza el intervalo de pedidos ERP. Si supera 2x el hábito de recompra, genera una tarea prioritaria con propuesta personalizada.
            </p>
          </div>

          <div className="p-4 bg-white border border-sf-border rounded-sf">
            <div className="flex items-center gap-2 font-bold text-sm text-sf-text">
              <FileText className="w-4 h-4 text-[#0176d3]" />
              <span>e) Redactor de Copys de Mailing</span>
            </div>
            <p className="text-xs text-sf-text-weak mt-1">
              Genera campañas de email marketing completas en HTML con diseño responsive y variables automáticas {'{{nombre}}'} y {'{{empresa}}'}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

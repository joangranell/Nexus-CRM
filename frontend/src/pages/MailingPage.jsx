import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  Plus,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Flame,
  MousePointerClick,
  Users,
  ShieldCheck,
  RefreshCw,
  Clock,
  Sparkles,
  ExternalLink,
  Trash2,
  Edit3,
  FileText,
  ChevronRight,
  Filter,
  Check,
  Radio,
  X,
  Layers,
  ArrowRight,
  Inbox,
  UserCheck,
  Ban,
  Activity,
} from 'lucide-react';
import { mailingApi, accountsApi, aiApi } from '../services/api';
import { Card, Button, Badge, Spinner, Alert, Modal } from '../components/ui';
import { useAuth } from '../context/AuthContext';

const PROVIDER_OPTIONS = [
  { id: 'sandbox', name: 'Sandbox Local', badge: 'Simulación', desc: 'Renderizado y almacenamiento interno sin coste' },
  { id: 'mailchimp', name: 'Mailchimp API', badge: 'Marketing / Mandrill', desc: 'Sincronización de audiencias y transactional' },
  { id: 'brevo', name: 'Brevo (Sendinblue)', badge: 'REST API v3', desc: 'Envío transaccional y webhooks' },
  { id: 'resend', name: 'Resend API', badge: 'High-Delivery', desc: 'Infraestructura moderna para desarrolladores' },
];

const VARIABLE_TAGS = [
  { tag: '{{nombre}}', label: 'Nombre Contacto' },
  { tag: '{{empresa}}', label: 'Empresa' },
  { tag: '{{comercial}}', label: 'Comercial Asignado' },
  { tag: '{{email_comercial}}', label: 'Email Comercial' },
  { tag: '{{cif}}', label: 'NIF / CIF' },
  { tag: '{{telefono}}', label: 'Teléfono' },
];

export default function MailingPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('campaigns'); // 'campaigns' | 'new_campaign' | 'templates'
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Campaigns state
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [campaignDetail, setCampaignDetail] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [recipientFilter, setRecipientFilter] = useState('');
  const [loadingCampaignDetail, setLoadingCampaignDetail] = useState(false);

  // Templates state
  const [templates, setTemplates] = useState([]);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    subject: '',
    body_html: '',
    high_intent_links_str: '',
  });

  // New Campaign wizard state
  const [wizardStep, setWizardStep] = useState(1);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    template_id: '',
    provider_used: 'sandbox',
    target_stage: 'LEAD',
    client_type: '',
    source: '',
    min_days_inactive: '',
    has_no_orders: false,
    purchased_product: '',
  });
  const [segmentEstimate, setSegmentEstimate] = useState(null);
  const [estimating, setEstimating] = useState(false);
  const [sendingCampaign, setSendingCampaign] = useState(false);

  // Recipient preview modal
  const [previewRecipient, setPreviewRecipient] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // AI Copy Generation Modal States
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiTone, setAiTone] = useState('profesional y persuasivo');
  const [aiTargetStage, setAiTargetStage] = useState('LEAD');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGeneratedCopy, setAiGeneratedCopy] = useState(null);
  const [aiError, setAiError] = useState('');

  useEffect(() => {
    loadTemplates();
    loadCampaigns();
  }, []);

  const loadTemplates = async () => {
    try {
      const res = await mailingApi.getTemplates();
      setTemplates(res.data);
      if (res.data.length > 0 && !newCampaign.template_id) {
        setNewCampaign((prev) => ({ ...prev, template_id: res.data[0].id }));
      }
    } catch (err) {
      console.error('Error al cargar plantillas:', err);
    }
  };

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const res = await mailingApi.getCampaigns();
      setCampaigns(res.data);
      if (res.data.length > 0 && !selectedCampaignId) {
        setSelectedCampaignId(res.data[0].id);
        fetchCampaignDetail(res.data[0].id);
      }
    } catch (err) {
      console.error('Error al cargar campañas:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaignDetail = async (campaignId) => {
    try {
      setLoadingCampaignDetail(true);
      const res = await mailingApi.getCampaignDetail(campaignId);
      setCampaignDetail(res.data);
      loadRecipients(campaignId);
    } catch (err) {
      console.error('Error al cargar detalle de campaña:', err);
    } finally {
      setLoadingCampaignDetail(false);
    }
  };

  const loadRecipients = async (campaignId, filter = '') => {
    try {
      const params = filter ? { status_filter: filter } : {};
      const res = await mailingApi.getCampaignRecipients(campaignId, params);
      setRecipients(res.data);
    } catch (err) {
      console.error('Error al cargar destinatarios:', err);
    }
  };

  // Estimate segment when wizard stage or filters change
  useEffect(() => {
    if (activeTab === 'new_campaign' && wizardStep === 2) {
      runEstimateSegment();
    }
  }, [
    newCampaign.target_stage,
    newCampaign.client_type,
    newCampaign.source,
    newCampaign.min_days_inactive,
    newCampaign.has_no_orders,
    newCampaign.purchased_product,
    activeTab,
    wizardStep,
  ]);

  const runEstimateSegment = async () => {
    try {
      setEstimating(true);
      const filters = {};
      if (newCampaign.client_type) filters.client_type = newCampaign.client_type;
      if (newCampaign.source) filters.source = newCampaign.source;
      if (newCampaign.min_days_inactive) filters.min_days_inactive = parseInt(newCampaign.min_days_inactive, 10);
      if (newCampaign.has_no_orders) filters.has_no_orders = true;
      if (newCampaign.purchased_product) filters.purchased_product = newCampaign.purchased_product;

      const res = await mailingApi.estimateSegment({
        target_stage: newCampaign.target_stage,
        segment_filters: filters,
      });
      setSegmentEstimate(res.data);
    } catch (err) {
      console.error('Error estimando segmento:', err);
    } finally {
      setEstimating(false);
    }
  };

  // Handle template creation / save
  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    if (!templateForm.name || !templateForm.subject || !templateForm.body_html) {
      setFeedback({ type: 'error', message: 'Por favor complete el nombre, asunto y contenido HTML.' });
      return;
    }

    const linksArray = templateForm.high_intent_links_str
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const payload = {
      name: templateForm.name,
      subject: templateForm.subject,
      body_html: templateForm.body_html,
      high_intent_links: linksArray,
    };

    try {
      setLoading(true);
      if (editingTemplate) {
        await mailingApi.updateTemplate(editingTemplate.id, payload);
        setFeedback({ type: 'success', message: 'Plantilla actualizada correctamente.' });
      } else {
        await mailingApi.createTemplate(payload);
        setFeedback({ type: 'success', message: 'Plantilla creada con éxito.' });
      }
      setEditingTemplate(null);
      setTemplateForm({ name: '', subject: '', body_html: '', high_intent_links_str: '' });
      await loadTemplates();
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.detail || 'Error al guardar la plantilla.' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditTemplate = (tmpl) => {
    setEditingTemplate(tmpl);
    setTemplateForm({
      name: tmpl.name,
      subject: tmpl.subject,
      body_html: tmpl.body_html,
      high_intent_links_str: (tmpl.high_intent_links || []).join('\n'),
    });
  };

  const handleDeleteTemplate = async (tmplId) => {
    if (!window.confirm('¿Desea eliminar esta plantilla?')) return;
    try {
      await mailingApi.deleteTemplate(tmplId);
      setFeedback({ type: 'success', message: 'Plantilla eliminada.' });
      await loadTemplates();
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.detail || 'Error al eliminar plantilla.' });
    }
  };

  const insertVariable = (tag) => {
    setTemplateForm((prev) => ({
      ...prev,
      body_html: prev.body_html + ' ' + tag,
    }));
  };

  // Launch campaign
  const handleLaunchCampaign = async () => {
    if (!newCampaign.name || !newCampaign.template_id) {
      setFeedback({ type: 'error', message: 'Indique un nombre y seleccione una plantilla.' });
      return;
    }

    try {
      setSendingCampaign(true);
      setFeedback(null);

      const filters = {};
      if (newCampaign.client_type) filters.client_type = newCampaign.client_type;
      if (newCampaign.source) filters.source = newCampaign.source;
      if (newCampaign.min_days_inactive) filters.min_days_inactive = parseInt(newCampaign.min_days_inactive, 10);
      if (newCampaign.has_no_orders) filters.has_no_orders = true;
      if (newCampaign.purchased_product) filters.purchased_product = newCampaign.purchased_product;

      // 1. Create campaign
      const createRes = await mailingApi.createCampaign({
        name: newCampaign.name,
        template_id: parseInt(newCampaign.template_id, 10),
        target_stage: newCampaign.target_stage,
        segment_filters: filters,
        provider_used: newCampaign.provider_used,
      });

      const campId = createRes.data.id;

      // 2. Dispatch sending
      const sendRes = await mailingApi.sendCampaign(campId);

      setFeedback({
        type: 'success',
        message: sendRes.data.message || 'Campaña enviada con éxito.',
      });

      // Reset wizard and reload
      setWizardStep(1);
      setNewCampaign({
        name: '',
        template_id: templates[0]?.id || '',
        provider_used: 'sandbox',
        target_stage: 'LEAD',
        source: '',
        min_days_inactive: '',
        has_no_orders: false,
        purchased_product: '',
      });

      await loadCampaigns();
      setSelectedCampaignId(campId);
      fetchCampaignDetail(campId);
      setActiveTab('campaigns');
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.detail || 'Error al lanzar la campaña.',
      });
    } finally {
      setSendingCampaign(false);
    }
  };

  const handleOpenRecipientPreview = async (recipientId) => {
    try {
      setLoadingPreview(true);
      const res = await mailingApi.getRecipient(recipientId);
      setPreviewRecipient(res.data);
    } catch (err) {
      console.error('Error cargando preview de destinatario:', err);
    } finally {
      setLoadingPreview(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'HIGH_INTENT_CLICKED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <Flame className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            Alta Intención 🔥
          </span>
        );
      case 'CLICKED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <MousePointerClick className="w-3 h-3 text-blue-600" />
            Clic
          </span>
        );
      case 'OPENED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Eye className="w-3 h-3 text-emerald-600" />
            Abierto
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            Entregado
          </span>
        );
      case 'SENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            Enviado
          </span>
        );
      case 'HARD_BOUNCE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
            <Ban className="w-3 h-3 text-red-600" />
            Rebote Permanente (Email Inválido)
          </span>
        );
      case 'UNSUBSCRIBED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            Baja RGPD (Opt-out)
          </span>
        );
      default:
        return <span className="text-xs text-sf-text-weak">{status}</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* ---------- Header SLDS ---------- */}
      <div className="bg-white border border-sf-border rounded-sf p-5 shadow-card flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-sf-brand flex items-center justify-center text-white shadow-md">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-sf-text">Módulo de Mailing & Campañas Automatizadas</h1>
              <span className="badge badge-brand text-[11px]">Fase 3 Activa</span>
            </div>
            <p className="text-xs text-sf-text-weak mt-0.5">
              Arquitectura multi-proveedor (Sandbox, Mailchimp, Brevo, Resend) &bull; Segmentación por Embudo &bull; Higiene Automática RGPD
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === 'campaigns' ? 'brand' : 'neutral'}
            onClick={() => setActiveTab('campaigns')}
            className="text-xs"
          >
            <Activity className="w-4 h-4 mr-1.5" />
            Campañas Enviadas
          </Button>
          <Button
            variant={activeTab === 'new_campaign' ? 'brand' : 'neutral'}
            onClick={() => {
              setActiveTab('new_campaign');
              setWizardStep(1);
            }}
            className="text-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Nueva Campaña
          </Button>
          <Button
            variant={activeTab === 'templates' ? 'brand' : 'neutral'}
            onClick={() => setActiveTab('templates')}
            className="text-xs"
          >
            <FileText className="w-4 h-4 mr-1.5" />
            Plantillas ({templates.length})
          </Button>
        </div>
      </div>

      {/* ---------- Banner de Regla de Oro Marketing -> Ventas ---------- */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-sf p-4 shadow-sm flex items-start gap-3">
        <div className="p-2 rounded-full bg-amber-100 text-amber-700 flex-shrink-0 mt-0.5">
          <Flame className="w-5 h-5" />
        </div>
        <div className="text-xs text-amber-900 leading-relaxed">
          <p className="font-bold text-amber-950 text-sm mb-0.5">
            Regla de Oro Inquebrantable: El Puente entre Marketing y Ventas
          </p>
          <p>
            El envío de campañas o las aperturas / clics generales <strong>NUNCA</strong> convierten un Lead en Potencial directamente.
            Cuando un contacto pulsa en un enlace configurado como <strong>Alta Intención</strong> (ej. <em>Solicitar Tarifa</em> o <em>Hablar con Asesor</em>),
            el sistema dispara una <strong>Tarea Prioritaria en "Mi Día"</strong> para el comercial. Solo cuando el comercial ejecuta el contacto efectivo, la máquina de estados promueve el Lead a Potencial.
          </p>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div className="animate-fade-in">
          <Alert
            type={feedback.type}
            message={feedback.message}
            onClose={() => setFeedback(null)}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 1: CAMPAÑAS Y MÉTRICAS                                           */}
      {/* ========================================================================= */}
      {activeTab === 'campaigns' && (
        <div className="space-y-6">
          {/* Global KPI Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <Card className="p-4 bg-white border border-sf-border shadow-card">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sf-text-weaker">Campañas</span>
              <p className="text-2xl font-bold text-sf-text mt-1">{campaigns.length}</p>
              <span className="text-[11px] text-sf-text-weak">Total registradas</span>
            </Card>

            <Card className="p-4 bg-white border border-sf-border shadow-card">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sf-text-weaker">Correos Enviados</span>
              <p className="text-2xl font-bold text-sf-brand mt-1">
                {campaignDetail?.stats?.sent || 0}
              </p>
              <span className="text-[11px] text-sf-text-weak">En campaña activa</span>
            </Card>

            <Card className="p-4 bg-white border border-sf-border shadow-card">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sf-text-weaker">Aperturas</span>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {campaignDetail?.stats?.open_rate || 0}%
              </p>
              <span className="text-[11px] text-sf-text-weak">{campaignDetail?.stats?.opened || 0} destinatarios</span>
            </Card>

            <Card className="p-4 bg-white border border-sf-border shadow-card">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sf-text-weaker">Tasa de Clics</span>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {campaignDetail?.stats?.click_rate || 0}%
              </p>
              <span className="text-[11px] text-sf-text-weak">{campaignDetail?.stats?.clicked || 0} interacciones</span>
            </Card>

            <Card className="p-4 bg-amber-50/60 border border-amber-200 shadow-card">
              <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-amber-800">
                <Flame className="w-3.5 h-3.5 text-amber-600" />
                Alta Intención
              </div>
              <p className="text-2xl font-black text-amber-700 mt-1">
                {campaignDetail?.stats?.high_intent_clicked || 0}
              </p>
              <span className="text-[11px] font-semibold text-amber-800">Tareas en Mi Día 🔥</span>
            </Card>

            <Card className="p-4 bg-white border border-sf-border shadow-card">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sf-text-weaker">Higiene / Bajas</span>
              <p className="text-2xl font-bold text-rose-600 mt-1">
                {(campaignDetail?.stats?.hard_bounce || 0) + (campaignDetail?.stats?.unsubscribed || 0)}
              </p>
              <span className="text-[11px] text-sf-text-weak">
                {campaignDetail?.stats?.hard_bounce || 0} rebotes &bull; {campaignDetail?.stats?.unsubscribed || 0} bajas
              </span>
            </Card>
          </div>

          {/* Campaign Selector & Detail Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left list: campaigns */}
            <div className="lg:col-span-1 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-sf-border">
                <h3 className="text-sm font-bold text-sf-text">Historial de Campañas</h3>
                <span className="text-xs text-sf-text-weaker">{campaigns.length} total</span>
              </div>

              {campaigns.length === 0 ? (
                <div className="p-6 text-center text-sf-text-weak text-xs bg-white rounded-sf border border-sf-border">
                  No hay campañas registradas.
                  <Button
                    variant="brand"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => setActiveTab('new_campaign')}
                  >
                    Crear primera campaña
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {campaigns.map((c) => {
                    const isSelected = c.id === selectedCampaignId;
                    return (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedCampaignId(c.id);
                          fetchCampaignDetail(c.id);
                        }}
                        className={`w-full text-left p-3.5 rounded-sf border transition-all text-xs flex flex-col gap-1.5 ${
                          isSelected
                            ? 'bg-sf-brand-50 border-sf-brand shadow-sm ring-1 ring-sf-brand'
                            : 'bg-white border-sf-border hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sf-text truncate max-w-[180px]">{c.name}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              c.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : c.status === 'SENDING'
                                ? 'bg-amber-100 text-amber-800 animate-pulse'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {c.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-sf-text-weak flex items-center justify-between">
                          <span>Etapa: <strong>{c.target_stage}</strong></span>
                          <span>ESP: {c.provider_used}</span>
                        </div>
                        <div className="text-[10px] text-sf-text-weaker flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {c.sent_at ? new Date(c.sent_at).toLocaleDateString('es-ES') : 'Borrador'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: Campaign recipients & telemetry detail */}
            <div className="lg:col-span-3 space-y-4">
              {loadingCampaignDetail ? (
                <div className="p-12 bg-white rounded-sf border border-sf-border flex justify-center">
                  <Spinner label="Cargando telemetría de campaña…" />
                </div>
              ) : campaignDetail ? (
                <Card className="bg-white border border-sf-border shadow-card overflow-hidden">
                  {/* Campaign details header */}
                  <div className="p-5 border-b border-sf-border bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-sf-text">{campaignDetail.campaign.name}</h2>
                        <span className="badge badge-brand text-[10px]">
                          Objetivo: {campaignDetail.campaign.target_stage}
                        </span>
                        <span className="text-xs text-sf-text-weak">
                          (Proveedor: {campaignDetail.campaign.provider_used})
                        </span>
                      </div>
                      <p className="text-xs text-sf-text-weak mt-1">
                        Plantilla: <strong>{campaignDetail.template?.name}</strong> &bull; Asunto: "{campaignDetail.template?.subject}"
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="neutral"
                        size="sm"
                        onClick={() => fetchCampaignDetail(campaignDetail.campaign.id)}
                        className="text-xs"
                      >
                        <RefreshCw className="w-3.5 h-3.5 mr-1" />
                        Actualizar
                      </Button>
                    </div>
                  </div>

                  {/* Filter bar for recipients */}
                  <div className="p-3 border-b border-sf-border bg-white flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 text-xs">
                      <Filter className="w-3.5 h-3.5 text-sf-text-weaker" />
                      <span className="font-semibold text-sf-text">Filtrar por evento:</span>
                      <select
                        value={recipientFilter}
                        onChange={(e) => {
                          setRecipientFilter(e.target.value);
                          loadRecipients(campaignDetail.campaign.id, e.target.value);
                        }}
                        className="input text-xs py-1 px-2 h-7"
                      >
                        <option value="">Todos los destinatarios</option>
                        <option value="HIGH_INTENT_CLICKED">🔥 Clic de Alta Intención</option>
                        <option value="CLICKED">Clic General</option>
                        <option value="OPENED">Abierto</option>
                        <option value="DELIVERED">Entregado</option>
                        <option value="HARD_BOUNCE">Rebote Permanente</option>
                        <option value="UNSUBSCRIBED">Baja Voluntaria</option>
                      </select>
                    </div>
                    <span className="text-xs text-sf-text-weaker">
                      Mostrando {recipients.length} destinatarios
                    </span>
                  </div>

                  {/* Recipients table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#f8f9fa] border-b border-sf-border text-sf-text-weak font-semibold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="px-4 py-2.5">Empresa / Contacto</th>
                          <th className="px-4 py-2.5">Email</th>
                          <th className="px-4 py-2.5">Estado Embudo</th>
                          <th className="px-4 py-2.5">Evento Mailing</th>
                          <th className="px-4 py-2.5">Última Actividad</th>
                          <th className="px-4 py-2.5 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-sf-border">
                        {recipients.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-sf-text-weak">
                              No hay destinatarios registrados con el filtro actual.
                            </td>
                          </tr>
                        ) : (
                          recipients.map((rec) => (
                            <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3 font-semibold text-sf-text">
                                {rec.account_company_name || 'Sin empresa'}
                              </td>
                              <td className="px-4 py-3 text-sf-text-weak font-mono text-[11px]">
                                {rec.email}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  rec.account_stage === 'LEAD' ? 'bg-amber-100 text-amber-800' :
                                  rec.account_stage === 'POTENCIAL' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                                }`}>
                                  {rec.account_stage || 'LEAD'}
                                </span>
                              </td>
                              <td className="px-4 py-3">{getStatusBadge(rec.status)}</td>
                              <td className="px-4 py-3 text-sf-text-weaker text-[11px]">
                                {rec.last_event_at ? new Date(rec.last_event_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '-'}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-[11px] py-1 px-2.5 h-6"
                                  onClick={() => handleOpenRecipientPreview(rec.id)}
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  Ver Email
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              ) : (
                <div className="p-12 text-center text-sf-text-weak bg-white rounded-sf border border-sf-border">
                  Selecciona una campaña para inspeccionar su telemetría.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 2: ASISTENTE DE NUEVA CAMPAÑA & SEGMENTACIÓN DINÁMICA            */}
      {/* ========================================================================= */}
      {activeTab === 'new_campaign' && (
        <Card className="bg-white border border-sf-border shadow-card p-6 space-y-6">
          {/* Stepper Header */}
          <div className="flex items-center justify-between pb-4 border-b border-sf-border">
            <div>
              <h2 className="text-base font-bold text-sf-text">Asistente de Lanzamiento de Campaña</h2>
              <p className="text-xs text-sf-text-weak">
                Configura tu segmento objetivo y el proveedor de envío con validación RGPD en vivo.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className={`px-3 py-1 rounded-full ${wizardStep === 1 ? 'bg-sf-brand text-white' : 'bg-slate-100 text-sf-text-weak'}`}>
                1. Plantilla & ESP
              </span>
              <ChevronRight className="w-4 h-4 text-sf-text-weaker" />
              <span className={`px-3 py-1 rounded-full ${wizardStep === 2 ? 'bg-sf-brand text-white' : 'bg-slate-100 text-sf-text-weak'}`}>
                2. Segmentación en Vivo
              </span>
              <ChevronRight className="w-4 h-4 text-sf-text-weaker" />
              <span className={`px-3 py-1 rounded-full ${wizardStep === 3 ? 'bg-sf-brand text-white' : 'bg-slate-100 text-sf-text-weak'}`}>
                3. Lanzar
              </span>
            </div>
          </div>

          {/* STEP 1: Basic Info, Template & Provider */}
          {wizardStep === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-sf-text uppercase mb-1.5">
                    Nombre de la Campaña *
                  </label>
                  <input
                    type="text"
                    value={newCampaign.name}
                    onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                    placeholder="Ej. Nurturing Automatización Q2 - Leads Madrid"
                    className="input w-full"
                  />
                  <p className="text-[11px] text-sf-text-weaker mt-1">
                    Identificador interno visible en métricas y timeline de los contactos.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-sf-text uppercase">
                      Seleccionar Plantilla de Correo *
                    </label>
                    <button
                      type="button"
                      onClick={() => setAiModalOpen(true)}
                      className="text-xs text-sf-brand font-semibold hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Redactar con IA
                    </button>
                  </div>
                  <select
                    value={newCampaign.template_id}
                    onChange={(e) => setNewCampaign({ ...newCampaign, template_id: e.target.value })}
                    className="input w-full"
                  >
                    <option value="">-- Elige una plantilla --</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (Asunto: {t.subject})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Provider Selection Cards */}
              <div>
                <label className="block text-xs font-bold text-sf-text uppercase mb-2">
                  Proveedor de Envíos (ESP) *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {PROVIDER_OPTIONS.map((p) => {
                    const selected = newCampaign.provider_used === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setNewCampaign({ ...newCampaign, provider_used: p.id })}
                        className={`p-3.5 rounded-sf border cursor-pointer transition-all ${
                          selected
                            ? 'bg-sf-brand-50 border-sf-brand shadow-sm ring-2 ring-sf-brand'
                            : 'bg-white border-sf-border hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-xs text-sf-text">{p.name}</span>
                          <span className="badge badge-brand text-[9px]">{p.badge}</span>
                        </div>
                        <p className="text-[11px] text-sf-text-weak leading-snug">{p.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-sf-border">
                <Button
                  variant="brand"
                  disabled={!newCampaign.name || !newCampaign.template_id}
                  onClick={() => setWizardStep(2)}
                >
                  Continuar a Segmentación
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: Dynamic Segment Builder */}
          {wizardStep === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Filter Controls */}
                <div className="lg:col-span-2 space-y-4">
                  <h3 className="text-xs font-bold text-sf-text uppercase tracking-wider">
                    Criterios de Segmentación
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-sf-text mb-1">
                        Etapa del Embudo (Lifecycle Stage)
                      </label>
                      <select
                        value={newCampaign.target_stage}
                        onChange={(e) => setNewCampaign({ ...newCampaign, target_stage: e.target.value })}
                        className="input w-full text-xs"
                      >
                        <option value="ALL">Todo el Embudo (LEAD, PROSPECTO, POTENCIAL, CLIENTE)</option>
                        <option value="LEAD">LEAD (Bolsa Común / Nurturing)</option>
                        <option value="PROSPECTO">PROSPECTO (Contacto comercial efectivo)</option>
                        <option value="POTENCIAL">POTENCIAL (Negociación cuantificada activa)</option>
                        <option value="CLIENTE">CLIENTE (Histórico de pedidos en ERP)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-sf-text mb-1">
                        Tipología de Cliente
                      </label>
                      <select
                        value={newCampaign.client_type}
                        onChange={(e) => setNewCampaign({ ...newCampaign, client_type: e.target.value })}
                        className="input w-full text-xs"
                      >
                        <option value="">Cualquier tipo (Distribuidores y Clientes Finales)</option>
                        <option value="DISTRIBUIDOR">Solo Distribuidores Mayoristas</option>
                        <option value="CLIENTE_FINAL">Solo Clientes Finales (Canal Indirecto)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-sf-text mb-1">
                        Canal / Origen (Source)
                      </label>
                      <select
                        value={newCampaign.source}
                        onChange={(e) => setNewCampaign({ ...newCampaign, source: e.target.value })}
                        className="input w-full text-xs"
                      >
                        <option value="">Cualquier origen</option>
                        <option value="WEB_FORM">Formulario Web</option>
                        <option value="FERIA_BARCELONA">Feria / Evento</option>
                        <option value="CAMPAÑA_LINKEDIN">LinkedIn Ads</option>
                        <option value="IMPORTACION_MASIVA">Importación Masiva</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-sf-text mb-1">
                        Inactividad mínima (Días sin contacto)
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Ej. 30"
                        value={newCampaign.min_days_inactive}
                        onChange={(e) => setNewCampaign({ ...newCampaign, min_days_inactive: e.target.value })}
                        className="input w-full text-xs"
                      >
                      </input>
                    </div>

                    {newCampaign.target_stage === 'CLIENTE' && (
                      <div>
                        <label className="block text-xs font-semibold text-sf-text mb-1">
                          Cross-sell: Producto comprado en ERP
                        </label>
                        <input
                          type="text"
                          placeholder="Ej. PLC S7-1500, Paletizado..."
                          value={newCampaign.purchased_product}
                          onChange={(e) => setNewCampaign({ ...newCampaign, purchased_product: e.target.value })}
                          className="input w-full text-xs"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Live Audience Counter & Hygiene Exclusion */}
                <div className="bg-slate-50 border border-sf-border rounded-sf p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sf-text uppercase">Estimación de Audiencia</span>
                    {estimating && <Spinner size="sm" />}
                  </div>

                  {segmentEstimate ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-sf">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-900">Destinatarios Elegibles</span>
                          <span className="text-lg font-black text-emerald-700">
                            {segmentEstimate.eligible_count}
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-800 mt-0.5">
                          Cumplen RGPD (Opt-in activo) y tienen email verificado.
                        </p>
                      </div>

                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-sf text-xs space-y-1">
                        <div className="flex items-center justify-between text-rose-900 font-semibold">
                          <span>Excluidos por Baja (Opt-out):</span>
                          <span className="font-bold">{segmentEstimate.excluded_no_consent_count}</span>
                        </div>
                        <div className="flex items-center justify-between text-rose-900 font-semibold">
                          <span>Excluidos por Email Inválido:</span>
                          <span className="font-bold">{segmentEstimate.excluded_invalid_email_count}</span>
                        </div>
                      </div>

                      {segmentEstimate.sample_recipients.length > 0 && (
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-sf-text-weaker">
                            Muestra de Destinatarios:
                          </span>
                          <div className="mt-1 space-y-1">
                            {segmentEstimate.sample_recipients.map((s) => (
                              <div key={s.account_id} className="text-[11px] text-sf-text-weak truncate bg-white p-1.5 rounded border border-sf-border">
                                <strong>{s.company_name}</strong> ({s.email}) &bull; {s.stage}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-xs text-sf-text-weak">
                      Calculando métricas...
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-sf-border">
                <Button variant="neutral" onClick={() => setWizardStep(1)}>
                  Volver
                </Button>
                <Button
                  variant="brand"
                  disabled={!segmentEstimate || segmentEstimate.eligible_count === 0}
                  onClick={() => setWizardStep(3)}
                >
                  Revisar y Confirmar Envío ({segmentEstimate?.eligible_count || 0})
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Summary & Dispatch */}
          {wizardStep === 3 && (
            <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-sf-text">Confirmar Lanzamiento de Campaña</h3>
                <p className="text-xs text-sf-text-weak">
                  Se enviarán los correos personalizados con renderizado dinámico al segmento seleccionado.
                </p>
              </div>

              <div className="bg-slate-50 border border-sf-border rounded-sf p-4 space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-sf-border">
                  <span className="text-sf-text-weak">Campaña:</span>
                  <span className="font-bold text-sf-text">{newCampaign.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-sf-border">
                  <span className="text-sf-text-weak">Proveedor:</span>
                  <span className="font-bold text-sf-text uppercase">{newCampaign.provider_used}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-sf-border">
                  <span className="text-sf-text-weak">Etapa Objetivo:</span>
                  <span className="font-bold text-sf-text">{newCampaign.target_stage}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-sf-border">
                  <span className="text-sf-text-weak">Destinatarios Elegibles:</span>
                  <span className="font-bold text-emerald-700 text-sm">{segmentEstimate?.eligible_count} contactos</span>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-sf-border">
                <Button variant="neutral" onClick={() => setWizardStep(2)}>
                  Volver a Segmentación
                </Button>
                <Button
                  variant="brand"
                  disabled={sendingCampaign}
                  onClick={handleLaunchCampaign}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {sendingCampaign ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Despachando Envíos…
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      ¡Disparar Envío Ahora!
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 3: GESTOR DE PLANTILLAS DE CORREO                                */}
      {/* ========================================================================= */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Templates List */}
          <div className="lg:col-span-1 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-sf-border">
              <h3 className="text-sm font-bold text-sf-text">Plantillas Disponibles</h3>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAiModalOpen(true)}
                  className="text-xs py-1 h-7 text-sf-brand border-sf-brand/40 hover:bg-sf-brand-50"
                  title="Generar nueva plantilla con IA"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1" />
                  Redactar con IA
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingTemplate(null);
                    setTemplateForm({ name: '', subject: '', body_html: '', high_intent_links_str: '' });
                  }}
                  className="text-xs py-1 h-7"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Nueva
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {templates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className={`p-3.5 rounded-sf border bg-white text-xs space-y-2 transition-all ${
                    editingTemplate?.id === tmpl.id ? 'border-sf-brand ring-1 ring-sf-brand' : 'border-sf-border'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sf-text truncate">{tmpl.name}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditTemplate(tmpl)}
                        className="btn-icon-bare p-1 text-sf-brand"
                        title="Editar plantilla"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(tmpl.id)}
                        className="btn-icon-bare p-1 text-rose-600"
                        title="Eliminar plantilla"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-sf-text-weak truncate">
                    Asunto: <em>{tmpl.subject}</em>
                  </p>
                  {tmpl.high_intent_links?.length > 0 && (
                    <div className="flex items-center gap-1 text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      <Flame className="w-3 h-3 text-amber-600" />
                      {tmpl.high_intent_links.length} enlace(s) de Alta Intención
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right: Template Form & Live Preview */}
          <div className="lg:col-span-2">
            <Card className="bg-white border border-sf-border shadow-card p-5 space-y-4">
              <h3 className="text-sm font-bold text-sf-text">
                {editingTemplate ? `Editar Plantilla: ${editingTemplate.name}` : 'Crear Nueva Plantilla'}
              </h3>

              <form onSubmit={handleSaveTemplate} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-sf-text mb-1">Nombre Interno *</label>
                    <input
                      type="text"
                      value={templateForm.name}
                      onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                      placeholder="Ej. Nurturing Automatización 2026"
                      className="input w-full text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-sf-text mb-1">Asunto del Correo *</label>
                    <input
                      type="text"
                      value={templateForm.subject}
                      onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                      placeholder="Ej. Solución para {{empresa}} - Catálogo 2026"
                      className="input w-full text-xs"
                    />
                  </div>
                </div>

                {/* Variable inserter chips */}
                <div>
                  <span className="text-[11px] font-bold text-sf-text-weak uppercase tracking-wider block mb-1">
                    Variables Dinámicas (clic para insertar):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {VARIABLE_TAGS.map((v) => (
                      <button
                        key={v.tag}
                        type="button"
                        onClick={() => insertVariable(v.tag)}
                        className="px-2 py-1 rounded bg-slate-100 hover:bg-sf-brand-50 hover:text-sf-brand border border-sf-border text-[11px] font-mono transition-colors"
                      >
                        {v.tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Body HTML */}
                <div>
                  <label className="block text-xs font-bold text-sf-text mb-1">
                    Contenido HTML del Mensaje *
                  </label>
                  <textarea
                    rows={8}
                    value={templateForm.body_html}
                    onChange={(e) => setTemplateForm({ ...templateForm, body_html: e.target.value })}
                    placeholder="<p>Hola {{nombre}}, le presentamos nuestra propuesta para {{empresa}}...</p>"
                    className="input w-full font-mono text-xs leading-relaxed"
                  />
                </div>

                {/* High Intent Links */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Flame className="w-3.5 h-3.5 text-amber-600" />
                    <label className="text-xs font-bold text-sf-text">
                      Enlaces de Alta Intención (1 por línea)
                    </label>
                  </div>
                  <textarea
                    rows={2}
                    value={templateForm.high_intent_links_str}
                    onChange={(e) => setTemplateForm({ ...templateForm, high_intent_links_str: e.target.value })}
                    placeholder="https://nexus.com/solicitar-tarifa&#10;https://nexus.com/contactar-asesor"
                    className="input w-full font-mono text-xs"
                  />
                  <p className="text-[10px] text-sf-text-weaker mt-1">
                    Cualquier clic en estas URLs disparará inmediatamente una Tarea prioritaria en "Mi Día" para el comercial asignado.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-sf-border">
                  {editingTemplate && (
                    <Button
                      type="button"
                      variant="neutral"
                      size="sm"
                      onClick={() => {
                        setEditingTemplate(null);
                        setTemplateForm({ name: '', subject: '', body_html: '', high_intent_links_str: '' });
                      }}
                    >
                      Cancelar
                    </Button>
                  )}
                  <Button type="submit" variant="brand" size="sm" disabled={loading}>
                    {editingTemplate ? 'Actualizar Plantilla' : 'Guardar Plantilla'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL PREVISUALIZADOR DE EMAIL RENDERIZADO                               */}
      {/* ========================================================================= */}
      {previewRecipient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
          <div className="bg-white rounded-sf max-w-2xl w-full border border-sf-border shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-sf-border bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-sf-text">
                  Previsualización de Correo Renderizado
                </h3>
                <p className="text-xs text-sf-text-weak">
                  Para: <strong>{previewRecipient.email}</strong> ({previewRecipient.company_name})
                </p>
              </div>
              <button
                onClick={() => setPreviewRecipient(null)}
                className="btn-icon-bare p-1 text-sf-text-weaker hover:text-sf-text"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-sf-border bg-white text-xs space-y-1 font-mono">
              <div>
                <span className="text-sf-text-weaker">Asunto: </span>
                <span className="font-bold text-sf-text">{previewRecipient.rendered_subject}</span>
              </div>
              <div>
                <span className="text-sf-text-weaker">Estado actual: </span>
                <span>{getStatusBadge(previewRecipient.status)}</span>
              </div>
              {previewRecipient.event_details && (
                <div className="text-[11px] text-sf-text-weak italic">
                  Detalles: {previewRecipient.event_details}
                </div>
              )}
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
              <div
                className="bg-white p-6 rounded border border-sf-border shadow-sm text-sm"
                dangerouslySetInnerHTML={{ __html: previewRecipient.rendered_html }}
              />
            </div>

            <div className="p-3 border-t border-sf-border bg-slate-50 flex justify-end">
              <Button variant="neutral" size="sm" onClick={() => setPreviewRecipient(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: GENERADOR DE COPYS DE MAILING CON IA (CASO E)                     */}
      {/* ========================================================================= */}
      {aiModalOpen && (
        <Modal
          isOpen={aiModalOpen}
          onClose={() => setAiModalOpen(false)}
          title="Generador de Campañas y Copys con IA"
          size="lg"
        >
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-sf text-xs text-blue-900 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-sf-brand flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Redacción Estratégica B2B en HTML con Merge Tags</p>
                <p className="mt-0.5 text-blue-800">
                  Introduce una instrucción libre. La IA redactará el asunto, texto de previsualización y el cuerpo en HTML
                  adaptado para móviles con enlaces de Alta Intención y variables <code>{'{{nombre}}'}</code> y <code>{'{{empresa}}'}</code>.
                </p>
              </div>
            </div>

            <div>
              <label className="field-label" htmlFor="ai-mailing-prompt">
                Instrucción / Objetivo de la Campaña *
              </label>
              <textarea
                id="ai-mailing-prompt"
                rows={3}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ej. Campaña de reactivación para clientes que no compran desde hace 60 días ofreciendo tarifa blindada y portes gratis..."
                className="input w-full text-xs mt-1"
              />

              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                <span className="text-[10px] text-sf-text-weaker font-bold uppercase">Sugerencias:</span>
                <button
                  type="button"
                  onClick={() => setAiPrompt('Campaña de reactivación para clientes inactivos sin compras hace 60 días con oferta preferente')}
                  className="text-[10px] px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-medium"
                >
                  Reactivación Clientes 60d
                </button>
                <button
                  type="button"
                  onClick={() => setAiPrompt('Presentación de catálogo oficial y tarifas escalonadas para nuevos Leads B2B')}
                  className="text-[10px] px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-medium"
                >
                  Nurturing Nuevos Leads
                </button>
                <button
                  type="button"
                  onClick={() => setAiPrompt('Propuesta de cierre de mes con condiciones por volumen para cuentas Potenciales')}
                  className="text-[10px] px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-medium"
                >
                  Oferta Cierre Potenciales
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="field-label" htmlFor="ai-mailing-tone">
                  Tono del Mensaje
                </label>
                <select
                  id="ai-mailing-tone"
                  value={aiTone}
                  onChange={(e) => setAiTone(e.target.value)}
                  className="select mt-1"
                >
                  <option value="profesional y persuasivo">Profesional y Persuasivo</option>
                  <option value="directo y ejecutivo">Directo y Ejecutivo</option>
                  <option value="cercano y consultivo">Cercano y Consultivo</option>
                  <option value="urgencia comercial">Urgencia Comercial (Cierre de mes)</option>
                </select>
              </div>

              <div>
                <label className="field-label" htmlFor="ai-mailing-stage">
                  Etapa Objetivo
                </label>
                <select
                  id="ai-mailing-stage"
                  value={aiTargetStage}
                  onChange={(e) => setAiTargetStage(e.target.value)}
                  className="select mt-1"
                >
                  <option value="LEAD">Leads (Primer contacto)</option>
                  <option value="PROSPECTO">Prospectos (Cualificados)</option>
                  <option value="POTENCIAL">Potenciales (En negociación)</option>
                  <option value="CLIENTE">Clientes (Fidelización & Churn)</option>
                </select>
              </div>
            </div>

            {aiError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-sf text-xs text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{aiError}</span>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <Button
                variant="brand"
                disabled={aiGenerating || !aiPrompt.trim()}
                onClick={async () => {
                  setAiGenerating(true);
                  setAiError('');
                  try {
                    const res = await aiApi.generateCampaignCopy({
                      prompt: aiPrompt.trim(),
                      tone: aiTone,
                      target_stage: aiTargetStage,
                    });
                    setAiGeneratedCopy(res.data);
                  } catch (e) {
                    console.error(e);
                    setAiError(e.response?.data?.detail || 'Error al generar el copy con IA.');
                  } finally {
                    setAiGenerating(false);
                  }
                }}
                className="text-xs"
              >
                {aiGenerating ? <Spinner size="xs" className="mr-2" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
                <span>{aiGenerating ? 'Redactando con IA...' : 'Generar Copy y Plantilla'}</span>
              </Button>
            </div>

            {aiGeneratedCopy && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-sf space-y-3 animate-fade-in text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="font-bold text-sf-brand uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Propuesta Redactada con Éxito
                  </span>
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-medium">
                    Segmento recomendado: {aiGeneratedCopy.suggested_segment}
                  </span>
                </div>

                <div>
                  <span className="font-bold text-slate-800">Asunto:</span>
                  <p className="text-slate-700 italic font-medium mt-0.5">{aiGeneratedCopy.subject}</p>
                </div>

                <div>
                  <span className="font-bold text-slate-800">Previsualización:</span>
                  <p className="text-slate-600 mt-0.5">{aiGeneratedCopy.preview_text}</p>
                </div>

                <div>
                  <span className="font-bold text-slate-800 block mb-1">Vista Previa del HTML:</span>
                  <div
                    className="p-3 bg-white border border-slate-200 rounded max-h-48 overflow-y-auto text-xs"
                    dangerouslySetInnerHTML={{ __html: aiGeneratedCopy.html_content }}
                  />
                </div>

                {aiGeneratedCopy.tips?.length > 0 && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-amber-900 space-y-1">
                    <span className="font-bold block">Recomendaciones de entrega:</span>
                    <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                      {aiGeneratedCopy.tips.map((tip, i) => (
                        <li key={i}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                  <Button variant="neutral" size="sm" onClick={() => setAiModalOpen(false)}>
                    Descartar
                  </Button>
                  <Button
                    variant="brand"
                    size="sm"
                    onClick={() => {
                      setTemplateForm({
                        name: `Campaña IA: ${aiPrompt.slice(0, 32)}...`,
                        subject: aiGeneratedCopy.subject,
                        body_html: aiGeneratedCopy.html_content,
                        high_intent_links_str: 'https://nexus.com/solicitar-tarifa',
                      });
                      setAiModalOpen(false);
                      setActiveTab('templates');
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Check className="w-3.5 h-3.5 mr-1" />
                    Aplicar a la Plantilla
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

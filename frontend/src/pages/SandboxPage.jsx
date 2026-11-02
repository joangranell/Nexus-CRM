import React, { useState, useEffect } from 'react';
import { erpApi, accountsApi, webhooksApi, mailingApi } from '../services/api';
import {
  Cpu,
  Zap,
  Building2,
  DollarSign,
  Package,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  FileCode,
  ArrowRight,
  TrendingUp,
  ExternalLink,
  ShieldCheck,
  RotateCcw,
  Mail,
  Flame,
  MousePointerClick,
  Eye,
  Ban,
  UserX,
  Clock,
  Sparkles,
} from 'lucide-react';
import { ObjectIcon, StageBadge, ClientTypeBadge, Toast, Spinner, Modal } from '../components/ui';
import { formatCurrency, formatDateTime } from '../utils/format';
import AccountDrawer from '../components/AccountDrawer';

const PRESET_PRODUCTS = [
  'Perfil Tubular Acero 50x50',
  'Chapa Galvanizada 2mm',
  'Acero Inoxidable AISI 304',
  'Tornillería Industrial DIN 933',
  'Servicio Corte Láser Fibra',
  'Pintura Epoxi Industrial',
];

export default function SandboxPage() {
  const [sandboxTab, setSandboxTab] = useState('ERP'); // 'ERP' | 'MAILING'

  // ERP Simulator State
  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [taxIdInput, setTaxIdInput] = useState('');
  const [mode, setMode] = useState('ACCOUNT'); // 'ACCOUNT' | 'MANUAL_CIF'
  const [orderAmount, setOrderAmount] = useState(1450);
  const [orderStatus, setOrderStatus] = useState('CONFIRMADO');
  const [selectedProducts, setSelectedProducts] = useState([
    'Perfil Tubular Acero 50x50',
    'Chapa Galvanizada 2mm',
  ]);
  const [customProduct, setCustomProduct] = useState('');
  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [toast, setToast] = useState(null);

  // Drawer preview
  const [drawerAccountId, setDrawerAccountId] = useState(null);

  // Raw Webhook tester modal (ERP)
  const [webhookModalOpen, setWebhookModalOpen] = useState(false);
  const [webhookPayload, setWebhookPayload] = useState('');
  const [webhookSending, setWebhookSending] = useState(false);

  // Mailing Simulator State
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [recipients, setRecipients] = useState([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState('');
  const [simulatingMailing, setSimulatingMailing] = useState(false);
  const [mailingSimResult, setMailingSimResult] = useState(null);
  const [customLinkUrl, setCustomLinkUrl] = useState('https://nexus.com/solicitar-tarifa');
  const [mailingWebhookModalOpen, setMailingWebhookModalOpen] = useState(false);
  const [mailingWebhookPayload, setMailingWebhookPayload] = useState('');

  useEffect(() => {
    loadAccounts();
    loadOrders();
    loadCampaigns();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const res = await accountsApi.getAccounts({ limit: 100 });
      setAccounts(res.data || []);
      const pot = res.data.find((a) => a.lifecycle_stage === 'POTENCIAL');
      if (pot) {
        setSelectedAccountId(pot.id.toString());
      } else if (res.data.length > 0) {
        setSelectedAccountId(res.data[0].id.toString());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const loadOrders = async () => {
    try {
      setLoadingOrders(true);
      const res = await erpApi.getOrders({ limit: 20 });
      setOrders(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const loadCampaigns = async () => {
    try {
      const res = await mailingApi.getCampaigns();
      setCampaigns(res.data || []);
      if (res.data.length > 0) {
        setSelectedCampaignId(res.data[0].id.toString());
        loadRecipients(res.data[0].id);
      }
    } catch (err) {
      console.error('Error cargando campañas en sandbox:', err);
    }
  };

  const loadRecipients = async (campId) => {
    try {
      const res = await mailingApi.getCampaignRecipients(campId, { limit: 100 });
      setRecipients(res.data || []);
      if (res.data.length > 0) {
        setSelectedRecipientId(res.data[0].id.toString());
      } else {
        setSelectedRecipientId('');
      }
    } catch (err) {
      console.error('Error cargando destinatarios en sandbox:', err);
    }
  };

  const handleCampaignChange = (campId) => {
    setSelectedCampaignId(campId);
    loadRecipients(campId);
  };

  const handleToggleProduct = (prod) => {
    if (selectedProducts.includes(prod)) {
      if (selectedProducts.length > 1) {
        setSelectedProducts(selectedProducts.filter((p) => p !== prod));
      }
    } else {
      setSelectedProducts([...selectedProducts, prod]);
    }
  };

  const handleAddCustomProduct = (e) => {
    e.preventDefault();
    if (customProduct.trim() && !selectedProducts.includes(customProduct.trim())) {
      setSelectedProducts([...selectedProducts, customProduct.trim()]);
      setCustomProduct('');
    }
  };

  const handleSimulate = async () => {
    try {
      setSimulating(true);
      setSimulationResult(null);

      const payload = {
        order_amount: parseFloat(orderAmount) || 0,
        status: orderStatus,
        products: selectedProducts,
      };

      if (mode === 'ACCOUNT') {
        if (!selectedAccountId) {
          setToast({ message: 'Selecciona una cuenta', type: 'error' });
          setSimulating(false);
          return;
        }
        payload.account_id = parseInt(selectedAccountId, 10);
      } else {
        if (!taxIdInput.trim()) {
          setToast({ message: 'Indica un NIF/CIF válido', type: 'error' });
          setSimulating(false);
          return;
        }
        payload.tax_id = taxIdInput.trim();
      }

      const res = await erpApi.simulateOrder(payload);
      setSimulationResult(res.data);
      setToast({
        message: res.data.promoted_to_cliente
          ? `¡Éxito! Cuenta convertida a CLIENTE con pedido ${res.data.order_id}`
          : `Pedido ${res.data.order_id} inyectado en caché ERP`,
        type: 'success',
      });

      await Promise.all([loadAccounts(), loadOrders()]);
    } catch (err) {
      setToast({
        message: err.response?.data?.detail || 'Error al ejecutar la simulación',
        type: 'error',
      });
    } finally {
      setSimulating(false);
    }
  };

  // Mailing Simulator Trigger
  const handleSimulateMailingEvent = async (eventType) => {
    if (!selectedRecipientId) {
      setToast({ message: 'Selecciona un destinatario para simular', type: 'error' });
      return;
    }

    try {
      setSimulatingMailing(true);
      setMailingSimResult(null);

      const res = await mailingApi.simulateEvent({
        recipient_id: parseInt(selectedRecipientId, 10),
        event_type: eventType,
        url_clicked: eventType.includes('CLICK') ? customLinkUrl : null,
      });

      setMailingSimResult(res.data);
      setToast({
        message: res.data.message || `Evento ${eventType} procesado con éxito`,
        type: 'success',
      });

      // Reload recipients and accounts to reflect updated state/hygiene
      if (selectedCampaignId) {
        await loadRecipients(selectedCampaignId);
      }
      await loadAccounts();
    } catch (err) {
      setToast({
        message: err.response?.data?.detail || 'Error simulando evento de mailing',
        type: 'error',
      });
    } finally {
      setSimulatingMailing(false);
    }
  };

  const selectedAccount = accounts.find((a) => a.id.toString() === selectedAccountId);
  const selectedRecipient = recipients.find((r) => r.id.toString() === selectedRecipientId);

  const openWebhookModal = () => {
    const raw = {
      order_id: `PED-ERP-LIVE-${Math.floor(1000 + Math.random() * 9000)}`,
      tax_id: selectedAccount?.tax_id || 'B98765432',
      erp_customer_id: selectedAccount?.erp_customer_id || 'ERP-CLI-901',
      total_amount: orderAmount,
      status: orderStatus,
      order_date: new Date().toISOString(),
      top_products: selectedProducts,
      order_lines: selectedProducts.map((p, idx) => ({
        sku: `SKU-PROD-${idx + 1}`,
        description: p,
        quantity: 1,
        unit_price: roundTwo(orderAmount / selectedProducts.length),
        subtotal: roundTwo(orderAmount / selectedProducts.length),
      })),
    };
    setWebhookPayload(JSON.stringify(raw, null, 2));
    setWebhookModalOpen(true);
  };

  const handleSendWebhook = async () => {
    try {
      setWebhookSending(true);
      const parsed = JSON.parse(webhookPayload);
      const res = await webhooksApi.sendErpOrderWebhook(parsed);
      setToast({
        message: `Webhook procesado: ${res.data.message || 'OK'}`,
        type: 'success',
      });
      setWebhookModalOpen(false);
      await Promise.all([loadAccounts(), loadOrders()]);
    } catch (err) {
      setToast({
        message: err.response?.data?.detail || err.message || 'Error en envío webhook',
        type: 'error',
      });
    } finally {
      setWebhookSending(false);
    }
  };

  const openMailingWebhookModal = () => {
    const raw = {
      event_type: 'HIGH_INTENT_CLICKED',
      email: selectedRecipient?.email || 'mateo@tecnoiberia.es',
      recipient_id: selectedRecipient?.id || 1,
      campaign_id: selectedCampaignId ? parseInt(selectedCampaignId, 10) : 1,
      url_clicked: 'https://nexus.com/solicitar-tarifa',
      details: 'Webhook entrante simulado desde Mailchimp / Brevo',
    };
    setMailingWebhookPayload(JSON.stringify(raw, null, 2));
    setMailingWebhookModalOpen(true);
  };

  const handleSendMailingWebhook = async () => {
    try {
      const parsed = JSON.parse(mailingWebhookPayload);
      const res = await mailingApi.sendWebhookEvent(parsed);
      setToast({
        message: `Webhook Mailing procesado: ${res.data.message}`,
        type: 'success',
      });
      setMailingWebhookModalOpen(false);
      if (selectedCampaignId) loadRecipients(selectedCampaignId);
      loadAccounts();
    } catch (err) {
      setToast({
        message: err.response?.data?.detail || err.message || 'Error enviando webhook',
        type: 'error',
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Lightning Header */}
      <div className="slds-card p-5 bg-white border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Panel Sandbox de Simulación Integral
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Fases 2 & 3 Activas
                </span>
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Simulador de Eventos ERP & Mailing
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Valida en vivo las transiciones automáticas del embudo, la regla de oro Marketing-Ventas y la higiene RGPD.
              </p>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-md border border-slate-200">
            <button
              onClick={() => setSandboxTab('ERP')}
              className={`px-3 py-1.5 text-xs font-bold rounded transition-colors flex items-center gap-1.5 ${
                sandboxTab === 'ERP'
                  ? 'bg-white text-brand-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              Simulador ERP
            </button>
            <button
              onClick={() => setSandboxTab('MAILING')}
              className={`px-3 py-1.5 text-xs font-bold rounded transition-colors flex items-center gap-1.5 ${
                sandboxTab === 'MAILING'
                  ? 'bg-white text-brand-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Mail className="w-3.5 h-3.5 text-sf-brand" />
              Simulador Mailing & Puente Ventas
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECCIÓN 1: SIMULADOR DE EVENTOS DE MAILING & PUENTE MARKETING -> VENTAS   */}
      {/* ========================================================================= */}
      {sandboxTab === 'MAILING' && (
        <div className="space-y-6">
          {/* Banner Explicativo */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-sf p-4 shadow-sm flex items-start gap-3">
            <div className="p-2 rounded-full bg-amber-100 text-amber-700 shrink-0 mt-0.5">
              <Flame className="w-5 h-5" />
            </div>
            <div className="text-xs text-amber-900 space-y-1">
              <p className="font-bold text-amber-950 text-sm">
                Laboratorio de Pruebas: Regla de Oro Marketing-Ventas & Higiene de Datos
              </p>
              <p>
                Usa este panel para disparar eventos sobre destinatarios reales de campañas enviadas y comprobar cómo:
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                <li>
                  <strong>Clic de Alta Intención (🔥):</strong> Crea una <em>Tarea Prioritaria</em> en <strong>"Mi Día"</strong> para el comercial sin promocionar el Lead directamente a Potencial.
                </li>
                <li>
                  <strong>Rebote Definitivo (Hard Bounce):</strong> Marca de forma automática <code>email_valid = False</code> en la cuenta y anota el aviso en el Timeline.
                </li>
                <li>
                  <strong>Baja Voluntaria (Unsubscribe):</strong> Desactiva inmediatamente <code>opt_in_marketing = False</code> garantizando el cumplimiento RGPD.
                </li>
              </ul>
            </div>
          </div>

          {/* Feedback Banner if mailing simulated */}
          {mailingSimResult && (
            <div className="slds-card p-4 border-l-4 border-l-amber-500 bg-amber-50/60 border-amber-200 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    {mailingSimResult.message}
                  </h4>
                  <div className="flex items-center gap-4 text-xs text-slate-600 mt-1">
                    <span>Destinatario ID: <strong>{mailingSimResult.recipient_id}</strong></span>
                    <span>&bull;</span>
                    <span>Nuevo estado evento: <strong className="text-amber-800">{mailingSimResult.status}</strong></span>
                    <span>&bull;</span>
                    <span>
                      Etapa Cuenta: <strong className="text-slate-900">{mailingSimResult.account_stage}</strong>
                      {mailingSimResult.account_stage === 'LEAD' && (
                        <span className="ml-1 text-[11px] text-emerald-700 font-bold">(¡Permanece en LEAD según la Regla de Oro!)</span>
                      )}
                    </span>
                    <span>&bull;</span>
                    <span>Email Válido: <strong>{mailingSimResult.account_email_valid ? 'Sí' : 'No ❌'}</strong></span>
                    <span>&bull;</span>
                    <span>Consentimiento RGPD: <strong>{mailingSimResult.account_opt_in ? 'Activo' : 'Baja 🛑'}</strong></span>
                  </div>
                </div>

                {mailingSimResult.account_id && (
                  <button
                    onClick={() => setDrawerAccountId(mailingSimResult.account_id)}
                    className="slds-btn-neutral text-xs flex items-center gap-1 bg-white"
                  >
                    Ver Ficha Cuenta <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Grid: Simulator controls + live recipient list */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Controls */}
            <div className="lg:col-span-5 space-y-5">
              <div className="slds-card p-5 bg-white border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-sf-brand" /> Selector de Destinatario
                  </h2>
                  <button
                    onClick={openMailingWebhookModal}
                    className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1"
                  >
                    <FileCode className="w-3.5 h-3.5" /> Webhook Raw
                  </button>
                </div>

                {/* Campaign Select */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    1. Selecciona la Campaña de Mailing
                  </label>
                  <select
                    value={selectedCampaignId}
                    onChange={(e) => handleCampaignChange(e.target.value)}
                    className="slds-input text-xs w-full font-semibold"
                  >
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.status}) — {c.target_stage}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Recipient Select */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    2. Selecciona el Destinatario a Probar
                  </label>
                  {recipients.length === 0 ? (
                    <div className="p-3 bg-slate-50 border rounded text-xs text-slate-400">
                      Esta campaña no tiene destinatarios aún.
                    </div>
                  ) : (
                    <select
                      value={selectedRecipientId}
                      onChange={(e) => setSelectedRecipientId(e.target.value)}
                      className="slds-input text-xs w-full"
                    >
                      {recipients.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.account_company_name} — {r.email} ({r.account_stage}) [{r.status}]
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {selectedRecipient && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Empresa:</span>
                      <strong className="text-slate-900">{selectedRecipient.account_company_name}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Etapa Actual:</span>
                      <strong className="text-amber-800">{selectedRecipient.account_stage}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Estado Evento:</span>
                      <strong className="text-indigo-700">{selectedRecipient.status}</strong>
                    </div>
                  </div>
                )}

                {/* Custom URL for Click event */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    URL para el evento de Clic
                  </label>
                  <input
                    type="text"
                    value={customLinkUrl}
                    onChange={(e) => setCustomLinkUrl(e.target.value)}
                    placeholder="https://nexus.com/solicitar-tarifa"
                    className="slds-input text-xs w-full font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Si coincide con un enlace de "Alta Intención", el sistema creará la Tarea Prioritaria.
                  </p>
                </div>

                {/* Quick Action Simulation Buttons */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    Disparar Eventos de Simulación:
                  </span>

                  <button
                    disabled={simulatingMailing || !selectedRecipientId}
                    onClick={() => handleSimulateMailingEvent('HIGH_INTENT_CLICKED')}
                    className="w-full py-2.5 px-3 rounded font-bold text-xs bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center gap-2 shadow-sm transition-colors"
                  >
                    <Flame className="w-4 h-4" />
                    Simular Clic de Alta Intención ("Solicitar Tarifa") 🔥
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      disabled={simulatingMailing || !selectedRecipientId}
                      onClick={() => handleSimulateMailingEvent('OPENED')}
                      className="py-2 px-3 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Simular Apertura
                    </button>

                    <button
                      disabled={simulatingMailing || !selectedRecipientId}
                      onClick={() => handleSimulateMailingEvent('CLICKED')}
                      className="py-2 px-3 rounded text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <MousePointerClick className="w-3.5 h-3.5" />
                      Clic Estándar
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      disabled={simulatingMailing || !selectedRecipientId}
                      onClick={() => handleSimulateMailingEvent('HARD_BOUNCE')}
                      className="py-2 px-3 rounded text-xs font-semibold bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      Hard Bounce (Email Inválido)
                    </button>

                    <button
                      disabled={simulatingMailing || !selectedRecipientId}
                      onClick={() => handleSimulateMailingEvent('UNSUBSCRIBED')}
                      className="py-2 px-3 rounded text-xs font-semibold bg-slate-700 hover:bg-slate-800 text-white flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      Baja RGPD (Opt-out)
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Live Recipient Telemetry Stream */}
            <div className="lg:col-span-7 space-y-4">
              <div className="slds-card bg-white border border-slate-200 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-sf-brand" /> Destinatarios de la Campaña Seleccionada
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Observa cómo cambian los estados en tiempo real al simular eventos
                    </p>
                  </div>
                  <button
                    onClick={() => selectedCampaignId && loadRecipients(selectedCampaignId)}
                    className="p-1.5 text-slate-500 hover:text-slate-800 rounded transition-colors"
                    title="Actualizar"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2.5">Empresa</th>
                        <th className="px-4 py-2.5">Email</th>
                        <th className="px-4 py-2.5">Etapa Embudo</th>
                        <th className="px-4 py-2.5">Estado Evento</th>
                        <th className="px-4 py-2.5 text-center">Ficha 360º</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recipients.map((r) => (
                        <tr
                          key={r.id}
                          onClick={() => setSelectedRecipientId(r.id.toString())}
                          className={`cursor-pointer transition-colors ${
                            selectedRecipientId === r.id.toString()
                              ? 'bg-sf-brand-50/70 font-semibold'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="px-4 py-3 text-slate-900">{r.account_company_name}</td>
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{r.email}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.account_stage === 'LEAD' ? 'bg-blue-100 text-blue-800' :
                              r.account_stage === 'PROSPECTO' ? 'bg-purple-100 text-purple-800' :
                              r.account_stage === 'POTENCIAL' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {r.account_stage}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-[11px]">{r.status}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDrawerAccountId(r.account_id);
                              }}
                              className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-brand-600 transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECCIÓN 2: SIMULADOR DE PEDIDOS ERP (EXISTENTE)                           */}
      {/* ========================================================================= */}
      {sandboxTab === 'ERP' && (
        <div className="space-y-6">
          {/* Simulation Result Banner if available */}
          {simulationResult && (
            <div
              className={`slds-card p-5 border-l-4 animate-in fade-in slide-in-from-top-2 duration-300 ${
                simulationResult.promoted_to_cliente
                  ? 'border-l-emerald-500 bg-emerald-50/50 border-emerald-200'
                  : 'border-l-blue-500 bg-blue-50/50 border-blue-200'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  {simulationResult.promoted_to_cliente ? (
                    <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      {simulationResult.message}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-600">
                      <span>
                        Pedido: <strong>{simulationResult.order_id}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Importe:{' '}
                        <strong>{formatCurrency(simulationResult.total_amount)}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Estado: <strong className="text-emerald-700">{simulationResult.status}</strong>
                      </span>
                      {simulationResult.billing_account_name && (
                        <>
                          <span>•</span>
                          <span className="text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                            Factura emitida a Distribuidor: <strong>{simulationResult.billing_account_name}</strong>
                          </span>
                        </>
                      )}
                      {simulationResult.promoted_to_cliente && (
                        <>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded">
                            <Zap className="w-3 h-3 fill-emerald-600" /> Promovida a CLIENTE
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {simulationResult.account_id && (
                  <button
                    onClick={() => setDrawerAccountId(simulationResult.account_id)}
                    className="slds-btn-neutral text-xs flex items-center gap-1.5 bg-white shrink-0 self-start sm:self-center"
                  >
                    Abrir Visor ERP 360º <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Main Grid: Form + Live Stream */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Simulator Controls */}
            <div className="lg:col-span-5 space-y-6">
              <div className="slds-card p-5 bg-white border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" /> Parámetros del Pedido Sintético
                  </h2>
                  <span className="text-[11px] text-slate-400">Sandbox Local</span>
                </div>

                <div className="space-y-4">
                  {/* Mode switch */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Destinatario del Pedido
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setMode('ACCOUNT')}
                        className={`py-2 px-3 text-xs font-semibold rounded-md border text-center transition-colors ${
                          mode === 'ACCOUNT'
                            ? 'bg-brand-50 border-brand-500 text-brand-700'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Cuenta CRM Existente
                      </button>
                      <button
                        type="button"
                        onClick={() => setMode('MANUAL_CIF')}
                        className={`py-2 px-3 text-xs font-semibold rounded-md border text-center transition-colors ${
                          mode === 'MANUAL_CIF'
                            ? 'bg-brand-50 border-brand-500 text-brand-700'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Por NIF / CIF Manual
                      </button>
                    </div>
                  </div>

                  {/* Account select or NIF input */}
                  {mode === 'ACCOUNT' ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Seleccionar Cuenta objetivo
                      </label>
                      {loadingAccounts ? (
                        <Spinner size="sm" label="Cargando cuentas..." />
                      ) : (
                        <select
                          value={selectedAccountId}
                          onChange={(e) => setSelectedAccountId(e.target.value)}
                          className="slds-input text-xs w-full"
                        >
                          <optgroup label="Cuentas POTENCIAL (Recomendado para probar conversión)">
                            {accounts
                              .filter((a) => a.lifecycle_stage === 'POTENCIAL')
                              .map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.company_name} (CIF: {a.tax_id || 'Sin CIF'}) — {a.lifecycle_stage} {a.client_type ? `[${a.client_type}]` : ''}
                                </option>
                              ))}
                          </optgroup>
                          <optgroup label="Cuentas PROSPECTO (Cualificadas comercialmente)">
                            {accounts
                              .filter((a) => a.lifecycle_stage === 'PROSPECTO')
                              .map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.company_name} (CIF: {a.tax_id || 'Sin CIF'}) — PROSPECTO {a.client_type ? `[${a.client_type}]` : ''}
                                </option>
                              ))}
                          </optgroup>
                          <optgroup label="Leads">
                            {accounts
                              .filter((a) => a.lifecycle_stage === 'LEAD')
                              .map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.company_name} (CIF: {a.tax_id || 'Sin CIF'}) — LEAD
                                </option>
                              ))}
                          </optgroup>
                          <optgroup label="Ya Clientes">
                            {accounts
                              .filter((a) => a.lifecycle_stage === 'CLIENTE')
                              .map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.company_name} (ERP: {a.erp_customer_id || a.tax_id}) — CLIENTE {a.client_type ? `[${a.client_type}]` : ''}
                                </option>
                              ))}
                          </optgroup>
                        </select>
                      )}
                      {selectedAccount && (
                        <div className="mt-2 p-2.5 rounded bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              {selectedAccount.company_name}
                              <ClientTypeBadge type={selectedAccount.client_type} />
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              CIF: {selectedAccount.tax_id || 'No asignado'} • ERP:{' '}
                              {selectedAccount.erp_customer_id || 'Pendiente de ERP'}
                              {(selectedAccount.client_type === 'CLIENTE_FINAL' || selectedAccount.client_type === 'CDI') && selectedAccount.billing_account_name && (
                                <span className="ml-2 text-teal-700">
                                  • Factura a: <strong>{selectedAccount.billing_account_name}</strong>
                                </span>
                              )}
                            </div>
                          </div>
                          <StageBadge stage={selectedAccount.lifecycle_stage} />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        NIF / CIF del Cliente en ERP
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. B87654321 o A12345678"
                        value={taxIdInput}
                        onChange={(e) => setTaxIdInput(e.target.value)}
                        className="slds-input text-xs w-full"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        El motor buscará si este CIF corresponde a una cuenta existente para asociar el
                        pedido y promoverla.
                      </p>
                    </div>
                  )}

                  {/* Order Amount */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Importe Total del Pedido (€)
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-xs font-bold">
                        €
                      </span>
                      <input
                        type="number"
                        min="1"
                        step="10"
                        value={orderAmount}
                        onChange={(e) => setOrderAmount(e.target.value)}
                        className="slds-input text-xs w-full pl-8"
                      />
                    </div>
                    {/* Presets */}
                    <div className="flex gap-1.5 mt-2">
                      {[250, 850, 2400, 7800, 15000].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setOrderAmount(val)}
                          className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                        >
                          €{val.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Order Status */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Estado del Pedido en el ERP
                    </label>
                    <select
                      value={orderStatus}
                      onChange={(e) => setOrderStatus(e.target.value)}
                      className="slds-input text-xs w-full font-semibold"
                    >
                      <option value="CONFIRMADO">
                        CONFIRMADO (Promueve a CLIENTE de forma inmediata)
                      </option>
                      <option value="FACTURADO">FACTURADO (Promueve a CLIENTE)</option>
                      <option value="PENDIENTE">PENDIENTE (Guarda en caché, no promueve)</option>
                      <option value="CANCELADO">CANCELADO (Ignorado para conversión)</option>
                    </select>
                  </div>

                  {/* Product lines selection */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Productos / Familias en el Pedido
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {PRESET_PRODUCTS.map((prod) => {
                        const active = selectedProducts.includes(prod);
                        return (
                          <button
                            key={prod}
                            type="button"
                            onClick={() => handleToggleProduct(prod)}
                            className={`text-[11px] px-2.5 py-1 rounded-full border transition-all ${
                              active
                                ? 'bg-brand-600 text-white border-brand-600 font-semibold shadow-xs'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {active ? '✓ ' : '+ '}
                            {prod}
                          </button>
                        );
                      })}
                    </div>

                    <form onSubmit={handleAddCustomProduct} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Añadir producto personalizado..."
                        value={customProduct}
                        onChange={(e) => setCustomProduct(e.target.value)}
                        className="slds-input text-xs flex-1"
                      />
                      <button type="submit" className="slds-btn-neutral text-xs">
                        Añadir
                      </button>
                    </form>
                  </div>

                  {/* Action Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={simulating}
                      onClick={handleSimulate}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
                    >
                      {simulating ? (
                        <Spinner size="sm" label="Inyectando pedido..." />
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Inyectar Pedido ERP & Evaluar Transición
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Live Cached Orders Stream */}
            <div className="lg:col-span-7 space-y-4">
              <div className="slds-card bg-white border border-slate-200 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-600" /> Registro de Pedidos ERP en Caché
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Mostrando los últimos 20 pedidos sincronizados desde el ERP o simulados
                    </p>
                  </div>
                  <button
                    onClick={loadOrders}
                    disabled={loadingOrders}
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
                    title="Refrescar lista"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingOrders ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {loadingOrders ? (
                  <div className="p-8 text-center">
                    <Spinner label="Consultando caché ERP..." />
                  </div>
                ) : orders.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No hay pedidos en la caché aún. ¡Ejecuta una simulación a la izquierda!
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2.5">ID Pedido</th>
                          <th className="px-4 py-2.5">Empresa / CIF</th>
                          <th className="px-4 py-2.5">Fecha</th>
                          <th className="px-4 py-2.5 text-right">Importe</th>
                          <th className="px-4 py-2.5 text-center">Estado</th>
                          <th className="px-4 py-2.5">Productos</th>
                          <th className="px-4 py-2.5 text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {orders.map((o) => (
                          <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 font-mono font-bold text-brand-700">
                              {o.order_id}
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-semibold text-slate-900">
                                {o.account_company_name || 'Desconocida'}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {o.tax_id || o.erp_customer_id || '—'}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                              {formatDateTime(o.order_date)}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-slate-800 whitespace-nowrap">
                              {formatCurrency(o.total_amount)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                  o.status === 'CONFIRMADO' || o.status === 'FACTURADO'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : o.status === 'PENDIENTE'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {o.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                              {Array.isArray(o.top_products) && o.top_products.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {o.top_products.slice(0, 2).map((p, idx) => (
                                    <span
                                      key={idx}
                                      className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded text-[10px]"
                                    >
                                      {p}
                                    </span>
                                  ))}
                                  {o.top_products.length > 2 && (
                                    <span className="text-[10px] text-slate-400">
                                      +{o.top_products.length - 2}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {o.account_id ? (
                                <button
                                  onClick={() => setDrawerAccountId(o.account_id)}
                                  className="p-1 hover:bg-slate-200 rounded text-slate-600 hover:text-brand-600 transition-colors"
                                  title="Abrir Visor ERP 360º de la cuenta"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-300">N/A</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drawer for 360 viewer */}
      {drawerAccountId && (
        <AccountDrawer
          accountId={drawerAccountId}
          isOpen={true}
          onClose={() => setDrawerAccountId(null)}
          onAccountUpdated={() => {
            loadAccounts();
            loadOrders();
          }}
        />
      )}

      {/* Modal: External Webhook Tester ERP */}
      <Modal
        isOpen={webhookModalOpen}
        onClose={() => setWebhookModalOpen(false)}
        title="Probar Webhook Externo ERP (POST /api/webhooks/erp/order)"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Simula el payload JSON exacto que un ERP como SAP, Navision o Sage enviaría mediante HTTP
            POST a nuestro endpoint protegido con la clave de API (
            <code>X-API-Key: nexus_webhook_secret_key_2026</code>).
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Payload JSON</label>
            <textarea
              rows={12}
              value={webhookPayload}
              onChange={(e) => setWebhookPayload(e.target.value)}
              className="w-full font-mono text-xs p-3 bg-slate-900 text-slate-100 rounded border border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => setWebhookModalOpen(false)}
              className="slds-btn-neutral text-xs"
            >
              Cancelar
            </button>
            <button
              onClick={handleSendWebhook}
              disabled={webhookSending}
              className="slds-btn-brand text-xs flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700"
            >
              {webhookSending ? (
                <Spinner size="sm" label="Enviando..." />
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" /> Enviar Webhook
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: External Webhook Tester Mailing */}
      <Modal
        isOpen={mailingWebhookModalOpen}
        onClose={() => setMailingWebhookModalOpen(false)}
        title="Probar Webhook Universal de Mailing (POST /api/webhooks/mailing/event)"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Simula el payload recibido desde Mailchimp, Brevo o Resend notificando eventos de apertura,
            clic, rebote definitivo o baja.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Payload JSON</label>
            <textarea
              rows={10}
              value={mailingWebhookPayload}
              onChange={(e) => setMailingWebhookPayload(e.target.value)}
              className="w-full font-mono text-xs p-3 bg-slate-900 text-slate-100 rounded border border-slate-700 focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => setMailingWebhookModalOpen(false)}
              className="slds-btn-neutral text-xs"
            >
              Cancelar
            </button>
            <button
              onClick={handleSendMailingWebhook}
              className="slds-btn-brand text-xs flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Send className="w-3.5 h-3.5" /> Despachar Webhook
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function roundTwo(num) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

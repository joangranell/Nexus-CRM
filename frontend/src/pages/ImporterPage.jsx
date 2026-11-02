import React, { useState, useEffect, useRef } from 'react';
import { importsApi, authApi } from '../services/api';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Check,
  RefreshCw,
  FileText,
  Users,
  ShieldAlert,
  Database,
  Building2,
  Download,
  Info,
} from 'lucide-react';
import { ObjectIcon, Toast, Spinner, Modal, ClientTypeBadge, StageBadge } from '../components/ui';
import { formatDateTime, displayName } from '../utils/format';

const TARGET_FIELDS = [
  { id: '', label: '-- Omitir columna --' },
  { id: 'company_name', label: 'Nombre de la Empresa (Obligatorio)', required: true },
  { id: 'contact_name', label: 'Persona de Contacto' },
  { id: 'tax_id', label: 'NIF / CIF / VAT' },
  { id: 'email', label: 'Correo Electrónico' },
  { id: 'phone', label: 'Teléfono Directo' },
  { id: 'lifecycle_stage', label: 'Etapa Funnel (LEAD, PROSPECTO, POTENCIAL, CLIENTE)' },
  { id: 'client_type', label: 'Tipo de Cliente (DISTRIBUIDOR o CLIENTE_FINAL)' },
  { id: 'distributor_ref', label: 'Distribuidor Mayorista (CIF o Nombre para Clientes Finales)' },
  { id: 'estimated_amount', label: 'Importe Estimado (€, requerido para Potencial)' },
  { id: 'expected_close_date', label: 'Fecha Estimada Cierre (requerida para Potencial)' },
  { id: 'source', label: 'Origen / Campaña' },
  { id: 'notes', label: 'Notas Comerciales / Observaciones' },
];

export default function ImporterPage() {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [batchDetail, setBatchDetail] = useState(null);
  const [mapping, setMapping] = useState({});
  const [analyzing, setAnalyzing] = useState(false);
  const [strategy, setStrategy] = useState('SKIP'); // SKIP, UPDATE_EMPTY, OVERWRITE
  const [assignUser, setAssignUser] = useState('');
  const [usersList, setUsersList] = useState([]);
  const [consolidating, setConsolidating] = useState(false);
  const [consolidationResult, setConsolidationResult] = useState(null);
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    authApi.getUsers().then((res) => setUsersList(res.data)).catch(console.error);
  }, []);

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await importsApi.uploadFile(fd);
      const detailRes = await importsApi.getBatchDetail(res.data.id);
      setBatchDetail(detailRes.data);
      setMapping(detailRes.data.batch.column_mapping || {});
      setStep(2);
      setToast({
        type: 'success',
        title: 'Archivo cargado en Staging',
        text: `Se han cargado ${res.data.total_rows} filas en la tabla temporal sin alterar la base principal.`,
      });
    } catch (e) {
      console.error(e);
      setToast({
        type: 'error',
        title: 'Error de carga',
        text: e.response?.data?.detail || 'No se pudo procesar el archivo subido.',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!mapping || Object.values(mapping).indexOf('company_name') === -1) {
      setToast({
        type: 'error',
        title: 'Mapeo incompleto',
        text: 'Debes asociar al menos una columna con "Nombre de la Empresa".',
      });
      return;
    }

    setAnalyzing(true);
    try {
      const res = await importsApi.mapAndAnalyze(batchDetail.batch.id, mapping);
      setBatchDetail(res.data);
      setStep(3);
    } catch (e) {
      console.error(e);
      setToast({
        type: 'error',
        title: 'Error de análisis',
        text: e.response?.data?.detail || 'Error normalizando los datos del lote.',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConsolidate = async () => {
    setConsolidating(true);
    try {
      const res = await importsApi.consolidate(
        batchDetail.batch.id,
        strategy,
        assignUser ? parseInt(assignUser, 10) : null
      );
      setConsolidationResult(res.data);
      setStep(4);
      setToast({
        type: 'success',
        title: 'Consolidación Completada',
        text: res.data.message,
      });
    } catch (e) {
      console.error(e);
      setToast({
        type: 'error',
        title: 'Error al consolidar',
        text: e.response?.data?.detail || 'No se pudo consolidar el lote.',
      });
    } finally {
      setConsolidating(false);
    }
  };

  const resetAll = () => {
    setStep(1);
    setFile(null);
    setBatchDetail(null);
    setMapping({});
    setConsolidationResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="p-3 max-w-[1500px] mx-auto space-y-3 animate-fade-in">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Header */}
      <section className="page-header">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ObjectIcon type="lead" />
            <div>
              <p className="page-header-eyebrow">Herramientas de Marketing y Administración</p>
              <h1 className="page-header-title">Módulo de Importación Masiva en 4 Etapas</h1>
            </div>
          </div>

          <button onClick={resetAll} className="btn-neutral btn-sm">
            <RefreshCw className="w-3.5 h-3.5" />
            Nueva Importación
          </button>
        </div>

        {/* Wizard Stepper */}
        <div className="mt-4 pt-3 border-t border-sf-border">
          <div className="grid grid-cols-4 gap-2 text-xs">
            {[
              { num: 1, title: '1. Subida & Staging', desc: 'CSV, XLSX, JSON' },
              { num: 2, title: '2. Mapeador', desc: 'Emparejar Columnas' },
              { num: 3, title: '3. Deduplicación', desc: 'Colisiones & Reglas' },
              { num: 4, title: '4. Consolidación', desc: 'Creación de Cuentas' },
            ].map((s) => (
              <div
                key={s.num}
                className={`p-2.5 rounded-sf border transition ${
                  step === s.num
                    ? 'border-sf-brand bg-sf-brand-50 shadow-sm'
                    : step > s.num
                    ? 'border-sf-success bg-sf-success-bg'
                    : 'border-sf-border bg-white opacity-60'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold">
                  {step > s.num ? (
                    <Check className="w-3.5 h-3.5 text-sf-success" />
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-sf-brand text-white flex items-center justify-center text-[10px]">
                      {s.num}
                    </span>
                  )}
                  <span className="text-sf-text">{s.title}</span>
                </div>
                <p className="text-[11px] text-sf-text-weak mt-0.5 truncate">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ETAPA 1: SUBIDA */}
      {step === 1 && (
        <div className="card p-6 space-y-5">
          <div>
            <h2 className="text-base font-bold text-sf-text">Etapa 1: Subida de Archivo y Aislamiento en Staging</h2>
            <p className="text-xs text-sf-text-weak mt-1 leading-relaxed">
              Sube tu base de datos de prospectos en formato <strong>.CSV</strong>, <strong>.XLSX (Excel)</strong> o <strong>.JSON</strong>.
              Las filas se almacenan en una tabla temporal de cuarentena (<em>Staging</em>) para no ensuciar el CRM hasta que valides el mapeo.
            </p>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-sf-border-strong rounded-sf p-10 text-center hover:border-sf-brand hover:bg-sf-brand-50/40 cursor-pointer transition flex flex-col items-center justify-center gap-3"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".csv,.xlsx,.xls,.json"
              className="hidden"
            />
            <div className="w-14 h-14 rounded-full bg-sf-brand-50 text-sf-brand flex items-center justify-center">
              <UploadCloud className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-bold text-sf-text">
                {file ? file.name : 'Haz clic para seleccionar o arrastra un archivo aquí'}
              </p>
              <p className="text-xs text-sf-text-weak mt-1">
                Formatos compatibles: .CSV (con comas o punto y coma), hojas de cálculo Excel (.XLSX) y JSON
              </p>
            </div>
            {file && (
              <span className="badge bg-sf-brand-50 text-sf-brand text-xs font-mono">
                {(file.size / 1024).toFixed(1)} KB seleccionado
              </span>
            )}
          </div>

          {/* Banner de archivos de ejemplo */}
          <div className="p-3.5 bg-sf-bg-alt border border-sf-border rounded-sf flex items-start gap-3">
            <FileSpreadsheet className="w-5 h-5 text-sf-brand flex-shrink-0 mt-0.5" />
            <div className="text-xs text-sf-text-weak space-y-1">
              <p className="font-bold text-sf-text">Archivos de prueba disponibles en el repositorio:</p>
              <p>
                Puedes probar la carga directamente usando los archivos generados en la carpeta <code className="font-mono text-xs bg-white px-1 py-0.5 border border-sf-border rounded">ejemplos_importacion/</code>:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-sf-text">
                <li><code className="font-mono text-xs">prospectos_sector_metal.csv</code> (delimitador ;)</li>
                <li><code className="font-mono text-xs">base_clientes_antiguos.xlsx</code> (Excel con colisiones intencionadas)</li>
                <li><code className="font-mono text-xs">contactos_feria_industrial.json</code> (JSON estructurado)</li>
              </ul>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="btn-brand"
            >
              {uploading ? 'Procesando archivo…' : 'Cargar en Staging y Continuar'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ETAPA 2: MAPEADOR DINÁMICO */}
      {step === 2 && batchDetail && (
        <div className="card p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-bold text-sf-text">Etapa 2: Mapeador Dinámico de Columnas</h2>
              <p className="text-xs text-sf-text-weak mt-1">
                Empareja cada columna detectada en <strong className="text-sf-text font-mono">{batchDetail.batch.filename}</strong> ({batchDetail.batch.total_rows} filas) con los campos internos del CRM.
              </p>
            </div>
            <button onClick={() => setStep(1)} className="btn-neutral btn-sm">
              <ArrowLeft className="w-3.5 h-3.5" />
              Cambiar Archivo
            </button>
          </div>

          <div className="border border-sf-border rounded-sf overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Columna en tu Archivo</th>
                  <th>Primer Valor Detectado (Muestra)</th>
                  <th>Campo Destino en Nexus CRM</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {(batchDetail.batch.detected_columns || []).map((col) => {
                  const sampleVal = batchDetail.rows_sample?.[0]?.raw_data?.[col] || '—';
                  const currentMapped = mapping[col] || '';
                  return (
                    <tr key={col}>
                      <td className="font-semibold text-sf-text font-mono">{col}</td>
                      <td className="text-sf-text-weak max-w-xs truncate">{String(sampleVal)}</td>
                      <td>
                        <select
                          value={currentMapped}
                          onChange={(e) => setMapping({ ...mapping, [col]: e.target.value })}
                          className="select w-72"
                        >
                          {TARGET_FIELDS.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-3.5 bg-sf-brand-50 border border-sf-border rounded-sf flex items-start gap-2.5 text-xs text-sf-brand-darker">
            <Info className="w-4 h-4 text-sf-brand flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Reglas avanzadas de negocio en la importación:</p>
              <ul className="list-disc list-inside space-y-0.5 text-sf-text">
                <li><strong>Salvaguarda de Forecasting:</strong> Filas mapeadas como <em>Potencial</em> que carezcan de importe estimado o fecha de cierre se degradan preventivamente a <em>Prospecto</em>.</li>
                <li><strong>Jerarquía Distribuidor / Cliente Final:</strong> Si importa clientes finales (canal indirecto), mapee la columna del Distribuidor asociado. El sistema resolverá las dependencias procesando primero a los mayoristas.</li>
              </ul>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-sf-text-weaker">
              * El campo <strong>Nombre de la Empresa</strong> es obligatorio para poder consolidar el lote.
            </p>
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="btn-brand"
            >
              {analyzing ? 'Normalizando y Analizando Colisiones…' : 'Analizar Colisiones y Normalizar'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ETAPA 3: REVISIÓN DE DEDUPLICACIÓN Y COLISIONES */}
      {step === 3 && batchDetail && (
        <div className="card p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-bold text-sf-text">Etapa 3: Limpieza E.164, Deduplicación y Jerarquía Comercial</h2>
              <p className="text-xs text-sf-text-weak mt-1">
                El motor ha normalizado teléfonos al formato internacional E.164, limpiado CIFs, evaluado duplicados y resuelto relaciones Cliente Final ↔ Distribuidor.
              </p>
            </div>
            <button onClick={() => setStep(2)} className="btn-neutral btn-sm">
              <ArrowLeft className="w-3.5 h-3.5" />
              Modificar Mapeo
            </button>
          </div>

          {/* Scorecard de Colisiones */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-3 bg-white border border-sf-border rounded-sf">
              <span className="text-[11px] text-sf-text-weak uppercase font-semibold">Filas Limpias</span>
              <p className="text-xl font-bold text-sf-success mt-1">{batchDetail.stats.clean_rows}</p>
              <p className="text-[10px] text-sf-text-weaker">Sin duplicados en el CRM</p>
            </div>

            <div className="p-3 bg-white border border-sf-border rounded-sf">
              <span className="text-[11px] text-sf-text-weak uppercase font-semibold">Colisión CIF Exacto</span>
              <p className="text-xl font-bold text-sf-warning mt-1">{batchDetail.stats.collisions_exact_tax}</p>
              <p className="text-[10px] text-sf-text-weaker">Mismo CIF ya registrado</p>
            </div>

            <div className="p-3 bg-white border border-sf-border rounded-sf">
              <span className="text-[11px] text-sf-text-weak uppercase font-semibold">Colisión Email</span>
              <p className="text-xl font-bold text-sf-warning mt-1">{batchDetail.stats.collisions_exact_email}</p>
              <p className="text-[10px] text-sf-text-weaker">Mismo correo ya existente</p>
            </div>

            <div className="p-3 bg-white border border-sf-border rounded-sf">
              <span className="text-[11px] text-sf-text-weak uppercase font-semibold">Colisión Nombre Difuso</span>
              <p className="text-xl font-bold text-[#ba0517] mt-1">{batchDetail.stats.collisions_fuzzy_name}</p>
              <p className="text-[10px] text-sf-text-weaker">Similitud fonética &gt; 88%</p>
            </div>
          </div>

          {/* Métricas de Etapa y Tipología Detectadas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-3 bg-white border border-sf-border rounded-sf">
              <span className="text-[11px] text-sf-text-weak uppercase font-semibold">Distribuidores Mayoristas</span>
              <p className="text-xl font-bold text-indigo-700 mt-1">{batchDetail.stats.distributor_rows || 0}</p>
              <p className="text-[10px] text-sf-text-weaker">Procesados en 1ª pasada</p>
            </div>

            <div className="p-3 bg-white border border-sf-border rounded-sf">
              <span className="text-[11px] text-sf-text-weak uppercase font-semibold">Clientes Finales</span>
              <p className="text-xl font-bold text-teal-700 mt-1">{batchDetail.stats.final_client_rows || batchDetail.stats.cdi_rows || 0}</p>
              <p className="text-[10px] text-sf-text-weaker">Vinculados a distribuidor</p>
            </div>

            <div className="p-3 bg-white border border-sf-border rounded-sf">
              <span className="text-[11px] text-sf-text-weak uppercase font-semibold">Prospectos Sugeridos</span>
              <p className="text-xl font-bold text-purple-700 mt-1">{batchDetail.stats.suggested_prospectos || 0}</p>
              <p className="text-[10px] text-sf-text-weaker">Cualificados o degradados</p>
            </div>

            <div className="p-3 bg-white border border-sf-border rounded-sf">
              <span className="text-[11px] text-sf-text-weak uppercase font-semibold">Avisos / Diagnósticos</span>
              <p className={`text-xl font-bold mt-1 ${batchDetail.stats.rows_with_errors > 0 ? 'text-amber-600' : 'text-sf-text-weaker'}`}>
                {batchDetail.stats.rows_with_errors || 0}
              </p>
              <p className="text-[10px] text-sf-text-weaker">Salvaguarda o falta de mayorista</p>
            </div>
          </div>

          {/* Tabla de Muestra con Badges */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-sf-text uppercase tracking-wider">
              Muestra de Normalización, Jerarquía y Etapa Sugerida
            </h3>
            <div className="border border-sf-border rounded-sf overflow-x-auto max-h-80">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Empresa Normalizada</th>
                    <th>Tipo / Jerarquía</th>
                    <th>CIF</th>
                    <th>Teléfono E.164</th>
                    <th>Colisión</th>
                    <th>Etapa Sugerida</th>
                    <th>Diagnóstico / Avisos</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {(batchDetail.rows_sample || []).map((r) => {
                    const norm = r.normalized_data || {};
                    return (
                      <tr key={r.id}>
                        <td className="text-sf-text-weaker">{r.row_index}</td>
                        <td className="font-semibold text-sf-text">{norm.company_name}</td>
                        <td className="whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            <ClientTypeBadge type={norm.client_type} />
                            {(norm.client_type === 'CLIENTE_FINAL' || norm.client_type === 'CDI') && norm.distributor_ref && (
                              <span className="text-[10px] text-teal-800" title={`Distribuidor: ${norm.distributor_ref}`}>
                                Dist: <strong>{norm.distributor_ref}</strong>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="font-mono text-sf-text-weak">{norm.tax_id || '—'}</td>
                        <td className="font-mono text-sf-text-weak">{norm.phone || '—'}</td>
                        <td>
                          {r.collision_type === 'NONE' ? (
                            <span className="badge bg-sf-success-bg text-sf-success text-[10px]">
                              NUEVA
                            </span>
                          ) : (
                            <span className="badge bg-sf-warning-bg text-[#8c4b02] text-[10px]">
                              {r.collision_type}
                              {r.matched_account_name ? ` (${r.matched_account_name})` : ''}
                            </span>
                          )}
                        </td>
                        <td>
                          <StageBadge stage={r.suggested_stage} />
                        </td>
                        <td>
                          {r.error_message ? (
                            <span className="text-[11px] text-amber-700 font-medium bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 block max-w-xs truncate" title={r.error_message}>
                              ⚠ {r.error_message}
                            </span>
                          ) : (
                            <span className="text-sf-text-weaker text-[11px]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Selector de Estrategia de Resolución */}
          <div className="p-4 bg-sf-bg border border-sf-border rounded-sf space-y-3">
            <h3 className="text-xs font-bold text-sf-text uppercase tracking-wider">
              Estrategia de Resolución para Filas Duplicadas
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'SKIP',
                  title: 'Omitir Duplicados (Recomendado)',
                  desc: 'Las filas que coincidan por CIF o email se descartan; solo se crean las cuentas nuevas.',
                },
                {
                  id: 'UPDATE_EMPTY',
                  title: 'Rellenar Campos Vacíos',
                  desc: 'Si la cuenta existente no tenía teléfono o persona de contacto, se completa con el archivo.',
                },
                {
                  id: 'OVERWRITE',
                  title: 'Sobrescribir Datos',
                  desc: 'Actualiza los datos del cliente existente con los valores nuevos del archivo importado.',
                },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`p-3 rounded-sf border cursor-pointer transition flex items-start gap-2.5 ${
                    strategy === opt.id
                      ? 'border-sf-brand bg-white shadow-sm ring-1 ring-sf-brand'
                      : 'border-sf-border bg-white hover:border-sf-border-strong'
                  }`}
                >
                  <input
                    type="radio"
                    name="strategy"
                    value={opt.id}
                    checked={strategy === opt.id}
                    onChange={(e) => setStrategy(e.target.value)}
                    className="mt-0.5 accent-[#0176d3]"
                  />
                  <div>
                    <strong className="block text-xs text-sf-text">{opt.title}</strong>
                    <span className="text-[11px] text-sf-text-weak leading-snug mt-0.5 block">
                      {opt.desc}
                    </span>
                  </div>
                </label>
              ))}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-sf-text-weak">Asignar cuentas no-lead a:</span>
                <select
                  value={assignUser}
                  onChange={(e) => setAssignUser(e.target.value)}
                  className="select w-60 text-xs"
                >
                  <option value="">Bolsa común / Sin propietario específico</option>
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {displayName(u.name)} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleConsolidate}
                disabled={consolidating}
                className="btn-brand"
              >
                {consolidating ? 'Consolidando en Base de Datos…' : 'Ejecutar Consolidación Definitiva'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ETAPA 4: RESULTADO DE CONSOLIDACIÓN */}
      {step === 4 && consolidationResult && (
        <div className="card p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-sf-success-bg text-sf-success flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="max-w-lg mx-auto">
            <h2 className="text-xl font-bold text-sf-text">¡Lote Consolidado Exitosamente!</h2>
            <p className="text-xs text-sf-text-weak mt-1">{consolidationResult.message}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 max-w-3xl mx-auto text-left">
            <div className="p-3 bg-sf-bg border border-sf-border rounded-sf">
              <span className="text-[11px] text-sf-text-weak uppercase">Leads Nuevos</span>
              <p className="text-xl font-bold text-sf-brand mt-1">{consolidationResult.created_leads}</p>
              <p className="text-[10px] text-sf-text-weaker">Bolsa Común</p>
            </div>

            <div className="p-3 bg-sf-bg border border-sf-border rounded-sf">
              <span className="text-[11px] text-sf-text-weak uppercase">Prospectos</span>
              <p className="text-xl font-bold text-purple-700 mt-1">{consolidationResult.created_prospectos || 0}</p>
              <p className="text-[10px] text-sf-text-weaker">Cualificados</p>
            </div>

            <div className="p-3 bg-sf-bg border border-sf-border rounded-sf">
              <span className="text-[11px] text-sf-text-weak uppercase">Potenciales</span>
              <p className="text-xl font-bold text-amber-700 mt-1">{consolidationResult.created_potenciales}</p>
              <p className="text-[10px] text-sf-text-weaker">Con Opp Activa</p>
            </div>

            <div className="p-3 bg-sf-bg border border-sf-border rounded-sf">
              <span className="text-[11px] text-sf-text-weak uppercase">Clientes ERP</span>
              <p className="text-xl font-bold text-sf-success mt-1">{consolidationResult.created_clientes}</p>
              <p className="text-[10px] text-sf-text-weaker">Con pedidos en caché</p>
            </div>

            <div className="p-3 bg-sf-bg border border-sf-border rounded-sf">
              <span className="text-[11px] text-sf-text-weak uppercase">Duplicados Omitidos</span>
              <p className="text-xl font-bold text-sf-text-weak mt-1">{consolidationResult.skipped_duplicates}</p>
              <p className="text-[10px] text-sf-text-weaker">Estrategia elegida</p>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-center gap-3">
            <button onClick={resetAll} className="btn-neutral">
              Importar otro archivo
            </button>
            <a href="/" className="btn-brand">
              Ir al Embudo Comercial
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// Etiquetas, colores y formateadores compartidos (locale es-ES)

export const STAGE_LABELS = {
  LEAD: 'Lead',
  PROSPECTO: 'Prospecto',
  POTENCIAL: 'Potencial',
  CLIENTE: 'Cliente',
  INACTIVO: 'Inactivo',
};

export const CLIENT_TYPE_LABELS = {
  DISTRIBUIDOR: 'Distribuidor',
  CLIENTE_FINAL: 'Cliente Final (Canal Indirecto)',
  CDI: 'Cliente Final (Canal Indirecto)',
};

export const clientTypeLabel = (t) => CLIENT_TYPE_LABELS[t] || t || '—';

export const SUB_STATUS = {
  SIN_CONTACTAR: { label: 'Sin contactar', dot: '#c9c9c9', badge: 'bg-[#ecebea] text-[#444]' },
  INTENTO_1: { label: 'Intento 1', dot: '#fe9339', badge: 'bg-[#fef1e0] text-[#8c4b02]' },
  INTENTO_2: { label: 'Intento 2', dot: '#dd7a01', badge: 'bg-[#fde2c4] text-[#7a3a00]' },
  CONTACTADO_CUALIFICANDO: {
    label: 'Cualificando',
    dot: '#0176d3',
    badge: 'bg-[#d8e6fe] text-[#014486]',
  },
  DESCARTADO: { label: 'Descartado', dot: '#ba0517', badge: 'bg-[#feded8] text-[#8e030f]' },
};

export const subStatusLabel = (s) => SUB_STATUS[s]?.label || s || '—';

export const INTERACTION_LABELS = {
  CALL_EFFECTIVE: 'Llamada efectiva',
  CALL_NO_ANSWER: 'Llamada sin respuesta',
  EMAIL_1TO1: 'Email 1 a 1',
  MEETING_VISIT: 'Reunión / visita',
  INBOUND_REPLY: 'Respuesta entrante',
  NOTE: 'Nota interna',
};

export const PRIORITY_LABELS = {
  NORMAL: 'Normal',
  HIGH_INTENT: 'Alta intención',
  CHURN_ALERT: 'Riesgo de baja',
};

export const OPP_STATUS_LABELS = {
  ABIERTA: 'Abierta',
  GANADA: 'Ganada',
  PERDIDA: 'Perdida',
};

export const SOURCE_LABELS = {
  WEB: 'Web',
  WEB_FORM: 'Formulario web',
};

export const sourceLabel = (s) =>
  SOURCE_LABELS[s] || (s ? s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' ') : '—');

const currencyFmt = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

export const formatCurrency = (n) => (n || n === 0 ? currencyFmt.format(n) : '—');

/**
 * El backend guarda fechas UTC "naive" (sin zona). Las interpretamos como UTC
 * para que se muestren correctamente en la zona horaria local del usuario.
 */
export const parseApiDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(value);
  return new Date(hasZone ? value : `${value}Z`);
};

export const formatDate = (value) => {
  const d = parseApiDate(value);
  return d ? d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
};

export const formatDateTime = (value) => {
  const d = parseApiDate(value);
  return d
    ? d.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';
};

export const formatTime = (value) => {
  const d = parseApiDate(value);
  return d ? d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '';
};

export const formatRelative = (value) => {
  const d = parseApiDate(value);
  if (!d) return '—';
  const diffMs = Date.now() - d.getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days <= 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 30) return `Hace ${days} días`;
  const months = Math.floor(days / 30);
  return months === 1 ? 'Hace 1 mes' : `Hace ${months} meses`;
};

/** Valor para <input type="datetime-local"> en hora LOCAL (no UTC). */
export const toLocalInputValue = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

export const initials = (name = '') =>
  displayName(name)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

/** Elimina sufijos tipo "(Comercial)" de los nombres del seed. */
export const displayName = (name = '') => (name || '').replace(/\s*\(.*?\)\s*$/, '').trim();

export const ROLE_LABELS = {
  SUPER_ADMIN: 'Super Administrador (Sistemas)',
  ADMIN_MARKETING: 'Administración y Marketing',
  COMERCIAL: 'Comercial',
};

import React, { useEffect } from 'react';
import {
  Building2,
  Target,
  Award,
  CircleCheck,
  CircleAlert,
  TriangleAlert,
  Info,
  X,
  House,
  ListTodo,
  Briefcase,
  Recycle,
  Check,
  Inbox,
} from 'lucide-react';
import { SUB_STATUS, initials } from '../utils/format';

/* --------------------------------------------------------------------------
   Icono de objeto estándar (cuadrado de color con icono blanco)
   -------------------------------------------------------------------------- */
const OBJECT_ICONS = {
  account: { icon: Building2, bg: 'bg-obj-account' },
  lead: { icon: Target, bg: 'bg-obj-lead' },
  client: { icon: Award, bg: 'bg-obj-task' },
  opportunity: { icon: Briefcase, bg: 'bg-obj-opportunity' },
  task: { icon: ListTodo, bg: 'bg-obj-task' },
  home: { icon: House, bg: 'bg-obj-home' },
  recycle: { icon: Recycle, bg: 'bg-obj-recycle' },
};

export function ObjectIcon({ type = 'account', size = 'md', className = '' }) {
  const cfg = OBJECT_ICONS[type] || OBJECT_ICONS.account;
  const Icon = cfg.icon;
  const dims = {
    sm: 'w-6 h-6 [&>svg]:w-3.5 [&>svg]:h-3.5',
    md: 'w-8 h-8 [&>svg]:w-[18px] [&>svg]:h-[18px]',
    lg: 'w-12 h-12 [&>svg]:w-7 [&>svg]:h-7',
  }[size];
  return (
    <span
      className={`inline-flex flex-shrink-0 items-center justify-center rounded-sf text-white ${cfg.bg} ${dims} ${className}`}
    >
      <Icon strokeWidth={2} />
    </span>
  );
}

export function stageIconType(stage) {
  if (stage === 'LEAD') return 'lead';
  if (stage === 'CLIENTE') return 'client';
  return 'account';
}

/* --------------------------------------------------------------------------
   Avatar circular con iniciales
   -------------------------------------------------------------------------- */
export function Avatar({ name, size = 'md', className = '' }) {
  const dims = { sm: 'w-6 h-6 text-[10px]', md: 'w-8 h-8 text-xs', lg: 'w-10 h-10 text-sm' }[size];
  return (
    <span
      className={`inline-flex flex-shrink-0 items-center justify-center rounded-full bg-[#5867e8] text-white font-bold ${dims} ${className}`}
      title={name}
    >
      {initials(name) || '?'}
    </span>
  );
}

/* --------------------------------------------------------------------------
   Badge de sub-estado y estado
   -------------------------------------------------------------------------- */
export function SubStatusBadge({ value }) {
  const cfg = SUB_STATUS[value];
  return (
    <span
      className={`inline-flex items-center gap-1.5 h-5 px-2 rounded-[0.9rem] text-[11px] font-semibold whitespace-nowrap ${
        cfg?.badge || 'bg-[#ecebea] text-[#444]'
      }`}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg?.dot || '#c9c9c9' }} />
      {cfg?.label || value}
    </span>
  );
}

export function StageBadge({ stage }) {
  const styles = {
    LEAD: 'bg-blue-50 text-blue-700 border-blue-200',
    PROSPECTO: 'bg-purple-50 text-purple-800 border-purple-200',
    POTENCIAL: 'bg-amber-50 text-amber-800 border-amber-200',
    CLIENTE: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    INACTIVO: 'bg-slate-100 text-slate-600 border-slate-200',
  }[stage] || 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${styles}`}>
      {stage || '—'}
    </span>
  );
}

export function ClientTypeBadge({ type, className = '' }) {
  if (!type) return null;
  const isDist = type === 'DISTRIBUIDOR';
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${
        isDist
          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
          : 'bg-teal-50 text-teal-700 border-teal-200'
      } ${className}`}
      title={isDist ? 'Distribuidor Mayorista (Cliente Factura)' : 'Cliente Final (Canal Indirecto / Pedido)'}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isDist ? 'bg-indigo-500' : 'bg-teal-500'}`} />
      {isDist ? 'Distribuidor' : 'Cliente Final'}
    </span>
  );
}

/* --------------------------------------------------------------------------
   Path de ciclo de vida (LEAD → PROSPECTO → POTENCIAL → CLIENTE)
   -------------------------------------------------------------------------- */
const LIFECYCLE_STEPS = [
  { id: 'LEAD', label: 'Lead' },
  { id: 'PROSPECTO', label: 'Prospecto' },
  { id: 'POTENCIAL', label: 'Potencial' },
  { id: 'CLIENTE', label: 'Cliente' },
];

export function LifecyclePath({ stage }) {
  const isInactive = stage === 'INACTIVO';
  const currentIdx = LIFECYCLE_STEPS.findIndex((s) => s.id === stage);
  return (
    <div className="path" role="list" aria-label="Ciclo de vida de la cuenta">
      {LIFECYCLE_STEPS.map((step, idx) => {
        const state = isInactive
          ? 'is-lost'
          : idx < currentIdx
          ? 'is-complete'
          : idx === currentIdx
          ? 'is-current'
          : '';
        return (
          <div key={step.id} role="listitem" className={`path-item ${state}`}>
            {state === 'is-complete' ? (
              <Check className="w-4 h-4" strokeWidth={3} />
            ) : (
              <span className="px-4 truncate">{step.label}</span>
            )}
          </div>
        );
      })}
      {isInactive && (
        <div role="listitem" className="path-item is-lost">
          <span className="px-4">Inactivo</span>
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Toast (notificación superior centrada)
   -------------------------------------------------------------------------- */
const TOAST_VARIANTS = {
  success: { bg: 'bg-sf-success', icon: CircleCheck },
  error: { bg: 'bg-sf-error', icon: CircleAlert },
  warning: { bg: 'bg-[#fe9339] !text-sf-text', icon: TriangleAlert },
  info: { bg: 'bg-[#706e6b]', icon: Info },
};

export function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(onClose, toast.duration || 6000);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;
  const v = TOAST_VARIANTS[toast.type] || TOAST_VARIANTS.success;
  const Icon = v.icon;

  return (
    <div
      role="status"
      className={`fixed top-[104px] left-1/2 z-[70] min-w-[30rem] max-w-[40rem] rounded-sf shadow-modal text-white px-4 py-3 flex items-start gap-3 animate-slide-down ${v.bg}`}
      style={{ transform: 'translateX(-50%)' }}
    >
      <Icon className="w-6 h-6 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        {toast.title && <h2 className="text-base font-bold leading-tight">{toast.title}</h2>}
        <p className="text-[13px] leading-snug mt-0.5">{toast.text}</p>
      </div>
      <button
        onClick={onClose}
        className="p-1 -mr-1 rounded-sf hover:bg-white/15 transition-colors"
        aria-label="Cerrar notificación"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

/* --------------------------------------------------------------------------
   Spinner y estados vacíos
   -------------------------------------------------------------------------- */
export function Spinner({ label = 'Cargando…' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-sf-text-weak">
      <span className="relative inline-flex w-8 h-8">
        <span className="absolute inset-0 rounded-full border-[3px] border-sf-brand-100" />
        <span className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-sf-brand animate-spin" />
      </span>
      <span className="text-xs">{label}</span>
    </div>
  );
}

export function EmptyState({ title, text, icon: Icon = Inbox, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="w-16 h-16 rounded-full bg-sf-brand-50 flex items-center justify-center mb-3">
        <Icon className="w-8 h-8 text-sf-brand" strokeWidth={1.5} />
      </div>
      <h3 className="text-base font-bold text-sf-text">{title}</h3>
      {text && <p className="text-[13px] text-sf-text-weak mt-1 max-w-md">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Modal SLDS
   -------------------------------------------------------------------------- */
export function Modal({ isOpen, onClose, title, subtitle, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const width = { sm: 'max-w-lg', md: 'max-w-2xl', lg: 'max-w-4xl' }[size];

  return (
    <div className="modal-backdrop overflow-y-auto" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <section role="dialog" aria-modal="true" className={`modal-container ${width} mt-20`}>
        <button onClick={onClose} className="modal-close" aria-label="Cerrar">
          <X className="w-5 h-5" />
        </button>
        <header className="modal-header">
          <h2 className="text-xl font-normal text-sf-text leading-tight">{title}</h2>
          {subtitle && <p className="text-[13px] text-sf-text-weak mt-1">{subtitle}</p>}
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <footer className="modal-footer">{footer}</footer>}
      </section>
    </div>
  );
}

/* --------------------------------------------------------------------------
   Card, Button, Badge, Alert UI Helpers
   -------------------------------------------------------------------------- */
export function Card({ children, className = '', ...props }) {
  return (
    <div className={`card ${className}`} {...props}>
      {children}
    </div>
  );
}

export function Button({ variant = 'neutral', size = 'md', children, className = '', ...props }) {
  const variantClass = {
    brand: 'btn-brand',
    neutral: 'btn-neutral',
    outline: 'btn-neutral',
    destructive: 'btn-destructive',
  }[variant] || 'btn-neutral';

  const sizeClass = size === 'sm' ? 'text-xs py-1 px-3 h-8' : '';

  return (
    <button className={`${variantClass} ${sizeClass} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Badge({ children, variant = 'neutral', className = '' }) {
  return (
    <span className={`badge badge-${variant} ${className}`}>
      {children}
    </span>
  );
}

export function Alert({ type = 'info', message, onClose, className = '' }) {
  const styles = {
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    error: 'bg-red-50 text-red-800 border-red-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200',
  }[type] || 'bg-blue-50 text-blue-800 border-blue-200';

  return (
    <div className={`p-3 rounded-sf border flex items-center justify-between text-xs ${styles} ${className}`}>
      <span>{message}</span>
      {onClose && (
        <button onClick={onClose} className="p-1 hover:bg-black/5 rounded">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}


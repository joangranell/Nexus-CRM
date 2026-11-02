import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Grip,
  Search,
  CircleHelp,
  Bell,
  Settings,
  LogOut,
  ChevronDown,
  Check,
  Cloud,
  UserRound,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import { Avatar } from './ui';
import { displayName, ROLE_LABELS } from '../utils/format';

const DEMO_USERS = [
  { email: 'superadmin@nexuscrm.com', password: 'superadmin123', name: 'Super Admin', role: 'SUPER_ADMIN' },
  { email: 'admin@nexuscrm.com', password: 'admin123', name: 'Elena Directora', role: 'ADMIN_MARKETING' },
  { email: 'carlos@nexuscrm.com', password: 'comercial123', name: 'Carlos Gómez', role: 'COMERCIAL' },
  { email: 'laura@nexuscrm.com', password: 'comercial123', name: 'Laura Martín', role: 'COMERCIAL' },
];

const NAV_ITEMS = [
  { to: '/my-day', label: 'Inicio', roles: ['SUPER_ADMIN', 'ADMIN_MARKETING', 'COMERCIAL'] },
  { to: '/', label: 'Cuentas', roles: ['SUPER_ADMIN', 'ADMIN_MARKETING', 'COMERCIAL'] },
  { to: '/mailing', label: 'Mailing & Campañas', roles: ['SUPER_ADMIN', 'ADMIN_MARKETING'] },
  { to: '/imports', label: 'Importación', roles: ['SUPER_ADMIN', 'ADMIN_MARKETING'] },
  { to: '/sandbox', label: 'Simulador ERP & Mailing', roles: ['SUPER_ADMIN', 'ADMIN_MARKETING'] },
  { to: '/settings/ai', label: 'Asistente IA (BYOK)', roles: ['SUPER_ADMIN'] },
  { to: '/manual', label: 'Manual de Uso', roles: ['SUPER_ADMIN', 'ADMIN_MARKETING', 'COMERCIAL'] },
];

export function BrandMark({ className = 'w-9 h-9' }) {
  return (
    <span
      className={`relative inline-flex items-center justify-center rounded-full bg-gradient-to-br from-[#1b96ff] to-[#0176d3] text-white shadow-sm ${className}`}
    >
      <Cloud className="w-[60%] h-[60%]" fill="currentColor" strokeWidth={1.5} />
      <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black tracking-tight text-[#0176d3] pt-0.5">
        NEXUS
      </span>
    </span>
  );
}

export default function Navbar() {
  const { user, logout, login, isAdmin, isSuperAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const menuRef = useRef(null);

  const visibleNavItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(user?.role)
  );

  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleQuickSwitch = async (u) => {
    setMenuOpen(false);
    try {
      await login(u.email, u.password);
      window.location.reload();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const q = search.trim();
    navigate(q ? `/?q=${encodeURIComponent(q)}` : '/');
  };

  return (
    <header className="sticky top-0 z-40">
      {/* ---------- Cabecera global ---------- */}
      <div className="h-12 bg-white border-b border-sf-border flex items-center px-3 gap-4">
        <Link to="/my-day" className="flex items-center gap-2 flex-shrink-0" aria-label="Nexus CRM — Inicio">
          <BrandMark />
        </Link>

        <form onSubmit={handleSearch} className="flex-1 flex justify-center">
          <div className="relative w-full max-w-xl">
            <Search className="w-4 h-4 text-sf-text-weaker absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="global-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cuentas, contactos, NIF…"
              className="input pl-9 bg-white"
            />
          </div>
        </form>

        <div className="flex items-center gap-1 flex-shrink-0">
          <Link
            to="/manual"
            className="btn-icon-bare hidden sm:inline-flex"
            title="Manual de uso y ayuda"
            aria-label="Abrir manual de usuario"
          >
            <CircleHelp className="w-5 h-5 text-sf-brand" />
          </Link>
          {isSuperAdmin && (
            <Link
              to="/settings/ai"
              className="btn-icon-bare hidden sm:inline-flex"
              title="Configuración de Asistente IA (BYOK)"
              aria-label="Abrir Configuración de IA"
            >
              <Settings className="w-5 h-5" />
            </Link>
          )}
          <button className="btn-icon-bare hidden sm:inline-flex" title="Notificaciones">
            <Bell className="w-5 h-5" />
          </button>

          {/* Menú de usuario */}
          <div className="relative ml-1" ref={menuRef}>
            <button
              id="user-menu-button"
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-1 rounded-full hover:ring-2 hover:ring-sf-brand-100 transition"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <Avatar name={user?.name} />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-72 bg-white border border-sf-border rounded-sf shadow-dropdown animate-slide-up overflow-hidden"
              >
                <div className="px-4 py-3 flex items-center gap-3 border-b border-sf-border">
                  <Avatar name={user?.name} size="lg" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-sf-text truncate">{displayName(user?.name)}</p>
                    <p className="text-xs text-sf-text-weak truncate">{user?.email}</p>
                    <p className="text-[11px] text-sf-text-weaker">{ROLE_LABELS[user?.role] || user?.role}</p>
                  </div>
                </div>

                <div className="py-1">
                  <p className="px-4 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-sf-text-weaker">
                    Cambiar de usuario (demo)
                  </p>
                  {DEMO_USERS.map((u) => {
                    const active = user?.email === u.email;
                    return (
                      <button
                        key={u.email}
                        role="menuitem"
                        onClick={() => handleQuickSwitch(u)}
                        className="w-full px-4 py-1.5 flex items-center gap-2 text-left text-[13px] hover:bg-[#f3f3f3]"
                      >
                        <span className="w-4">{active && <Check className="w-4 h-4 text-sf-brand" />}</span>
                        <UserRound className="w-4 h-4 text-sf-text-weaker" />
                        <span className="flex-1 text-sf-text">{u.name}</span>
                        <span className="text-[11px] text-sf-text-weaker">{ROLE_LABELS[u.role]}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="border-t border-sf-border py-1">
                  {isSuperAdmin && (
                    <Link
                      to="/settings/ai"
                      onClick={() => setMenuOpen(false)}
                      className="w-full px-4 py-2 flex items-center gap-2 text-[13px] text-sf-text hover:bg-[#f3f3f3]"
                    >
                      <Sparkles className="w-4 h-4 text-sf-brand" />
                      Configuración de IA (BYOK)
                    </Link>
                  )}
                  <Link
                    to="/manual"
                    onClick={() => setMenuOpen(false)}
                    className="w-full px-4 py-2 flex items-center gap-2 text-[13px] text-sf-text hover:bg-[#f3f3f3]"
                  >
                    <BookOpen className="w-4 h-4 text-sf-brand" />
                    Manual de Usuario y Ayuda
                  </Link>
                  <button
                    role="menuitem"
                    onClick={logout}
                    className="w-full px-4 py-2 flex items-center gap-2 text-[13px] text-sf-text hover:bg-[#f3f3f3]"
                  >
                    <LogOut className="w-4 h-4 text-sf-text-weaker" />
                    Cerrar sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---------- Barra de navegación de la app ---------- */}
      <nav className="h-10 bg-white border-b-[3px] border-sf-brand flex items-stretch px-3 shadow-card">
        <div className="flex items-center gap-3 pr-5">
          <button className="btn-icon-bare w-7 h-7" title="Iniciador de aplicaciones">
            <Grip className="w-5 h-5" />
          </button>
          <span className="text-lg font-normal text-sf-text whitespace-nowrap">Nexus Ventas</span>
        </div>

        <ul className="flex items-stretch">
          {visibleNavItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <li key={item.to} className="flex">
                <Link
                  to={item.to}
                  className={`relative flex items-center gap-1 px-3 text-[13px] transition-colors ${
                    active
                      ? 'text-sf-text font-bold bg-sf-brand-50'
                      : 'text-sf-text hover:bg-[#f3f3f3]'
                  }`}
                >
                  {item.label}
                  <ChevronDown className="w-3 h-3 text-sf-text-weaker ml-1" />
                  {active && <span className="absolute left-0 right-0 -bottom-[3px] h-[3px] bg-sf-brand-darker" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}

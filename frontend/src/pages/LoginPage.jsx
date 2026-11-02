import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CircleAlert, ShieldCheck, UserRound, ChevronRight } from 'lucide-react';
import { BrandMark } from '../components/Navbar';

const DEMO_USERS = [
  {
    email: 'superadmin@nexuscrm.com',
    password: 'superadmin123',
    name: 'Super Admin',
    role: 'Super Administrador (Sistemas)',
    icon: ShieldCheck,
  },
  {
    email: 'admin@nexuscrm.com',
    password: 'admin123',
    name: 'Elena Directora',
    role: 'Administración y Marketing',
    icon: ShieldCheck,
  },
  {
    email: 'carlos@nexuscrm.com',
    password: 'comercial123',
    name: 'Carlos Gómez',
    role: 'Comercial',
    icon: UserRound,
  },
  {
    email: 'laura@nexuscrm.com',
    password: 'comercial123',
    name: 'Laura Martín',
    role: 'Comercial',
    icon: UserRound,
  },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const doLogin = async (mail, pass) => {
    setError(null);
    setLoading(true);
    try {
      await login(mail, pass);
      navigate('/my-day');
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          'Compruebe su nombre de usuario y contraseña. Si sigue sin poder iniciar sesión, póngase en contacto con su administrador.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    doLogin(email, password);
  };

  const handleDemoLogin = (u) => {
    setEmail(u.email);
    setPassword(u.password);
    doLogin(u.email, u.password);
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* ---------- Columna del formulario ---------- */}
      <div className="flex-1 flex flex-col items-center justify-between px-6 py-10 bg-sf-bg lg:bg-white">
        <div />

        <div className="w-full max-w-[380px] animate-fade-in">
          <div className="flex flex-col items-center mb-8">
            <BrandMark className="w-20 h-20" />
            <h1 className="mt-4 text-2xl font-normal text-sf-text">Nexus CRM</h1>
            <p className="text-[13px] text-sf-text-weak">Gestión Comercial B2B</p>
          </div>

          <div className="bg-white border border-sf-border rounded-sf p-6 lg:shadow-none shadow-card">
            {error && (
              <div className="notify-error mb-4" role="alert">
                <CircleAlert className="w-4 h-4 text-sf-error flex-shrink-0 mt-0.5" />
                <span className="text-[13px]">{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="form-label">
                  Nombre de usuario
                </label>
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input h-10"
                />
              </div>

              <div>
                <label htmlFor="login-password" className="form-label">
                  Contraseña
                </label>
                <input
                  id="login-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input h-10"
                />
              </div>

              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className="btn-brand w-full h-10 text-sm"
              >
                {loading ? 'Iniciando sesión…' : 'Iniciar sesión'}
              </button>

              <label className="flex items-center gap-2 text-[13px] text-sf-text-weak cursor-pointer">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Recordarme
              </label>
            </form>

            <div className="mt-4 flex justify-between text-[13px]">
              <span className="link">¿Ha olvidado su contraseña?</span>
            </div>
          </div>

          {/* Acceso de demostración */}
          <div className="mt-6">
            <p className="text-center text-xs text-sf-text-weak mb-2">Entornos de demostración</p>
            <ul className="bg-white border border-sf-border rounded-sf divide-y divide-sf-border overflow-hidden">
              {DEMO_USERS.map((u) => {
                const Icon = u.icon;
                return (
                  <li key={u.email}>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleDemoLogin(u)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-[#f3f3f3] transition-colors disabled:opacity-50 group"
                    >
                      <span className="w-8 h-8 rounded-full bg-sf-brand-50 text-sf-brand flex items-center justify-center">
                        <Icon className="w-4 h-4" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13px] text-sf-text font-semibold">{u.name}</span>
                        <span className="block text-xs text-sf-text-weaker">
                          {u.role} · {u.email}
                        </span>
                      </span>
                      <ChevronRight className="w-4 h-4 text-sf-text-weaker group-hover:text-sf-brand transition-colors" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <p className="text-xs text-sf-text-weaker mt-8">
          © 2026 Nexus CRM. Todos los derechos reservados. · Privacidad
        </p>
      </div>

      {/* ---------- Panel corporativo ---------- */}
      <aside
        className="hidden lg:flex relative w-[46%] max-w-[760px] overflow-hidden bg-[#cfe9fe]"
        aria-hidden="true"
      >
        <img
          src="/login-hero.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-bottom"
        />
        <div className="relative z-10 p-14 max-w-lg">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-sf-brand-dark">Nexus Ventas</p>
          <h2 className="mt-3 text-[34px] leading-[1.15] font-light text-sf-brand-darker">
            Su embudo comercial,
            <br />
            <span className="font-bold">claro y bajo control.</span>
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-[#0b3a6e]">
            Desde la captación del lead hasta el pedido en ERP: ciclo de vida riguroso, agenda diaria
            priorizada y visión 360º de cada cuenta.
          </p>
        </div>
      </aside>
    </div>
  );
}

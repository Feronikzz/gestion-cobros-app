'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      router.replace('/dashboard');
      router.refresh();
    } catch (error: any) {
      setError(error.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <div className="login-container">
        <section className="login-hero">
          <div className="login-hero-content">
            <span className="login-hero-badge">Gestión de cobros y reparto</span>
            <h1 className="login-hero-title">
              Control diario,
              <br />
              cierre claro.
            </h1>
            <p className="login-hero-description">
              Un acceso profesional y elegante para entrar a tu panel de clientes, cobros, repartos y cierre mensual con una experiencia superior.
            </p>
            <div className="login-hero-stats">
              <div className="login-stat">
                <div className="login-stat-value">Clientes</div>
                <div className="login-stat-label">seguimiento activo</div>
              </div>
              <div className="login-stat">
                <div className="login-stat-value">Cobros</div>
                <div className="login-stat-label">registro mensual</div>
              </div>
              <div className="login-stat">
                <div className="login-stat-value">Cierre</div>
                <div className="login-stat-label">balance final</div>
              </div>
            </div>
          </div>
        </section>

        <section className="login-form-section">
          <div className="login-form-container">
            <div className="login-form-header">
              <span className="login-form-badge">Acceso seguro</span>
              <h1 className="login-form-title">Entrar</h1>
              <p className="login-form-subtitle">
                Usa tu cuenta de Supabase para acceder al panel profesional.
              </p>
            </div>

            {error && (
              <div className="login-form-error">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="login-form">
              <div className="login-form-group">
                <label className="login-form-label">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="form-input"
                  required
                />
              </div>
              <div className="login-form-group">
                <label className="login-form-label">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="•••••••••"
                  className="form-input"
                  required
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Entrando...' : 'Acceder al panel'}
              </button>
            </form>

            <div className="login-form-footer">
              <span>Supabase Auth</span>
              <span>Sesión privada</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

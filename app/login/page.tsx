'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  Users, 
  FileText, 
  CreditCard, 
  Receipt, 
  TrendingUp, 
  Calendar, 
  FolderOpen, 
  BarChart3,
  FileSignature,
  Shield,
  Scale,
  Lock,
  ArrowRight,
  Linkedin
} from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  
  const supabase = typeof window !== 'undefined' ? createClient() : null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!supabase) {
      setError('Error: Supabase client no disponible');
      setLoading(false);
      return;
    }

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

  const features = [
    { icon: Users, title: 'Gestión de Clientes', desc: 'Base de datos completa con seguimiento de expedientes' },
    { icon: FileText, title: 'Expedientes', desc: 'Control de procedimientos, documentación y estados' },
    { icon: CreditCard, title: 'Cobros y Pagos', desc: 'Registro de ingresos con IVA y repartos automáticos' },
    { icon: Receipt, title: 'Facturación', desc: 'Generación de facturas y recibís profesionales' },
    { icon: FolderOpen, title: 'Documentos', desc: 'Almacenamiento y previsualización de archivos' },
    { icon: Calendar, title: 'Actividades', desc: 'CRM con timeline de seguimiento por cliente' },
    { icon: BarChart3, title: 'Estadísticas', desc: 'Dashboard con métricas de rendimiento' },
    { icon: TrendingUp, title: 'Cierre Mensual', desc: 'Resumen automático de ingresos y gastos' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col">
      {/* Header con Logo */}
      <header className="w-full py-6 px-8">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg">
              <Scale className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">GESTIONES</h1>
              <h2 className="text-xl font-light text-blue-600 -mt-1">INTEGRALEX</h2>
            </div>
          </div>
          <div className="ml-auto">
            <span className="text-sm text-gray-500 bg-white/80 px-4 py-2 rounded-full border border-gray-200">
              Soluciones Legales y Administrativas
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-6xl w-full grid lg:grid-cols-2 gap-12 items-start">
          
          {/* Left Column - Info */}
          <div className="space-y-8">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 leading-tight">
                Control integral de tu
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600"> gestoría</span>
              </h2>
              <p className="mt-4 text-lg text-gray-600 leading-relaxed">
                Software profesional para la gestión completa de clientes, expedientes, 
                cobros, facturación y cierre mensual. Diseñado específicamente para 
                gestorías administrativas y bufetes de extranjería.
              </p>
            </div>

            {/* Feature Grid */}
            <div className="grid grid-cols-2 gap-4">
              {features.map((feature, idx) => (
                <div 
                  key={idx} 
                  className="group bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600 transition-colors">
                      <feature.icon className="w-5 h-5 text-blue-600 group-hover:text-white transition-colors" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">{feature.title}</h3>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{feature.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Trust Indicators */}
            <div className="flex items-center gap-6 pt-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Shield className="w-5 h-5 text-green-500" />
                <span>Datos seguros en la nube</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Lock className="w-5 h-5 text-green-500" />
                <span>Autenticación protegida</span>
              </div>
            </div>
          </div>

          {/* Right Column - Login Form */}
          <div className="lg:pl-8">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <FileSignature className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Bienvenido</h3>
                <p className="text-gray-500 mt-2">Accede a tu panel de gestión</p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:ring-4 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Accediendo...
                    </>
                  ) : (
                    <>
                      Acceder al panel
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                <p className="text-xs text-gray-400">
                  Sistema de autenticación seguro mediante Supabase
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 px-8 border-t border-gray-200 bg-white/50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-600">
            © {new Date().getFullYear()} Gestiones Integralex. Todos los derechos reservados.
          </p>
          <a
            href="https://www.linkedin.com/in/fernando-a-zabala-m%C3%A9ndez-77428410b/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
          >
            <span>Diseño, Creado y Programado por</span>
            <span className="font-semibold">Fernando Zabala</span>
            <Linkedin className="w-4 h-4 text-blue-600" />
          </a>
        </div>
      </footer>
    </div>
  );
}

# Guía Completa de Despliegue — Gestión de Cobros App

## Requisitos previos

- **Node.js** 18+ instalado ([nodejs.org](https://nodejs.org))
- **Git** instalado
- Cuenta en **Supabase** ([supabase.com](https://supabase.com)) — gratuita
- Cuenta en **Vercel** ([vercel.com](https://vercel.com)) — gratuita

---

## 1. Configurar Supabase (Base de datos)

### 1.1 Crear proyecto

1. Entra en [app.supabase.com](https://app.supabase.com) y crea un nuevo proyecto.
2. Elige una región cercana (ej: `West EU - Ireland`).
3. Define una contraseña segura para la base de datos.
4. Espera a que el proyecto se provisione (~2 min).

### 1.2 Ejecutar el schema SQL

1. En el panel de Supabase, ve a **SQL Editor**.
2. Copia el contenido completo de `supabase/schema-clean.sql`.
3. Pégalo y pulsa **Run**.
4. Verifica que aparezcan las tablas: `clientes`, `procedimientos`, `cobros`, `repartos`, `gastos`, `cierres_mensuales`.

### 1.3 Obtener credenciales

1. Ve a **Settings → API**.
2. Copia:
   - **Project URL** → será `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → será `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 1.4 Crear usuario de la app

1. Ve a **Authentication → Users**.
2. Pulsa **Add user → Create new user**.
3. Introduce email y contraseña.
4. Marca **Auto Confirm** para que se active inmediatamente.

---

## 2. Variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...TU_KEY
```

> **Importante:** nunca subas `.env.local` a Git. Ya está en `.gitignore`.

---

## 3. Probar en local

```bash
# Instalar dependencias
npm install

# Arrancar servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) y haz login con el usuario creado en Supabase.

Verifica que puedes:
- Crear un cliente
- Añadir un procedimiento desde la ficha del cliente
- Registrar cobros y repartos
- Ver el dashboard con métricas

---

## 4. Desplegar en Vercel (Recomendado)

### 4.1 Subir código a GitHub

```bash
# Inicializar repositorio (si no está hecho)
git init
git add .
git commit -m "App lista para producción"

# Crear repo en GitHub y conectar
git remote add origin https://github.com/TU-USUARIO/gestion-cobros-app.git
git branch -M main
git push -u origin main
```

### 4.2 Importar en Vercel

1. Entra en [vercel.com/new](https://vercel.com/new).
2. Selecciona **Import Git Repository** y elige el repo.
3. Vercel detectará automáticamente que es Next.js.
4. En **Environment Variables** añade:
   - `NEXT_PUBLIC_SUPABASE_URL` → tu URL de Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → tu anon key
5. Pulsa **Deploy**.
6. En ~1-2 minutos tendrás la app en `https://tu-app.vercel.app`.

### 4.3 Dominio personalizado (opcional)

1. En Vercel → tu proyecto → **Settings → Domains**.
2. Añade tu dominio (ej: `cobros.tudominio.com`).
3. Configura los DNS de tu proveedor con los registros que te indique Vercel:
   - **CNAME** → `cname.vercel-dns.com` (para subdominio)
   - **A** → `76.76.21.21` (para dominio raíz)
4. Espera la propagación DNS (~5-30 min).

---

## 5. Alternativa: Desplegar en Netlify

1. Entra en [app.netlify.com](https://app.netlify.com).
2. Pulsa **Add new site → Import existing project**.
3. Conecta tu repo de GitHub.
4. Configuración de build:
   - **Build command:** `npm run build`
   - **Publish directory:** `.next`
5. En **Environment Variables** añade las mismas variables de Supabase.
6. Pulsa **Deploy site**.

> Nota: Para Next.js con SSR en Netlify necesitas el plugin `@netlify/plugin-nextjs` (se instala automáticamente).

---

## 6. Alternativa: VPS / Servidor propio

Si prefieres un servidor propio (DigitalOcean, Hetzner, etc.):

```bash
# En el servidor
git clone https://github.com/TU-USUARIO/gestion-cobros-app.git
cd gestion-cobros-app

# Crear .env.local con las variables de Supabase
nano .env.local

# Instalar y construir
npm install
npm run build

# Ejecutar en producción
npm start
# → Se levanta en http://localhost:3000
```

### Usar PM2 para mantener el proceso activo:

```bash
npm install -g pm2
pm2 start npm --name "cobros-app" -- start
pm2 save
pm2 startup
```

### Configurar Nginx como proxy inverso:

```nginx
server {
    listen 80;
    server_name cobros.tudominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### SSL con Certbot:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d cobros.tudominio.com
```

---

## 7. Configuración de seguridad en Supabase

### 7.1 RLS (Row Level Security)

El schema ya incluye RLS activado y políticas por `user_id`. Cada usuario solo ve sus propios datos.

### 7.2 Limitar dominios permitidos

1. En Supabase → **Authentication → URL Configuration**.
2. En **Site URL** pon tu dominio de producción: `https://cobros.tudominio.com`.
3. En **Redirect URLs** añade:
   - `https://cobros.tudominio.com/**`
   - `http://localhost:3000/**` (para desarrollo)

### 7.3 Desactivar registro público (si solo tú usas la app)

1. Ve a **Authentication → Providers → Email**.
2. Desactiva **Enable Sign Up** si no quieres que nadie más se registre.

---

## 8. Mantenimiento

### Actualizar en producción (Vercel)

Simplemente haz push a `main` — Vercel redesplega automáticamente:

```bash
git add .
git commit -m "Mejoras v1.1"
git push
```

### Backups de Supabase

- **Plan gratuito:** exporta datos manualmente desde el SQL Editor con `SELECT * FROM ...`.
- **Plan Pro:** backups automáticos diarios incluidos.

### Monitorización

- **Vercel:** Analytics integrado en el dashboard.
- **Supabase:** Logs de API en el panel → **Logs**.

---

## Resumen rápido

| Paso | Acción |
|------|--------|
| 1 | Crear proyecto en Supabase + ejecutar SQL |
| 2 | Crear usuario en Authentication |
| 3 | Copiar URL y anon key a `.env.local` |
| 4 | `npm install && npm run dev` para probar local |
| 5 | Subir a GitHub |
| 6 | Importar en Vercel + añadir env vars |
| 7 | Configurar dominio y SSL |
| 8 | Ajustar seguridad en Supabase |

**¡Tu app está en producción!**

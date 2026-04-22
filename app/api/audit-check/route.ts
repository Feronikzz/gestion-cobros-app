import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ 
        ok: false, 
        step: 'auth',
        error: userError?.message || 'No autenticado',
        fix: 'No se pudo obtener el usuario. Asegúrate de estar logueado.',
      });
    }

    // 1. Intentar SELECT en audit_log
    const { data: selectData, error: selectError } = await supabase
      .from('audit_log')
      .select('id')
      .limit(1);

    if (selectError) {
      // Intentar con service role para verificar si la tabla existe
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      let tableExists = false;
      if (serviceKey) {
        const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
        const { error: adminErr } = await admin.from('audit_log').select('id').limit(1);
        tableExists = !adminErr;
      }

      return NextResponse.json({
        ok: false,
        step: 'select',
        error: selectError.message,
        hint: selectError.hint,
        code: selectError.code,
        tableExists,
        userId: user.id,
        fix: tableExists 
          ? 'La tabla existe pero la política RLS de SELECT bloquea el acceso. Ejecuta el SQL de fix abajo.'
          : 'La tabla audit_log NO existe. Créala con el SQL de configuración.',
        sqlFix: `-- Ejecuta esto en Supabase SQL Editor:
DROP POLICY IF EXISTS audit_log_usuario ON audit_log;
DROP POLICY IF EXISTS audit_log_select ON audit_log;
DROP POLICY IF EXISTS audit_log_insert ON audit_log;

CREATE POLICY audit_log_select ON audit_log FOR SELECT USING (user_id = auth.uid());
CREATE POLICY audit_log_insert ON audit_log FOR INSERT WITH CHECK (user_id = auth.uid());`,
      });
    }

    // 2. Intentar INSERT de prueba
    const { data: insertData, error: insertError } = await supabase
      .from('audit_log')
      .insert({
        user_id: user.id,
        user_email: user.email,
        entidad: 'cliente',
        accion: 'crear',
        descripcion: 'Test de diagnóstico - puedes borrar este registro',
        entidad_nombre: 'Diagnóstico',
        campo: null,
        valor_anterior: null,
        valor_nuevo: null,
        ip_address: null,
        user_agent: 'audit-check-api',
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({
        ok: false,
        step: 'insert',
        error: insertError.message,
        hint: insertError.hint,
        code: insertError.code,
        userId: user.id,
        fix: `La tabla existe y SELECT funciona, pero INSERT falla. Error: "${insertError.message}". Ejecuta el SQL de fix.`,
        sqlFix: `-- Ejecuta esto en Supabase SQL Editor:
DROP POLICY IF EXISTS audit_log_usuario ON audit_log;
DROP POLICY IF EXISTS audit_log_select ON audit_log;
DROP POLICY IF EXISTS audit_log_insert ON audit_log;

-- Política de lectura
CREATE POLICY audit_log_select ON audit_log FOR SELECT USING (user_id = auth.uid());

-- Política de inserción (permisiva)  
CREATE POLICY audit_log_insert ON audit_log FOR INSERT WITH CHECK (true);`,
      });
    }

    // 3. Contar registros
    const { count } = await supabase
      .from('audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    return NextResponse.json({
      ok: true,
      message: 'La tabla audit_log funciona correctamente',
      testRecordId: insertData.id,
      totalRecords: count,
      userId: user.id,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message, stack: err.stack?.split('\n').slice(0, 3) });
  }
}

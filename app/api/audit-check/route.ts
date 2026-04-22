import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({
        ok: false, step: 'auth',
        error: userError?.message || 'No autenticado',
        fix: 'No se pudo obtener el usuario. Asegúrate de estar logueado.',
      });
    }

    // 1. Intentar SELECT en audit_log
    const { data: selectData, error: selectError } = await supabase
      .from('audit_log')
      .select('id', { count: 'exact', head: false })
      .eq('user_id', user.id)
      .limit(1);

    if (selectError) {
      return NextResponse.json({
        ok: false, step: 'select',
        error: selectError.message, hint: selectError.hint, code: selectError.code,
        fix: 'La tabla audit_log no existe o la política RLS de SELECT bloquea el acceso. Ejecuta el SQL de configuración.',
        sqlFix: `-- Ejecuta esto en Supabase SQL Editor:
DROP TABLE IF EXISTS audit_log CASCADE;

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT, entidad TEXT NOT NULL, entidad_id TEXT,
  entidad_nombre TEXT, accion TEXT NOT NULL, campo TEXT,
  valor_anterior TEXT, valor_nuevo TEXT, descripcion TEXT,
  ip_address TEXT, user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_user_date ON audit_log(user_id, created_at);
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_log_select ON audit_log FOR SELECT USING (user_id = auth.uid());
CREATE POLICY audit_log_insert ON audit_log FOR INSERT WITH CHECK (true);`,
      });
    }

    // 2. Contar registros (SELECT funciona, no necesitamos INSERT de test)
    const { count } = await supabase
      .from('audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    return NextResponse.json({
      ok: true,
      message: 'La tabla audit_log funciona correctamente',
      totalRecords: count || 0,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message });
  }
}

// DELETE: limpiar registros de diagnóstico
export async function DELETE() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: 'No autenticado' });

    const { data, error } = await supabase
      .from('audit_log')
      .delete()
      .eq('user_id', user.id)
      .eq('user_agent', 'audit-check-api')
      .select('id');

    if (error) return NextResponse.json({ ok: false, error: error.message });

    return NextResponse.json({ ok: true, deleted: data?.length || 0 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message });
  }
}

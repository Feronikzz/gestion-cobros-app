import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'No autenticado' });
    }

    // 1. Intentar SELECT en audit_log
    const { data: selectData, error: selectError } = await supabase
      .from('audit_log')
      .select('id')
      .limit(1);

    if (selectError) {
      return NextResponse.json({
        ok: false,
        step: 'select',
        error: selectError.message,
        hint: selectError.hint,
        code: selectError.code,
        fix: 'La tabla audit_log no existe o no tienes permisos. Ejecuta la migración SQL.',
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
        descripcion: '🔧 Test de diagnóstico — puedes borrar este registro',
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
        fix: 'La tabla existe pero no se puede insertar. Probablemente es un problema de RLS. Ejecuta la migración SQL para corregir las políticas.',
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
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message });
  }
}

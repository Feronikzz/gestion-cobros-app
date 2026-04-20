import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || '';
    const clienteId = formData.get('cliente_id') as string || '';
    const procedimientoId = formData.get('procedimiento_id') as string || '';

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 });
    }

    // Construir la ruta en Supabase Storage:
    // {user_id}/{cliente_id}/{procedimiento_id?}/{subcarpeta?}/{filename}
    let storagePath = user.id;
    if (clienteId) storagePath += `/${clienteId}`;
    if (procedimientoId) storagePath += `/${procedimientoId}`;
    if (folder) storagePath += `/${folder}`;
    storagePath += `/${Date.now()}_${file.name}`;

    const { data, error: uploadError } = await supabase.storage
      .from('documentos')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage
      .from('documentos')
      .getPublicUrl(storagePath);

    // Registrar en tabla documentos si hay cliente_id
    if (clienteId) {
      await supabase.from('documentos').insert({
        user_id: user.id,
        cliente_id: clienteId,
        procedimiento_id: procedimientoId || null,
        nombre: file.name,
        tipo: 'ESCANEADO',
        archivo_url: publicUrl,
        carpeta: folder || null,
      });
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      path: storagePath,
      nombre: file.name,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al subir archivo' }, { status: 500 });
  }
}

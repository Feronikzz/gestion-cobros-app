import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const folder = req.nextUrl.searchParams.get('folder') || user.id;

    const { data, error } = await supabase.storage
      .from('documentos')
      .list(folder, {
        limit: 200,
        sortBy: { column: 'name', order: 'asc' },
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Separar carpetas y archivos
    const items = (data || []).map(item => ({
      name: item.name,
      id: item.id,
      type: item.id === null ? 'folder' : 'file',
      size: item.metadata?.size || null,
      mimeType: item.metadata?.mimetype || null,
      created: item.created_at,
      updated: item.updated_at,
    }));

    return NextResponse.json({ folder, items });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al listar archivos' }, { status: 500 });
  }
}

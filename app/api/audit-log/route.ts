import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, entity_type, entity_id, old_values, new_values, description } = body;

    // Validar datos requeridos
    if (!action || !entity_type) {
      return NextResponse.json(
        { error: 'Action and entity_type are required' },
        { status: 400 }
      );
    }

    // Crear cliente de Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Obtener información del usuario desde el header de autorización
    const authHeader = request.headers.get('authorization');
    let user = null;

    if (authHeader) {
      try {
        const { data } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        user = data.user;
      } catch (error) {
        console.error('Error getting user:', error);
      }
    }

    // Si no hay usuario, intentar desde la sesión
    if (!user) {
      try {
        const { data } = await supabase.auth.getSession();
        user = data.session?.user;
      } catch (error) {
        console.error('Error getting session:', error);
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Insertar en audit_log
    const { data, error } = await supabase
      .from('audit_log')
      .insert({
        user_id: user.id,
        user_email: user.email,
        action,
        entity_type,
        entity_id,
        old_values,
        new_values,
        description,
        ip_address: request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   request.ip,
        user_agent: request.headers.get('user-agent'),
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting audit log:', error);
      return NextResponse.json(
        { error: 'Failed to log event' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in audit log API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

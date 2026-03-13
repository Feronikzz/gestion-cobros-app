import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface ExportRequest {
  filters: {
    user_email?: string
    action?: string
    entity_type?: string
    date_from?: string
    date_to?: string
    search?: string
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { data: { filters } } = await req.json() as { data: ExportRequest }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    let query = supabaseClient
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters.user_email) {
      query = query.eq('user_email', filters.user_email)
    }
    if (filters.action) {
      query = query.eq('action', filters.action)
    }
    if (filters.entity_type) {
      query = query.eq('entity_type', filters.entity_type)
    }
    if (filters.date_from) {
      query = query.gte('created_at', filters.date_from)
    }
    if (filters.date_to) {
      query = query.lte('created_at', filters.date_to)
    }
    if (filters.search) {
      query = query.or(`description.ilike.%${filters.search}%,entity_id.ilike.%${filters.search}%`)
    }

    const { data, error } = await query.limit(10000)

    if (error) throw error

    // Convert to CSV
    const csvHeaders = [
      'ID',
      'Usuario',
      'Acción',
      'Entidad',
      'ID Entidad',
      'Descripción',
      'Valores Antiguos',
      'Valores Nuevos',
      'IP Address',
      'User Agent',
      'Fecha',
      'Restaurado',
      'Restaurado Por'
    ]

    const csvRows = data.map(log => [
      log.id,
      log.user_email || '',
      log.action,
      log.entity_type,
      log.entity_id || '',
      log.description || '',
      JSON.stringify(log.old_values || {}),
      JSON.stringify(log.new_values || {}),
      log.ip_address || '',
      log.user_agent || '',
      log.created_at,
      log.restored_at || '',
      log.restored_by || ''
    ])

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    return new Response(JSON.stringify({ csv: csvContent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

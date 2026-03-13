import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface RestoreRequest {
  log_id: string
  restored_by: string
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
    const { data: { log_id, restored_by } } = await req.json() as { data: RestoreRequest }
    
    if (!log_id || !restored_by) {
      throw new Error('Missing required fields: log_id, restored_by')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Get the audit log entry
    const { data: logEntry, error: fetchError } = await supabaseClient
      .from('audit_log')
      .select('*')
      .eq('id', log_id)
      .single()

    if (fetchError) throw fetchError
    if (!logEntry) throw new Error('Audit log entry not found')

    // Check if it's a delete action (can only restore deletions)
    if (logEntry.action !== 'delete') {
      throw new Error('Only delete actions can be restored')
    }

    // Restore the deleted record based on entity type
    let restoreResult
    switch (logEntry.entity_type) {
      case 'cliente':
        restoreResult = await supabaseClient
          .from('clientes')
          .insert(logEntry.old_values)
          .select()
          .single()
        break
      case 'cobro':
        restoreResult = await supabaseClient
          .from('cobros')
          .insert(logEntry.old_values)
          .select()
          .single()
        break
      case 'gasto':
        restoreResult = await supabaseClient
          .from('gastos')
          .insert(logEntry.old_values)
          .select()
          .single()
        break
      case 'procedimiento':
        restoreResult = await supabaseClient
          .from('procedimientos')
          .insert(logEntry.old_values)
          .select()
          .single()
        break
      default:
        throw new Error(`Restore not supported for entity type: ${logEntry.entity_type}`)
    }

    if (restoreResult.error) throw restoreResult.error

    // Mark the audit log as restored
    const { error: updateError } = await supabaseClient
      .from('audit_log')
      .update({
        restored_at: new Date().toISOString(),
        restored_by: restored_by
      })
      .eq('id', log_id)

    if (updateError) throw updateError

    return new Response(JSON.stringify({ 
      data: { 
        restored: true, 
        restored_record: restoreResult.data 
      } 
    }), {
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

-- Función para obtener estadísticas de auditoría
CREATE OR REPLACE FUNCTION get_audit_stats()
RETURNS TABLE (
  total_events BIGINT,
  events_today BIGINT,
  events_this_week BIGINT,
  events_this_month BIGINT,
  top_users JSONB,
  top_entities JSONB,
  recent_restores BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*) as total_events,
      COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as events_today,
      COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as events_this_week,
      COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)) as events_this_month,
      COUNT(*) FILTER (WHERE restored_at IS NOT NULL) as recent_restores
    FROM audit_log
  ),
  top_users AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'email', user_email,
        'count', event_count
      )
    ) as top_users
    FROM (
      SELECT user_email, COUNT(*) as event_count
      FROM audit_log
      WHERE user_email IS NOT NULL
      GROUP BY user_email
      ORDER BY event_count DESC
      LIMIT 5
    ) user_stats
  ),
  top_entities AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'type', entity_type,
        'count', event_count
      )
    ) as top_entities
    FROM (
      SELECT entity_type, COUNT(*) as event_count
      FROM audit_log
      WHERE entity_type IS NOT NULL
      GROUP BY entity_type
      ORDER BY event_count DESC
      LIMIT 5
    ) entity_stats
  )
  SELECT 
    s.total_events,
    s.events_today,
    s.events_this_week,
    s.events_this_month,
    COALESCE(u.top_users, '[]'::jsonb) as top_users,
    COALESCE(e.top_entities, '[]'::jsonb) as top_entities,
    s.recent_restores
  FROM stats s
  CROSS JOIN top_users u
  CROSS JOIN top_entities e;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_audit_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_audit_stats() TO service_role;

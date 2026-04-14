-- =============================================================================
-- FIX CRÍTICO: cierres_mensuales UNIQUE constraint
-- ERROR: Tenía UNIQUE(mes) sin user_id - dos usuarios no podían cerrar el mismo mes
-- FIX: Cambiar a UNIQUE(user_id, mes)
-- =============================================================================

-- Eliminar constraint antigua si existe
ALTER TABLE public.cierres_mensuales 
  DROP CONSTRAINT IF EXISTS cierres_mensuales_mes_key;

-- Eliminar nuestra constraint si ya existe (para poder recrearla)
ALTER TABLE public.cierres_mensuales 
  DROP CONSTRAINT IF EXISTS cierres_mensuales_user_mes_unique;

-- Crear nueva constraint con user_id + mes
ALTER TABLE public.cierres_mensuales 
  ADD CONSTRAINT cierres_mensuales_user_mes_unique UNIQUE(user_id, mes);

-- Verificar resultado
SELECT 
  tc.constraint_name, 
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'cierres_mensuales' 
  AND tc.constraint_type = 'UNIQUE';

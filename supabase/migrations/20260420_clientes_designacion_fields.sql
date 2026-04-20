-- Añadir campos de designación directamente a la tabla clientes
-- para evitar serialización en notas

-- Separar apellidos en apellido1 y apellido2
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS apellido1 text;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS apellido2 text;

-- Migrar datos existentes de apellidos a apellido1/apellido2
UPDATE clientes
SET apellido1 = split_part(apellidos, ' ', 1),
    apellido2 = CASE
      WHEN position(' ' in apellidos) > 0
      THEN substring(apellidos from position(' ' in apellidos) + 1)
      ELSE NULL
    END
WHERE apellidos IS NOT NULL AND apellido1 IS NULL;

-- Campos de designación
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS nombre_padre text;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS nombre_madre text;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS estado_civil text;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS localidad_nacimiento text;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS pais_nacimiento text;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS pasaporte text;

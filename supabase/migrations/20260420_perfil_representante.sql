-- Tabla para almacenar el perfil del representante (apoderado)
-- Se guarda uno por usuario, accesible desde cualquier dispositivo
CREATE TABLE IF NOT EXISTS perfil_representante (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dni_nie text,
  razon_social text,
  nombre text,
  apellido1 text,
  apellido2 text,
  domicilio text,
  numero text,
  piso text,
  localidad text,
  cp text,
  provincia text,
  telefono text,
  email text,
  emails_sugeridos jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- RLS
ALTER TABLE perfil_representante ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own representante profile"
  ON perfil_representante
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

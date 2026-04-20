-- Actualizar constraint de tipo en documentos para permitir tipos de designación
ALTER TABLE documentos DROP CONSTRAINT IF EXISTS documentos_tipo_check;
ALTER TABLE documentos ADD CONSTRAINT documentos_tipo_check 
CHECK (tipo IN (
  'DNI', 'NIE', 'PASAPORTE', 'PDF', 'JPG', 'JPEG', 'PNG', 'GIF', 
  'DOC', 'DOCX', 'XLS', 'XLSX', 'TXT', 'ZIP', 'RAR', 'OTRO',
  'justificante', 'notificacion', 'recurso', 'resolucion', 'otro',
  'DESIGNACION_NO_FIRMADA', 'DESIGNACION_FIRMADA'
));

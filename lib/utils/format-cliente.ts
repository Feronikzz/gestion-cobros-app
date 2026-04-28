import type { Cliente } from '../supabase/types';

export function getDisambiguatedClientNames(clientes: Cliente[]): Record<string, string> {
  const map: Record<string, string> = {};
  const apellidosCount: Record<string, number> = {};

  // Contar ocurrencias exactas de "apellidos" ignorando mayúsculas
  clientes.forEach(c => {
    const rep = ([c.apellido1, c.apellido2].filter(Boolean).join(' ') || c.apellidos || '').trim().toLowerCase();
    const key = rep || (c.nombre || '').trim().toLowerCase();
    if (key) {
      apellidosCount[key] = (apellidosCount[key] || 0) + 1;
    }
  });

  // Asignar el nombre óptimo
  clientes.forEach(c => {
    const nombre = (c.nombre || '').trim();
    const apellidos = ([c.apellido1, c.apellido2].filter(Boolean).join(' ') || c.apellidos || '').trim();
    
    if (!apellidos) {
      map[c.id] = nombre || 'Sin nombre';
      return;
    }

    const key = apellidos.toLowerCase();
    const isDuplicate = apellidosCount[key] > 1;

    if (isDuplicate && nombre) {
      map[c.id] = `${apellidos}, ${nombre}`;
    } else {
      map[c.id] = apellidos;
    }
  });

  return map;
}

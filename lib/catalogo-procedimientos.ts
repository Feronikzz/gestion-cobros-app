import type { CategoriaProcedimiento, DocumentoRequerido } from '@/lib/supabase/types';
import { createClient } from '@/lib/supabase/client';

export interface ProcedimientoCatalogo {
  id?: string;
  titulo: string;
  categoria: CategoriaProcedimiento;
  concepto?: string;
  documentos_requeridos: DocumentoRequerido[];
}

// Extender CategoriaProcedimiento para permitir categorías dinámicas
export type CategoriaProcedimientoExtendida = CategoriaProcedimiento | string;

// Categorías por defecto (predefinidas)
export const CATEGORIA_LABELS: Record<CategoriaProcedimiento, string> = {
  extranjeria: 'Extranjería',
  civil: 'Civil',
  laboral: 'Laboral',
  bancario: 'Bancario',
  administrativo: 'Administrativo',
  otro: 'Otro',
};

// Cache en memoria para evitar peticiones excesivas
let cacheCategorias: Record<string, string> | null = null;
let cacheCatalogo: ProcedimientoCatalogo[] | null = null;
let lastFetch: number = 0;
const CACHE_DURATION = 30000; // 30 segundos

// Cliente Supabase
function getSupabase() {
  return createClient();
}

// ─── FUNCIONES SUPABASE - CATEGORÍAS ─────────────────────────────

// Obtener categorías personalizadas de Supabase
export async function getCategoriasCustom(): Promise<Record<string, string>> {
  // Usar cache si es reciente
  if (cacheCategorias && Date.now() - lastFetch < CACHE_DURATION) {
    return cacheCategorias;
  }
  
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};
  
  const { data, error } = await supabase
    .from('catalogo_categorias')
    .select('key, label')
    .eq('user_id', user.id);
  
  if (error) {
    console.error('Error cargando categorías:', error);
    return {};
  }
  
  const cats: Record<string, string> = {};
  data?.forEach((cat: { key: string; label: string }) => {
    cats[cat.key] = cat.label;
  });
  
  cacheCategorias = cats;
  return cats;
}

// Guardar categoría en Supabase
export async function saveCategoriaCustom(key: string, label: string): Promise<boolean> {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  
  const { error } = await supabase
    .from('catalogo_categorias')
    .upsert({ user_id: user.id, key, label }, { onConflict: 'user_id,key' });
  
  if (error) {
    console.error('Error guardando categoría:', error);
    return false;
  }
  
  // Invalidar cache
  cacheCategorias = null;
  return true;
}

// Eliminar categoría de Supabase
export async function deleteCategoriaCustom(key: string): Promise<boolean> {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  
  const { error } = await supabase
    .from('catalogo_categorias')
    .delete()
    .eq('user_id', user.id)
    .eq('key', key);
  
  if (error) {
    console.error('Error eliminando categoría:', error);
    return false;
  }
  
  cacheCategorias = null;
  return true;
}

// ─── FUNCIONES SUPABASE - CATÁLOGO ───────────────────────────────

// Obtener catálogo personalizado de Supabase
export async function getCustomCatalogo(): Promise<ProcedimientoCatalogo[]> {
  // Usar cache si es reciente
  if (cacheCatalogo && Date.now() - lastFetch < CACHE_DURATION) {
    return cacheCatalogo;
  }
  
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  
  // Obtener procedimientos con sus documentos
  const { data: procedimientos, error } = await supabase
    .from('catalogo_procedimientos')
    .select('*')
    .eq('user_id', user.id);
  
  if (error) {
    console.error('Error cargando catálogo:', error);
    return [];
  }
  
  // Obtener documentos requeridos
  const { data: documentos, error: docsError } = await supabase
    .from('catalogo_documentos_requeridos')
    .select('*')
    .in('procedimiento_id', procedimientos?.map((p: { id: string }) => p.id) || []);
  
  if (docsError) {
    console.error('Error cargando documentos:', docsError);
  }
  
  // Agrupar documentos por procedimiento
  const docsByProc: Record<string, DocumentoRequerido[]> = {};
  documentos?.forEach((doc: { procedimiento_id: string; nombre: string; descripcion?: string; enlace?: string }) => {
    if (!docsByProc[doc.procedimiento_id]) docsByProc[doc.procedimiento_id] = [];
    docsByProc[doc.procedimiento_id].push({
      nombre: doc.nombre,
      adjuntado: false,
      notas: null,
      descripcion: doc.descripcion || null,
      enlace: doc.enlace || null,
    });
  });
  
  const result: ProcedimientoCatalogo[] = procedimientos?.map((p: { id: string; titulo: string; categoria: string; concepto?: string }) => ({
    id: p.id,
    titulo: p.titulo,
    categoria: p.categoria as CategoriaProcedimiento,
    concepto: p.concepto,
    documentos_requeridos: docsByProc[p.id] || [],
  })) || [];
  
  cacheCatalogo = result;
  lastFetch = Date.now();
  return result;
}

// Añadir procedimiento al catálogo (Supabase)
export async function addProcedimientoCatalogo(proc: ProcedimientoCatalogo): Promise<boolean> {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  
  // Verificar si ya existe
  const { data: existing } = await supabase
    .from('catalogo_procedimientos')
    .select('id')
    .eq('user_id', user.id)
    .eq('titulo', proc.titulo)
    .single();
  
  if (existing) return false;
  
  // Insertar procedimiento
  const { data: newProc, error } = await supabase
    .from('catalogo_procedimientos')
    .insert({
      user_id: user.id,
      titulo: proc.titulo,
      categoria: proc.categoria,
      concepto: proc.concepto,
    })
    .select()
    .single();
  
  if (error || !newProc) {
    console.error('Error añadiendo procedimiento:', error);
    return false;
  }
  
  // Insertar documentos requeridos
  if (proc.documentos_requeridos?.length > 0) {
    const { error: docsError } = await supabase
      .from('catalogo_documentos_requeridos')
      .insert(
        proc.documentos_requeridos.map(doc => ({
          procedimiento_id: newProc.id,
          nombre: doc.nombre,
          obligatorio: true,
          descripcion: doc.descripcion || null,
          enlace: doc.enlace || null,
        }))
      );
    
    if (docsError) {
      console.error('Error añadiendo documentos:', docsError);
    }
  }
  
  cacheCatalogo = null;
  return true;
}

// Actualizar procedimiento en catálogo (Supabase)
export async function updateProcedimientoCatalogo(
  tituloOriginal: string, 
  proc: ProcedimientoCatalogo
): Promise<boolean> {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  
  // Buscar el procedimiento a actualizar
  const { data: existing } = await supabase
    .from('catalogo_procedimientos')
    .select('id')
    .eq('user_id', user.id)
    .eq('titulo', tituloOriginal)
    .single();
  
  if (!existing) {
    // Si no existe, lo creamos como nuevo
    return addProcedimientoCatalogo(proc);
  }
  
  // Actualizar procedimiento
  const { error } = await supabase
    .from('catalogo_procedimientos')
    .update({
      titulo: proc.titulo,
      categoria: proc.categoria,
      concepto: proc.concepto,
    })
    .eq('id', existing.id);
  
  if (error) {
    console.error('Error actualizando procedimiento:', error);
    return false;
  }
  
  // Eliminar documentos antiguos y añadir nuevos
  await supabase
    .from('catalogo_documentos_requeridos')
    .delete()
    .eq('procedimiento_id', existing.id);
  
  if (proc.documentos_requeridos?.length > 0) {
    await supabase
      .from('catalogo_documentos_requeridos')
      .insert(
        proc.documentos_requeridos.map(doc => ({
          procedimiento_id: existing.id,
          nombre: doc.nombre,
          obligatorio: true,
          descripcion: doc.descripcion || null,
          enlace: doc.enlace || null,
        }))
      );
  }
  
  cacheCatalogo = null;
  return true;
}

// Eliminar procedimiento del catálogo (Supabase)
export async function deleteProcedimientoCatalogo(titulo: string): Promise<boolean> {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  
  const { error } = await supabase
    .from('catalogo_procedimientos')
    .delete()
    .eq('user_id', user.id)
    .eq('titulo', titulo);
  
  if (error) {
    console.error('Error eliminando procedimiento:', error);
    return false;
  }
  
  cacheCatalogo = null;
  return true;
}

// Forzar recarga del cache
export function invalidateCache() {
  cacheCategorias = null;
  cacheCatalogo = null;
  lastFetch = 0;
}

// ─── Catálogo de procedimientos predefinidos ─────────────
export const CATALOGO_PROCEDIMIENTOS: ProcedimientoCatalogo[] = [
  // ── EXTRANJERÍA ──
  {
    titulo: 'Arraigo social',
    categoria: 'extranjeria',
    documentos_requeridos: [
      { nombre: 'Pasaporte completo (copia)', adjuntado: false, notas: null },
      { nombre: 'Certificado de empadronamiento', adjuntado: false, notas: null },
      { nombre: 'Contrato de trabajo', adjuntado: false, notas: null },
      { nombre: 'Informe de arraigo social', adjuntado: false, notas: null },
      { nombre: 'Antecedentes penales del país de origen', adjuntado: false, notas: null },
      { nombre: 'Certificado de antecedentes penales español', adjuntado: false, notas: null },
      { nombre: 'Fotografía tamaño carné', adjuntado: false, notas: null },
      { nombre: 'Tasa modelo 790 código 012', adjuntado: false, notas: null },
      { nombre: 'Tasa modelo 790 código 052', adjuntado: false, notas: null },
    ],
  },
  {
    titulo: 'Arraigo laboral',
    categoria: 'extranjeria',
    documentos_requeridos: [
      { nombre: 'Pasaporte completo (copia)', adjuntado: false, notas: null },
      { nombre: 'Certificado de empadronamiento', adjuntado: false, notas: null },
      { nombre: 'Resolución judicial o acta de conciliación', adjuntado: false, notas: null },
      { nombre: 'Informe de vida laboral', adjuntado: false, notas: null },
      { nombre: 'Antecedentes penales del país de origen', adjuntado: false, notas: null },
      { nombre: 'Fotografía tamaño carné', adjuntado: false, notas: null },
      { nombre: 'Tasa modelo 790 código 012', adjuntado: false, notas: null },
    ],
  },
  {
    titulo: 'Arraigo familiar',
    categoria: 'extranjeria',
    documentos_requeridos: [
      { nombre: 'Pasaporte completo (copia)', adjuntado: false, notas: null },
      { nombre: 'Certificado de empadronamiento', adjuntado: false, notas: null },
      { nombre: 'Certificado de nacimiento del hijo español', adjuntado: false, notas: null },
      { nombre: 'Libro de familia', adjuntado: false, notas: null },
      { nombre: 'Antecedentes penales del país de origen', adjuntado: false, notas: null },
      { nombre: 'Fotografía tamaño carné', adjuntado: false, notas: null },
      { nombre: 'Tasa modelo 790 código 012', adjuntado: false, notas: null },
    ],
  },
  {
    titulo: 'Arraigo para la formación',
    categoria: 'extranjeria',
    documentos_requeridos: [
      { nombre: 'Pasaporte completo (copia)', adjuntado: false, notas: null },
      { nombre: 'Certificado de empadronamiento', adjuntado: false, notas: null },
      { nombre: 'Certificado de matrícula en formación', adjuntado: false, notas: null },
      { nombre: 'Antecedentes penales del país de origen', adjuntado: false, notas: null },
      { nombre: 'Fotografía tamaño carné', adjuntado: false, notas: null },
      { nombre: 'Tasa modelo 790 código 012', adjuntado: false, notas: null },
    ],
  },
  {
    titulo: 'Renovación de residencia temporal',
    categoria: 'extranjeria',
    documentos_requeridos: [
      { nombre: 'Pasaporte completo (copia)', adjuntado: false, notas: null },
      { nombre: 'Tarjeta de residencia anterior (copia)', adjuntado: false, notas: null },
      { nombre: 'Certificado de empadronamiento', adjuntado: false, notas: null },
      { nombre: 'Contrato de trabajo o vida laboral', adjuntado: false, notas: null },
      { nombre: 'Declaración de la renta o certificado IRPF', adjuntado: false, notas: null },
      { nombre: 'Tasa modelo 790 código 012', adjuntado: false, notas: null },
      { nombre: 'Fotografía tamaño carné', adjuntado: false, notas: null },
    ],
  },
  {
    titulo: 'Residencia de larga duración',
    categoria: 'extranjeria',
    documentos_requeridos: [
      { nombre: 'Pasaporte completo (copia)', adjuntado: false, notas: null },
      { nombre: 'Tarjeta de residencia anterior (copia)', adjuntado: false, notas: null },
      { nombre: 'Certificado de empadronamiento', adjuntado: false, notas: null },
      { nombre: 'Antecedentes penales', adjuntado: false, notas: null },
      { nombre: 'Medios económicos (nóminas, contrato, IRPF)', adjuntado: false, notas: null },
      { nombre: 'Tasa modelo 790 código 012', adjuntado: false, notas: null },
      { nombre: 'Fotografía tamaño carné', adjuntado: false, notas: null },
    ],
  },
  {
    titulo: 'Reagrupación familiar',
    categoria: 'extranjeria',
    documentos_requeridos: [
      { nombre: 'Pasaporte del reagrupante (copia)', adjuntado: false, notas: null },
      { nombre: 'Pasaporte del familiar (copia)', adjuntado: false, notas: null },
      { nombre: 'Tarjeta de residencia del reagrupante', adjuntado: false, notas: null },
      { nombre: 'Certificado de empadronamiento', adjuntado: false, notas: null },
      { nombre: 'Acreditación de medios económicos', adjuntado: false, notas: null },
      { nombre: 'Acreditación de vivienda adecuada', adjuntado: false, notas: null },
      { nombre: 'Certificado de matrimonio o parentesco', adjuntado: false, notas: null },
      { nombre: 'Tasa modelo 790 código 012', adjuntado: false, notas: null },
    ],
  },
  {
    titulo: 'Nacionalidad española',
    categoria: 'extranjeria',
    documentos_requeridos: [
      { nombre: 'Pasaporte completo (copia)', adjuntado: false, notas: null },
      { nombre: 'Tarjeta de residencia (copia)', adjuntado: false, notas: null },
      { nombre: 'Certificado de nacimiento del país de origen', adjuntado: false, notas: null },
      { nombre: 'Certificado de empadronamiento histórico', adjuntado: false, notas: null },
      { nombre: 'Certificado de antecedentes penales', adjuntado: false, notas: null },
      { nombre: 'Diploma DELE A2 o superior', adjuntado: false, notas: null },
      { nombre: 'Diploma CCSE', adjuntado: false, notas: null },
      { nombre: 'Tasa modelo 790 código 026', adjuntado: false, notas: null },
    ],
  },
  {
    titulo: 'Autorización de trabajo por cuenta ajena',
    categoria: 'extranjeria',
    documentos_requeridos: [
      { nombre: 'Pasaporte completo (copia)', adjuntado: false, notas: null },
      { nombre: 'Contrato de trabajo', adjuntado: false, notas: null },
      { nombre: 'DNI/CIF del empleador', adjuntado: false, notas: null },
      { nombre: 'Alta en Seguridad Social', adjuntado: false, notas: null },
      { nombre: 'Memoria de actividad de la empresa', adjuntado: false, notas: null },
      { nombre: 'Tasa modelo 790 código 062', adjuntado: false, notas: null },
    ],
  },
  {
    titulo: 'Autorización de trabajo por cuenta propia',
    categoria: 'extranjeria',
    documentos_requeridos: [
      { nombre: 'Pasaporte completo (copia)', adjuntado: false, notas: null },
      { nombre: 'Proyecto de negocio / plan de empresa', adjuntado: false, notas: null },
      { nombre: 'Alta censal (modelo 036/037)', adjuntado: false, notas: null },
      { nombre: 'Licencia de actividad (si aplica)', adjuntado: false, notas: null },
      { nombre: 'Acreditación de medios económicos', adjuntado: false, notas: null },
      { nombre: 'Tasa modelo 790 código 062', adjuntado: false, notas: null },
    ],
  },
  {
    titulo: 'Carta de invitación',
    categoria: 'extranjeria',
    documentos_requeridos: [
      { nombre: 'DNI/NIE del invitante', adjuntado: false, notas: null },
      { nombre: 'Pasaporte del invitado', adjuntado: false, notas: null },
      { nombre: 'Certificado de empadronamiento del invitante', adjuntado: false, notas: null },
      { nombre: 'Medios económicos del invitante', adjuntado: false, notas: null },
      { nombre: 'Tasa de carta de invitación', adjuntado: false, notas: null },
    ],
  },
  {
    titulo: 'Modificación de situación (residencia y trabajo)',
    categoria: 'extranjeria',
    documentos_requeridos: [
      { nombre: 'Pasaporte completo (copia)', adjuntado: false, notas: null },
      { nombre: 'Tarjeta de residencia vigente', adjuntado: false, notas: null },
      { nombre: 'Contrato de trabajo', adjuntado: false, notas: null },
      { nombre: 'Tasa modelo 790 código 012', adjuntado: false, notas: null },
    ],
  },
  {
    titulo: 'TIE (Tarjeta de Identidad de Extranjero)',
    categoria: 'extranjeria',
    documentos_requeridos: [
      { nombre: 'Pasaporte completo (copia)', adjuntado: false, notas: null },
      { nombre: 'Resolución favorable', adjuntado: false, notas: null },
      { nombre: 'Certificado de empadronamiento', adjuntado: false, notas: null },
      { nombre: 'Fotografía tamaño carné', adjuntado: false, notas: null },
      { nombre: 'Tasa modelo 790 código 012', adjuntado: false, notas: null },
      { nombre: 'Tasa modelo 790 código 052', adjuntado: false, notas: null },
    ],
  },
  {
    titulo: 'Recurso de reposición',
    categoria: 'extranjeria',
    documentos_requeridos: [
      { nombre: 'Resolución denegatoria', adjuntado: false, notas: null },
      { nombre: 'Escrito de recurso', adjuntado: false, notas: null },
      { nombre: 'Documentación adicional de soporte', adjuntado: false, notas: null },
    ],
  },
  {
    titulo: 'Recurso de alzada',
    categoria: 'extranjeria',
    documentos_requeridos: [
      { nombre: 'Resolución denegatoria', adjuntado: false, notas: null },
      { nombre: 'Escrito de recurso de alzada', adjuntado: false, notas: null },
      { nombre: 'Documentación adicional de soporte', adjuntado: false, notas: null },
    ],
  },
  {
    titulo: 'Asilo / Protección internacional',
    categoria: 'extranjeria',
    documentos_requeridos: [
      { nombre: 'Pasaporte o documento de viaje', adjuntado: false, notas: null },
      { nombre: 'Relato detallado de persecución', adjuntado: false, notas: null },
      { nombre: 'Pruebas documentales', adjuntado: false, notas: null },
      { nombre: 'Fotografía tamaño carné', adjuntado: false, notas: null },
    ],
  },

  // ── CIVIL ──
  {
    titulo: 'Procedimiento civil genérico',
    categoria: 'civil',
    documentos_requeridos: [
      { nombre: 'DNI/NIE del cliente', adjuntado: false, notas: null },
      { nombre: 'Documentación relevante', adjuntado: false, notas: null },
    ],
  },

  // ── LABORAL ──
  {
    titulo: 'Procedimiento laboral genérico',
    categoria: 'laboral',
    documentos_requeridos: [
      { nombre: 'DNI/NIE del cliente', adjuntado: false, notas: null },
      { nombre: 'Contrato de trabajo', adjuntado: false, notas: null },
      { nombre: 'Nóminas', adjuntado: false, notas: null },
    ],
  },

  // ── BANCARIO ──
  {
    titulo: 'Reclamación bancaria genérica',
    categoria: 'bancario',
    documentos_requeridos: [
      { nombre: 'DNI/NIE del cliente', adjuntado: false, notas: null },
      { nombre: 'Contrato bancario', adjuntado: false, notas: null },
      { nombre: 'Extractos bancarios', adjuntado: false, notas: null },
    ],
  },

  // ── ADMINISTRATIVO ──
  {
    titulo: 'Procedimiento administrativo genérico',
    categoria: 'administrativo',
    documentos_requeridos: [
      { nombre: 'DNI/NIE del cliente', adjuntado: false, notas: null },
      { nombre: 'Resolución administrativa', adjuntado: false, notas: null },
    ],
  },
];

// ─── Funciones de gestión del catálogo ─────────────────────────────

// Obtener catálogo completo (defaults + custom)
export async function getCatalogoCompleto(): Promise<ProcedimientoCatalogo[]> {
  const custom = await getCustomCatalogo();
  // Combinar y eliminar duplicados (custom tiene prioridad)
  const map = new Map<string, ProcedimientoCatalogo>();
  [...CATALOGO_PROCEDIMIENTOS, ...custom].forEach(p => {
    map.set(p.titulo, p);
  });
  return Array.from(map.values());
}

// ─── Funciones getter (usando catálogo completo) ─────────────────────

// Obtener títulos únicos para autocompletar
export async function getTitulosPorCategoria(categoria?: CategoriaProcedimiento): Promise<string[]> {
  const catalogo = await getCatalogoCompleto();
  const filtered = categoria
    ? catalogo.filter(p => p.categoria === categoria)
    : catalogo;
  return filtered.map(p => p.titulo);
}

// Obtener documentos requeridos según el título del procedimiento
export async function getDocumentosRequeridos(titulo: string): Promise<DocumentoRequerido[]> {
  const catalogo = await getCatalogoCompleto();
  const proc = catalogo.find(p => p.titulo === titulo);
  return proc ? proc.documentos_requeridos.map(d => ({ ...d })) : [];
}

// Obtener la categoría según el título
export async function getCategoriaByTitulo(titulo: string): Promise<CategoriaProcedimiento | null> {
  const catalogo = await getCatalogoCompleto();
  const proc = catalogo.find(p => p.titulo === titulo);
  return proc ? proc.categoria : null;
}

// Obtener labels de todas las categorías (incluyendo custom)
export async function getAllCategoriaLabels(): Promise<Record<string, string>> {
  const customCats = await getCategoriasCustom();
  return { ...CATEGORIA_LABELS, ...customCats };
}

// ─── Propagar cambios de documentos del catálogo a procedimientos existentes ───

export interface PropagationResult {
  updated: number;
  skipped: number;
  errors: number;
  details: string[];
}

/**
 * Propaga los documentos requeridos del catálogo a todos los procedimientos existentes
 * que tengan el mismo título, SIN eliminar docs añadidos manualmente.
 * 
 * Lógica:
 * - Se comparan docs del catálogo ANTERIOR con el NUEVO para detectar:
 *   a) Docs sin cambios (mismo nombre en ambas listas)
 *   b) Docs renombrados (estaban en el viejo, no en el nuevo, detectados por posición)
 *   c) Docs nuevos (solo en la nueva lista)
 *   d) Docs eliminados (solo en la vieja lista, sin equivalente en la nueva)
 * 
 * - Para cada procedimiento con ese título:
 *   1. Los docs que NO estaban en el catálogo anterior se consideran "manuales" → se preservan intactos.
 *   2. Los docs sin cambios → se mantienen con su estado adjuntado/notas.
 *   3. Los docs renombrados → se actualiza el nombre, se PRESERVA adjuntado, se marca requiere_revision + nombre_anterior.
 *   4. Los docs nuevos → se añaden como no adjuntados.
 *   5. Los docs eliminados del catálogo → se eliminan del expediente (solo los del catálogo, no los manuales).
 */
export async function propagateDocsToExistingProcedimientos(
  titulo: string,
  newCatalogDocs: DocumentoRequerido[],
  oldCatalogDocs: DocumentoRequerido[]
): Promise<PropagationResult> {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return { updated: 0, skipped: 0, errors: 0, details: ['Usuario no autenticado'] };

  // Buscar todos los procedimientos del usuario con ese título
  const { data: procedimientos, error } = await supabase
    .from('procedimientos')
    .select('id, titulo, documentos_requeridos')
    .eq('user_id', user.id)
    .eq('titulo', titulo);

  if (error) {
    return { updated: 0, skipped: 0, errors: 1, details: [`Error buscando procedimientos: ${error.message}`] };
  }

  if (!procedimientos || procedimientos.length === 0) {
    return { updated: 0, skipped: 0, errors: 0, details: ['No hay procedimientos con este título'] };
  }

  // ── Detectar cambios entre catálogo viejo y nuevo ──
  const oldNames = new Set(oldCatalogDocs.map(d => d.nombre));
  const newNames = new Set(newCatalogDocs.map(d => d.nombre));
  
  // Docs que existen en ambos (sin cambio de nombre)
  const unchanged = newCatalogDocs.filter(d => oldNames.has(d.nombre));
  
  // Docs solo en nuevo (podrían ser nuevos o renombramientos)
  const onlyInNew = newCatalogDocs.filter(d => !oldNames.has(d.nombre));
  // Docs solo en viejo (podrían ser eliminados o renombramientos)
  const onlyInOld = oldCatalogDocs.filter(d => !newNames.has(d.nombre));
  
  // Detectar renombramientos por posición: si el viejo pos[i] desapareció y nuevo pos[i] es nuevo
  const renames: Map<string, string> = new Map(); // oldName -> newName
  const trulyNew: DocumentoRequerido[] = [];
  const trulyRemoved: Set<string> = new Set();
  
  // Mapear posiciones originales
  const oldPositions = new Map<string, number>();
  oldCatalogDocs.forEach((d, i) => oldPositions.set(d.nombre, i));
  const newPositions = new Map<string, number>();
  newCatalogDocs.forEach((d, i) => newPositions.set(d.nombre, i));
  
  // Para cada doc solo en nuevo, buscar si hay un doc solo en viejo en la misma posición
  const matchedOld = new Set<string>();
  for (const newDoc of onlyInNew) {
    const newPos = newPositions.get(newDoc.nombre)!;
    // Buscar un doc viejo eliminado en la misma posición
    const oldDocAtPos = onlyInOld.find(od => oldPositions.get(od.nombre) === newPos && !matchedOld.has(od.nombre));
    if (oldDocAtPos) {
      renames.set(oldDocAtPos.nombre, newDoc.nombre);
      matchedOld.add(oldDocAtPos.nombre);
    } else {
      trulyNew.push(newDoc);
    }
  }
  
  // Docs viejos no matcheados = realmente eliminados
  for (const oldDoc of onlyInOld) {
    if (!matchedOld.has(oldDoc.nombre)) {
      trulyRemoved.add(oldDoc.nombre);
    }
  }

  const result: PropagationResult = { updated: 0, skipped: 0, errors: 0, details: [] };

  for (const proc of procedimientos) {
    try {
      const currentDocs: DocumentoRequerido[] = proc.documentos_requeridos || [];
      
      // Mapear docs actuales del expediente por nombre para acceso rápido
      const currentByName = new Map<string, DocumentoRequerido>();
      currentDocs.forEach(d => currentByName.set(d.nombre, d));
      
      // Separar docs manuales (no estaban en el catálogo anterior) de los del catálogo
      const docsManual = currentDocs.filter(d => !oldNames.has(d.nombre));
      
      // Construir nueva lista
      const mergedDocs: DocumentoRequerido[] = [];
      
      // 1. Docs sin cambio de nombre: preservar estado completo, actualizar descripcion/enlace del catálogo
      for (const doc of unchanged) {
        const existing = currentByName.get(doc.nombre);
        mergedDocs.push({
          nombre: doc.nombre,
          adjuntado: existing?.adjuntado ?? false,
          notas: existing?.notas ?? null,
          descripcion: doc.descripcion ?? existing?.descripcion ?? null,
          enlace: doc.enlace ?? existing?.enlace ?? null,
          // Limpiar marca de revisión si existía de una propagación anterior
          nombre_anterior: null,
          requiere_revision: false,
        });
      }
      
      // 2. Docs renombrados: preservar adjuntado + marcar para revisión
      for (const [oldName, newName] of renames) {
        const existing = currentByName.get(oldName);
        const newCatalogDoc = newCatalogDocs.find(d => d.nombre === newName);
        mergedDocs.push({
          nombre: newName,
          adjuntado: existing?.adjuntado ?? false, // PRESERVAR estado adjuntado
          notas: existing?.notas ?? null,
          descripcion: newCatalogDoc?.descripcion ?? existing?.descripcion ?? null,
          enlace: newCatalogDoc?.enlace ?? existing?.enlace ?? null,
          nombre_anterior: oldName,
          requiere_revision: true,
        });
      }
      
      // 3. Docs totalmente nuevos: añadir sin adjuntar
      for (const doc of trulyNew) {
        mergedDocs.push({
          nombre: doc.nombre,
          adjuntado: false,
          notas: null,
          descripcion: doc.descripcion ?? null,
          enlace: doc.enlace ?? null,
          nombre_anterior: null,
          requiere_revision: false,
        });
      }
      
      // 4. Docs manuales: mantener intactos al final
      mergedDocs.push(...docsManual);
      
      // (Los docs en trulyRemoved simplemente no se incluyen → se eliminan)

      // Actualizar el procedimiento
      const { error: updateError } = await supabase
        .from('procedimientos')
        .update({ documentos_requeridos: mergedDocs })
        .eq('id', proc.id);

      if (updateError) {
        result.errors++;
        result.details.push(`Error en procedimiento ${proc.id}: ${updateError.message}`);
      } else {
        result.updated++;
      }
    } catch (err: any) {
      result.errors++;
      result.details.push(`Error inesperado: ${err.message}`);
    }
  }

  return result;
}

/**
 * Cuenta cuántos procedimientos existentes se verían afectados por una propagación.
 */
export async function countAffectedProcedimientos(titulo: string): Promise<number> {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from('procedimientos')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('titulo', titulo);

  if (error) return 0;
  return count || 0;
}

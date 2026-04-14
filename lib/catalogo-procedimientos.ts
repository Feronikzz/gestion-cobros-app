import type { CategoriaProcedimiento, DocumentoRequerido } from '@/lib/supabase/types';

export interface ProcedimientoCatalogo {
  titulo: string;
  categoria: CategoriaProcedimiento;
  documentos_requeridos: DocumentoRequerido[];
}

// Extender CategoriaProcedimiento para permitir categorías dinámicas
export type CategoriaProcedimientoExtendida = CategoriaProcedimiento | string;

export const CATEGORIA_LABELS: Record<CategoriaProcedimiento, string> = {
  extranjeria: 'Extranjería',
  civil: 'Civil',
  laboral: 'Laboral',
  bancario: 'Bancario',
  administrativo: 'Administrativo',
  otro: 'Otro',
};

// Clave para localStorage
const STORAGE_KEY = 'catalogo_procedimientos_v1';
const STORAGE_KEY_CATS = 'catalogo_categorias_v1';

// Obtener catálogo custom de localStorage
function getCustomCatalogo(): ProcedimientoCatalogo[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

// Guardar catálogo custom
function saveCustomCatalogo(custom: ProcedimientoCatalogo[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
  } catch { }
}

// Obtener categorías custom
export function getCategoriasCustom(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const saved = localStorage.getItem(STORAGE_KEY_CATS);
    return saved ? JSON.parse(saved) : {};
  } catch { return {}; }
}

// Guardar categorías custom
export function saveCategoriasCustom(cats: Record<string, string>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_CATS, JSON.stringify(cats));
  } catch { }
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
export function getCatalogoCompleto(): ProcedimientoCatalogo[] {
  const custom = getCustomCatalogo();
  // Combinar y eliminar duplicados (custom tiene prioridad)
  const map = new Map<string, ProcedimientoCatalogo>();
  [...CATALOGO_PROCEDIMIENTOS, ...custom].forEach(p => {
    map.set(p.titulo, p);
  });
  return Array.from(map.values());
}

// Añadir procedimiento al catálogo custom
export function addProcedimientoCatalogo(proc: ProcedimientoCatalogo): boolean {
  const custom = getCustomCatalogo();
  if (custom.find(p => p.titulo === proc.titulo)) {
    return false; // Ya existe
  }
  custom.push(proc);
  saveCustomCatalogo(custom);
  return true;
}

// Actualizar procedimiento en catálogo custom
export function updateProcedimientoCatalogo(tituloOriginal: string, proc: ProcedimientoCatalogo): boolean {
  // Si es un default, lo añadimos a custom con los cambios (override)
  const custom = getCustomCatalogo();
  const idx = custom.findIndex(p => p.titulo === tituloOriginal);
  
  if (idx >= 0) {
    // Actualizar existente
    custom[idx] = proc;
  } else if (CATALOGO_PROCEDIMIENTOS.find(p => p.titulo === tituloOriginal)) {
    // Es un default, añadir a custom como override
    custom.push(proc);
  } else {
    return false;
  }
  
  saveCustomCatalogo(custom);
  return true;
}

// Eliminar procedimiento del catálogo custom
export function deleteProcedimientoCatalogo(titulo: string): boolean {
  const custom = getCustomCatalogo();
  const filtered = custom.filter(p => p.titulo !== titulo);
  if (filtered.length === custom.length) return false;
  saveCustomCatalogo(filtered);
  return true;
}

// ─── Funciones getter (usando catálogo completo) ─────────────────────

// Obtener títulos únicos para autocompletar
export function getTitulosPorCategoria(categoria?: CategoriaProcedimiento): string[] {
  const catalogo = getCatalogoCompleto();
  const filtered = categoria
    ? catalogo.filter(p => p.categoria === categoria)
    : catalogo;
  return filtered.map(p => p.titulo);
}

// Obtener documentos requeridos según el título del procedimiento
export function getDocumentosRequeridos(titulo: string): DocumentoRequerido[] {
  const catalogo = getCatalogoCompleto();
  const proc = catalogo.find(p => p.titulo === titulo);
  return proc ? proc.documentos_requeridos.map(d => ({ ...d })) : [];
}

// Obtener la categoría según el título
export function getCategoriaByTitulo(titulo: string): CategoriaProcedimiento | null {
  const catalogo = getCatalogoCompleto();
  const proc = catalogo.find(p => p.titulo === titulo);
  return proc ? proc.categoria : null;
}

// Obtener labels de todas las categorías (incluyendo custom)
export function getAllCategoriaLabels(): Record<string, string> {
  const customCats = getCategoriasCustom();
  return { ...CATEGORIA_LABELS, ...customCats };
}

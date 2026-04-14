import type { CategoriaProcedimiento, DocumentoRequerido } from '@/lib/supabase/types';

export interface ProcedimientoCatalogo {
  titulo: string;
  categoria: CategoriaProcedimiento;
  documentos_requeridos: DocumentoRequerido[];
}

export const CATEGORIA_LABELS: Record<CategoriaProcedimiento, string> = {
  extranjeria: 'Extranjería',
  civil: 'Civil',
  laboral: 'Laboral',
  bancario: 'Bancario',
  administrativo: 'Administrativo',
  otro: 'Otro',
};

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

// Obtener títulos únicos para autocompletar
export function getTitulosPorCategoria(categoria?: CategoriaProcedimiento): string[] {
  const filtered = categoria
    ? CATALOGO_PROCEDIMIENTOS.filter(p => p.categoria === categoria)
    : CATALOGO_PROCEDIMIENTOS;
  return filtered.map(p => p.titulo);
}

// Obtener documentos requeridos según el título del procedimiento
export function getDocumentosRequeridos(titulo: string): DocumentoRequerido[] {
  const proc = CATALOGO_PROCEDIMIENTOS.find(p => p.titulo === titulo);
  return proc ? proc.documentos_requeridos.map(d => ({ ...d })) : [];
}

// Obtener la categoría según el título
export function getCategoriaByTitulo(titulo: string): CategoriaProcedimiento | null {
  const proc = CATALOGO_PROCEDIMIENTOS.find(p => p.titulo === titulo);
  return proc ? proc.categoria : null;
}

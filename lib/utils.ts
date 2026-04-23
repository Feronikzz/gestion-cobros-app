/**
 * Formatea un número como moneda EUR.
 */
export function eur(value: number | string | null | undefined): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

/**
 * Extrae el mes (YYYY-MM) de una fecha ISO string.
 */
export function monthFromDate(dateStr: string): string {
  return String(dateStr || '').slice(0, 7);
}

/**
 * Convierte un mes (YYYY-MM) a etiqueta legible: "Enero 2025".
 */
export function monthLabel(month: string): string {
  const [y, m] = month.split('-');
  const names = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];
  return `${names[Number(m) - 1] || month} ${y || ''}`.trim();
}

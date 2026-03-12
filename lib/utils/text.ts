/**
 * Utilidades de texto para capitalización y formateo
 */

/**
 * Capitaliza la primera letra de cada palabra
 * Ejemplo: "juan perez" -> "Juan Perez"
 */
export function capitalizeWords(text: string): string {
  if (!text || text.trim() === '') return text;
  
  return text
    .toLowerCase()
    .split(' ')
    .map(word => {
      // Mantener siglas como DNI, NIE, CIF, etc.
      if (word.length <= 3 && word === word.toUpperCase()) {
        return word.toUpperCase();
      }
      // Capitalizar palabras normales
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Capitaliza solo la primera letra
 * Ejemplo: "juan" -> "Juan"
 */
export function capitalizeFirst(text: string): string {
  if (!text || text.trim() === '') return text;
  
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Formatea nombre completo con capitalización inteligente
 * Maneja nombres compuestos y apellidos
 */
export function formatName(name: string): string {
  if (!name || name.trim() === '') return name;
  
  // Palabras que no se capitalizan (preposiciones, conjunciones, etc.)
  const exceptions = ['de', 'la', 'los', 'las', 'del', 'el', 'y', 'o', 'u'];
  
  return name
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      // Mantener siglas
      if (word.length <= 3 && word === word.toUpperCase()) {
        return word.toUpperCase();
      }
      // No capitalizar excepciones excepto al inicio
      if (index > 0 && exceptions.includes(word.toLowerCase())) {
        return word.toLowerCase();
      }
      // Capitalizar palabra normal
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Formatea dirección con capitalización inteligente
 * Mantiene números y códigos postales
 */
export function formatAddress(address: string): string {
  if (!address || address.trim() === '') return address;
  
  return address
    .split(' ')
    .map(word => {
      // Mantener números y códigos postales
      if (/^\d+/.test(word)) {
        return word.toUpperCase();
      }
      // Mantener siglas comunes en direcciones
      if (word.length <= 3 && word === word.toUpperCase()) {
        return word.toUpperCase();
      }
      // Capitalizar resto
      return capitalizeFirst(word);
    })
    .join(' ');
}

/**
 * Formatea NIF/CIF manteniendo el formato
 * Ejemplo: "12345678a" -> "12345678A"
 */
export function formatNIF(nif: string): string {
  if (!nif || nif.trim() === '') return nif;
  
  const clean = nif.replace(/\s/g, '').toUpperCase();
  const number = clean.slice(0, -1);
  const letter = clean.slice(-1);
  
  return number + letter;
}

/**
 * Formatea email (normalmente a minúsculas)
 */
export function formatEmail(email: string): string {
  if (!email || email.trim() === '') return email;
  
  return email.toLowerCase().trim();
}

/**
 * Formatea teléfono manteniendo solo dígitos
 * Ejemplo: "600 000 000" -> "600000000"
 */
export function formatPhone(phone: string): string {
  if (!phone || phone.trim() === '') return phone;
  
  return phone.replace(/\s/g, '');
}

/**
 * Aplica formato automático según el tipo de campo
 */
export function formatField(value: string, fieldType: 'name' | 'address' | 'nif' | 'email' | 'phone' | 'general'): string {
  if (!value || value.trim() === '') return value;
  
  switch (fieldType) {
    case 'name':
      return formatName(value);
    case 'address':
      return formatAddress(value);
    case 'nif':
      return formatNIF(value);
    case 'email':
      return formatEmail(value);
    case 'phone':
      return formatPhone(value);
    case 'general':
    default:
      return capitalizeWords(value);
  }
}

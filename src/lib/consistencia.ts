/**
 * Reglas de consistencia jurídica que se evalúan sobre texto libre
 * (descripciones de eventos, propuestas, etc.) para detectar cruces
 * con datos estructurados del caso (medidas cautelares, restricciones).
 *
 * Estas reglas generan warnings no bloqueantes — el abogado siempre
 * puede guardar igual si ya lo revisó.
 */

/**
 * Normaliza texto a lowercase y sin acentos. Permite que "régimen" y
 * "regimen" matcheen la misma keyword.
 */
export function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Frases que, sueltas o combinadas, sugieren que la contraparte está
 * proponiendo un régimen de comunicación amplio / ordinario con los hijos.
 * Se almacenan ya normalizadas (lowercase + sin acentos) para comparar
 * con la misma representación del texto a analizar.
 */
const KEYWORDS_CONTACTO_AMPLIO: string[] = [
  'regimen amplio',
  'regimen ordinario',
  'regimen habitual',
  'regimen de visitas',
  'contacto amplio',
  'contacto fluido',
  'contacto frecuente',
  'contacto directo',
  'comunicacion amplia',
  'comunicacion ordinaria',
  'comunicacion habitual',
  'comunicacion sin restricciones',
  'visitas habituales',
  'visitas ordinarias',
  'visitas amplias',
  'visitas sin restricciones',
  'fines de semana alternos',
  'fines de semana con pernocte',
  'pernoctes',
  'pernocta',
  'vacaciones con',
  'dias de semana con',
  'ver a los hijos',
  'ver a los ninos',
  'tiempo con los hijos',
  'tiempo con los ninos',
  'trato frecuente',
  'trato habitual',
  'acercamiento a los hijos',
  'sin restricciones de contacto',
];

/**
 * Devuelve true si el texto sugiere que la contraparte propone un régimen
 * de comunicación amplio / ordinario con los hijos. Matching case-insensitive
 * y tolerante a acentos.
 */
export function detectPropuestaContactoAmplia(texto: string): boolean {
  if (!texto) return false;
  const norm = normalizarTexto(texto);
  return KEYWORDS_CONTACTO_AMPLIO.some(kw => norm.includes(kw));
}

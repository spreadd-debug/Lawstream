// Puente entre la instrucción del caso (matter.caseData) y la entidad
// LetradoParte del expediente. Hasta ahora eran dos silos: el abogado de la
// contraparte se cargaba como texto libre en caseData.conyuge2_abogado y el
// panel de Letrados quedaba vacío. Este módulo los conecta para tratar al
// letrado como un dato "vivo": lo cargás de un lado y aparece del otro.
//
// La matrícula estructurada (tomo/folio/colegio) se serializa en caseData
// como un string canónico (ver MatriculaInput) y se descompone en
// LetradoParte.matricula (tomo/folio) + LetradoParte.colegio.

import { LetradoParte } from '../types';
import { parseMatricula, serializeMatricula } from '../components/MatriculaInput';

// Claves de caseData que usan las fichas de divorcio para el abogado de la
// contraparte. Si en el futuro otros templates agregan un abogado con otra
// clave, se suman acá.
export const ABOGADO_CONTRAPARTE_KEY = 'conyuge2_abogado';
export const ABOGADO_CONTRAPARTE_MATRICULA_KEY = 'conyuge2_abogado_matricula';

export interface LetradoDesdeFicha {
  nombre: string;
  matricula?: string;   // solo tomo/folio, ej. "T° 91 F° 156"
  colegio?: string;
}

// Extrae los datos del letrado de la contraparte desde el caseData de la
// ficha. Devuelve null si no hay nombre cargado (nada que reflejar).
export function letradoContraparteDesdeFicha(
  caseData: Record<string, string>,
): LetradoDesdeFicha | null {
  const nombre = (caseData[ABOGADO_CONTRAPARTE_KEY] ?? '').trim();
  if (!nombre) return null;

  const m = parseMatricula(caseData[ABOGADO_CONTRAPARTE_MATRICULA_KEY] ?? '');
  const tomoFolio = serializeMatricula({ tomo: m.tomo, folio: m.folio });
  return {
    nombre,
    matricula: tomoFolio || undefined,
    colegio:   m.colegio || undefined,
  };
}

// Reconstruye el string canónico de matrícula (para la ficha) a partir de un
// LetradoParte, recombinando su matricula (tomo/folio) con el colegio.
export function fichaMatriculaDesdeLetrado(letrado: LetradoParte): string {
  const m = parseMatricula(letrado.matricula ?? '');
  return serializeMatricula({ tomo: m.tomo, folio: m.folio, colegio: letrado.colegio ?? '' });
}

// Dado el caseData de la ficha y los letrados existentes del matter, devuelve
// un caseData "sembrado": si la ficha no tiene el abogado cargado pero ya
// existe un letrado vigente de la contraparte en el expediente, completa los
// campos para que la ficha lo muestre (dirección expediente → instrucciones).
export function sembrarFichaConLetrado(
  caseData: Record<string, string>,
  letradosDelMatter: LetradoParte[],
): Record<string, string> {
  const yaCargado = (caseData[ABOGADO_CONTRAPARTE_KEY] ?? '').trim();
  if (yaCargado) return caseData;

  const letrado = letradosDelMatter.find(
    l => l.representaA === 'contraparte' && l.estado === 'vigente',
  );
  if (!letrado) return caseData;

  return {
    ...caseData,
    [ABOGADO_CONTRAPARTE_KEY]: letrado.nombre,
    [ABOGADO_CONTRAPARTE_MATRICULA_KEY]: fichaMatriculaDesdeLetrado(letrado),
  };
}

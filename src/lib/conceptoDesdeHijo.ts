// Patrón "dato vivo": un concepto en especie de la cuota alimentaria referencia
// a un hijo (hijoId), así que en vez de re-tipear el colegio / la obra social /
// el AT, los derivamos de los datos que ya se cargaron en la ficha del hijo.
//
// Ver también: src/lib/letradoBridge.ts (caseData ↔ LetradoParte) y
// BIEN_AUTOFILL_MAP en src/components/Plantillas.tsx — mismo principio.

import { CategoriaConceptoEspecie, HijoCaso } from '../types';

export interface ConceptoSugerido {
  concepto?: string;
  prestador?: string;
}

// Mapea una categoría de concepto al dato estructurado del hijo que le
// corresponde. Devuelve campos vacíos cuando el hijo no tiene ese dato o la
// categoría no tiene una fuente clara (ej. terapia ya tiene "Importar
// terapias"; extracurricular no vive en el hijo sino como gasto).
export function conceptoSugeridoDesdeHijo(
  categoria: CategoriaConceptoEspecie,
  hijo: HijoCaso,
): ConceptoSugerido {
  switch (categoria) {
    case 'colegio':
      return { concepto: hijo.establecimiento?.trim() || undefined };
    case 'prepaga':
      // coberturaEspecial suele ser la obra social / prepaga (ej. "OSDE 410").
      return { concepto: hijo.coberturaEspecial?.trim() || undefined };
    case 'acompanante_terapeutico':
      return hijo.acompananteTerapeutico && hijo.acompananteTerapeutico !== 'no'
        ? { concepto: `AT ${hijo.acompananteTerapeutico}` }
        : {};
    default:
      return {};
  }
}

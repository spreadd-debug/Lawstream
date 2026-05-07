// GAP UX-31 — Detector de señales que ameritan evaluar cautelares
// patrimoniales preventivas (típicamente, inhibición general de bienes).
//
// Caso real (audit Camila): la contraparte tomó un préstamo personal de
// $5.000.000 días antes de presentar el divorcio. Sin un detector
// automático, esta señal de potencial vaciamiento patrimonial depende
// 100% de que el abogado la note al revisar manualmente los pasivos
// cargados. Lo visibilizamos con un banner + alerta.
//
// Heurística simple (intencional — la decisión de pedir cautelar tiene
// mucho contexto procesal que no podemos modelar):
//
//   1. El caso es divorcio (template fam-divorcio o fam-divorcio-pba).
//   2. Hay al menos un pasivo (deuda) cuyo titular es la contraparte
//      con monto >= UMBRAL_PASIVO_RELEVANTE (configurable).
//   3. NO hay cautelares vigentes contra la contraparte — si ya
//      pediste/trabaste una, asumimos que la decisión está tomada.
//
// Cuando se cumplen las tres, el banner se muestra. Cuando se crea una
// cautelar contra la contraparte, la alerta desaparece sola.

import { Bien, Cautelar, Matter } from '../types';

// Umbral en pesos argentinos. Conservador a propósito — preferimos
// false positives a false negatives. El abogado puede dismissar.
export const UMBRAL_PASIVO_RELEVANTE_ARS = 2_000_000;
// Equivalente USD aproximado (a evaluar manualmente — los montos USD
// suelen ser mucho más significativos que los ARS por el monto absoluto).
export const UMBRAL_PASIVO_RELEVANTE_USD = 2_000;

// Estados de cautelar que consideramos "vigentes" — replica la lista del
// CautelaresPanel para evitar acoplamiento.
const CAUTELAR_VIGENTE_STATES = new Set<string>([
  'solicitada', 'concedida', 'trabada', 'parcialmente_levantada',
]);

export interface SenalCautelar {
  bien: Bien;
  /** Monto del pasivo en su moneda original. */
  monto: number;
  moneda: string;
}

export interface SenalesCautelarResult {
  /** Lista de pasivos de la contraparte que superan el umbral. */
  pasivosRelevantes: SenalCautelar[];
  /** True cuando ya hay alguna cautelar vigente contra la contraparte —
   *  en ese caso la alerta NO debe mostrarse aunque haya pasivos. */
  yaHayCautelarContraContraparte: boolean;
  /** True cuando aplica mostrar el banner. */
  ameritaEvaluar: boolean;
}

/**
 * Evalúa si el matter amerita un banner sugiriendo cautelar preventiva.
 * Pasar bienes y cautelares ya filtrados por matterId (más eficiente).
 */
export function detectarSenalesCautelar(
  matter: Matter | undefined,
  bienesDelMatter: Bien[],
  cautelaresDelMatter: Cautelar[],
): SenalesCautelarResult {
  const vacio: SenalesCautelarResult = {
    pasivosRelevantes: [],
    yaHayCautelarContraContraparte: false,
    ameritaEvaluar: false,
  };

  // Solo aplica en divorcio — la lógica de comunidad ganancial es la
  // que justifica este tipo de cautelares preventivas.
  if (!matter) return vacio;
  const esDivorcio = matter.flowTemplateId === 'fam-divorcio'
                  || matter.flowTemplateId === 'fam-divorcio-pba';
  if (!esDivorcio) return vacio;

  const pasivosRelevantes: SenalCautelar[] = [];
  for (const b of bienesDelMatter) {
    if (b.naturaleza !== 'pasivo') continue;
    if (b.titularRol !== 'contraparte') continue;
    if (b.valorActual == null) continue;
    const moneda = b.monedaActual ?? 'ARS';
    const umbral = moneda === 'USD' || moneda === 'EUR'
      ? UMBRAL_PASIVO_RELEVANTE_USD
      : UMBRAL_PASIVO_RELEVANTE_ARS;
    if (b.valorActual >= umbral) {
      pasivosRelevantes.push({ bien: b, monto: b.valorActual, moneda });
    }
  }

  if (pasivosRelevantes.length === 0) return vacio;

  const yaHayCautelarContraContraparte = cautelaresDelMatter.some(c =>
    c.contraRol === 'contraparte' && CAUTELAR_VIGENTE_STATES.has(c.estado),
  );

  return {
    pasivosRelevantes,
    yaHayCautelarContraContraparte,
    ameritaEvaluar: !yaHayCautelarContraContraparte,
  };
}

import { LEGAL_TEMPLATES } from '../data/legalTemplates';
import { LegalTemplate, MatterType } from '../types';

/**
 * Maps task titles from flow stages to the best matching legal template.
 * Uses keyword matching against template titles, tags, and subcategories.
 */

// Explicit mappings: task keyword patterns → template IDs
const EXPLICIT_MAP: [RegExp, string][] = [
  // Laboral
  [/demanda.*despido|preparar demanda.*laboral/i, 'lab-despido-incausado'],
  [/telegrama.*intimaci[oó]n|intimar.*empleador|enviar.*telegrama.*intim/i, 'lab-telegrama-intimacion'],
  [/telegrama.*despido.*indirecto|despido indirecto/i, 'lab-telegrama-despido-indirecto'],
  [/telegrama.*diferencias|diferencias salariales/i, 'lab-telegrama-diferencias'],
  [/demanda.*no registrado|empleo.*negro|demanda.*registraci/i, 'lab-demanda-no-registrado'],
  [/demanda.*diferencias salariales/i, 'lab-demanda-diferencias'],
  [/certificado.*art.*80|certificaci[oó]n.*servicios|intimar.*certificados/i, 'lab-certificacion-servicios'],

  // Familia
  [/demanda.*divorcio|preparar.*divorcio/i, 'fam-divorcio-mutuo'],
  [/demanda.*alimentos|redactar.*alimentos/i, 'fam-alimentos'],
  [/r[eé]gimen.*comunicaci[oó]n|r[eé]gimen.*visitas|propuesta.*r[eé]gimen/i, 'fam-regimen-comunicacion'],

  // Daños
  [/demanda.*accidente|demanda.*da[ñn]os.*tr[aá]nsito/i, 'dan-accidente-transito'],

  // Comercial
  [/contrato.*locaci[oó]n|contrato.*alquiler/i, 'com-contrato-locacion'],
  [/ejecuci[oó]n.*pagar[eé]|demanda.*ejecutiva/i, 'com-ejecucion-pagare'],

  // Sucesiones
  [/inicio.*sucesi[oó]n|iniciar.*sucesorio|declaratoria.*herederos/i, 'suc-inicio-sucesion'],
  [/oficios.*registros|solicitar oficios/i, 'suc-oficio-registros'],

  // Civil
  [/amparo|acci[oó]n.*amparo/i, 'civ-amparo'],
  [/medida.*cautelar|cautelar.*gen[eé]rica/i, 'civ-medida-cautelar'],
  [/recurso.*apelaci[oó]n|apelar/i, 'civ-recurso-apelacion'],
];

// Generic keyword patterns to match against template tags/titles
const KEYWORD_PATTERNS: [RegExp, string[]][] = [
  [/redactar|preparar|generar|confeccionar|elaborar/i, []],  // action verbs (boost)
  [/demanda/i, ['demanda']],
  [/telegrama/i, ['telegrama']],
  [/escrito/i, ['escrito']],
  [/c[eé]dula/i, ['cédula', 'notificación']],
  [/oficio/i, ['oficio']],
  [/recurso/i, ['recurso']],
  [/contrato/i, ['contrato']],
  [/cautelar/i, ['cautelar']],
  [/intimaci[oó]n|intimar/i, ['intimación', 'telegrama']],
  [/notificaci[oó]n|notificar|c[eé]dula/i, ['notificación', 'cédula']],
  [/liquidaci[oó]n|liquidar/i, ['liquidación']],
  [/presentar.*escrito/i, ['escrito', 'demanda']],
];

const templateById = new Map(LEGAL_TEMPLATES.map(t => [t.id, t]));

/**
 * Find the best matching legal template for a given task title.
 * Optionally filters by matter type (rama) for better precision.
 */
export function findTemplateForTask(
  taskTitle: string,
  matterType?: MatterType,
): LegalTemplate | null {
  if (!taskTitle) return null;

  // 1. Try explicit mapping first
  for (const [pattern, templateId] of EXPLICIT_MAP) {
    if (pattern.test(taskTitle)) {
      const t = templateById.get(templateId);
      if (t) {
        // If matter type specified, prefer same category but still return if no better match
        if (!matterType || t.category === matterType) return t;
      }
    }
  }

  // 2. Fuzzy match: extract keywords from task, score against templates
  const taskLower = taskTitle.toLowerCase();
  const candidates: { template: LegalTemplate; score: number }[] = [];

  for (const template of LEGAL_TEMPLATES) {
    let score = 0;

    // Category match bonus
    if (matterType && template.category === matterType) score += 3;

    // Check if task contains words from template title
    const titleWords = template.title.toLowerCase().split(/\s+/);
    for (const word of titleWords) {
      if (word.length > 3 && taskLower.includes(word)) score += 2;
    }

    // Check tags
    for (const tag of template.tags) {
      if (taskLower.includes(tag.toLowerCase())) score += 2;
    }

    // Check subcategory
    if (template.subcategory && taskLower.includes(template.subcategory.toLowerCase())) {
      score += 3;
    }

    if (score >= 5) {
      candidates.push({ template, score });
    }
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].template;
  }

  return null;
}

/**
 * Check if a task title likely corresponds to a document that can be generated.
 * Quick check without full matching - used for showing/hiding the button.
 */
export function taskHasTemplate(taskTitle: string, matterType?: MatterType): boolean {
  return findTemplateForTask(taskTitle, matterType) !== null;
}

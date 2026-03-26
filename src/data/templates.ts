import { MatterTemplate } from '../types';

export const MATTER_TEMPLATES: MatterTemplate[] = [
  {
    id: 'com-incumplimiento',
    name: 'Incumplimiento contractual',
    rama: 'Comercial',
    subtipo: 'Incumplimiento contractual',
    jurisdiccion: 'CABA',
    via: 'Mediación / Ordinaria',
    etapaInicial: 'Análisis',
    descripcion: 'Reclamo por incumplimiento de contrato y anexos.',
    checklistBase: [
      { task: 'Revisar contrato y anexos', priority: 'crítico' },
      { task: 'Identificar cláusula incumplida', priority: 'crítico' },
      { task: 'Verificar intimación previa', priority: 'recomendado' },
      { task: 'Cuantificar perjuicio inicial', priority: 'recomendado' }
    ],
    documentosBase: [
      { name: 'Contrato firmado', required: true },
      { name: 'Anexos contractuales', required: true },
      { name: 'Facturas adeudadas', required: true },
      { name: 'Intercambio por mail o WhatsApp', required: false }
    ],
    hitosProyectados: [
      'Análisis contractual',
      'Intimación / negociación',
      'Mediación o instancia previa',
      'Demanda'
    ],
    bloqueantesTipicos: [],
    proximaAccionSugerida: 'Revisar contrato y anexos',
    fechaSeguimientoSugeridaDays: 3,
    prioridadSugerida: 'Media'
  },
  {
    id: 'com-cobro-ejecutivo',
    name: 'Cobro ejecutivo',
    rama: 'Comercial',
    subtipo: 'Cobro ejecutivo',
    jurisdiccion: 'CABA',
    via: 'Ejecutiva',
    etapaInicial: 'Preparación',
    descripcion: 'Cobro de sumas de dinero por vía ejecutiva.',
    checklistBase: [
      { task: 'Verificar título ejecutivo', priority: 'crítico' },
      { task: 'Confirmar monto reclamable', priority: 'crítico' },
      { task: 'Validar personería', priority: 'recomendado' },
      { task: 'Identificar domicilio del demandado', priority: 'recomendado' }
    ],
    documentosBase: [
      { name: 'Pagaré / cheque / título ejecutivo', required: true },
      { name: 'Liquidación del monto', required: true },
      { name: 'Poder', required: true },
      { name: 'Constancia de intimación si existe', required: false }
    ],
    hitosProyectados: [
      'Preparación de demanda',
      'Presentación ejecutiva',
      'Mandamiento / intimación',
      'Embargo / ejecución'
    ],
    bloqueantesTipicos: [],
    proximaAccionSugerida: 'Verificar título ejecutivo',
    fechaSeguimientoSugeridaDays: 2,
    prioridadSugerida: 'Alta'
  },
  {
    id: 'com-ejecucion-cheque',
    name: 'Ejecución de cheque o pagaré',
    rama: 'Comercial',
    subtipo: 'Ejecución de cheque o pagaré',
    jurisdiccion: 'CABA',
    via: 'Ejecutiva',
    etapaInicial: 'Revisión',
    descripcion: 'Ejecución de títulos valores.',
    checklistBase: [
      { task: 'Validar ejecutabilidad del título', priority: 'crítico' },
      { task: 'Identificar firmantes', priority: 'crítico' },
      { task: 'Calcular capital e intereses', priority: 'recomendado' },
      { task: 'Confirmar estrategia de cobro', priority: 'recomendado' }
    ],
    documentosBase: [
      { name: 'Cheque o pagaré original', required: true },
      { name: 'Liquidación', required: true },
      { name: 'Poder', required: true },
      { name: 'Datos del librador / firmante', required: false }
    ],
    hitosProyectados: [
      'Revisión del título',
      'Demanda ejecutiva',
      'Embargo',
      'Cobro / acuerdo'
    ],
    bloqueantesTipicos: [],
    proximaAccionSugerida: 'Validar ejecutabilidad del título',
    fechaSeguimientoSugeridaDays: 2,
    prioridadSugerida: 'Alta'
  }
];

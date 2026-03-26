import { Matter, Consultation, Task, LegalDocument, TimelineEvent, Client } from './types';
import { subDays, addDays, formatISO } from 'date-fns';

const now = new Date();

export const MOCK_CLIENTS: Client[] = [
  {
    id: 'cl1',
    name: 'Juan Manuel García',
    email: 'jm.garcia@gmail.com',
    phone: '11 4567-8901',
    type: 'Persona',
    activeMatters: 1,
    closedMatters: 0,
    lastActivity: formatISO(subDays(now, 1)),
    notes: 'Cliente preferencial.'
  },
  {
    id: 'cl2',
    name: 'María Elena Sánchez',
    email: 'mesanchez@hotmail.com',
    phone: '11 2345-6789',
    type: 'Persona',
    activeMatters: 1,
    closedMatters: 2,
    lastActivity: formatISO(subDays(now, 3))
  },
  {
    id: 'cl3',
    name: 'Inmobiliaria Central',
    email: 'legal@inmobiliariacentral.com.ar',
    phone: '11 9988-7766',
    type: 'Empresa',
    activeMatters: 1,
    closedMatters: 5,
    lastActivity: formatISO(now)
  }
];

export const MOCK_MATTERS: Matter[] = [
  {
    id: '1',
    title: 'García c/ Techint - Despido Incausado',
    client: 'Juan Manuel García',
    type: 'Laboral',
    status: 'Activo',
    health: 'Sano',
    responsible: 'Dr. Ricardo Darín',
    nextAction: 'Presentar liquidación actualizada',
    nextActionDate: formatISO(now),
    priority: 'Alta',
    subtype: 'Despido',
    lastActivity: formatISO(subDays(now, 1)),
    reasonForQueue: 'Vence hoy',
    expediente: 'CNT 45231/2023',
    description: 'Reclamo por indemnización ley 24.013 y diferencias salariales.'
  },
  {
    id: '2',
    title: 'Sucesión de Roberto Sánchez',
    client: 'María Elena Sánchez',
    type: 'Sucesiones',
    status: 'Activo',
    health: 'Trabado',
    responsible: 'Dra. Mercedes Morán',
    nextAction: 'Solicitar oficios al Registro de Juicios Universales',
    nextActionDate: formatISO(addDays(now, 2)),
    priority: 'Media',
    subtype: 'Ab-intestato',
    lastActivity: formatISO(subDays(now, 3)),
    blockage: 'Falta partida de defunción original',
    reasonForQueue: 'Bloqueo documental',
    expediente: 'CIV 12980/2024'
  },
  {
    id: '3',
    title: 'Divorcio Vincular - Martínez / López',
    client: 'Carla Martínez',
    type: 'Familia',
    status: 'Pausado',
    health: 'Roto',
    responsible: 'Dr. Ricardo Darín',
    nextAction: 'Definir estrategia de mediación', 
    nextActionDate: formatISO(addDays(now, 7)),
    priority: 'Baja',
    subtype: 'Contencioso',
    lastActivity: formatISO(subDays(now, 15)),
    reasonForQueue: 'Sin próxima acción clara',
    expediente: 'FAM 8821/2023'
  },
  {
    id: '4',
    title: 'Pérez c/ Seguros La Caja - Daños y Perjuicios',
    client: 'Esteban Pérez',
    type: 'Daños',
    status: 'Activo',
    health: 'En espera',
    responsible: 'Dra. Mercedes Morán',
    nextAction: 'Esperando pericia médica',
    nextActionDate: formatISO(subDays(now, 2)), 
    priority: 'Alta',
    subtype: 'Accidente de Tránsito',
    lastActivity: formatISO(subDays(now, 5)),
    blockage: 'Depende de perito médico (Dr. Rossi)',
    reasonForQueue: 'Vencido hace 2 días',
    expediente: 'CIV 55432/2022'
  },
  {
    id: '5',
    title: 'Contrato de Alquiler Comercial - Local 4',
    client: 'Inmobiliaria Central',
    type: 'Comercial',
    status: 'Activo',
    health: 'Sano',
    responsible: 'Dr. Ricardo Darín',
    nextAction: 'Enviar borrador final al cliente',
    nextActionDate: formatISO(addDays(now, 1)),
    priority: 'Media',
    subtype: 'Locación',
    lastActivity: formatISO(now),
    reasonForQueue: 'Vence mañana'
  }
];

export const MOCK_CONSULTATIONS: Consultation[] = [
  {
    id: 'c1',
    name: 'Roberto Gómez',
    status: 'Nueva',
    date: formatISO(subDays(now, 0)),
    origin: 'WhatsApp',
    nextStep: 'Llamar para coordinar entrevista',
    type: 'Daños',
    description: 'Accidente de tránsito en Av. Cabildo.',
    phone: '11 5555-4444',
    email: 'rgomez@gmail.com'
  },
  {
    id: 'c2',
    name: 'Lucía Fernández',
    status: 'Esperando info',
    date: formatISO(subDays(now, 2)),
    origin: 'Web',
    nextStep: 'Esperando telegrama de despido',
    type: 'Laboral',
    description: 'Despido verbal tras 3 años de relación laboral.',
    phone: '11 3333-2222'
  },
  {
    id: 'c3',
    name: 'Consorcio Av. Santa Fe 1200',
    status: 'Presupuestada',
    date: formatISO(subDays(now, 5)),
    origin: 'Referido',
    nextStep: 'Seguimiento de presupuesto enviado',
    type: 'Comercial',
    description: 'Revisión de reglamento de copropiedad.'
  }
];

export const MOCK_TASKS: Task[] = [
  {
    id: 't1',
    matterId: '1',
    title: 'Revisar recibos de sueldo 2022',
    dueDate: formatISO(now),
    status: 'Pendiente',
    priority: 'Alta'
  },
  {
    id: 't2',
    matterId: '1',
    title: 'Llamar a testigos para audiencia',
    dueDate: formatISO(addDays(now, 5)),
    status: 'Pendiente',
    priority: 'Media'
  }
];

export const MOCK_DOCUMENTS: LegalDocument[] = [
  {
    id: 'd1',
    matterId: '1',
    matterTitle: 'García c/ Techint - Despido Incausado',
    client: 'Juan Manuel García',
    responsible: 'Dr. Ricardo Darín',
    name: 'DNI Cliente - Frente y Dorso',
    status: 'Recibido',
    criticality: 'Crítico',
    blocksProgress: false,
    updatedAt: formatISO(subDays(now, 10)),
    category: 'Identidad'
  },
  {
    id: 'd2',
    matterId: '1',
    matterTitle: 'García c/ Techint - Despido Incausado',
    client: 'Juan Manuel García',
    responsible: 'Dr. Ricardo Darín',
    name: 'Telegrama de Despido',
    status: 'Recibido',
    criticality: 'Crítico',
    blocksProgress: false,
    updatedAt: formatISO(subDays(now, 10)),
    category: 'Prueba'
  },
  {
    id: 'd3',
    matterId: '1',
    matterTitle: 'García c/ Techint - Despido Incausado',
    client: 'Juan Manuel García',
    responsible: 'Dr. Ricardo Darín',
    name: 'Liquidación Rubros Indemnizatorios',
    status: 'En revisión',
    criticality: 'Crítico',
    blocksProgress: true,
    updatedAt: formatISO(subDays(now, 1)),
    category: 'Escrito',
    associatedAction: 'Presentar liquidación actualizada'
  },
  {
    id: 'd4',
    matterId: '1',
    matterTitle: 'García c/ Techint - Despido Incausado',
    client: 'Juan Manuel García',
    responsible: 'Dr. Ricardo Darín',
    name: 'Poder Judicial Firmado',
    status: 'Faltante',
    criticality: 'Crítico',
    blocksProgress: true,
    updatedAt: '',
    category: 'Poder'
  },
  {
    id: 'd5',
    matterId: '2',
    matterTitle: 'Sucesión de Roberto Sánchez',
    client: 'María Elena Sánchez',
    responsible: 'Dra. Mercedes Morán',
    name: 'Partida de Defunción Original',
    status: 'Faltante',
    criticality: 'Crítico',
    blocksProgress: true,
    updatedAt: '',
    category: 'Prueba'
  },
  {
    id: 'd6',
    matterId: '5',
    matterTitle: 'Contrato de Alquiler Comercial - Local 4',
    client: 'Inmobiliaria Central',
    responsible: 'Dr. Ricardo Darín',
    name: 'Borrador de Contrato',
    status: 'Listo para presentar',
    criticality: 'Crítico',
    blocksProgress: false,
    updatedAt: formatISO(now),
    category: 'Escrito',
    associatedAction: 'Enviar borrador final al cliente'
  }
];

export const MOCK_TIMELINE: TimelineEvent[] = [
  {
    id: 'e1',
    matterId: '1',
    type: 'creation',
    title: 'Asunto creado',
    user: 'Dr. Ricardo Darín',
    date: formatISO(subDays(now, 20))
  },
  {
    id: 'e2',
    matterId: '1',
    type: 'doc_received',
    title: 'Documentación recibida',
    description: 'Se recibió DNI y Telegramas vía WhatsApp.',
    user: 'Secretaría',
    date: formatISO(subDays(now, 18))
  },
  {
    id: 'e3',
    matterId: '1',
    type: 'call',
    title: 'Llamada con el cliente',
    description: 'Se explicaron los pasos a seguir y tiempos estimados.',
    user: 'Dr. Ricardo Darín',
    date: formatISO(subDays(now, 15))
  },
  {
    id: 'e4',
    matterId: '1',
    type: 'draft',
    title: 'Borrador de demanda generado',
    user: 'Dra. Mercedes Morán',
    date: formatISO(subDays(now, 5))
  }
];

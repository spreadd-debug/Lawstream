import { EstadoTroncal } from '../types';

export const FUEROS = [
  { id: 'familia',      label: 'Familia',                       juzgados: 12  },
  { id: 'civil',        label: 'Civil',                         juzgados: 110 },
  { id: 'comercial',    label: 'Comercial',                     juzgados: 26  },
  { id: 'laboral',      label: 'Laboral (Trabajo)',              juzgados: 80  },
  { id: 'contencioso',  label: 'Contencioso Administrativo',    juzgados: 12  },
  { id: 'penal',        label: 'Penal',                         juzgados: 27  },
  { id: 'seguridad',    label: 'Seguridad Social',              juzgados: 10  },
] as const;

export const ESTADOS_TRONCALES: EstadoTroncal[] = [
  'Sin presentar',
  'Presentado en MEV',
  'Sorteado',
  'A Despacho',
  'En Letra',
  'Fuera de Letra',
  'Fuera del Organismo',
  'Paralizado',
];

export const SUBESTADOS: Partial<Record<EstadoTroncal, string[]>> = {
  'A Despacho': [
    'Para Resolver',
    'A la Firma',
    'En Estudio',
    'A Registro',
    'Confronte',
    'Para Certificar',
  ],
  'En Letra': [
    'Para Consentir',
    'Espera Oficio',
    'Espera Cédulas',
    'Costura',
  ],
  'Fuera de Letra': [
    'Para Devolver',
    'En C.S.J.N.',
    'En Oficina Copias',
    'En Ases. Pericial',
    'En Procuración',
    'En Préstamo',
  ],
  'Fuera del Organismo': [
    'Para Devolver',
    'En C.S.J.N.',
    'En Oficina Copias',
    'En Ases. Pericial',
    'En Procuración',
    'En Préstamo',
  ],
};

export const ESTADO_COLORS: Record<EstadoTroncal, string> = {
  'Sin presentar':      'bg-gray-100 text-gray-600',
  'Presentado en MEV':  'bg-blue-100 text-blue-700',
  'Sorteado':           'bg-purple-100 text-purple-700',
  'A Despacho':         'bg-amber-100 text-amber-700',
  'En Letra':           'bg-green-100 text-green-700',
  'Fuera de Letra':     'bg-orange-100 text-orange-700',
  'Fuera del Organismo':'bg-red-100 text-red-700',
  'Paralizado':         'bg-zinc-200 text-zinc-600',
};

/** Genera la lista de juzgados numerados para un fuero dado */
export function getJuzgadosPorFuero(fueroPalabra: string): string[] {
  const fuero = FUEROS.find(f => f.label === fueroPalabra || f.id === fueroPalabra);
  if (!fuero) return [];
  return Array.from({ length: fuero.juzgados }, (_, i) =>
    `Juzgado de ${fuero.label} N° ${i + 1}`
  );
}

/** Mapea MatterType a fuero */
export function matterTypeToFuero(matterType: string): string {
  const map: Record<string, string> = {
    Familia:     'Familia',
    Civil:       'Civil',
    Comercial:   'Comercial',
    Laboral:     'Laboral (Trabajo)',
    Sucesiones:  'Civil',
    Daños:       'Civil',
  };
  return map[matterType] ?? 'Civil';
}

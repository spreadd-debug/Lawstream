import { 
  FileText, 
  FileSearch, 
  Scale, 
  Gavel, 
  PhoneCall, 
  Activity, 
  Send, 
  User, 
  Coins,
  Zap
} from 'lucide-react';

export const ACTION_ICONS: Record<string, any> = {
  pedir_doc: FileText,
  revisar_doc: FileSearch,
  redactar_demanda: Scale,
  revisar_borrador: FileText,
  presentar_escrito: Gavel,
  llamar_cliente: PhoneCall,
  seguir_despacho: Activity,
  intimar: Send,
  pedir_pericia: User,
  liquidar_honorarios: Coins,
};

export const ACTION_TYPES = [
  { id: 'pedir_doc', label: 'Pedir Documentación', icon: FileText, color: 'sky' },
  { id: 'revisar_doc', label: 'Revisar Documentación', icon: FileSearch, color: 'indigo' },
  { id: 'redactar_demanda', label: 'Redactar Demanda', icon: Scale, color: 'primary' },
  { id: 'revisar_borrador', label: 'Revisar Borrador', icon: FileText, color: 'amber' },
  { id: 'presentar_escrito', label: 'Presentar Escrito', icon: Gavel, color: 'emerald' },
  { id: 'llamar_cliente', label: 'Llamar al Cliente', icon: PhoneCall, color: 'rose' },
  { id: 'seguir_despacho', label: 'Seguir Despacho', icon: Activity, color: 'slate' },
  { id: 'intimar', label: 'Intimar', icon: Send, color: 'orange' },
  { id: 'pedir_pericia', label: 'Pedir Pericia', icon: User, color: 'violet' },
  { id: 'liquidar_honorarios', label: 'Liquidar Honorarios', icon: Coins, color: 'green' },
];

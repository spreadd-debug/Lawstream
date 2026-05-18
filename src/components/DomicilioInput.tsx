// Componente de carga estructurada de domicilios para uso en escritos
// judiciales argentinos.
//
// Por qué importa el formato: en la práctica forense argentina, las
// addresses deben incluir calle + número + piso/dpto (para edificios) +
// localidad + provincia + CP. El CP es obligatorio para subir a MEV
// (Mesa de Entrada Virtual). El piso/dpto es esencial para que el
// oficial de justicia pueda diligenciar la cédula — sin ese dato, el
// intento de notificación puede fracasar y declararse nula.
//
// Interfaz: `value` es un string serializado compatible con los datos
// existentes en DB. La serialización sigue el formato:
//   "{calle} {número}[, Piso {piso}[° Dto. {dpto}]], {localidad}, {provincia}[, CP {cp}]"
//
// Ejemplo: "Av. Corrientes 4820, Piso 3° Dto. D, Villa Crespo, CABA, CP 1195"
//
// Parsing del string legacy: si el valor actual no se puede parsear como
// formato canónico, se mete todo en el campo `calle` y el usuario
// lo estructura a mano.

import React, { useState, useEffect, useCallback } from 'react';
import { Label, Input } from './UI';
import { cn } from '../lib/utils';
import { AlertCircle, MapPin } from 'lucide-react';

export interface DomicilioData {
  calle:     string;  // nombre de calle/avenida/pasaje
  numero:    string;  // número de puerta o "S/N"
  piso:      string;  // piso (vacío si PB)
  dpto:      string;  // departamento / oficina / local
  localidad: string;  // barrio, ciudad o localidad
  provincia: string;  // provincia o "CABA"
  cp:        string;  // código postal (obligatorio para MEV)
}

const PROVINCIAS_AR = [
  'CABA', 'Buenos Aires', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba',
  'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja',
  'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan',
  'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero',
  'Tierra del Fuego', 'Tucumán',
];

// Serializa los campos a un string canónico.
export function serializeDomicilio(d: Partial<DomicilioData>): string {
  const partes: string[] = [];
  const calleNum = [d.calle?.trim(), d.numero?.trim()].filter(Boolean).join(' ');
  if (calleNum) partes.push(calleNum);
  if (d.piso?.trim() || d.dpto?.trim()) {
    const pisoDpto = [
      d.piso?.trim() && `Piso ${d.piso.trim()}°`,
      d.dpto?.trim() && `Dto. ${d.dpto.trim()}`,
    ].filter(Boolean).join(' ');
    if (pisoDpto) partes.push(pisoDpto);
  }
  if (d.localidad?.trim()) partes.push(d.localidad.trim());
  if (d.provincia?.trim()) partes.push(d.provincia.trim());
  if (d.cp?.trim()) partes.push(`CP ${d.cp.trim()}`);
  return partes.join(', ');
}

// Intenta parsear el string canónico a sus partes. Hace best-effort
// con el formato "{calle} {numero}, [Piso X° Dto. Y,] localidad, provincia[, CP xxxxxx]".
// Si no puede parsear, deja calle con el string completo.
export function parseDomicilio(raw: string): DomicilioData {
  const empty: DomicilioData = {
    calle: '', numero: '', piso: '', dpto: '', localidad: '', provincia: '', cp: ''
  };
  if (!raw?.trim()) return empty;

  let s = raw.trim();

  // Extraer CP al final: "CP 1195" o "C.P. 1195"
  const cpMatch = s.match(/,?\s*C\.?P\.?\s*(\d{4,5})\s*$/i);
  let cp = '';
  if (cpMatch) {
    cp = cpMatch[1];
    s = s.slice(0, s.length - cpMatch[0].length).trim().replace(/,\s*$/, '');
  }

  // Extraer provincia (último segmento que coincide con lista)
  const segments = s.split(',').map(p => p.trim()).filter(Boolean);
  let provincia = '';
  let localidad = '';
  if (segments.length >= 2) {
    const last = segments[segments.length - 1];
    if (PROVINCIAS_AR.some(p => p.toLowerCase() === last.toLowerCase())) {
      provincia = last;
      segments.pop();
    }
  }
  // Extraer localidad (penúltimo segmento si no empieza con "Piso")
  if (segments.length >= 2) {
    const penultimo = segments[segments.length - 1];
    if (!/^piso/i.test(penultimo)) {
      localidad = penultimo;
      segments.pop();
    }
  }

  // Extraer piso/dto
  let piso = '';
  let dpto = '';
  if (segments.length >= 2) {
    const pisoPart = segments[segments.length - 1];
    const pisoMatch = pisoPart.match(/[Pp]iso\s*(\w+°?)/);
    const dptoMatch = pisoPart.match(/[Dd]to\.?\s*(\w+)/);
    if (pisoMatch || dptoMatch) {
      if (pisoMatch) piso = pisoMatch[1].replace('°', '');
      if (dptoMatch) dpto = dptoMatch[1];
      segments.pop();
    }
  }

  // Lo que queda es calle + número
  const calleNum = segments.join(', ');
  const numMatch = calleNum.match(/\s(\d+\w*|S\/N)\s*$/i);
  let calle = calleNum;
  let numero = '';
  if (numMatch) {
    numero = numMatch[1];
    calle = calleNum.slice(0, calleNum.length - numMatch[0].length).trim();
  }

  return { calle, numero, piso, dpto, localidad, provincia, cp };
}

// ── Componente ────────────────────────────────────────────────

interface DomicilioInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export const DomicilioInput: React.FC<DomicilioInputProps> = ({
  value, onChange, className, disabled,
}) => {
  const [d, setD] = useState<DomicilioData>(() => parseDomicilio(value));

  // Sync cuando llega un nuevo value externo (ej. reset del form).
  useEffect(() => {
    setD(parseDomicilio(value));
  }, [value]);

  const update = useCallback((key: keyof DomicilioData, val: string) => {
    setD(prev => {
      const next = { ...prev, [key]: val };
      onChange(serializeDomicilio(next));
      return next;
    });
  }, [onChange]);

  const preview = serializeDomicilio(d);
  const faltaCP = !d.cp?.trim() && (d.calle || d.numero || d.localidad);

  return (
    <div className={cn('space-y-2', className)}>
      {/* Fila 1: calle + número + piso + dpto */}
      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-5 space-y-1">
          <Label className="text-[9px]">Calle / Avenida *</Label>
          <Input
            value={d.calle}
            onChange={e => update('calle', e.target.value)}
            placeholder="Av. Corrientes"
            className="h-9 text-sm"
            disabled={disabled}
          />
        </div>
        <div className="col-span-2 space-y-1">
          <Label className="text-[9px]">Número *</Label>
          <Input
            value={d.numero}
            onChange={e => update('numero', e.target.value)}
            placeholder="4820"
            className="h-9 text-sm"
            disabled={disabled}
          />
        </div>
        <div className="col-span-2 space-y-1">
          <Label className="text-[9px]">Piso</Label>
          <Input
            value={d.piso}
            onChange={e => update('piso', e.target.value)}
            placeholder="3"
            className="h-9 text-sm"
            disabled={disabled}
          />
        </div>
        <div className="col-span-3 space-y-1">
          <Label className="text-[9px]">Dpto / Local</Label>
          <Input
            value={d.dpto}
            onChange={e => update('dpto', e.target.value)}
            placeholder="D"
            className="h-9 text-sm"
            disabled={disabled}
          />
        </div>
      </div>

      {/* Fila 2: localidad + provincia + CP */}
      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-4 space-y-1">
          <Label className="text-[9px]">Localidad / Barrio *</Label>
          <Input
            value={d.localidad}
            onChange={e => update('localidad', e.target.value)}
            placeholder="Villa Crespo"
            className="h-9 text-sm"
            disabled={disabled}
          />
        </div>
        <div className="col-span-5 space-y-1">
          <Label className="text-[9px]">Provincia *</Label>
          <select
            value={d.provincia}
            onChange={e => update('provincia', e.target.value)}
            className="w-full h-9 px-2 bg-muted/50 border border-border/50 rounded-xl text-sm"
            disabled={disabled}
          >
            <option value="">—</option>
            {PROVINCIAS_AR.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="col-span-3 space-y-1">
          <Label className={cn('text-[9px] flex items-center gap-1', faltaCP && 'text-amber-600')}>
            CP {faltaCP && <AlertCircle size={10} />}
          </Label>
          <Input
            value={d.cp}
            onChange={e => update('cp', e.target.value.replace(/\D/g, '').slice(0, 5))}
            placeholder="1195"
            className={cn('h-9 text-sm', faltaCP && 'border-amber-500/60')}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Preview + aviso MEV */}
      {preview && (
        <div className="flex items-start gap-1.5 px-2 py-1.5 rounded-lg bg-muted/30 border border-border/30">
          <MapPin size={11} className="shrink-0 mt-0.5 text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground font-mono leading-snug">{preview}</span>
        </div>
      )}
      {faltaCP && (
        <p className="text-[10px] text-amber-600 italic flex items-center gap-1">
          <AlertCircle size={10} />
          El CP es obligatorio para notificaciones MEV y cédulas electrónicas.
        </p>
      )}
    </div>
  );
};

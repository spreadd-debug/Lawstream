// Componente de carga estructurada de matrícula profesional de un letrado.
//
// En la práctica forense la matrícula se cita como "T° {tomo} F° {folio}"
// más el colegio que la otorga (CPACF, CASI, CALP, etc.). Hasta ahora vivía
// como un único textbox donde tomo, folio y colegio se mezclaban ("T°91
// F°156 CPACF"), incómodo de leer y de reusar.
//
// Igual que DomicilioInput, `value` es un string serializado canónico
// compatible con lo que ya hay en DB. Formato:
//   "T° {tomo} F° {folio} {colegio}"   ej. "T° 91 F° 156 CPACF"
//
// Se separa el par tomo/folio (que va a LetradoParte.matricula) del colegio
// (LetradoParte.colegio) — ver letradoBridge.ts.

import React, { useState, useEffect, useCallback } from 'react';
import { Label, Input } from './UI';
import { cn } from '../lib/utils';

export interface MatriculaData {
  tomo:    string;
  folio:   string;
  colegio: string;  // colegio que otorga la matrícula (CPACF, CASI, CALP…)
}

// Colegios de abogados más frecuentes (sugerencias, no exhaustivo).
const COLEGIOS_SUGERIDOS = ['CPACF', 'CASI', 'CALP', 'CALZ', 'CALM', 'CAM', 'CACF'];

export function serializeMatricula(d: Partial<MatriculaData>): string {
  const partes: string[] = [];
  const tomoFolio = [
    d.tomo?.trim()  && `T° ${d.tomo.trim()}`,
    d.folio?.trim() && `F° ${d.folio.trim()}`,
  ].filter(Boolean).join(' ');
  if (tomoFolio) partes.push(tomoFolio);
  if (d.colegio?.trim()) partes.push(d.colegio.trim());
  return partes.join(' ');
}

// Best-effort: extrae tomo (T°/T.), folio (F°/F.) y deja el resto como colegio.
export function parseMatricula(raw: string): MatriculaData {
  const empty: MatriculaData = { tomo: '', folio: '', colegio: '' };
  if (!raw?.trim()) return empty;

  const tomoMatch  = raw.match(/T[°ºo.]?\s*(\d+)/i);
  const folioMatch = raw.match(/F[°ºo.]?\s*(\d+)/i);

  let rest = raw;
  if (tomoMatch)  rest = rest.replace(tomoMatch[0], ' ');
  if (folioMatch) rest = rest.replace(folioMatch[0], ' ');
  const colegio = rest.replace(/[°º]/g, '').replace(/\s+/g, ' ').trim();

  return {
    tomo:  tomoMatch  ? tomoMatch[1]  : '',
    folio: folioMatch ? folioMatch[1] : '',
    colegio,
  };
}

interface MatriculaInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export const MatriculaInput: React.FC<MatriculaInputProps> = ({
  value, onChange, className, disabled,
}) => {
  const [d, setD] = useState<MatriculaData>(() => parseMatricula(value));

  // Ver DomicilioInput: evita re-parsear el value cuando el cambio vino de
  // adentro (si no, el parseo intermedio pisa lo que el usuario tipea).
  const skipNextSync = React.useRef(false);

  useEffect(() => {
    if (skipNextSync.current) {
      skipNextSync.current = false;
      return;
    }
    setD(parseMatricula(value));
  }, [value]);

  const update = useCallback((key: keyof MatriculaData, val: string) => {
    setD(prev => {
      const next = { ...prev, [key]: val };
      skipNextSync.current = true;
      onChange(serializeMatricula(next));
      return next;
    });
  }, [onChange]);

  const preview = serializeMatricula(d);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-3 space-y-1">
          <Label className="text-[9px]">Tomo</Label>
          <Input
            value={d.tomo}
            onChange={e => update('tomo', e.target.value)}
            placeholder="91"
            className="h-9 text-sm"
            disabled={disabled}
          />
        </div>
        <div className="col-span-3 space-y-1">
          <Label className="text-[9px]">Folio</Label>
          <Input
            value={d.folio}
            onChange={e => update('folio', e.target.value)}
            placeholder="156"
            className="h-9 text-sm"
            disabled={disabled}
          />
        </div>
        <div className="col-span-6 space-y-1">
          <Label className="text-[9px]">Colegio</Label>
          <Input
            value={d.colegio}
            onChange={e => update('colegio', e.target.value)}
            placeholder="CPACF"
            list="colegios-sugeridos"
            className="h-9 text-sm"
            disabled={disabled}
          />
          <datalist id="colegios-sugeridos">
            {COLEGIOS_SUGERIDOS.map(c => <option key={c} value={c} />)}
          </datalist>
        </div>
      </div>
      {preview && (
        <div className="px-2 py-1.5 rounded-lg bg-muted/30 border border-border/30">
          <span className="text-[11px] text-muted-foreground font-mono leading-snug">{preview}</span>
        </div>
      )}
    </div>
  );
};

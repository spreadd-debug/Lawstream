import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Button, Input, Select, Textarea } from './UI';
import { useAppContext } from '../lib/AppContext';
import type { EventoExpediente, Jurisdiccion, Plazo, TipoEvento } from '../types';
import {
  PLAZOS_POR_EVENTO,
  TIPOS_EVENTO,
  calcularVencimiento,
  getFeriadosSet,
  calcularVencimientoSync,
  labelDeTipoEvento,
} from '../lib/plazos';
import { format, parseISO } from 'date-fns';
import { Calendar, Clock, AlertTriangle } from 'lucide-react';

interface EventoFormProps {
  isOpen: boolean;
  onClose: () => void;
  matterId: string;
  jurisdiccionDefault?: Jurisdiccion;
  onCreated?: (evento: EventoExpediente) => void;
}

type PlazoSelectionRow = {
  seleccionado: boolean;
  tipo: string;
  dias: number;
  diasHabiles: boolean;
  descripcion: string;
  fechaVencimiento: string; // ISO yyyy-MM-dd
};

export const EventoForm: React.FC<EventoFormProps> = ({
  isOpen,
  onClose,
  matterId,
  jurisdiccionDefault = 'nacional',
  onCreated,
}) => {
  const { handleCreateEvento } = useAppContext();

  const today = format(new Date(), 'yyyy-MM-dd');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fecha, setFecha] = useState(today);
  const [tipo, setTipo] = useState<TipoEvento>('traslado');
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [jurisdiccion, setJurisdiccion] = useState<Jurisdiccion>(jurisdiccionDefault);
  const [plazos, setPlazos] = useState<PlazoSelectionRow[]>([]);

  // Reset al abrir
  useEffect(() => {
    if (!isOpen) return;
    setFecha(today);
    setTipo('traslado');
    setTitulo('');
    setDescripcion('');
    setJurisdiccion(jurisdiccionDefault);
    setError(null);
  }, [isOpen, jurisdiccionDefault]);

  // Autocompletar título según tipo si está vacío
  useEffect(() => {
    if (!titulo) setTitulo(labelDeTipoEvento(tipo));
  }, [tipo]); // eslint-disable-line react-hooks/exhaustive-deps

  // Recalcular plazos sugeridos cuando cambia tipo/fecha/jurisdicción
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sugeridos = PLAZOS_POR_EVENTO[tipo] || [];
      if (sugeridos.length === 0) {
        setPlazos([]);
        return;
      }
      await getFeriadosSet(jurisdiccion); // warm cache
      const base = parseISO(fecha);
      const rows = sugeridos.map(s => {
        const venc = calcularVencimientoSync({
          fechaInicio: base,
          dias: s.dias,
          diasHabiles: s.diasHabiles,
          jurisdiccion,
        });
        return {
          seleccionado: true,
          tipo: s.tipo,
          dias: s.dias,
          diasHabiles: s.diasHabiles,
          descripcion: s.descripcion,
          fechaVencimiento: format(venc, 'yyyy-MM-dd'),
        };
      });
      if (!cancelled) setPlazos(rows);
    })();
    return () => { cancelled = true; };
  }, [tipo, fecha, jurisdiccion]);

  const updatePlazoDias = async (idx: number, dias: number) => {
    if (!dias || dias <= 0) return;
    const row = plazos[idx];
    const venc = await calcularVencimiento({
      fechaInicio: parseISO(fecha),
      dias,
      diasHabiles: row.diasHabiles,
      jurisdiccion,
    });
    setPlazos(prev => prev.map((p, i) =>
      i === idx ? { ...p, dias, fechaVencimiento: format(venc, 'yyyy-MM-dd') } : p
    ));
  };

  const togglePlazo = (idx: number) =>
    setPlazos(prev => prev.map((p, i) => i === idx ? { ...p, seleccionado: !p.seleccionado } : p));

  const plazosActivos = useMemo(() => plazos.filter(p => p.seleccionado), [plazos]);

  const handleSubmit = async () => {
    if (!titulo.trim()) { setError('El título es obligatorio'); return; }
    setSaving(true);
    setError(null);
    try {
      const plazosDerivados: Array<Omit<Plazo, 'id' | 'eventoOrigenId' | 'createdAt' | 'updatedAt'>> =
        plazosActivos.map(p => ({
          matterId,
          tipo:             p.tipo,
          descripcion:      p.descripcion,
          fechaInicio:      fecha,
          dias:             p.dias,
          diasHabiles:      p.diasHabiles,
          jurisdiccion,
          fechaVencimiento: p.fechaVencimiento,
          estado:           'activo',
        }));

      const evento = await handleCreateEvento(
        {
          matterId,
          fecha,
          tipo,
          titulo: titulo.trim(),
          descripcion: descripcion.trim() || undefined,
          origen: 'manual',
          jurisdiccion,
          documentosUrls: [],
        },
        plazosDerivados,
      );
      onCreated?.(evento);
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Error al guardar el evento');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={saving ? () => {} : onClose}
      title="Registrar evento del expediente"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Guardando…' : 'Registrar evento'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-destructive/10 text-destructive p-3 text-xs">
            <AlertTriangle size={14} className="mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground mb-1.5">Fecha</label>
            <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground mb-1.5">Jurisdicción</label>
            <Select
              value={jurisdiccion}
              onChange={e => setJurisdiccion(e.target.value as Jurisdiccion)}
              options={['nacional', 'caba', 'pba']}
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground mb-1.5">Tipo de evento</label>
          <select
            value={tipo}
            onChange={e => setTipo(e.target.value as TipoEvento)}
            className="w-full px-4 py-2 bg-muted/50 border border-border/50 rounded-xl text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all outline-none"
          >
            {TIPOS_EVENTO.map(t => (
              <option key={t.tipo} value={t.tipo}>{t.label} — {t.descripcionCorta}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground mb-1.5">Título</label>
          <Input
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            placeholder="Ej: Traslado de la demanda"
          />
        </div>

        <div>
          <label className="block text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground mb-1.5">Descripción (opcional)</label>
          <Textarea
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            placeholder="Detalle del movimiento, foja, referencia…"
            rows={3}
          />
        </div>

        {plazos.length > 0 && (
          <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground">
              <Clock size={12} />
              Plazos sugeridos — {plazosActivos.length} activo{plazosActivos.length !== 1 ? 's' : ''}
            </div>
            <div className="space-y-2">
              {plazos.map((p, i) => (
                <div
                  key={`${p.tipo}-${i}`}
                  className={`rounded-xl border p-3 transition-all ${
                    p.seleccionado
                      ? 'border-primary/30 bg-card'
                      : 'border-border/30 bg-transparent opacity-60'
                  }`}
                >
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={p.seleccionado}
                      onChange={() => togglePlazo(i)}
                      className="mt-1 w-4 h-4 rounded border-border"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-foreground">{p.tipo}</span>
                        <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.1em] text-primary">
                          <Calendar size={10} />
                          {p.fechaVencimiento}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{p.descripcion}</p>
                      <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground">
                        <span>Días:</span>
                        <input
                          type="number"
                          min={1}
                          value={p.dias}
                          disabled={!p.seleccionado}
                          onChange={e => updatePlazoDias(i, parseInt(e.target.value, 10))}
                          className="w-16 px-2 py-1 bg-muted/70 border border-border/40 rounded-md text-xs"
                        />
                        <span>{p.diasHabiles ? 'hábiles' : 'corridos'}</span>
                      </div>
                    </div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {plazos.length === 0 && (
          <div className="rounded-xl border border-dashed border-border/60 p-3 text-[11px] text-muted-foreground">
            Este tipo de evento no dispara plazos automáticos. Podés agregar uno manual luego.
          </div>
        )}
      </div>
    </Modal>
  );
};

export default EventoForm;

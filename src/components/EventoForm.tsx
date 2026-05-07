import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Button, Input, Textarea } from './UI';
import { useAppContext } from '../lib/AppContext';
import type { EventoExpediente, Plazo, TipoEvento, TipoProceso, TipoPlazo } from '../types';
import {
  getPlazosSugeridosPara,
  TIPOS_EVENTO,
  calcularVencimiento,
  getFeriadosSet,
  calcularVencimientoSync,
  labelDeTipoEvento,
  labelTipoProceso,
  resolveJurisdiccion,
  getSugerenciasEventoPorEtapa,
} from '../lib/plazos';
import { detectPropuestaContactoAmplia } from '../lib/consistencia';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Clock, AlertTriangle, ShieldAlert, Sparkles } from 'lucide-react';

interface EventoFormProps {
  isOpen: boolean;
  onClose: () => void;
  matterId: string;
  onCreated?: (evento: EventoExpediente) => void;
}

type PlazoSelectionRow = {
  seleccionado: boolean;
  tipo: string;
  dias: number;
  diasHabiles: boolean;
  descripcion: string;
  fechaVencimiento: string; // ISO yyyy-MM-dd
  tipoPlazo: TipoPlazo;
};

export const EventoForm: React.FC<EventoFormProps> = ({
  isOpen,
  onClose,
  matterId,
  onCreated,
}) => {
  const { handleCreateEvento, matters, hilos } = useAppContext();
  const hilosDelMatter = useMemo(
    () => hilos.filter(h => h.matterId === matterId && h.estado !== 'rechazado' && h.estado !== 'desistido'),
    [hilos, matterId],
  );

  const today = format(new Date(), 'yyyy-MM-dd');

  const matter = matters.find(m => m.id === matterId);

  // Jurisdicción del matter — se resuelve una vez y falla ruidosamente si el
  // caso no la tiene cargada (no asumimos 'nacional' por defecto porque lleva
  // a calcular plazos con los feriados equivocados).
  const jurisdiccionResult = useMemo(() => {
    if (!matter) return { ok: false as const, error: 'Asunto no encontrado' };
    try {
      return { ok: true as const, jurisdiccion: resolveJurisdiccion(matter) };
    } catch (e: any) {
      return { ok: false as const, error: e?.message || 'No se pudo resolver la jurisdicción del caso' };
    }
  }, [matter]);
  const jurisdiccion = jurisdiccionResult.ok ? jurisdiccionResult.jurisdiccion : null;

  // Tipo de proceso del caso — afecta los DÍAS base de algunos plazos
  // (sumarísimo acorta, sumario PBA difiere). Default 'ordinario'.
  const tipoProceso: TipoProceso = (matter?.tipoProceso as TipoProceso | undefined) ?? 'ordinario';

  // Datos de medida cautelar del caso — para detectar propuesta inconsistente de la contraparte.
  const cd = matter?.caseData ?? {};
  const medidaVigenciaHasta = cd.medida_vigencia_hasta?.trim();
  const medidaDescripcion = cd.medida_descripcion?.trim();
  const medidaVigente = !!(
    medidaVigenciaHasta &&
    differenceInCalendarDays(parseISO(medidaVigenciaHasta), new Date()) >= 0
  );
  const medidaProhibicion = !!(
    medidaDescripcion &&
    /prohib|acercamiento|exclus|restricci/i.test(medidaDescripcion)
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fecha, setFecha] = useState(today);
  const [tipo, setTipo] = useState<TipoEvento>('traslado');
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [hiloId, setHiloId] = useState<string>('');
  const [plazos, setPlazos] = useState<PlazoSelectionRow[]>([]);

  // Reset al abrir
  useEffect(() => {
    if (!isOpen) return;
    setFecha(today);
    setTipo('traslado');
    setTitulo('');
    setDescripcion('');
    setHiloId('');
    setError(null);
  }, [isOpen]);

  // Autocompletar título según tipo si está vacío
  useEffect(() => {
    if (!titulo) setTitulo(labelDeTipoEvento(tipo));
  }, [tipo]); // eslint-disable-line react-hooks/exhaustive-deps

  // Recalcular plazos sugeridos cuando cambia tipo/fecha/jurisdicción
  useEffect(() => {
    if (!jurisdiccion) {
      setPlazos([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const sugeridos = getPlazosSugeridosPara(tipo, jurisdiccion, tipoProceso);
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
          tipoPlazo: s.tipoPlazo ?? 'individual',
        };
      });
      if (!cancelled) setPlazos(rows);
    })();
    return () => { cancelled = true; };
  }, [tipo, fecha, jurisdiccion, tipoProceso]);

  const updatePlazoDias = async (idx: number, dias: number) => {
    if (!dias || dias <= 0 || !jurisdiccion) return;
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

  // Regla de consistencia: si el caso tiene medida cautelar vigente (prohibición /
  // acercamiento / exclusión), advertir cuando una presentación contraria proponga
  // régimen amplio u ordinario de comunicación con los hijos.
  const warningRegimenAmplio = useMemo(() => {
    if (tipo !== 'presentacion_contraria') return false;
    if (!(medidaVigente || medidaProhibicion)) return false;
    return detectPropuestaContactoAmplia(`${titulo} ${descripcion}`);
  }, [tipo, titulo, descripcion, medidaVigente, medidaProhibicion]);

  const handleSubmit = async () => {
    if (!titulo.trim()) { setError('El título es obligatorio'); return; }
    if (!jurisdiccion) {
      setError(jurisdiccionResult.ok ? 'Jurisdicción no resuelta' : jurisdiccionResult.error);
      return;
    }
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
          tipoPlazo:        p.tipoPlazo,
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
          hiloId: hiloId || undefined,
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
          <Button variant="primary" onClick={handleSubmit} disabled={saving || !jurisdiccion}>
            {saving ? 'Guardando…' : 'Registrar evento'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {!jurisdiccionResult.ok && (
          <div className="flex items-start gap-2 rounded-xl bg-destructive/10 text-destructive p-3 text-xs">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>{jurisdiccionResult.error}</span>
          </div>
        )}

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
            <label className="block text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground mb-1.5">Jurisdicción del caso</label>
            <div className="h-10 flex items-center px-4 bg-muted/30 border border-border/40 rounded-xl text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {jurisdiccion ? jurisdiccion : '—'}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground mb-1.5">Tipo de evento</label>
          {/* GAP UX-36: chips de sugerencia según la etapa actual del matter.
              Quien anota un movimiento desde la etapa "Prueba" lo más probable
              es que sea pericial, testimonial u oficio — no hay razón para
              hacerle scrollear 30 tipos. */}
          {(() => {
            const sugeridos = getSugerenciasEventoPorEtapa(matter?.currentStage);
            if (sugeridos.length === 0) return null;
            return (
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                  <Sparkles size={10} className="text-amber-600" />
                  Sugeridos en {matter?.currentStage}:
                </span>
                {sugeridos.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTipo(t)}
                    className={
                      'inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold transition-colors ' +
                      (tipo === t
                        ? 'border-amber-500 bg-amber-500/15 text-amber-800 dark:text-amber-200'
                        : 'border-border/60 bg-card hover:border-amber-500/50 hover:bg-amber-500/5 text-foreground/80')
                    }
                  >
                    {labelDeTipoEvento(t)}
                  </button>
                ))}
              </div>
            );
          })()}
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

        {hilosDelMatter.length > 0 && (
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground mb-1.5">
              Hilo de prueba (opcional)
            </label>
            <select
              value={hiloId}
              onChange={e => setHiloId(e.target.value)}
              className="w-full px-4 py-2 bg-muted/50 border border-border/50 rounded-xl text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all outline-none"
            >
              <option value="">— Sin hilo (evento general) —</option>
              {hilosDelMatter.map(h => (
                <option key={h.id} value={h.id}>{h.nombre} ({h.tipo})</option>
              ))}
            </select>
            <p className="text-[10px] text-muted-foreground mt-1">
              Si este movimiento corresponde a una pericia, testimonial u oficio específico, asociálo al hilo para verlos juntos.
            </p>
          </div>
        )}

        {warningRegimenAmplio && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs"
          >
            <ShieldAlert size={16} className="mt-0.5 shrink-0 text-amber-600" />
            <div className="space-y-1">
              <p className="font-bold text-amber-700 dark:text-amber-400">
                Posible inconsistencia detectada
              </p>
              <p className="text-foreground/80 leading-relaxed">
                La contraparte propone régimen de comunicación amplio, pero este caso tiene medida de prohibición de acercamiento
                {medidaVigenciaHasta && (
                  <> vigente hasta <strong>{format(parseISO(medidaVigenciaHasta), "d 'de' MMMM yyyy", { locale: es })}</strong></>
                )}
                . Verificar antes de contestar.
              </p>
            </div>
          </div>
        )}

        {plazos.length > 0 && (
          <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground">
                <Clock size={12} />
                Plazos sugeridos — {plazosActivos.length} activo{plazosActivos.length !== 1 ? 's' : ''}
              </div>
              {tipoProceso !== 'ordinario' && jurisdiccion && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-500/10 px-2 py-1 rounded-md">
                  {labelTipoProceso(tipoProceso)} {jurisdiccion.toUpperCase()}
                </span>
              )}
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

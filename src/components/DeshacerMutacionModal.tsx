// GAP UX-25 — Modal de confirmación para deshacer una mutación reciente
// de tipo de divorcio.
//
// Aparece como botón discreto en MatterDetail solo cuando hay un evento
// `mutacion_tipo_divorcio` con <24h y sin un `deshacer_mutacion_*`
// posterior (validado en MatterDetail con `mutacionReversible`).
//
// Lo que muestra:
//   • Resumen de la mutación que se va a revertir.
//   • Preview de qué se va a hacer:
//       - Tareas que se re-pendientean (las que estaban canceladas).
//       - Tareas que se re-cancelan (las que se crearon y siguen pendientes).
//       - Tareas creadas que ya fueron completadas — se preservan.

import React, { useMemo, useState } from 'react';
import { useAppContext } from '../lib/AppContext';
import { EventoExpediente, Task } from '../types';
import { Modal, Button, Badge } from './UI';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { RefreshCw, RotateCcw, AlertCircle, CheckCircle2, XCircle, Archive } from 'lucide-react';

interface DeshacerMutacionModalProps {
  isOpen: boolean;
  evento: EventoExpediente | null;
  onClose: () => void;
}

export const DeshacerMutacionModal: React.FC<DeshacerMutacionModalProps> = ({ isOpen, evento, onClose }) => {
  const { tasks, handleDeshacerMutacionTipoDivorcio } = useAppContext();
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // Preview: clasificamos las tareas afectadas en 3 grupos según su
  // estado actual (puede haber cambiado después de la mutación).
  const preview = useMemo(() => {
    if (!evento) return { aRePendientear: [] as Task[], aReCancelar: [] as Task[], yaCompletadas: [] as Task[] };
    const meta = evento.metadata as any;
    const idsCanceladas: string[] = meta?.tareas_canceladas_ids ?? [];
    const idsCreadas: string[]    = meta?.tareas_creadas_ids ?? [];

    const aRePendientear = idsCanceladas
      .map(id => tasks.find(t => t.id === id))
      .filter((t): t is Task => !!t && t.status === 'Cancelada');

    const creadasActual = idsCreadas
      .map(id => tasks.find(t => t.id === id))
      .filter((t): t is Task => !!t);
    const aReCancelar  = creadasActual.filter(t => t.status === 'Pendiente');
    const yaCompletadas = creadasActual.filter(t => t.status === 'Completada');

    return { aRePendientear, aReCancelar, yaCompletadas };
  }, [evento, tasks]);

  React.useEffect(() => {
    if (!isOpen) { setError(null); }
  }, [isOpen]);

  if (!evento) return null;

  const meta = evento.metadata as any;
  const tipoAnterior = meta?.tipo_anterior ?? '—';
  const tipoNuevo    = meta?.tipo_nuevo    ?? '—';
  const horasDesde   = (Date.now() - new Date(evento.createdAt).getTime()) / (1000 * 60 * 60);
  const tiempoDesde  = formatDistanceToNow(new Date(evento.createdAt), { locale: es, addSuffix: false });

  const onConfirmar = async () => {
    setSaving(true); setError(null);
    try {
      const r = await handleDeshacerMutacionTipoDivorcio(evento.id);
      setSaving(false);
      onClose();
      window.alert(
        `Mutación revertida. Re-pendienteadas: ${r.rePendientes}. Re-canceladas: ${r.canceladas}. ` +
        `Tareas completadas preservadas: ${r.completadasPreservadas}.`,
      );
    } catch (err: any) {
      console.error('[deshacer mutación] error:', err);
      setError(err?.message ?? 'Error desconocido al deshacer la mutación.');
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={saving ? () => {} : onClose}
      title="Deshacer mutación de tipo de divorcio"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="primary" onClick={onConfirmar} disabled={saving}>
            {saving ? 'Revirtiendo…' : 'Confirmar deshacer'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Resumen del evento */}
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/30">
          <RefreshCw size={20} className="shrink-0 text-amber-600 mt-0.5" />
          <div className="flex-1">
            <div className="text-[11px] font-black uppercase tracking-widest text-amber-700 mb-1">
              Mutación a revertir
            </div>
            <p className="text-sm text-foreground">
              Hace <strong>{tiempoDesde}</strong> ({Math.floor(horasDesde)}h) se cambió de
              {' '}<strong>"{tipoAnterior}"</strong> a <strong>"{tipoNuevo}"</strong>.
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Fecha del acto: {format(parseISO(evento.fecha), "d 'de' MMMM yyyy", { locale: es })}.
              {meta?.motivo && <> Motivo registrado: <em>"{meta.motivo}"</em>.</>}
            </p>
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            ¿Qué va a pasar?
          </h4>

          {preview.aRePendientear.length > 0 && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-1.5">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-emerald-700">
                <RotateCcw size={14} />
                Se re-pendientean {preview.aRePendientear.length} tarea{preview.aRePendientear.length === 1 ? '' : 's'}
              </div>
              <ul className="space-y-0.5 text-[12px] text-foreground/90">
                {preview.aRePendientear.map(t => (
                  <li key={t.id}>
                    <span className="text-muted-foreground">[{t.etapa || 'sin etapa'}]</span> {t.title}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {preview.aReCancelar.length > 0 && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 space-y-1.5">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-rose-700">
                <XCircle size={14} />
                Se re-cancelan {preview.aReCancelar.length} tarea{preview.aReCancelar.length === 1 ? '' : 's'} pendiente{preview.aReCancelar.length === 1 ? '' : 's'}
              </div>
              <ul className="space-y-0.5 text-[12px] text-foreground/90">
                {preview.aReCancelar.map(t => (
                  <li key={t.id}>
                    <span className="text-muted-foreground">[{t.etapa || 'sin etapa'}]</span> {t.title}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {preview.yaCompletadas.length > 0 && (
            <div className="rounded-xl border border-zinc-300/30 bg-zinc-500/5 p-3 space-y-1.5">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-zinc-700">
                <Archive size={14} />
                Se preservan {preview.yaCompletadas.length} tarea{preview.yaCompletadas.length === 1 ? '' : 's'} ya completada{preview.yaCompletadas.length === 1 ? '' : 's'}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Estas tareas se crearon por la mutación pero el equipo ya las marcó como completadas. NO se cancelan — quedan como historia válida.
              </p>
              <ul className="space-y-0.5 text-[12px] text-foreground/70">
                {preview.yaCompletadas.map(t => (
                  <li key={t.id}>
                    <CheckCircle2 size={11} className="inline -mt-0.5 mr-1 text-emerald-600" />
                    <span className="text-muted-foreground">[{t.etapa || 'sin etapa'}]</span> {t.title}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {preview.aRePendientear.length === 0 && preview.aReCancelar.length === 0 && preview.yaCompletadas.length === 0 && (
            <div className="rounded-xl border border-dashed border-border/60 p-3 text-[12px] text-muted-foreground">
              No hay cambios estructurales detectados — la mutación original no había generado tareas (o todas fueron eliminadas manualmente).
            </div>
          )}
        </div>

        {/* Aviso */}
        <div className="flex items-start gap-2 p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 text-[11px] text-amber-800 dark:text-amber-200">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>
            Se registrará un evento <strong>"Deshacer mutación a {tipoNuevo}"</strong> en el timeline. El <code>caseData.tipo_divorcio</code> volverá a <strong>"{tipoAnterior}"</strong>.
            Esta acción no es reversible — para volver al tipo "{tipoNuevo}" después tendrías que hacer una nueva mutación.
          </span>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-800 dark:text-rose-200 text-xs">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </Modal>
  );
};

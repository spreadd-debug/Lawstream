// GAP R6 — Modal para definir o mutar el tipo de divorcio.
//
// Cubre dos casos:
//   (a) Primera definición: el caso se creó con tipo_divorcio = 'Por definir'
//       porque en la entrevista aún no se sabía si iba a ser conjunto o
//       unilateral. Al definirlo, se generan las tareas de la rama elegida
//       (ninguna se cancela porque no había tareas de rama todavía).
//   (b) Mutación real: el caso ya estaba en una rama y muta a la otra
//       (típicamente, una parte retira la conformidad). Se cancelan las
//       tareas pendientes de la rama vieja y se crean las de la nueva.
//
// En ambos casos:
//   1. Muestra tipo actual (read-only) y propone uno nuevo.
//   2. Pide motivo y fecha del acto.
//   3. Calcula el preview: cuántas tareas pendientes se cancelan y
//      cuántas se crearán nuevas, listadas por título.
//   4. Al confirmar, dispara handleMutarTipoDivorcio.

import React, { useMemo, useState } from 'react';
import { useAppContext } from '../lib/AppContext';
import { Matter, Task } from '../types';
import { Modal, Button, Input, Textarea, Label, Badge } from './UI';
import { regenerarTareasFaltantes } from '../lib/flowEngine';
import { findTemplate, MATTER_TEMPLATES } from '../data/templates';
import { Scale, AlertCircle, ArrowRight, CheckCircle2, XCircle } from 'lucide-react';

interface MutarDivorcioModalProps {
  isOpen: boolean;
  matter: Matter;
  onClose: () => void;
}

// GAP UX-26: agrupa items por etapa preservando el orden de aparición.
// Las etapas vacías van al final con label "Sin etapa".
function agruparPorEtapa<T extends { etapa?: string; title: string; key: string }>(
  items: T[],
): Array<{ etapa: string; items: T[] }> {
  const buckets = new Map<string, T[]>();
  for (const it of items) {
    const k = it.etapa || 'Sin etapa';
    const arr = buckets.get(k);
    if (arr) arr.push(it);
    else buckets.set(k, [it]);
  }
  return Array.from(buckets.entries()).map(([etapa, items]) => ({ etapa, items }));
}

type TipoDivorcio = 'Unilateral' | 'De común acuerdo' | 'Por definir';

const TIPO_OPUESTO: Record<string, 'Unilateral' | 'De común acuerdo'> = {
  'Unilateral':         'De común acuerdo',
  'De común acuerdo':   'Unilateral',
  'Por definir':        'Unilateral', // sugerido por defecto al definir por primera vez
};

export const MutarDivorcioModal: React.FC<MutarDivorcioModalProps> = ({ isOpen, matter, onClose }) => {
  const { tasks, handleMutarTipoDivorcio } = useAppContext();

  const tipoActual = matter.caseData?.tipo_divorcio as TipoDivorcio | undefined;
  const esPrimeraDefinicion = !tipoActual || tipoActual === 'Por definir';
  const sugerido   = tipoActual ? TIPO_OPUESTO[tipoActual] ?? 'Unilateral' : 'Unilateral';

  const [nuevoTipo, setNuevoTipo]       = useState<'Unilateral' | 'De común acuerdo'>(sugerido);
  const [motivo, setMotivo]             = useState('');
  const [fechaMutacion, setFechaMutacion] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    setNuevoTipo(sugerido);
    setMotivo('');
    setFechaMutacion(new Date().toISOString().slice(0, 10));
    setError(null);
  }, [isOpen, sugerido]);

  // Preview: simulamos el resultado con caseData hipotético.
  const preview = useMemo(() => {
    if (!isOpen) return { aCancelar: [] as Task[], aCrear: [] as Array<{ title: string; etapa?: string }> };
    const template = matter.flowTemplateId
      ? MATTER_TEMPLATES.find(t => t.id === matter.flowTemplateId)
      : findTemplate(matter.type, matter.subtype, matter.jurisdiccion);
    if (!template) return { aCancelar: [], aCrear: [] };
    const matterHipotetico: Matter = {
      ...matter,
      caseData: { ...(matter.caseData ?? {}), tipo_divorcio: nuevoTipo },
    };
    const matterTasks = tasks.filter(t => t.matterId === matter.id);
    return regenerarTareasFaltantes(matterHipotetico, template, matterTasks);
  }, [isOpen, matter, tasks, nuevoTipo]);

  // En primera definición no exigimos tipoActual previo — sí pedimos que el
  // nuevo tipo sea distinto del actual cuando ya hay un tipo real asignado.
  const puedeGuardar = nuevoTipo !== tipoActual
    && motivo.trim().length > 0
    && fechaMutacion.trim().length > 0;

  const onConfirmar = async () => {
    if (!puedeGuardar) return;
    setSaving(true);
    setError(null);
    try {
      const { canceladas, creadas } = await handleMutarTipoDivorcio(
        matter.id, nuevoTipo, motivo.trim(), fechaMutacion,
      );
      setSaving(false);
      onClose();
      // Pequeña confirmación post-cierre
      window.alert(esPrimeraDefinicion
        ? `Tipo definido como "${nuevoTipo}". Tareas creadas: ${creadas}.`
        : `Mutación aplicada. Tareas canceladas: ${canceladas}. Tareas creadas: ${creadas}.`,
      );
    } catch (err: any) {
      console.error('[MutarDivorcio] error:', err);
      setError(err?.message ?? 'Error desconocido al mutar el caso');
      setSaving(false);
    }
  };

  const tituloModal     = esPrimeraDefinicion ? 'Definir tipo de divorcio' : 'Mutar tipo de divorcio';
  const labelTipoActual = esPrimeraDefinicion ? 'Tipo actual (sin definir)' : 'Tipo actual';
  const valorTipoActual = tipoActual ?? 'Por definir';
  const placeholderMotivo = esPrimeraDefinicion
    ? 'Ej: "El cliente confirmó que el cónyuge accedió a firmar la presentación conjunta tras la propuesta extrajudicial."'
    : 'Ej: "Valentina retiró conformidad al convenio en los puntos pendientes — pasa a contencioso unilateral promovido por Sebastián."';
  const labelFecha       = esPrimeraDefinicion ? 'Fecha de la definición *' : 'Fecha de la mutación *';
  const hintFecha        = esPrimeraDefinicion
    ? 'Fecha en la que la decisión quedó tomada (ej. respuesta del cónyuge a la propuesta extrajudicial).'
    : 'Esta es la fecha del acto procesal que provocó el cambio (ej. retiro de conformidad).';
  const labelBoton       = esPrimeraDefinicion ? 'Confirmar definición' : 'Confirmar mutación';
  const labelBotonSaving = esPrimeraDefinicion ? 'Definiendo…' : 'Aplicando…';

  return (
    <Modal
      isOpen={isOpen}
      onClose={saving ? () => {} : onClose}
      title={tituloModal}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="primary" onClick={onConfirmar} disabled={saving || !puedeGuardar}>
            {saving ? labelBotonSaving : labelBoton}
          </Button>
        </>
      }
    >
      <div className="space-y-5">

        {esPrimeraDefinicion && (
          <div className="flex items-start gap-2 p-3 rounded-xl border border-violet-500/30 bg-violet-500/5 text-[12px] text-violet-800 dark:text-violet-200">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>
              Estás definiendo el tipo de divorcio por primera vez. No se cancelan tareas — sólo se generan
              las nuevas de la rama elegida. Si más adelante una parte se retracta, podés volver a este
              modal para mutar el tipo.
            </span>
          </div>
        )}

        {/* Transición */}
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-violet-500/5 border border-violet-500/20">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">{labelTipoActual}</Badge>
            <span className="text-sm font-bold text-foreground">{valorTipoActual}</span>
          </div>
          <ArrowRight size={16} className="text-violet-600 mx-auto" />
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] border-violet-500/40 text-violet-700">Tipo nuevo</Badge>
            <select
              value={nuevoTipo}
              onChange={e => setNuevoTipo(e.target.value as 'Unilateral' | 'De común acuerdo')}
              className="h-9 px-3 bg-background border border-border/60 rounded-lg text-sm font-bold"
            >
              <option value="Unilateral">Unilateral</option>
              <option value="De común acuerdo">De común acuerdo</option>
            </select>
          </div>
        </div>

        {/* Datos de la mutación */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{labelFecha}</Label>
            <Input type="date" value={fechaMutacion} onChange={e => setFechaMutacion(e.target.value)} />
          </div>
          <div>
            <Label>&nbsp;</Label>
            <p className="text-[10px] text-muted-foreground italic mt-2">
              {hintFecha}
            </p>
          </div>
        </div>
        <div>
          <Label>Motivo *</Label>
          <Textarea
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            placeholder={placeholderMotivo}
            className="min-h-[80px]"
          />
        </div>

        {/* Preview */}
        <div className="border-t border-border/40 pt-4 space-y-3">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            {esPrimeraDefinicion ? 'Vista previa de la definición' : 'Vista previa de la mutación'}
          </h4>

          {preview.aCancelar.length === 0 && preview.aCrear.length === 0 && (
            <div className="rounded-xl border border-dashed border-border/60 p-3 text-[12px] text-muted-foreground">
              No hay cambios estructurales — el flujo no tiene tareas que dependan del tipo de divorcio en este template.
            </div>
          )}

          {/* GAP UX-26: agrupamos por etapa para que el usuario lea más rápido
              cuando hay 8+ tareas. Cada grupo arranca con sub-header. */}
          {preview.aCancelar.length > 0 && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 space-y-2.5">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-rose-700">
                <XCircle size={14} />
                Se cancelarán {preview.aCancelar.length} tarea{preview.aCancelar.length === 1 ? '' : 's'} pendiente{preview.aCancelar.length === 1 ? '' : 's'}
              </div>
              {agruparPorEtapa(preview.aCancelar.map(t => ({ etapa: t.etapa, title: t.title, key: t.id }))).map(g => (
                <div key={`cancel-${g.etapa}`} className="space-y-0.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600/80">
                    {g.etapa} · {g.items.length}
                  </div>
                  <ul className="space-y-0.5 text-[12px] text-foreground/90 pl-2">
                    {g.items.map(it => (
                      <li key={it.key}>· {it.title}</li>
                    ))}
                  </ul>
                </div>
              ))}
              <p className="text-[10px] text-muted-foreground italic">
                Las tareas <strong>completadas</strong> de la rama anterior no se tocan — quedan como historia.
              </p>
            </div>
          )}

          {preview.aCrear.length > 0 && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2.5">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-emerald-700">
                <CheckCircle2 size={14} />
                Se crearán {preview.aCrear.length} tarea{preview.aCrear.length === 1 ? '' : 's'} nueva{preview.aCrear.length === 1 ? '' : 's'}
              </div>
              {agruparPorEtapa(preview.aCrear.map((t, idx) => ({ etapa: t.etapa, title: t.title, key: `${t.etapa}-${t.title}-${idx}` }))).map(g => (
                <div key={`crear-${g.etapa}`} className="space-y-0.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700/80">
                    {g.etapa} · {g.items.length}
                  </div>
                  <ul className="space-y-0.5 text-[12px] text-foreground/90 pl-2">
                    {g.items.map(it => (
                      <li key={it.key}>· {it.title}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-800 dark:text-rose-200 text-xs">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-start gap-2 p-3 rounded-xl border border-violet-500/30 bg-violet-500/5 text-[11px] text-violet-800 dark:text-violet-200">
          <Scale size={14} className="shrink-0 mt-0.5" />
          <span>
            {esPrimeraDefinicion ? (
              <>Se registrará un evento <strong>"Definición inicial: {nuevoTipo}"</strong> en el timeline procesal con la fecha y el motivo. La acción queda en bitácora para auditoría.</>
            ) : (
              <>Se registrará un evento <strong>"Mutación a {nuevoTipo}"</strong> en el timeline procesal con la fecha y el motivo. La acción queda en bitácora para auditoría.</>
            )}
          </span>
        </div>
      </div>
    </Modal>
  );
};

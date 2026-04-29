import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../lib/AppContext';
import {
  Cedula,
  CedulaIntento,
  EstadoCedula,
  EstadoCedulaManual,
  ResultadoIntentoCedula,
  TipoCedula,
  TIPO_CEDULA_LABELS,
  RESULTADO_INTENTO_LABELS,
  RESULTADOS_EXITOSOS,
} from '../types';
import { Modal, Button, Input, Textarea } from './UI';
import { cn } from '../lib/utils';
import {
  Mail,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  CalendarDays,
  Send,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface CedulasPanelProps {
  matterId: string;
}

const ESTADO_TONE: Record<EstadoCedula, string> = {
  pendiente:               'border-zinc-500/30 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300',
  en_diligenciamiento:     'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  notificada:              'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  devuelta_sin_notificar:  'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
  vencida:                 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
};

const ESTADO_LABEL: Record<EstadoCedula, string> = {
  pendiente:               'Pendiente',
  en_diligenciamiento:     'En diligenciamiento',
  notificada:              'Notificada',
  devuelta_sin_notificar:  'Devuelta sin notificar',
  vencida:                 'Vencida',
};

const ESTADO_ICON: Record<EstadoCedula, React.ComponentType<{ size?: number; className?: string }>> = {
  pendiente:               Clock,
  en_diligenciamiento:     AlertCircle,
  notificada:              CheckCircle2,
  devuelta_sin_notificar:  XCircle,
  vencida:                 XCircle,
};

/** Computa el estado derivado de una cédula a partir de sus intentos. */
function computarEstado(cedula: Cedula, intentos: CedulaIntento[]): EstadoCedula {
  if (cedula.estadoManual) return cedula.estadoManual;
  if (intentos.length === 0) return 'pendiente';
  // Ordenar por fecha desc + createdAt desc para empate
  const ordenados = [...intentos].sort((a, b) =>
    b.fecha.localeCompare(a.fecha) || b.createdAt.localeCompare(a.createdAt)
  );
  const ultimo = ordenados[0];
  if (RESULTADOS_EXITOSOS.includes(ultimo.resultado)) return 'notificada';
  return 'en_diligenciamiento';
}

export const CedulasPanel: React.FC<CedulasPanelProps> = ({ matterId }) => {
  const {
    cedulas,
    cedulaIntentos,
    handleCreateCedula,
    handleUpdateCedula,
    handleDeleteCedula,
    handleCreateCedulaIntento,
    handleDeleteCedulaIntento,
  } = useAppContext();

  const cedulasDelMatter = useMemo(
    () => cedulas
      .filter(c => c.matterId === matterId)
      .sort((a, b) => (b.fechaEmision ?? b.createdAt).localeCompare(a.fechaEmision ?? a.createdAt)),
    [cedulas, matterId],
  );

  const intentosPorCedula = useMemo(() => {
    const map = new Map<string, CedulaIntento[]>();
    for (const i of cedulaIntentos) {
      const arr = map.get(i.cedulaId) ?? [];
      arr.push(i);
      map.set(i.cedulaId, arr);
    }
    return map;
  }, [cedulaIntentos]);

  const [isCedulaFormOpen, setIsCedulaFormOpen] = useState(false);
  const [intentoFormFor, setIntentoFormFor] = useState<Cedula | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-600 flex items-center justify-center">
            <Mail size={18} />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-foreground">
              Cédulas de notificación
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Cada cédula puede tener múltiples intentos de diligenciamiento
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => setIsCedulaFormOpen(true)}>
          <Plus size={14} /> Nueva cédula
        </Button>
      </div>

      {cedulasDelMatter.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-border/60 rounded-xl">
          <p className="text-xs text-muted-foreground">
            Sin cédulas registradas. Usá "Nueva cédula" cuando emitas una notificación al
            destinatario y agregá un intento por cada visita del oficial notificador.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {cedulasDelMatter.map(c => {
            const intentos = intentosPorCedula.get(c.id) ?? [];
            const estado = computarEstado(c, intentos);
            const tone = ESTADO_TONE[estado];
            const Icon = ESTADO_ICON[estado];
            const intentosOrdenados = [...intentos].sort((a, b) => b.fecha.localeCompare(a.fecha));
            return (
              <div
                key={c.id}
                className="rounded-2xl border border-border/60 bg-card/40 p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={cn(
                        'inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full border',
                        tone,
                      )}>
                        <Icon size={11} />
                        {ESTADO_LABEL[estado]}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        {TIPO_CEDULA_LABELS[c.tipo]}
                      </span>
                      {c.fechaEmision && (
                        <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                          <CalendarDays size={11} />
                          Emitida {format(parseISO(c.fechaEmision), 'd MMM yyyy', { locale: es })}
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-bold text-foreground">{c.destinatario}</div>
                    <div className="text-xs text-muted-foreground">{c.domicilio}</div>
                    {c.objeto && (
                      <p className="text-[11px] text-muted-foreground italic mt-1">"{c.objeto}"</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <button
                      onClick={() => setIntentoFormFor(c)}
                      className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-sky-500/15 text-sky-700 dark:text-sky-300 hover:bg-sky-500/25 transition-colors flex items-center gap-1"
                    >
                      <Send size={11} /> Agregar intento
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Eliminar la cédula a "${c.destinatario}"? Se borran también sus ${intentos.length} intento(s).`)) {
                          handleDeleteCedula(c.id);
                        }
                      }}
                      className="text-[10px] text-muted-foreground hover:text-rose-500 transition-colors flex items-center gap-1"
                    >
                      <Trash2 size={11} /> Eliminar
                    </button>
                  </div>
                </div>

                {/* Intentos */}
                {intentosOrdenados.length > 0 && (
                  <div className="border-t border-border/40 pt-3 space-y-1.5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                      Intentos ({intentosOrdenados.length})
                    </div>
                    {intentosOrdenados.map(i => {
                      const exitoso = RESULTADOS_EXITOSOS.includes(i.resultado);
                      return (
                        <div
                          key={i.id}
                          className={cn(
                            'flex items-start gap-2 p-2 rounded-lg text-xs',
                            exitoso ? 'bg-emerald-500/5' : 'bg-muted/30',
                          )}
                        >
                          {exitoso ? (
                            <CheckCircle2 size={13} className="shrink-0 mt-0.5 text-emerald-600" />
                          ) : (
                            <XCircle size={13} className="shrink-0 mt-0.5 text-muted-foreground" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold">
                                {format(parseISO(i.fecha), "d MMM yyyy", { locale: es })}
                              </span>
                              {i.hora && <span className="text-muted-foreground">{i.hora}</span>}
                              <span className="text-muted-foreground">·</span>
                              <span className="font-medium">{RESULTADO_INTENTO_LABELS[i.resultado]}</span>
                            </div>
                            {i.notas && (
                              <p className="text-[11px] text-muted-foreground mt-0.5">{i.notas}</p>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              if (window.confirm('Eliminar este intento?')) {
                                handleDeleteCedulaIntento(i.id);
                              }
                            }}
                            className="text-muted-foreground hover:text-rose-500 transition-colors shrink-0"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Marcar como devuelta / vencida (si todavía no está notificada) */}
                {estado !== 'notificada' && (
                  <div className="border-t border-border/40 pt-2 flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-muted-foreground">Marcar:</span>
                    {(['devuelta_sin_notificar', 'vencida'] as EstadoCedulaManual[]).map(s => (
                      <button
                        key={s}
                        onClick={() => handleUpdateCedula(c.id, { estadoManual: c.estadoManual === s ? undefined : s })}
                        className={cn(
                          'text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border transition-colors',
                          c.estadoManual === s
                            ? 'border-rose-500 bg-rose-500/20 text-rose-700 dark:text-rose-300'
                            : 'border-border/60 text-muted-foreground hover:border-rose-500/50',
                        )}
                      >
                        {ESTADO_LABEL[s]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <CrearCedulaModal
        isOpen={isCedulaFormOpen}
        onClose={() => setIsCedulaFormOpen(false)}
        onCreate={async (data) => {
          await handleCreateCedula({ ...data, matterId });
          setIsCedulaFormOpen(false);
        }}
      />

      {intentoFormFor && (
        <CrearIntentoModal
          isOpen={!!intentoFormFor}
          onClose={() => setIntentoFormFor(null)}
          cedula={intentoFormFor}
          onCreate={async (data) => {
            await handleCreateCedulaIntento({ ...data, cedulaId: intentoFormFor.id });
            setIntentoFormFor(null);
          }}
        />
      )}
    </div>
  );
};

// ── Modal: Crear cédula ────────────────────────────────────────

interface CrearCedulaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: Omit<Cedula, 'id' | 'matterId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

const CrearCedulaModal: React.FC<CrearCedulaModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [tipo, setTipo] = useState<TipoCedula>('traslado');
  const [destinatario, setDestinatario] = useState('');
  const [domicilio, setDomicilio] = useState('');
  const [objeto, setObjeto] = useState('');
  const [fechaEmision, setFechaEmision] = useState('');
  const [notas, setNotas] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTipo('traslado');
      setDestinatario('');
      setDomicilio('');
      setObjeto('');
      setFechaEmision('');
      setNotas('');
      setSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!destinatario.trim() || !domicilio.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onCreate({
        tipo,
        destinatario: destinatario.trim(),
        domicilio: domicilio.trim(),
        objeto: objeto.trim() || undefined,
        fechaEmision: fechaEmision || undefined,
        notas: notas.trim() || undefined,
      });
    } catch (err) {
      console.error(err);
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nueva cédula"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={submitting || !destinatario.trim() || !domicilio.trim()}>
            {submitting ? 'Creando...' : 'Crear cédula'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
            Tipo
          </label>
          <select
            className="w-full h-10 bg-background border border-border rounded-lg px-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={tipo}
            onChange={e => setTipo(e.target.value as TipoCedula)}
          >
            {(Object.keys(TIPO_CEDULA_LABELS) as TipoCedula[]).map(k => (
              <option key={k} value={k}>{TIPO_CEDULA_LABELS[k]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
            Destinatario *
          </label>
          <Input
            value={destinatario}
            onChange={e => setDestinatario(e.target.value)}
            placeholder="Apellido, Nombre"
          />
        </div>

        <div>
          <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
            Domicilio *
          </label>
          <Input
            value={domicilio}
            onChange={e => setDomicilio(e.target.value)}
            placeholder="Calle, número, depto/piso, localidad"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
              Fecha de emisión
            </label>
            <Input
              type="date"
              value={fechaEmision}
              onChange={e => setFechaEmision(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <p className="text-[10px] text-muted-foreground">
              La fecha de emisión es opcional. Cada intento se carga aparte con su propia fecha.
            </p>
          </div>
        </div>

        <div>
          <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
            Objeto (qué se notifica)
          </label>
          <Input
            value={objeto}
            onChange={e => setObjeto(e.target.value)}
            placeholder='Ej: Traslado de demanda, citación a audiencia art. 438'
          />
        </div>

        <div>
          <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
            Notas
          </label>
          <Textarea
            value={notas}
            onChange={e => setNotas(e.target.value)}
            rows={2}
          />
        </div>
      </div>
    </Modal>
  );
};

// ── Modal: Agregar intento ─────────────────────────────────────

interface CrearIntentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  cedula: Cedula;
  onCreate: (data: Omit<CedulaIntento, 'id' | 'cedulaId' | 'createdAt'>) => Promise<void>;
}

const CrearIntentoModal: React.FC<CrearIntentoModalProps> = ({ isOpen, onClose, cedula, onCreate }) => {
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [resultado, setResultado] = useState<ResultadoIntentoCedula>('nadie_atiende');
  const [notas, setNotas] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFecha(new Date().toISOString().slice(0, 10));
      setHora('');
      setResultado('nadie_atiende');
      setNotas('');
      setSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!fecha || submitting) return;
    setSubmitting(true);
    try {
      await onCreate({
        fecha,
        hora: hora || undefined,
        resultado,
        notas: notas.trim() || undefined,
      });
    } catch (err) {
      console.error(err);
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Nuevo intento — ${cedula.destinatario}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={submitting || !fecha}>
            {submitting ? 'Guardando...' : 'Guardar intento'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="text-[11px] text-muted-foreground rounded-xl bg-muted/30 border border-border/40 p-2">
          {cedula.domicilio}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
              Fecha *
            </label>
            <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
          </div>
          <div>
            <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
              Hora (opcional)
            </label>
            <Input type="time" value={hora} onChange={e => setHora(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
            Resultado *
          </label>
          <select
            className="w-full h-10 bg-background border border-border rounded-lg px-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={resultado}
            onChange={e => setResultado(e.target.value as ResultadoIntentoCedula)}
          >
            {(Object.keys(RESULTADO_INTENTO_LABELS) as ResultadoIntentoCedula[]).map(k => (
              <option key={k} value={k}>{RESULTADO_INTENTO_LABELS[k]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
            Notas
          </label>
          <Textarea
            value={notas}
            onChange={e => setNotas(e.target.value)}
            placeholder='Ej: "Atendió la portera, dijo que no vive más en el domicilio".'
            rows={2}
          />
        </div>
      </div>
    </Modal>
  );
};

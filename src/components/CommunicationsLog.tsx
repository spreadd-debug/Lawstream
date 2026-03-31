import React, { useState, useEffect } from 'react';
import { Card, Badge, Button } from './UI';
import { Communication, CanalCommunication } from '../types';
import {
  MessageSquare,
  Mail,
  Phone,
  Users,
  Lock,
  Eye,
  Send,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../lib/utils';
import {
  fetchCommunications,
  fetchAllCommunications,
  createCommunication,
} from '../lib/db';

interface CommunicationsLogProps {
  matterId?: string;
  clientId?: string;
  consultationId?: string;
  currentUser: string;
}

const CANALES: { value: CanalCommunication; label: string; icon: React.ReactNode; color: string; badgeClass: string }[] = [
  {
    value: 'WhatsApp',
    label: 'WhatsApp',
    icon: <MessageSquare size={14} />,
    color: 'emerald',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
  },
  {
    value: 'Email',
    label: 'Email',
    icon: <Mail size={14} />,
    color: 'sky',
    badgeClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20',
  },
  {
    value: 'Teléfono',
    label: 'Teléfono',
    icon: <Phone size={14} />,
    color: 'amber',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
  },
  {
    value: 'Presencial',
    label: 'Presencial',
    icon: <Users size={14} />,
    color: 'violet',
    badgeClass: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20',
  },
  {
    value: 'Interno',
    label: 'Interno',
    icon: <Lock size={14} />,
    color: 'muted',
    badgeClass: 'bg-muted text-muted-foreground',
  },
];

const canalMeta = (canal: CanalCommunication) =>
  CANALES.find((c) => c.value === canal) ?? CANALES[0];

export const CommunicationsLog: React.FC<CommunicationsLogProps> = ({
  matterId,
  clientId,
  consultationId,
  currentUser,
}) => {
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);

  // form state
  const [canal, setCanal] = useState<CanalCommunication>('WhatsApp');
  const [contenido, setContenido] = useState('');
  const [visibleParaCliente, setVisibleParaCliente] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = matterId
          ? await fetchCommunications(matterId)
          : await fetchAllCommunications();
        setCommunications(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      } catch (err) {
        console.error('Error loading communications', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [matterId]);

  const handleSubmit = async () => {
    if (!contenido.trim() || submitting) return;
    setSubmitting(true);
    try {
      const created = await createCommunication({
        matterId,
        clientId,
        consultationId,
        canal,
        contenido: contenido.trim(),
        enviadoPor: currentUser,
        visibleParaCliente,
      });
      setCommunications((prev) => [created, ...prev]);
      setContenido('');
      setVisibleParaCliente(false);
    } catch (err) {
      console.error('Error creating communication', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquare size={18} className="text-primary" />
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
          Comunicaciones
        </h2>
      </div>

      {/* New communication form */}
      <Card className="p-5 space-y-4">
        {/* Canal selector */}
        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
            Canal
          </span>
          <div className="flex flex-wrap gap-2">
            {CANALES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCanal(c.value)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.1em] transition-all border',
                  canal === c.value
                    ? c.badgeClass + ' ring-2 ring-primary/20'
                    : 'bg-muted/50 text-muted-foreground border-border/50 hover:bg-muted'
                )}
              >
                {c.icon}
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content textarea */}
        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
            Contenido
          </span>
          <textarea
            value={contenido}
            onChange={(e) => setContenido(e.target.value)}
            placeholder="Escribir comunicación..."
            className="w-full px-4 py-3 bg-muted/50 border border-border/50 rounded-xl text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all outline-none min-h-[100px] resize-none"
          />
        </div>

        {/* Footer: checkbox + submit */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={visibleParaCliente}
              onChange={(e) => setVisibleParaCliente(e.target.checked)}
              className="rounded border-border accent-primary"
            />
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
              Visible para el cliente
            </span>
          </label>

          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!contenido.trim() || submitting}
          >
            <Send size={14} className="mr-1.5" />
            {submitting ? 'Enviando...' : 'Enviar'}
          </Button>
        </div>
      </Card>

      {/* Communications list */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Cargando comunicaciones...
        </div>
      ) : communications.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare size={32} className="mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Sin comunicaciones registradas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {communications.map((comm) => {
            const meta = canalMeta(comm.canal);
            return (
              <Card key={comm.id} className="p-4">
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div
                    className={cn(
                      'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
                      meta.badgeClass
                    )}
                  >
                    {meta.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={cn(
                          'inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.15em]',
                          meta.badgeClass
                        )}
                      >
                        {meta.label}
                      </span>
                      {comm.visibleParaCliente && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground">
                          <Eye size={12} />
                          Cliente
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {comm.contenido}
                    </p>

                    <p className="text-[11px] text-muted-foreground">
                      Enviado por{' '}
                      <span className="font-semibold text-foreground/70">
                        {comm.enviadoPor}
                      </span>{' '}
                      &middot;{' '}
                      {format(parseISO(comm.createdAt), "dd/MM/yyyy HH:mm", {
                        locale: es,
                      })}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

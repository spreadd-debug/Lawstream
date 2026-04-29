import React, { useEffect, useMemo, useState } from 'react';
import { Building2, LogOut, Plus, Users, Briefcase, Wallet, Activity, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Badge, Button, Card, Input, Modal, Select } from './UI';
import { cn } from '../lib/utils';

type SubscriptionStatus = 'demo' | 'trial' | 'active' | 'suspended' | 'inactive';

interface PlatformSummary {
  total_firms: number;
  firms_active: number;
  firms_demo: number;
  firms_trial: number;
  firms_suspended: number;
  firms_inactive: number;
  mrr_pesos: number;
  total_users: number;
  total_matters: number;
}

interface FirmMetric {
  firm_id: string;
  firm_nombre: string;
  firm_slug: string;
  subscription_status: SubscriptionStatus;
  subscription_ends_at: string | null;
  monthly_fee_pesos: number | null;
  contact_email: string | null;
  users_total: number;
  users_activos: number;
  matters_total: number;
  matters_activos: number;
  clients_total: number;
  consultas_total: number;
  ultimo_login_at: string | null;
  created_at: string;
}

const STATUS_VARIANT: Record<SubscriptionStatus, 'success' | 'info' | 'warning' | 'error' | 'default'> = {
  active:    'success',
  trial:     'info',
  demo:      'default',
  suspended: 'warning',
  inactive:  'error',
};

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  active:    'Activo',
  trial:     'Trial',
  demo:      'Demo',
  suspended: 'Suspendido',
  inactive:  'Inactivo',
};

function formatPesos(n: number | null | undefined): string {
  if (n == null) return '—';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export const SuperAdminPanel: React.FC = () => {
  const { signOut, user } = useAuth();
  const [summary, setSummary] = useState<PlatformSummary | null>(null);
  const [firms, setFirms] = useState<FirmMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [editingFirm, setEditingFirm] = useState<FirmMetric | null>(null);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, firmsRes] = await Promise.all([
        supabase.rpc('admin_platform_summary'),
        supabase.rpc('admin_firm_metrics'),
      ]);
      if (summaryRes.error) throw summaryRes.error;
      if (firmsRes.error) throw firmsRes.error;
      setSummary((summaryRes.data?.[0] ?? null) as PlatformSummary | null);
      setFirms((firmsRes.data ?? []) as FirmMetric[]);
    } catch (err: any) {
      setError(err.message ?? 'No se pudieron cargar las métricas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadAll(); }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 size={18} className="text-primary" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight">Lawstream · Panel de plataforma</h1>
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut size={14} className="mr-2" /> Salir
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {error && (
          <Card className="p-4 border-rose-500/30 bg-rose-500/5">
            <div className="flex items-start gap-3 text-rose-700 dark:text-rose-300">
              <AlertCircle size={18} />
              <div>
                <p className="font-bold text-sm">Error al cargar</p>
                <p className="text-xs">{error}</p>
              </div>
            </div>
          </Card>
        )}

        <SummaryCards summary={summary} loading={loading} />

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-black tracking-tight">Estudios</h2>
            <Button onClick={() => setShowNewModal(true)}>
              <Plus size={14} className="mr-2" /> Nuevo estudio
            </Button>
          </div>
          <FirmsTable firms={firms} loading={loading} onSelect={setEditingFirm} />
        </section>
      </main>

      {showNewModal && (
        <NewFirmModal
          onClose={() => setShowNewModal(false)}
          onCreated={() => { setShowNewModal(false); void loadAll(); }}
        />
      )}

      {editingFirm && (
        <EditFirmModal
          firm={editingFirm}
          onClose={() => setEditingFirm(null)}
          onSaved={() => { setEditingFirm(null); void loadAll(); }}
        />
      )}
    </div>
  );
};

// ── Summary cards ───────────────────────────────────────────────

const SummaryCards: React.FC<{ summary: PlatformSummary | null; loading: boolean }> = ({ summary, loading }) => {
  const cards = useMemo(() => [
    { label: 'MRR',                value: formatPesos(summary?.mrr_pesos ?? 0),   icon: Wallet,    accent: 'text-emerald-500' },
    { label: 'Estudios totales',   value: summary?.total_firms ?? 0,              icon: Building2, accent: 'text-primary' },
    { label: 'Activos',            value: summary?.firms_active ?? 0,             icon: Activity,  accent: 'text-emerald-500' },
    { label: 'Demo / Trial',       value: (summary?.firms_demo ?? 0) + (summary?.firms_trial ?? 0), icon: Activity,  accent: 'text-sky-500' },
    { label: 'Usuarios',           value: summary?.total_users ?? 0,              icon: Users,     accent: 'text-violet-500' },
    { label: 'Matters totales',    value: summary?.total_matters ?? 0,            icon: Briefcase, accent: 'text-amber-500' },
  ], [summary]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c) => (
        <Card key={c.label} className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground">{c.label}</p>
            <c.icon size={14} className={c.accent} />
          </div>
          <p className="text-xl font-black tracking-tight">{loading ? '…' : c.value}</p>
        </Card>
      ))}
    </div>
  );
};

// ── Firms table ─────────────────────────────────────────────────

const FirmsTable: React.FC<{
  firms: FirmMetric[];
  loading: boolean;
  onSelect: (f: FirmMetric) => void;
}> = ({ firms, loading, onSelect }) => {
  if (loading) {
    return <Card className="p-12 text-center text-sm text-muted-foreground">Cargando estudios…</Card>;
  }
  if (firms.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-sm font-bold mb-1">No hay estudios cargados todavía</p>
        <p className="text-xs text-muted-foreground">Usá el botón "Nuevo estudio" para crear el primero.</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 border-b border-border">
          <tr className="text-left text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground">
            <th className="px-4 py-3">Estudio</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Fee/mes</th>
            <th className="px-4 py-3 text-right">Users</th>
            <th className="px-4 py-3 text-right">Matters</th>
            <th className="px-4 py-3 text-right">Clientes</th>
            <th className="px-4 py-3">Último login</th>
            <th className="px-4 py-3">Alta</th>
          </tr>
        </thead>
        <tbody>
          {firms.map((f) => (
            <tr
              key={f.firm_id}
              onClick={() => onSelect(f)}
              className={cn(
                'border-b border-border last:border-0 transition-colors cursor-pointer',
                'hover:bg-muted/30',
              )}
            >
              <td className="px-4 py-3">
                <p className="font-bold text-foreground">{f.firm_nombre}</p>
                <p className="text-[10px] text-muted-foreground">{f.firm_slug} · {f.contact_email ?? 'sin contacto'}</p>
              </td>
              <td className="px-4 py-3">
                <Badge variant={STATUS_VARIANT[f.subscription_status]}>{STATUS_LABEL[f.subscription_status]}</Badge>
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{formatPesos(f.monthly_fee_pesos)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{f.users_activos}/{f.users_total}</td>
              <td className="px-4 py-3 text-right tabular-nums">{f.matters_activos}/{f.matters_total}</td>
              <td className="px-4 py-3 text-right tabular-nums">{f.clients_total}</td>
              <td className="px-4 py-3 text-muted-foreground">{formatDate(f.ultimo_login_at)}</td>
              <td className="px-4 py-3 text-muted-foreground">{formatDate(f.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
};

// ── New firm modal ──────────────────────────────────────────────

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  const buf = new Uint32Array(14);
  crypto.getRandomValues(buf);
  for (let i = 0; i < buf.length; i++) out += chars[buf[i] % chars.length];
  return out;
}

interface ProvisionResult {
  firm_nombre: string;
  socio_email: string;
  socio_password: string;
}

const NewFirmModal: React.FC<{ onClose: () => void; onCreated: () => void }> = ({ onClose, onCreated }) => {
  const [nombre, setNombre]       = useState('');
  const [slug, setSlug]           = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [socioNombre, setSocioNombre] = useState('');
  const [socioEmail, setSocioEmail]   = useState('');
  const [socioPassword, setSocioPassword] = useState('');
  const [status, setStatus]       = useState<SubscriptionStatus>('demo');
  const [fee, setFee]             = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [result, setResult]       = useState<ProvisionResult | null>(null);

  // Auto-slug del nombre mientras el user no lo edite manualmente.
  useEffect(() => {
    if (!slugTouched) setSlug(slugify(nombre));
  }, [nombre, slugTouched]);

  const submit = async () => {
    setError(null);
    if (!nombre || !slug || !socioNombre || !socioEmail || !socioPassword) {
      setError('Completá los campos obligatorios.');
      return;
    }
    if (socioPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    setSubmitting(true);
    try {
      const sessionRes = await supabase.auth.getSession();
      const token = sessionRes.data.session?.access_token;
      if (!token) throw new Error('Sesión expirada. Volvé a loguearte.');

      const res = await fetch('/api/admin-provision-firm', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          firm_nombre:    nombre,
          firm_slug:      slug,
          socio_email:    socioEmail,
          socio_password: socioPassword,
          socio_nombre:   socioNombre,
          status,
          monthly_fee:    fee ? Number(fee) : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'No se pudo crear el estudio.');

      setResult({ firm_nombre: nombre, socio_email: socioEmail, socio_password: socioPassword });
      onCreated();
    } catch (err: any) {
      setError(err.message ?? 'No se pudo crear el estudio.');
    } finally {
      setSubmitting(false);
    }
  };

  // Pantalla de éxito con credenciales.
  if (result) {
    return (
      <Modal
        isOpen
        onClose={onClose}
        title="Estudio creado"
        footer={<Button onClick={onClose}>Listo</Button>}
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4">
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 mb-1">
              {result.firm_nombre} dado de alta.
            </p>
            <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80">
              Pasale estas credenciales al Socio. La primera vez que entre, el sistema le va a pedir cambiar la contraseña.
            </p>
          </div>

          <CopyRow label="Email"      value={result.socio_email} />
          <CopyRow label="Contraseña" value={result.socio_password} mono />
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Nuevo estudio"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancelar</Button>
          <Button onClick={submit} disabled={submitting}>{submitting ? 'Creando…' : 'Crear estudio'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Nombre del estudio *">
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Estudio López" />
        </Field>

        <Field label="Slug (URL) *">
          <Input
            value={slug}
            onChange={(e) => { setSlug(slugify(e.target.value)); setSlugTouched(true); }}
            placeholder="estudio-lopez"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Status">
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}
              options={['demo', 'trial', 'active']}
            />
          </Field>
          <Field label="Fee mensual (ARS)">
            <Input
              type="number"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              placeholder="0"
            />
          </Field>
        </div>

        <hr className="border-border" />

        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
          Datos del Socio (primer usuario del estudio)
        </p>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre completo *">
            <Input value={socioNombre} onChange={(e) => setSocioNombre(e.target.value)} placeholder="Juan López" />
          </Field>
          <Field label="Email *">
            <Input type="email" value={socioEmail} onChange={(e) => setSocioEmail(e.target.value)} placeholder="juan@lopez.com" />
          </Field>
        </div>

        <Field label="Contraseña inicial *">
          <div className="flex gap-2">
            <Input
              value={socioPassword}
              onChange={(e) => setSocioPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="font-mono"
            />
            <Button variant="outline" onClick={() => setSocioPassword(generatePassword())}>
              Generar
            </Button>
          </div>
        </Field>

        {error && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
};

// ── Copy row helper ─────────────────────────────────────────────

const CopyRow: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-1.5">{label}</p>
      <div className="flex gap-2">
        <div className={cn(
          'flex-1 px-4 py-2 bg-muted/50 border border-border/50 rounded-xl text-sm select-all',
          mono && 'font-mono',
        )}>
          {value}
        </div>
        <Button variant="outline" onClick={copy}>{copied ? 'Copiado' : 'Copiar'}</Button>
      </div>
    </div>
  );
};

// ── Edit firm modal ─────────────────────────────────────────────

const EditFirmModal: React.FC<{
  firm: FirmMetric;
  onClose: () => void;
  onSaved: () => void;
}> = ({ firm, onClose, onSaved }) => {
  const [status, setStatus] = useState<SubscriptionStatus>(firm.subscription_status);
  const [fee, setFee]       = useState(firm.monthly_fee_pesos != null ? String(firm.monthly_fee_pesos) : '');
  const [endsAt, setEndsAt] = useState(firm.subscription_ends_at ? firm.subscription_ends_at.slice(0, 10) : '');
  const [contactEmail, setContactEmail] = useState(firm.contact_email ?? '');
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('firms')
        .update({
          subscription_status: status,
          monthly_fee_pesos:   fee ? Number(fee) : null,
          subscription_ends_at: endsAt ? new Date(endsAt).toISOString() : null,
          contact_email:       contactEmail || null,
          updated_at:          new Date().toISOString(),
        })
        .eq('id', firm.firm_id);
      if (error) throw error;
      onSaved();
    } catch (err: any) {
      setError(err.message ?? 'No se pudo guardar.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={firm.firm_nombre}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancelar</Button>
          <Button onClick={submit} disabled={submitting}>{submitting ? 'Guardando…' : 'Guardar'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3 text-center text-xs">
          <Stat label="Users" value={`${firm.users_activos}/${firm.users_total}`} />
          <Stat label="Matters" value={`${firm.matters_activos}/${firm.matters_total}`} />
          <Stat label="Clientes" value={firm.clients_total} />
        </div>

        <Field label="Status de suscripción">
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}
            options={['demo', 'trial', 'active', 'suspended', 'inactive']}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Fee mensual (ARS)">
            <Input type="number" value={fee} onChange={(e) => setFee(e.target.value)} />
          </Field>
          <Field label="Vence (opcional)">
            <Input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </Field>
        </div>

        <Field label="Email de contacto">
          <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
        </Field>

        {error && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
};

// ── helpers ─────────────────────────────────────────────────────

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="block text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-1.5">{label}</span>
    {children}
  </label>
);

const Stat: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="rounded-xl bg-muted/40 p-3">
    <p className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-1">{label}</p>
    <p className="text-sm font-black tabular-nums">{value}</p>
  </div>
);

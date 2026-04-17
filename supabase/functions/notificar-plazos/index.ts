// Supabase Edge Function — notificar-plazos
//
// Envía a cada abogado un resumen de los plazos procesales que vencen dentro
// de los próximos 7 días (incluidos los ya vencidos que no se hayan cumplido).
//
// Invocación típica: vía cron diario a las 08:00 ART.
//   SELECT cron.schedule('notificar-plazos', '0 11 * * *',
//     $$ SELECT net.http_post(
//          url:='https://<project>.functions.supabase.co/notificar-plazos',
//          headers:=jsonb_build_object('Authorization', 'Bearer <anon>'))
//     $$);
//
// Variables de entorno requeridas:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (provistas por Supabase)
//   RESEND_API_KEY                           (secreto manual)
//   NOTIFICAR_PLAZOS_FROM                    (ej: "Lawstream <plazos@lawstream.app>")

// @ts-expect-error — Deno runtime; resolves at deploy time.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
// @ts-expect-error — Deno runtime.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

interface PlazoRow {
  id: string;
  tipo: string;
  descripcion: string | null;
  fecha_vencimiento: string;
  dias: number;
  dias_habiles: boolean;
  jurisdiccion: string;
  matter_id: string;
  matters: {
    id: string;
    title: string;
    client: string;
    responsible: string | null;
  } | null;
}

interface ProfileRow {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
}

const DAYS_AHEAD = 7;

// @ts-expect-error — Deno global.
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
// @ts-expect-error — Deno global.
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
// @ts-expect-error — Deno global.
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
// @ts-expect-error — Deno global.
const RESEND_FROM = Deno.env.get('NOTIFICAR_PLAZOS_FROM') ?? 'Lawstream <onboarding@resend.dev>';

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function isoPlus(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function diffDays(from: string, to: string): number {
  const a = new Date(from + 'T00:00:00Z').getTime();
  const b = new Date(to + 'T00:00:00Z').getTime();
  return Math.round((b - a) / 86400000);
}

async function loadPlazosVencimientoProximos(): Promise<PlazoRow[]> {
  const until = isoPlus(DAYS_AHEAD);
  const { data, error } = await admin
    .from('plazos')
    .select(`
      id, tipo, descripcion, fecha_vencimiento, dias, dias_habiles, jurisdiccion, matter_id,
      matters:matter_id ( id, title, client, responsible )
    `)
    .eq('estado', 'activo')
    .lte('fecha_vencimiento', until)
    .order('fecha_vencimiento', { ascending: true });

  if (error) throw new Error(`plazos query: ${error.message}`);
  return (data ?? []) as unknown as PlazoRow[];
}

async function loadProfiles(): Promise<Map<string, ProfileRow>> {
  const { data, error } = await admin
    .from('profiles')
    .select('id, full_name, email, is_active')
    .eq('is_active', true);
  if (error) throw new Error(`profiles query: ${error.message}`);
  const map = new Map<string, ProfileRow>();
  for (const p of (data ?? []) as ProfileRow[]) {
    map.set(p.full_name.toLowerCase().trim(), p);
  }
  return map;
}

function renderEmail(profileName: string, rows: PlazoRow[]): { subject: string; html: string; text: string } {
  const today = isoToday();
  const vencidos = rows.filter(r => diffDays(today, r.fecha_vencimiento) < 0);
  const hoy      = rows.filter(r => diffDays(today, r.fecha_vencimiento) === 0);
  const proximos = rows.filter(r => diffDays(today, r.fecha_vencimiento) > 0);

  const subject = vencidos.length > 0
    ? `[Lawstream] ${rows.length} plazo(s) — ${vencidos.length} vencido(s)`
    : `[Lawstream] ${rows.length} plazo(s) próximos — agenda de ${today}`;

  const section = (title: string, items: PlazoRow[], emphasis: string) => {
    if (!items.length) return '';
    const list = items.map(r => {
      const dias = diffDays(today, r.fecha_vencimiento);
      const label = dias < 0 ? `vencido hace ${Math.abs(dias)}d`
                 : dias === 0 ? 'vence hoy'
                 : `en ${dias}d`;
      const m = r.matters;
      return `<li style="margin-bottom:10px;">
        <strong>${escapeHtml(r.tipo)}</strong> — ${escapeHtml(label)} (${escapeHtml(r.fecha_vencimiento)})<br/>
        <span style="color:#64748b; font-size:12px;">${escapeHtml(m?.title ?? 'Asunto sin título')} · ${escapeHtml(m?.client ?? '')}</span>
      </li>`;
    }).join('');
    return `<h3 style="color:${emphasis}; margin:20px 0 8px 0; font-size:14px;">${escapeHtml(title)}</h3><ul style="padding-left:18px; margin:0;">${list}</ul>`;
  };

  const html = `
<!doctype html>
<html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif; color:#0f172a; max-width:640px; margin:0 auto; padding:24px;">
  <h2 style="margin:0 0 4px 0;">Hola, ${escapeHtml(profileName)}</h2>
  <p style="color:#64748b; margin:0 0 12px 0;">Resumen de plazos procesales que requieren tu atención.</p>
  ${section('Vencidos', vencidos, '#dc2626')}
  ${section('Vencen hoy', hoy, '#ea580c')}
  ${section('Próximos (7 días)', proximos, '#0ea5e9')}
  <hr style="border:none; border-top:1px solid #e2e8f0; margin:24px 0;" />
  <p style="color:#94a3b8; font-size:11px;">Lawstream · notificación diaria automática · ${today}</p>
</body></html>`.trim();

  const textLines: string[] = [`Hola ${profileName},`, '', 'Plazos procesales a atender:'];
  for (const r of rows) {
    const dias = diffDays(today, r.fecha_vencimiento);
    const label = dias < 0 ? `vencido hace ${Math.abs(dias)}d` : dias === 0 ? 'vence hoy' : `en ${dias}d`;
    textLines.push(`· ${r.tipo} — ${label} (${r.fecha_vencimiento}) — ${r.matters?.title ?? ''}`);
  }
  return { subject, html, text: textLines.join('\n') };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

async function sendEmail(to: string, subject: string, html: string, text: string): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn('[notificar-plazos] RESEND_API_KEY no definida — email a', to, 'omitido');
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: RESEND_FROM, to, subject, html, text }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend ${res.status}: ${body}`);
  }
}

serve(async (req: Request) => {
  try {
    const plazos = await loadPlazosVencimientoProximos();
    if (plazos.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, reason: 'sin plazos' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const profiles = await loadProfiles();

    // Agrupar plazos por responsable
    const porResponsable = new Map<string, PlazoRow[]>();
    for (const p of plazos) {
      const name = p.matters?.responsible?.trim();
      if (!name) continue;
      const arr = porResponsable.get(name) || [];
      arr.push(p);
      porResponsable.set(name, arr);
    }

    let sent = 0;
    const errors: Array<{ to: string; error: string }> = [];
    for (const [name, rows] of porResponsable) {
      const profile = profiles.get(name.toLowerCase());
      if (!profile) {
        console.warn('[notificar-plazos] sin profile activo para', name);
        continue;
      }
      const { subject, html, text } = renderEmail(profile.full_name, rows);
      try {
        await sendEmail(profile.email, subject, html, text);
        sent++;
      } catch (e) {
        const msg = (e as Error).message;
        console.error('[notificar-plazos] error', profile.email, msg);
        errors.push({ to: profile.email, error: msg });
      }
    }

    return new Response(JSON.stringify({ ok: true, sent, errors }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = (e as Error).message;
    console.error('[notificar-plazos] fatal:', msg);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

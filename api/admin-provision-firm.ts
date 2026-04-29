// Vercel serverless function — provisiona un estudio nuevo desde el panel
// del superadmin. Crea el user en Supabase Auth (requiere service_role) y
// luego llama a la RPC admin_provision_firm para crear firm + profile.
//
// Env vars requeridas en Vercel:
//   • SUPABASE_URL                — URL del proyecto Supabase
//   • SUPABASE_SERVICE_ROLE_KEY   — service_role key (NO la anon key)

import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const SUPABASE_URL  = process.env.SUPABASE_URL  ?? process.env.VITE_SUPABASE_URL;
  const SERVICE_ROLE  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return res.status(500).json({ error: 'Server misconfigured: faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY' });
  }

  // Token del superadmin que está llamando.
  const auth  = req.headers.authorization ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Falta header Authorization Bearer' });
  }

  // Cliente que actúa como el caller (para chequear is_super_admin y para
  // que la RPC admin_provision_firm use la JWT del superadmin).
  const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth:   { persistSession: false, autoRefreshToken: false },
  });

  // Verificar que el caller es superadmin.
  const { data: isSuperAdmin, error: checkErr } = await callerClient.rpc('is_super_admin');
  if (checkErr) {
    return res.status(500).json({ error: 'No se pudo verificar superadmin: ' + checkErr.message });
  }
  if (!isSuperAdmin) {
    return res.status(403).json({ error: 'Solo superadmins pueden crear estudios' });
  }

  // Body.
  const {
    firm_nombre, firm_slug,
    socio_email, socio_password, socio_nombre,
    status = 'demo',
    monthly_fee = null,
  } = req.body ?? {};

  if (!firm_nombre || !firm_slug || !socio_email || !socio_password || !socio_nombre) {
    return res.status(400).json({
      error: 'Faltan campos: firm_nombre, firm_slug, socio_email, socio_password, socio_nombre son obligatorios.',
    });
  }

  // Cliente con service_role para crear users en Auth.
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Crear auth.user con email confirmado.
  const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
    email:         socio_email,
    password:      socio_password,
    email_confirm: true,
    user_metadata: { full_name: socio_nombre },
  });
  if (createErr || !created?.user) {
    return res.status(400).json({ error: createErr?.message ?? 'No se pudo crear el user' });
  }

  // 2. Provisionar firm + profile (la RPC ya valida y arma todo).
  const { data: firmId, error: provisionErr } = await callerClient.rpc('admin_provision_firm', {
    p_firm_nombre:   firm_nombre,
    p_firm_slug:     firm_slug,
    p_socio_user_id: created.user.id,
    p_socio_nombre:  socio_nombre,
    p_socio_email:   socio_email,
    p_subscription:  status,
    p_monthly_fee:   monthly_fee,
  });

  if (provisionErr) {
    // Rollback: borrar el auth.user que acabamos de crear, sino queda colgado.
    await adminClient.auth.admin.deleteUser(created.user.id);
    return res.status(400).json({ error: 'Falló admin_provision_firm: ' + provisionErr.message });
  }

  return res.status(200).json({ firm_id: firmId, user_id: created.user.id });
}

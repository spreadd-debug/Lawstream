/**
 * Motor de variables para plantillas legales — Lawstream
 *
 * Reemplaza placeholders {{variable}} en plantillas con datos
 * del cliente, expediente y estudio.
 */

import { Matter, Client, Expediente, EstudioPerfil } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface TemplateContext {
  matter?: Matter;
  client?: Client;
  expediente?: Expediente;
  estudio?: EstudioPerfil;
  custom?: Record<string, string>;
}

/** All available variables and their descriptions (for UI) */
export const TEMPLATE_VARIABLES: { key: string; label: string; group: string }[] = [
  // Cliente
  { key: 'cliente_nombre',     label: 'Nombre del cliente',     group: 'Cliente' },
  { key: 'cliente_email',      label: 'Email del cliente',      group: 'Cliente' },
  { key: 'cliente_telefono',   label: 'Teléfono del cliente',   group: 'Cliente' },
  { key: 'cliente_tipo',       label: 'Tipo (Persona/Empresa)', group: 'Cliente' },
  // Asunto
  { key: 'asunto_titulo',      label: 'Título del asunto',      group: 'Asunto' },
  { key: 'asunto_tipo',        label: 'Rama del derecho',       group: 'Asunto' },
  { key: 'asunto_subtipo',     label: 'Subtipo',                group: 'Asunto' },
  { key: 'asunto_responsable', label: 'Abogado responsable',    group: 'Asunto' },
  { key: 'asunto_expediente',  label: 'Nro. expediente',        group: 'Asunto' },
  // Expediente judicial
  { key: 'exp_caratula',       label: 'Carátula',               group: 'Expediente' },
  { key: 'exp_fuero',          label: 'Fuero',                  group: 'Expediente' },
  { key: 'exp_juzgado',        label: 'Juzgado',                group: 'Expediente' },
  { key: 'exp_nro_juzgado',    label: 'Nro. Juzgado',          group: 'Expediente' },
  { key: 'exp_nro_receptoria', label: 'Nro. Receptoría',       group: 'Expediente' },
  { key: 'exp_estado',         label: 'Estado procesal',        group: 'Expediente' },
  { key: 'exp_secretaria',     label: 'Secretaría',             group: 'Expediente' },
  // Estudio
  { key: 'estudio_nombre',     label: 'Nombre del estudio',     group: 'Estudio' },
  { key: 'estudio_cuit',       label: 'CUIT del estudio',       group: 'Estudio' },
  { key: 'estudio_direccion',  label: 'Dirección del estudio',  group: 'Estudio' },
  { key: 'estudio_telefono',   label: 'Teléfono del estudio',   group: 'Estudio' },
  { key: 'estudio_email',      label: 'Email del estudio',      group: 'Estudio' },
  // Fechas
  { key: 'fecha_hoy',          label: 'Fecha de hoy',           group: 'Fechas' },
  { key: 'fecha_hoy_larga',    label: 'Fecha de hoy (larga)',   group: 'Fechas' },
  { key: 'anio_actual',        label: 'Año actual',             group: 'Fechas' },
];

function buildVariableMap(ctx: TemplateContext): Record<string, string> {
  const now = new Date();
  const vars: Record<string, string> = {
    // Fechas siempre disponibles
    fecha_hoy:        format(now, 'dd/MM/yyyy'),
    fecha_hoy_larga:  format(now, "d 'de' MMMM 'de' yyyy", { locale: es }),
    anio_actual:      format(now, 'yyyy'),
  };

  if (ctx.client) {
    vars.cliente_nombre   = ctx.client.name;
    vars.cliente_email    = ctx.client.email || '';
    vars.cliente_telefono = ctx.client.phone || '';
    vars.cliente_tipo     = ctx.client.type;
  }

  if (ctx.matter) {
    vars.asunto_titulo      = ctx.matter.title;
    vars.asunto_tipo        = ctx.matter.type;
    vars.asunto_subtipo     = ctx.matter.subtype || '';
    vars.asunto_responsable = ctx.matter.responsible;
    vars.asunto_expediente  = ctx.matter.expediente || '';
  }

  if (ctx.expediente) {
    vars.exp_caratula       = ctx.expediente.caratula;
    vars.exp_fuero          = ctx.expediente.fuero;
    vars.exp_juzgado        = ctx.expediente.juzgado || '';
    vars.exp_nro_juzgado    = ctx.expediente.nroJuzgado || '';
    vars.exp_nro_receptoria = ctx.expediente.nroReceptoria || '';
    vars.exp_estado         = ctx.expediente.estadoTroncal;
    vars.exp_secretaria     = ''; // to be added when expediente has secretaria field
  }

  if (ctx.estudio) {
    vars.estudio_nombre    = ctx.estudio.nombre;
    vars.estudio_cuit      = ctx.estudio.cuit || '';
    vars.estudio_direccion = ctx.estudio.direccion || '';
    vars.estudio_telefono  = ctx.estudio.telefono || '';
    vars.estudio_email     = ctx.estudio.email || '';
  }

  // Custom overrides
  if (ctx.custom) {
    Object.assign(vars, ctx.custom);
  }

  return vars;
}

/**
 * Replaces all {{variable}} placeholders in template content.
 * Unresolved variables are left as-is with a highlight marker.
 */
export function fillTemplate(template: string, ctx: TemplateContext): string {
  const vars = buildVariableMap(ctx);

  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = vars[key];
    if (value !== undefined && value !== '') return value;
    return `[${key}]`; // placeholder marker for unresolved
  });
}

/**
 * Returns list of unresolved variable keys in a template given context.
 */
export function getUnresolvedVariables(template: string, ctx: TemplateContext): string[] {
  const vars = buildVariableMap(ctx);
  const unresolved: string[] = [];
  const regex = /\{\{(\w+)\}\}/g;
  let match;

  while ((match = regex.exec(template)) !== null) {
    const key = match[1];
    if (!vars[key] || vars[key] === '') {
      if (!unresolved.includes(key)) unresolved.push(key);
    }
  }

  return unresolved;
}

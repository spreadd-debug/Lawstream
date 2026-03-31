import React from 'react';
import {
  Document, Page, View, Text, Image, StyleSheet,
} from '@react-pdf/renderer';
import { Recibo, EstudioPerfil } from '../types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const BLACK = '#0F172A';
const BLUE  = '#1A3C5E';
const GREY  = '#64748B';
const LGREY = '#94A3B8';

const fmt = (n: number) =>
  n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: BLACK,
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 45,
    backgroundColor: '#FFFFFF',
  },

  // Header
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  logo:       { width: 130, height: 85, objectFit: 'contain' },
  logoPlaceholder: { width: 130 },
  titleBlock: { alignItems: 'flex-end' },
  title:      { fontSize: 28, fontFamily: 'Helvetica-Bold', color: BLACK, letterSpacing: -0.5 },
  metaRow:    { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 3 },
  metaLabel:  { fontSize: 8.5, color: LGREY },
  metaValue:  { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: BLACK, marginLeft: 4 },

  // Blue rule
  rule: { height: 2, backgroundColor: BLUE, marginBottom: 24 },

  // Amount highlight box
  amountBox: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#EFF6FF', borderRadius: 6,
    paddingVertical: 14, paddingHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  amountLabel: { fontSize: 10, color: GREY, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  amountValue: { fontSize: 24, fontFamily: 'Helvetica-Bold', color: BLUE },

  // Body rows
  row:       { flexDirection: 'row', marginBottom: 10 },
  rowLabel:  { width: 130, fontSize: 9, color: LGREY, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  rowValue:  { flex: 1, fontSize: 11, color: BLACK },
  rowValueBold: { flex: 1, fontSize: 12, fontFamily: 'Helvetica-Bold', color: BLACK },

  // Notes
  notesBox: {
    backgroundColor: '#FFFBEB', borderRadius: 6,
    padding: 10, marginTop: 12,
    borderWidth: 1, borderColor: '#FEF3C7',
  },
  notesText: { fontSize: 9, color: '#92400E', lineHeight: 1.5 },

  // Divider
  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 24 },

  // Bottom: studio + firma
  bottomRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  studioBlock: { flex: 1 },
  studioLabel: { fontSize: 7.5, color: LGREY, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 },
  studioName:  { fontSize: 12, fontFamily: 'Helvetica-Bold', color: BLACK, marginBottom: 2 },
  studioLine:  { fontSize: 9, color: GREY, marginBottom: 2 },

  firmaBlock:  { alignItems: 'flex-end' },
  firmaImg:    { width: 130, height: 55, objectFit: 'contain', marginBottom: 6 },
  firmaLine:   { width: 150, height: 1, backgroundColor: GREY, marginBottom: 4 },
  firmaLabel:  { fontSize: 8, color: GREY },

  // Footer
  footer: {
    position: 'absolute', bottom: 28, left: 45, right: 45,
    borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 7,
  },
  footerText: { fontSize: 8, color: LGREY, textAlign: 'center' },
});

interface ReciboPDFProps {
  recibo: Recibo;
  perfil: EstudioPerfil;
}

export const ReciboPDF: React.FC<ReciboPDFProps> = ({ recibo, perfil }) => {
  const fechaStr  = format(parseISO(recibo.createdAt), "d 'de' MMMM 'de' yyyy", { locale: es });
  const cuotaStr  = recibo.cuotaNumero ? ` — Cuota ${recibo.cuotaNumero}` : '';

  return (
    <Document title={`Recibo ${recibo.numero ?? ''}`} author={perfil.nombre}>
      <Page size="A4" style={s.page}>

        {/* ── HEADER ──────────────────────────────────── */}
        <View style={s.header}>
          {perfil.logoUrl
            ? <Image src={perfil.logoUrl} style={s.logo} />
            : <View style={s.logoPlaceholder} />
          }
          <View style={s.titleBlock}>
            <Text style={s.title}>Recibo de Pago</Text>
            <View style={[s.metaRow, { marginTop: 6 }]}>
              <Text style={s.metaLabel}>N°:</Text>
              <Text style={s.metaValue}>{recibo.numero ?? '—'}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Fecha:</Text>
              <Text style={s.metaValue}>{fechaStr}</Text>
            </View>
          </View>
        </View>

        <View style={s.rule} />

        {/* ── MONTO ───────────────────────────────────── */}
        <View style={s.amountBox}>
          <Text style={s.amountLabel}>Monto recibido</Text>
          <Text style={s.amountValue}>${fmt(recibo.montoPesos)}</Text>
        </View>

        {/* ── CAMPOS ──────────────────────────────────── */}
        <View style={s.row}>
          <Text style={s.rowLabel}>Recibí de</Text>
          <Text style={s.rowValueBold}>{recibo.clientName}</Text>
        </View>

        <View style={s.row}>
          <Text style={s.rowLabel}>En concepto de</Text>
          <Text style={s.rowValue}>{recibo.concepto}{cuotaStr}</Text>
        </View>

        <View style={s.row}>
          <Text style={s.rowLabel}>Forma de pago</Text>
          <Text style={s.rowValue}>{recibo.formaPago}</Text>
        </View>

        {/* ── NOTAS ───────────────────────────────────── */}
        {recibo.notas ? (
          <View style={s.notesBox}>
            <Text style={s.notesText}>{recibo.notas}</Text>
          </View>
        ) : null}

        <View style={s.divider} />

        {/* ── ESTUDIO + FIRMA ─────────────────────────── */}
        <View style={s.bottomRow}>
          <View style={s.studioBlock}>
            <Text style={s.studioLabel}>Emitido por</Text>
            <Text style={s.studioName}>{perfil.nombre}</Text>
            {perfil.cuit      && <Text style={s.studioLine}>CUIT: {perfil.cuit}</Text>}
            {perfil.email     && <Text style={s.studioLine}>{perfil.email}</Text>}
            {perfil.telefono  && <Text style={s.studioLine}>{perfil.telefono}</Text>}
            {perfil.direccion && <Text style={s.studioLine}>{perfil.direccion}</Text>}
          </View>

          <View style={s.firmaBlock}>
            {perfil.firmaUrl
              ? <Image src={perfil.firmaUrl} style={s.firmaImg} />
              : null
            }
            <View style={s.firmaLine} />
            <Text style={s.firmaLabel}>Firma y Aclaración</Text>
          </View>
        </View>

        {/* ── FOOTER ──────────────────────────────────── */}
        {perfil.footerText ? (
          <View style={s.footer} fixed>
            <Text style={s.footerText}>{perfil.footerText}</Text>
          </View>
        ) : null}

      </Page>
    </Document>
  );
};

import React from 'react';
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';
import { Presupuesto, EstudioPerfil } from '../types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// ── Constants ────────────────────────────────────────────────────

const BLUE    = '#1A3C5E';
const GREY    = '#64748B';
const LGREY   = '#94A3B8';
const ROW_ALT = '#F8FAFC';
const BLACK   = '#0F172A';

const fmt = (n: number) =>
  n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Styles ───────────────────────────────────────────────────────

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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  logo:   { width: 160, height: 100, objectFit: 'contain' },
  logoPlaceholder: { width: 70, height: 70, backgroundColor: '#F1F5F9', borderRadius: 6 },
  titleBlock: { alignItems: 'flex-end' },
  title:  { fontSize: 30, fontFamily: 'Helvetica-Bold', letterSpacing: -0.5, color: BLACK },
  metaRow:{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 2 },
  metaLabel: { fontSize: 8.5, color: LGREY },
  metaValue: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: BLACK, marginLeft: 4 },

  // Divider
  divider: { height: 1, backgroundColor: '#E2E8F0', marginBottom: 20 },

  // Parties
  parties:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28 },
  partyBlock:  { flex: 1 },
  partyRight:  { flex: 1, alignItems: 'flex-end' },
  partyLabel:  { fontSize: 7.5, color: LGREY, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 },
  partyName:   { fontSize: 13, fontFamily: 'Helvetica-Bold', color: BLACK, marginBottom: 3 },
  partyLine:   { fontSize: 9.5, color: GREY, marginBottom: 2 },

  // Table
  tableHeader:    { flexDirection: 'row', backgroundColor: BLUE, borderRadius: 4, paddingVertical: 7, paddingHorizontal: 8, marginBottom: 0 },
  tableHeaderText:{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: 'white', textTransform: 'uppercase', letterSpacing: 0.8 },
  tableRow:       { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  tableRowAlt:    { backgroundColor: ROW_ALT },
  cellDesc:       { flex: 2.2 },
  cellRight:      { flex: 1, alignItems: 'flex-end' },
  cellSmall:      { flex: 0.8, alignItems: 'flex-end' },
  cellConcepto:   { fontSize: 10, fontFamily: 'Helvetica-Bold', color: BLACK },
  cellTipo:       { fontSize: 7.5, color: LGREY, textTransform: 'uppercase', marginTop: 1 },
  cellText:       { fontSize: 10, color: GREY },
  cellBold:       { fontSize: 10, fontFamily: 'Helvetica-Bold', color: BLACK },

  // Bottom section
  bottomSection:  { flexDirection: 'row', justifyContent: 'space-between', marginTop: 28, gap: 24 },
  paymentBlock:   { flex: 1 },
  paymentTitle:   { fontSize: 11.5, fontFamily: 'Helvetica-Bold', color: BLACK, marginBottom: 10 },
  paymentLine:    { fontSize: 9.5, color: GREY, marginBottom: 4 },
  paymentBold:    { fontFamily: 'Helvetica-Bold', color: BLACK },

  // Totals table
  totalsBlock:    { width: 220 },
  totalsRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, paddingHorizontal: 8 },
  totalsLabel:    { fontSize: 10, color: GREY },
  totalsValue:    { fontSize: 10, fontFamily: 'Helvetica-Bold', color: BLACK },
  totalsRowFinal: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: BLUE, borderRadius: 5, paddingVertical: 8, paddingHorizontal: 8, marginTop: 4 },
  totalsLabelFinal: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: 'white' },
  totalsValueFinal: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: 'white' },

  // Notes
  notesSection:   { marginTop: 24 },
  notesTitle:     { fontSize: 11.5, fontFamily: 'Helvetica-Bold', color: BLACK, marginBottom: 6 },
  notesText:      { fontSize: 9.5, color: GREY, lineHeight: 1.6 },

  // Footer
  footerBar:      { position: 'absolute', bottom: 30, left: 45, right: 45, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 8 },
  footerText:     { fontSize: 8, color: LGREY, textAlign: 'center' },

  // Firma
  firmaBlock:     { alignItems: 'flex-end', marginTop: 16 },
  firma:          { width: 140, height: 60, objectFit: 'contain' },
});

// ── PDF Document ─────────────────────────────────────────────────

interface PresupuestoPDFProps {
  presupuesto: Presupuesto;
  perfil: EstudioPerfil;
  clientEmail?: string;
  clientPhone?: string;
}

export const PresupuestoPDF: React.FC<PresupuestoPDFProps> = ({
  presupuesto, perfil, clientEmail, clientPhone,
}) => {
  const subtotalBruto  = presupuesto.items.reduce((a, i) => a + i.subtotalPesos, 0);
  const descuentoMonto = subtotalBruto * (presupuesto.descuentoPorcentaje / 100);
  const totalFinal     = subtotalBruto - descuentoMonto;
  const fechaStr       = format(parseISO(presupuesto.createdAt), "d 'de' MMMM 'de' yyyy", { locale: es });

  const hasPaymentInfo = perfil.cbu || perfil.aliasCbu || perfil.banco;

  return (
    <Document title={`Presupuesto ${presupuesto.numero ?? ''}`} author={perfil.nombre}>
      <Page size="A4" style={s.page}>

        {/* ── HEADER ──────────────────────────────────────── */}
        <View style={s.header}>
          {perfil.logoUrl
            ? <Image src={perfil.logoUrl} style={s.logo} />
            : <View style={s.logoPlaceholder} />
          }
          <View style={s.titleBlock}>
            <Text style={s.title}>Cotización</Text>
            <View style={[s.metaRow, { marginTop: 6 }]}>
              <Text style={s.metaLabel}>Número:</Text>
              <Text style={s.metaValue}>{presupuesto.numero ?? '—'}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Fecha:</Text>
              <Text style={s.metaValue}>{fechaStr}</Text>
            </View>
          </View>
        </View>

        <View style={s.divider} />

        {/* ── PARTIES ─────────────────────────────────────── */}
        <View style={s.parties}>
          <View style={s.partyBlock}>
            <Text style={s.partyLabel}>De</Text>
            <Text style={s.partyName}>{perfil.nombre}</Text>
            {perfil.email     && <Text style={s.partyLine}>{perfil.email}</Text>}
            {perfil.telefono  && <Text style={s.partyLine}>{perfil.telefono}</Text>}
            {perfil.cuit      && <Text style={s.partyLine}>CUIT: {perfil.cuit}</Text>}
            {perfil.direccion && <Text style={s.partyLine}>{perfil.direccion}</Text>}
          </View>

          <View style={s.partyRight}>
            <Text style={s.partyLabel}>Cobrar a</Text>
            <Text style={s.partyName}>{presupuesto.clientName}</Text>
            {clientEmail && <Text style={s.partyLine}>{clientEmail}</Text>}
            {clientPhone && <Text style={s.partyLine}>{clientPhone}</Text>}
          </View>
        </View>

        {/* ── TABLE ───────────────────────────────────────── */}

        {/* Header row */}
        <View style={s.tableHeader}>
          <View style={s.cellDesc}>
            <Text style={s.tableHeaderText}>Descripción</Text>
          </View>
          <View style={s.cellSmall}>
            <Text style={[s.tableHeaderText, { textAlign: 'right' }]}>IUS</Text>
          </View>
          <View style={s.cellRight}>
            <Text style={[s.tableHeaderText, { textAlign: 'right' }]}>Valor $</Text>
          </View>
          <View style={s.cellSmall}>
            <Text style={[s.tableHeaderText, { textAlign: 'right' }]}>Fiscal</Text>
          </View>
          <View style={s.cellSmall}>
            <Text style={[s.tableHeaderText, { textAlign: 'right' }]}>Desc.</Text>
          </View>
          <View style={s.cellRight}>
            <Text style={[s.tableHeaderText, { textAlign: 'right' }]}>Total $</Text>
          </View>
        </View>

        {/* Item rows */}
        {presupuesto.items.map((item, idx) => (
          <View key={item.id} style={[s.tableRow, idx % 2 !== 0 ? s.tableRowAlt : {}]}>
            <View style={s.cellDesc}>
              <Text style={s.cellConcepto}>{item.concepto}</Text>
              <Text style={s.cellTipo}>{item.tipo}</Text>
            </View>
            <View style={s.cellSmall}>
              <Text style={[s.cellText, { textAlign: 'right' }]}>
                {item.cantidadIus != null ? String(item.cantidadIus) : '—'}
              </Text>
            </View>
            <View style={s.cellRight}>
              <Text style={[s.cellText, { textAlign: 'right' }]}>${fmt(item.montoPesos)}</Text>
            </View>
            <View style={s.cellSmall}>
              <Text style={[s.cellText, { textAlign: 'right' }]}>
                {item.fiscalPorcentaje > 0 ? `${item.fiscalPorcentaje}%` : '—'}
              </Text>
            </View>
            <View style={s.cellSmall}>
              <Text style={[s.cellText, { textAlign: 'right' }]}>
                {item.descuentoItemPorcentaje > 0 ? `${item.descuentoItemPorcentaje}%` : '—'}
              </Text>
            </View>
            <View style={s.cellRight}>
              <Text style={[s.cellBold, { textAlign: 'right' }]}>${fmt(item.subtotalPesos)}</Text>
            </View>
          </View>
        ))}

        {/* ── PAYMENT + TOTALS ────────────────────────────── */}
        <View style={s.bottomSection}>
          {/* Payment instructions */}
          <View style={s.paymentBlock}>
            {hasPaymentInfo && (
              <>
                <Text style={s.paymentTitle}>Instrucciones de pago</Text>
                {perfil.banco         && <Text style={s.paymentLine}><Text style={s.paymentBold}>Banco: </Text>{perfil.banco}</Text>}
                {perfil.titularCuenta && <Text style={s.paymentLine}><Text style={s.paymentBold}>Titular: </Text>{perfil.titularCuenta}</Text>}
                {perfil.cbu           && <Text style={s.paymentLine}><Text style={s.paymentBold}>CBU: </Text>{perfil.cbu}</Text>}
                {perfil.aliasCbu      && <Text style={s.paymentLine}><Text style={s.paymentBold}>Alias: </Text>{perfil.aliasCbu}</Text>}
              </>
            )}
          </View>

          {/* Totals */}
          <View style={s.totalsBlock}>
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>Total parcial:</Text>
              <Text style={s.totalsValue}>${fmt(subtotalBruto)}</Text>
            </View>
            {presupuesto.descuentoPorcentaje > 0 && (
              <View style={s.totalsRow}>
                <Text style={s.totalsLabel}>Descuento ({presupuesto.descuentoPorcentaje}%):</Text>
                <Text style={[s.totalsValue, { color: '#DC2626' }]}>- ${fmt(descuentoMonto)}</Text>
              </View>
            )}
            <View style={s.totalsRow}>
              <Text style={[s.totalsLabel, { fontFamily: 'Helvetica-Bold', color: BLACK }]}>Total:</Text>
              <Text style={[s.totalsValue, { fontSize: 11 }]}>${fmt(totalFinal)}</Text>
            </View>
            <View style={s.totalsRowFinal}>
              <Text style={s.totalsLabelFinal}>Saldo adeudado:</Text>
              <Text style={s.totalsValueFinal}>${fmt(totalFinal)}</Text>
            </View>
          </View>
        </View>

        {/* ── NOTAS ───────────────────────────────────────── */}
        {presupuesto.notes ? (
          <View style={s.notesSection}>
            <Text style={s.notesTitle}>Notas</Text>
            <Text style={s.notesText}>{presupuesto.notes}</Text>
          </View>
        ) : null}

        {/* ── OPCIONES DE PAGO ────────────────────────────── */}
        {presupuesto.cuotaOpciones && presupuesto.cuotaOpciones.some(o => o.enabled) ? (
          <View style={{ marginTop: 24 }}>
            <Text style={s.paymentTitle}>Opciones de pago</Text>
            {/* Header */}
            <View style={[s.tableHeader, { marginBottom: 0 }]}>
              <View style={{ flex: 2 }}><Text style={s.tableHeaderText}>Modalidad</Text></View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}><Text style={s.tableHeaderText}>Recargo</Text></View>
              <View style={{ flex: 1.5, alignItems: 'flex-end' }}><Text style={s.tableHeaderText}>Total</Text></View>
              <View style={{ flex: 1.5, alignItems: 'flex-end' }}><Text style={s.tableHeaderText}>Por cuota</Text></View>
            </View>
            {presupuesto.cuotaOpciones.filter(o => o.enabled).map((op, idx) => {
              const totalReal = (subtotalBruto - descuentoMonto) * (1 + op.recargoPorcentaje / 100);
              const porCuota  = op.cuotas === 1 ? null : totalReal / op.cuotas;
              return (
                <View key={op.cuotas} style={[s.tableRow, idx % 2 !== 0 ? s.tableRowAlt : {}]}>
                  <View style={{ flex: 2 }}>
                    <Text style={s.cellConcepto}>{op.cuotas === 1 ? 'Contado' : `${op.cuotas} cuotas`}</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <Text style={s.cellText}>{op.cuotas === 1 ? '—' : `${op.recargoPorcentaje}%`}</Text>
                  </View>
                  <View style={{ flex: 1.5, alignItems: 'flex-end' }}>
                    <Text style={s.cellBold}>${fmt(totalReal)}</Text>
                  </View>
                  <View style={{ flex: 1.5, alignItems: 'flex-end' }}>
                    <Text style={s.cellText}>{porCuota ? `$${fmt(porCuota)}` : '—'}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        {/* ── FIRMA ───────────────────────────────────────── */}
        {perfil.firmaUrl ? (
          <View style={s.firmaBlock}>
            <Image src={perfil.firmaUrl} style={s.firma} />
          </View>
        ) : null}

        {/* ── FOOTER ──────────────────────────────────────── */}
        {perfil.footerText ? (
          <View style={s.footerBar} fixed>
            <Text style={s.footerText}>{perfil.footerText}</Text>
          </View>
        ) : null}

      </Page>
    </Document>
  );
};

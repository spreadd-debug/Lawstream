import React, { useRef } from 'react';
import { Presupuesto, EstudioPerfil } from '../types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { X, Download, ArrowLeft, Printer } from 'lucide-react';
import { Button } from './UI';
import { pdf } from '@react-pdf/renderer';
import { PresupuestoPDF } from './PresupuestoPDF';

interface PresupuestoPreviewProps {
  presupuesto: Presupuesto;
  perfil: EstudioPerfil;
  clientEmail?: string;
  clientPhone?: string;
  onClose: () => void;
  onSave?: () => void;
}

const fmt = (n: number) =>
  n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const BLUE = '#1A3C5E';

export const PresupuestoPreview: React.FC<PresupuestoPreviewProps> = ({
  presupuesto, perfil, clientEmail, clientPhone, onClose, onSave,
}) => {
  const subtotalBruto  = presupuesto.items.reduce((a, i) => a + i.subtotalPesos, 0);
  const descuentoMonto = subtotalBruto * (presupuesto.descuentoPorcentaje / 100);
  const totalFinal     = subtotalBruto - descuentoMonto;

  const buildPdfBlob = () =>
    pdf(
      <PresupuestoPDF
        presupuesto={presupuesto}
        perfil={perfil}
        clientEmail={clientEmail}
        clientPhone={clientPhone}
      />
    ).toBlob();

  const handleDownloadPDF = async () => {
    const blob = await buildPdfBlob();
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href    = url;
    a.download = `Presupuesto_${presupuesto.numero ?? presupuesto.id.slice(0, 8)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = async () => {
    const blob = await buildPdfBlob();
    const url  = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="bg-card border-b border-border px-6 py-3 flex items-center justify-between shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} /> Volver al editor
        </button>
        <span className="text-sm font-black text-foreground">
          Vista Previa — {presupuesto.numero ?? 'Borrador'}
        </span>
        <div className="flex gap-2">
          {onSave && (
            <Button size="sm" variant="outline" onClick={onSave}>
              Confirmar y enviar
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={handlePrint}
          >
            <Printer size={14} /> Imprimir
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={handleDownloadPDF}
          >
            <Download size={14} /> Descargar PDF
          </Button>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl ml-1">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Scrollable paper */}
      <div className="flex-1 overflow-y-auto bg-zinc-200 py-8 px-4">
        <div
          className="bg-white mx-auto shadow-2xl"
          style={{ width: '210mm', minHeight: '297mm', padding: '20mm 18mm', fontFamily: 'Helvetica, Arial, sans-serif', fontSize: 11 }}
        >

          {/* ── HEADER ────────────────────────────────────────── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
            {/* Logo */}
            <div style={{ width: '30%' }}>
              {perfil.logoUrl ? (
                <img src={perfil.logoUrl} alt="Logo" style={{ maxHeight: 130, maxWidth: 220, objectFit: 'contain' }} />
              ) : (
                <div style={{ width: 80, height: 80, backgroundColor: '#f1f5f9', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 10, textAlign: 'center' }}>
                  Logo
                </div>
              )}
            </div>

            {/* Title + meta */}
            <div style={{ textAlign: 'right' }}>
              <h1 style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-1px', margin: 0, color: '#0f172a' }}>Cotización</h1>
              <div style={{ marginTop: 8, fontSize: 11, color: '#64748b', lineHeight: 1.8 }}>
                <div>
                  <span style={{ color: '#94a3b8' }}>Número: </span>
                  <strong style={{ color: '#0f172a' }}>{presupuesto.numero ?? '—'}</strong>
                </div>
                <div>
                  <span style={{ color: '#94a3b8' }}>Fecha: </span>
                  <strong style={{ color: '#0f172a' }}>
                    {format(parseISO(presupuesto.createdAt), "d 'de' MMMM 'de' yyyy", { locale: es })}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* ── PARTIES ───────────────────────────────────────── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 32, gap: 32 }}>
            {/* De */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>De</div>
              <div style={{ fontSize: 14, fontWeight: 900, color: '#0f172a', marginBottom: 4 }}>{perfil.nombre}</div>
              {perfil.email    && <div style={{ fontSize: 11, color: '#475569' }}>{perfil.email}</div>}
              {perfil.telefono && <div style={{ fontSize: 11, color: '#475569' }}>{perfil.telefono}</div>}
              {perfil.cuit     && <div style={{ fontSize: 11, color: '#475569' }}>CUIT: {perfil.cuit}</div>}
              {perfil.direccion && <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{perfil.direccion}</div>}
            </div>

            {/* Cobrar a */}
            <div style={{ flex: 1, textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Cobrar a</div>
              <div style={{ fontSize: 14, fontWeight: 900, color: '#0f172a', marginBottom: 4 }}>{presupuesto.clientName}</div>
              {clientEmail && <div style={{ fontSize: 11, color: '#475569' }}>{clientEmail}</div>}
              {clientPhone && <div style={{ fontSize: 11, color: '#475569' }}>{clientPhone}</div>}
            </div>
          </div>

          {/* ── TABLE ─────────────────────────────────────────── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 32 }}>
            <thead>
              <tr style={{ backgroundColor: BLUE, color: 'white' }}>
                {['Descripción', 'Cant. IUS', 'Valor IUS', 'Fiscal %', 'Desc. %', 'Total $'].map((h, i) => (
                  <th key={h} style={{
                    padding: '8px 10px',
                    textAlign: i === 0 ? 'left' : 'right',
                    fontSize: 9,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {presupuesto.items.map((item, idx) => (
                <tr key={item.id} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                  <td style={{ padding: '9px 10px', fontSize: 11, color: '#0f172a', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ fontWeight: 600 }}>{item.concepto}</div>
                    <div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', marginTop: 2 }}>{item.tipo}</div>
                  </td>
                  <td style={{ padding: '9px 10px', textAlign: 'right', fontSize: 11, color: '#475569', borderBottom: '1px solid #f1f5f9' }}>
                    {item.cantidadIus != null ? item.cantidadIus : '—'}
                  </td>
                  <td style={{ padding: '9px 10px', textAlign: 'right', fontSize: 11, color: '#475569', borderBottom: '1px solid #f1f5f9' }}>
                    ${fmt(item.montoPesos)}
                  </td>
                  <td style={{ padding: '9px 10px', textAlign: 'right', fontSize: 11, color: '#475569', borderBottom: '1px solid #f1f5f9' }}>
                    {item.fiscalPorcentaje > 0 ? `${item.fiscalPorcentaje}%` : '—'}
                  </td>
                  <td style={{ padding: '9px 10px', textAlign: 'right', fontSize: 11, color: '#475569', borderBottom: '1px solid #f1f5f9' }}>
                    {item.descuentoItemPorcentaje > 0 ? `${item.descuentoItemPorcentaje}%` : '—'}
                  </td>
                  <td style={{ padding: '9px 10px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #f1f5f9' }}>
                    ${fmt(item.subtotalPesos)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── PAYMENT + TOTALS ──────────────────────────────── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 32, marginBottom: 32 }}>
            {/* Payment instructions */}
            <div style={{ flex: 1 }}>
              {(perfil.cbu || perfil.aliasCbu || perfil.banco) && (
                <>
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#0f172a', marginBottom: 10 }}>Instrucciones de pago</div>
                  {perfil.banco          && <div style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}><strong>Banco:</strong> {perfil.banco}</div>}
                  {perfil.titularCuenta  && <div style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}><strong>Titular:</strong> {perfil.titularCuenta}</div>}
                  {perfil.cbu            && <div style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}><strong>CBU:</strong> {perfil.cbu}</div>}
                  {perfil.aliasCbu       && <div style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}><strong>Alias:</strong> {perfil.aliasCbu}</div>}
                </>
              )}
            </div>

            {/* Totals */}
            <div style={{ width: 240 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '5px 8px', fontSize: 11, color: '#64748b' }}>Total parcial:</td>
                    <td style={{ padding: '5px 8px', fontSize: 11, fontWeight: 700, textAlign: 'right', color: '#0f172a' }}>${fmt(subtotalBruto)}</td>
                  </tr>
                  {presupuesto.descuentoPorcentaje > 0 && (
                    <tr>
                      <td style={{ padding: '5px 8px', fontSize: 11, color: '#64748b' }}>Descuento ({presupuesto.descuentoPorcentaje}%):</td>
                      <td style={{ padding: '5px 8px', fontSize: 11, fontWeight: 700, textAlign: 'right', color: '#dc2626' }}>- ${fmt(descuentoMonto)}</td>
                    </tr>
                  )}
                  <tr>
                    <td style={{ padding: '5px 8px', fontSize: 12, fontWeight: 900, color: '#0f172a' }}>Total:</td>
                    <td style={{ padding: '5px 8px', fontSize: 12, fontWeight: 900, textAlign: 'right', color: '#0f172a' }}>${fmt(totalFinal)}</td>
                  </tr>
                  <tr style={{ backgroundColor: BLUE }}>
                    <td style={{ padding: '8px 8px', fontSize: 12, fontWeight: 900, color: 'white', borderRadius: '0 0 0 6px' }}>Saldo adeudado:</td>
                    <td style={{ padding: '8px 8px', fontSize: 12, fontWeight: 900, textAlign: 'right', color: 'white', borderRadius: '0 0 6px 0' }}>${fmt(totalFinal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ── NOTAS ─────────────────────────────────────────── */}
          {presupuesto.notes && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: '#0f172a', marginBottom: 8 }}>Notas</div>
              <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{presupuesto.notes}</div>
            </div>
          )}

          {/* ── OPCIONES DE PAGO ──────────────────────────────── */}
          {presupuesto.cuotaOpciones && presupuesto.cuotaOpciones.some(o => o.enabled) && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: '#0f172a', marginBottom: 12 }}>Opciones de pago</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: BLUE, color: 'white' }}>
                    {['Modalidad', 'Recargo', 'Total', 'Por cuota'].map((h, i) => (
                      <th key={h} style={{ padding: '7px 10px', textAlign: i === 0 ? 'left' : 'right', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {presupuesto.cuotaOpciones.filter(o => o.enabled).map((op, idx) => {
                    const total = subtotalBruto * (1 - descuentoMonto / subtotalBruto || 1) * (1 + op.recargoPorcentaje / 100);
                    const totalReal = totalFinal * (1 + op.recargoPorcentaje / 100);
                    const porCuota = op.cuotas === 1 ? null : totalReal / op.cuotas;
                    return (
                      <tr key={op.cuotas} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                        <td style={{ padding: '8px 10px', fontSize: 11, fontWeight: 600, color: '#0f172a', borderBottom: '1px solid #f1f5f9' }}>
                          {op.cuotas === 1 ? 'Contado' : `${op.cuotas} cuotas`}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: 11, color: '#475569', borderBottom: '1px solid #f1f5f9' }}>
                          {op.cuotas === 1 ? '—' : `${op.recargoPorcentaje}%`}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #f1f5f9' }}>
                          ${fmt(totalReal)}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: 11, color: '#475569', borderBottom: '1px solid #f1f5f9' }}>
                          {porCuota ? `$${fmt(porCuota)}` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── FOOTER TEXT ───────────────────────────────────── */}
          {perfil.footerText && (
            <div style={{ marginBottom: 24, padding: '10px 0', borderTop: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 9, color: '#94a3b8', textAlign: 'center' }}>{perfil.footerText}</div>
            </div>
          )}

          {/* ── FIRMA ─────────────────────────────────────────── */}
          {perfil.firmaUrl && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <img src={perfil.firmaUrl} alt="Firma" style={{ maxHeight: 70, maxWidth: 180, objectFit: 'contain' }} />
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

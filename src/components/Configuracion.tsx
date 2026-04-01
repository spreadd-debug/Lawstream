import React, { useState, useEffect } from 'react';
import { Card, Button, Input, MoneyInput } from './UI';
import { User, Shield, Briefcase, FileText, Bell, CreditCard, ChevronRight, LogOut, Calculator, Check, ArrowLeft, Upload, Building2 } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { UsuariosConfig } from './UsuariosConfig';
import { fetchStudioConfig, upsertStudioConfig, fetchEstudioPerfil, upsertEstudioPerfil, uploadEstudioAsset } from '../lib/db';
import { EstudioPerfil } from '../types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface PerfilFieldProps {
  label: string;
  field: keyof EstudioPerfil;
  placeholder?: string;
  hint?: string;
  perfil: EstudioPerfil;
  onChange: (field: keyof EstudioPerfil, value: string) => void;
}

const PerfilField = ({ label, field, placeholder, hint, perfil, onChange }: PerfilFieldProps) => (
  <div className="space-y-1.5">
    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</label>
    <Input
      value={(perfil[field] as string) ?? ''}
      onChange={e => onChange(field, e.target.value)}
      placeholder={placeholder}
    />
    {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
  </div>
);

const EstudioPerfilConfig = ({ onBack }: { onBack: () => void }) => {
  const [perfil, setPerfil] = useState<EstudioPerfil>({ nombre: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [uploading, setUploading] = useState<'logo' | 'firma' | null>(null);

  useEffect(() => {
    fetchEstudioPerfil().then(setPerfil);
  }, []);

  const set = (field: keyof EstudioPerfil, value: string) =>
    setPerfil(prev => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsertEstudioPerfil(perfil);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'firma') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(type);
    try {
      const url = await uploadEstudioAsset(file, type);
      if (type === 'logo')  set('logoUrl',  url);
      if (type === 'firma') set('firmaUrl', url);
    } catch (err: any) {
      alert(`Error al subir la imagen:\n${err?.message ?? JSON.stringify(err)}`);
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto pb-20">
      <header className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-muted rounded-xl transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-black tracking-tighter">Datos del Estudio</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mt-0.5">
            Encabezado y datos de pago para presupuestos PDF
          </p>
        </div>
      </header>

      {/* Identidad */}
      <Card className="p-6 space-y-5">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground border-b border-border pb-2">Identidad</h3>
        <PerfilField label="Nombre del estudio *" field="nombre" placeholder="Ej: López & Asociados" perfil={perfil} onChange={set} />
        <div className="grid grid-cols-2 gap-4">
          <PerfilField label="CUIT" field="cuit" placeholder="20-12345678-9" perfil={perfil} onChange={set} />
          <PerfilField label="Teléfono" field="telefono" placeholder="+54 11 1234-5678" perfil={perfil} onChange={set} />
        </div>
        <PerfilField label="Email" field="email" placeholder="estudio@mail.com" perfil={perfil} onChange={set} />
        <PerfilField label="Dirección" field="direccion" placeholder="Av. Corrientes 1234, CABA" perfil={perfil} onChange={set} />
      </Card>

      {/* Logo */}
      <Card className="p-6 space-y-5">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground border-b border-border pb-2">Logo</h3>
        <div className="flex items-center gap-6">
          {perfil.logoUrl
            ? <img src={perfil.logoUrl} alt="Logo" className="h-20 w-auto object-contain border border-border rounded-xl p-2 bg-white" />
            : <div className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center text-muted-foreground/40"><Building2 size={28} /></div>
          }
          <div className="space-y-2">
            <label className="cursor-pointer flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-sm font-bold hover:bg-muted transition-colors">
              <Upload size={14} />
              {uploading === 'logo' ? 'Subiendo...' : 'Subir logo'}
              <input type="file" accept="image/*" className="hidden" onChange={e => handleUpload(e, 'logo')} disabled={uploading !== null} />
            </label>
            <p className="text-[10px] text-muted-foreground">PNG o JPG, máx. 2MB. Aparece en el encabezado del presupuesto.</p>
          </div>
        </div>
      </Card>

      {/* Datos de pago */}
      <Card className="p-6 space-y-5">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground border-b border-border pb-2">Datos bancarios / Instrucciones de pago</h3>
        <div className="grid grid-cols-2 gap-4">
          <PerfilField label="Banco" field="banco" placeholder="Banco Galicia" perfil={perfil} onChange={set} />
          <PerfilField label="Titular de la cuenta" field="titularCuenta" placeholder="Juan Pérez" perfil={perfil} onChange={set} />
        </div>
        <PerfilField label="CBU" field="cbu" placeholder="0000000000000000000000" perfil={perfil} onChange={set} />
        <PerfilField label="Alias CBU" field="aliasCbu" placeholder="ESTUDIO.LOPEZ" perfil={perfil} onChange={set} />
      </Card>

      {/* Firma y pie de página */}
      <Card className="p-6 space-y-5">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground border-b border-border pb-2">Firma digital y pie de página</h3>
        <div className="flex items-center gap-6">
          {perfil.firmaUrl
            ? <img src={perfil.firmaUrl} alt="Firma" className="h-16 w-auto object-contain border border-border rounded-xl p-2 bg-white" />
            : <div className="w-32 h-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center text-muted-foreground/40 text-xs">Sin firma</div>
          }
          <div className="space-y-2">
            <label className="cursor-pointer flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-sm font-bold hover:bg-muted transition-colors">
              <Upload size={14} />
              {uploading === 'firma' ? 'Subiendo...' : 'Subir firma'}
              <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={e => handleUpload(e, 'firma')} disabled={uploading !== null} />
            </label>
            <p className="text-[10px] text-muted-foreground">PNG con fondo transparente recomendado.</p>
          </div>
        </div>
        <PerfilField
          label="Texto de pie de página"
          field="footerText"
          placeholder="Ej: Este presupuesto tiene validez por 30 días."
          perfil={perfil}
          onChange={set}
        />
      </Card>

      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
      >
        {saved ? <Check size={16} /> : null}
        {saving ? 'Guardando...' : saved ? 'Guardado ✓' : 'Guardar cambios'}
      </Button>
    </div>
  );
};

const IUSConfig = ({ onBack }: { onBack: () => void }) => {
  const [currentValue, setCurrentValue] = useState<number>(0);
  const [inputValue, setInputValue] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchStudioConfig('ius_valor').then(cfg => {
      if (cfg) {
        const val = (cfg.value as any).pesos ?? 0;
        setCurrentValue(val);
        setInputValue(val.toString());
        setLastUpdated(cfg.updatedAt);
      }
    });
  }, []);

  const handleSave = async () => {
    const newVal = parseFloat(inputValue);
    if (isNaN(newVal) || newVal <= 0) return;
    setSaving(true);
    try {
      await upsertStudioConfig('ius_valor', { pesos: newVal }, 'usuario');
      setCurrentValue(newVal);
      setLastUpdated(new Date().toISOString());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto pb-20">
      <header className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-muted rounded-xl transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-black tracking-tighter">Valor del JUS</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mt-0.5">
            Ley 14.967 — Unidad de honorarios profesionales
          </p>
        </div>
      </header>

      <Card className="p-6 space-y-6">
        <div className="flex items-center gap-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <Calculator size={24} className="text-amber-600 shrink-0" />
          <div>
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Valor vigente del JUS</p>
            <p className="text-3xl font-black text-amber-800">
              ${currentValue.toLocaleString('es-AR')}
              <span className="text-sm font-bold ml-2">por JUS</span>
            </p>
            {lastUpdated && (
              <p className="text-xs text-amber-600 mt-1">
                Actualizado: {format(parseISO(lastUpdated), "d 'de' MMMM yyyy", { locale: es })}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Nuevo valor (en pesos)
          </label>
          <div className="flex gap-3">
            <MoneyInput
              value={inputValue}
              onChange={v => setInputValue(v)}
              placeholder="3500"
              className="flex-1"
            />
            <Button onClick={handleSave} disabled={saving} className="gap-2 shrink-0">
              {saved ? <Check size={16} /> : null}
              {saving ? 'Guardando...' : saved ? 'Guardado' : 'Actualizar'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Este valor se usa en todos los presupuestos nuevos. Los presupuestos ya creados conservan el valor histórico al momento de su creación.
          </p>
        </div>
      </Card>
    </div>
  );
};

const ConsultaValorConfig = ({ onBack }: { onBack: () => void }) => {
  const [currentValue, setCurrentValue] = useState<number>(0);
  const [inputValue, setInputValue]     = useState('');
  const [lastUpdated, setLastUpdated]   = useState<string | null>(null);
  const [saving, setSaving]             = useState(false);
  const [saved, setSaved]               = useState(false);

  useEffect(() => {
    fetchStudioConfig('consulta_valor').then(cfg => {
      if (cfg) {
        const val = (cfg.value as any).pesos ?? 0;
        setCurrentValue(val);
        setInputValue(val.toString());
        setLastUpdated(cfg.updatedAt);
      }
    });
  }, []);

  const handleSave = async () => {
    const newVal = parseFloat(inputValue);
    if (isNaN(newVal) || newVal <= 0) return;
    setSaving(true);
    try {
      await upsertStudioConfig('consulta_valor', { pesos: newVal }, 'usuario');
      setCurrentValue(newVal);
      setLastUpdated(new Date().toISOString());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto pb-20">
      <header className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-muted rounded-xl transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-black tracking-tighter">Valor de Consulta</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mt-0.5">
            Precio de la entrevista inicial
          </p>
        </div>
      </header>

      <Card className="p-6 space-y-6">
        <div className="flex items-center gap-4 p-4 bg-teal-50 border border-teal-200 rounded-xl">
          <Calculator size={24} className="text-teal-600 shrink-0" />
          <div>
            <p className="text-xs font-bold text-teal-700 uppercase tracking-wide">Valor vigente de consulta</p>
            <p className="text-3xl font-black text-teal-800">
              {currentValue > 0
                ? `$${currentValue.toLocaleString('es-AR')}`
                : <span className="text-lg text-muted-foreground">Sin configurar</span>
              }
            </p>
            {lastUpdated && (
              <p className="text-xs text-teal-600 mt-1">
                Actualizado: {format(parseISO(lastUpdated), "d 'de' MMMM yyyy", { locale: es })}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Nuevo valor (en pesos)
          </label>
          <div className="flex gap-3">
            <MoneyInput
              value={inputValue}
              onChange={v => setInputValue(v)}
              placeholder="15000"
              className="flex-1"
            />
            <Button onClick={handleSave} disabled={saving} className="gap-2 shrink-0">
              {saved ? <Check size={16} /> : null}
              {saving ? 'Guardando...' : saved ? 'Guardado' : 'Actualizar'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Cada vez que se marca una consulta como cobrada, se guarda el valor vigente en ese momento.
            Así las métricas históricas siempre reflejan el precio real al que se cobró cada entrevista.
          </p>
        </div>
      </Card>

      <Card className="p-6 space-y-3">
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">¿Cómo funciona?</p>
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex gap-3">
            <span className="text-primary font-black shrink-0">1.</span>
            <span>Configurás el valor actual de la consulta aquí.</span>
          </div>
          <div className="flex gap-3">
            <span className="text-primary font-black shrink-0">2.</span>
            <span>Al marcar una consulta como cobrada, el sistema guarda automáticamente el precio de ese momento.</span>
          </div>
          <div className="flex gap-3">
            <span className="text-primary font-black shrink-0">3.</span>
            <span>Si en el futuro actualizás el precio, las consultas ya cobradas siguen mostrando el valor histórico correcto.</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export const Configuracion = () => {
  const { signOut } = useAuth();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const sections = [
    { id: 'estudio',        label: 'Datos del Estudio',    icon: Briefcase,  desc: 'Nombre, CUIT, dirección y contacto.' },
    { id: 'usuarios',       label: 'Usuarios y Roles',     icon: Shield,     desc: 'Gestionar quién accede y qué puede hacer.' },
    { id: 'ius',            label: 'Valor del JUS',        icon: Calculator, desc: 'Actualizar el valor vigente del JUS para presupuestos (Ley 14.967).' },
    { id: 'consulta',       label: 'Valor de Consulta',    icon: Calculator, desc: 'Precio de la entrevista inicial. Se guarda históricamente en cada consulta cobrada.' },
    { id: 'asuntos',        label: 'Tipos de Asunto',      icon: FileText,   desc: 'Configurar tipos, estados y checklists.' },
    { id: 'notificaciones', label: 'Notificaciones',       icon: Bell,       desc: 'Alertas de vencimientos y actividad.' },
    { id: 'perfil',         label: 'Mi Perfil',            icon: User,       desc: 'Cambiar contraseña y preferencias personales.' },
    { id: 'plan',           label: 'Plan y Facturación',   icon: CreditCard, desc: 'Gestionar suscripción y facturas.' },
  ];

  if (activeSection === 'usuarios') return <UsuariosConfig onBack={() => setActiveSection(null)} />;
  if (activeSection === 'ius')      return <IUSConfig onBack={() => setActiveSection(null)} />;
  if (activeSection === 'consulta') return <ConsultaValorConfig onBack={() => setActiveSection(null)} />;
  if (activeSection === 'estudio')  return <EstudioPerfilConfig onBack={() => setActiveSection(null)} />;

  return (
    <div className="space-y-10 max-w-3xl mx-auto pb-20">
      <header>
        <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-foreground leading-none">Configuración</h1>
        <p className="text-muted-foreground mt-3 text-sm font-black uppercase tracking-widest opacity-60">Personaliza el funcionamiento de Lawstream para tu estudio.</p>
      </header>

      <div className="space-y-4">
        {sections.map(section => (
          <Card
            key={section.id}
            className="p-6 flex items-center gap-6 hover:translate-x-2 transition-all group bg-card border-border shadow-lg hover:shadow-xl cursor-pointer"
            onClick={() => setActiveSection(section.id)}
          >
            <div className="p-4 bg-muted rounded-2xl text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-inner">
              <section.icon size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-foreground tracking-tight">{section.label}</h3>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1.5 opacity-60">{section.desc}</p>
            </div>
            <ChevronRight size={20} className="text-muted-foreground group-hover:text-foreground transition-colors" />
          </Card>
        ))}
      </div>

      <div className="pt-12 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="text-center sm:text-left">
          <p className="text-xs font-black text-muted-foreground uppercase tracking-widest opacity-40">Lawstream v2.0.4 - Licencia Profesional</p>
        </div>
        <Button
          variant="danger"
          size="sm"
          onClick={signOut}
          className="w-full sm:w-auto gap-2 text-[10px] font-black uppercase tracking-widest px-8 rounded-xl shadow-lg shadow-destructive/10"
        >
          <LogOut size={18} />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Card, Button } from './UI';
import { User, Shield, Briefcase, FileText, Bell, CreditCard, ChevronRight, LogOut } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { UsuariosConfig } from './UsuariosConfig';

export const Configuracion = () => {
  const { signOut } = useAuth();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const sections = [
    { id: 'estudio', label: 'Datos del Estudio', icon: Briefcase, desc: 'Nombre, CUIT, dirección y contacto.' },
    { id: 'usuarios', label: 'Usuarios y Roles', icon: Shield, desc: 'Gestionar quién accede y qué puede hacer.' },
    { id: 'asuntos', label: 'Tipos de Asunto', icon: FileText, desc: 'Configurar tipos, estados y checklists.' },
    { id: 'notificaciones', label: 'Notificaciones', icon: Bell, desc: 'Alertas de vencimientos y actividad.' },
    { id: 'perfil', label: 'Mi Perfil', icon: User, desc: 'Cambiar contraseña y preferencias personales.' },
    { id: 'plan', label: 'Plan y Facturación', icon: CreditCard, desc: 'Gestionar suscripción y facturas.' },
  ];

  if (activeSection === 'usuarios') {
    return <UsuariosConfig onBack={() => setActiveSection(null)} />;
  }

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

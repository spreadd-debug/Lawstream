/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Layout } from './components/Layout';
import { Hoy } from './components/Hoy';
import { Consultas } from './components/Consultas';
import { Asuntos } from './components/Asuntos';
import { MatterDetail } from './components/MatterDetail';
import { Vencimientos } from './components/Vencimientos';
import { Clientes } from './components/Clientes';
import { DocumentosGlobal } from './components/DocumentosGlobal';
import { Plantillas } from './components/Plantillas';
import { Configuracion } from './components/Configuracion';
import { CrearAsunto } from './components/CrearAsunto';
import { NuevaAccion } from './components/NuevaAccion';
import { Drawer } from './components/UI';
import { EditMatterForm } from './components/EditMatterForm';
import { FiltersContent, GlobalFilters, defaultFilters, isFiltersActive } from './components/FiltersContent';
import { Matter, Client, Consultation, LegalDocument, Task, TimelineEvent } from './types';
import * as db from './lib/db';

export default function App() {
  const [activeTab, setActiveTab] = useState('hoy');
  const [selectedMatterId, setSelectedMatterId] = useState<string | null>(null);
  const [prefilledMatter, setPrefilledMatter] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [matters, setMatters] = useState<Matter[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  
  // Drawer & Modal States
  const [isNewActionOpen, setIsNewActionOpen] = useState(false);
  const [isEditMatterOpen, setIsEditMatterOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<GlobalFilters>(defaultFilters);
  
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved as 'light' | 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  // Carga inicial desde Supabase
  useEffect(() => {
    Promise.all([
      db.fetchMatters(),
      db.fetchClients(),
      db.fetchConsultations(),
      db.fetchDocuments(),
      db.fetchTasks(),
      db.fetchTimeline(),
    ])
      .then(([m, c, co, d, t, tl]) => {
        setMatters(m);
        setClients(c);
        setConsultations(co);
        setDocuments(d);
        setTasks(t);
        setTimeline(tl);
      })
      .catch(err => console.error('Error cargando datos:', err))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleSelectMatter = (id: string) => {
    setSelectedMatterId(id);
    setActiveTab('detalle_asunto');
  };

  const handleBackToAsuntos = () => {
    setSelectedMatterId(null);
    setActiveTab('asuntos');
  };

  const handleCreateMatter = () => {
    setActiveTab('crear_asunto');
  };

  const handleNewAction = (matterId?: string) => {
    if (matterId) setSelectedMatterId(matterId);
    setIsNewActionOpen(true);
  };

  const handleEditMatter = (matterId: string) => {
    setSelectedMatterId(matterId);
    setIsEditMatterOpen(true);
  };

  const handleSaveAction = async (data: any) => {
    const targetId = data.matterId || selectedMatterId;
    if (!targetId) return;

    const matterChanges = {
      nextAction:     data.replacesNextAction ? data.title : undefined,
      nextActionType: data.replacesNextAction ? data.type  : undefined,
      nextActionDate: data.date,
      health:         data.healthImpact as any,
      priority:       data.priority as any,
      blockage:       data.isBlocking ? 'Bloqueado por nueva acción' : undefined,
      lastActivity:   new Date().toISOString(),
    };

    // Actualizar estado local
    setMatters(prev => prev.map(m =>
      m.id === targetId ? { ...m, ...matterChanges } : m
    ));

    const newEvent: Omit<TimelineEvent, 'id'> = {
      matterId:    targetId,
      type:        'task_created',
      title:       data.title,
      description: data.notes,
      user:        data.responsible,
      date:        new Date().toISOString(),
    };
    setTimeline(prev => [{ ...newEvent, id: crypto.randomUUID() }, ...prev]);

    setIsNewActionOpen(false);

    // Persistir en Supabase
    try {
      await db.updateMatter(targetId, matterChanges);
      await db.createTimelineEvent(newEvent);
    } catch (err) {
      console.error('Error guardando acción:', err);
    }
  };

  const handleCreateClient = async (data: any) => {
    const optimistic: Client = {
      ...data,
      id: crypto.randomUUID(),
      activeMatters: 0,
      closedMatters: 0,
      lastActivity: new Date().toISOString(),
    };
    setClients(prev => [optimistic, ...prev]);
    try {
      const saved = await db.createClient_({ ...data, lastActivity: optimistic.lastActivity });
      setClients(prev => prev.map(c => c.id === optimistic.id ? saved : c));
    } catch (err) {
      console.error('Error creando cliente:', err);
    }
  };

  const handleUpdateClient = async (id: string, data: any) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    try {
      await db.updateClient_(id, data);
    } catch (err) {
      console.error('Error actualizando cliente:', err);
    }
  };

  const handleUpdateDocument = async (id: string, changes: any) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, ...changes } : d));
    try {
      await db.updateDocument(id, changes);
    } catch (err) {
      console.error('Error actualizando documento:', err);
    }
  };

  const handleAddDocument = async (doc: any) => {
    const optimistic = { ...doc, id: crypto.randomUUID() };
    setDocuments(prev => [optimistic, ...prev]);
    try {
      const saved = await db.createDocument(doc);
      setDocuments(prev => prev.map(d => d.id === optimistic.id ? saved : d));
    } catch (err) {
      console.error('Error creando documento:', err);
    }
  };

  const handleCloseMatter = async (matterId: string) => {
    setMatters(prev => prev.map(m =>
      m.id === matterId ? { ...m, status: 'Cerrado' as any } : m
    ));
    try {
      await db.updateMatter(matterId, { status: 'Cerrado' });
    } catch (err) {
      console.error('Error cerrando asunto:', err);
    }
  };

  const handleSaveMatterEdit = async (data: any) => {
    if (!selectedMatterId) return;
    const changes = {
      title:          data.title,
      responsible:    data.responsible,
      priority:       data.priority,
      health:         data.health,
      nextActionDate: data.nextActionDate,
      description:    data.description,
      lastActivity:   new Date().toISOString(),
    };
    setMatters(prev => prev.map(m =>
      m.id === selectedMatterId ? { ...m, ...changes } : m
    ));
    setIsEditMatterOpen(false);
    try {
      await db.updateMatter(selectedMatterId, changes);
    } catch (err) {
      console.error('Error editando asunto:', err);
    }
  };

  const renderContent = () => {
    if (activeTab === 'detalle_asunto' && selectedMatterId) {
      const matter = matters.find(m => m.id === selectedMatterId);
      if (matter) {
        return (
          <MatterDetail 
            matter={matter} 
            timeline={timeline.filter(e => e.matterId === selectedMatterId)}
            tasks={tasks.filter(t => t.matterId === selectedMatterId)}
            documents={documents.filter(d => d.matterId === selectedMatterId)}
            onBack={handleBackToAsuntos}
            onNewAction={() => handleNewAction(selectedMatterId)}
            onEditMatter={() => handleEditMatter(selectedMatterId)}
          />
        );
      }
    }

    if (activeTab === 'crear_asunto') {
      return (
        <CrearAsunto 
          prefilledData={prefilledMatter}
          onBack={() => {
            setActiveTab('asuntos');
            setPrefilledMatter(null);
          }} 
          onSave={async (data) => {
            const newMatter: Omit<Matter, 'id'> = {
              title:          data.title,
              client:         data.client,
              type:           data.type,
              subtype:        data.subtype || undefined,
              description:    data.description || undefined,
              expediente:     data.expediente || undefined,
              responsible:    data.responsible,
              priority:       data.priority,
              status:         'Activo',
              health:         'Sano',
              nextAction:     data.nextAction,
              nextActionDate: data.nextActionDate,
              lastActivity:   new Date().toISOString(),
            };
            const optimistic: Matter = { ...newMatter, id: crypto.randomUUID() };
            setMatters(prev => [optimistic, ...prev]);
            setActiveTab('asuntos');
            setPrefilledMatter(null);
            try {
              const saved = await db.createMatter(newMatter);
              setMatters(prev => prev.map(m => m.id === optimistic.id ? saved : m));
            } catch (err) {
              console.error('Error creando asunto:', err);
            }
          }}
        />
      );
    }

    switch (activeTab) {
      case 'hoy':
        return (
          <Hoy
            matters={matters}
            documents={documents}
            onSelectMatter={handleSelectMatter}
            onNewAction={() => handleNewAction()}
            onEditMatter={handleEditMatter}
            onCloseMatter={handleCloseMatter}
            onOpenFilters={() => setIsFiltersOpen(true)}
            activeFilters={activeFilters}
          />
        );
      case 'consultas':
        return (
          <Consultas
            consultations={consultations}
            onConvertToMatter={(data) => {
              setPrefilledMatter(data);
              setActiveTab('crear_asunto');
            }}
          />
        );
      case 'asuntos':
        return (
          <Asuntos
            matters={matters}
            onSelectMatter={handleSelectMatter}
            onCreateMatter={() => setActiveTab('crear_asunto')}
          />
        );
      case 'vencimientos':
        return <Vencimientos matters={matters} onSelectMatter={handleSelectMatter} />;
      case 'clientes':
        return (
          <Clientes
            clients={clients}
            matters={matters}
            onCreateClient={handleCreateClient}
            onUpdateClient={handleUpdateClient}
            onSelectMatter={handleSelectMatter}
          />
        );
      case 'documentos':
        return (
          <DocumentosGlobal
            documents={documents}
            matters={matters}
            onUpdateDocument={handleUpdateDocument}
            onAddDocument={handleAddDocument}
          />
        );
      case 'plantillas':
        return <Plantillas />;
      case 'configuracion':
        return <Configuracion />;
      default:
        return (
          <Hoy
            matters={matters}
            documents={documents}
            onSelectMatter={handleSelectMatter}
            onNewAction={() => handleNewAction()}
            onEditMatter={handleEditMatter}
            onCloseMatter={handleCloseMatter}
            onOpenFilters={() => setIsFiltersOpen(true)}
            activeFilters={activeFilters}
          />
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      theme={theme}
      toggleTheme={toggleTheme}
      onNewMatter={() => setActiveTab('crear_asunto')}
    >
      {renderContent()}

      {/* Global Drawers */}
      <Drawer 
        isOpen={isNewActionOpen} 
        onClose={() => setIsNewActionOpen(false)} 
        title="Nueva Acción"
        size="xl"
      >
        <NuevaAccion 
          matterId={selectedMatterId || undefined} 
          matterTitle={matters.find(m => m.id === selectedMatterId)?.title}
          matters={matters}
          onBack={() => setIsNewActionOpen(false)} 
          onSave={handleSaveAction} 
        />
      </Drawer>

      <Drawer
        isOpen={isEditMatterOpen}
        onClose={() => setIsEditMatterOpen(false)}
        title="Editar Asunto"
        size="lg"
      >
        <EditMatterForm 
          matter={matters.find(m => m.id === selectedMatterId)}
          onSave={handleSaveMatterEdit}
          onCancel={() => setIsEditMatterOpen(false)}
        />
      </Drawer>

      <Drawer
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        title="Filtros Avanzados"
        size="sm"
      >
        <FiltersContent
          initialFilters={activeFilters}
          onApply={(filters) => { setActiveFilters(filters); setIsFiltersOpen(false); }}
          onClose={() => { setActiveFilters(defaultFilters); setIsFiltersOpen(false); }}
        />
      </Drawer>
    </Layout>
  );
}


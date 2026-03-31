import React, { useState } from 'react';
import { Card, Button, Input, Drawer } from './UI';
import { Client, Matter } from '../types';
import { Search, Plus, Mail, Phone, Clock, ExternalLink, User, Building2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { ClientDrawer } from './ClientDrawer';
import { ClientForm } from './ClientForm';

interface ClientesProps {
  clients: Client[];
  matters: Matter[];
  onCreateClient: (data: any) => void;
  onUpdateClient: (id: string, data: any) => void;
  onSelectMatter: (id: string) => void;
}

export const Clientes = ({ clients, matters, onCreateClient, onUpdateClient, onSelectMatter }: ClientesProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getClientCounts = (client: Client) => {
    const clientMatters = matters.filter(m => m.client === client.name);
    return {
      active: clientMatters.filter(m => m.status === 'Activo' || m.status === 'Pausado').length,
      closed: clientMatters.filter(m => m.status === 'Cerrado').length,
    };
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-foreground">Fichas de Clientes</h1>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">
            Base de contactos y relación con el estudio
          </p>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
          onClick={() => setIsNewClientOpen(true)}
        >
          <Plus size={16} />
          <span>Nuevo Cliente</span>
        </Button>
      </header>

      <Card className="p-4 border border-border bg-card/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            placeholder="Buscar por nombre o email..."
            className="pl-10 bg-background/50 border-border/50"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.length > 0 ? (
          filteredClients.map(client => {
            const counts = getClientCounts(client);
            return (
              <ClientCard
                key={client.id}
                client={client}
                activeMatters={counts.active}
                closedMatters={counts.closed}
                onViewFicha={() => setSelectedClient(client)}
              />
            );
          })
        ) : (
          <div className="col-span-full py-24 text-center border-2 border-dashed border-border/50 rounded-[2.5rem] bg-muted/5">
            <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-6">
              <User size={40} className="text-muted-foreground/30" />
            </div>
            <h3 className="text-lg font-black text-foreground uppercase tracking-tight">No se encontró el cliente</h3>
            <p className="text-sm font-medium text-muted-foreground max-w-xs mx-auto mt-2">
              No hay registros que coincidan. ¿Querés darlo de alta ahora?
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
              <Button variant="outline" size="sm" onClick={() => setSearchTerm('')}>
                Limpiar Búsqueda
              </Button>
              <Button
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                size="sm"
                onClick={() => setIsNewClientOpen(true)}
              >
                <Plus size={14} />
                Nuevo Cliente
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Ficha Drawer */}
      <Drawer
        isOpen={!!selectedClient}
        onClose={() => setSelectedClient(null)}
        title="Ficha del Cliente"
        size="lg"
      >
        {selectedClient && (
          <ClientDrawer
            client={selectedClient}
            matters={matters}
            onSave={(id, data) => {
              onUpdateClient(id, data);
              setSelectedClient(prev => prev ? { ...prev, ...data } : null);
            }}
            onClose={() => setSelectedClient(null)}
            onSelectMatter={onSelectMatter}
          />
        )}
      </Drawer>

      {/* New Client Drawer */}
      <Drawer
        isOpen={isNewClientOpen}
        onClose={() => setIsNewClientOpen(false)}
        title="Nuevo Cliente"
        size="md"
        preventBackdropClose
      >
        <ClientForm
          onSave={data => { onCreateClient(data); setIsNewClientOpen(false); }}
          onCancel={() => setIsNewClientOpen(false)}
        />
      </Drawer>
    </div>
  );
};

interface ClientCardProps {
  client: Client;
  activeMatters: number;
  closedMatters: number;
  onViewFicha: () => void;
}

const ClientCard: React.FC<ClientCardProps> = ({ client, activeMatters, closedMatters, onViewFicha }) => {
  return (
    <Card className="p-5 border border-border hover:border-primary/50 transition-all group flex flex-col gap-5 relative overflow-hidden">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
            {client.type === 'Persona' ? <User size={20} /> : <Building2 size={20} />}
          </div>
          <div>
            <h3 className="font-bold text-foreground group-hover:text-primary transition-colors text-base tracking-tight leading-tight">
              {client.name}
            </h3>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{client.type}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Mail size={14} className="opacity-70 shrink-0" />
          <span className="truncate">{client.email || '—'}</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Phone size={14} className="opacity-70 shrink-0" />
          <span>{client.phone || '—'}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border/50">
        <div className="bg-muted/50 rounded-xl p-2.5 border border-border/50 text-center">
          <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Asuntos Activos</div>
          <div className="text-sm font-black text-foreground">{activeMatters}</div>
        </div>
        <div className="bg-muted/50 rounded-xl p-2.5 border border-border/50 text-center">
          <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Cerrados</div>
          <div className="text-sm font-black text-foreground">{closedMatters}</div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          <Clock size={12} />
          Activo {format(parseISO(client.lastActivity), 'd MMM', { locale: es })}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-[10px] font-black uppercase tracking-widest gap-1.5 hover:text-primary"
          onClick={onViewFicha}
        >
          Ver Ficha <ExternalLink size={12} />
        </Button>
      </div>
    </Card>
  );
};

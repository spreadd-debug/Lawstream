/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import { AppProvider } from './lib/AppContext';
import { PrivateRoute } from './components/PrivateRoute';
import { AppLayout } from './components/AppLayout';

import { LoginPage }        from './pages/LoginPage';
import { HoyPage }          from './pages/HoyPage';
import { ConsultasPage }    from './pages/ConsultasPage';
import { AsuntosPage }      from './pages/AsuntosPage';
import { AsuntoDetallePage } from './pages/AsuntoDetallePage';
import { CrearAsuntoPage }  from './pages/CrearAsuntoPage';
import { VencimientosPage } from './pages/VencimientosPage';
import { EquipoPage }       from './pages/EquipoPage';
import { ClientesPage }     from './pages/ClientesPage';
import { DocumentosPage }   from './pages/DocumentosPage';
import { PlantillasPage }   from './pages/PlantillasPage';
import { ConfiguracionPage } from './pages/ConfiguracionPage';

export default function App() {
  return (
    <AppProvider>
      <Routes>
        {/* Ruta pública */}
        <Route path="/login" element={<LoginPage />} />

        {/* Rutas privadas — requieren sesión */}
        <Route element={<PrivateRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/hoy" replace />} />
            <Route path="/hoy"             element={<HoyPage />} />
            <Route path="/consultas"       element={<ConsultasPage />} />
            <Route path="/asuntos"         element={<AsuntosPage />} />
            <Route path="/asuntos/nuevo"   element={<CrearAsuntoPage />} />
            <Route path="/asuntos/:id"     element={<AsuntoDetallePage />} />
            <Route path="/vencimientos"    element={<VencimientosPage />} />
            <Route path="/equipo"          element={<EquipoPage />} />
            <Route path="/clientes"        element={<ClientesPage />} />
            <Route path="/documentos"      element={<DocumentosPage />} />
            <Route path="/plantillas"      element={<PlantillasPage />} />
            <Route path="/configuracion"   element={<ConfiguracionPage />} />
            {/* Catch-all → hoy */}
            <Route path="*" element={<Navigate to="/hoy" replace />} />
          </Route>
        </Route>
      </Routes>
    </AppProvider>
  );
}

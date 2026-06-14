import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'mis-tickets',
    loadComponent: () =>
      import('./pages/mis-tickets/mis-tickets.component').then(m => m.MisTicketsComponent)
  },
  {
    path: 'nuevo-ticket',
    loadComponent: () =>
      import('./pages/nuevo-ticket/nuevo-ticket.component').then(m => m.NuevoTicketComponent)
  },
  {
    path: 'detalle-ticket',
    loadComponent: () =>
      import('./pages/detalle-ticket/detalle-ticket.component').then(m => m.DetalleTicketComponent)
  },
  {
    path: 'panel-tecnico',
    loadComponent: () =>
      import('./pages/panel-tecnico/panel-tecnico.component').then(m => m.PanelTecnicoComponent)
  },
  {
    path: 'panel-admin',
    loadComponent: () =>
      import('./pages/panel-admin/panel-admin.component').then(m => m.PanelAdminComponent)
  },
  { path: '**', redirectTo: 'login' }
];

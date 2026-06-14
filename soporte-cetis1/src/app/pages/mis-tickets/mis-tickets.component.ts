import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TicketService, Ticket } from '../../services/ticket.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-mis-tickets',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">

      <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
        <div>
          <div class="page-title">Mis Tickets</div>
          <div class="page-sub">{{ auth.usuario?.nombre }} · {{ auth.usuario?.area }}</div>
        </div>
        <button class="btn btn-primary" (click)="router.navigate(['/nuevo-ticket'])">
          + Registrar nuevo ticket
        </button>
      </div>

      <!-- FILTROS -->
      <div class="filter-bar">
        <select [(ngModel)]="filtroEstado" (change)="cargar()">
          <option value="">Todos los estados</option>
          <option>Abierto</option>
          <option>En atención</option>
          <option>Pendiente de usuario</option>
          <option>Resuelto</option>
          <option>Cerrado</option>
        </select>
        <input type="text" class="search-input" placeholder="🔍 Buscar por ID o descripción..."
          [(ngModel)]="busqueda">
      </div>

      <!-- CARGANDO -->
      <div *ngIf="cargando" style="text-align:center;padding:40px;color:var(--gray);">
        Cargando tickets...
      </div>

      <!-- SIN TICKETS -->
      <div *ngIf="!cargando && ticketsFiltrados.length === 0"
        style="text-align:center;padding:40px;color:var(--gray);">
        No tienes tickets registrados aún.
      </div>

      <!-- LISTA -->
      <div *ngFor="let t of ticketsFiltrados">
        <div class="ticket-card" [ngClass]="'pri-border-' + t.prioridad.toLowerCase()"
          (click)="verDetalle(t.id)">
          <div class="tc-icon">{{ iconoCategoria(t.categoria) }}</div>
          <div class="tc-body">
            <div class="tc-top">
              <span class="tc-id">{{ t.ticket_id }}</span>
              <span class="tc-title">{{ t.categoria }} – {{ t.area }}</span>
              <span class="badge" [ngClass]="badgeEstado(t.estado)">{{ t.estado }}</span>
              <span class="pri" [ngClass]="'pri-' + t.prioridad.toLowerCase()">
                {{ t.prioridad.toUpperCase() }}
              </span>
            </div>
            <div class="tc-meta">
              <span class="tc-area">{{ t.area }}</span>
              <span class="tc-date">{{ t.creado_en | date:'dd/MM/yyyy HH:mm' }}</span>
            </div>
            <div class="tc-desc">{{ t.descripcion }}</div>
          </div>
          <div class="tc-actions">
            <button class="btn btn-outline btn-sm"
              (click)="$event.stopPropagation(); verDetalle(t.id)">
              Ver detalle
            </button>
          </div>
        </div>
      </div>

    </div>
  `
})
export class MisTicketsComponent implements OnInit {
  tickets: Ticket[]       = [];
  filtroEstado            = '';
  busqueda                = '';
  cargando                = true;

  constructor(
    public router:  Router,
    public auth:    AuthService,
    private ticketSvc: TicketService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.cargando = true;
    const filtros: Record<string,string> = {
      solicitante_id: String(this.auth.usuario!.id),
    };
    if (this.filtroEstado) filtros['estado'] = this.filtroEstado;

    this.ticketSvc.getTickets(filtros).subscribe({
      next: (data) => { this.tickets = data; this.cargando = false; this.cdr.detectChanges(); },
      error: ()     => { this.cargando = false; this.cdr.detectChanges(); }
    });
  }

  get ticketsFiltrados(): Ticket[] {
    const q = this.busqueda.toLowerCase();
    return this.tickets.filter(t =>
      !q || t.ticket_id.toLowerCase().includes(q) || t.descripcion.toLowerCase().includes(q)
    );
  }

  verDetalle(id: number): void {
    this.router.navigate(['/detalle-ticket'], { queryParams: { id } });
  }

  iconoCategoria(cat: string): string {
    const map: Record<string,string> = {
      'Hardware': '💻', 'Red / Conectividad': '🌐',
      'Software / S.O.': '💿', 'Plataforma Educativa': '📚',
      'Proyector / Periféricos': '📽️',
    };
    return map[cat] ?? '🔧';
  }

  badgeEstado(estado: string): string {
    const map: Record<string,string> = {
      'Abierto': 'badge-abierto', 'En atención': 'badge-atencion',
      'Pendiente de usuario': 'badge-pendiente', 'Resuelto': 'badge-resuelto',
      'Cerrado': 'badge-cerrado', 'Cancelado': 'badge-cancelado',
    };
    return map[estado] ?? 'badge-abierto';
  }
}

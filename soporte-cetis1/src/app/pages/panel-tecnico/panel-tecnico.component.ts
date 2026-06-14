import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TicketService, Ticket } from '../../services/ticket.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-panel-tecnico',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">

      <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
        <div>
          <div class="page-title">Panel del Técnico</div>
          <div class="page-sub">{{ auth.usuario?.nombre }} · Tickets asignados</div>
        </div>
        <div style="display:flex;gap:8px;">
          <span class="badge badge-atencion" style="padding:6px 14px;">
            {{ activos }} activos
          </span>
        </div>
      </div>

      <div class="filter-bar">
        <select [(ngModel)]="filtroEstado" (change)="cargar()">
          <option value="">Todos</option>
          <option>En atención</option>
          <option>Pendiente de usuario</option>
        </select>
        <input type="text" class="search-input" placeholder="🔍 Buscar..."
          [(ngModel)]="busqueda">
      </div>

      <div *ngIf="cargando" style="text-align:center;padding:40px;color:var(--gray);">
        Cargando tickets...
      </div>

      <div *ngFor="let t of ticketsFiltrados">
        <div class="ticket-card" [ngClass]="'pri-border-' + t.prioridad.toLowerCase()">
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
              <span class="tc-date">{{ t.solicitante_nombre }} · {{ t.creado_en | date:'dd/MM HH:mm' }}</span>
            </div>
            <div class="tc-desc">{{ t.descripcion }}</div>
          </div>
          <div class="tc-actions">
            <select [(ngModel)]="estadoMap[t.id]"
              style="font-size:12px;padding:5px 8px;border-radius:5px;border:1px solid #D0DCE8;margin-bottom:4px;">
              <option>En atención</option>
              <option>Pendiente de usuario</option>
              <option>Resuelto</option>
            </select>
            <button class="btn btn-primary btn-sm" (click)="actualizar(t)">Actualizar</button>
            <button class="btn btn-outline btn-sm" style="margin-top:4px;"
              (click)="router.navigate(['/detalle-ticket'], {queryParams:{id:t.id}})">
              Ver detalle
            </button>
          </div>
        </div>
      </div>

      <div *ngIf="!cargando && ticketsFiltrados.length===0"
        style="text-align:center;padding:40px;color:var(--gray);">
        No tienes tickets asignados en este momento.
      </div>

    </div>
  `
})
export class PanelTecnicoComponent implements OnInit {
  tickets:      Ticket[]            = [];
  estadoMap:    Record<number,string> = {};
  filtroEstado  = '';
  busqueda      = '';
  cargando      = true;

  constructor(
    public router:    Router,
    public auth:      AuthService,
    private ticketSvc: TicketService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.cargando = true;
    const filtros: Record<string,string> = {
      tecnico_id: String(this.auth.usuario!.id),
    };
    if (this.filtroEstado) filtros['estado'] = this.filtroEstado;

    this.ticketSvc.getTickets(filtros).subscribe({
      next: (data) => {
        this.tickets = data;
        data.forEach(t => this.estadoMap[t.id] = t.estado);
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => { this.cargando = false; this.cdr.detectChanges(); }
    });
  }

  get activos(): number {
    return this.tickets.filter(t => !['Resuelto','Cerrado','Cancelado'].includes(t.estado)).length;
  }

  get ticketsFiltrados(): Ticket[] {
    const q = this.busqueda.toLowerCase();
    return this.tickets.filter(t =>
      !q || t.ticket_id.toLowerCase().includes(q) || t.descripcion.toLowerCase().includes(q)
    );
  }

  actualizar(t: Ticket): void {
    this.ticketSvc.actualizarTicket(t.id, {
      estado:     this.estadoMap[t.id],
      usuario_id: this.auth.usuario!.id,
    }).subscribe({ next: () => this.cargar() });
  }

  iconoCategoria(cat: string): string {
    const map: Record<string,string> = {
      'Hardware':'💻','Red / Conectividad':'🌐','Software / S.O.':'💿',
      'Plataforma Educativa':'📚','Proyector / Periféricos':'📽️',
    };
    return map[cat] ?? '🔧';
  }

  badgeEstado(estado: string): string {
    const map: Record<string,string> = {
      'Abierto':'badge-abierto','En atención':'badge-atencion',
      'Pendiente de usuario':'badge-pendiente','Resuelto':'badge-resuelto','Cerrado':'badge-cerrado',
    };
    return map[estado] ?? 'badge-abierto';
  }
}

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TicketService, Ticket } from '../../services/ticket.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-detalle-ticket',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">

      <div *ngIf="cargando" style="text-align:center;padding:60px;color:var(--gray);">
        Cargando ticket...
      </div>

      <div *ngIf="!cargando && ticket">

        <!-- BARRA SUPERIOR -->
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap;">
          <button class="btn btn-outline btn-sm" (click)="volver()">← Volver</button>
          <span class="tc-id" style="font-size:16px;">{{ ticket.ticket_id }}</span>
          <span class="badge" [ngClass]="badgeEstado(ticket.estado)">{{ ticket.estado }}</span>
          <span class="pri" [ngClass]="'pri-' + ticket.prioridad.toLowerCase()">
            {{ ticket.prioridad.toUpperCase() }}
          </span>
        </div>

        <!-- GRID -->
        <div style="display:grid;grid-template-columns:1fr 320px;gap:20px;">

          <!-- COLUMNA IZQUIERDA -->
          <div>
            <!-- Info del ticket -->
            <div class="card">
              <div style="font-size:17px;font-weight:700;color:var(--blue-dark);margin-bottom:12px;">
                {{ iconoCategoria(ticket.categoria) }} {{ ticket.categoria }} – {{ ticket.area }}
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;
                font-size:13px;background:var(--gray-light);border-radius:var(--radius-sm);padding:12px;">
                <div><strong>Categoría:</strong> {{ ticket.categoria }}</div>
                <div><strong>Área:</strong> {{ ticket.area }}</div>
                <div><strong>Solicitante:</strong> {{ ticket.solicitante_nombre }}</div>
                <div><strong>Técnico:</strong> {{ ticket.tecnico_nombre ?? 'Sin asignar' }}</div>
                <div><strong>Registrado:</strong> {{ ticket.creado_en | date:'dd/MM/yyyy HH:mm' }}</div>
                <div><strong>Actualizado:</strong> {{ ticket.actualizado_en | date:'dd/MM/yyyy HH:mm' }}</div>
              </div>

              <div style="font-size:14px;color:var(--gray);line-height:1.6;">
                {{ ticket.descripcion }}
              </div>
            </div>
          </div>

          <!-- COLUMNA DERECHA (sidebar) -->
          <div>

            <!-- Historial de estados -->
            <div class="card" style="margin-bottom:14px;">
              <div style="font-size:14px;font-weight:700;color:var(--blue-dark);margin-bottom:12px;">
                📊 Historial de estados
              </div>
              <div class="timeline">
                <div class="tl-item" *ngFor="let h of ticket.historial">
                  <div class="tl-dot abierto"></div>
                  <div class="tl-time">{{ h.creado_en | date:'dd/MM/yyyy HH:mm' }}</div>
                  <div class="tl-text">{{ h.estado }} · <em>{{ h.autor }}</em></div>
                  <div *ngIf="h.nota" class="tl-note">{{ h.nota }}</div>
                </div>
              </div>
            </div>

            <!-- Confirmar resolución (solo Solicitante cuando está Resuelto) -->
            <div class="card" *ngIf="auth.rol==='Solicitante' && ticket.estado==='Resuelto'">
              <div style="font-size:13px;font-weight:600;color:var(--blue-dark);margin-bottom:10px;">
                ⚡ Confirmar resolución
              </div>
              <p style="font-size:13px;color:var(--gray);margin-bottom:12px;">
                ¿El problema fue resuelto satisfactoriamente?
              </p>
              <button class="btn btn-success btn-full btn-sm" (click)="cerrarTicket()">
                ✓ Confirmar y cerrar ticket
              </button>
            </div>

            <!-- Cambiar estado (solo Técnico) -->
            <div class="card" *ngIf="auth.rol==='Técnico'">
              <div style="font-size:13px;font-weight:600;color:var(--blue-dark);margin-bottom:10px;">
                🔧 Actualizar estado del ticket
              </div>
              <div class="form-group">
                <label>Nuevo estado</label>
                <select [(ngModel)]="nuevoEstado">
                  <option>En atención</option>
                  <option>Pendiente de usuario</option>
                  <option>Resuelto</option>
                </select>
              </div>
              <div class="form-group" *ngIf="nuevoEstado === 'Resuelto'">
                <label>Nota de solución <span class="req">*</span></label>
                <textarea placeholder="Describe la solución aplicada..."
                  [(ngModel)]="notaSolucion" style="min-height:80px;"></textarea>
                <div class="form-hint">Obligatorio al marcar como Resuelto (RF-22).</div>
              </div>
              <div *ngIf="errNota" style="color:var(--red);font-size:12px;margin-bottom:8px;">
                ⚠️ Debes documentar la solución aplicada.
              </div>
              <button class="btn btn-primary btn-full btn-sm" (click)="cambiarEstado()">
                Actualizar estado
              </button>
            </div>

          </div>
        </div>
      </div>

    </div>
  `
})
export class DetalleTicketComponent implements OnInit {
  ticket:      Ticket | null = null;
  cargando     = true;
  nuevoEstado  = 'En atención';
  notaSolucion = '';
  errNota      = false;

  constructor(
    public router:     Router,
    private route:     ActivatedRoute,
    public auth:       AuthService,
    private ticketSvc: TicketService,
    private cdr:       ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(p => {
      if (p['id']) this.cargar(+p['id']);
    });
  }

  cargar(id: number): void {
    this.cargando = true;
    this.ticketSvc.getTicket(id).subscribe({
      next: (t) => {
        this.ticket      = t;
        this.nuevoEstado = t.estado === 'Resuelto' ? 'Resuelto' : 'En atención';
        this.cargando    = false;
        this.cdr.detectChanges();
      },
      error: () => { this.cargando = false; this.cdr.detectChanges(); }
    });
  }

  cambiarEstado(): void {
    if (!this.ticket) return;

    // RF-22: nota obligatoria al marcar Resuelto
    if (this.nuevoEstado === 'Resuelto' && !this.notaSolucion.trim()) {
      this.errNota = true;
      return;
    }
    this.errNota = false;

    this.ticketSvc.actualizarTicket(this.ticket.id, {
      estado:     this.nuevoEstado,
      usuario_id: this.auth.usuario!.id,
      nota:       this.notaSolucion || undefined,
    }).subscribe({
      next: () => {
        this.notaSolucion = '';
        this.cargar(this.ticket!.id);
      }
    });
  }

  cerrarTicket(): void {
    if (!this.ticket) return;
    this.ticketSvc.actualizarTicket(this.ticket.id, {
      estado:     'Cerrado',
      usuario_id: this.auth.usuario!.id,
      nota:       'Solicitante confirmó la resolución.',
    }).subscribe({ next: () => this.cargar(this.ticket!.id) });
  }

  volver(): void {
    const destinos: Record<string, string> = {
      'Solicitante':   '/mis-tickets',
      'Técnico':       '/panel-tecnico',
      'Administrador': '/panel-admin',
    };
    this.router.navigate([destinos[this.auth.rol] ?? '/mis-tickets']);
  }

  iconoCategoria(cat: string): string {
    const map: Record<string, string> = {
      'Hardware': '💻', 'Red / Conectividad': '🌐',
      'Software / S.O.': '💿', 'Plataforma Educativa': '📚',
      'Proyector / Periféricos': '📽️',
    };
    return map[cat] ?? '🔧';
  }

  badgeEstado(estado: string): string {
    const map: Record<string, string> = {
      'Abierto': 'badge-abierto', 'En atención': 'badge-atencion',
      'Pendiente de usuario': 'badge-pendiente', 'Resuelto': 'badge-resuelto',
      'Cerrado': 'badge-cerrado', 'Cancelado': 'badge-cancelado',
    };
    return map[estado] ?? 'badge-abierto';
  }
}

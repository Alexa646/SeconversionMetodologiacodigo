import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TicketService } from '../../services/ticket.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-nuevo-ticket',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page" style="max-width:720px;">
      <div class="page-header">
        <div class="page-title">Registrar Nuevo Ticket</div>
        <div class="page-sub">Completa los 3 pasos para enviar tu solicitud.</div>
      </div>

      <!-- STEPPER -->
      <div class="stepper">
        <div class="step">
          <div class="step-num" [ngClass]="stepClass(1)">{{ stepLabel(1) }}</div>
          <div class="step-label" [class.active]="pasoActual===1">Categoría y Área</div>
        </div>
        <div class="step-line" [class.done]="pasoActual>1"></div>
        <div class="step">
          <div class="step-num" [ngClass]="stepClass(2)">{{ stepLabel(2) }}</div>
          <div class="step-label" [class.active]="pasoActual===2">Descripción</div>
        </div>
        <div class="step-line" [class.done]="pasoActual>2"></div>
        <div class="step">
          <div class="step-num" [ngClass]="stepClass(3)">{{ stepLabel(3) }}</div>
          <div class="step-label" [class.active]="pasoActual===3">Evidencia y Envío</div>
        </div>
      </div>

      <!-- PASO 1 -->
      <div *ngIf="pasoActual===1">
        <div class="card">
          <div class="form-group">
            <label>Categoría del problema <span class="req">*</span></label>
            <div class="cat-grid">
              <button class="cat-btn" *ngFor="let cat of categorias"
                [class.selected]="categoriaSeleccionada===cat.label"
                (click)="categoriaSeleccionada=cat.label">
                <div class="cat-icon">{{ cat.icon }}</div>
                <div class="cat-label">{{ cat.label }}</div>
              </button>
            </div>
            <div *ngIf="errCat" style="color:var(--red);font-size:12px;margin-top:6px;">
              ⚠️ Selecciona una categoría.
            </div>
          </div>
          <div class="form-group">
            <label>Área / Ubicación <span class="req">*</span></label>
            <select [(ngModel)]="areaSeleccionada">
              <option value="">Selecciona el área...</option>
              <option>Laboratorio de Cómputo 1</option>
              <option>Laboratorio de Cómputo 2</option>
              <option>Laboratorio de Cómputo 3</option>
              <option>Aula 12</option>
              <option>Sala de Maestros</option>
              <option>Área Administrativa</option>
              <option>Otra</option>
            </select>
            <div *ngIf="errArea" style="color:var(--red);font-size:12px;margin-top:6px;">
              ⚠️ Selecciona un área.
            </div>
          </div>
          <div style="display:flex;justify-content:flex-end;">
            <button class="btn btn-primary" (click)="avanzarPaso()">Siguiente →</button>
          </div>
        </div>
      </div>

      <!-- PASO 2 -->
      <div *ngIf="pasoActual===2">
        <div class="card">
          <div class="form-group">
            <label>Descripción del problema <span class="req">*</span></label>
            <textarea placeholder="Describe el problema con el mayor detalle posible..."
              [(ngModel)]="descripcion" (input)="errorDescripcion=false"></textarea>
            <div class="char-counter">
              <span [style.color]="colorContador()">{{ descripcion.length }}</span> / 500 (mínimo 20)
            </div>
            <div *ngIf="errorDescripcion" style="color:var(--red);font-size:12px;margin-top:4px;">
              ⚠️ La descripción debe tener al menos 20 caracteres.
            </div>
          </div>
          <div class="form-group">
            <label>Prioridad sugerida <span class="req">*</span></label>
            <div class="pri-grid">
              <button class="pri-btn" *ngFor="let p of prioridades"
                [class.selected]="prioridadSeleccionada===p.valor"
                (click)="prioridadSeleccionada=p.valor">
                <div class="pri-name">{{ p.icono }} {{ p.nombre }}</div>
                <div class="pri-desc">{{ p.desc }}</div>
              </button>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;">
            <button class="btn btn-outline" (click)="pasoActual=1">← Anterior</button>
            <button class="btn btn-primary" (click)="avanzarPaso()">Siguiente →</button>
          </div>
        </div>
      </div>

      <!-- PASO 3 -->
      <div *ngIf="pasoActual===3 && !enviado">
        <div class="card">
          <!-- Resumen -->
          <div style="background:var(--blue-pale);border:1px solid var(--blue-light);
            border-radius:var(--radius-sm);padding:14px 18px;margin-bottom:18px;">
            <div style="font-size:13px;font-weight:600;color:var(--blue-dark);margin-bottom:8px;">
              📋 Resumen de tu solicitud
            </div>
            <div style="font-size:13px;color:var(--gray);display:grid;grid-template-columns:1fr 1fr;gap:6px;">
              <div><strong>Categoría:</strong> {{ categoriaSeleccionada }}</div>
              <div><strong>Área:</strong> {{ areaSeleccionada }}</div>
              <div><strong>Prioridad:</strong>
                <span style="font-weight:600;">{{ prioridadSeleccionada }}</span>
              </div>
              <div><strong>Solicitante:</strong> {{ auth.usuario?.nombre }}</div>
            </div>
          </div>

          <div *ngIf="errServidor" style="background:var(--red-light);color:var(--red);
            border-radius:var(--radius-sm);padding:10px 14px;font-size:13px;margin-bottom:14px;">
            ⚠️ {{ errServidor }}
          </div>

          <div style="display:flex;justify-content:space-between;align-items:center;">
            <button class="btn btn-outline" (click)="pasoActual=2">← Anterior</button>
            <button class="btn btn-primary" style="padding:10px 28px;"
              [disabled]="enviando" (click)="enviarTicket()">
              {{ enviando ? 'Guardando...' : '✅ Enviar ticket' }}
            </button>
          </div>
        </div>
      </div>

      <!-- ÉXITO -->
      <div *ngIf="enviado">
        <div class="card">
          <div class="success-box">
            <div class="success-icon">✅</div>
            <div style="font-family:'Sora',sans-serif;font-size:20px;font-weight:700;color:var(--blue-dark);">
              ¡Ticket registrado exitosamente!
            </div>
            <div class="success-id">{{ ticketId }}</div>
            <div class="success-msg">
              Tu solicitud fue recibida y guardada en la base de datos.
            </div>
            <div style="display:flex;gap:12px;justify-content:center;margin-top:24px;">
              <button class="btn btn-outline" (click)="router.navigate(['/mis-tickets'])">
                Ver mis tickets
              </button>
              <button class="btn btn-primary" (click)="resetForm()">+ Registrar otro</button>
            </div>
          </div>
        </div>
      </div>

    </div>
  `
})
export class NuevoTicketComponent {
  pasoActual              = 1;
  enviado                 = false;
  enviando                = false;
  categoriaSeleccionada   = '';
  areaSeleccionada        = '';
  descripcion             = '';
  prioridadSeleccionada   = 'Crítica';
  ticketId                = '';
  errorDescripcion        = false;
  errCat                  = false;
  errArea                 = false;
  errServidor             = '';

  private readonly LONGITUD_MIN = 20;

  readonly categorias = [
    { icon: '💻', label: 'Hardware' },
    { icon: '🌐', label: 'Red / Conectividad' },
    { icon: '💿', label: 'Software / S.O.' },
    { icon: '📚', label: 'Plataforma Educativa' },
    { icon: '📽️', label: 'Proyector / Periféricos' },
    { icon: '❓', label: 'Otro' }
  ];

  readonly prioridades = [
    { valor: 'Baja',    icono: '🟢', nombre: 'Baja',    desc: 'No afecta actividades inmediatas.' },
    { valor: 'Media',   icono: '🔵', nombre: 'Media',   desc: 'Afecta parcialmente. Hay alternativas.' },
    { valor: 'Alta',    icono: '🟠', nombre: 'Alta',    desc: 'Afecta significativamente el trabajo.' },
    { valor: 'Crítica', icono: '🔴', nombre: 'Crítica', desc: 'Bloquea completamente la actividad.' }
  ];

  constructor(
    public router:     Router,
    public auth:       AuthService,
    private ticketSvc: TicketService
  ) {}

  avanzarPaso(): void {
    if (this.pasoActual === 1) {
      this.errCat  = !this.categoriaSeleccionada;
      this.errArea = !this.areaSeleccionada;
      if (this.errCat || this.errArea) return;
    }
    if (this.pasoActual === 2) {
      this.errorDescripcion = this.descripcion.length < this.LONGITUD_MIN;
      if (this.errorDescripcion) return;
    }
    this.pasoActual++;
  }

  colorContador(): string {
    return this.descripcion.length < 20 ? 'var(--red)'
         : this.descripcion.length > 480 ? 'var(--orange)'
         : 'var(--gray-mid)';
  }

  enviarTicket(): void {
    this.enviando   = true;
    this.errServidor = '';
    this.ticketSvc.crearTicket({
      categoria:      this.categoriaSeleccionada,
      area:           this.areaSeleccionada,
      descripcion:    this.descripcion,
      prioridad:      this.prioridadSeleccionada,
      solicitante_id: this.auth.usuario!.id,
    }).subscribe({
      next: (res) => {
        this.ticketId = res.ticket_id;
        this.enviado  = true;
        this.enviando = false;
      },
      error: (err) => {
        this.errServidor = err.error?.error ?? 'Error al guardar el ticket.';
        this.enviando = false;
      }
    });
  }

  resetForm(): void {
    this.pasoActual           = 1;
    this.enviado              = false;
    this.categoriaSeleccionada = '';
    this.areaSeleccionada     = '';
    this.descripcion          = '';
    this.prioridadSeleccionada = 'Crítica';
    this.ticketId             = '';
    this.errorDescripcion     = false;
    this.errServidor          = '';
  }

  stepClass(paso: number): string {
    if (paso < this.pasoActual) return 'step-num done';
    if (paso === this.pasoActual) return 'step-num active';
    return 'step-num pending';
  }

  stepLabel(paso: number): string {
    return paso < this.pasoActual ? '✓' : String(paso);
  }
}

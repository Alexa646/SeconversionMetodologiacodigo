import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-wrap">
      <div class="login-card">
        <div class="login-logo">Soporte<span>CETIS</span></div>
        <div class="login-sub">
          Sistema de Gestión de Tickets de Soporte Técnico<br>
          CETIS · Departamento de Informática
        </div>

        <div class="form-group">
          <label>Correo institucional <span class="req">*</span></label>
          <input type="email" placeholder="usuario@cetis.edu.mx" [(ngModel)]="email">
        </div>

        <div class="form-group">
          <label>Contraseña <span class="req">*</span></label>
          <input type="password" placeholder="••••••••" [(ngModel)]="password"
            (keyup.enter)="iniciarSesion()">
        </div>

        <!-- Mensaje de error del servidor -->
        <div *ngIf="errorMsg" style="background:var(--red-light);color:var(--red);
          border-radius:var(--radius-sm);padding:10px 14px;font-size:13px;margin-bottom:14px;">
          ⚠️ {{ errorMsg }}
        </div>

        <button class="btn btn-primary btn-full" [disabled]="cargando" (click)="iniciarSesion()">
          {{ cargando ? 'Iniciando sesión...' : 'Iniciar sesión' }}
        </button>

        <div style="margin-top:16px;background:var(--blue-pale);border-radius:var(--radius-sm);
          padding:12px;font-size:12px;color:var(--gray);">
          <strong>Cuentas de prueba</strong> (contraseña: <code>12345678</code>)<br>
          Solicitante: juan.perez&#64;cetis.edu.mx<br>
          Técnico: mario.lopez&#64;cetis.edu.mx<br>
          Admin: admin&#64;cetis.edu.mx
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  email    = '';
  password = '';
  cargando = false;
  errorMsg = '';

  constructor(private auth: AuthService, private router: Router) {
    // Si ya está logueado, redirigir directo
    if (this.auth.estaLogueado) this.redirigir();
  }

  iniciarSesion(): void {
    this.errorMsg = '';
    if (!this.email || !this.password) {
      this.errorMsg = 'Ingresa tu correo y contraseña.';
      return;
    }
    this.cargando = true;
    this.auth.login(this.email, this.password).subscribe({
      next: () => this.redirigir(),
      error: (err) => {
        this.cargando = false;
        this.errorMsg = err.error?.error ?? 'Error al conectar con el servidor.';
      }
    });
  }

  private redirigir(): void {
    const destinos: Record<string, string> = {
      'Solicitante':   '/mis-tickets',
      'Técnico':       '/panel-tecnico',
      'Administrador': '/panel-admin',
    };
    this.router.navigate([destinos[this.auth.rol] ?? '/mis-tickets']);
  }
}

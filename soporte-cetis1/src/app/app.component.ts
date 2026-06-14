import { Component } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  template: `
    <nav class="nav" *ngIf="auth.estaLogueado">
      <div class="nav-logo" style="cursor:pointer" (click)="irInicio()">
        Soporte<span>CETIS</span>
      </div>
      <div class="nav-right">
        <div class="nav-user">
          {{ auth.usuario?.nombre }} · <strong>{{ auth.rol }}</strong>
        </div>
        <button class="nav-btn primary"
          *ngIf="auth.rol === 'Solicitante'"
          (click)="router.navigate(['/nuevo-ticket'])">
          + Nuevo ticket
        </button>
        <button class="nav-btn" (click)="auth.logout()">Cerrar sesión</button>
      </div>
    </nav>
    <router-outlet></router-outlet>
  `
})
export class AppComponent {
  constructor(public auth: AuthService, public router: Router) {}

  irInicio(): void {
    const destinos: Record<string,string> = {
      'Solicitante': '/mis-tickets', 'Técnico': '/panel-tecnico', 'Administrador': '/panel-admin'
    };
    this.router.navigate([destinos[this.auth.rol] ?? '/login']);
  }
}

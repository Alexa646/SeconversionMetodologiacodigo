// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Usuario {
  id:     number;
  nombre: string;
  email:  string;
  rol:    'Solicitante' | 'Técnico' | 'Administrador';
  area:   string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly URL = `${environment.apiUrl}/auth`;
  // Clave usada para guardar el usuario en sessionStorage
  private readonly KEY = 'cetis_usuario';

  constructor(private http: HttpClient, private router: Router) {}

  // login: envía credenciales al backend y guarda el usuario en sesión
  login(email: string, password: string): Observable<{ ok: boolean; usuario: Usuario }> {
    return this.http.post<{ ok: boolean; usuario: Usuario }>(this.URL, { email, password })
      .pipe(tap(res => {
        if (res.ok) sessionStorage.setItem(this.KEY, JSON.stringify(res.usuario));
      }));
  }

  // usuario actual desde sessionStorage
  get usuario(): Usuario | null {
    const raw = sessionStorage.getItem(this.KEY);
    return raw ? JSON.parse(raw) : null;
  }

  get estaLogueado(): boolean { return !!this.usuario; }
  get rol(): string           { return this.usuario?.rol ?? ''; }

  logout(): void {
    sessionStorage.removeItem(this.KEY);
    this.router.navigate(['/login']);
  }
}

// src/app/services/mensaje.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MensajeService {
  private readonly URL = `${environment.apiUrl}/mensajes`;
  constructor(private http: HttpClient) {}

  enviar(ticket_id: number, usuario_id: number, mensaje: string): Observable<{ ok: boolean; id: number }> {
    return this.http.post<{ ok: boolean; id: number }>(this.URL, { ticket_id, usuario_id, mensaje });
  }
}

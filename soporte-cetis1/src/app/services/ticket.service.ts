// src/app/services/ticket.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Ticket {
  id:                  number;
  ticket_id:           string;
  categoria:           string;
  area:                string;
  descripcion:         string;
  prioridad:           string;
  estado:              string;
  solicitante_id:      number;
  solicitante_nombre?: string;
  tecnico_id?:         number;
  tecnico_nombre?:     string;
  creado_en:           string;
  actualizado_en:      string;
  mensajes?:           Mensaje[];
  historial?:          HistorialEstado[];
}

export interface Mensaje {
  id:         number;
  ticket_id:  number;
  usuario_id: number;
  autor:      string;
  autor_rol:  string;
  mensaje:    string;
  creado_en:  string;
}

export interface HistorialEstado {
  id:        number;
  estado:    string;
  nota:      string;
  autor:     string;
  creado_en: string;
}

@Injectable({ providedIn: 'root' })
export class TicketService {

  private readonly URL = `${environment.apiUrl}/tickets`;

  constructor(private http: HttpClient) {}

  // Obtener lista de tickets (con filtros opcionales)
  getTickets(filtros: Record<string, string> = {}): Observable<Ticket[]> {
    let params = new HttpParams();
    Object.entries(filtros).forEach(([k, v]) => { if (v) params = params.set(k, v); });
    return this.http.get<Ticket[]>(this.URL, { params });
  }

  // Obtener detalle completo (con mensajes e historial)
  getTicket(id: number): Observable<Ticket> {
    return this.http.get<Ticket>(`${this.URL}/${id}`);
  }

  // Crear nuevo ticket
  crearTicket(datos: {
    categoria:      string;
    area:           string;
    descripcion:    string;
    prioridad:      string;
    solicitante_id: number;
  }): Observable<{ ok: boolean; ticket_id: string; id: number }> {
    return this.http.post<{ ok: boolean; ticket_id: string; id: number }>(this.URL, datos);
  }

  // Actualizar estado y/o técnico
  actualizarTicket(id: number, datos: {
    estado?:     string;
    tecnico_id?: number | null;
    usuario_id?: number;
    nota?:       string;
  }): Observable<{ ok: boolean }> {
    return this.http.patch<{ ok: boolean }>(`${this.URL}/${id}`, datos);
  }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { isBrowser } from '../utils/is-browser';

@Injectable({
  providedIn: 'root',
})
export class UsuariosService {
  private API_URL = isBrowser() && window.location.hostname.includes('localhost')
    ? 'http://localhost:3000/api/usuario'
    : 'https://faculride-api.duckdns.org/api/usuario';

  constructor(private http: HttpClient) {}

  // Listar usuários
  getUsuarios(): Observable<any[]> {
    return this.http.get<any[]>(this.API_URL);
  }

  // Buscar usuário por ID
  getUsuarioPorId(id: number): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/${id}`);
  }

  // Deletar usuário
  deletarUsuario(id: number): Observable<any> {
    return this.http.delete<any>(`${this.API_URL}/${id}`);
  }
  redefinirSenha(token: string, novaSenha: string): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/redefinir-senha`, { novaSenha },{headers: { 'Authorization': `Bearer ${token}`}});
  }

}




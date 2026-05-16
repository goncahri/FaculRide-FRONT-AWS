import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UsuariosService {
  private apiAuth = 'https://projeto-faculride.onrender.com/api/auth';
  private apiUsuario = 'https://projeto-faculride.onrender.com/api/usuario';

  constructor(private http: HttpClient) {}

  // Login
  login(dados: { email: string; senha: string }): Observable<any> {
    return this.http.post<any>(`${this.apiAuth}/login`, dados).pipe(
      tap((res) => {
        if (res && res.token) {
          localStorage.setItem('token', res.token);
          localStorage.setItem('usuario', JSON.stringify(res.usuario));
        }
      })
    );
  }

  // Listar usuários
  getUsuarios(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUsuario);
  }

  // Buscar usuário por ID
  getUsuarioPorId(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUsuario}/${id}`);
  }

  // Deletar usuário
  deletarUsuario(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUsuario}/${id}`);
  }
}




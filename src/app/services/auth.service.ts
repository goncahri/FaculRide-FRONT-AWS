// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { NotificationService } from './notification.service';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = 'https://faculride-api.duckdns.org/api/usuario';

  constructor(
    private http: HttpClient,
    private notificationService: NotificationService,
    private storageService: StorageService
  ) {}

  /** Faz login e armazena token e dados do usuário */
  login(email: string, senha: string): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/login`, { email, senha }).pipe(
      tap((res) => {
        const token = res?.token;
        const usuario = res?.usuario;

        if (token && usuario) {
          this.storageService.setItem('token', token);
          this.storageService.setItem('usuarioLogado', JSON.stringify(usuario));
          this.notificationService.init(token);
        } else {
          console.error('Resposta inválida do servidor: faltando token ou usuário.');
        }
      })
    );
  }

  /** Reativa sessão ao recarregar a página */
  bootstrapSession() {
    const token = this.storageService.getItem('token');
    if (token) {
      this.notificationService.init(token);
    }
  }

  /** Faz logout limpando token, dados locais e desconectando socket */
  logout() {
    this.storageService.removeItem('token');
    this.storageService.removeItem('usuarioLogado');

    // encerra socket e limpa notificações em memória
    this.notificationService.clear();
  }

  /** Retorna o token atual (para uso eventual) */
  getToken(): string | null {
    return this.storageService.getItem('token');
  }

  /** Verifica se há sessão ativa */
  isAuthenticated(): boolean {
    return !!this.storageService.getItem('token');
  }

  alterarSenha(dados: {
  senhaAtual: string;
  novaSenha: string;
  confirmarSenha: string;
}) {
  const token = this.storageService.getItem('token');

  return this.http.put(
    `${this.API_URL}/alterar-senha`,
    dados,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
}
}

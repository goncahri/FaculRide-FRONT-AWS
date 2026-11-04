import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MapaComponent } from '../mapa/mapa.component';
import { HttpClient } from '@angular/common/http';
import { isBrowser } from '../utils/is-browser';

@Component({
  selector: 'app-usuario',
  standalone: true,
  imports: [CommonModule, RouterLink, MapaComponent],
  templateUrl: './usuario.component.html',
  styleUrls: ['./usuario.component.css']
})
export class UsuarioComponent implements OnInit {
  http = inject(HttpClient);
  usuarioNome: string = '';
  usuarioFoto: string = '/assets/usuario.png';
  pontuacao: number = 5;
  baseURL =
    isBrowser() && window.location.hostname.includes('localhost')
      ? 'http://localhost:3000/api'
      : 'http://faculride-api.duckdns.org/api';

  ngOnInit(): void {
    const usuarioLogado = localStorage.getItem('usuarioLogado');

    if (usuarioLogado) {
      const usuario = JSON.parse(usuarioLogado);
      this.usuarioNome = usuario.nome?.split(' ')[0] || 'Usuário';

      this.usuarioFoto = this.obterFotoUsuario(usuario.email, usuario.genero);
      this.mediaAvaliacao(usuario);
      console.log('✅ Usuário logado:', this.pontuacao);

      console.log('✅ Usuário logado:', usuario);
    } else {
      alert('Usuário não encontrado, faça login novamente.');
      window.location.href = '/login';
    }
  }

  abrirMenuUsuario() {
    console.log('Menu do usuário clicado');
  }

  obterFotoUsuario(email: string, genero: any): string {
    const usuarioLogado = localStorage.getItem('usuarioLogado');
    if (usuarioLogado) {
      const u = JSON.parse(usuarioLogado);
      if (u.foto || u.fotoUrl) {
        return u.foto || u.fotoUrl;
      }
    }

    if (genero === true) return '/assets/profile_man.jpeg';
    if (genero === false) return '/assets/profile_woman.jpeg';
    return '/assets/usuario.png';
  }
  mediaAvaliacao(user: any):void {
    try {
      this.http.get(`${this.baseURL}/avaliacao/media/${user.id}`).subscribe({
        next: (response: any) => {
          const media = response.media;
          this.pontuacao = media !== null ? parseFloat(media.toFixed(2)) : 0;
          console.log('Média das avaliações:', response);
        }
      });
    } catch (error) {
      console.log('Erro ao calcular a média das avaliações: ', error);
    }
  }
}

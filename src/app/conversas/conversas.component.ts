import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { isBrowser } from '../utils/is-browser';

type ConversaStatus = 'pendente' | 'aguardando_confirmacao' | 'aceita' | 'recusada' | string;

type UsuarioConversa = {
  idUsuario?: number;
  id?: number;
  nome?: string;
  email?: string;
  telefone?: string;
  fotoUrl?: string;
  foto?: string;
  avatarUrl?: string;
  imagem?: string;
  fotoPath?: string;
};

type ViagemConversa = {
  idViagem?: number;
  partida?: string;
  destino?: string;
  horarioEntrada?: string;
  horarioSaida?: string;
  ajudaDeCusto?: string | number;
  statusViagem?: string;
  cancelada?: boolean;
};

type Conversa = {
  idConversa: number;
  idViagem: number;
  idMotorista: number;
  idPassageiro: number;
  status: ConversaStatus;
  aceiteMotorista: boolean;
  aceitePassageiro: boolean;
  createdAt?: string;
  updatedAt?: string;
  viagem?: ViagemConversa;
  motorista?: UsuarioConversa;
  passageiro?: UsuarioConversa;
};

type Mensagem = {
  idMensagem: number;
  idConversa: number;
  idRemetente: number;
  mensagem: string;
  lida?: boolean;
  createdAt?: string;
  updatedAt?: string;
  remetente?: UsuarioConversa;
};

@Component({
  selector: 'app-conversas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './conversas.component.html',
  styleUrls: ['./conversas.component.css']
})
export class ConversasComponent implements OnInit, OnDestroy {
  baseURL = isBrowser() && window.location.hostname.includes('localhost')
    ? 'http://localhost:3000/api'
    : 'http://faculride-api.duckdns.org/api';

  usuarioLogado = isBrowser() ? JSON.parse(localStorage.getItem('usuarioLogado') || '{}') : {};
  meuId = Number(this.usuarioLogado.idUsuario || this.usuarioLogado.id || 0);

  conversas: Conversa[] = [];
  conversaSelecionada: Conversa | null = null;
  mensagens: Mensagem[] = [];

  mensagem = '';
  carregandoConversas = false;
  carregandoMensagens = false;
  enviandoMensagem = false;
  salvandoAcao = false;

  erro = '';
  idViagemParam: number | null = null;

  private intervalId: any = null;
  private ultimaViagemInicializada: number | null = null;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const novoIdViagem = Number(params.get('idViagem')) || null;

      if (novoIdViagem !== this.idViagemParam) {
        this.ultimaViagemInicializada = null;
      }

      this.idViagemParam = novoIdViagem;
      this.inicializarTela();
    });

    this.intervalId = setInterval(() => {
      if (this.conversaSelecionada?.idConversa) {
        this.carregarMensagens(this.conversaSelecionada.idConversa, true);
      }

      this.carregarConversas(true);
    }, 5000);
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private getToken(): string {
    const usuarioLogado = isBrowser()
      ? JSON.parse(localStorage.getItem('usuarioLogado') || '{}')
      : {};

    return (
      localStorage.getItem('token') ||
      localStorage.getItem('accessToken') ||
      localStorage.getItem('jwt') ||
      usuarioLogado?.token ||
      ''
    );
  }

  private getHeaders(): HttpHeaders {
    const token = this.getToken();

    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  async inicializarTela(): Promise<void> {
    try {
      this.erro = '';
      this.carregandoConversas = true;

      let conversaInicial: Conversa | null = null;

      if (
        this.idViagemParam &&
        this.ultimaViagemInicializada !== this.idViagemParam
      ) {
        conversaInicial = await this.iniciarConversa(this.idViagemParam);
        this.ultimaViagemInicializada = this.idViagemParam;
      }

      await this.carregarConversas();

      if (conversaInicial?.idConversa) {
        const conversaNaLista = this.conversas.find(
          c => Number(c.idConversa) === Number(conversaInicial?.idConversa)
        );

        const conversaFinal = conversaNaLista || conversaInicial;

        if (!conversaNaLista) {
          this.conversas = this.deduplicarConversas([conversaFinal, ...this.conversas]);
        }

        this.selecionarConversa(conversaFinal);
        return;
      }

      if (this.idViagemParam && this.conversas.length) {
        const conversaDaViagem = this.conversas.find(
          c => Number(c.idViagem) === Number(this.idViagemParam)
        );

        if (conversaDaViagem) {
          this.selecionarConversa(conversaDaViagem);
          return;
        }
      }

      if (!this.conversaSelecionada && this.conversas.length) {
        this.selecionarConversa(this.conversas[0]);
      }
    } catch (error: any) {
      console.error('Erro ao inicializar conversas:', error);
      this.erro = error?.error?.erro || error?.message || 'Não foi possível carregar as conversas.';
    } finally {
      this.carregandoConversas = false;
    }
  }

  iniciarConversa(idViagem: number): Promise<Conversa> {
    return new Promise((resolve, reject) => {
      this.http.post<Conversa>(
        `${this.baseURL}/conversas/iniciar`,
        { idViagem },
        { headers: this.getHeaders() }
      ).subscribe({
        next: (res) => resolve(res),
        error: (err) => reject(err)
      });
    });
  }

  carregarConversas(silencioso = false): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!silencioso) this.carregandoConversas = true;

      this.http.get<Conversa[]>(`${this.baseURL}/conversas`, {
        headers: this.getHeaders()
      }).subscribe({
        next: (res) => {
          this.conversas = this.deduplicarConversas(Array.isArray(res) ? res : []);

          if (this.conversaSelecionada) {
            const atualizada = this.conversas.find(
              c => Number(c.idConversa) === Number(this.conversaSelecionada?.idConversa)
            );

            if (atualizada) {
              this.conversaSelecionada = atualizada;
            }
          }

          if (!silencioso) this.carregandoConversas = false;
          resolve();
        },
        error: (err) => {
          console.error('Erro ao carregar conversas:', err);
          if (!silencioso) this.carregandoConversas = false;
          reject(err);
        }
      });
    });
  }

  selecionarConversa(conversa: Conversa): void {
    this.conversaSelecionada = conversa;
    this.carregarMensagens(conversa.idConversa);
  }

  carregarMensagens(idConversa: number, silencioso = false): void {
    if (!silencioso) this.carregandoMensagens = true;

    this.http.get<Mensagem[]>(`${this.baseURL}/conversas/${idConversa}/mensagens`, {
      headers: this.getHeaders()
    }).subscribe({
      next: (res) => {
        this.mensagens = this.deduplicarMensagens(Array.isArray(res) ? res : []);
        this.carregandoMensagens = false;

        setTimeout(() => {
          const el = document.querySelector('.messages');
          if (el) el.scrollTop = el.scrollHeight;
        }, 100);
      },
      error: (err) => {
        console.error('Erro ao carregar mensagens:', err);
        this.carregandoMensagens = false;
      }
    });
  }

  enviarMensagem(): void {
    const texto = this.mensagem.trim();

    if (!texto || !this.conversaSelecionada?.idConversa || this.enviandoMensagem || !this.podeEnviarMensagem()) {
      return;
    }

    this.enviandoMensagem = true;

    this.http.post(
      `${this.baseURL}/conversas/mensagem`,
      {
        idConversa: this.conversaSelecionada.idConversa,
        mensagem: texto
      },
      { headers: this.getHeaders() }
    ).subscribe({
      next: () => {
        this.mensagem = '';
        this.enviandoMensagem = false;
        this.carregarMensagens(this.conversaSelecionada!.idConversa);
        this.carregarConversas(true);
      },
      error: (err) => {
        console.error('Erro ao enviar mensagem:', err);
        alert('Erro ao enviar mensagem.');
        this.enviandoMensagem = false;
      }
    });
  }

  aceitarCarona(): void {
    if (!this.conversaSelecionada?.idConversa || this.salvandoAcao) return;

    this.salvandoAcao = true;

    this.http.patch<Conversa>(
      `${this.baseURL}/conversas/${this.conversaSelecionada.idConversa}/aceitar`,
      {},
      { headers: this.getHeaders() }
    ).subscribe({
      next: async (res) => {
        this.conversaSelecionada = { ...this.conversaSelecionada!, ...res };
        this.salvandoAcao = false;

        await this.carregarConversas(true);

        if (this.conversaSelecionada?.idConversa) {
          this.carregarMensagens(this.conversaSelecionada.idConversa, true);
        }

        alert('Confirmação registrada com sucesso.');
      },
      error: (err) => {
        console.error('Erro ao aceitar carona:', err);
        alert('Erro ao aceitar carona.');
        this.salvandoAcao = false;
      }
    });
  }

  recusarCarona(): void {
    if (!this.conversaSelecionada?.idConversa || this.salvandoAcao) return;

    if (!confirm('Tem certeza que deseja recusar esta carona? A conversa ficará encerrada.')) return;

    this.salvandoAcao = true;

    this.http.patch<Conversa>(
      `${this.baseURL}/conversas/${this.conversaSelecionada.idConversa}/recusar`,
      {},
      { headers: this.getHeaders() }
    ).subscribe({
      next: async (res) => {
        this.conversaSelecionada = { ...this.conversaSelecionada!, ...res };
        this.salvandoAcao = false;

        await this.carregarConversas(true);

        if (this.conversaSelecionada?.idConversa) {
          this.carregarMensagens(this.conversaSelecionada.idConversa, true);
        }

        alert('Carona recusada e conversa encerrada.');
      },
      error: (err) => {
        console.error('Erro ao recusar carona:', err);
        alert('Erro ao recusar carona.');
        this.salvandoAcao = false;
      }
    });
  }

  podeEnviarMensagem(): boolean {
    if (!this.conversaSelecionada) return false;

    const statusViagem = this.statusViagemAtual();

    if (statusViagem === 'cancelada' || statusViagem === 'concluida') return false;
    if (this.conversaSelecionada.status === 'recusada') return false;

    return true;
  }

  podeAceitar(): boolean {
    if (!this.conversaSelecionada) return false;
    if (this.conversaSelecionada.status === 'aceita') return false;
    if (this.conversaSelecionada.status === 'recusada') return false;
    if (this.statusViagemAtual() === 'cancelada' || this.statusViagemAtual() === 'concluida') return false;
    if (this.euJaAceitei()) return false;

    return true;
  }

  podeRecusar(): boolean {
    if (!this.conversaSelecionada) return false;
    if (this.conversaSelecionada.status === 'recusada') return false;
    if (this.statusViagemAtual() === 'cancelada' || this.statusViagemAtual() === 'concluida') return false;

    return true;
  }

  euJaAceitei(): boolean {
    if (!this.conversaSelecionada) return false;

    if (Number(this.conversaSelecionada.idMotorista) === Number(this.meuId)) {
      return !!this.conversaSelecionada.aceiteMotorista;
    }

    return !!this.conversaSelecionada.aceitePassageiro;
  }

  outroJaAceitou(): boolean {
    if (!this.conversaSelecionada) return false;

    if (Number(this.conversaSelecionada.idMotorista) === Number(this.meuId)) {
      return !!this.conversaSelecionada.aceitePassageiro;
    }

    return !!this.conversaSelecionada.aceiteMotorista;
  }

  outroUsuario(conversa = this.conversaSelecionada): UsuarioConversa | null {
    if (!conversa) return null;

    const euSouMotorista = Number(conversa.idMotorista) === Number(this.meuId);

    return euSouMotorista
      ? conversa.passageiro || null
      : conversa.motorista || null;
  }

  nomeOutroUsuario(conversa = this.conversaSelecionada): string {
    return this.outroUsuario(conversa)?.nome || 'Contato';
  }

  fotoOutroUsuario(conversa = this.conversaSelecionada): string {
    const usuario = this.outroUsuario(conversa);

    return (
      usuario?.fotoUrl ||
      usuario?.foto ||
      usuario?.avatarUrl ||
      usuario?.imagem ||
      usuario?.fotoPath ||
      ''
    );
  }

  iniciais(nome?: string): string {
    const texto = (nome || '').trim();

    if (!texto) return '?';

    const partes = texto.split(' ').filter(Boolean);

    if (partes.length === 1) return partes[0].slice(0, 1).toUpperCase();

    return `${partes[0][0] || ''}${partes[1][0] || ''}`.toUpperCase();
  }

  statusViagemAtual(): string {
    return String(this.conversaSelecionada?.viagem?.statusViagem || '').trim().toLowerCase();
  }

  statusLabel(conversa = this.conversaSelecionada): string {
    if (!conversa) return 'Sem conversa';

    const statusViagem = String(conversa.viagem?.statusViagem || '').trim().toLowerCase();

    if (statusViagem === 'cancelada') return 'Carona cancelada';
    if (statusViagem === 'concluida') return 'Carona concluída';

    if (conversa.status === 'aceita') return 'Carona aceita';
    if (conversa.status === 'recusada') return 'Conversa encerrada';
    if (conversa.status === 'aguardando_confirmacao') return 'Aguardando confirmação';

    return 'Aguardando decisão';
  }

  statusClasse(conversa = this.conversaSelecionada): string {
    if (!conversa) return 'pendente';

    const statusViagem = String(conversa.viagem?.statusViagem || '').trim().toLowerCase();

    if (statusViagem === 'cancelada') return 'cancelada';
    if (statusViagem === 'concluida') return 'concluida';

    if (conversa.status === 'aceita') return 'aceita';
    if (conversa.status === 'recusada') return 'recusada';
    if (conversa.status === 'aguardando_confirmacao') return 'aguardando';

    return 'pendente';
  }

  observacaoStatus(): string {
    if (!this.conversaSelecionada) {
      return 'Selecione uma conversa para visualizar os detalhes.';
    }

    const statusViagem = this.statusViagemAtual();

    if (statusViagem === 'cancelada') return 'Essa carona foi cancelada. O chat permanece apenas para histórico.';
    if (statusViagem === 'concluida') return 'Essa carona já foi concluída. Você pode revisar o histórico da conversa.';

    if (this.conversaSelecionada.status === 'aceita') {
      return 'Os dois lados já aceitaram. Essa carona foi combinada com sucesso.';
    }

    if (this.conversaSelecionada.status === 'recusada') {
      return 'Essa conversa foi encerrada por recusa da carona.';
    }

    if (this.conversaSelecionada.status === 'aguardando_confirmacao') {
      if (this.euJaAceitei() && !this.outroJaAceitou()) {
        return 'Você já aceitou. Agora falta o outro participante confirmar.';
      }

      if (!this.euJaAceitei() && this.outroJaAceitou()) {
        return 'O outro participante já aceitou. Falta sua confirmação.';
      }

      return 'Aguardando confirmação dos participantes.';
    }

    return 'Converse e alinhe os detalhes antes de aceitar ou recusar.';
  }

  formatarHora(dataIso?: string): string {
    if (!dataIso) return '';

    const data = new Date(dataIso);

    if (Number.isNaN(data.getTime())) return '';

    return data.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private deduplicarConversas(lista: Conversa[]): Conversa[] {
    const mapa = new Map<number, Conversa>();

    for (const conversa of lista) {
      mapa.set(Number(conversa.idConversa), conversa);
    }

    return Array.from(mapa.values()).sort((a, b) => {
      const dataA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const dataB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return dataB - dataA;
    });
  }

  private deduplicarMensagens(lista: Mensagem[]): Mensagem[] {
    const mapa = new Map<number, Mensagem>();

    for (const msg of lista) {
      mapa.set(Number(msg.idMensagem), msg);
    }

    return Array.from(mapa.values()).sort((a, b) => {
      const dataA = new Date(a.createdAt || 0).getTime();
      const dataB = new Date(b.createdAt || 0).getTime();
      return dataA - dataB;
    });
  }
}
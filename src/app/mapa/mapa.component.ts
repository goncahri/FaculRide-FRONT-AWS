import { Component, ElementRef, ViewChild, AfterViewInit, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { isBrowser } from '../utils/is-browser';

type DiaCalendario = {
  dia: number;
  dateStr: string | null;
  desabilitado: boolean;
};

type CalendarioMes = {
  key: string;
  label: string;
  dias: DiaCalendario[];
};

type ModoVigencia = 'mensal' | 'semestre';
type FiltroTipo = 'todos' | 'motorista' | 'passageiro';
type SecaoMapa = 'encontre' | 'minhasCaronas' | 'avaliacoes';

@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mapa.component.html',
  styleUrls: ['./mapa.component.css']
})
export class MapaComponent implements AfterViewInit, OnInit {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;

  map!: google.maps.Map;
  directionsRenderer!: google.maps.DirectionsRenderer;

  markers: google.maps.Marker[] = [];
  infoWindow!: google.maps.InfoWindow;

  carregando: boolean = true;
  private _loads = { usuarios: false, viagens: false, avaliacoes: false, conversas: false };

  private markLoaded(key: 'usuarios' | 'viagens' | 'avaliacoes' | 'conversas') {
    this._loads[key] = true;
    if (this._loads.usuarios && this._loads.viagens && this._loads.avaliacoes && this._loads.conversas) {
      this.carregando = false;
    }
  }

  tipoCarona: string = 'oferecer';
  filtroTipo: FiltroTipo = 'todos';

  modoEdicaoAtivo: boolean = false;
  idViagemEdicao: number | null = null;
  mostrarSecaoEncontre = true;
  mostrarSecaoMinhasCaronas = true;
  mostrarSecaoAvaliacoes = true;

  origem: string = '';
  cidadePartida: string = '';
  destino: string = '';
  entradaFatec: string = '';
  saidaFatec: string = '';
  ajudaCusto: number | null = null;

  mostrarCalendario: boolean = false;
  datasRota: string[] = [];

  diasCalendario: DiaCalendario[] = [];
  calendariosMensais: CalendarioMes[] = [];
  modoVigencia: ModoVigencia = 'mensal';

  mesAtualLabel: string = '';
  hojeISO: string = new Date().toISOString().split('T')[0];

  viagens: any[] = [];
  caronasOferecidas: any[] = [];
  caronasProcuradas: any[] = [];
  conversas: any[] = [];
  caronasAceitas: any[] = [];

  mostrarAvaliacao: boolean = false;
  nomeUsuarioSelecionado: string = '';
  idUsuarioSelecionado: number | null = null;
  avaliacaoSelecionada: number = 0;
  comentarioAvaliacao: string = '';

  avaliacoesRecebidas: any[] = [];
  avaliacoesEnviadas: any[] = [];
  usuarios: any[] = [];

  baseURL = isBrowser() && window.location.hostname.includes('localhost')
    ? 'http://localhost:3000/api'
    : 'http://faculride-api.duckdns.org/api';

  usuarioLogado = isBrowser() ? JSON.parse(localStorage.getItem('usuarioLogado') || '{}') : {};
  meuId = Number(this.usuarioLogado.idUsuario || this.usuarioLogado.id);

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.gerarCalendariosMensais();
  }

  ngOnInit(): void {
    this.carregando = true;
    this._loads = { usuarios: false, viagens: false, avaliacoes: false, conversas: false };

    this.carregarUsuarios();
    this.carregarViagens();
    this.carregarConversas();
    this.carregarAvaliacoes();
  }

  ngAfterViewInit(): void {
    this.inicializarMapa();
  }

  toggleSecao(secao: SecaoMapa): void {
    if (secao === 'encontre') {
      this.mostrarSecaoEncontre = !this.mostrarSecaoEncontre;
    }

    if (secao === 'minhasCaronas') {
      this.mostrarSecaoMinhasCaronas = !this.mostrarSecaoMinhasCaronas;
    }

    if (secao === 'avaliacoes') {
      this.mostrarSecaoAvaliacoes = !this.mostrarSecaoAvaliacoes;
    }
  }

  inicializarMapa(): void {
    if (!isBrowser() || !this.mapContainer?.nativeElement) return;

    const mapOptions = {
      center: new google.maps.LatLng(-23.5015, -47.4526),
      zoom: 12,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };

    this.map = new google.maps.Map(this.mapContainer.nativeElement, mapOptions);
    this.directionsRenderer = new google.maps.DirectionsRenderer();
    this.directionsRenderer.setMap(this.map);

    this.infoWindow = new google.maps.InfoWindow();
    this.atualizarMarcadoresViagens();
  }

  public tipoNormalizado(v: any): 'motorista' | 'passageiro' {
    const fromViagem = (v?.usuario?.tipoUsuario ?? v?.tipoUsuario ?? '')
      .toString()
      .trim()
      .toLowerCase();

    if (fromViagem === 'motorista' || fromViagem === 'passageiro') {
      return fromViagem as 'motorista' | 'passageiro';
    }

    const uid = Number(v?.idUsuario);
    const u = this.usuarios.find(x => Number(x?.idUsuario ?? x?.id) === uid);

    const fromUsuario = (u?.tipoUsuario ?? u?.tipo_usuario ?? '')
      .toString()
      .trim()
      .toLowerCase();

    return fromUsuario === 'motorista' ? 'motorista' : 'passageiro';
  }

  alterarFiltroTipo(tipo: FiltroTipo): void {
    this.filtroTipo = tipo;
  }

  viagensFiltradas(): any[] {
    const viagensDisponiveis = this.viagens.filter(v => !this.viagemTemConversaAceita(v));

    if (this.filtroTipo === 'todos') {
      return viagensDisponiveis;
    }

    return viagensDisponiveis.filter(v => this.tipoNormalizado(v) === this.filtroTipo);
  }

  obterStatusViagem(viagem: any): string {
    const statusBack = String(viagem?.statusViagem || viagem?.status || '')
      .trim()
      .toLowerCase();

    if (statusBack === 'aceita') return 'Aceita';
    if (statusBack === 'recusada') return 'Recusada';
    if (statusBack === 'concluida' || statusBack === 'concluída') return 'Concluída';
    if (statusBack === 'cancelada') return 'Cancelada';
    if (statusBack === 'pendente') return 'Pendente';
    if (statusBack === 'aguardando_confirmacao') return 'Aguardando confirmação';

    const datas = this.normalizarDatasViagem(viagem);

    const horarioSaida = viagem?.horarioSaida || viagem?.saida;
    if (datas.length > 0 && horarioSaida) {
      const ultimaData = datas[datas.length - 1];
      const dataHora = new Date(`${ultimaData}T${horarioSaida}`);

      if (!isNaN(dataHora.getTime()) && dataHora.getTime() < Date.now()) {
        return 'Concluída';
      }
    }

    return 'Pendente';
  }

  statusClasse(viagem: any): string {
    const status = this.obterStatusViagem(viagem);

    if (status === 'Aceita') return 'status-aceita';
    if (status === 'Recusada') return 'status-recusada';
    if (status === 'Aguardando confirmação') return 'status-aguardando';
    if (status === 'Concluída') return 'status-concluida';
    if (status === 'Cancelada') return 'status-cancelada';

    return 'status-pendente';
  }

  private viagemTemConversaAceita(viagem: any): boolean {
  const idViagem = Number(viagem?.idViagem ?? viagem?.id);

  if (!idViagem) return false;

  return this.conversas.some(c =>
    Number(c?.idViagem) === idViagem &&
    String(c?.status || '').toLowerCase() === 'aceita'
  );
}

private montarCaronasAceitas(): void {
  const idsAdicionados = new Set<number>();

  this.caronasAceitas = this.conversas
    .filter(c => String(c?.status || '').toLowerCase() === 'aceita')
    .filter(c =>
      Number(c?.idMotorista) === Number(this.meuId) ||
      Number(c?.idPassageiro) === Number(this.meuId)
    )
    .map(c => {
      const viagem = this.viagens.find(v =>
        Number(v?.idViagem ?? v?.id) === Number(c?.idViagem)
      );

      if (!viagem) return null;

      return {
        ...viagem,
        conversa: c,
        partida: viagem.partida,
        destino: viagem.destino,
        entrada: viagem.horarioEntrada,
        saida: viagem.horarioSaida,
        ajuda: viagem.ajudaDeCusto,
        diasAgendados: this.normalizarDatasViagem(viagem)
      };
    })
    .filter(Boolean)
    .filter((v: any) => {
      const id = Number(v?.idViagem ?? v?.id);
      if (!id || idsAdicionados.has(id)) return false;

      idsAdicionados.add(id);
      return true;
    });
}

  private normalizeUsuario(u: any) {
    const bruto = (u?.tipoUsuario ?? u?.tipo_usuario ?? u?.tipo ?? '')
      .toString()
      .toLowerCase()
      .trim();

    const tipoUsuario =
      bruto === 'motorista' || bruto === 'passageiro'
        ? bruto
        : (u?.tipoUsuario ?? u?.tipo_usuario ?? '').toString().toLowerCase();

    return {
      ...u,
      tipoUsuario
    };
  }

  private normalizarDatasViagem(v: any): string[] {
    const datas: string[] = [];

    if (Array.isArray(v?.diasAgendados)) datas.push(...v.diasAgendados);
    if (Array.isArray(v?.datasAgendadas)) datas.push(...v.datasAgendadas);
    if (Array.isArray(v?.datasRota)) datas.push(...v.datasRota);

    const ag1 = (v as any).viajem_agendada;
    const ag2 = (v as any).viajemAgendada;
    const ag3 = (v as any).agendamentos;

    const agendamentos: any[] | undefined =
      Array.isArray(ag1) ? ag1 :
      Array.isArray(ag2) ? ag2 :
      Array.isArray(ag3) ? ag3 :
      undefined;

    if (agendamentos) {
      agendamentos.forEach((a: any) => {
        if (a?.data) {
          const d = a.data.toString().slice(0, 10);
          datas.push(d);
        }
      });
    }

    return [...new Set(datas)]
      .filter((d: string) => typeof d === 'string' && d.length >= 10)
      .map((d: string) => d.slice(0, 10))
      .sort((a, b) => a.localeCompare(b));
  }

  carregarViagens(): void {
    this.http.get<any[]>(`${this.baseURL}/viagem`).subscribe({
      next: (res) => {
        this.viagens = (res || []).map(v => {
          const diasAgendados = this.normalizarDatasViagem(v);
          return { ...v, diasAgendados };
        });

        this.caronasOferecidas = this.viagens
          .filter(v => Number(v.idUsuario) === this.meuId && this.tipoNormalizado(v) === 'motorista')
          .map(v => ({
            ...v,
            partida: v.partida,
            destino: v.destino,
            entrada: v.horarioEntrada,
            saida: v.horarioSaida,
            ajuda: v.ajudaDeCusto,
            diasAgendados: v.diasAgendados
          }));

        this.caronasProcuradas = this.viagens
          .filter(v => Number(v.idUsuario) === this.meuId && this.tipoNormalizado(v) === 'passageiro')
          .map(v => ({
            ...v,
            partida: v.partida,
            destino: v.destino,
            entrada: v.horarioEntrada,
            saida: v.horarioSaida,
            ajuda: v.ajudaDeCusto,
            diasAgendados: v.diasAgendados
          }));

        this.montarCaronasAceitas();
        this.atualizarMarcadoresViagens();
        this.markLoaded('viagens');
      },
      error: (err) => {
        console.error('Erro ao carregar viagens:', err);
        this.markLoaded('viagens');
      }
    });
  }

  carregarConversas(): void {
  const token =
    localStorage.getItem('token') ||
    localStorage.getItem('accessToken') ||
    localStorage.getItem('jwt') ||
    this.usuarioLogado?.token ||
    '';

  const headers: any = token
    ? { Authorization: `Bearer ${token}` }
    : {};

  this.http.get<any[]>(`${this.baseURL}/conversas`, { headers }).subscribe({
    next: (res) => {
      this.conversas = Array.isArray(res) ? res : [];
      this.montarCaronasAceitas();
      this.markLoaded('conversas');
    },
    error: (err) => {
      console.error('Erro ao carregar conversas:', err);
      this.conversas = [];
      this.caronasAceitas = [];
      this.markLoaded('conversas');
    }
  });
}

  carregarUsuarios(): void {
    this.http.get<any[]>(`${this.baseURL}/usuario`).subscribe({
      next: (res) => {
        this.usuarios = Array.isArray(res) ? res.map(u => this.normalizeUsuario(u)) : [];

        if (this.avaliacoesRecebidas?.length) {
          this.avaliacoesRecebidas = this.avaliacoesRecebidas.map((a: any) => ({
            ...a,
            nomeAvaliador: this.pegarNomeUsuario(a.ID_Avaliador),
          }));
        }

        if (this.avaliacoesEnviadas?.length) {
          this.avaliacoesEnviadas = this.avaliacoesEnviadas.map((a: any) => ({
            ...a,
            nomeAvaliado: this.pegarNomeUsuario(a.ID_Avaliado),
          }));
        }

        this.markLoaded('usuarios');
      },
      error: (err) => {
        console.error('Erro ao carregar usuários:', err);
        this.markLoaded('usuarios');
      },
    });
  }

  private toISODate(d: Date): string {
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  private nomesMes = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];

  private gerarCalendarioDeUmMes(ano: number, mes: number): DiaCalendario[] {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const primeiroDia = new Date(ano, mes, 1);
    const primeiroDiaSemana = primeiroDia.getDay();
    const diasNoMes = new Date(ano, mes + 1, 0).getDate();

    const calendario: DiaCalendario[] = [];

    for (let i = 0; i < primeiroDiaSemana; i++) {
      calendario.push({
        dia: 0,
        dateStr: null,
        desabilitado: true
      });
    }

    for (let d = 1; d <= diasNoMes; d++) {
      const data = new Date(ano, mes, d);
      data.setHours(0, 0, 0, 0);

      const isPassado = data <= hoje;
      const isDomingo = data.getDay() === 0;

      calendario.push({
        dia: d,
        dateStr: this.toISODate(data),
        desabilitado: isPassado || isDomingo
      });
    }

    return calendario;
  }

  private gerarCalendariosMensais(): void {
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth();

    const proximoMesDate = new Date(anoAtual, mesAtual + 1, 1);
    const anoProximoMes = proximoMesDate.getFullYear();
    const mesProximo = proximoMesDate.getMonth();

    this.mesAtualLabel = `${this.nomesMes[mesAtual]} de ${anoAtual}`;

    const mesAtualObj: CalendarioMes = {
      key: `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}`,
      label: `${this.nomesMes[mesAtual]} de ${anoAtual}`,
      dias: this.gerarCalendarioDeUmMes(anoAtual, mesAtual),
    };

    const proximoMesObj: CalendarioMes = {
      key: `${anoProximoMes}-${String(mesProximo + 1).padStart(2, '0')}`,
      label: `${this.nomesMes[mesProximo]} de ${anoProximoMes}`,
      dias: this.gerarCalendarioDeUmMes(anoProximoMes, mesProximo),
    };

    this.calendariosMensais = [mesAtualObj, proximoMesObj];
    this.diasCalendario = mesAtualObj.dias;
  }

  private gerarDatasDoSemestreAtual(): string[] {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const ano = hoje.getFullYear();
    const mesAtual = hoje.getMonth();

    const primeiroSemestre = mesAtual <= 5;

    const inicioSemestre = primeiroSemestre
      ? new Date(ano, 0, 1)
      : new Date(ano, 6, 1);

    const fimSemestre = primeiroSemestre
      ? new Date(ano, 5, 30)
      : new Date(ano, 11, 31);

    inicioSemestre.setHours(0, 0, 0, 0);
    fimSemestre.setHours(0, 0, 0, 0);

    const datas: string[] = [];
    const dataAtual = new Date(inicioSemestre);

    while (dataAtual <= fimSemestre) {
      const diaSemana = dataAtual.getDay();
      const naoEhDomingo = diaSemana !== 0;
      const naoEhPassado = dataAtual >= hoje;

      if (naoEhDomingo && naoEhPassado) {
        datas.push(this.toISODate(dataAtual));
      }

      dataAtual.setDate(dataAtual.getDate() + 1);
    }

    return datas;
  }

  get resumoSemestre(): string {
    const datas = this.gerarDatasDoSemestreAtual();

    if (!datas.length) {
      return 'Nenhuma data futura encontrada para este semestre.';
    }

    const primeira = this.formatarDataTag(datas[0]);
    const ultima = this.formatarDataTag(datas[datas.length - 1]);

    return `${datas.length} datas serão geradas automaticamente, de ${primeira} até ${ultima}, considerando segunda a sábado e excluindo domingos.`;
  }

  onChangeModoVigencia(): void {
    if (this.modoVigencia === 'semestre') {
      this.mostrarCalendario = false;
    }
  }

  toggleCalendario(): void {
    this.mostrarCalendario = !this.mostrarCalendario;
  }

  isDiaSelecionado(cel: { dateStr: string | null }): boolean {
    if (!cel.dateStr) return false;
    return this.datasRota.includes(cel.dateStr);
  }

  onClickDia(cel: { dateStr: string | null; desabilitado: boolean }): void {
    if (!cel.dateStr || cel.desabilitado) return;

    const idx = this.datasRota.indexOf(cel.dateStr);
    if (idx >= 0) {
      this.datasRota = this.datasRota.filter(d => d !== cel.dateStr);
    } else {
      this.datasRota = [...this.datasRota, cel.dateStr].sort((a, b) => a.localeCompare(b));
    }
  }

  removerDataRota(data: string): void {
    this.datasRota = this.datasRota.filter(d => d !== data);
  }

  formatarDataTag(d: string): string {
    if (!d || d.length < 10) return d;
    const [, mes, dia] = d.split('-');
    return `${dia}/${mes}`;
  }

  private montarPartidaCompleta(): string {
    const origemLimpa = String(this.origem || '').trim();
    const cidadeLimpa = String(this.cidadePartida || '').trim();

    if (origemLimpa && cidadeLimpa) {
      return `${origemLimpa}, ${cidadeLimpa}`;
    }

    return origemLimpa || cidadeLimpa;
  }

  private extrairOrigemECidade(partidaCompleta?: string): { origem: string; cidade: string } {
  const texto = String(partidaCompleta || '').trim();

  if (!texto) {
    return { origem: '', cidade: '' };
  }

  const partes = texto.split(',').map(p => p.trim()).filter(Boolean);

  if (partes.length >= 2) {
    return {
      origem: partes.slice(0, partes.length - 1).join(', '),
      cidade: partes[partes.length - 1]
    };
  }

  return {
    origem: texto,
    cidade: ''
  };
}

  tracarRota(): void {
    if (!this.origem || !this.cidadePartida || !this.destino || !this.entradaFatec || !this.saidaFatec) {
      alert('Preencha todos os campos.');
      return;
    }

    const datasSelecionadas =
      this.modoVigencia === 'semestre'
        ? this.gerarDatasDoSemestreAtual()
        : this.datasRota;

    if (!datasSelecionadas.length) {
      alert(
        this.modoVigencia === 'semestre'
          ? 'Não foi possível gerar datas para o semestre atual.'
          : 'Selecione pelo menos um dia para que esta rota seja válida.'
      );
      return;
    }

    const partidaCompleta = this.montarPartidaCompleta();

    const dadosViagem: any = {
      tipoUsuario: this.tipoCarona === 'oferecer' ? 'motorista' : 'passageiro',
      partida: partidaCompleta,
      destino: this.destino,
      horarioEntrada: this.entradaFatec,
      horarioSaida: this.saidaFatec,
      ajudaDeCusto: this.ajudaCusto ? this.ajudaCusto.toString() : '0',
      idUsuario: this.meuId,
      datasAgendadas: datasSelecionadas
    };

    const request$ = this.modoEdicaoAtivo && this.idViagemEdicao
      ? this.http.put(`${this.baseURL}/viagem/${this.idViagemEdicao}`, dadosViagem)
      : this.http.post(`${this.baseURL}/viagem`, dadosViagem);

    request$.subscribe({
      next: () => {
        alert(this.modoEdicaoAtivo ? 'Rota atualizada com sucesso!' : 'Rota cadastrada com sucesso!');

        this.carregarViagens();

        if (this.modoEdicaoAtivo) {
          this.cancelarEdicao(false);
        }

        if (this.modoVigencia === 'mensal') {
          this.datasRota = [];
        }

        this.mostrarCalendario = false;

        if (isBrowser() && this.mapContainer?.nativeElement) {
          setTimeout(() => {
            this.mapContainer.nativeElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            });
          }, 300);
        }
      },
      error: (err) => {
        console.error('Erro ao cadastrar viagem:', err);
        alert(this.modoEdicaoAtivo ? 'Erro ao atualizar rota.' : 'Erro ao cadastrar rota.');
      }
    });

    if (isBrowser()) {
      const request: google.maps.DirectionsRequest = {
        origin: partidaCompleta,
        destination: this.destino,
        travelMode: google.maps.TravelMode.DRIVING
      };

      const directionsService = new google.maps.DirectionsService();

      directionsService.route(request, (result, status) => {
        if (status === 'OK' && result) {
          this.directionsRenderer.setDirections(result);
        }
      });
    }
  }

  mostrarRota(partida: string, destino: string): void {
    if (isBrowser()) {
      const directionsService = new google.maps.DirectionsService();
      const request: google.maps.DirectionsRequest = {
        origin: partida,
        destination: destino,
        travelMode: google.maps.TravelMode.DRIVING
      };

      directionsService.route(request, (result, status) => {
        if (status === 'OK' && result) this.directionsRenderer.setDirections(result);
      });

      setTimeout(
        () => this.mapContainer.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' }),
        100
      );
    }
  }

  ehMinhaCarona(viagem: any): boolean {
    return Number(viagem?.idUsuario) === Number(this.meuId);
  }

  editarCarona(viagem: any): void {
  if (!viagem?.idViagem && !viagem?.id) {
    alert('Não foi possível identificar esta carona para edição.');
    return;
  }

  const { origem, cidade } = this.extrairOrigemECidade(viagem.partida);

  this.modoEdicaoAtivo = true;
  this.idViagemEdicao = Number(viagem.idViagem || viagem.id);

  this.tipoCarona = this.tipoNormalizado(viagem) === 'motorista' ? 'oferecer' : 'procurar';
  this.origem = origem;
  this.cidadePartida = cidade;
  this.destino = viagem.destino || '';
  this.entradaFatec = viagem.horarioEntrada || viagem.entrada || '';
  this.saidaFatec = viagem.horarioSaida || viagem.saida || '';
  this.ajudaCusto = viagem.ajudaDeCusto || viagem.ajuda || null;

  const datas = this.normalizarDatasViagem(viagem);
  this.datasRota = datas;
  this.modoVigencia = datas.length >= 20 ? 'semestre' : 'mensal';

  this.mostrarCalendario = false;

  if (isBrowser()) {
    setTimeout(() => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }, 100);
  }
}

cancelarEdicao(limparFormulario: boolean = true): void {
  this.modoEdicaoAtivo = false;
  this.idViagemEdicao = null;

  if (!limparFormulario) return;

  this.tipoCarona = 'oferecer';
  this.origem = '';
  this.cidadePartida = '';
  this.destino = '';
  this.entradaFatec = '';
  this.saidaFatec = '';
  this.ajudaCusto = null;
  this.datasRota = [];
  this.modoVigencia = 'mensal';
  this.mostrarCalendario = false;
}

  abrirConversa(viagem: any): void {
    if (!viagem?.idViagem) {
      alert('Não foi possível abrir a conversa desta carona.');
      return;
    }

    this.router.navigate(['/conversas'], {
      queryParams: {
        idViagem: viagem.idViagem
      }
    });
  }

  enviarAvaliacao() {
    if (!this.avaliacaoSelecionada) return alert('Por favor, selecione uma nota.');

    const avaliacao = {
      ID_Avaliador: this.meuId,
      ID_Avaliado: this.idUsuarioSelecionado,
      Comentario: this.comentarioAvaliacao,
      Estrelas: this.avaliacaoSelecionada
    };

    this.http.post(`${this.baseURL}/avaliacao`, avaliacao).subscribe({
      next: () => {
        alert(`✅ Avaliação enviada! Você avaliou ${this.nomeUsuarioSelecionado} com ${this.avaliacaoSelecionada} ⭐`);
        this.mostrarAvaliacao = false;
        this.avaliacaoSelecionada = 0;
        this.comentarioAvaliacao = '';
        this.carregarAvaliacoes();
      },
      error: (err) => {
        console.error(err);
        alert('Erro ao enviar avaliação.');
      }
    });
  }

  carregarAvaliacoes(): void {
    this.http.get<any[]>(`${this.baseURL}/avaliacao`).subscribe({
      next: (res) => {
        this.avaliacoesRecebidas = res
          .filter(a => a.ID_Avaliado === this.meuId)
          .map(a => ({ ...a, nomeAvaliador: this.pegarNomeUsuario(a.ID_Avaliador) }));

        this.avaliacoesEnviadas = res
          .filter(a => a.ID_Avaliador === this.meuId)
          .map(a => ({ ...a, nomeAvaliado: this.pegarNomeUsuario(a.ID_Avaliado) }));

        this.markLoaded('avaliacoes');
      },
      error: (err) => {
        console.error('Erro ao carregar avaliações:', err);
        this.markLoaded('avaliacoes');
      }
    });
  }

  pegarNomeUsuario(id: number): string {
    const usuario = this.usuarios.find(u => u.id === id || u.idUsuario === id);
    return usuario ? usuario.nome : 'Usuário';
  }

  obterFotoUsuario(
    email: string,
    genero: any,
    idUsuario?: number,
    usuarioViagem?: any
  ): string {
    const urlDireta =
      usuarioViagem?.fotoUrl ||
      usuarioViagem?.foto ||
      usuarioViagem?.foto_perfil;

    if (urlDireta) return urlDireta;

    const usuarioEncontrado = this.usuarios.find(u =>
      Number(u?.idUsuario ?? u?.id) === Number(idUsuario) ||
      u?.email?.trim().toLowerCase() === (email || '').trim().toLowerCase()
    );

    const url =
      usuarioEncontrado?.fotoUrl ||
      usuarioEncontrado?.foto ||
      usuarioEncontrado?.foto_perfil;

    if (url) return url;

    if (genero === true) return 'assets/profile_man.jpeg';
    if (genero === false) return 'assets/profile_woman.jpeg';

    return 'assets/usuario.png';
  }

  excluirCarona(idViagem: number) {
    if (!confirm('Tem certeza que deseja excluir esta carona?')) return;

    this.http.delete(`${this.baseURL}/viagem/${idViagem}`).subscribe({
      next: () => {
        alert('Carona excluída com sucesso!');
        this.carregarViagens();
      },
      error: (err) => {
        console.error('Erro ao excluir carona:', err);
        alert('Erro ao excluir carona. Tente novamente.');
      }
    });
  }

  formatDiasViagem(v: any): string {
    if (Array.isArray(v?.diasAgendados) && v.diasAgendados.length) {
      return v.diasAgendados.map((d: string) => this.formatarDataTag(d)).join(', ');
    }

    if (Array.isArray(v?.datasAgendadas) && v.datasAgendadas.length) {
      return v.datasAgendadas.map((d: string) => this.formatarDataTag(d)).join(', ');
    }

    if (Array.isArray(v?.datasRota) && v.datasRota.length) {
      return v.datasRota.map((d: string) => this.formatarDataTag(d)).join(', ');
    }

    if (typeof v?.dias === 'string' && v.dias.trim().length) {
      return v.dias;
    }

    return '';
  }

  resumirDiasRota(v: any): string {
    const datas =
      v?.diasAgendados ||
      v?.datasAgendadas ||
      v?.datasRota ||
      [];

    if (!Array.isArray(datas) || !datas.length) {
      return '';
    }

    const datasOrdenadas = [...datas].sort();

    if (datasOrdenadas.length >= 20) {
      return `Semestre fechado: ${this.formatarDataTag(datasOrdenadas[0])} até ${this.formatarDataTag(datasOrdenadas[datasOrdenadas.length - 1])}`;
    }

    return datasOrdenadas
      .map((d: string) => this.formatarDataTag(d))
      .join(' ');
  }

  private atualizarMarcadoresViagens(): void {
    if (!isBrowser()) return;
    if (!this.map) return;
    if (!this.viagens || !this.viagens.length) return;

    this.markers.forEach(m => m.setMap(null));
    this.markers = [];

    const geocoder = new google.maps.Geocoder();

    this.viagens.forEach((v) => {
      const partida = v.partida;
      const destino = v.destino;

      if (!partida) return;

      geocoder.geocode({ address: partida }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const pos = results[0].geometry.location;
          const nome = this.pegarNomeUsuario(Number(v.idUsuario));
          const tipo = this.tipoNormalizado(v);

          const marker = new google.maps.Marker({
            map: this.map,
            position: pos,
            label: nome && nome.length ? nome[0].toUpperCase() : undefined,
          });

          marker.addListener('click', () => {
            const partidaLabel = partida || '';
            const destinoLabel = destino || '';
            const entrada = v.horarioEntrada || v.horario_entrada || '';
            const saida = v.horarioSaida || v.horario_saida || '';
            const tipoLegivel = tipo === 'motorista'
              ? 'Motorista (oferece carona)'
              : 'Passageiro (procura carona)';

            const diasLabel = this.resumirDiasRota(v);
            const diasHtml = diasLabel
              ? `<div><strong>Dias:</strong> ${diasLabel}</div>`
              : '';

            const conteudo =
              `<div style="min-width:220px;font-family:Arial, sans-serif;font-size:12px;">
                <div style="font-weight:bold;font-size:13px;margin-bottom:2px;">${nome}</div>
                <div style="color:#555;margin-bottom:4px;">${tipoLegivel}</div>
                <div style="margin-bottom:4px;">
                  <div><strong>Partida:</strong> ${partidaLabel}</div>
                  <div><strong>Destino:</strong> ${destinoLabel}</div>
                  <div><strong>Entrada:</strong> ${entrada}</div>
                  <div><strong>Saída:</strong> ${saida}</div>
                  ${diasHtml}
                </div>
                <button id="btnMostrarRotaMarker"
                        style="margin-top:4px;padding:4px 8px;border:none;border-radius:4px;
                               background:#1976d2;color:#fff;cursor:pointer;">
                  Visualizar rota
                </button>
              </div>`;

            this.infoWindow.setContent(conteudo);
            this.infoWindow.open(this.map, marker);

            google.maps.event.addListenerOnce(this.infoWindow, 'domready', () => {
              const btn = document.getElementById('btnMostrarRotaMarker');
              if (btn) {
                btn.onclick = () => this.mostrarRota(partidaLabel, destinoLabel);
              }
            });
          });

          this.markers.push(marker);
        }
      });
    });
  }

  private getCaronasParaExportar() {
    const oferecidas = (this.caronasOferecidas || []).map(c => ({
      Partida: c.partida, Destino: c.destino, Entrada: c.entrada,
      Saida: c.saida, Ajuda: String(c.ajuda ?? ''), Tipo: 'Motorista'
    }));

    const procuradas = (this.caronasProcuradas || []).map(c => ({
      Partida: c.partida, Destino: c.destino, Entrada: c.entrada,
      Saida: c.saida, Ajuda: String(c.ajuda ?? ''), Tipo: 'Passageiro'
    }));

    return [...oferecidas, ...procuradas];
  }

  async exportarPDF(): Promise<void> {
    const linhas = this.getCaronasParaExportar();
    if (!linhas.length) return alert('Sem caronas para exportar.');

    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ]);

    const doc = new jsPDF('landscape', 'pt', 'a4');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Relatório de Caronas - FaculRide', 40, 40);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 40, 58);

    const head = [['Partida', 'Destino', 'Entrada', 'Saída', 'Ajuda (R$)', 'Tipo']];
    const body = linhas.map(l => [l.Partida, l.Destino, l.Entrada, l.Saida, l.Ajuda, l.Tipo]);

    autoTable(doc, {
      head,
      body,
      startY: 70,
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [43, 140, 255], textColor: 255 }
    });

    doc.save(`caronas_${this.timestamp()}.pdf`);
  }

  async exportarExcel(): Promise<void> {
    const linhas = this.getCaronasParaExportar();

    if (!linhas.length) {
      alert('Sem caronas para exportar.');
      return;
    }

    try {
      const xlsxMod: any = await import('xlsx');
      const XLSX: any = xlsxMod?.default ?? xlsxMod;

      const fsMod: any = await import('file-saver');
      const saveAs: any = fsMod?.saveAs ?? fsMod?.default;

      const ws = XLSX.utils.json_to_sheet(linhas);

      (ws as any)['!cols'] = [
        { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Caronas');

      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
      });

      if (typeof saveAs === 'function') {
        saveAs(blob, `caronas_${this.timestamp()}.xlsx`);
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `caronas_${this.timestamp()}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Erro ao exportar Excel:', err);
      alert('Falha ao exportar Excel.');
    }
  }

  private timestamp(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
  }
}
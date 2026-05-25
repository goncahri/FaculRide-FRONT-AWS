import { Component, ElementRef, ViewChild, AfterViewInit, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
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
  private _loads = { usuarios: false, viagens: false, avaliacoes: false };
  private markLoaded(key: 'usuarios' | 'viagens' | 'avaliacoes') {
    this._loads[key] = true;
    if (this._loads.usuarios && this._loads.viagens && this._loads.avaliacoes) {
      this.carregando = false;
    }
  }

  tipoCarona: string = 'oferecer';
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

  constructor(private http: HttpClient) {
    this.gerarCalendariosMensais();
  }

  ngOnInit(): void {
    this.carregando = true;
    this._loads = { usuarios: false, viagens: false, avaliacoes: false };

    this.carregarUsuarios();
    this.carregarViagens();
    this.carregarAvaliacoes();
  }

  ngAfterViewInit(): void {
    this.inicializarMapa();
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

    return [...new Set(datas)];
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
            partida: v.partida,
            destino: v.destino,
            entrada: v.horarioEntrada,
            saida: v.horarioSaida,
            ajuda: v.ajudaDeCusto,
            diasAgendados: v.diasAgendados
          }));

        this.atualizarMarcadoresViagens();
        this.markLoaded('viagens');
      },
      error: (err) => {
        console.error('Erro ao carregar viagens:', err);
        this.markLoaded('viagens');
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

    this.http.post(`${this.baseURL}/viagem`, dadosViagem).subscribe({
      next: () => {
        alert('Rota cadastrada com sucesso!');
        this.carregarViagens();

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
        alert('Erro ao cadastrar rota.');
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

  abrirWhatsapp(nome: string, idUsuario: number, numeroWhatsapp: string) {
    if (!numeroWhatsapp) return alert('Número de WhatsApp não disponível');
    if (isBrowser()) window.open(`https://wa.me/${numeroWhatsapp}`, '_blank');

    setTimeout(() => {
      if (confirm(`A carona com ${nome} foi realizada? Deseja avaliar?`)) {
        this.nomeUsuarioSelecionado = nome;
        this.idUsuarioSelecionado = idUsuario;
        this.mostrarAvaliacao = true;
      }
    }, 1000);
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

  obterFotoUsuario(email: string, genero: any): string {
    const u = this.usuarios.find(x => x?.email?.trim().toLowerCase() === (email || '').trim().toLowerCase());
    const url = u?.foto || u?.fotoUrl;
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

            const diasLabel = this.formatDiasViagem(v);
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
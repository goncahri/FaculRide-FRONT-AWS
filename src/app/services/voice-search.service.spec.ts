import { TestBed } from '@angular/core/testing';
import { VoiceSearchService } from './voice-search.service';

describe('VoiceSearchService', () => {
  let service: VoiceSearchService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VoiceSearchService);
  });

  it('deve interpretar intenção, rota e horário de uma consulta falada', () => {
    const result = service.analyze(
      'Quero uma carona de Sorocaba para a Fatec às sete da noite'
    );

    expect(result.intent).toBe('buscar_carona');
    expect(result.entities.origem).toBe('sorocaba');
    expect(result.entities.destino).toBe('fatec');
    expect(result.entities.horario).toBe('19:00');
    expect(result.relevantTokens).toContain('sorocaba');
  });

  it('deve ordenar primeiro a carona semanticamente mais compatível', () => {
    const rides = [
      {
        idViagem: 1,
        partida: 'Itu',
        destino: 'Centro de Sorocaba',
        horarioEntrada: '08:00',
        tipoUsuario: 'motorista'
      },
      {
        idViagem: 2,
        partida: 'Sorocaba',
        destino: 'FATEC Votorantim',
        horarioEntrada: '19:10',
        tipoUsuario: 'motorista'
      }
    ];

    const analysis = service.analyze(
      'Procuro carona de Sorocaba para a faculdade às 19 horas'
    );
    const results = service.search(rides, analysis, () => 'motorista');

    expect(results[0].ride.idViagem).toBe(2);
    expect(results[0].reasons).toContain('origem compatível');
    expect(results[0].reasons).toContain('destino compatível');
  });
});

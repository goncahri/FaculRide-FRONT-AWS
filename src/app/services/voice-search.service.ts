import { Injectable } from '@angular/core';

export type VoiceSearchIntent =
  | 'buscar_carona'
  | 'oferecer_carona'
  | 'desconhecida';

export interface VoiceSearchEntities {
  origem?: string;
  destino?: string;
  horario?: string;
}

export interface VoiceSearchAnalysis {
  originalText: string;
  normalizedText: string;
  tokens: string[];
  relevantTokens: string[];
  stemmedTokens: string[];
  intent: VoiceSearchIntent;
  entities: VoiceSearchEntities;
}

export interface VoiceSearchResult<T = any> {
  ride: T;
  score: number;
  reasons: string[];
}

@Injectable({
  providedIn: 'root'
})
export class VoiceSearchService {
  private readonly stopwords = new Set([
    'a', 'ao', 'aos', 'as', 'com', 'da', 'das', 'de', 'do', 'dos', 'e',
    'eu', 'me', 'meu', 'minha', 'na', 'nas', 'no', 'nos', 'o', 'os',
    'por', 'pra', 'para', 'que', 'uma', 'um'
  ]);

  private readonly numberWords: Record<string, number> = {
    uma: 1, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6,
    sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12,
    treze: 13, quatorze: 14, quinze: 15, dezesseis: 16,
    dezessete: 17, dezoito: 18, dezenove: 19, vinte: 20,
    'vinte e uma': 21, 'vinte e duas': 22, 'vinte e tres': 23
  };

  analyze(text: string): VoiceSearchAnalysis {
    const normalizedText = this.normalize(text);
    const tokens = this.tokenize(normalizedText);
    const relevantTokens = tokens.filter(token => !this.stopwords.has(token));

    return {
      originalText: text.trim(),
      normalizedText,
      tokens,
      relevantTokens,
      stemmedTokens: relevantTokens.map(token => this.stem(token)),
      intent: this.detectIntent(normalizedText),
      entities: this.extractEntities(normalizedText)
    };
  }

  search<T extends Record<string, any>>(
    rides: T[],
    analysis: VoiceSearchAnalysis,
    rideType: (ride: T) => 'motorista' | 'passageiro'
  ): VoiceSearchResult<T>[] {
    return rides
      .map(ride => this.scoreRide(ride, analysis, rideType(ride)))
      .filter(result => result.score > 0)
      .sort((a, b) => b.score - a.score);
  }

  intentLabel(intent: VoiceSearchIntent): string {
    if (intent === 'buscar_carona') return 'Buscar carona';
    if (intent === 'oferecer_carona') return 'Oferecer carona';
    return 'Consulta geral';
  }

  normalize(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9:\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private tokenize(text: string): string[] {
    return text ? text.split(' ') : [];
  }

  private detectIntent(text: string): VoiceSearchIntent {
    if (/\b(oferecer|ofereco|levar|levo|tenho vaga|dar carona)\b/.test(text)) {
      return 'oferecer_carona';
    }

    if (/\b(buscar|busco|procurar|procuro|preciso|quero|encontrar|carona)\b/.test(text)) {
      return 'buscar_carona';
    }

    return 'desconhecida';
  }

  private extractEntities(text: string): VoiceSearchEntities {
    const entities: VoiceSearchEntities = {};
    const routeMatch = text.match(
      /\b(?:saindo |partindo )?de\s+(.+?)\s+(?:para|ate)\s+(.+?)(?=\s+(?:as|por volta|com saida|no horario)|$)/
    );

    if (routeMatch) {
      entities.origem = this.cleanEntity(routeMatch[1]);
      entities.destino = this.cleanEntity(routeMatch[2]);
    } else {
      const destinationMatch = text.match(/\b(?:para|ate)\s+(.+?)(?=\s+(?:as|por volta|com saida)|$)/);
      if (destinationMatch) entities.destino = this.cleanEntity(destinationMatch[1]);
    }

    entities.horario = this.extractTime(text);
    return entities;
  }

  private extractTime(text: string): string | undefined {
    const numeric = text.match(/\b(?:as|por volta das?)\s+(\d{1,2})(?::(\d{2}))?/);
    if (numeric) {
      return this.formatTime(Number(numeric[1]), Number(numeric[2] || 0), text);
    }

    const entries = Object.entries(this.numberWords).sort((a, b) => b[0].length - a[0].length);
    for (const [word, hour] of entries) {
      if (new RegExp(`\\b(?:as|por volta das?)\\s+${word}\\b`).test(text)) {
        return this.formatTime(hour, 0, text);
      }
    }

    return undefined;
  }

  private formatTime(hour: number, minute: number, text: string): string {
    let adjustedHour = hour;
    if (/\b(?:da|de) (?:tarde|noite)\b/.test(text) && adjustedHour < 12) {
      adjustedHour += 12;
    }
    if (/\b(?:da|de) madrugada\b/.test(text) && adjustedHour === 12) {
      adjustedHour = 0;
    }

    return `${String(adjustedHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  private scoreRide<T extends Record<string, any>>(
    ride: T,
    analysis: VoiceSearchAnalysis,
    type: 'motorista' | 'passageiro'
  ): VoiceSearchResult<T> {
    let score = 0;
    const reasons: string[] = [];
    const partida = this.normalize(String(ride['partida'] || ''));
    const destino = this.normalize(String(ride['destino'] || ''));
    const entrada = String(ride['horarioEntrada'] || ride['entrada'] || '').slice(0, 5);
    const saida = String(ride['horarioSaida'] || ride['saida'] || '').slice(0, 5);
    const searchableText = `${partida} ${destino} ${entrada} ${saida}`;

    if (analysis.entities.origem && this.semanticMatch(partida, analysis.entities.origem)) {
      score += 5;
      reasons.push('origem compatível');
    }

    if (analysis.entities.destino && this.semanticMatch(destino, analysis.entities.destino)) {
      score += 5;
      reasons.push('destino compatível');
    }

    if (analysis.entities.horario) {
      const requestedMinutes = this.timeToMinutes(analysis.entities.horario);
      const rideTimes = [entrada, saida].filter(Boolean).map(time => this.timeToMinutes(time));
      const closest = rideTimes.length
        ? Math.min(...rideTimes.map(time => Math.abs(time - requestedMinutes)))
        : Number.POSITIVE_INFINITY;

      if (closest <= 30) {
        score += 4;
        reasons.push('horário próximo');
      } else if (closest <= 90) {
        score += 2;
        reasons.push('horário aproximado');
      }
    }

    const matchedTokens = analysis.relevantTokens.filter(token =>
      token.length > 2 && this.semanticMatch(searchableText, token)
    );
    if (matchedTokens.length) {
      score += Math.min(matchedTokens.length, 3);
      reasons.push('termos relacionados');
    }

    if (analysis.intent === 'buscar_carona' && type === 'motorista') {
      score += 2;
      reasons.push('carona oferecida');
    }
    if (analysis.intent === 'oferecer_carona' && type === 'passageiro') {
      score += 2;
      reasons.push('passageiro procurando');
    }

    const hasRequestedEntity = !!(
      analysis.entities.origem || analysis.entities.destino || analysis.entities.horario
    );
    if (hasRequestedEntity && reasons.every(reason =>
      reason === 'carona oferecida' || reason === 'passageiro procurando'
    )) {
      score = 0;
      reasons.length = 0;
    }

    return { ride, score, reasons };
  }

  private semanticMatch(source: string, query: string): boolean {
    const normalizedSource = this.expandSynonyms(this.normalize(source));
    const normalizedQuery = this.expandSynonyms(this.normalize(query));

    if (normalizedSource.includes(normalizedQuery) || normalizedQuery.includes(normalizedSource)) {
      return true;
    }

    const sourceStems = this.tokenize(normalizedSource).map(token => this.stem(token));
    const queryStems = this.tokenize(normalizedQuery)
      .filter(token => !this.stopwords.has(token))
      .map(token => this.stem(token));

    return queryStems.some(token => token.length > 2 && sourceStems.includes(token));
  }

  private expandSynonyms(text: string): string {
    return text
      .replace(/\b(faculdade|facul|campus)\b/g, 'fatec')
      .replace(/\b(centro universitario|universidade)\b/g, 'fatec');
  }

  private stem(token: string): string {
    if (token.length <= 4) return token;

    return token
      .replace(/(mente|coes|cao|ando|endo|indo|ados|adas|idos|idas)$/g, '')
      .replace(/(es|os|as|s)$/g, '');
  }

  private cleanEntity(value: string): string {
    return value
      .replace(/\b(?:quero|preciso|buscar|procurar|uma|carona)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^(?:a|o|as|os)\s+/, '');
  }

  private timeToMinutes(time: string): number {
    const [hour, minute] = time.split(':').map(Number);
    return hour * 60 + (minute || 0);
  }
}

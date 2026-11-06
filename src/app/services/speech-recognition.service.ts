import { Injectable } from '@angular/core';
import { isBrowser } from '../utils/is-browser';

type SpeechRecognitionConstructor = new () => any;

@Injectable({
  providedIn: 'root'
})
export class SpeechRecognitionService {
  private recognition: any | null = null;
  private listening = false;

  isSupported(): boolean {
    if (!isBrowser()) return false;

    const browserWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };

    return !!(
      browserWindow.SpeechRecognition ||
      browserWindow.webkitSpeechRecognition
    );
  }

  isListening(): boolean {
    return this.listening;
  }

  listen(): Promise<string> {
    if (!this.isSupported()) {
      return Promise.reject(
        new Error('Seu navegador não oferece reconhecimento de voz. Use o Google Chrome.')
      );
    }

    if (this.listening) {
      return Promise.reject(new Error('O reconhecimento de voz já está em andamento.'));
    }

    const browserWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition =
      browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition!;

    return new Promise<string>((resolve, reject) => {
      const recognition = new Recognition();
      let completed = false;

      this.recognition = recognition;
      this.listening = true;

      recognition.lang = 'pt-BR';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      const finish = () => {
        this.listening = false;
        this.recognition = null;
      };

      recognition.onresult = (event: any) => {
        completed = true;
        const transcript = event?.results?.[0]?.[0]?.transcript?.trim() || '';
        finish();

        if (transcript) {
          resolve(transcript);
        } else {
          reject(new Error('Nenhuma fala foi reconhecida. Tente novamente.'));
        }
      };

      recognition.onerror = (event: any) => {
        completed = true;
        finish();
        reject(new Error(this.errorMessage(event?.error)));
      };

      recognition.onend = () => {
        finish();
        if (!completed) {
          reject(new Error('Nenhuma fala foi reconhecida. Tente novamente.'));
        }
      };

      try {
        recognition.start();
      } catch {
        finish();
        reject(new Error('Não foi possível iniciar o microfone. Tente novamente.'));
      }
    });
  }

  stop(): void {
    if (!this.recognition) return;
    this.recognition.stop();
  }

  private errorMessage(code?: string): string {
    if (code === 'not-allowed' || code === 'service-not-allowed') {
      return 'Permita o acesso ao microfone para usar a busca por voz.';
    }

    if (code === 'no-speech') {
      return 'Não detectamos sua voz. Fale novamente, de forma pausada.';
    }

    if (code === 'audio-capture') {
      return 'Nenhum microfone foi encontrado neste dispositivo.';
    }

    if (code === 'network') {
      return 'O serviço de reconhecimento de voz está indisponível no momento.';
    }

    return 'Não foi possível reconhecer sua voz. Tente novamente.';
  }
}

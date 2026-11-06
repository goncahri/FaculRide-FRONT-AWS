// src/app/services/storage.service.ts

import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class StorageService {

  private readonly isBrowser: boolean;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  /** Salva um valor no localStorage */
  setItem(key: string, value: string): void {
    if (!this.isBrowser) return;

    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error(`Erro ao salvar ${key} no localStorage:`, error);
    }
  }

  /** Recupera um valor do localStorage */
  getItem(key: string): string | null {
    if (!this.isBrowser) return null;

    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error(`Erro ao recuperar ${key} do localStorage:`, error);
      return null;
    }
  }

  /** Salva objetos convertendo-os para JSON */
  setObject<T>(key: string, value: T): void {
    if (!this.isBrowser) return;

    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Erro ao salvar objeto ${key}:`, error);
    }
  }

  /** Recupera objetos convertendo JSON */
  getObject<T>(key: string): T | null {
    const value = this.getItem(key);

    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Erro ao interpretar JSON de ${key}:`, error);
      return null;
    }
  }

  /** Remove um item específico */
  removeItem(key: string): void {
    if (!this.isBrowser) return;

    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Erro ao remover ${key}:`, error);
    }
  }

  /** Verifica se está executando no navegador */
  isAvailable(): boolean {
    return this.isBrowser;
  }
}

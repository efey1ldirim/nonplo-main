/**
 * Store Module
 * Context Manager ayarlarını saklama ve yönetme
 */

import fs from 'fs/promises';
import path from 'path';
import { STORE_CONFIG } from './config';

interface ContextManagerSettings {
  enabled: boolean;
  liveBudget: number;
  hardCap: number;
  autoOptimize: boolean;
  enablePiiStripping: boolean;
  debugMode: boolean;
  lastOptimization?: Date;
  usage?: {
    totalTokensUsed: number;
    totalCost: number;
    requestCount: number;
    lastReset: Date;
  };
  optimizationLevel?: 'high' | 'medium' | 'low';
}

export class Store {
  private settingsPath: string;
  private backupPath: string;
  private cachedSettings: ContextManagerSettings | null = null;
  private lastLoadTime: number = 0;

  constructor() {
    this.settingsPath = path.resolve(STORE_CONFIG.SETTINGS_FILE);
    this.backupPath = path.resolve(STORE_CONFIG.BACKUP_FILE);
    // Directory creation will be handled lazily in loadSettings
  }

  /**
   * Ayarları yükle
   */
  async loadSettings(): Promise<ContextManagerSettings> {
    try {
      // Cache kontrolü (5 saniye)
      const now = Date.now();
      if (this.cachedSettings && now - this.lastLoadTime < 5000) {
        return this.cachedSettings;
      }

      // Directory'nin var olduğunu garantile
      await this.ensureDirectoryExists();

      const data = await fs.readFile(this.settingsPath, 'utf-8');
      const settings = JSON.parse(data) as ContextManagerSettings;
      
      // Eksik alanları default değerlerle doldur
      const completeSettings = this.validateAndCompleteSettings(settings);
      
      this.cachedSettings = completeSettings;
      this.lastLoadTime = now;
      
      return completeSettings;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // Dosya yoksa default ayarları oluştur (sadece bir kez log)
        if (!this.cachedSettings) {
          console.log('📁 Context Manager ayar dosyası bulunamadı, default ayarlar oluşturuluyor');
        }
        return await this.createDefaultSettings();
      }
      
      console.error('❌ Context Manager ayarları yüklenirken hata:', error);
      
      // Backup'tan yüklemeyi dene
      try {
        const backupData = await fs.readFile(this.backupPath, 'utf-8');
        const backupSettings = JSON.parse(backupData) as ContextManagerSettings;
        console.log('🔄 Backup ayarlar yüklendi');
        return this.validateAndCompleteSettings(backupSettings);
      } catch (backupError) {
        console.warn('⚠️ Backup ayarları da yüklenemedi, default ayarlar kullanılıyor');
        return await this.createDefaultSettings();
      }
    }
  }

  /**
   * Ayarları kaydet
   */
  async saveSettings(settings: Partial<ContextManagerSettings>): Promise<void> {
    try {
      let currentSettings: ContextManagerSettings;
      
      // Eğer cache'de varsa kullan, yoksa default ayarları kullan (infinite loop'u önle)
      if (this.cachedSettings) {
        currentSettings = this.cachedSettings;
      } else {
        // İlk kez ayar oluşturuluyorsa default'ları kullan
        currentSettings = {
          ...STORE_CONFIG.DEFAULT_SETTINGS,
          usage: {
            totalTokensUsed: 0,
            totalCost: 0,
            requestCount: 0,
            lastReset: new Date()
          }
        };
      }
      
      const updatedSettings = { ...currentSettings, ...settings };
      
      // Backup oluştur (sadece cache'de ayar varsa)
      if (this.cachedSettings) {
        await this.createBackup(currentSettings);
      }
      
      // Ayarları kaydet
      await fs.writeFile(
        this.settingsPath, 
        JSON.stringify(updatedSettings, null, 2), 
        'utf-8'
      );
      
      // Cache'i güncelle
      this.cachedSettings = updatedSettings;
      this.lastLoadTime = Date.now();
      
      console.log('💾 Context Manager ayarları kaydedildi');
    } catch (error) {
      console.error('❌ Context Manager ayarları kaydedilirken hata:', error);
      throw new Error(`Ayarlar kaydedilemedi: ${error}`);
    }
  }

  /**
   * Context Manager'ı aç/kapat
   */
  async toggleEnabled(enabled: boolean): Promise<ContextManagerSettings> {
    await this.saveSettings({ enabled });
    return await this.loadSettings();
  }

  /**
   * Live budget'ı güncelle
   */
  async updateLiveBudget(liveBudget: number): Promise<void> {
    if (liveBudget < 1000 || liveBudget > 50000) {
      throw new Error('Live budget 1000-50000 arasında olmalıdır');
    }
    await this.saveSettings({ liveBudget });
  }

  /**
   * Hard cap'i güncelle
   */
  async updateHardCap(hardCap: number): Promise<void> {
    if (hardCap < 50000 || hardCap > 150000) {
      throw new Error('Hard cap 50000-150000 arasında olmalıdır');
    }
    await this.saveSettings({ hardCap });
  }

  /**
   * Optimizasyon seviyesini güncelle
   */
  async updateOptimizationLevel(level: 'high' | 'medium' | 'low'): Promise<void> {
    await this.saveSettings({ 
      optimizationLevel: level,
      lastOptimization: new Date()
    });
  }

  /**
   * Kullanım istatistiklerini güncelle
   */
  async updateUsageStats(tokensUsed: number, cost: number): Promise<void> {
    const currentSettings = await this.loadSettings();
    const currentUsage = currentSettings.usage || {
      totalTokensUsed: 0,
      totalCost: 0,
      requestCount: 0,
      lastReset: new Date()
    };

    const updatedUsage = {
      totalTokensUsed: currentUsage.totalTokensUsed + tokensUsed,
      totalCost: currentUsage.totalCost + cost,
      requestCount: currentUsage.requestCount + 1,
      lastReset: currentUsage.lastReset
    };

    await this.saveSettings({ usage: updatedUsage });
  }

  /**
   * Kullanım istatistiklerini sıfırla
   */
  async resetUsageStats(): Promise<void> {
    const resetUsage = {
      totalTokensUsed: 0,
      totalCost: 0,
      requestCount: 0,
      lastReset: new Date()
    };

    await this.saveSettings({ usage: resetUsage });
  }

  /**
   * Ayarları varsayılana sıfırla
   */
  async resetToDefaults(): Promise<ContextManagerSettings> {
    const defaultSettings = {
      ...STORE_CONFIG.DEFAULT_SETTINGS,
      usage: {
        totalTokensUsed: 0,
        totalCost: 0,
        requestCount: 0,
        lastReset: new Date()
      }
    };

    await this.saveSettings(defaultSettings);
    return defaultSettings;
  }

  /**
   * Ayarları dışa aktar
   */
  async exportSettings(): Promise<string> {
    const settings = await this.loadSettings();
    return JSON.stringify(settings, null, 2);
  }

  /**
   * Ayarları içe aktar
   */
  async importSettings(settingsJson: string): Promise<ContextManagerSettings> {
    try {
      const importedSettings = JSON.parse(settingsJson) as ContextManagerSettings;
      const validatedSettings = this.validateAndCompleteSettings(importedSettings);
      
      await this.saveSettings(validatedSettings);
      return validatedSettings;
    } catch (error) {
      throw new Error(`Ayarlar içe aktarılamadı: ${error}`);
    }
  }

  /**
   * Store istatistikleri
   */
  async getStoreStats(): Promise<{
    settingsFileExists: boolean;
    backupFileExists: boolean;
    settingsFileSize: number;
    lastModified: Date | null;
    cacheHit: boolean;
  }> {
    try {
      const [settingsStats, backupStats] = await Promise.allSettled([
        fs.stat(this.settingsPath),
        fs.stat(this.backupPath)
      ]);

      return {
        settingsFileExists: settingsStats.status === 'fulfilled',
        backupFileExists: backupStats.status === 'fulfilled',
        settingsFileSize: settingsStats.status === 'fulfilled' ? settingsStats.value.size : 0,
        lastModified: settingsStats.status === 'fulfilled' ? settingsStats.value.mtime : null,
        cacheHit: !!this.cachedSettings
      };
    } catch (error) {
      return {
        settingsFileExists: false,
        backupFileExists: false,
        settingsFileSize: 0,
        lastModified: null,
        cacheHit: false
      };
    }
  }

  /**
   * Cache'i temizle
   */
  clearCache(): void {
    this.cachedSettings = null;
    this.lastLoadTime = 0;
  }

  /**
   * Default ayarları oluştur
   */
  private async createDefaultSettings(): Promise<ContextManagerSettings> {
    const defaultSettings: ContextManagerSettings = {
      ...STORE_CONFIG.DEFAULT_SETTINGS,
      usage: {
        totalTokensUsed: 0,
        totalCost: 0,
        requestCount: 0,
        lastReset: new Date()
      }
    };

    await this.saveSettings(defaultSettings);
    return defaultSettings;
  }

  /**
   * Ayarları doğrula ve eksik alanları doldur
   */
  private validateAndCompleteSettings(settings: Partial<ContextManagerSettings>): ContextManagerSettings {
    return {
      enabled: settings.enabled ?? STORE_CONFIG.DEFAULT_SETTINGS.enabled,
      liveBudget: settings.liveBudget ?? STORE_CONFIG.DEFAULT_SETTINGS.liveBudget,
      hardCap: settings.hardCap ?? STORE_CONFIG.DEFAULT_SETTINGS.hardCap,
      autoOptimize: settings.autoOptimize ?? STORE_CONFIG.DEFAULT_SETTINGS.autoOptimize,
      enablePiiStripping: settings.enablePiiStripping ?? STORE_CONFIG.DEFAULT_SETTINGS.enablePiiStripping,
      debugMode: settings.debugMode ?? STORE_CONFIG.DEFAULT_SETTINGS.debugMode,
      lastOptimization: settings.lastOptimization ? new Date(settings.lastOptimization) : undefined,
      usage: settings.usage ? {
        ...settings.usage,
        lastReset: new Date(settings.usage.lastReset)
      } : {
        totalTokensUsed: 0,
        totalCost: 0,
        requestCount: 0,
        lastReset: new Date()
      },
      optimizationLevel: settings.optimizationLevel
    };
  }

  /**
   * Backup oluştur
   */
  private async createBackup(settings: ContextManagerSettings): Promise<void> {
    try {
      await fs.writeFile(
        this.backupPath,
        JSON.stringify(settings, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.warn('⚠️ Backup oluşturulamadı:', error);
    }
  }

  /**
   * Cache klasörünün var olduğunu kontrol et
   */
  private async ensureDirectoryExists(): Promise<void> {
    try {
      const dir = path.dirname(this.settingsPath);
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      console.error('❌ Cache klasörü oluşturulamadı:', error);
    }
  }
}

// Singleton instance
export const store = new Store();
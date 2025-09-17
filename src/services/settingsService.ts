import { db } from '../lib/firebase'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import type { NotificationSettings } from '../types/word'

const SETTINGS_COLLECTION = 'userSettings'
const DEFAULT_USER_ID = 'default-user' // Gelecekte auth ile değiştirilebilir

export class SettingsService {
  private static instance: SettingsService

  static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService()
    }
    return SettingsService.instance
  }

  async getSettings(): Promise<NotificationSettings> {
    try {
      const settingsRef = doc(db, SETTINGS_COLLECTION, DEFAULT_USER_ID)
      const settingsSnap = await getDoc(settingsRef)
      
      if (settingsSnap.exists()) {
        const data = settingsSnap.data()
        return {
          enabled: data.enabled ?? true,
          dailyCount: data.dailyCount ?? 10,
          activeHours: data.activeHours ?? { start: 9, end: 22 },
          lastResetDate: data.lastResetDate ?? new Date().toDateString(),
          todayCount: data.todayCount ?? 0
        }
      } else {
        // İlk kez kullanım - varsayılan ayarları Firebase'e kaydet
        const defaultSettings: NotificationSettings = {
          enabled: true,
          dailyCount: 10,
          activeHours: { start: 9, end: 22 },
          lastResetDate: new Date().toDateString(),
          todayCount: 0
        }
        await this.saveSettings(defaultSettings)
        return defaultSettings
      }
    } catch (error) {
      console.error('Error getting settings from Firebase:', error)
      // Hata durumunda varsayılan ayarları döndür
      return {
        enabled: true,
        dailyCount: 10,
        activeHours: { start: 9, end: 22 },
        lastResetDate: new Date().toDateString(),
        todayCount: 0
      }
    }
  }

  async saveSettings(settings: NotificationSettings): Promise<void> {
    try {
      const settingsRef = doc(db, SETTINGS_COLLECTION, DEFAULT_USER_ID)
      await setDoc(settingsRef, {
        enabled: settings.enabled,
        dailyCount: settings.dailyCount,
        activeHours: settings.activeHours,
        lastResetDate: settings.lastResetDate,
        todayCount: settings.todayCount,
        updatedAt: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error saving settings to Firebase:', error)
      throw error
    }
  }

  async updateTodayCount(count: number): Promise<void> {
    try {
      const settingsRef = doc(db, SETTINGS_COLLECTION, DEFAULT_USER_ID)
      await updateDoc(settingsRef, {
        todayCount: count,
        lastResetDate: new Date().toDateString(),
        updatedAt: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error updating today count:', error)
      throw error
    }
  }

  async resetDailyCount(): Promise<void> {
    try {
      const settingsRef = doc(db, SETTINGS_COLLECTION, DEFAULT_USER_ID)
      await updateDoc(settingsRef, {
        todayCount: 0,
        lastResetDate: new Date().toDateString(),
        updatedAt: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error resetting daily count:', error)
      throw error
    }
  }

  async incrementTodayCount(): Promise<number> {
    try {
      const currentSettings = await this.getSettings()
      const newCount = currentSettings.todayCount + 1
      
      await this.updateTodayCount(newCount)
      return newCount
    } catch (error) {
      console.error('Error incrementing today count:', error)
      throw error
    }
  }
}
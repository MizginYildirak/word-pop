import { db } from '../lib/firebase'
import { updateDoc, doc } from 'firebase/firestore'
import type { Word, NotificationSettings } from '../types/word'
import { SettingsService } from './settingsService'

export class NotificationService {
  private static instance: NotificationService
  private scheduledNotifications: Map<string, number> = new Map()
  private settings: NotificationSettings = {
    enabled: true,
    dailyCount: 10,
    activeHours: { start: 9, end: 22 },
    lastResetDate: new Date().toDateString(),
    todayCount: 0
  }
  private settingsService: SettingsService

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  constructor() {
    this.settingsService = SettingsService.getInstance()
    this.loadSettingsFromFirebase()
  }

  private async loadSettingsFromFirebase(): Promise<void> {
    try {
      this.settings = await this.settingsService.getSettings()
    } catch (error) {
      console.error('Error loading settings from Firebase:', error)
    }
  }

  updateSettings(newSettings: NotificationSettings): void {
    console.log('⚙️ Bildirim ayarları güncelleniyor:', {
      önceki: this.settings,
      yeni: newSettings
    })
    
    this.settings = newSettings
    this.resetDailyCountIfNeeded()
    this.rescheduleAllNotifications()
    
    console.log('✅ Bildirim ayarları güncellendi!')
  }

  private resetDailyCountIfNeeded(): void {
    const today = new Date().toDateString()
    if (this.settings.lastResetDate !== today) {
      this.settings.todayCount = 0
      this.settings.lastResetDate = today
    }
  }

  private canSendNotification(): boolean {
    this.resetDailyCountIfNeeded()
    
    const now = new Date()
    const currentHour = now.getHours()
    
    // Detaylı kontrol ve debug
    const checks = {
      enabled: this.settings.enabled,
      dailyLimitOk: this.settings.todayCount < this.settings.dailyCount,
      activeHoursOk: currentHour >= this.settings.activeHours.start && currentHour < this.settings.activeHours.end,
      currentHour: currentHour,
      activeStart: this.settings.activeHours.start,
      activeEnd: this.settings.activeHours.end,
      todayCount: this.settings.todayCount,
      dailyLimit: this.settings.dailyCount
    }
    
    console.log('🔍 Bildirim gönderim kontrolleri:', checks)
    
    if (!this.settings.enabled) {
      console.log('❌ Bildirimler kapalı!')
      return false
    }
    
    if (this.settings.todayCount >= this.settings.dailyCount) {
      console.log('❌ Günlük limit doldu!')
      return false
    }

    if (currentHour < this.settings.activeHours.start || currentHour >= this.settings.activeHours.end) {
      console.log('❌ Aktif saatler dışında!')
      return false
    }
    
    console.log('✅ Tüm kontroller geçti, bildirim gönderilebilir!')
    return true
  }

  private calculateRandomDelay(): number {
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    
    // Aktif saat kontrolü
    const isInActiveHours = currentHour >= this.settings.activeHours.start && currentHour < this.settings.activeHours.end
    
    if (!isInActiveHours) {
      // Aktif saatler dışındaysa, bir sonraki aktif saate kadar bekle
      const nextActiveTime = new Date()
      if (currentHour >= this.settings.activeHours.end) {
        // Bugün bitmiş, yarına ertele
        nextActiveTime.setDate(nextActiveTime.getDate() + 1)
      }
      nextActiveTime.setHours(this.settings.activeHours.start, 0, 0, 0)
      const delayMs = nextActiveTime.getTime() - now.getTime()
      console.log(`⏰ Aktif saatler dışında, ${Math.round(delayMs / 1000 / 60)} dakika sonra aktif olacak`)
      return delayMs
    }
    
    // Kalan bildirimleri hesapla
    const remainingNotifications = Math.max(0, this.settings.dailyCount - this.settings.todayCount)
    
    if (remainingNotifications <= 0) {
      // Günlük limit dolmuş, yarına ertele
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(this.settings.activeHours.start, 0, 0, 0)
      const delayMs = tomorrow.getTime() - now.getTime()
      console.log(`📊 Günlük limit doldu, ${Math.round(delayMs / 1000 / 60 / 60)} saat sonra sıfırlanacak`)
      return delayMs
    }
    
    // Kalan aktif süreyi hesapla (dakika cinsinden)
    const endHour = this.settings.activeHours.end
    const totalMinutesLeft = (endHour - currentHour) * 60 - currentMinute
    
    // Basit ve güvenilir aralık hesaplama
    const averageIntervalMinutes = totalMinutesLeft / remainingNotifications
    
    // Test modu - çok yoğun bildirimler için kısa aralıklar
    let minInterval, maxInterval
    
    if (this.settings.dailyCount > 100) {
      // Yoğun mod - daha kısa aralıklar
      minInterval = Math.max(1, averageIntervalMinutes * 0.3) // En az 1 dakika
      maxInterval = Math.min(averageIntervalMinutes * 1.2, totalMinutesLeft * 0.8) // Daha sık
    } else if (this.settings.dailyCount > 50) {
      // Orta yoğun mod
      minInterval = Math.max(2, averageIntervalMinutes * 0.4) // En az 2 dakika  
      maxInterval = Math.min(averageIntervalMinutes * 1.3, totalMinutesLeft * 0.85)
    } else {
      // Normal mod
      minInterval = Math.max(5, averageIntervalMinutes * 0.5) // En az 5 dakika
      maxInterval = Math.min(averageIntervalMinutes * 1.5, totalMinutesLeft * 0.9)
    }
    
    // Rastgele aralık seç
    const randomIntervalMinutes = minInterval + Math.random() * (maxInterval - minInterval)
    const delayMs = Math.round(randomIntervalMinutes * 60 * 1000)
    
    console.log(`🎯 Bildirim aralığı: ${Math.round(randomIntervalMinutes)} dakika (${remainingNotifications} bildirim kaldı, mod: ${this.settings.dailyCount > 100 ? 'YOĞUN' : this.settings.dailyCount > 50 ? 'ORTA' : 'NORMAL'})`)
    
    return delayMs
  }

  async scheduleRandomNotification(word: Word): Promise<void> {
    if (!word.isActive) {
      console.log(`⏸️ "${word.word}" pasif olduğu için zamanlanmadı`)
      return
    }

    // Önceki timeout'u temizle
    this.clearNotification(word.id)

    const delayMs = this.calculateRandomDelay()
    const nextNotificationTime = new Date(Date.now() + delayMs)
    
    // Debug bilgisi - console'da göster
    console.log(`📅 "${word.word}" için bildirim zamanlandı:`, {
      kelime: word.word,
      şuAnkiSaat: new Date().toLocaleTimeString('tr-TR'),
      bildirimZamanı: nextNotificationTime.toLocaleTimeString('tr-TR'),
      kaçDakikaSonra: Math.round(delayMs / 1000 / 60),
      günlükKalan: Math.max(0, this.settings.dailyCount - this.settings.todayCount),
      aktifSaatler: `${this.settings.activeHours.start}:00-${this.settings.activeHours.end}:00`
    })

    const timeoutId = window.setTimeout(async () => {
      try {
        // Bildirim gönderim koşullarını tekrar kontrol et
        if (this.canSendNotification() && word.isActive) {
          console.log(`🔔 "${word.word}" bildirimi gönderiliyor...`)
          await this.sendNotification(word)
          
          // Firebase'de sayacı artır
          try {
            const newCount = await this.settingsService.incrementTodayCount()
            this.settings.todayCount = newCount
            console.log(`📊 Günlük bildirim sayacı güncellendi: ${newCount}/${this.settings.dailyCount}`)
          } catch (error) {
            console.error('❌ Firebase sayaç güncellenemedi:', error)
            this.settings.todayCount++
          }
          
          // Başarılı bildirim sonrası kısa bir bekleme
          setTimeout(() => {
            this.scheduleRandomNotification(word)
          }, 30000) // 30 saniye bekle
          
        } else {
          console.log(`❌ "${word.word}" bildirimi gönderilemedi - koşullar uygun değil`)
          // Koşullar uygun değilse 5 dakika sonra tekrar dene
          setTimeout(() => {
            this.scheduleRandomNotification(word)
          }, 5 * 60 * 1000) // 5 dakika
        }
      } catch (error) {
        console.error(`❌ "${word.word}" bildirim hatası:`, error)
        // Hata durumunda 10 dakika sonra tekrar dene
        setTimeout(() => {
          this.scheduleRandomNotification(word)
        }, 10 * 60 * 1000) // 10 dakika
      }
    }, delayMs)

    this.scheduledNotifications.set(word.id, timeoutId)
  }

  private async sendNotification(word: Word): Promise<void> {
    console.log(`🔔 "${word.word}" için bildirim gönderme işlemi başlıyor...`)
    
    // Detaylı bildirim izni kontrolü
    console.log('📋 Bildirim durumu kontrolü:', {
      notificationSupported: 'Notification' in window,
      permission: Notification.permission,
      windowFocused: document.hasFocus(),
      pageVisible: document.visibilityState === 'visible'
    })
    
    if (!('Notification' in window)) {
      console.log('❌ Bu tarayıcı bildirimleri desteklemiyor!')
      return
    }
    
    if (Notification.permission === 'denied') {
      console.log('❌ Bildirim izni reddedilmiş! Tarayıcı ayarlarından izin verin.')
      return
    }
    
    if (Notification.permission === 'default') {
      console.log('⏳ Bildirim izni isteniyor...')
      const permission = await Notification.requestPermission()
      console.log('📝 İzin sonucu:', permission)
      
      if (permission !== 'granted') {
        console.log('❌ Bildirim izni verilmedi!')
        return
      }
    }

    try {
      console.log(`🚀 "${word.word}" bildirimi oluşturuluyor...`)
      
      const notification = new Notification('🔔 Kelime Hatırlatması', {
        body: `${word.word}: ${word.meaning}`,
        icon: '/vite.svg',
        badge: '/vite.svg',
        tag: `word-${word.id}`,
        requireInteraction: true, // Kullanıcı etkileşimi gereksin - daha görünür
        silent: false, // Ses çıkarsın
        dir: 'ltr', // Mac'te daha iyi görünüm için
        lang: 'tr' // Türkçe dil desteği
      })

      console.log(`✅ "${word.word}" bildirimi başarıyla oluşturuldu!`)
      
      // localStorage'a bildirim zamanını kaydet - real-time güncellemeler için
      localStorage.setItem('lastNotificationTime', Date.now().toString())
      localStorage.setItem('lastNotificationWord', `${word.word}: ${word.meaning}`)

      // Event listener'ları ekle
      notification.onclick = () => {
        console.log(`👆 "${word.word}" bildirimine tıklandı`)
        window.focus()
        notification.close()
      }

      notification.onshow = () => {
        console.log(`👁️ "${word.word}" bildirimi GÖRÜNTÜLENDI - başarılı!`)
        this.updateWordReviewCount(word)
      }

      notification.onerror = (error) => {
        console.error(`❌ "${word.word}" bildirimi HATASI:`, error)
      }

      notification.onclose = () => {
        console.log(`🔚 "${word.word}" bildirimi kapatıldı`)
      }

      // 15 saniye sonra otomatik kapat (daha uzun süre)
      setTimeout(() => {
        try {
          notification.close()
          console.log(`⏰ "${word.word}" bildirimi otomatik kapatıldı`)
        } catch (e) {
          console.log('Bildirim zaten kapatılmış')
        }
      }, 15000)

      // Sayfa odakta değilse uyarı ver
      if (!document.hasFocus()) {
        console.log('⚠️ Sayfa odakta değil - bildirim arka planda gönderildi')
      }

    } catch (error) {
      console.error('❌ Bildirim oluşturma hatası:', error)
      if (error instanceof Error) {
        console.error('Hata detayı:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        })
      }
      
      // Fallback: Basit alert ile test
      if (document.hasFocus()) {
        console.log('🔄 Fallback: Console uyarısı gösteriliyor')
        console.log(`%c🔔 KELIME HATIRLATMASI: ${word.word} - ${word.meaning}`, 
          'background: #4CAF50; color: white; padding: 10px; border-radius: 5px; font-size: 14px;')
      }
    }
  }

  private async updateWordReviewCount(word: Word): Promise<void> {
    try {
      console.log(`📊 "${word.word}" için tekrar sayısı güncelleniyor...`)
      
      const newReviewCount = (word.reviewCount || 0) + 1
      const wordRef = doc(db, 'words', word.id)
      
      await updateDoc(wordRef, {
        reviewCount: newReviewCount,
        lastReviewed: new Date()
      })
      
      // localStorage'a güncellenme bilgisini kaydet - UI'nin real-time güncellemesi için
      localStorage.setItem('lastWordUpdate', Date.now().toString())
      localStorage.setItem('updatedWordId', word.id)
      localStorage.setItem('updatedWordReviewCount', newReviewCount.toString())
      
      console.log(`✅ "${word.word}" tekrar sayısı güncellendi: ${newReviewCount}`)
      
      // Global state'i de güncelle (eğer mevcut kelimeler arasındaysa)
      try {
        const currentWords = JSON.parse(localStorage.getItem('currentWords') || '[]')
        const updatedWords = currentWords.map((w: Word) => 
          w.id === word.id 
            ? { ...w, reviewCount: newReviewCount, lastReviewed: new Date() }
            : w
        )
        localStorage.setItem('currentWords', JSON.stringify(updatedWords))
      } catch (error) {
        console.log('Global state güncelleme hatası (normal):', error)
      }
      
    } catch (error) {
      console.error(`❌ "${word.word}" tekrar sayısı güncellenemedi:`, error)
    }
  }

  scheduleAllNotifications(words: Word[]): void {
    console.log(`🔄 Tüm bildirimler yeniden zamanlanıyor... (${words.length} kelime)`)
    
    // Önce tüm mevcut bildirimleri temizle
    this.clearAllNotifications()
    
    // Günlük sayacı sıfırla (gerekirse)
    this.resetDailyCountIfNeeded()
    
    // Aktif kelimeleri filtrele
    const activeWords = words.filter(word => word.isActive)
    console.log(`📊 ${activeWords.length} aktif kelime bulundu`)
    
    if (activeWords.length === 0) {
      console.log('⚠️ Aktif kelime yok, bildirim zamanlanmadı')
      return
    }
    
    // Her aktif kelime için farklı zamanlarda bildirim zamanla
    activeWords.forEach((word) => {
      // Her kelime için farklı başlangıç gecikmesi (0-5 dakika arası)
      const initialDelay = Math.random() * 5 * 60 * 1000 // 0-5 dakika
      
      setTimeout(() => {
        this.scheduleRandomNotification(word)
      }, initialDelay)
      
      console.log(`⏰ "${word.word}" ${Math.round(initialDelay / 1000 / 60)} dakika sonra başlayacak`)
    })
    
    console.log(`✅ ${activeWords.length} kelime için bildirim zamanlaması tamamlandı`)
  }

  rescheduleAllNotifications(): void {
    // Mevcut tüm zamanlamaları iptal et ve yeniden programla
    this.clearAllNotifications()
    // Bu method WordList'ten çağrılacak
  }

  clearAllNotifications(): void {
    this.scheduledNotifications.forEach(timeoutId => {
      window.clearTimeout(timeoutId)
    })
    this.scheduledNotifications.clear()
  }

  clearNotification(wordId: string): void {
    const timeoutId = this.scheduledNotifications.get(wordId)
    if (timeoutId) {
      window.clearTimeout(timeoutId)
      this.scheduledNotifications.delete(wordId)
    }
  }

  getSettings(): NotificationSettings {
    return { ...this.settings }
  }
}
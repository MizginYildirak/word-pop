// React hooks - state ve effect yönetimi için
import { useState, useEffect } from 'react'
// Global state yönetimi - Zustand store
import { useWordStore } from '../store/wordStore'
// TypeScript tip tanımı - bildirim ayarları
import type { NotificationSettings } from '../types/word'
// Bildirim zamanlama ve yönetimi için servis
import { NotificationService } from '../services/notificationService'

export const Settings = () => {
  // Global state'den ayar işlemleri - Firebase ile senkronize
  const { settings, saveSettings, loadSettings, isLoading } = useWordStore()
  // Geçici ayarlar - kullanıcı değişiklikleri kaydetmeden önce burada tutuluyor
  const [tempSettings, setTempSettings] = useState<NotificationSettings>(settings)
  // Singleton pattern ile NotificationService instance'ı
  const notificationService = NotificationService.getInstance()

  // Component mount olduğunda Firebase'den ayarları yükle ve real-time dinleme başlat
  useEffect(() => {
    loadSettings() // Firebase'den mevcut ayarları getir
    
    // Real-time ayar dinleme (her 5 saniyede bir kontrol)
    const intervalId = setInterval(() => {
      loadSettings()
    }, 5000) // 5 saniye
    
    // Cleanup - component unmount olduğunda interval'i temizle
    return () => {
      clearInterval(intervalId)
    }
  }, [loadSettings]) // loadSettings değişirse tekrar çalışır

  // Global settings değiştiğinde geçici ayarları güncelle
  useEffect(() => {
    setTempSettings(settings) // Firebase'den gelen ayarları geçici state'e kopyala
  }, [settings]) // settings değişirse çalışır

  // Ayarları Firebase'e kaydetme işlevi
  const handleSave = async () => {
    try {
      // Firebase'e geçici ayarları kaydet
      await saveSettings(tempSettings)
      // NotificationService'e yeni ayarları bildir - zamanlama güncellenir
      notificationService.updateSettings(tempSettings)
      // Kullanıcıya başarı mesajı
      alert('Ayarlar Firebase\'e başarıyla kaydedildi!')
    } catch (error) {
      // Hata durumunda kullanıcıya bilgi ver
      alert('Ayarlar kaydedilirken hata oluştu!')
    }
  }

  // Günlük bildirim sayacını sıfırlama işlevi
  const handleReset = async () => {
    try {
      // Sayacı sıfırla ve bugünün tarihini ayarla
      const resetSettings = {
        ...tempSettings,                          // Mevcut ayarları koru
        todayCount: 0,                           // Günlük sayacı sıfırla
        lastResetDate: new Date().toDateString() // Bugünün tarihini kaydet
      }
      // Geçici state'i güncelle
      setTempSettings(resetSettings)
      // Firebase'e kaydet
      await saveSettings(resetSettings)
      // NotificationService'e bildir
      notificationService.updateSettings(resetSettings)
      // Kullanıcıya başarı mesajı
      alert('Günlük sayaç Firebase\'de sıfırlandı!')
    } catch (error) {
      // Hata durumunda kullanıcıya bilgi ver
      alert('Sayaç sıfırlanırken hata oluştu!')
    }
  }

  // Bugün yeni bir gün mü kontrolü - sayacın sıfırlanması gerekip gerekmediği
  const isNewDay = () => {
    // Son sıfırlama tarihi bugünkü tarihten farklıysa yeni gün
    return settings.lastResetDate !== new Date().toDateString()
  }

  // Bugün kaç bildirim hakkı kaldığını hesaplama
  const remainingNotifications = () => {
    // Yeni günse tüm hak kullanılabilir
    if (isNewDay()) return settings.dailyCount
    // Aksi halde günlük limitten bugün gönderileni çıkar (minimum 0)
    return Math.max(0, settings.dailyCount - settings.todayCount)
  }

  // Test bildirimi gönderme
  const handleTestNotification = async () => {
    try {
      console.log('🧪 Test bildirimi gönderiliyor...')
      
      // İzin kontrolü
      if (!('Notification' in window)) {
        alert('❌ Bu tarayıcı bildirimleri desteklemiyor!')
        return
      }
      
      if (Notification.permission === 'denied') {
        alert('❌ Bildirim izni reddedilmiş! Tarayıcı ayarlarından izin verin.')
        return
      }
      
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          alert('❌ Bildirim izni verilmedi!')
          return
        }
      }

      // Test bildirimi oluştur
      const testNotification = new Notification('🧪 Test Bildirimi', {
        body: 'Bu bir test bildirimidir. Bildirimler çalışıyor! ✅',
        icon: '/vite.svg',
        badge: '/vite.svg',
        requireInteraction: true,
        silent: false
      })

      console.log('✅ Test bildirimi oluşturuldu!')
      
      testNotification.onclick = () => {
        console.log('👆 Test bildirimine tıklandı')
        window.focus()
        testNotification.close()
      }

      testNotification.onshow = () => {
        console.log('👁️ Test bildirimi GÖRÜNTÜLENDI!')
        alert('✅ Test başarılı! Bildirimler çalışıyor.')
      }

      testNotification.onerror = (error) => {
        console.error('❌ Test bildirimi hatası:', error)
        alert('❌ Test bildirimi gönderilemedi!')
      }

      // 10 saniye sonra otomatik kapat
      setTimeout(() => {
        try {
          testNotification.close()
          console.log('⏰ Test bildirimi otomatik kapatıldı')
        } catch (e) {
          console.log('Test bildirimi zaten kapatılmış')
        }
      }, 10000)

    } catch (error) {
      console.error('❌ Test bildirimi hatası:', error)
      alert('❌ Test bildirimi gönderilirken hata oluştu!')
    }
  }


  return (
    <div style={{
      maxWidth: '500px',
      margin: '0 auto',
      padding: '24px',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
    }}>
      <h3 style={{ margin: '0 0 24px 0', fontSize: '20px' }}>Bildirim Ayarları</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Bildirim Durumu */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ fontWeight: '500' }}>Bildirimleri Aç/Kapat</label>
          <input
            type="checkbox"
            checked={tempSettings.enabled}
            onChange={(e) => setTempSettings({ ...tempSettings, enabled: e.target.checked })}
            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
          />
        </div>

        {/* Günlük Bildirim Sayısı */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            Günlük Bildirim Sayısı: {tempSettings.dailyCount}
          </label>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              type="range"
              min="1"
              max="1000"
              value={tempSettings.dailyCount}
              onChange={(e) => setTempSettings({ ...tempSettings, dailyCount: parseInt(e.target.value) })}
              style={{ flex: 1, cursor: 'pointer' }}
            />
            <input
              type="number"
              min="1"
              max="1000"
              value={tempSettings.dailyCount}
              onChange={(e) => {
                const value = Math.min(1000, Math.max(1, parseInt(e.target.value) || 1))
                setTempSettings({ ...tempSettings, dailyCount: value })
              }}
              style={{
                width: '80px',
                padding: '6px 8px',
                border: '1px solid #E2E8F0',
                borderRadius: '4px',
                fontSize: '14px',
                textAlign: 'center'
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#718096', marginTop: '4px' }}>
            <span>1 (Minimum)</span>
            <span>1000 (Maksimum)</span>
          </div>
          {/* Akıllı Hesaplama ve Uyarı Sistemi */}
          <div style={{
            marginTop: '12px',
            padding: '12px',
            backgroundColor: tempSettings.dailyCount > 500 ? '#FEF2F2' : 
                            tempSettings.dailyCount > 100 ? '#FFF3CD' : 
                            '#F0FDF4',
            borderRadius: '6px',
            border: `1px solid ${tempSettings.dailyCount > 500 ? '#FECACA' : 
                                  tempSettings.dailyCount > 100 ? '#FFEAA7' : 
                                  '#BBF7D0'}`,
            fontSize: '13px'
          }}>
            {(() => {
              const activeHours = tempSettings.activeHours.end - tempSettings.activeHours.start
              const totalMinutes = activeHours * 60
              const avgIntervalMinutes = totalMinutes / tempSettings.dailyCount
              const avgIntervalHours = avgIntervalMinutes / 60
              const notificationsPerHour = tempSettings.dailyCount / activeHours
              
              // Farklı zaman dilimlerindeki dağılım
              const morningHours = Math.min(4, activeHours) // İlk 4 saat
              const afternoonHours = Math.min(4, Math.max(0, activeHours - 4)) // Sonraki 4 saat  
              
              const morningNotifications = Math.round((morningHours / activeHours) * tempSettings.dailyCount)
              const afternoonNotifications = Math.round((afternoonHours / activeHours) * tempSettings.dailyCount)
              const eveningNotifications = tempSettings.dailyCount - morningNotifications - afternoonNotifications

              if (tempSettings.dailyCount > 500) {
                return (
                  <div style={{ color: '#DC2626' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                      🚨 EXTREME MOD - Çok Yoğun Bildirim!
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                      <div>⚡ <strong>{notificationsPerHour.toFixed(1)}</strong> bildirim/saat</div>
                      <div>⏱️ Her <strong>{avgIntervalMinutes.toFixed(0)} dakika</strong>da bir</div>
                      <div>🌅 Sabah: <strong>{morningNotifications}</strong> bildirim</div>
                      <div>🌇 Akşam: <strong>{eveningNotifications}</strong> bildirim</div>
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '11px', opacity: 0.8 }}>
                      Bu mod sadece çok deneyimli kullanıcılar için önerilir!
                    </div>
                  </div>
                )
              } else if (tempSettings.dailyCount > 100) {
                return (
                  <div style={{ color: '#92400E' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                      ⚡ YOĞUN MOD - Aktif Öğrenme
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                      <div>📊 <strong>{notificationsPerHour.toFixed(1)}</strong> bildirim/saat</div>
                      <div>⏰ Her <strong>{avgIntervalMinutes.toFixed(0)} dakika</strong>da bir</div>
                      <div>🎯 Ortalama aralık: <strong>{avgIntervalHours.toFixed(1)} saat</strong></div>
                      <div>📱 Günlük toplam: <strong>{tempSettings.dailyCount}</strong> hatırlatma</div>
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '11px', opacity: 0.8 }}>
                      Yoğun öğrenme için ideal, dikkat dağıtıcı olabilir.
                    </div>
                  </div>
                )
              } else {
                return (
                  <div style={{ color: '#15803D' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                      ✅ OPTIMAL MOD - Dengeli Öğrenme
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                      <div>🎯 <strong>{notificationsPerHour.toFixed(1)}</strong> bildirim/saat</div>
                      <div>⏰ Her <strong>{Math.round(avgIntervalMinutes)} dakika</strong>da bir</div>
                      <div>🌅 Sabah ({tempSettings.activeHours.start}:00-{tempSettings.activeHours.start + 4}:00): <strong>{morningNotifications}</strong></div>
                      <div>🌆 Akşam ({Math.max(tempSettings.activeHours.start + 4, tempSettings.activeHours.end - 4)}:00-{tempSettings.activeHours.end}:00): <strong>{eveningNotifications}</strong></div>
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '11px', opacity: 0.8 }}>
                      {avgIntervalMinutes > 60 ? 
                        `Rahat öğrenme hızı - günde ${Math.round(avgIntervalHours * 10) / 10} saatte bir hatırlatma` :
                        `Aktif öğrenme hızı - ${Math.round(avgIntervalMinutes)} dakikada bir hatırlatma`
                      }
                    </div>
                  </div>
                )
              }
            })()}
          </div>
        </div>

        {/* Aktif Saatler */}
        <div>
          <label style={{ display: 'block', marginBottom: '12px', fontWeight: '500' }}>
            Aktif Saatler
          </label>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Başlangıç</label>
              <select
                value={tempSettings.activeHours.start}
                onChange={(e) => setTempSettings({
                  ...tempSettings,
                  activeHours: { ...tempSettings.activeHours, start: parseInt(e.target.value) }
                })}
                style={{
                  padding: '8px',
                  border: '1px solid #E2E8F0',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {i.toString().padStart(2, '0')}:00
                  </option>
                ))}
              </select>
            </div>
            <span style={{ marginTop: '20px' }}>-</span>
            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Bitiş</label>
              <select
                value={tempSettings.activeHours.end}
                onChange={(e) => setTempSettings({
                  ...tempSettings,
                  activeHours: { ...tempSettings.activeHours, end: parseInt(e.target.value) }
                })}
                style={{
                  padding: '8px',
                  border: '1px solid #E2E8F0',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {i.toString().padStart(2, '0')}:00
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>


        {/* İstatistikler */}
        <div style={{
          padding: '16px',
          backgroundColor: '#F7FAFC',
          borderRadius: '6px',
          border: '1px solid #E2E8F0'
        }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Günlük İstatistik</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Bugün gönderilen:</span>
              <span style={{ fontWeight: '500' }}>{isNewDay() ? 0 : settings.todayCount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Kalan bildirim:</span>
              <span style={{ fontWeight: '500', color: '#48BB78' }}>{remainingNotifications()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Son sıfırlama:</span>
              <span style={{ fontWeight: '500' }}>{settings.lastResetDate}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Bildirim izni:</span>
              <span style={{ 
                fontWeight: '500', 
                color: Notification.permission === 'granted' ? '#48BB78' : '#F56565' 
              }}>
                {Notification.permission === 'granted' ? '✅ Verildi' : 
                 Notification.permission === 'denied' ? '❌ Reddedildi' : 
                 '⏳ Beklemede'}
              </span>
            </div>
          </div>
        </div>

               {/* Test Butonu */}
               <div style={{
                 padding: '16px',
                 backgroundColor: '#FFF8E1',
                 borderRadius: '6px',
                 border: '1px solid #FFD54F'
               }}>
                 <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#F57C00' }}>🧪 Bildirim Testi</h4>
                 <button
                   onClick={handleTestNotification}
                   style={{
                     width: '100%',
                     padding: '12px',
                     borderRadius: '6px',
                     border: 'none',
                     backgroundColor: '#FF9800',
                     color: 'white',
                     fontSize: '14px',
                     fontWeight: '500',
                     cursor: 'pointer'
                   }}
                 >
                   🔔 Test Bildirimi Gönder
                 </button>
                 <div style={{ fontSize: '12px', color: '#F57C00', marginTop: '8px' }}>
                   Bildirim izni ve görünürlük testi için kullanın
                 </div>
               </div>

               {/* Butonlar */}
               <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                 <button
                   onClick={handleSave}
                   disabled={isLoading}
                   style={{
                     flex: 1,
                     padding: '12px',
                     borderRadius: '6px',
                     border: 'none',
                     backgroundColor: isLoading ? '#A0AEC0' : '#3182CE',
                     color: 'white',
                     fontSize: '16px',
                     fontWeight: '500',
                     cursor: isLoading ? 'not-allowed' : 'pointer'
                   }}
                 >
                   {isLoading ? 'Kaydediliyor...' : 'Firebase\'e Kaydet'}
                 </button>
                 <button
                   onClick={handleReset}
                   style={{
                     padding: '12px 16px',
                     borderRadius: '6px',
                     border: '1px solid #E2E8F0',
                     backgroundColor: 'white',
                     color: '#718096',
                     fontSize: '14px',
                     cursor: 'pointer'
                   }}
                 >
                   Sayacı Sıfırla
                 </button>
               </div>

        {/* Uyarı */}
        {!tempSettings.enabled && (
          <div style={{
            padding: '12px',
            backgroundColor: '#FED7D7',
            borderRadius: '6px',
            border: '1px solid #FC8181',
            color: '#C53030',
            fontSize: '14px'
          }}>
            ⚠️ Bildirimler kapalı. Kelime hatırlatmaları gelmeyecek.
          </div>
        )}
      </div>
    </div>
  )
}
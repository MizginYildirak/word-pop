// React hooks - useState ve useEffect import edilir
import { useState, useEffect } from 'react'
// Çöp kutusu ikonu - kelime silme butonu için
import { FaTrash } from 'react-icons/fa'
// TypeScript tip tanımları - Word interface'i
import type { Word } from '../types/word'
// Zustand store - global state yönetimi
import { useWordStore } from '../store/wordStore'
// Firebase Firestore işlemleri için servis
import { WordService } from '../services/wordService'
// Bildirim zamanlama ve yönetimi için servis
import { NotificationService } from '../services/notificationService'

export const WordList = () => {
  // Silinecek kelimeyi tutmak için state - modal'da gösterilir
  const [selectedWord, setSelectedWord] = useState<Word | null>(null)
  // Silme onay modal'ının açık/kapalı durumu
  const [showDialog, setShowDialog] = useState(false)
  
  // Zustand store'dan kelime işlemleri - global state'e erişim
  const { words, removeWord, updateWord, setWords } = useWordStore()
  
  // Singleton pattern ile servis instance'ları - tek örnek garanti edilir
  const wordService = WordService.getInstance()
  const notificationService = NotificationService.getInstance()

  // Component mount olduğunda kelimeleri yükle ve real-time dinleme başlat
  useEffect(() => {
    loadWords()
    
    // Real-time dinleme için interval (her 5 saniyede bir kontrol)
    const intervalId = setInterval(() => {
      loadWords()
    }, 5000) // 5 saniye - tekrar sayıları için daha sık güncelleme
    
    // localStorage'dan tekrar sayısı güncellemelerini dinle
    let lastUpdateTime = localStorage.getItem('lastWordUpdate') || '0'
    
    const checkForUpdates = () => {
      const currentUpdateTime = localStorage.getItem('lastWordUpdate') || '0'
      
      if (currentUpdateTime !== lastUpdateTime) {
        lastUpdateTime = currentUpdateTime
        const updatedWordId = localStorage.getItem('updatedWordId')
        const newReviewCount = localStorage.getItem('updatedWordReviewCount')
        
        if (updatedWordId && newReviewCount) {
          console.log(`🔄 Tekrar sayısı güncellendi: ${updatedWordId} → ${newReviewCount}`)
          
          // Local state'i anında güncelle
          const updatedWords = words.map((word: Word) => 
            word.id === updatedWordId 
              ? { ...word, reviewCount: parseInt(newReviewCount), lastReviewed: new Date() }
              : word
          )
          setWords(updatedWords)
        }
      }
    }
    
    // Her 2 saniyede localStorage kontrolü
    const updateCheckInterval = setInterval(checkForUpdates, 2000)
    
    // Cleanup - component unmount olduğunda interval'leri temizle
    return () => {
      clearInterval(intervalId)
      clearInterval(updateCheckInterval)
    }
  }, []) // Boş dependency array - sadece mount'ta çalışır

  // Firebase'den kelimeleri çekme fonksiyonu
  const loadWords = async () => {
    try {
      // WordService ile Firebase Firestore'dan kelimeleri al
      const fetchedWords = await wordService.getWords()
      
      // Global state'i güncelle - tüm componentler bu değişikliği görür
      setWords(fetchedWords)
      
      // localStorage'a mevcut kelimeleri kaydet - tekrar sayısı güncellemeleri için
      try {
        localStorage.setItem('currentWords', JSON.stringify(fetchedWords))
      } catch (error) {
        console.log('localStorage kayıt hatası (normal):', error)
      }
      
      // Her aktif kelime için bildirim zamanlama başlat
      notificationService.scheduleAllNotifications(fetchedWords)
    } catch (error) {
      // Hata durumunda kullanıcıya bilgi ver
      alert('Kelimeler yüklenirken bir hata oluştu.')
    }
  }

  // Kelime silme işlemi - modal'dan onaylandıktan sonra çalışır
  const handleDeleteWord = async () => {
    // Seçili kelime yoksa işlem yapma
    if (!selectedWord) return

    try {
      // Firebase'den kelimeyi sil
      await wordService.deleteWord(selectedWord.id)
      // Global state'den kelimeyi kaldır - UI otomatik güncellenir
      removeWord(selectedWord.id)
      // Bu kelime için zamanlanmış bildirimleri iptal et
      notificationService.clearNotification(selectedWord.id)
      // Kullanıcıya başarı mesajı
      alert(`${selectedWord.word} başarıyla silindi.`)
    } catch (error) {
      // Hata durumunda kullanıcıya bilgi ver
      alert('Kelime silinirken bir hata oluştu.')
    } finally {
      // Modal'ı kapat ve seçimi temizle - her durumda çalışır
      setShowDialog(false)
      setSelectedWord(null)
    }
  }

  // Kelime aktif/pasif durumunu değiştirme
  const handleToggleActive = async (word: Word) => {
    try {
      // Firebase'de kelime durumunu güncelle
      await wordService.toggleWordActive(word.id, !word.isActive)
      // Global state'i güncelle - UI'da değişiklik görünür
      updateWord(word.id, { isActive: !word.isActive })
      
      // Durum kontrolü - bildirim yönetimi
      if (word.isActive) {
        // Aktifse pasif yapılıyor - bildirimleri durdur
        notificationService.clearNotification(word.id)
      } else {
        // Pasifse aktif yapılıyor - bildirim zamanlamasını başlat
        notificationService.scheduleRandomNotification({ ...word, isActive: true })
      }
      
      // Kullanıcıya durum değişikliği bilgisi
      alert(`${word.word} ${!word.isActive ? 'aktif' : 'pasif'} hale getirildi.`)
    } catch (error) {
      // Hata durumunda kullanıcıya bilgi ver
      alert('Kelime durumu güncellenirken bir hata oluştu.')
    }
  }

  // Zorluk seviyesine göre renk belirleme - UI'da badge rengi için
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '#48BB78'    // Yeşil - kolay
      case 'medium': return '#ED8936'  // Turuncu - orta
      case 'hard': return '#F56565'    // Kırmızı - zor
      default: return '#A0AEC0'        // Gri - bilinmiyor
    }
  }

  // Zorluk seviyesi İngilizce kodunu Türkçe metne çevirme
  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'Kolay'
      case 'medium': return 'Orta'
      case 'hard': return 'Zor'
      default: return 'Bilinmiyor'
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {words.length === 0 ? (
          <div style={{
            padding: '32px',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            backgroundColor: 'white',
            textAlign: 'center'
          }}>
            <p style={{ color: '#718096', fontSize: '18px' }}>
              Henüz kelime eklenmemiş. İlk kelimenizi ekleyin!
            </p>
          </div>
        ) : (
          words.map((word) => (
            <div
              key={word.id}
              style={{
                padding: '24px',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                backgroundColor: 'white',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h4 style={{ fontSize: '20px', margin: 0 }}>{word.word}</h4>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      backgroundColor: getDifficultyColor(word.difficulty),
                      color: 'white'
                    }}>
                      {getDifficultyText(word.difficulty)}
                    </span>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      backgroundColor: word.isActive ? '#48BB78' : '#A0AEC0',
                      color: 'white'
                    }}>
                      {word.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      style={{
                        padding: '6px 12px',
                        borderRadius: '4px',
                        border: 'none',
                        fontSize: '14px',
                        cursor: 'pointer',
                        backgroundColor: word.isActive ? '#48BB78' : '#E2E8F0',
                        color: word.isActive ? 'white' : '#4A5568'
                      }}
                      onClick={() => handleToggleActive(word)}
                    >
                      {word.isActive ? "Aktif" : "Pasif"}
                    </button>
                    <button
                      style={{
                        padding: '6px',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: '#E53E3E',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        setSelectedWord(word)
                        setShowDialog(true)
                      }}
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <p style={{ fontWeight: '500', color: '#2B6CB0', margin: 0 }}>
                    {word.meaning}
                  </p>
                  {word.example && (
                    <p style={{ fontSize: '14px', color: '#718096', fontStyle: 'italic', margin: 0 }}>
                      "{word.example}"
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#A0AEC0' }}>
                    <span>Tekrar: {word.reviewCount}</span>
                    {word.lastReviewed && (
                      <span>
                        Son tekrar: {new Date(word.lastReviewed).toLocaleDateString('tr-TR')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '8px',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h3 style={{ margin: '0 0 16px 0' }}>Kelimeyi Sil</h3>
            <p style={{ margin: '0 0 24px 0' }}>
              <strong>{selectedWord?.word}</strong> kelimesini silmek istediğinizden emin misiniz?
              Bu işlem geri alınamaz.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  setShowDialog(false)
                  setSelectedWord(null)
                }}
              >
                İptal
              </button>
              <button
                style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: '#E53E3E',
                  color: 'white',
                  cursor: 'pointer'
                }}
                onClick={handleDeleteWord}
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
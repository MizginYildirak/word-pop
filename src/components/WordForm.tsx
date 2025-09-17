// React state hook - form gönderim durumu için
import { useState } from 'react'
// Form yönetimi ve validasyon için React Hook Form
import { useForm } from 'react-hook-form'
// TypeScript tip tanımı - Word interface'i
import type { Word } from '../types/word'
// Global state yönetimi - Zustand store
import { useWordStore } from '../store/wordStore'
// Firebase Firestore işlemleri için servis
import { WordService } from '../services/wordService'
// Bildirim zamanlama için servis
import { NotificationService } from '../services/notificationService'

// Form verilerinin TypeScript tip tanımı
interface WordFormData {
  word: string                              // Kelime
  meaning: string                           // Anlam
  example: string                           // Örnek cümle (opsiyonel)
  difficulty: 'easy' | 'medium' | 'hard'    // Zorluk seviyesi
}

export const WordForm = () => {
  // Form gönderim durumu - loading state için
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Global state'den kelime ekleme fonksiyonu
  const { addWord } = useWordStore()
  // Singleton pattern ile WordService instance'ı
  const wordService = WordService.getInstance()

  // React Hook Form yapılandırması
  const {
    register,          // Input alanlarını form'a bağlama
    handleSubmit,      // Form gönderim işleyicisi
    formState: { errors }, // Validation hataları
    reset              // Formu sıfırlama
  } = useForm<WordFormData>()

  // Form gönderim işlevi - async çünkü Firebase'e kayıt yapıyor
  const onSubmit = async (data: WordFormData) => {
    // Loading durumunu başlat - buton disable olur
    setIsSubmitting(true)
    try {
      // Yeni kelime objesi oluştur - Firebase için gerekli alanları çıkar
      const newWord: Omit<Word, 'id' | 'createdAt' | 'reviewCount'> = {
        word: data.word.trim(),                    // Baş/sondaki boşlukları temizle
        meaning: data.meaning.trim(),              // Baş/sondaki boşlukları temizle
        example: data.example?.trim() || '',       // Boşsa empty string (undefined Firebase hatası verir)
        difficulty: data.difficulty,               // Zorluk seviyesi
        isActive: true                            // Yeni kelimeler varsayılan olarak aktif
      }

      // Firebase'e kelimeyi kaydet - await ile beklenir
      const firebaseId = await wordService.addWord(newWord)
      
      // Firebase'den dönen gerçek ID ile kelimeyi global state'e ekle
      const wordWithFirebaseId = {
        ...newWord,
        id: firebaseId, // Firebase'den dönen gerçek ID
        createdAt: new Date(),
        reviewCount: 0
      }
      
      // Global state'e kelimeyi ekle - UI otomatik güncellenir
      addWord(wordWithFirebaseId)
      
      // Kullanıcıya başarı mesajı
      alert(`${data.word} başarıyla eklendi ve bildirim zamanlaması başladı!`)
      // Formu temizle - yeni kelime eklemek için hazır hale getir
      reset()
      
      // Yeni kelime için bildirim zamanlamasını başlat
      const notificationService = NotificationService.getInstance()
      notificationService.scheduleRandomNotification(wordWithFirebaseId)
    } catch (error) {
      // Hata durumunda kullanıcıya bilgi ver
      alert('Kelime eklenirken bir hata oluştu.')
    } finally {
      // Her durumda loading durumunu bitir - buton tekrar aktif olur
      setIsSubmitting(false)
    }
  }

  // Normal input alanları için CSS stil objesi
  const inputStyle = {
    width: '100%',                        // Tam genişlik
    padding: '12px',                      // İç boşluk
    border: '2px solid #E2E8F0',         // Gri border
    borderRadius: '6px',                  // Yuvarlatılmış köşeler
    fontSize: '16px',                     // Yazı boyutu
    outline: 'none',                      // Odaklanma çerçevesi kaldır
    transition: 'border-color 0.2s'       // Border renk geçişi animasyonu
  }

  // Hata durumunda input alanları için CSS - kırmızı border
  const errorInputStyle = {
    ...inputStyle,                        // Normal stilleri al
    borderColor: '#E53E3E'               // Kırmızı border ekle
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
      <form onSubmit={handleSubmit(onSubmit)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Kelime
            </label>
            <input
              {...register('word', { 
                required: 'Kelime gerekli',
                minLength: { value: 2, message: 'En az 2 karakter olmalı' }
              })}
              style={errors.word ? errorInputStyle : inputStyle}
              placeholder="Kelimeyi girin"
            />
            {errors.word && (
              <p style={{ color: '#E53E3E', fontSize: '14px', margin: '4px 0 0 0' }}>
                {errors.word.message}
              </p>
            )}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Anlamı
            </label>
            <input
              {...register('meaning', { 
                required: 'Anlam gerekli',
                minLength: { value: 2, message: 'En az 2 karakter olmalı' }
              })}
              style={errors.meaning ? errorInputStyle : inputStyle}
              placeholder="Anlamını girin"
            />
            {errors.meaning && (
              <p style={{ color: '#E53E3E', fontSize: '14px', margin: '4px 0 0 0' }}>
                {errors.meaning.message}
              </p>
            )}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Örnek Cümle (Opsiyonel)
            </label>
            <textarea
              {...register('example')}
              style={{
                ...inputStyle,
                minHeight: '80px',
                resize: 'vertical'
              }}
              placeholder="Örnek cümle girin"
              rows={3}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Zorluk Seviyesi
            </label>
            <select
              {...register('difficulty', { required: 'Zorluk seviyesi seçin' })}
              style={errors.difficulty ? errorInputStyle : inputStyle}
            >
              <option value="">Zorluk seviyesi seçin</option>
              <option value="easy">Kolay</option>
              <option value="medium">Orta</option>
              <option value="hard">Zor</option>
            </select>
            {errors.difficulty && (
              <p style={{ color: '#E53E3E', fontSize: '14px', margin: '4px 0 0 0' }}>
                {errors.difficulty.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: isSubmitting ? '#A0AEC0' : '#3182CE',
              color: 'white',
              fontSize: '16px',
              fontWeight: '500',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            {isSubmitting ? 'Ekleniyor...' : 'Kelime Ekle'}
          </button>
        </div>
      </form>
    </div>
  )
}
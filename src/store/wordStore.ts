import { create } from 'zustand'
import type { Word, NotificationSettings } from '../types/word'
import { SettingsService } from '../services/settingsService'

interface WordStore {
  words: Word[]
  settings: NotificationSettings
  isLoading: boolean
  error: string | null
  
  addWord: (word: Omit<Word, 'id' | 'createdAt' | 'reviewCount'>) => void
  removeWord: (id: string) => void
  updateWord: (id: string, updates: Partial<Word>) => void
  setWords: (words: Word[]) => void
  setSettings: (settings: NotificationSettings) => void
  saveSettings: (settings: NotificationSettings) => Promise<void>
  loadSettings: () => Promise<void>
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useWordStore = create<WordStore>((set) => {
  const settingsService = SettingsService.getInstance()

  return {
    words: [],
    settings: {
      enabled: true,
      dailyCount: 10,
      activeHours: {
        start: 9,
        end: 22
      },
      lastResetDate: new Date().toDateString(),
      todayCount: 0
    },
    isLoading: false,
    error: null,

    addWord: (word) => set((state) => ({
      words: [...state.words, {
        ...word,
        id: Date.now().toString(),
        createdAt: new Date(),
        reviewCount: 0
      }]
    })),

    removeWord: (id) => set((state) => ({
      words: state.words.filter(word => word.id !== id)
    })),

    updateWord: (id, updates) => set((state) => ({
      words: state.words.map(word => 
        word.id === id ? { ...word, ...updates } : word
      )
    })),

    setWords: (words) => set({ words }),
    
    setSettings: (settings) => set({ settings }),

    saveSettings: async (settings) => {
      try {
        set({ isLoading: true, error: null })
        await settingsService.saveSettings(settings)
        set({ settings, isLoading: false })
      } catch (error) {
        set({ 
          error: 'Ayarlar kaydedilirken hata oluştu', 
          isLoading: false 
        })
        throw error
      }
    },

    loadSettings: async () => {
      try {
        set({ isLoading: true, error: null })
        const settings = await settingsService.getSettings()
        set({ settings, isLoading: false })
      } catch (error) {
        set({ 
          error: 'Ayarlar yüklenirken hata oluştu', 
          isLoading: false 
        })
        console.error('Error loading settings:', error)
      }
    },

    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error })
  }
})

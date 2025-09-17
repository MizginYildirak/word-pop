export interface Word {
  id: string
  word: string
  meaning: string
  example?: string
  difficulty: 'easy' | 'medium' | 'hard'
  createdAt: Date
  lastReviewed?: Date
  reviewCount: number
  isActive: boolean
}

export interface NotificationSettings {
  enabled: boolean
  dailyCount: number
  activeHours: {
    start: number
    end: number
  }
  lastResetDate: string
  todayCount: number
}

export interface User {
  id: string
  email: string
  notificationToken?: string
  settings: NotificationSettings
  words: Word[]
}

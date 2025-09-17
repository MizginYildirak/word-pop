import { useEffect, createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { requestNotificationPermission, onMessageListener } from '../lib/firebase'
import { NotificationService } from '../services/notificationService'

interface NotificationContextType {
  requestPermission: () => Promise<string | null>
  lastNotification: string | null
  notificationCount: number
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

interface NotificationProviderProps {
  children: ReactNode
}

export const NotificationProvider = ({ children }: NotificationProviderProps) => {
  const notificationService = NotificationService.getInstance()
  // Son bildirim mesajını takip et
  const [lastNotification, setLastNotification] = useState<string | null>(null)
  // Toplam bildirim sayısını takip et
  const [notificationCount, setNotificationCount] = useState(0)

  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        const token = await requestNotificationPermission()
        if (token) {
          console.log('Notification permission granted, token:', token)
        } else {
          console.log('Notification permission denied')
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error)
      }
    }

    initializeNotifications()

    // Browser notification event'lerini dinle
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Sayfa görünür olduğunda bildirim sayısını sıfırla
        setNotificationCount(0)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Real-time bildirim dinleme - localStorage'dan bildirim durumunu kontrol et
    const checkForNewNotifications = () => {
      const lastNotificationTime = localStorage.getItem('lastNotificationTime')
      const currentTime = Date.now().toString()
      
      if (lastNotificationTime && lastNotificationTime !== currentTime) {
        // Yeni bildirim var, sayacı artır
        setNotificationCount(prev => prev + 1)
        localStorage.setItem('lastNotificationTime', currentTime)
      }
    }
    
    // Her 2 saniyede bir kontrol et
    const notificationCheckInterval = setInterval(checkForNewNotifications, 2000)

    const handleMessage = async () => {
      try {
        const payload = await onMessageListener() as any
        if (payload) {
          const message = payload.notification?.body || 'Yeni bildirim'
          setLastNotification(message)
          setNotificationCount(prev => prev + 1)
          alert(`Kelime Hatırlatması: ${message}`)
        }
      } catch (error) {
        console.error('Error handling message:', error)
      }
    }

    handleMessage()

    return () => {
      notificationService.clearAllNotifications()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearInterval(notificationCheckInterval)
    }
  }, [])

  const requestPermission = async (): Promise<string | null> => {
    try {
      return await requestNotificationPermission()
    } catch (error) {
      console.error('Error requesting permission:', error)
      return null
    }
  }

  return (
    <NotificationContext.Provider value={{ 
      requestPermission, 
      lastNotification, 
      notificationCount 
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotification = () => {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
}
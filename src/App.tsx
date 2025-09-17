import { useState, useEffect } from 'react'
import { WordForm } from './components/WordForm'
import { WordList } from './components/WordList'
import { Settings } from './components/Settings'
import { NotificationProvider, useNotification } from './components/NotificationProvider'

const AppContent = () => {
  const [activeTab, setActiveTab] = useState<'words' | 'add' | 'settings'>('words')
  const { notificationCount, lastNotification } = useNotification()
  
  // localStorage'dan son bildirim mesajını al
  const [lastStoredNotification, setLastStoredNotification] = useState<string>('')
  // Son güncellenen kelimenin tekrar sayısını takip et
  const [lastUpdatedWord, setLastUpdatedWord] = useState<string>('')
  
  useEffect(() => {
    // İlk yüklemede localStorage'dan oku
    const storedNotification = localStorage.getItem('lastNotificationWord')
    if (storedNotification) {
      setLastStoredNotification(storedNotification)
    }
    
    // Her 2 saniyede bir localStorage'ı kontrol et
    const checkInterval = setInterval(() => {
      // Bildirim kontrolü
      const currentStored = localStorage.getItem('lastNotificationWord')
      if (currentStored && currentStored !== lastStoredNotification) {
        setLastStoredNotification(currentStored)
      }
      
      // Tekrar sayısı güncellemesi kontrolü
      const updatedWordId = localStorage.getItem('updatedWordId')
      const newReviewCount = localStorage.getItem('updatedWordReviewCount')
      const updateTime = localStorage.getItem('lastWordUpdate')
      
      if (updatedWordId && newReviewCount && updateTime) {
        const updateMessage = `${updatedWordId} → ${newReviewCount} tekrar`
        if (updateMessage !== lastUpdatedWord) {
          setLastUpdatedWord(updateMessage)
          
          // 5 saniye sonra mesajı temizle
          setTimeout(() => {
            setLastUpdatedWord('')
          }, 5000)
        }
      }
    }, 2000)
    
    return () => clearInterval(checkInterval)
  }, [lastStoredNotification, lastUpdatedWord])

  const tabStyle = (isActive: boolean) => ({
    padding: '12px 24px',
    borderRadius: '6px 6px 0 0',
    border: 'none',
    backgroundColor: isActive ? 'white' : '#e2e8f0',
    color: isActive ? '#2b6cb0' : '#718096',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500',
    borderBottom: isActive ? '2px solid #2b6cb0' : '2px solid transparent',
    position: 'relative' as const
  })

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f7fafc', padding: '32px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Header */}
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '2.5rem', color: '#2b6cb0', marginBottom: '8px' }}>
              Word Pop
              {notificationCount > 0 && (
                <span style={{
                  display: 'inline-block',
                  marginLeft: '12px',
                  backgroundColor: '#F56565',
                  color: 'white',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  fontSize: '12px',
                  lineHeight: '24px',
                  fontWeight: 'bold'
                }}>
                  {notificationCount}
                </span>
              )}
            </h1>
            <h2 style={{ fontSize: '1.25rem', color: '#718096', fontWeight: 'normal' }}>
              Kelime öğrenme ve hatırlatma uygulaması
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(lastStoredNotification || lastNotification) && (
                <div style={{
                  padding: '8px 16px',
                  backgroundColor: '#E6FFFA',
                  borderRadius: '6px',
                  border: '1px solid #38B2AC',
                  fontSize: '14px',
                  color: '#234E52'
                }}>
                  🔔 Son bildirim: {lastStoredNotification || lastNotification}
                </div>
              )}
              
              {lastUpdatedWord && (
                <div style={{
                  padding: '8px 16px',
                  backgroundColor: '#F0FDF4',
                  borderRadius: '6px',
                  border: '1px solid #BBF7D0',
                  fontSize: '14px',
                  color: '#15803D'
                }}>
                  📊 Tekrar güncellendi: {lastUpdatedWord}
                </div>
              )}
            </div>
          </div>

            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid #e2e8f0' }}>
              <button
                style={tabStyle(activeTab === 'words')}
                onClick={() => setActiveTab('words')}
              >
                📚 Kelimelerim
              </button>
              <button
                style={tabStyle(activeTab === 'add')}
                onClick={() => setActiveTab('add')}
              >
                ➕ Kelime Ekle
              </button>
              <button
                style={tabStyle(activeTab === 'settings')}
                onClick={() => setActiveTab('settings')}
              >
                ⚙️ Ayarlar
              </button>
            </div>

            {/* Tab Content */}
            <div style={{ minHeight: '400px' }}>
              {activeTab === 'words' && (
                <div>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>Kelimelerim</h3>
                  <WordList />
                </div>
              )}
              
              {activeTab === 'add' && (
                <div>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>Yeni Kelime Ekle</h3>
                  <WordForm />
                </div>
              )}
              
              {activeTab === 'settings' && (
                <div>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>Bildirim Ayarları</h3>
                  <Settings />
                </div>
              )}
            </div>
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <NotificationProvider>
      <AppContent />
    </NotificationProvider>
  )
}

export default App
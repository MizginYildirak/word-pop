importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js')

const firebaseConfig = {
  apiKey: "{{VITE_FIREBASE_API_KEY}}",
  authDomain: "{{VITE_FIREBASE_AUTH_DOMAIN}}",
  projectId: "{{VITE_FIREBASE_PROJECT_ID}}",
  storageBucket: "{{VITE_FIREBASE_STORAGE_BUCKET}}",
  messagingSenderId: "{{VITE_FIREBASE_MESSAGING_SENDER_ID}}",
  appId: "{{VITE_FIREBASE_APP_ID}}",
  measurementId: "{{VITE_FIREBASE_MEASUREMENT_ID}}"
}

firebase.initializeApp(firebaseConfig)

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  console.log('Received background message ', payload)
  
  const notificationTitle = payload.notification.title
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/vite.svg',
    badge: '/vite.svg',
    tag: payload.data?.wordId || 'word-notification',
    requireInteraction: true,
    actions: [
      {
        action: 'review',
        title: 'Tekrar Et'
      },
      {
        action: 'dismiss',
        title: 'Kapat'
      }
    ]
  }

  self.registration.showNotification(notificationTitle, notificationOptions)
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  if (event.action === 'review') {
    event.waitUntil(
      clients.openWindow('/')
    )
  }
})
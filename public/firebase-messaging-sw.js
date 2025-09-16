// firebase-messaging-sw.js
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAbFbM5kNWZIi8P6hxYyR7vtnn1vhi8U2o",
  authDomain: "word-pop-aa22e.firebaseapp.com",
  projectId: "word-pop-aa22e",
  storageBucket: "word-pop-aa22e.firebasestorage.app",
  messagingSenderId: "229768898405",
  appId: "1:229768898405:web:641f2fd7135347de8f638c",
  measurementId: "G-B3782PZFPQ",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("Arka planda mesaj:", payload);
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/logo192.png",
  });
});

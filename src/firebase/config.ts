// src/firebase/config.ts
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyAbFbM5kNWZIi8P6hxYyR7vtnn1vhi8U2o",
  authDomain: "word-pop-aa22e.firebaseapp.com",
  projectId: "word-pop-aa22e",
  storageBucket: "word-pop-aa22e.firebasestorage.app",
  messagingSenderId: "229768898405",
  appId: "1:229768898405:web:641f2fd7135347de8f638c",
  measurementId: "G-B3782PZFPQ",
};

const app = initializeApp(firebaseConfig);

export default app;

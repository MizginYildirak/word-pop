// src/firebase/messaging.ts
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import app from "./config";

const messaging = getMessaging(app);

export { messaging, getToken, onMessage };

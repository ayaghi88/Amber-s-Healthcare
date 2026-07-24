/// <reference types="vite/client" />
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Safely resolve firebase-applet-config.json if present in repo, avoiding build errors if missing on Render
let jsonConfig: Record<string, any> = {};
try {
  const configs = import.meta.glob("../../firebase-applet-config.json", { eager: true });
  const configPath = "../../firebase-applet-config.json";
  if (configs[configPath]) {
    jsonConfig = ((configs[configPath] as any).default || configs[configPath]) as Record<string, any>;
  }
} catch (e) {
  // Config file missing or excluded in build
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || jsonConfig.apiKey || "dummy-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || jsonConfig.authDomain || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || jsonConfig.projectId || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || jsonConfig.storageBucket || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || jsonConfig.messagingSenderId || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || jsonConfig.appId || ""
};

const dbId = import.meta.env.VITE_FIRESTORE_DATABASE_ID || jsonConfig.firestoreDatabaseId || "(default)";

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app, dbId);

export default app;


import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";
import { getStorage, FirebaseStorage } from "firebase/storage";
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

const isConfigValid = firebaseConfig.apiKey && firebaseConfig.apiKey !== "your_api_key";

let app;
let db: Firestore;
let auth: Auth;
let storage: FirebaseStorage;

if (isConfigValid) {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  storage = getStorage(app);
} else {
  console.warn("Firebase configuration is missing or invalid. Running in mock mode.");
  // Mock implementations to prevent crashes
  db = { 
    collection: () => ({ doc: () => ({ onSnapshot: () => () => {} }) }),
    doc: () => ({ onSnapshot: () => () => {} }) 
  } as unknown as Firestore;
  auth = { 
    onAuthStateChanged: (cb: (user: import("firebase/auth").User | null) => void) => { cb(null); return () => {}; },
    signOut: async () => {} 
  } as unknown as Auth;
  storage = {} as unknown as FirebaseStorage;
}

export { db, auth, storage };

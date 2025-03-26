import { initializeApp, FirebaseApp, getApps, getApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAnalytics, Analytics } from 'firebase/analytics';

// Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: "AIzaSyCK3KPMZGa-wIxLp2jvypIn1kb0Dpjkl5I",
  authDomain: "intelligensi-ai-v2.firebaseapp.com",
  projectId: "intelligensi-ai-v2",
  storageBucket: "intelligensi-ai-v2.firebasestorage.app",
  messagingSenderId: "254810072342",
  appId: "1:254810072342:web:97635b51138ab90a8f9c37"
};

// Prevent duplicate Firebase initialization
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const analytics: Analytics = getAnalytics(app);

export { app, auth, db, analytics };
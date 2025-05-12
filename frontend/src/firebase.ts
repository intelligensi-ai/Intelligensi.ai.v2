import { initializeApp, FirebaseApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator, Auth } from "firebase/auth";
import { getFunctions, connectFunctionsEmulator, Functions } from "firebase/functions";
import { getFirestore, Firestore } from 'firebase/firestore'; // Add Firestore
import { getAnalytics, Analytics } from 'firebase/analytics'; // Add Analytics

// Import the configuration
import { firebaseConfig } from "./components/Config/firebaseConfig"; 

// Initialize Firebase App (prevent duplicates)
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase services
const auth: Auth = getAuth(app);
const functions: Functions = getFunctions(app, "us-central1"); // Specify your region
let db: Firestore | null = null; // Initialize lazily or based on usage
let analytics: Analytics | null = null; // Initialize lazily or based on usage

try {
  db = getFirestore(app);
} catch (error) {
  console.warn("[Firebase Init] Firestore initialization failed (maybe not used?):", error);
}

try {
  // Check if window is defined for Analytics (prevents SSR errors)
  if (typeof window !== 'undefined') {
    analytics = getAnalytics(app);
  } else {
      console.log("[Firebase Init] Skipping Analytics initialization (not in browser).")
  }
} catch (error) {
  console.warn("[Firebase Init] Analytics initialization failed (maybe not used?):", error);
}


// Log NODE_ENV value
console.log(`[Firebase Init] NODE_ENV: ${process.env.NODE_ENV}`);

// Connect to emulators in development
if (process.env.NODE_ENV === 'development') {
  console.log("[Firebase Init] In development mode, connecting emulators...");
  try {
    // Connect Auth Emulator (assuming default port 9099)
    connectAuthEmulator(auth, "http://localhost:9099");
    console.log("[Firebase Init] Auth emulator connected.");

    // Connect Functions Emulator (assuming default port 5001)
    connectFunctionsEmulator(functions, "localhost", 5001);
    console.log("[Firebase Init] Functions emulator connected.");

    // TODO: Add connectFirestoreEmulator if using Firestore emulator
    // if (db) { connectFirestoreEmulator(db, 'localhost', 8080); console.log("Firestore emulator connected."); }

  } catch (error) {
    console.error("[Firebase Init] Error connecting emulators:", error);
  }
} else {
  console.log("[Firebase Init] In non-development mode, using production services.");
}

export { app, auth, functions, db, analytics }; // Export all initialized services



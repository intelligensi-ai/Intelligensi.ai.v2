import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

// Import the functions you need from the SDKs you need


// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCK3KPMZGa-wIxLp2jvypIn1kb0Dpjkl5I",
  authDomain: "intelligensi-ai-v2.firebaseapp.com",
  projectId: "intelligensi-ai-v2",
  storageBucket: "intelligensi-ai-v2.firebasestorage.app",
  messagingSenderId: "254810072342",
  appId: "1:254810072342:web:97635b51138ab90a8f9c37"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);


// Initialize Firebase services
const auth = getAuth(app);
const functions = getFunctions(app, "us-central1"); // Specify your region

// Connect to emulators in development
if (process.env.NODE_ENV === 'development') {
  console.log("[Firebase Init] In development mode, connecting emulators...");
  try {
    // Connect Auth Emulator (assuming default port 9099)
    connectAuthEmulator(auth, "http://localhost:9099");
    console.log("[Firebase Init] Auth emulator connected.");

    // Connect Functions Emulator (port 5001)
    connectFunctionsEmulator(functions, "localhost", 5001);
    console.log("[Firebase Init] Functions emulator connected.");
  } catch (error) {
    console.error("[Firebase Init] Error connecting emulators:", error);
  }
} else {
  console.log("[Firebase Init] In non-development mode, using production services.");
}

export { auth, functions };


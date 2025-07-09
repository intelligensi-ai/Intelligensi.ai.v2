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

// Using production services
console.log("[Firebase Init] Using production Firebase services.");

// If you need to use emulators during development, uncomment this block:
/*
if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_USE_EMULATORS === 'true') {
  console.log("[Firebase Init] Connecting to emulators...");
  try {
    // Connect to emulators if needed
    // connectAuthEmulator(auth, "http://localhost:9099");
    // connectFunctionsEmulator(functions, "localhost", 5001);
    console.log("[Firebase Init] Emulators connected.");
  } catch (error) {
    console.error("[Firebase Init] Error connecting emulators:", error);
  }
}
*/

export { auth, functions };


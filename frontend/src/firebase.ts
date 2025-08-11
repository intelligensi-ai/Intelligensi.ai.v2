import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";

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

console.log("[Firebase] Using production Firebase services");

export { auth, functions };


// Test script for createDrupalSite function
const { initializeApp } = require('firebase/app');
const { getFunctions, httpsCallable, connectFunctionsEmulator } = require('firebase/functions');

// Your Firebase configuration
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
const functions = getFunctions(app);

// Connect to the local emulator when testing locally
// Comment this out when testing against production
connectFunctionsEmulator(functions, "localhost", 5001);

// Create a reference to the createDrupalSite function
const createDrupalSite = httpsCallable(functions, 'createDrupalSite');

// Call the function with a test site name
async function testCreateDrupalSite() {
  try {
    const result = await createDrupalSite({
      customName: "test-site-" + Date.now()
    });
    
    console.log('Function call successful!');
    console.log('Result:', JSON.stringify(result.data, null, 2));
  } catch (error) {
    console.error('Error calling function:', error);
  }
}

// Run the test
testCreateDrupalSite();

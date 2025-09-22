import { storage, bucket } from "../src/firebase";
import * as admin from 'firebase-admin';

async function testStorage() {
  // Use emulator in development
  if (process.env.FUNCTIONS_EMULATOR === 'true') {
    console.log('Using Firebase Storage Emulator');
    process.env.FIREBASE_STORAGE_EMULATOR_HOST = '127.0.0.1:9199';
    
    // Re-initialize storage with emulator settings
    const app = admin.initializeApp();
    const bucket = storage.bucket('intelligensi-ai-v2.firebasestorage.app');
  }
  try {
    console.log('Testing storage with bucket:', bucket.name);
    
    // Test if we can list files
    const [files] = await bucket.getFiles();
    console.log(`\nFiles in ${bucket.name}:`);
    
    if (files.length > 0) {
      files.forEach(file => {
        console.log(`- ${file.name}`);
      });
    } else {
      console.log('No files found in the bucket.');
    }
    
    // Try to upload a test file
    const testFileName = `test-${Date.now()}.txt`;
    const file = bucket.file(testFileName);
    
    try {
      await file.save('This is a test file', {
        metadata: { contentType: 'text/plain' },
        resumable: false
      });
      console.log(`\nSuccessfully uploaded test file: ${testFileName}`);
      
      // Make the file public
      await file.makePublic();
      console.log(`File is publicly accessible at: http://127.0.0.1:9199/v0/b/${bucket.name}/o/${encodeURIComponent(testFileName)}?alt=media`);
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
    
    return { success: true, bucket: bucket.name, file: testFileName };
  } catch (error) {
    console.error('Error testing storage:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Run the test
testStorage()
  .then(result => console.log('Test completed:', result))
  .catch(console.error);

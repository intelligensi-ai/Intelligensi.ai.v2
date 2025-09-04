import { initializeApp, getApps, getApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

// Initialize once only
const app = getApps().length === 0 ?
  initializeApp({
    storageBucket: "intelligensi-ai-v2.firebasestorage.app",
  }) :
  getApp();

// Initialize storage with the correct bucket name
const storage = getStorage(app);
const bucket = storage.bucket("intelligensi-ai-v2.firebasestorage.app");

export { app, storage, bucket };

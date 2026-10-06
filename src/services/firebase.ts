import { getApp } from '@react-native-firebase/app';
import {
  CACHE_SIZE_UNLIMITED,
  initializeFirestore,
} from '@react-native-firebase/firestore';

let persistenceEnabled = false;

// Must run before any other Firestore call, so it is invoked from index.js at startup.
export function initFirebase() {
  if (persistenceEnabled) return;
  try {
    initializeFirestore(getApp(), {
      persistence: true,
      cacheSizeBytes: CACHE_SIZE_UNLIMITED,
    });
  } catch {
    // settings can only be set once per app instance; ignore if already applied
  }
  persistenceEnabled = true;
}

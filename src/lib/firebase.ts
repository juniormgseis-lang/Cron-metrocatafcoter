import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  onSnapshot, 
  updateDoc, 
  setDoc, 
  getDoc, 
  serverTimestamp, 
  Timestamp,
  writeBatch,
  initializeFirestore,
  collection,
  addDoc,
  query,
  where,
  type Firestore
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

import { getQuickSignature } from './security';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore without persistence to avoid tab locking issues
export const db: Firestore = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  ignoreUndefinedProperties: true
}, firebaseConfig.firestoreDatabaseId);

// --- CLOCK SYNCHRONIZATION (NTP-STYLE) ---
let currentOffset = 0;
let isCalibrated = false;
const sessionSyncId = Math.random().toString(36).substring(2, 15);

export const calibrateClock = async (force = false) => {
  if (isCalibrated && !force) return;
  const syncDoc = doc(db, 'sessions', `sync_${sessionSyncId}`);
  const samples = force ? 3 : 5; // Use fewer samples for periodic re-sync
  let bestRtt = Infinity;
  let bestOffset = 0;
  const signature = getQuickSignature();

  for (let i = 0; i < samples; i++) {
    try {
      const t0 = Date.now();
      // Use setDoc with a unique ID to avoid collisions
      await setDoc(syncDoc, { 
        ping: serverTimestamp(), 
        sample: i,
        signature: signature 
      });
      const snap = await getDoc(syncDoc);
      
      if (snap.exists()) {
        const t1 = Date.now();
        const rtt = t1 - t0;
        const srv = (snap.data().ping as Timestamp).toMillis();
        
        // NTP Filter: we take the sample with the lowest RTT (jitter filtering)
        if (rtt < bestRtt) {
          bestRtt = rtt;
          bestOffset = srv - (t0 + t1) / 2;
        }
      }
      // Wait a bit between samples to avoid burst noise
      await new Promise(r => setTimeout(r, 150));
    } catch (e) {
      console.warn('[Sync] Sample failed:', e);
    }
  }

  if (bestRtt !== Infinity) {
    // Smooth transition for offset to avoid jumps in timer display
    if (!isCalibrated) {
      currentOffset = bestOffset;
    } else {
      // 20% weight to new best sample for stability
      currentOffset = (currentOffset * 0.8) + (bestOffset * 0.2);
    }
    isCalibrated = true;
    console.log(`[Sync] ${force ? 'Refined' : 'Calibrated'} (RTT: ${bestRtt}ms, Offset: ${currentOffset.toFixed(2)}ms)`);
  }
};

calibrateClock();
// Re-sync every 30 seconds for high precision, forcing it to run
setInterval(() => calibrateClock(true), 30000);

export const getServerNow = () => Date.now() + currentOffset;
export const getIsCalibrated = () => isCalibrated;

export { 
  doc, 
  onSnapshot, 
  updateDoc, 
  setDoc, 
  getDoc, 
  serverTimestamp, 
  Timestamp, 
  writeBatch,
  collection,
  addDoc,
  query,
  where,
  signInAnonymously,
  onAuthStateChanged
};

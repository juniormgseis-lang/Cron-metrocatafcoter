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

export const calibrateClock = async () => {
  if (isCalibrated) return; // Only calibrate once at start unless forced
  const syncDoc = doc(db, 'sync', 'handshake');
  const samples = 4; // Increased samples
  let bestRtt = Infinity;
  let bestOffset = 0;
  const signature = getQuickSignature();

  for (let i = 0; i < samples; i++) {
    try {
      const t0 = Date.now();
      // Added signature to match security rules
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
        
        // We take the sample with the lowest RTT (jitter filtering)
        if (rtt < bestRtt) {
          bestRtt = rtt;
          bestOffset = srv - (t0 + t1) / 2;
        }
      }
      await new Promise(r => setTimeout(r, 200));
    } catch (e) {
      console.warn('[Sync] Calibragem falhou...', e);
    }
  }

  if (bestRtt !== Infinity) {
    currentOffset = bestOffset;
    isCalibrated = true;
    console.log(`[Sync] Calibrado (RTT: ${bestRtt}ms, Offset: ${currentOffset}ms)`);
  }
};

calibrateClock();
// Re-sync every minute for high precision
setInterval(calibrateClock, 60000);

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
  signInAnonymously,
  onAuthStateChanged
};

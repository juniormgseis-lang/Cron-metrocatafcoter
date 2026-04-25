import { useState, useEffect, useCallback, useRef } from 'react';
import { alerts, requestNotificationPermission } from '../lib/audio';
import { db, doc, onSnapshot, setDoc, getServerNow, Timestamp, serverTimestamp, writeBatch, auth, signInAnonymously, onAuthStateChanged, getIsCalibrated, calibrateClock } from '../lib/firebase';
import { generateAppSignature } from '../lib/security';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';

const MAX_SECONDS = 720; // 12 minutes
const SYNC_PATH = 'sync/timer'; // Aligned with firebase-blueprint.json

export type TimerState = 'idle' | 'running' | 'paused' | 'finished';

export interface TimerData {
  state: TimerState;
  startTime: Timestamp | null;
  accumulatedTime: number;
}

export function useTimer() {
  const timerDataRef = useRef<TimerData>({
    state: 'idle',
    startTime: null,
    accumulatedTime: 0
  });

  const [state, setState] = useState<TimerState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isCalibrated, setIsCalibrated] = useState(getIsCalibrated());
  const [signature, setSignature] = useState<string | null>(null);
  const firedAlerts = useRef<Set<number>>(new Set());

  // Initialize security signature and Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        try {
          await signInAnonymously(auth);
        } catch (err) {
          console.error("Auth failed:", err);
        }
      } else {
        // Trigger clock calibration now that we have auth
        await calibrateClock();
        setIsCalibrated(getIsCalibrated());
      }
      const sig = await generateAppSignature();
      setSignature(sig);
    });
    return () => unsubscribe();
  }, []);

  // 1. High-Precision Local Engine
  useEffect(() => {
    let rafId: number;

    const render = () => {
      const data = timerDataRef.current;
      const now = getServerNow();

      if (data.state === 'running' && data.startTime) {
        const startMillis = data.startTime.toMillis();
        const duration = (now - startMillis) + data.accumulatedTime;
        const totalSecs = Math.floor(duration / 1000);
        
        if (totalSecs >= MAX_SECONDS) {
          setElapsed(MAX_SECONDS);
        } else {
          setElapsed(Math.max(0, totalSecs));
        }
      } else if (data.state === 'paused' || data.state === 'idle') {
        setElapsed(Math.floor(data.accumulatedTime / 1000));
      } else if (data.state === 'finished') {
        setElapsed(MAX_SECONDS);
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // 2. Global Synchronization Listener
  useEffect(() => {
    const timerDocRef = doc(db, SYNC_PATH);
    
    const unsubscribe = onSnapshot(timerDocRef, { includeMetadataChanges: true }, (snapshot) => {
      setIsConnected(true);
      
      if (snapshot.exists()) {
        const data = snapshot.data();
        
        // Anti-jitter: prioritize local precision during active writes
        if (snapshot.metadata.hasPendingWrites) return;

        timerDataRef.current = {
          state: data.state as TimerState,
          startTime: data.startTime as Timestamp | null,
          accumulatedTime: data.accumulatedTime || 0
        };
        
        setState(data.state as TimerState);
      } else {
        // Document doesn't exist yet, wait for Admin bootstrap
        setIsConnected(true);
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, SYNC_PATH));

    return () => unsubscribe();
  }, []);

  const finish = useCallback(() => {
    if (!signature) return;
    
    // Update local state immediately to avoid double calls
    timerDataRef.current = {
      state: 'finished',
      startTime: null,
      accumulatedTime: MAX_SECONDS * 1000
    };
    setState('finished');
    setElapsed(MAX_SECONDS);

    const timerDocRef = doc(db, SYNC_PATH);
    const batch = writeBatch(db);
    batch.set(timerDocRef, {
      state: 'finished',
      startTime: null,
      accumulatedTime: MAX_SECONDS * 1000,
      signature
    }, { merge: true });
    batch.commit().catch(err => handleFirestoreError(err, OperationType.WRITE, SYNC_PATH));
  }, [signature]);

  // 3. Automated Alert System
  useEffect(() => {
    if (state !== 'running') {
      if (state === 'idle') {
        firedAlerts.current.clear();
      }
      return;
    }

    const currentSecs = elapsed;
    const minutes = Math.floor(currentSecs / 60);

    // Initial Start Alert
    if (currentSecs === 0 && !firedAlerts.current.has(-1)) {
        alerts.start();
        firedAlerts.current.add(-1);
    }
    
    // Minute Alerts (1-10)
    if (minutes >= 1 && minutes <= 10 && currentSecs % 60 === 0 && !firedAlerts.current.has(minutes)) {
      alerts.minute();
      firedAlerts.current.add(minutes);
    }
    
    // 11th Minute specialized alert (660 seconds)
    if (currentSecs === 660 && !firedAlerts.current.has(11)) {
      alerts.elevenMinutes();
      firedAlerts.current.add(11);
    }
    
    // 12th Minute (720 seconds) - FINAL
    if (currentSecs >= MAX_SECONDS && !firedAlerts.current.has(12)) {
      alerts.twelveMinutes();
      firedAlerts.current.add(12);
      finish();
    }
  }, [elapsed, state, finish]);

  // 4. Multi-Device Action Handlers (Atomic set with merge)
  const start = useCallback(() => {
    if (!signature) return;
    
    firedAlerts.current.clear(); // Ensure clean slate on start
    const now = getServerNow();
    const timerDocRef = doc(db, SYNC_PATH);
    const epoch = Timestamp.fromMillis(now);
    
    const next: TimerData = {
      state: 'running',
      startTime: epoch,
      accumulatedTime: 0
    };

    timerDataRef.current = next;
    setState('running');
    setElapsed(0);

    const batch = writeBatch(db);
    batch.set(timerDocRef, {
      state: next.state,
      accumulatedTime: next.accumulatedTime,
      startTime: next.startTime,
      signature
    }, { merge: true });
    batch.commit().catch(err => handleFirestoreError(err, OperationType.WRITE, SYNC_PATH));
    
    alerts.start();
  }, [signature]);

  const pause = useCallback(() => {
    if (!signature) return;
    const data = timerDataRef.current;
    if (data.state !== 'running' || !data.startTime) return;
    
    const now = getServerNow();
    const currentDuration = now - data.startTime.toMillis();
    const newAccumulated = data.accumulatedTime + currentDuration;

    const timerDocRef = doc(db, SYNC_PATH);
    const next: TimerData = {
      state: 'paused',
      startTime: null,
      accumulatedTime: newAccumulated
    };

    timerDataRef.current = next;
    setState('paused');

    const batch = writeBatch(db);
    batch.set(timerDocRef, { 
      state: next.state,
      startTime: next.startTime,
      accumulatedTime: next.accumulatedTime,
      signature
    }, { merge: true });
    batch.commit().catch(err => handleFirestoreError(err, OperationType.WRITE, SYNC_PATH));
  }, [signature]);

  const resume = useCallback(() => {
    if (!signature) return;
    const now = getServerNow();
    const timerDocRef = doc(db, SYNC_PATH);
    
    const next: TimerData = {
      state: 'running',
      startTime: Timestamp.fromMillis(now),
      accumulatedTime: timerDataRef.current.accumulatedTime
    };

    timerDataRef.current = next;
    setState('running');
    
    const batch = writeBatch(db);
    batch.set(timerDocRef, {
      state: next.state,
      accumulatedTime: next.accumulatedTime,
      startTime: next.startTime,
      signature
    }, { merge: true });
    batch.commit().catch(err => handleFirestoreError(err, OperationType.WRITE, SYNC_PATH));
  }, [signature]);

  const reset = useCallback(() => {
    if (!signature) return;
    
    // Stop any pending alerts immediately
    firedAlerts.current.clear();
    
    const next: TimerData = {
      state: 'idle',
      startTime: null,
      accumulatedTime: 0
    };
    
    // Update local state first for immediate UI response
    timerDataRef.current = next;
    setState('idle');
    setElapsed(0);

    const timerDocRef = doc(db, SYNC_PATH);
    const batch = writeBatch(db);
    batch.set(timerDocRef, {
      state: next.state,
      startTime: next.startTime,
      accumulatedTime: next.accumulatedTime,
      signature
    }, { merge: true });
    batch.commit().catch(err => handleFirestoreError(err, OperationType.WRITE, SYNC_PATH));
  }, [signature]);

  return {
    elapsed,
    state,
    isConnected,
    isCalibrated,
    start,
    pause,
    resume,
    reset
  };
}

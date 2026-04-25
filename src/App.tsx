/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useMemo, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TafHeader } from './components/TafHeader';
import { StatusBadge } from './components/StatusBadge';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { TimerControls } from './components/TimerControls';
import { useTimer } from './hooks/useTimer';
import { getStoredTheme, type Theme } from './lib/themes';
import { ShieldAlert, Volume2, LogOut, Settings, Lock } from 'lucide-react';
import { WakeLockFallback } from './lib/nosleep';
import { cn } from './lib/utils';
import { auth, db, doc, onSnapshot, updateDoc, serverTimestamp } from './lib/firebase';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { requestNotificationPermission } from './lib/audio';
import { handleFirestoreError, OperationType } from './lib/firestoreErrors';

const ADMIN_PASSWORD = '@coter';
const SYNC_PATH = 'sync/timer'; // Synced with firebase-blueprint.json

// Global instance to persist across renders
const nosleep = new WakeLockFallback();

export default function App() {
  const [theme, setTheme] = useState<Theme>(getStoredTheme());
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [isWakeLocked, setIsWakeLocked] = useState(false);
  const [manualWakeLock, setManualWakeLock] = useState(true); // Default to true as it was intended
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [loginTime, setLoginTime] = useState<number>(Date.now());
  
  const sessionId = useMemo(() => crypto.randomUUID(), []);
  const wakeLockRef = useRef<any>(null);

  // Firestore Kick Listener
  useEffect(() => {
    const docRef = doc(db, SYNC_PATH);
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const kickServer = data.kickSignal;
        
        // If there's a kick signal from SOMEONE ELSE
        if (kickServer && kickServer.sourceId !== sessionId && isAdmin) {
          const kickTime = kickServer.timestamp?.toMillis ? kickServer.timestamp.toMillis() : 0;
          
          // Only kick if the signal was sent AFTER we logged in
          if (kickTime > loginTime) {
            handleLogout();
            alert('Sua sessão foi encerrada por outro administrador.');
          }
        }
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, SYNC_PATH));

    return () => unsubscribe();
  }, [sessionId, isAdmin]); // Re-subscribe when admin status changes to ensure protection
  
  const { 
    elapsed, 
    state, 
    isConnected, 
    isCalibrated,
    start, 
    pause, 
    resume, 
    reset 
  } = useTimer();

  // ... rest of the component

  // Initialize theme
  useEffect(() => {
    const root = document.documentElement;
    // Remove all possible theme classes
    root.classList.remove('theme-military', 'theme-night', 'theme-light');
    // Add current theme class
    root.classList.add(theme);
  }, [theme]);

  // Firebase Anonymous Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        signInAnonymously(auth).catch(console.error);
      }
    });

    // Check localStorage for persisted admin state (optional, but good for UX)
    const storedAdmin = localStorage.getItem('taf_admin_active');
    if (storedAdmin === 'true') {
      setLoginTime(Date.now());
      setIsAdmin(true);
    }

    return () => unsubscribe();
  }, []);

  // Wake Lock Logic
  const requestWakeLock = async () => {
    // Both native API and Video fallback
    try {
      await nosleep.activate();
    } catch (e) {
      console.warn('Fallback Nosleep failed', e);
    }
    
    if ('wakeLock' in navigator) {
      try {
        if (wakeLockRef.current) {
          // If already has a lock, we don't necessarily need a new one, 
          // but we check if it's released
          if (!wakeLockRef.current.released) return;
        }
        
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        setIsWakeLocked(true);

        wakeLockRef.current.addEventListener('release', () => {
          setIsWakeLocked(false);
          wakeLockRef.current = null;
          // Strategy: if it was released by system (e.g. battery), we might want to try again on next interaction
        });
      } catch (err) {
        console.warn('Native Wake Lock logic error (falling back):', err);
        // If native fails, we still consider it locked because Nosleep fallback is active
        setIsWakeLocked(true);
      }
    } else {
      // If native not supported, we rely on video fallback which we already called activate() for
      setIsWakeLocked(true);
    }
  };

  const releaseWakeLock = async () => {
    try {
      nosleep.deactivate();
    } catch (e) {}

    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch (err) {
        console.error('Erro ao liberar Wake Lock:', err);
      }
      wakeLockRef.current = null;
    }
    setIsWakeLocked(false);
  };

  // Main Wake Lock Management
  useEffect(() => {
    // Keep screen on if timer is running, finished, admin mode, or manual override
    const shouldBeLocked = state === 'running' || state === 'finished' || isAdmin || manualWakeLock;
    
    if (shouldBeLocked) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
  }, [state, isAdmin, manualWakeLock]);

  // Specific re-lock for critical timer events (warnings/finish)
  useEffect(() => {
    if (elapsed === 660 || elapsed === 720) {
      requestWakeLock();
    }
  }, [elapsed]);

  // Global Re-acquisition on Interaction
  // Mobile browsers often require a fresh gesture to keep the lock/video active
  useEffect(() => {
    const reacquireOnInteraction = () => {
      const shouldBeLocked = state === 'running' || state === 'finished' || isAdmin || manualWakeLock;
      if (shouldBeLocked && !isWakeLocked) {
        requestWakeLock();
      }
    };

    window.addEventListener('mousedown', reacquireOnInteraction);
    window.addEventListener('touchstart', reacquireOnInteraction);
    window.addEventListener('keydown', reacquireOnInteraction);

    return () => {
      window.removeEventListener('mousedown', reacquireOnInteraction);
      window.removeEventListener('touchstart', reacquireOnInteraction);
      window.removeEventListener('keydown', reacquireOnInteraction);
    };
  }, [state, isAdmin, isWakeLocked]);

  // Handle visibility change for Wake Lock re-acquisition
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const shouldBeLocked = state === 'running' || state === 'finished' || isAdmin || manualWakeLock;
        if (shouldBeLocked) {
          await requestWakeLock();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [state, isAdmin, manualWakeLock]);

  // Notifications permission
  const handleEnableAudio = async () => {
    const granted = await requestNotificationPermission();
    setAudioEnabled(true);
    if (!granted && 'Notification' in window && Notification.permission !== 'denied') {
      console.log('Permissão de notificação não concedida ou bloqueada.');
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem('taf_admin_active');
  };

  const handleLogin = async (e: FormEvent, autoKick: boolean = false) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      const now = Date.now();
      setLoginTime(now);
      setIsAdmin(true);
      localStorage.setItem('taf_admin_active', 'true');
      setShowLogin(false);
      setPasswordInput('');
      
      if (autoKick) {
        // We need to wait a tiny bit to ensure isAdmin is true if the kicker depends on it
        // but handleKickOthers is an async call we can just trigger
        setTimeout(() => handleKickOthers(), 100);
      }
    } else {
      alert('Senha incorreta');
    }
  };

  const handleKickOthers = async () => {
    if (!isAdmin) return;
    try {
      const docRef = doc(db, SYNC_PATH);
      await updateDoc(docRef, {
        kickSignal: {
          sourceId: sessionId,
          timestamp: serverTimestamp()
        }
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, SYNC_PATH);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const clearCache = async () => {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      for (const key of keys) {
        await caches.delete(key);
      }
    }
    window.location.reload();
  };

  const toggleManualWakeLock = async () => {
    const nextValue = !manualWakeLock;
    setManualWakeLock(nextValue);
    
    // Immediate action on user gesture to improve reliability on mobile
    if (nextValue) {
      await requestWakeLock();
    } else if (state !== 'running' && state !== 'finished' && !isAdmin) {
      // Only release if no other reason to keep it locked
      await releaseWakeLock();
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-between bg-background text-foreground transition-colors overflow-hidden border border-primary/20">
      <div className="w-full flex-1 flex flex-col items-center max-w-4xl mx-auto px-4">
        <TafHeader />
        
        <StatusBadge 
          isConnected={isConnected} 
          isCalibrated={isCalibrated}
          isLocked={isWakeLocked || manualWakeLock || state === 'running' || isAdmin} 
          timerState={state} 
        />

        {/* Action Required: Audio (Top Position) */}
        {!audioEnabled && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md mt-4 p-1 bg-gradient-to-r from-accent/50 via-primary/50 to-accent/50 rounded-2xl shadow-2xl"
          >
            <button
              onClick={handleEnableAudio}
              className="w-full flex items-center justify-center gap-3 p-5 bg-card text-foreground rounded-[14px] font-black uppercase tracking-tighter shadow-inner active:scale-95 transition-all hover:bg-muted"
            >
              <div className="bg-accent p-2 rounded-full text-accent-foreground animate-pulse">
                <Volume2 size={24} />
              </div>
              <div className="flex flex-col items-start translate-y-0.5">
                <span className="text-sm leading-none">Ativar Alertas e Voz</span>
                <span className="text-[10px] font-medium opacity-60 normal-case mt-1">Necessário para ouvir os sinais</span>
              </div>
            </button>
          </motion.div>
        )}

        {/* Timer Display */}
        <div className="flex-1 flex flex-col items-center justify-center w-full py-8">
            <div 
              className={`timer-font text-[30vw] md:text-[200px] leading-none mb-4 select-none transition-colors duration-500 ${
                elapsed >= 720 
                  ? 'text-destructive drop-shadow-[0_0_30px_hsl(var(--destructive)/0.5)]' 
                  : elapsed >= 660
                    ? 'text-orange-500 drop-shadow-[0_0_30px_rgba(249,115,22,0.4)]'
                    : 'text-timer drop-shadow-[0_0_30px_hsl(var(--timer-glow)/0.3)]'
              }`}
            >
             {formatTime(elapsed)}
           </div>
        </div>

        <div className="w-full pb-12 flex flex-col items-center gap-8">
          {!isAdmin ? (
            <div className="flex flex-col items-center gap-6">
              <ThemeSwitcher currentTheme={theme} onThemeChange={setTheme} />
              <button
                onClick={() => setShowLogin(true)}
                className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
              >
                <ShieldAlert size={14} />
                Área Administrativa
              </button>
            </div>
          ) : (
            <AnimatePresence>
               <motion.div
                 initial={{ opacity: 0, scale: 0.95 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 0.95 }}
                 className="w-full"
               >
                 <TimerControls 
                   state={state}
                   isCalibrated={isCalibrated}
                   onStart={start}
                   onPause={pause}
                   onResume={resume}
                   onReset={reset}
                   onLogout={handleLogout}
                   onKickAdmins={handleKickOthers}
                 />
                 <div className="mt-8">
                    <ThemeSwitcher currentTheme={theme} onThemeChange={setTheme} />
                 </div>
               </motion.div>
            </AnimatePresence>
          )}

          {/* Wake Lock Button (Bottom Position) */}
          <div className="w-full max-w-md flex flex-col gap-3">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "p-1 rounded-2xl transition-all duration-500",
                manualWakeLock 
                  ? "bg-gradient-to-r from-orange-500/30 via-accent/30 to-orange-500/30 shadow-lg" 
                  : "bg-muted/50 border border-border/50"
              )}
            >
              <button
                onClick={toggleManualWakeLock}
                className="w-full flex items-center justify-center gap-3 p-4 bg-card text-foreground rounded-[14px] font-bold uppercase tracking-tighter shadow-inner active:scale-95 transition-all hover:bg-muted"
              >
                <div className={cn(
                  "p-2 rounded-full transition-colors",
                  manualWakeLock ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
                )}>
                  {manualWakeLock ? <Lock size={20} /> : <Settings size={20} />}
                </div>
                <div className="flex flex-col items-start translate-y-0.5">
                  <span className="text-sm leading-none">
                    {manualWakeLock ? "Tela Travada (Ligada)" : "Tela Livre (Pode Apagar)"}
                  </span>
                  <span className="text-[10px] font-medium opacity-60 normal-case mt-1">
                    {manualWakeLock ? "O app manterá sua tela sempre ativa" : "Clique para impedir que a tela apague"}
                  </span>
                </div>
              </button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Footer Cleanup */}
      <footer className="w-full p-4 flex justify-center border-t border-border/50 bg-muted/10">
        <button
          onClick={clearCache}
          className="text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors"
        >
          Limpar cache e atualizar aplicação
        </button>
      </footer>

      {/* Login Modal */}
      <AnimatePresence>
        {showLogin && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-background/80 backdrop-blur-sm"
          >
            <motion.form 
              onSubmit={handleLogin}
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-xs bg-muted border border-border p-8 rounded-3xl shadow-2xl"
            >
              <h2 className="text-sm font-black uppercase tracking-widest mb-6 text-center text-accent">
                Autenticação Admin
              </h2>
              <input
                autoFocus
                type="password"
                placeholder="Senha"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-background border border-border p-4 rounded-xl mb-4 text-center focus:outline-none focus:border-accent transition-colors"
              />
              <div className="flex flex-col gap-2">
                <button
                  type="submit"
                  className="w-full p-4 bg-accent text-accent-foreground font-black uppercase rounded-xl active:scale-95 transition-transform"
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={(e) => handleLogin(e as any, true)}
                  className="w-full p-4 bg-red-600 text-white text-[10px] font-black uppercase rounded-xl active:scale-95 transition-transform"
                >
                  Entrar e Desconectar Outros
                </button>
                <button
                  type="button"
                  onClick={() => setShowLogin(false)}
                  className="w-full p-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
                >
                  Cancelar
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

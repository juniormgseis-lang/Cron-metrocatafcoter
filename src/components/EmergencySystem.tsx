/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, XCircle, Siren, CheckCircle2, Volume2, VolumeX } from 'lucide-react';
import { db, collection, addDoc, serverTimestamp, query, where, onSnapshot, doc, updateDoc } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import { cn } from '../lib/utils';

interface EmergencyAlert {
  id: string;
  active: boolean;
  reporterName: string;
  location?: string;
  timestamp: any;
}

interface EmergencySystemProps {
  user: any;
  isAdmin: boolean;
  timeDisplay: string;
}

export function EmergencySystem({ user, isAdmin, timeDisplay }: EmergencySystemProps) {
  const [activeAlerts, setActiveAlerts] = useState<EmergencyAlert[]>([]);
  const [isReporting, setIsReporting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [location, setLocation] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);

  // Siren Audio Logic
  useEffect(() => {
    if (activeAlerts.length > 0 && !isMuted && !isMinimized) {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime); // Low volume but audible
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      
      oscillatorRef.current = osc;

      // Ambulance oscillation pattern (Hi-Lo)
      const interval = setInterval(() => {
        if (oscillatorRef.current && ctx) {
          const currentFreq = oscillatorRef.current.frequency.value;
          const nextFreq = currentFreq === 440 ? 587.33 : 440; // A4 to D5
          oscillatorRef.current.frequency.setTargetAtTime(nextFreq, ctx.currentTime, 0.05);
        }
      }, 500);

      return () => {
        clearInterval(interval);
        osc.stop();
        osc.disconnect();
      };
    }
  }, [activeAlerts.length, isMuted, isMinimized]);

  // Listen for active emergencies
  useEffect(() => {
    const q = query(
      collection(db, 'emergencies'),
      where('active', '==', true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const alerts: EmergencyAlert[] = [];
      snapshot.forEach((doc) => {
        alerts.push({ id: doc.id, ...doc.data() } as EmergencyAlert);
      });
      
      // If a new emergency starts and we aren't currently alert, show it full screen
      if (alerts.length > activeAlerts.length) {
        setIsMinimized(false);
      }
      
      setActiveAlerts(alerts);
      
      if (alerts.length === 0) {
        setIsMinimized(false);
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'emergencies'));

    return () => unsubscribe();
  }, [activeAlerts.length]);

  const triggerEmergency = async () => {
    if (!user) return;
    setIsReporting(true);
    try {
      await addDoc(collection(db, 'emergencies'), {
        active: true,
        timestamp: serverTimestamp(),
        reporterId: user.uid,
        reporterName: user.displayName || user.email?.split('@')[0] || 'Aplicador',
        location: location.trim() || 'Não informada',
      });
      setShowConfirm(false);
      setLocation('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'emergencies');
    } finally {
      setIsReporting(false);
    }
  };

  const resolveEmergency = async (id: string) => {
    if (!isAdmin) return;
    try {
      const docRef = doc(db, 'emergencies', id);
      await updateDoc(docRef, {
        active: false,
        resolvedBy: user?.uid || 'Unknown'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `emergencies/${id}`);
    }
  };

  return (
    <>
      {/* The Floating Emergency Button (Now accessible to everyone authenticated) */}
      {user && (
        <div className="fixed bottom-24 right-4 z-40">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowConfirm(true)}
            className="flex flex-col items-center justify-center w-20 h-20 rounded-full bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.5)] border-4 border-white/20 animate-pulse"
          >
            <AlertTriangle size={28} />
            <span className="text-[10px] font-black uppercase mt-1">SOS</span>
          </motion.button>
        </div>
      )}

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-sm bg-card border-4 border-red-600 rounded-[2rem] p-8 text-center shadow-2xl"
            >
              <div className="bg-red-600/10 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={40} className="text-red-600" />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tighter mb-2 text-foreground">
                Confirmar Emergência?
              </h2>
              <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                Este sinal alertará IMEDIATAMENTE a equipe de saúde e todos os outros aplicadores conectados.
              </p>

              <div className="mb-6 text-left">
                <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-2 mb-1 block">
                  Sua Posição / Localização
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ex: Posto 5, Km 10, Curva 3..."
                  className="w-full p-4 bg-muted border-2 border-transparent focus:border-red-600 rounded-2xl outline-none font-bold placeholder:text-muted-foreground/50 transition-all"
                  autoFocus
                />
              </div>
              
              <div className="grid gap-3">
                <button
                  disabled={isReporting}
                  onClick={triggerEmergency}
                  className="w-full p-5 bg-red-600 text-white font-black uppercase rounded-2xl active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {isReporting ? 'Enviando...' : 'SIM, ENVIAR AGORA!'}
                  {!isReporting && <Siren className="animate-bounce" />}
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="w-full p-4 text-sm font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Screen Emergency Alert */}
      <AnimatePresence>
        {activeAlerts.length > 0 && !isMinimized && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-red-600 flex flex-col items-center justify-center p-6 text-white text-center select-none"
          >
            {/* Pulsing background effect */}
            <motion.div 
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="absolute inset-0 bg-black rounded-full scale-150 blur-3xl opacity-20"
            />

            <div className="relative z-10 max-w-md w-full">
              {/* Mute Control */}
              <button 
                onClick={() => setIsMuted(!isMuted)}
                className="absolute top-0 right-0 p-4 opacity-50 hover:opacity-100 transition-opacity"
              >
                {isMuted ? <VolumeX size={32} /> : <Volume2 size={32} className="animate-pulse" />}
              </button>

              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                transition={{ repeat: Infinity, duration: 0.5, repeatDelay: 1 }}
                className="bg-white p-6 rounded-full w-32 h-32 flex items-center justify-center mx-auto mb-8 shadow-2xl"
              >
                <Siren size={60} className="text-red-600" />
              </motion.div>

              <h1 className="text-5xl font-black uppercase tracking-tighter mb-4 drop-shadow-lg">
                EMERGÊNCIA MÉDICA!
              </h1>
              
              <div className="mb-8">
                {/* Fixed the duplicate text by simplified layout and using only the latest if multiple */}
                <div className="bg-white/10 border border-white/20 p-6 rounded-[2rem] backdrop-blur-md">
                  <p className="text-xs font-black uppercase tracking-[0.2em] opacity-70 mb-1">
                    Relatado por:
                  </p>
                  <p className="text-3xl font-black tracking-tight">
                    {activeAlerts[0].reporterName}
                  </p>

                  <div className="mt-2 text-red-200">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">
                      Localização:
                    </p>
                    <p className="text-xl font-bold uppercase tracking-tight">
                      {activeAlerts[0].location || 'Não informada'}
                    </p>
                  </div>
                  
                  {/* Timer Display in Gold */}
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-1">
                      Cronômetro Ativo
                    </p>
                    <p className="text-5xl font-black font-mono tracking-tighter text-[#FFD700] drop-shadow-[0_2px_10px_rgba(255,215,0,0.3)]">
                      {timeDisplay}
                    </p>
                  </div>

                  {activeAlerts.length > 1 && (
                    <p className="text-xs font-bold mt-2 opacity-60">
                      + {activeAlerts.length - 1} outros alertas ativos
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {isAdmin ? (
                  <button
                    onClick={() => resolveEmergency(activeAlerts[0].id)}
                    className="w-full flex items-center justify-center gap-3 p-6 bg-white text-red-600 font-extrabold uppercase rounded-[2rem] shadow-2xl active:scale-95 transition-transform"
                  >
                    <CheckCircle2 />
                    Situação Resolvida
                  </button>
                ) : (
                  <div className="animate-pulse py-4">
                    <p className="text-lg font-bold uppercase tracking-widest">
                      Equipe de saúde alertada
                    </p>
                  </div>
                )}

                <button
                  onClick={() => setIsMinimized(true)}
                  className="w-full p-4 bg-black/20 hover:bg-black/30 text-white font-bold uppercase rounded-2xl transition-colors border border-white/10 text-sm"
                >
                  Retornar ao Cronômetro
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Minimized Permanent Banner */}
      <AnimatePresence>
        {activeAlerts.length > 0 && isMinimized && (
          <motion.div
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            onClick={() => setIsMinimized(false)}
            className="fixed top-0 left-0 right-0 z-[110] bg-red-600 text-white p-3 flex items-center justify-center gap-3 shadow-xl cursor-pointer hover:bg-red-700 transition-colors"
          >
            <Siren size={20} className="animate-pulse" />
            <div className="flex flex-col items-start leading-none">
              <span className="font-black uppercase tracking-tighter text-[10px] opacity-80">
                EMERGÊNCIA ATIVA
              </span>
              <span className="font-bold text-xs">
                {activeAlerts[0].reporterName} • {activeAlerts[0].location || 'S/ Local'}
              </span>
            </div>
            <span className="text-[10px] bg-white/20 px-2 py-1 rounded-full font-bold uppercase ml-auto animate-bounce">
              Toque para Ver
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

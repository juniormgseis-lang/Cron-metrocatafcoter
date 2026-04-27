import { useState } from 'react';
import { Play, Pause, RotateCcw, LogOut, Users, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TimerState } from '../hooks/useTimer';
import { cn } from '../lib/utils';

interface TimerControlsProps {
  state: TimerState;
  isCalibrated: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onLogout: () => void;
  onKickAdmins: () => void;
}

export function TimerControls({ 
  state, 
  isCalibrated,
  onStart, 
  onPause, 
  onResume, 
  onReset, 
  onLogout,
  onKickAdmins
}: TimerControlsProps) {
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleResetClick = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = () => {
    onReset();
    setShowResetConfirm(false);
  };

  return (
    <div className="w-full max-w-md mx-auto flex flex-col gap-6 p-6 bg-muted/20 border border-border rounded-2xl relative">
      <div className="grid grid-cols-2 gap-4">
        {state === 'idle' && (
          <button
            onClick={onStart}
            disabled={!isCalibrated}
            className={cn(
              "col-span-2 flex items-center justify-center gap-2 h-16 bg-accent text-accent-foreground rounded-xl font-black uppercase text-xl shadow-xl shadow-accent/20 active:scale-95 transition-all",
              !isCalibrated && "opacity-50 cursor-not-allowed grayscale"
            )}
          >
            <Play size={24} fill="currentColor" />
            {isCalibrated ? 'Iniciar' : 'Calibrando...'}
          </button>
        )}

        {state === 'running' && (
          <button
            onClick={onPause}
            className="col-span-2 flex items-center justify-center gap-2 h-16 bg-status-paused text-status-paused-foreground rounded-xl font-black uppercase text-xl shadow-xl shadow-status-paused/20 active:scale-95 transition-transform"
          >
            <Pause size={24} fill="currentColor" />
            Pausar
          </button>
        )}

        {state === 'paused' && (
          <>
            <button
              onClick={onResume}
              disabled={!isCalibrated}
              className={cn(
                "flex items-center justify-center gap-2 h-16 bg-status-running text-status-running-foreground rounded-xl font-black uppercase text-lg shadow-xl shadow-status-running/20 active:scale-95 transition-all",
                !isCalibrated && "opacity-50 cursor-not-allowed grayscale"
              )}
            >
              <Play size={24} fill="currentColor" />
              Retomar
            </button>
            <button
              onClick={handleResetClick}
              className="flex items-center justify-center gap-2 h-16 bg-btn-reset text-btn-reset-foreground rounded-xl font-black uppercase text-lg shadow-xl shadow-btn-reset/20 active:scale-95 transition-transform"
            >
              <RotateCcw size={24} />
              Resetar
            </button>
          </>
        )}

        {state === 'finished' && (
          <button
            onClick={handleResetClick}
            className="col-span-2 flex items-center justify-center gap-2 h-16 bg-btn-reset text-btn-reset-foreground rounded-xl font-black uppercase text-xl shadow-xl shadow-btn-reset/20 active:scale-95 transition-transform"
          >
            <RotateCcw size={24} />
            Reiniciar
          </button>
        )}
      </div>

      <div className="h-px bg-border w-full" />

      <div className="flex flex-col gap-2">
        <button
          onClick={onKickAdmins}
          className="flex items-center justify-center gap-2 p-3 text-[10px] font-bold uppercase tracking-widest text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
        >
          <Users size={14} />
          Desconectar outros admins
        </button>
        <button
          onClick={onLogout}
          className="flex items-center justify-center gap-2 p-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-muted/50 rounded-lg transition-colors"
        >
          <LogOut size={14} />
          Sair do modo admin
        </button>
      </div>

      {/* Reset Confirmation Overlay */}
      <AnimatePresence>
        {showResetConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-4"
          >
            <div className="bg-btn-reset/20 p-3 rounded-full text-btn-reset">
              <AlertCircle size={32} />
            </div>
            <div>
              <h3 className="font-black uppercase tracking-tighter text-lg leading-tight">
                Zerar Cronômetro?
              </h3>
              <p className="text-xs text-muted-foreground mt-1 px-4">
                Essa ação não pode ser desfeita e todos os tempos atuais serão perdidos.
              </p>
            </div>
            <div className="flex gap-2 w-full mt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 p-3 bg-muted text-muted-foreground rounded-xl font-bold uppercase text-xs transition-colors hover:bg-muted/80"
              >
                Cancelar
              </button>
              <button
                onClick={confirmReset}
                className="flex-1 p-3 bg-btn-reset text-btn-reset-foreground rounded-xl font-bold uppercase text-xs transition-transform active:scale-95 shadow-lg shadow-btn-reset/20"
              >
                Sim, Zerar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


import { Play, Pause, RotateCcw, LogOut, Users } from 'lucide-react';
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
  return (
    <div className="w-full max-w-md mx-auto flex flex-col gap-6 p-6 bg-muted/20 border border-border rounded-2xl">
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
              onClick={onReset}
              className="flex items-center justify-center gap-2 h-16 bg-btn-reset text-btn-reset-foreground rounded-xl font-black uppercase text-lg shadow-xl shadow-btn-reset/20 active:scale-95 transition-transform"
            >
              <RotateCcw size={24} />
              Resetar
            </button>
          </>
        )}

        {state === 'finished' && (
          <button
            onClick={onReset}
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
    </div>
  );
}

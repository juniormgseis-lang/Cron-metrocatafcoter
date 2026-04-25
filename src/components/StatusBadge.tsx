import { Wifi, WifiOff, Lock, Unlock } from 'lucide-react';
import { cn } from '../lib/utils';
import type { TimerState } from '../hooks/useTimer';

interface StatusBadgeProps {
  isConnected: boolean;
  isCalibrated: boolean;
  isLocked: boolean;
  timerState: TimerState;
}

const stateLabels: Record<TimerState, string> = {
  idle: 'Aguardando',
  running: 'Em andamento',
  paused: 'Pausado',
  finished: 'Finalizado'
};

const stateColors: Record<TimerState, string> = {
  idle: 'bg-muted/20 text-muted-foreground border-muted-foreground/20',
  running: 'bg-status-running/10 text-status-running border-status-running/30',
  paused: 'bg-status-paused/10 text-status-paused border-status-paused/30',
  finished: 'bg-status-finished/10 text-status-finished border-status-finished/30'
};

export function StatusBadge({ isConnected, isCalibrated, isLocked, timerState }: StatusBadgeProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center items-center mb-6">
      {/* Clock Calibration Status */}
      <div className={cn(
        "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
        isCalibrated ? "bg-orange-500/10 text-orange-500 border-orange-500/20" : "bg-red-500/10 text-red-500 border-red-500/20 animate-pulse"
      )}>
        {isCalibrated ? 'Hora Precisa' : 'Calibrando Hora...'}
      </div>

      {/* Realtime Status */}
      <div className={cn(
        "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
        isConnected ? "bg-status-running/10 text-status-running border-status-running/20" : "bg-status-finished/10 text-status-finished border-status-finished/20"
      )}>
        {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
        {isConnected ? 'Sincronizado' : 'Offline'}
      </div>

      {/* Wake Lock Status */}
      <div className={cn(
        "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
        isLocked ? "bg-accent/10 text-accent border-accent/20" : "bg-muted/50 text-muted-foreground border-border"
      )}>
        {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
        {isLocked ? 'Tela Travada' : 'Tela Livre'}
      </div>

      {/* Timer State */}
      <div className={cn(
        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-colors",
        stateColors[timerState]
      )}>
        {stateLabels[timerState]}
      </div>
    </div>
  );
}

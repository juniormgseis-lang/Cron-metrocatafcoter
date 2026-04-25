/**
 * Web Audio API utility for TAF Timer
 */

let audioCtx: AudioContext | null = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

export async function playBeep(frequency: number, type: OscillatorType = 'sine', duration: number = 0.2) {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
  
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);
  
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

export function speak(text: string) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  }
}

export function vibrate(ms: number | number[]) {
  if ('vibrate' in navigator) {
    navigator.vibrate(ms);
  }
}

export function notify(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/favicon.ico', // fallback if exists
    } as any);
  }
}

export async function requestNotificationPermission() {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
}

// Specific alerts
export const alerts = {
  start: () => {
    playBeep(880, 'sine', 0.3);
    vibrate(100);
  },
  minute: () => {
    playBeep(700, 'sine', 0.2);
  },
  elevenMinutes: () => {
    // 3 beeps (sawtooth 660Hz) + voice + vibration + notification
    for (let i = 0; i < 3; i++) {
       setTimeout(() => playBeep(660, 'sawtooth', 0.2), i * 300);
    }
    speak("Onze minutos de prova");
    vibrate([200, 100, 200, 100, 200]);
    notify("Cronômetro TAF", "Atenção: 11 minutos de prova decorridos.");
  },
  twelveMinutes: () => {
    // final sequence (square 440Hz + sawtooth 880Hz) + voice + long vibration + notification
    playBeep(440, 'square', 0.5);
    setTimeout(() => playBeep(880, 'sawtooth', 0.5), 300);
    speak("Doze minutos, fim de prova");
    vibrate([500, 200, 500, 200, 1000]);
    notify("Cronômetro TAF", "Fim de prova: 12 minutos atingidos.");
  }
};

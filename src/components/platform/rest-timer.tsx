import { useEffect, useRef, useState } from "react";
import { Pause, Play, Plus, RotateCcw, Timer, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type RestTimerProps = {
  initialSeconds: number;
  exerciseName?: string;
  onClose: () => void;
};

function formatClock(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

export function RestTimer({ initialSeconds, exerciseName, onClose }: RestTimerProps) {
  const [totalSeconds, setTotalSeconds] = useState(initialSeconds);
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(true);
  const endsAt = useRef(Date.now() + initialSeconds * 1000);
  const audioContextRef = useRef<AudioContext | null>(null);
  const isFinished = secondsLeft <= 0;

  // Som suave com Web Audio API ao zerar o descanso
  function playBeep() {
    try {
      const ctx = audioContextRef.current ?? new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      audioContextRef.current = ctx;
      if (ctx.state === "suspended") ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);

      if ("vibrate" in navigator) {
        navigator.vibrate([150, 80, 150]);
      }
    } catch {
      // Ignora restrições de autoplay
    }
  }

  // Conta pelo relógio: com o celular bloqueado o intervalo atrasa, o horário final não.
  useEffect(() => {
    if (!isRunning) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((endsAt.current - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) {
        setIsRunning(false);
        playBeep();
      }
    };
    tick();
    const timer = setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [isRunning]);

  const progress = totalSeconds > 0 ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 100;

  function addSeconds(amount: number) {
    endsAt.current = (isFinished || !isRunning ? Date.now() + secondsLeft * 1000 : endsAt.current) + amount * 1000;
    setSecondsLeft((prev) => prev + amount);
    setTotalSeconds((prev) => prev + amount);
    setIsRunning(true);
  }

  function togglePause() {
    if (!isRunning) endsAt.current = Date.now() + secondsLeft * 1000;
    setIsRunning(!isRunning);
  }

  function restart() {
    endsAt.current = Date.now() + totalSeconds * 1000;
    setSecondsLeft(totalSeconds);
    setIsRunning(true);
  }

  return (
    <div
      role="timer"
      aria-label="Descanso entre séries"
      className="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 animate-fade-up sm:left-auto sm:right-6 sm:w-96 lg:bottom-6"
    >
      <div className="relative overflow-hidden rounded-lg border border-input bg-popover p-3 pt-4">
        <div className="absolute inset-x-0 top-0 h-1 bg-foreground/10">
          <div className={`h-full transition-[width] duration-300 ${isFinished ? "bg-success" : "bg-primary"}`} style={{ width: `${progress}%` }} />
        </div>

        <div className="flex items-center gap-3">
          <p className={`font-display text-5xl leading-none tabular-nums ${isFinished ? "text-success" : "text-foreground"}`}>{formatClock(secondsLeft)}</p>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Timer className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              {isFinished ? "Descanso concluído" : "Descanso"}
            </p>
            {exerciseName ? <p className="mt-0.5 truncate text-xs text-muted-foreground" title={exerciseName}>{exerciseName}</p> : null}
          </div>
          <Button size="icon" variant="ghost" className="shrink-0" onClick={onClose} aria-label="Fechar cronômetro">
            <X />
          </Button>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={() => addSeconds(15)}>
            <Plus /> 15 segundos
          </Button>
          {isFinished ? (
            <Button size="sm" onClick={restart}><RotateCcw /> Repetir</Button>
          ) : (
            <Button variant={isRunning ? "outline" : "default"} size="sm" onClick={togglePause}>
              {isRunning ? <><Pause /> Pausar</> : <><Play /> Continuar</>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

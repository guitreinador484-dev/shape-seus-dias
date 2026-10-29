import { useEffect, useState, useRef } from "react";
import { Play, Pause, RotateCcw, Plus, X, Timer, Volume2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type RestTimerProps = {
  initialSeconds: number;
  exerciseName?: string;
  onClose: () => void;
};

export function RestTimer({ initialSeconds, exerciseName, onClose }: RestTimerProps) {
  const [totalSeconds, setTotalSeconds] = useState(initialSeconds);
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

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

  useEffect(() => {
    setTotalSeconds(initialSeconds);
    setSecondsLeft(initialSeconds);
    setIsRunning(true);
    setIsFinished(false);
  }, [initialSeconds, exerciseName]);

  useEffect(() => {
    if (!isRunning || secondsLeft <= 0) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsRunning(false);
          setIsFinished(true);
          playBeep();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, secondsLeft]);

  const progress = totalSeconds > 0 ? Math.round(((totalSeconds - secondsLeft) / totalSeconds) * 100) : 100;

  function addSeconds(amount: number) {
    setSecondsLeft((prev) => prev + amount);
    setTotalSeconds((prev) => prev + amount);
    setIsFinished(false);
    setIsRunning(true);
  }

  function reset() {
    setSecondsLeft(totalSeconds);
    setIsFinished(false);
    setIsRunning(true);
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:w-96 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="overflow-hidden rounded-2xl border border-white/15 bg-[#121216]/95 backdrop-blur-2xl shadow-2xl shadow-black/80 text-white p-4">
        {/* Barra superior de progresso com brilho vermelho */}
        <div className="absolute top-0 inset-x-0 h-1 bg-white/10">
          <div
            className={`h-full transition-all duration-500 ${isFinished ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]" : "bg-primary shadow-[0_0_12px_rgba(230,0,0,0.8)]"}`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-start justify-between gap-3 pt-1">
          <div className="min-w-0">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary">
              <Timer className="h-3.5 w-3.5" />
              {isFinished ? "Descanso Concluído!" : "Descanso entre séries"}
            </span>
            {exerciseName && (
              <p className="text-xs text-white/60 truncate mt-0.5" title={exerciseName}>
                {exerciseName}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-white/40 hover:text-white hover:bg-white/10 transition"
            aria-label="Fechar timer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-4 mt-3">
          <div className="flex items-baseline gap-1">
            <span
              className={`font-display text-4xl tabular-nums leading-none tracking-tight ${
                isFinished ? "text-emerald-400 animate-pulse" : "text-white"
              }`}
            >
              {secondsLeft}
            </span>
            <span className="text-xs font-semibold text-white/50">seg</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2.5 text-xs rounded-xl border-white/15 bg-white/5 hover:bg-white/10 text-white"
              onClick={() => addSeconds(15)}
            >
              <Plus className="h-3 w-3 mr-1" /> 15s
            </Button>

            {!isFinished ? (
              <Button
                size="sm"
                variant={isRunning ? "outline" : "default"}
                className={`h-8 px-3 text-xs rounded-xl ${
                  isRunning
                    ? "border-white/15 bg-white/5 hover:bg-white/10 text-white"
                    : "bg-primary text-primary-foreground"
                }`}
                onClick={() => setIsRunning(!isRunning)}
              >
                {isRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              </Button>
            ) : (
              <Button
                size="sm"
                className="h-8 px-3 text-xs rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white"
                onClick={reset}
              >
                <RotateCcw className="h-3 w-3 mr-1" /> Repetir
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

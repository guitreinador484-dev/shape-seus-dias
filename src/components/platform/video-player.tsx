import { useCallback, useEffect, useRef, useState } from "react";
import {
  Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, X, Loader2,
  RotateCcw, RotateCw, PictureInPicture2, SkipForward, Settings2, Check,
} from "lucide-react";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function formatTime(s: number) {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}

export type VideoPlayerProps = {
  src: string;
  title?: string;
  subtitle?: string;
  poster?: string;
  startAt?: number;
  autoPlay?: boolean;
  className?: string;
  onTime?: (seconds: number, duration: number) => void;
  onEnded?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  onClose?: () => void;
};

/** Full custom-control HTML5 player: scrub bar with buffer, ±10s, speed, volume, PiP, fullscreen, keyboard. */
export function VideoPlayer({
  src, title, subtitle, poster, startAt = 0, autoPlay = true, className = "",
  onTime, onEnded, onNext, nextLabel = "Próxima aula", onClose,
}: VideoPlayerProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideTimer = useRef<number | null>(null);
  const seededRef = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [fs, setFs] = useState(false);
  const [chrome, setChrome] = useState(true);
  const [menu, setMenu] = useState(false);
  const [scrubHover, setScrubHover] = useState<number | null>(null);

  seededRef.current = seededRef.current && true;

  const bump = useCallback(() => {
    setChrome(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (!videoRef.current?.paused) setChrome(false);
    }, 2800);
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play(); else v.pause();
    bump();
  }, [bump]);

  const seekBy = useCallback((delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.min(v.duration || Infinity, Math.max(0, v.currentTime + delta));
    bump();
  }, [bump]);

  const toggleFullscreen = useCallback(async () => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    else await el.requestFullscreen?.().catch(() => {});
  }, []);

  useEffect(() => {
    const onFs = () => setFs(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      switch (e.key) {
        case " ": case "k": case "K": e.preventDefault(); togglePlay(); break;
        case "ArrowRight": e.preventDefault(); seekBy(10); break;
        case "ArrowLeft": e.preventDefault(); seekBy(-10); break;
        case "j": case "J": seekBy(-10); break;
        case "l": case "L": seekBy(10); break;
        case "ArrowUp": e.preventDefault(); setVolume((x) => { const n = Math.min(1, x + 0.1); if (videoRef.current) { videoRef.current.volume = n; videoRef.current.muted = false; } setMuted(false); return n; }); bump(); break;
        case "ArrowDown": e.preventDefault(); setVolume((x) => { const n = Math.max(0, x - 0.1); if (videoRef.current) videoRef.current.volume = n; return n; }); bump(); break;
        case "m": case "M": setMuted((m) => { if (videoRef.current) videoRef.current.muted = !m; return !m; }); bump(); break;
        case "f": case "F": void toggleFullscreen(); break;
        case "Escape": if (!document.fullscreenElement) onClose?.(); break;
        default: break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, seekBy, toggleFullscreen, onClose, bump]);

  // reset per source
  useEffect(() => { seededRef.current = false; setWaiting(true); setCurrent(0); setDuration(0); }, [src]);

  function onLoaded() {
    const v = videoRef.current;
    if (!v) return;
    setDuration(v.duration || 0);
    if (!seededRef.current && startAt > 2 && startAt < (v.duration || Infinity) - 5) {
      v.currentTime = startAt;
    }
    seededRef.current = true;
    v.playbackRate = rate;
    v.volume = volume;
  }

  function onTimeUpdate() {
    const v = videoRef.current;
    if (!v) return;
    setCurrent(v.currentTime);
    if (v.buffered.length) setBuffered(v.buffered.end(v.buffered.length - 1));
    onTime?.(v.currentTime, v.duration || 0);
  }

  function scrubTo(clientX: number, el: HTMLElement) {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const rect = el.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    v.currentTime = pct * v.duration;
    setCurrent(v.currentTime);
  }

  const pct = duration ? (current / duration) * 100 : 0;
  const bufPct = duration ? (buffered / duration) * 100 : 0;
  const nearEnd = duration > 0 && duration - current <= 25;

  return (
    <div
      ref={wrapRef}
      onMouseMove={bump}
      onMouseLeave={() => { if (!videoRef.current?.paused) setChrome(false); }}
      className={`group relative w-full overflow-hidden bg-black ${chrome ? "" : "cursor-none"} ${className}`}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay={autoPlay}
        playsInline
        preload="metadata"
        controlsList="nodownload"
        onContextMenu={(e) => e.preventDefault()}
        onClick={togglePlay}
        onDoubleClick={() => void toggleFullscreen()}
        onLoadedMetadata={onLoaded}
        onTimeUpdate={onTimeUpdate}
        onProgress={onTimeUpdate}
        onWaiting={() => setWaiting(true)}
        onPlaying={() => { setWaiting(false); setPlaying(true); bump(); }}
        onCanPlay={() => setWaiting(false)}
        onPlay={() => { setPlaying(true); bump(); }}
        onPause={() => { setPlaying(false); setChrome(true); }}
        onEnded={() => { setPlaying(false); setChrome(true); onEnded?.(); }}
        className="h-full w-full bg-black object-contain"
      />

      {/* buffering */}
      {waiting && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <Loader2 className="h-10 w-10 animate-spin text-white/80" />
        </div>
      )}

      {/* big center play when paused */}
      {!playing && !waiting && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Reproduzir"
          className="absolute inset-0 grid place-items-center"
        >
          <span className="grid h-20 w-20 place-items-center rounded-full bg-primary/90 shadow-2xl shadow-primary/40 ring-4 ring-white/15 backdrop-blur transition hover:scale-105">
            <Play className="ml-1 h-8 w-8 fill-current text-primary-foreground" />
          </span>
        </button>
      )}

      {/* top bar */}
      {(title || onClose) && (
        <div className={`pointer-events-none absolute inset-x-0 top-0 flex items-start gap-4 bg-gradient-to-b from-black/80 to-transparent p-4 transition-opacity duration-300 ${chrome ? "opacity-100" : "opacity-0"}`}>
          <div className="min-w-0 flex-1">
            {subtitle && <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">{subtitle}</p>}
            {title && <h3 className="truncate font-display text-lg text-white drop-shadow sm:text-xl">{title}</h3>}
          </div>
          {onClose && (
            <button
              type="button" onClick={onClose} aria-label="Fechar"
              className="pointer-events-auto grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/20"
            ><X className="h-5 w-5" /></button>
          )}
        </div>
      )}

      {/* next-up */}
      {onNext && nearEnd && (
        <button
          type="button" onClick={onNext}
          className="absolute bottom-24 right-4 z-10 inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-black shadow-xl transition hover:bg-white"
        ><SkipForward className="h-4 w-4" /> {nextLabel}</button>
      )}

      {/* controls */}
      <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 pb-3 pt-10 transition-opacity duration-300 sm:px-4 ${chrome ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        {/* scrubber */}
        <div
          role="slider" tabIndex={0}
          aria-label="Progresso" aria-valuemin={0} aria-valuemax={Math.floor(duration)} aria-valuenow={Math.floor(current)}
          className="group/bar relative h-6 cursor-pointer select-none"
          onMouseDown={(e) => {
            const el = e.currentTarget;
            scrubTo(e.clientX, el);
            const move = (ev: MouseEvent) => scrubTo(ev.clientX, el);
            const up = () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
            window.addEventListener("mousemove", move);
            window.addEventListener("mouseup", up);
          }}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setScrubHover(Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)) * duration);
          }}
          onMouseLeave={() => setScrubHover(null)}
        >
          <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-white/25 transition-all group-hover/bar:h-1.5">
            <div className="absolute inset-y-0 left-0 bg-white/30" style={{ width: `${bufPct}%` }} />
            <div className="absolute inset-y-0 left-0 bg-primary" style={{ width: `${pct}%` }} />
          </div>
          <div
            className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary opacity-0 shadow ring-2 ring-white/70 transition-opacity group-hover/bar:opacity-100"
            style={{ left: `${pct}%` }}
          />
          {scrubHover !== null && (
            <span
              className="pointer-events-none absolute -top-6 -translate-x-1/2 rounded bg-black/85 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white"
              style={{ left: `${duration ? (scrubHover / duration) * 100 : 0}%` }}
            >{formatTime(scrubHover)}</span>
          )}
        </div>

        <div className="mt-1 flex items-center gap-1.5 text-white sm:gap-2">
          <Ctl onClick={togglePlay} label={playing ? "Pausar" : "Reproduzir"}>
            {playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
          </Ctl>
          <Ctl onClick={() => seekBy(-10)} label="Voltar 10s"><RotateCcw className="h-[18px] w-[18px]" /></Ctl>
          <Ctl onClick={() => seekBy(10)} label="Avançar 10s"><RotateCw className="h-[18px] w-[18px]" /></Ctl>

          <div className="group/vol flex items-center">
            <Ctl
              onClick={() => setMuted((m) => { if (videoRef.current) videoRef.current.muted = !m; return !m; })}
              label={muted ? "Ativar som" : "Silenciar"}
            >{muted || volume === 0 ? <VolumeX className="h-[18px] w-[18px]" /> : <Volume2 className="h-[18px] w-[18px]" />}</Ctl>
            <input
              type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
              aria-label="Volume"
              onChange={(e) => {
                const n = Number(e.target.value);
                setVolume(n); setMuted(n === 0);
                if (videoRef.current) { videoRef.current.volume = n; videoRef.current.muted = n === 0; }
              }}
              className="h-1 w-0 cursor-pointer appearance-none rounded-full bg-white/30 opacity-0 transition-all duration-300 accent-primary group-hover/vol:w-20 group-hover/vol:opacity-100 sm:group-hover/vol:w-24"
            />
          </div>

          <span className="ml-1 select-none text-xs tabular-nums text-white/85 sm:text-sm">
            {formatTime(current)} <span className="text-white/40">/ {formatTime(duration)}</span>
          </span>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <div className="relative">
              <Ctl onClick={() => setMenu((m) => !m)} label="Velocidade">
                <span className="flex items-center gap-1 text-xs font-semibold">
                  <Settings2 className="h-[18px] w-[18px]" />
                  {rate !== 1 && <span className="tabular-nums">{rate}x</span>}
                </span>
              </Ctl>
              {menu && (
                <div className="absolute bottom-11 right-0 w-32 overflow-hidden rounded-xl bg-black/90 p-1 text-sm ring-1 ring-white/15 backdrop-blur">
                  <p className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-white/40">Velocidade</p>
                  {SPEEDS.map((s) => (
                    <button
                      key={s} type="button"
                      onClick={() => { setRate(s); if (videoRef.current) videoRef.current.playbackRate = s; setMenu(false); }}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-white/85 transition hover:bg-white/10"
                    >
                      <span className="tabular-nums">{s === 1 ? "Normal" : `${s}x`}</span>
                      {rate === s && <Check className="h-3.5 w-3.5 text-primary" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Ctl
              className="hidden sm:grid"
              label="Picture in picture"
              onClick={() => { const v = videoRef.current as (HTMLVideoElement & { requestPictureInPicture?: () => Promise<unknown> }) | null; v?.requestPictureInPicture?.().catch(() => {}); }}
            ><PictureInPicture2 className="h-[18px] w-[18px]" /></Ctl>
            <Ctl onClick={() => void toggleFullscreen()} label="Tela cheia">
              {fs ? <Minimize2 className="h-[18px] w-[18px]" /> : <Maximize2 className="h-[18px] w-[18px]" />}
            </Ctl>
          </div>
        </div>
      </div>
    </div>
  );
}

function Ctl({ children, onClick, label, className = "" }: { children: React.ReactNode; onClick: () => void; label: string; className?: string }) {
  return (
    <button
      type="button" onClick={onClick} aria-label={label} title={label}
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-white/90 transition hover:bg-white/15 hover:text-white ${className}`}
    >{children}</button>
  );
}

/** Fullscreen theatre overlay wrapper around VideoPlayer. */
export function ImmersiveVideoOverlay(props: VideoPlayerProps & { onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);
  return (
    <div className="fixed inset-0 z-50 animate-fade-in bg-black">
      {props.poster && (
        <img src={props.poster} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-30 blur-3xl" />
      )}
      <div className="absolute inset-0 bg-black/80" />
      <div className="relative flex h-full w-full items-center justify-center p-0 sm:p-6">
        <VideoPlayer {...props} className="h-full max-h-full w-full rounded-none sm:rounded-2xl sm:shadow-2xl" />
      </div>
    </div>
  );
}
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles } from "lucide-react";
import { extractExerciseFrames, type Identification } from "@/lib/exercise-identification";
import { identifyExerciseVideo } from "@/lib/exercise-identification.functions";

export function VideoIdentification({ file, onIdentified, onBusyChange }: { file: File; onIdentified: (result: Identification) => void; onBusyChange?: (busy: boolean) => void }) {
  const analyze = useServerFn(identifyExerciseVideo);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const current = useRef(file);
  const callbacks = useRef({ onIdentified, onBusyChange });
  callbacks.current = { onIdentified, onBusyChange };
  useEffect(() => {
    current.current = file;
    let active = true;
    async function identify() {
      setBusy(true);
      callbacks.current.onBusyChange?.(true);
      setMessage("Identificando exercício...");
      try {
        const frames = await extractExerciseFrames(file);
        if (!active) return;
        const response = await analyze({ data: { frames } });
        if (!active || current.current !== file) return;
        if (!response.ok) throw new Error(response.error);
        setFailed(false);
        setMessage(response.result.name ? `${response.result.name} · Confiança ${response.result.confidence}. ${response.result.reason}` : response.result.reason);
        callbacks.current.onIdentified(response.result);
      } catch (error) {
        if (active) { setFailed(true); setMessage(error instanceof Error ? error.message : "Não foi possível identificar."); }
      } finally {
        if (active) { setBusy(false); callbacks.current.onBusyChange?.(false); }
      }
    }
    void identify();
    return () => { active = false; callbacks.current.onBusyChange?.(false); };
  }, [file]);
  return <div className="space-y-2 border-l-2 border-primary pl-3 text-sm" aria-live="polite">
    <p className={failed ? "text-destructive" : "text-muted-foreground"}>{busy ? <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 inline h-4 w-4 text-primary" />}{message}</p>
    {!busy ? <p className="text-xs text-muted-foreground">Confira o nome antes de enviar. A identificação pode não ser exata.</p> : null}
  </div>;
}
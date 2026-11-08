import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getWelcomeStateFn, completeWelcomeFn } from "@/lib/welcome.functions";

type WelcomeState = Awaited<ReturnType<typeof getWelcomeStateFn>>;

function embedUrl(raw: string) {
  const youtube = raw.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  if (youtube) return `https://www.youtube.com/embed/${youtube[1]}`;
  const vimeo = raw.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

// A conclusão das boas-vindas pertence à conta e nunca volta atrás. Lembrar disso no
// aparelho evita segurar a tela inicial em uma ida ao servidor a cada abertura.
const doneKey = (userId: string) => `welcome-done:${userId}`;

function rememberedDone(userId: string) {
  try { return localStorage.getItem(doneKey(userId)) === "1"; } catch { return false; }
}

function rememberDone(userId: string) {
  try { localStorage.setItem(doneKey(userId), "1"); } catch { /* só evita uma consulta */ }
}

export function WelcomeGate({ userId, onReady }: { userId: string; onReady: () => void }) {
  const getState = useServerFn(getWelcomeStateFn);
  const complete = useServerFn(completeWelcomeFn);
  const [state, setState] = useState<WelcomeState | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (rememberedDone(userId)) { onReady(); return; }
    getState()
      .then((result) => {
        setState(result);
        if (!result.show) {
          if (result.purchaseId) rememberDone(userId);
          onReady();
        }
      })
      .catch(onReady);
  }, [getState, onReady, userId]);
  if (!state) return <div className="grid min-h-screen place-items-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!state.show || !state.purchaseId) return null;
  const embedded = state.videoUrl ? embedUrl(state.videoUrl) : null;

  async function finish() {
    if (!state?.purchaseId) return;
    setSaving(true);
    try { await complete({ data: { purchaseId: state.purchaseId } }); rememberDone(userId); onReady(); }
    finally { setSaving(false); }
  }

  return <div className="min-h-screen bg-background px-4 py-10 text-foreground"><main className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-4xl flex-col items-center justify-center text-center"><span className="grid h-16 w-16 place-items-center rounded-lg bg-primary text-primary-foreground"><PartyPopper className="h-8 w-8" /></span><h1 className="mt-6 font-display text-4xl sm:text-6xl">{state.title}</h1><p className="mt-3 max-w-xl text-base text-muted-foreground sm:text-lg">{state.text}</p>{state.videoUrl ? <div className="mt-8 aspect-video w-full overflow-hidden rounded-lg border border-border bg-black">{embedded ? <iframe src={embedded} title="Boas-vindas do Gui" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen className="h-full w-full" /> : <video src={state.videoUrl} controls playsInline preload="metadata" className="h-full w-full" />}</div> : <div className="mt-8 w-full rounded-lg border border-dashed border-border bg-card p-8 text-sm text-muted-foreground">Seu vídeo de boas-vindas será disponibilizado aqui.</div>}<Button size="lg" className="mt-8 h-13 w-full max-w-sm" onClick={() => void finish()} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Começar minha jornada</Button></main></div>;
}

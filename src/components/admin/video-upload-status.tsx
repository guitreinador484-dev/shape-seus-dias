import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Loader2, Upload, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { clearFinishedUploads, uploadSummary, useVideoUploads } from "@/lib/video-upload-tracker";

const labels = { aguardando: "Na fila", enviando: "Enviando", salvando: "Finalizando cadastro", concluido: "Concluído", erro: "Falha no envio" };

export function VideoUploadStatus() {
  const tasks = useVideoUploads();
  const summary = uploadSummary(tasks);
  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-lg font-semibold">Envios de vídeos</h2><p className="text-sm text-muted-foreground">{summary.active} em andamento · {summary.done} concluídos · {summary.errors} com erro</p></div>
      <Button variant="outline" onClick={clearFinishedUploads} disabled={!summary.done && !summary.errors}>Limpar concluídos</Button>
    </div>
    {tasks.length === 0 ? <p className="py-8 text-center text-muted-foreground">Nenhum envio nesta sessão.</p> : <>
      <Progress value={summary.progress} aria-label="Progresso de todos os envios" />
      <p className="text-xs text-muted-foreground">Mantenha esta página aberta até concluir. Você pode fechar a janela de envio e navegar pelo painel.</p>
      <div className="divide-y divide-border">{tasks.map((task) => <div key={task.id} className="space-y-2 py-4">
        <div className="flex items-start gap-3">
          {task.status === "concluido" ? <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-primary" /> : task.status === "erro" ? <XCircle className="mt-1 h-5 w-5 shrink-0 text-destructive" /> : <Loader2 className="mt-1 h-5 w-5 shrink-0 animate-spin text-primary" />}
          <div className="min-w-0 flex-1"><p className="break-words font-medium">{task.exerciseName || task.fileName}</p><p className="break-words text-xs text-muted-foreground">{task.fileName}{task.gymName ? ` · ${task.gymName}` : ""}</p></div>
          <span className="shrink-0 text-sm">{task.progress}%</span>
        </div>
        <Progress value={task.progress} aria-label={`Progresso de ${task.fileName}`} />
        <p className={task.error ? "text-sm text-destructive" : "text-xs text-muted-foreground"}>{task.error || labels[task.status]}</p>
      </div>)}</div>
    </>}
  </section>;
}

export function VideoUploadIndicator() {
  const tasks = useVideoUploads();
  const summary = uploadSummary(tasks);
  useEffect(() => {
    if (!summary.active) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [summary.active]);
  if (!summary.active) return null;
  return <div className="fixed bottom-24 right-3 z-40 w-[min(20rem,calc(100vw-1.5rem))] rounded-lg border border-border bg-popover p-3 shadow-lg sm:bottom-6 sm:right-6" aria-live="polite">
    <Button variant="ghost" className="h-auto w-full justify-start p-0 text-left" asChild><Link to="/admin/biblioteca" search={{ view: "uploads" }}><Upload className="mr-2 h-4 w-4 shrink-0" /><span>{summary.active} envio(s) em andamento · {summary.progress}%</span></Link></Button>
    <Progress value={summary.progress} className="mt-2" />
  </div>;
}
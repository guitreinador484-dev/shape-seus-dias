import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Download, FileText, Loader2 } from "lucide-react";
import { getWorkoutPdfUrl, listWorkoutPdfs } from "@/lib/workout-pdf.functions";

type PdfRow = {
  id: string;
  plan_id: string;
  student_id: string;
  file_name: string | null;
  version: number;
  generated_at: string;
  source: string;
};

/** Carrega uma vez a lista de PDFs visíveis para o usuário autenticado. */
export function useWorkoutPdfs() {
  const listFn = useServerFn(listWorkoutPdfs);
  const [byPlan, setByPlan] = useState<Record<string, PdfRow>>({});
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const rows = (await listFn()) as PdfRow[];
      const map: Record<string, PdfRow> = {};
      rows.forEach((row) => { map[row.plan_id] = row; });
      setByPlan(map);
    } catch {
      setByPlan({});
    } finally {
      setLoading(false);
    }
  }, [listFn]);

  useEffect(() => { void reload(); }, [reload]);

  return { byPlan, loading, reload };
}

/** Botões de visualizar/baixar o PDF de um treino. */
export function WorkoutPdfButton({ planId, variant = "student" }: { planId: string; variant?: "student" | "admin" }) {
  const urlFn = useServerFn(getWorkoutPdfUrl);
  const [busy, setBusy] = useState<"view" | "download" | null>(null);

  async function open(download: boolean) {
    setBusy(download ? "download" : "view");
    try {
      const { url } = await urlFn({ data: { planId, download } });
      window.open(url, "_blank", "noopener");
    } catch (error) {
      toast.error("Não foi possível abrir o PDF", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" onClick={() => open(false)} disabled={busy !== null}>
        {busy === "view" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
        Visualizar PDF
      </Button>
      <Button size="sm" onClick={() => open(true)} disabled={busy !== null}>
        {busy === "download" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {variant === "admin" ? "Baixar PDF" : "Baixar treino em PDF"}
      </Button>
    </div>
  );
}

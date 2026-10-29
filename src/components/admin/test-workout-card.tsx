import { useState } from "react";
import { FlaskConical, Loader2, Copy, MonitorPlay } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { runTestWorkoutFn } from "@/lib/test-account.functions";

const fields = {
  tier: { label: "Plano", options: [["basico", "Básico"], ["intermediario", "Intermediário"], ["avancado", "Avançado"]] },
  nivel: { label: "Experiência", options: [["iniciante", "Iniciante"], ["intermediario", "Intermediário"], ["avancado", "Avançado"]] },
  dias: { label: "Dias por semana", options: [["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"], ["6", "6"]] },
  tempo: { label: "Tempo por treino", options: [["30", "30 min"], ["45", "45 min"], ["60", "1 hora"]] },
  objetivo: { label: "Objetivo", options: [["hipertrofia", "Ganhar massa"], ["emagrecer", "Emagrecer"], ["gluteos", "Ênfase glúteos"], ["pernas", "Ênfase pernas"], ["peito", "Ênfase peito"], ["costas", "Ênfase costas"], ["bracos", "Ênfase braços"]] },
  workout_type: { label: "Tipo de treino", options: [["tradicional", "Tradicional"], ["intercalado", "Intercalado"], ["circuito", "Circuito"]] },
} as const;

type Key = keyof typeof fields;

export function TestWorkoutCard() {
  const run = useServerFn(runTestWorkoutFn);
  const [values, setValues] = useState<Record<Key, string>>({ tier: "basico", nivel: "iniciante", dias: "4", tempo: "45", objetivo: "hipertrofia", workout_type: "tradicional" });
  const [limitacoes, setLimitacoes] = useState("");
  const [loading, setLoading] = useState(false);
  const [creds, setCreds] = useState<{ email: string; password: string; message: string } | null>(null);

  const [opening, setOpening] = useState(false);
  async function openAsStudent() {
    if (!creds) return;
    setOpening(true);
    const { error } = await supabase.auth.signInWithPassword({ email: creds.email, password: creds.password });
    if (error) { setOpening(false); toast.error("Não foi possível entrar na conta de teste.", { description: error.message }); return; }
    window.location.href = "/plataforma";
  }

  async function submit() {
    setLoading(true);
    try {
      const r = await run({ data: { ...(values as any), limitacoes } });
      setCreds({ email: r.email, password: r.password, message: r.message ?? "" });
      if (r.ok) toast.success(`Treino de teste criado (${r.plans} dias).`);
      else toast.error("Não foi possível gerar o treino de teste.", { description: r.message });
    } catch (e) {
      toast.error("Erro ao gerar treino de teste.", { description: e instanceof Error ? e.message : String(e) });
    } finally { setLoading(false); }
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary"><FlaskConical className="h-5 w-5" /></span>
          <div><h2 className="font-display text-xl">Testar treino automático</h2><p className="text-sm text-muted-foreground">Simule as respostas de um comprador. A conta de teste recebe um treino novo, igual a uma compra real, sem gerar venda.</p></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(fields) as Key[]).map((k) => (
            <div key={k} className="grid gap-1.5"><Label>{fields[k].label}</Label>
              <Select value={values[k]} onValueChange={(v) => setValues((s) => ({ ...s, [k]: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{fields[k].options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>
            </div>
          ))}
          <div className="grid gap-1.5 sm:col-span-2 lg:col-span-3"><Label>Dores ou limitações (opcional)</Label><Input value={limitacoes} maxLength={300} onChange={(e) => setLimitacoes(e.target.value)} placeholder="Ex.: dor no joelho" /></div>
        </div>
        <Button onClick={() => void submit()} disabled={loading} className="w-full sm:w-auto">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />} {loading ? "Gerando treino..." : "Gerar treino de teste"}</Button>
        {creds ? (
          <div className="space-y-2 rounded-xl border border-border bg-secondary/40 p-4 text-sm">
            <p className="font-semibold">Entre com esta conta numa janela anônima para ver como o aluno:</p>
            <p>E-mail: <span className="font-mono">{creds.email}</span></p>
            <p>Senha: <span className="font-mono">{creds.password}</span>{" "}
              <Button size="sm" variant="ghost" onClick={() => { void navigator.clipboard.writeText(`${creds.email} / ${creds.password}`); toast.success("Copiado"); }}><Copy className="h-3.5 w-3.5" /> Copiar</Button></p>
            <Button className="w-full sm:w-auto" onClick={() => void openAsStudent()} disabled={opening}>{opening ? <Loader2 className="h-4 w-4 animate-spin" /> : <MonitorPlay className="h-4 w-4" />} Abrir painel do aluno de teste</Button>
            <p className="text-xs text-muted-foreground">Ao abrir, você sai da conta de administrador e entra como o aluno de teste. Para voltar, saia e entre com sua conta. A senha muda a cada novo teste. {creds.message}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

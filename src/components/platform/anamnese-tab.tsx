import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

type Anamnese = Tables<"anamnese">;

const OBJETIVOS = ["Hipertrofia", "Emagrecimento", "Definição", "Saúde e condicionamento", "Performance"];
const FREQUENCIAS = ["2x por semana", "3x por semana", "4x por semana", "5x por semana", "6x por semana"];
const EXPERIENCIAS = ["Iniciante", "Iniciado", "Intermediário", "Avançado"];
const LIMITACOES = ["Nenhuma", "Lesão", "Dor crônica", "Doença pré-existente", "Cirurgia recente", "Gestação"];
const LOCAIS = ["Academia", "Casa", "Parque/ar livre", "Academia + Casa"];

export function AnamneseTab({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [id, setId] = useState<string | null>(null);
  const [objetivo, setObjetivo] = useState("");
  const [frequencia, setFrequencia] = useState("");
  const [experiencia, setExperiencia] = useState("");
  const [limitacao, setLimitacao] = useState("Nenhuma");
  const [limitacaoDescricao, setLimitacaoDescricao] = useState("");
  const [localTreino, setLocalTreino] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("anamnese").select("*").eq("user_id", userId).maybeSingle();
      if (cancelled) return;
      if (data) {
        setId(data.id);
        setObjetivo(data.objetivo ?? "");
        setFrequencia(data.frequencia ?? "");
        setExperiencia(data.experiencia ?? "");
        setLimitacao(data.limitacao ?? "Nenhuma");
        setLimitacaoDescricao(data.limitacao_descricao ?? "");
        setLocalTreino(data.local_treino ?? "");
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  async function save() {
    setSaving(true);
    try {
      const payload = {
        user_id: userId,
        objetivo: objetivo || null,
        frequencia: frequencia || null,
        experiencia: experiencia || null,
        limitacao: limitacao === "Nenhuma" ? null : limitacao,
        limitacao_descricao: limitacao === "Nenhuma" ? null : limitacaoDescricao || null,
        local_treino: localTreino || null,
      };
      const { error } = id
        ? await supabase.from("anamnese").update(payload).eq("id", id)
        : await supabase.from("anamnese").insert(payload);
      if (error) throw error;
      toast.success("Ficha salva");
      if (!id) {
        const { data } = await supabase.from("anamnese").select("id").eq("user_id", userId).maybeSingle();
        if (data) setId(data.id);
      }
    } catch (e) {
      toast.error("Erro ao salvar", { description: e instanceof Error ? e.message : "Tente novamente." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <h3 className="font-display text-xl mb-1">Ficha de anamnese</h3>
          <p className="text-sm text-muted-foreground mb-5">
            Preencha para eu montar seu programa de forma mais assertiva. Só você e seu personal têm acesso.
          </p>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Seu principal objetivo</Label>
                  <Select value={objetivo} onValueChange={setObjetivo}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{OBJETIVOS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Frequência que consegue treinar</Label>
                  <Select value={frequencia} onValueChange={setFrequencia}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{FREQUENCIAS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nível de experiência</Label>
                  <Select value={experiencia} onValueChange={setExperiencia}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{EXPERIENCIAS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Onde treina</Label>
                  <Select value={localTreino} onValueChange={setLocalTreino}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{LOCAIS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Limitações de saúde ou lesões</Label>
                <Select value={limitacao} onValueChange={(v) => { setLimitacao(v); if (v === "Nenhuma") setLimitacaoDescricao(""); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LIMITACOES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
                {limitacao !== "Nenhuma" && (
                  <Textarea
                    value={limitacaoDescricao}
                    onChange={(e) => setLimitacaoDescricao(e.target.value)}
                    placeholder={`Descreva: ${limitacao.toLowerCase()}...`}
                  />
                )}
              </div>

              <div className="flex justify-end">
                <Button onClick={save} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Salvar ficha
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

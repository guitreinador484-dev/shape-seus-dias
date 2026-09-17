import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { updateStudentStatus } from "@/lib/admin.functions";
import { DEFAULT_ORDER_BUMP, ORDER_BUMP_SECTION, formatBRL, parseOrderBump, type OrderBumpConfig } from "@/lib/order-bump";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Save, Search } from "lucide-react";
import { toast } from "sonner";

type StudentRow = {
  id: string;
  email: string;
  full_name: string | null;
  has_order_bump: boolean;
};

export function AdminOrderBumpPanel() {
  const [config, setConfig] = useState<OrderBumpConfig>(DEFAULT_ORDER_BUMP);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const updateStudent = useServerFn(updateStudentStatus);

  async function load() {
    setLoading(true);
    const [cfgRes, studentsRes] = await Promise.all([
      supabase.from("quiz_config").select("content").eq("section", ORDER_BUMP_SECTION).order("updated_at", { ascending: false }).limit(1),
      supabase.from("profiles").select("id, email, full_name, has_order_bump").order("created_at", { ascending: false }),
    ]);
    setConfig(parseOrderBump(cfgRes.data?.[0]?.content));
    setStudents((studentsRes.data ?? []) as StudentRow[]);
    setLoading(false);
  }

  useEffect(() => {
    load().catch((error: Error) => {
      setLoading(false);
      toast.error("Erro ao carregar", { description: error.message });
    });
  }, []);

  async function saveConfig() {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("quiz_config")
        .select("id")
        .eq("section", ORDER_BUMP_SECTION)
        .limit(1);
      const payload = { section: ORDER_BUMP_SECTION, content: config as unknown as never };
      const { error } = existing?.[0]
        ? await supabase.from("quiz_config").update(payload).eq("id", existing[0].id)
        : await supabase.from("quiz_config").insert(payload);
      if (error) throw new Error(error.message);
      toast.success("Order bump salvo");
    } catch (error) {
      toast.error("Erro ao salvar", { description: error instanceof Error ? error.message : "Tente novamente." });
    } finally {
      setSaving(false);
    }
  }

  async function toggleStudent(student: StudentRow, value: boolean) {
    setStudents((list) => list.map((s) => (s.id === student.id ? { ...s, has_order_bump: value } : s)));
    try {
      await updateStudent({ data: { userId: student.id, has_order_bump: value } });
      toast.success(value ? "Adicional liberado" : "Adicional removido");
    } catch (error) {
      setStudents((list) => list.map((s) => (s.id === student.id ? { ...s, has_order_bump: !value } : s)));
      toast.error("Erro ao atualizar", { description: error instanceof Error ? error.message : "Tente novamente." });
    }
  }

  const filtered = students.filter((s) =>
    [s.email, s.full_name].some((v) => v?.toLowerCase().includes(query.toLowerCase())),
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Order bump</h1>
        <p className="text-sm text-muted-foreground">
          Oferta extra no checkout que libera as abas Dieta e Aulas em vídeo para os alunos online.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Oferta no checkout</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <div>
              <p className="font-medium">Mostrar no checkout</p>
              <p className="text-xs text-muted-foreground">Quando desligado, o cliente não vê a oferta extra.</p>
            </div>
            <Switch checked={config.enabled} onCheckedChange={(v) => setConfig((c) => ({ ...c, enabled: v }))} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input value={config.title} onChange={(e) => setConfig((c) => ({ ...c, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Preço adicional (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={config.price}
                onChange={(e) => setConfig((c) => ({ ...c, price: Number(e.target.value) }))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea
              rows={3}
              value={config.description}
              onChange={(e) => setConfig((c) => ({ ...c, description: e.target.value }))}
            />
          </div>
          <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4 text-sm">
            <p className="font-semibold">Sim! Quero adicionar: {config.title} — +{formatBRL(config.price)}</p>
            <p className="mt-1 text-muted-foreground text-xs">{config.description}</p>
          </div>
          <Button onClick={saveConfig} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar oferta
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Quem já tem o adicional</CardTitle></CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-border px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              className="flex-1 bg-transparent text-sm outline-none"
              placeholder="Buscar por nome ou email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {loading ? (
            <div className="py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Dieta + Aulas em vídeo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <p className="font-medium">{student.full_name || "Sem nome"}</p>
                      <p className="text-xs text-muted-foreground">{student.email}</p>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={student.has_order_bump}
                        onCheckedChange={(v) => void toggleStudent(student, v)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground py-8">Nenhum aluno encontrado.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

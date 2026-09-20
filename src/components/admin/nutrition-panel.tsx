import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { createNutritionPlan, deleteNutritionPlan, saveNutritionPlan } from "@/lib/admin.functions";
import { countNutritionAccess, deleteNutritionPdf, getNutritionPdf, getNutritionPdfUrl, saveNutritionPdf } from "@/lib/nutrition-pdf.functions";
import { fileToBase64 } from "@/lib/workout-pdf";
import type { AppRole } from "@/hooks/use-auth";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Save, Pencil, Loader2, Apple, X, FileText, Upload, ExternalLink, Download, Users } from "lucide-react";

type NutritionPlan = Tables<"nutrition_plans">;
type NutritionMeal = Tables<"nutrition_meals">;
type NutritionItem = Tables<"nutrition_items">;
type PlanFull = NutritionPlan & { meals: (NutritionMeal & { items: NutritionItem[] })[] };
type Student = Tables<"profiles"> & { role: AppRole | null };

type DraftItem = {
  food: string;
  amount: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
};
type DraftMeal = { meal_label: string; notes: string; items: DraftItem[] };

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

export function AdminNutritionPanel() {
  const [students, setStudents] = useState<Student[]>([]);
  const [plans, setPlans] = useState<PlanFull[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("all");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PlanFull | null>(null);
  const [fixedPdf, setFixedPdf] = useState<Awaited<ReturnType<typeof getNutritionPdf>>>(null);
  const [pdfTitle, setPdfTitle] = useState("Guia de alimentação");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [eligibleStudents, setEligibleStudents] = useState(0);

  const createPlanFn = useServerFn(createNutritionPlan);
  const deletePlanFn = useServerFn(deleteNutritionPlan);
  const loadPdfFn = useServerFn(getNutritionPdf);
  const savePdfFn = useServerFn(saveNutritionPdf);
  const deletePdfFn = useServerFn(deleteNutritionPdf);
  const pdfUrlFn = useServerFn(getNutritionPdfUrl);
  const countAccessFn = useServerFn(countNutritionAccess);

  async function load() {
    setLoading(true);
    const [{ data: profiles }, { data: roles }, plansRes, mealsRes, itemsRes, pdfRes, accessRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("nutrition_plans").select("*").order("created_at", { ascending: false }),
      supabase.from("nutrition_meals").select("*").order("meal_order", { ascending: true }),
      supabase.from("nutrition_items").select("*").order("display_order", { ascending: true }),
      loadPdfFn().catch(() => null),
      countAccessFn().catch(() => ({ count: 0 })),
    ]);
    const roleByUser = new Map((roles ?? []).map((r) => [r.user_id, r.role as AppRole]));
    setStudents((profiles ?? []).map((p) => ({ ...p, role: roleByUser.get(p.id) ?? null })));
    const byMeal = new Map<string, NutritionItem[]>();
    (itemsRes.data ?? []).forEach((item) => byMeal.set(item.meal_id, [...(byMeal.get(item.meal_id) ?? []), item]));
    const byPlan = new Map<string, (NutritionMeal & { items: NutritionItem[] })[]>();
    (mealsRes.data ?? []).forEach((meal) => byPlan.set(meal.plan_id, [...(byPlan.get(meal.plan_id) ?? []), { ...meal, items: byMeal.get(meal.id) ?? [] }]));
    setPlans((plansRes.data ?? []).map((plan) => ({ ...plan, meals: byPlan.get(plan.id) ?? [] })));
    setFixedPdf(pdfRes);
    if (pdfRes?.title) setPdfTitle(pdfRes.title);
    setEligibleStudents(accessRes.count);
    setLoading(false);
  }

  async function saveFixedPdf() {
    if (!pdfFile) { toast.error("Escolha um arquivo PDF."); return; }
    if (pdfFile.type !== "application/pdf" || pdfFile.size > 20 * 1024 * 1024) { toast.error("Envie um PDF de até 20 MB."); return; }
    setPdfBusy(true);
    try {
      const result = await savePdfFn({ data: { title: pdfTitle, fileName: pdfFile.name, fileBase64: await fileToBase64(pdfFile) } });
      toast.success(`PDF alimentar liberado para ${result.eligibleStudents} aluno(s)`);
      setPdfFile(null);
      await load();
    } catch (error) { toast.error("Não foi possível enviar o PDF", { description: error instanceof Error ? error.message : undefined }); }
    finally { setPdfBusy(false); }
  }

  async function openFixedPdf(download: boolean) {
    setPdfBusy(true);
    try { const { url } = await pdfUrlFn({ data: { download } }); window.open(url, "_blank", "noopener,noreferrer"); }
    catch (error) { toast.error("Não foi possível abrir o PDF", { description: error instanceof Error ? error.message : undefined }); }
    finally { setPdfBusy(false); }
  }

  async function removeFixedPdf() {
    setPdfBusy(true);
    try { await deletePdfFn(); toast.success("PDF alimentar excluído"); setPdfFile(null); await load(); }
    catch (error) { toast.error("Não foi possível excluir o PDF", { description: error instanceof Error ? error.message : undefined }); }
    finally { setPdfBusy(false); }
  }

  useEffect(() => {
    load().catch((error) => {
      setLoading(false);
      toast.error("Erro ao carregar planos alimentares", { description: error.message });
    });
  }, []);

  async function createPlan() {
    if (!selectedStudent || selectedStudent === "all") {
      toast.error("Selecione um aluno para criar o plano.");
      return;
    }
    try {
      const res = await createPlanFn({ data: { student_id: selectedStudent } });
      await load();
      const created = plans.find((p) => p.id === res.plan_id) ?? null;
      setEditing(created);
      toast.success("Plano criado — monte as refeições.");
    } catch (error) {
      toast.error("Erro ao criar plano", { description: error instanceof Error ? error.message : "Tente novamente." });
    }
  }

  async function deletePlan(planId: string) {
    if (!confirm("Excluir este plano alimentar e todas as suas refeições?")) return;
    try {
      await deletePlanFn({ data: { planId } });
      toast.success("Plano excluído");
      await load();
    } catch (error) {
      toast.error("Erro ao excluir plano", { description: error instanceof Error ? error.message : "Tente novamente." });
    }
  }

  const studentById = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const filteredPlans = selectedStudent === "all" ? plans : plans.filter((p) => p.student_id === selectedStudent);
  const sortedStudents = [...students].sort((a, b) => (a.full_name || a.email).localeCompare(b.full_name || b.email));

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 items-start gap-3 mb-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div>
          <h2 className="font-display text-2xl tracking-wide">Nutrição</h2>
          <p className="text-sm text-muted-foreground">Monte planos alimentares por aluno (refeições e macros).</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedStudent} onValueChange={setSelectedStudent}>
            <SelectTrigger className="w-full sm:w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os alunos</SelectItem>
              {sortedStudents.filter((s) => s.role !== "admin").map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.full_name || s.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={createPlan}><Plus className="h-4 w-4" /> Novo plano</Button>
        </div>
      </div>

      <Card className="mb-6 border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> PDF alimentar para compradores</CardTitle>
          <p className="text-sm text-muted-foreground">Um único arquivo liberado automaticamente para ofertas marcadas com acesso à alimentação.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg bg-muted p-3 text-sm"><Users className="h-4 w-4 text-primary" /><strong>{eligibleStudents}</strong> aluno(s) com acesso à alimentação</div>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-1.5"><Label htmlFor="nutrition-pdf-title">Título do material</Label><Input id="nutrition-pdf-title" value={pdfTitle} onChange={(event) => setPdfTitle(event.target.value)} /></div>
            <div className="space-y-1.5">
              <Label htmlFor="nutrition-pdf-file">Arquivo PDF</Label>
              <Input id="nutrition-pdf-file" type="file" accept="application/pdf,.pdf" onChange={(event) => setPdfFile(event.target.files?.[0] ?? null)} />
            </div>
          </div>
          {pdfFile && <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3"><FileText className="h-5 w-5 text-primary" /><div className="min-w-0"><p className="truncate text-sm font-medium">{pdfFile.name}</p><p className="text-xs text-muted-foreground">Pronto para enviar</p></div></div>}
          {fixedPdf && <div className="rounded-lg border p-3"><p className="font-medium">{fixedPdf.title}</p><p className="text-xs text-muted-foreground">{fixedPdf.file_name} · versão {fixedPdf.version}</p></div>}
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button onClick={() => void saveFixedPdf()} disabled={!pdfFile || pdfBusy}>{pdfBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{fixedPdf ? "Substituir PDF" : "Enviar e liberar PDF"}</Button>
            {fixedPdf && <><Button variant="outline" onClick={() => void openFixedPdf(false)} disabled={pdfBusy}><ExternalLink className="h-4 w-4" /> Abrir</Button><Button variant="outline" onClick={() => void openFixedPdf(true)} disabled={pdfBusy}><Download className="h-4 w-4" /> Baixar</Button><Button variant="destructive" onClick={() => void removeFixedPdf()} disabled={pdfBusy}><Trash2 className="h-4 w-4" /> Excluir</Button></>}
          </div>
        </CardContent>
      </Card>

      {loading ? <Skeleton className="h-64" /> : filteredPlans.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum plano alimentar. Selecione um aluno e crie o primeiro.</CardContent></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredPlans.map((plan) => {
            const student = studentById.get(plan.student_id);
            const mealsCount = plan.meals.length;
            const itemsCount = plan.meals.reduce((acc, m) => acc + m.items.length, 0);
            return (
              <Card key={plan.id}>
                <CardHeader>
                   <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2"><Apple className="h-4 w-4 text-primary" />{plan.plan_name || "Plano alimentar"}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{student?.full_name || student?.email || "Aluno"}</p>
                      <p className="text-xs text-muted-foreground">{mealsCount} refeições · {itemsCount} alimentos · criado em {formatDate(plan.created_at)}</p>
                    </div>
                     <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditing(plan)}><Pencil className="h-4 w-4" /> Editar</Button>
                      <Button variant="outline" size="sm" onClick={() => deletePlan(plan.id)}><Trash2 className="h-4 w-4" /> Excluir</Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}

      {editing && (
        <PlanEditor
          plan={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await load(); }}
        />
      )}
    </div>
  );
}

function PlanEditor({ plan, onClose, onSaved }: { plan: PlanFull; onClose: () => void; onSaved: () => Promise<void> }) {
  const saveFn = useServerFn(saveNutritionPlan);
  const [planName, setPlanName] = useState(plan.plan_name ?? "");
  const [meals, setMeals] = useState<DraftMeal[]>(() =>
    plan.meals.map((m) => ({
      meal_label: m.meal_label,
      notes: m.notes ?? "",
      items: m.items.map((i) => ({
        food: i.food,
        amount: i.amount ?? "",
        calories: i.calories != null ? String(i.calories) : "",
        protein: i.protein != null ? String(i.protein) : "",
        carbs: i.carbs != null ? String(i.carbs) : "",
        fat: i.fat != null ? String(i.fat) : "",
      })),
    })),
  );
  const [saving, setSaving] = useState(false);

  function addMeal() {
    setMeals((prev) => [...prev, { meal_label: `Refeição ${prev.length + 1}`, notes: "", items: [] }]);
  }
  function removeMeal(index: number) {
    setMeals((prev) => prev.filter((_, i) => i !== index));
  }
  function addItem(mealIndex: number) {
    setMeals((prev) => prev.map((m, i) => (i === mealIndex ? { ...m, items: [...m.items, { food: "", amount: "", calories: "", protein: "", carbs: "", fat: "" }] } : m)));
  }
  function removeItem(mealIndex: number, itemIndex: number) {
    setMeals((prev) => prev.map((m, i) => (i === mealIndex ? { ...m, items: m.items.filter((_, j) => j !== itemIndex) } : m)));
  }
  function patchItem(mealIndex: number, itemIndex: number, patch: Partial<DraftItem>) {
    setMeals((prev) => prev.map((m, i) => (i === mealIndex ? { ...m, items: m.items.map((it, j) => (j === itemIndex ? { ...it, ...patch } : it)) } : m)));
  }

  async function save() {
    setSaving(true);
    try {
      await saveFn({
        data: {
          planId: plan.id,
          plan_name: planName || undefined,
          meals: meals
            .filter((m) => m.meal_label.trim())
            .map((m) => ({
              meal_label: m.meal_label.trim(),
              notes: m.notes || null,
              items: m.items
                .filter((it) => it.food.trim())
                .map((it) => ({
                  food: it.food.trim(),
                  amount: it.amount || null,
                  calories: it.calories ? Number(it.calories) : null,
                  protein: it.protein ? Number(it.protein) : null,
                  carbs: it.carbs ? Number(it.carbs) : null,
                  fat: it.fat ? Number(it.fat) : null,
                })),
            })),
        },
      });
      toast.success("Plano salvo");
      await onSaved();
    } catch (error) {
      toast.error("Erro ao salvar plano", { description: error instanceof Error ? error.message : "Tente novamente." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
       <DialogContent className="max-h-[90vh] w-[calc(100%-1.5rem)] max-w-4xl overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Apple className="h-4 w-4 text-primary" /> {planName || "Plano alimentar"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Nome do plano</Label>
            <Input value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="Ex: Plano de cutting" />
          </div>

          <div className="space-y-4">
            {meals.map((meal, mi) => (
              <div key={mi} className="rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Input value={meal.meal_label} onChange={(e) => setMeals((prev) => prev.map((m, i) => (i === mi ? { ...m, meal_label: e.target.value } : m)))} className="font-semibold max-w-xs" />
                  <Button variant="ghost" size="sm" onClick={() => removeMeal(mi)}><X className="h-4 w-4" /></Button>
                </div>
                <Input value={meal.notes} onChange={(e) => setMeals((prev) => prev.map((m, i) => (i === mi ? { ...m, notes: e.target.value } : m)))} placeholder="Observações da refeição" />
                <div className="space-y-2">
                  <div className="hidden grid-cols-12 gap-2 px-1 text-[11px] font-medium text-muted-foreground sm:grid">
                    <span className="col-span-3">Alimento</span>
                    <span className="col-span-2">Quantidade</span>
                    <span className="col-span-1">kcal</span>
                    <span className="col-span-1">Prot</span>
                    <span className="col-span-1">Carb</span>
                    <span className="col-span-1">Gord</span>
                    <span className="col-span-1" />
                  </div>
                  {meal.items.map((item, ii) => (
                    <div key={ii} className="grid grid-cols-2 gap-2 rounded-lg border border-border p-3 sm:grid-cols-12 sm:items-center sm:border-0 sm:p-0">
                      <Input className="col-span-2 sm:col-span-3" value={item.food} onChange={(e) => patchItem(mi, ii, { food: e.target.value })} placeholder="Alimento" aria-label="Alimento" />
                      <Input className="sm:col-span-2" value={item.amount} onChange={(e) => patchItem(mi, ii, { amount: e.target.value })} placeholder="Quantidade" aria-label="Quantidade" />
                      <Input className="sm:col-span-1" type="number" value={item.calories} onChange={(e) => patchItem(mi, ii, { calories: e.target.value })} placeholder="kcal" aria-label="Calorias" />
                      <Input className="sm:col-span-1" type="number" value={item.protein} onChange={(e) => patchItem(mi, ii, { protein: e.target.value })} placeholder="Prot" aria-label="Proteína" />
                      <Input className="sm:col-span-1" type="number" value={item.carbs} onChange={(e) => patchItem(mi, ii, { carbs: e.target.value })} placeholder="Carb" aria-label="Carboidratos" />
                      <Input className="sm:col-span-1" type="number" value={item.fat} onChange={(e) => patchItem(mi, ii, { fat: e.target.value })} placeholder="Gord" aria-label="Gordura" />
                      <div className="flex justify-end sm:col-span-1">
                        <Button variant="ghost" size="icon" onClick={() => removeItem(mi, ii)}><X className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => addItem(mi)}><Plus className="h-4 w-4" /> Adicionar alimento</Button>
                </div>
              </div>
            ))}
          </div>

          <Button variant="outline" onClick={addMeal}><Plus className="h-4 w-4" /> Adicionar refeição</Button>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar plano</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

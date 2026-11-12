import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AdminPageHeader, ConfirmDialog, EmptyBox, RowActions, StatusPill } from "@/components/admin/ui-kit";
import {
  Dumbbell,
  Loader2,
  Pencil,
  Plus,
  Eye,
  Trash2,
  Upload,
  Film,
  FileText,
  Copy,
  CalendarDays,
  ChevronDown,
  Flame,
  Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchStudents, type Student } from "@/lib/admin-data";
import { useServerFn } from "@tanstack/react-start";
import {
  createTrainingPlan,
  deleteTrainingPlan,
  duplicateTrainingPlan,
  addPlanExercise,
  deletePlanExercise,
  generateSmartTrainingPlan,
} from "@/lib/admin.functions";
import {
  WORKOUT_TYPES,
  WORKOUT_EMPHASIS_OPTIONS,
  parsePlanMetadata,
  formatPlanName,
  isExerciseInEmphasis,
  type WorkoutType,
  type EmphasisSelection,
} from "@/lib/workout-meta";
import { saveWorkoutPdf, deleteWorkoutPdf, getWorkoutPdfUrl } from "@/lib/workout-pdf.functions";
import { fileToBase64 } from "@/lib/file-to-base64";
import { useWorkoutPdfs } from "@/components/platform/workout-pdf-buttons";
import { EXERCISE_GROUPS } from "@/lib/exercise-library";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Field, type DbExerciseItem, type PlanWithExercises, type StudentPlanExercise } from "./shared";

export function AdminTrainingPanel() {
  const [students, setStudents] = useState<Student[]>([]);
  const [plans, setPlans] = useState<PlanWithExercises[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [filterStudent, setFilterStudent] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [planName, setPlanName] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [workoutType, setWorkoutType] = useState<WorkoutType>("tradicional");
  const [emphasis, setEmphasis] = useState<EmphasisSelection>("nenhum");
  const [loading, setLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);
  const [dbExercises, setDbExercises] = useState<DbExerciseItem[]>([]);

  // Smart Generator states
  const [smartOpen, setSmartOpen] = useState(false);
  const [smartStudent, setSmartStudent] = useState("");
  const [smartDays, setSmartDays] = useState("4");
  const [smartType, setSmartType] = useState<WorkoutType>("intercalado");
  const [smartEmphasis, setSmartEmphasis] = useState<EmphasisSelection>("Glúteos");
  const [smartLevel, setSmartLevel] = useState<"iniciante" | "intermediario" | "avancado">("intermediario");
  const [smartGenerating, setSmartGenerating] = useState(false);

  const { byPlan: pdfByPlan, reload: reloadPdfs } = useWorkoutPdfs();

  async function load() {
    setLoading(true);
    const [studentRows, planRows, exerciseRows, dbExRows] = await Promise.all([
      fetchStudents(),
      supabase.from("student_plans").select("*").order("day_of_week", { ascending: true }),
      supabase.from("student_plan_exercises").select("*").order("display_order", { ascending: true }),
      supabase.from("exercises").select("id, name, muscle_group, exercise_videos(id, video_path)").order("name"),
    ]);
    if (planRows.error) throw planRows.error;
    if (exerciseRows.error) throw exerciseRows.error;
    setStudents(studentRows.filter((student) => student.role !== "admin"));
    const byPlan = new Map<string, StudentPlanExercise[]>();
    (exerciseRows.data ?? []).forEach((exercise) => byPlan.set(exercise.plan_id, [...(byPlan.get(exercise.plan_id) ?? []), exercise]));
    setPlans((planRows.data ?? []).map((plan) => ({ ...plan, exercises: byPlan.get(plan.id) ?? [] })));

    const mappedDbEx: DbExerciseItem[] = (dbExRows.data ?? []).map((e: any) => ({
      id: e.id,
      name: e.name,
      muscle_group: e.muscle_group,
      has_video: Boolean(e.exercise_videos && e.exercise_videos.length > 0),
    }));
    setDbExercises(mappedDbEx);
    setLoading(false);
  }

  useEffect(() => {
    load().catch((error) => {
      setLoading(false);
      toast.error("Erro ao carregar treinos", { description: error.message });
    });
  }, []);

  const createPlanFn = useServerFn(createTrainingPlan);
  const deletePlanFn = useServerFn(deleteTrainingPlan);
  const generateSmartPlanFn = useServerFn(generateSmartTrainingPlan);

  async function createPlan() {
    if (!selectedStudent) {
      toast.error("Selecione um aluno.");
      return;
    }
    const formattedName = formatPlanName(planName || "Treino", workoutType, emphasis);
    await createPlanFn({
      data: {
        student_id: selectedStudent,
        day_of_week: Number(dayOfWeek),
        plan_name: formattedName,
        workout_type: workoutType,
        emphasis: emphasis !== "nenhum" ? emphasis : null,
      },
    });
    setPlanName("");
    setWorkoutType("tradicional");
    setEmphasis("nenhum");
    setNewOpen(false);
    toast.success("Treino criado com sucesso!");
    await load();
  }

  async function handleGenerateSmart() {
    const targetStudent = smartStudent || (filterStudent !== "all" ? filterStudent : selectedStudent);
    if (!targetStudent) {
      toast.error("Selecione um aluno para gerar os treinos.");
      return;
    }
    try {
      setSmartGenerating(true);
      const res = await generateSmartPlanFn({
        data: {
          student_id: targetStudent,
          days_count: Number(smartDays),
          workout_type: smartType,
          emphasis: smartEmphasis !== "nenhum" ? smartEmphasis : null,
          level: smartLevel,
        },
      });
      toast.success("Grade de treinos inteligentes gerada com sucesso!", {
        description: `${res.plansCount} dias salvos com vídeos de execução. ${res.pdfCount} PDFs atualizados.`,
      });
      setSmartOpen(false);
      if (filterStudent === "all") {
        setFilterStudent(targetStudent);
      }
      await load();
      await reloadPdfs();
    } catch (err: any) {
      toast.error("Erro ao gerar treinos", { description: err?.message || "Tente novamente" });
    } finally {
      setSmartGenerating(false);
    }
  }

  async function deletePlan(id: string) {
    await deletePlanFn({ data: { planId: id } });
    toast.success("Treino removido");
    await load();
  }

  const studentById = new Map(students.map((student) => [student.id, student]));
  const filteredPlans = filterStudent === "all" ? plans : plans.filter((plan) => plan.student_id === filterStudent);
  const sortedStudents = [...students].sort((a, b) => (a.full_name || a.email).localeCompare(b.full_name || b.email));

  return (
    <div className="max-w-7xl mx-auto">
      <AdminPageHeader
        title="Treinos"
        description="Crie, organize e entregue os treinos e PDFs de cada aluno com suporte a treinos intercalados e membros de ênfase."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive font-medium"
              onClick={() => {
                if (filterStudent !== "all") setSmartStudent(filterStudent);
                setSmartOpen(true);
              }}
            >
              <Zap className="mr-2 h-4 w-4 text-destructive" /> Gerador Inteligente
            </Button>
            <Button onClick={() => setNewOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Novo treino
            </Button>
          </div>
        }
      />

      {/* Modal do Gerador Inteligente de Treinos */}
      <Dialog open={smartOpen} onOpenChange={setSmartOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto overflow-x-hidden sm:max-w-xl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <Zap className="h-5 w-5" />
              <DialogTitle className="text-xl">Gerador Inteligente de Treinos</DialogTitle>
            </div>
            <DialogDescription>
              Gere toda a grade semanal do aluno em 1 clique, integrando a biblioteca de vídeos de exercícios do banco de dados com metodologia profissional.
            </DialogDescription>
          </DialogHeader>

          <div className="grid min-w-0 gap-4 py-2">
            <div className="min-w-0">
              <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Aluno
              </Label>
              <Select value={smartStudent} onValueChange={setSmartStudent}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o aluno" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.full_name || student.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid min-w-0 grid-cols-2 gap-3">
              <div className="min-w-0">
                <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Frequência Semanal
                </Label>
                <Select value={smartDays} onValueChange={setSmartDays}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 Dias (A / B / C)</SelectItem>
                    <SelectItem value="4">4 Dias (A / B / C / D)</SelectItem>
                    <SelectItem value="5">5 Dias (A / B / C / D / E)</SelectItem>
                    <SelectItem value="6">6 Dias (Push / Pull / Legs 2x)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-0">
                <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Nível de Treinamento
                </Label>
                <Select value={smartLevel} onValueChange={(val: any) => setSmartLevel(val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="iniciante">Iniciante</SelectItem>
                    <SelectItem value="intermediario">Intermediário</SelectItem>
                    <SelectItem value="avancado">Avançado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="min-w-0">
              <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Método de Treino
              </Label>
              <Select value={smartType} onValueChange={(val: any) => setSmartType(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORKOUT_TYPES.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <span className="font-medium">{type.label}</span>
                      <span className="ml-2 inline-block max-w-full truncate align-bottom text-xs text-muted-foreground">({type.description})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {smartType === "intercalado" && (
                <p className="mt-1.5 text-xs text-destructive/90 bg-destructive/10 border border-destructive/20 rounded-md p-2">
                  ⚡ <strong>Método Intercalado:</strong> Organiza os exercícios em pares A1 / A2 (agonista/antagonista ou superior/inferior), reduzindo tempo ocioso e maximizando queima calórica e condicionamento.
                </p>
              )}
            </div>

            <div className="min-w-0">
              <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Membro de Ênfase Prioritário
              </Label>
              <Select value={smartEmphasis} onValueChange={(val: any) => setSmartEmphasis(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORKOUT_EMPHASIS_OPTIONS.map((opt: { id: EmphasisSelection; label: string; icon: string }) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.icon} {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {smartEmphasis !== "nenhum" && (
                <p className="mt-1.5 text-xs text-warning/90 bg-warning/10 border border-warning/20 rounded-md p-2">
                  ⭐ <strong>Ênfase em {smartEmphasis}:</strong> O grupo muscular selecionado terá exercícios prioritários no início da sessão (quando o foco neuromuscular está no pico) e volume direcionado.
                </p>
              )}
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground space-y-1">
              <p className="flex items-center gap-1.5 font-medium text-foreground">
                <Film className="h-3.5 w-3.5 text-success" />
                <span>Integração direta com o Banco de Vídeos</span>
              </p>
              <p>
                Somente exercícios com vídeo de execução entram na grade. Ao gerar novamente, os dias e exercícios do aluno são atualizados.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSmartOpen(false)} disabled={smartGenerating}>
              Cancelar
            </Button>
            <Button
              onClick={handleGenerateSmart}
              disabled={smartGenerating || (!smartStudent && filterStudent === "all")}
              className="bg-destructive hover:bg-destructive text-foreground font-medium"
            >
              {smartGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando grade com vídeos...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" /> Gerar Grade Semanal
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Criação Manual de Treino */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Novo dia de treino</DialogTitle>
            <DialogDescription>Escolha o aluno, o nome, método e o dia deste treino.</DialogDescription>
          </DialogHeader>
          <div className="grid min-w-0 gap-4 py-2">
            <div className="min-w-0">
              <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Aluno
              </Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger><SelectValue placeholder="Selecione o aluno" /></SelectTrigger>
                <SelectContent>{students.map((student) => <SelectItem key={student.id} value={student.id}>{student.full_name || student.email}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nome do treino
              </Label>
              <Input value={planName} onChange={(event) => setPlanName(event.target.value)} placeholder="Ex: Treino A - Superior & Core" />
            </div>
            <div className="grid min-w-0 grid-cols-2 gap-3">
              <div className="min-w-0">
                <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Dia da semana
                </Label>
                <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"].map((day, index) => <SelectItem key={day} value={String(index)}>{day}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Método de treino
                </Label>
                <Select value={workoutType} onValueChange={(val: any) => setWorkoutType(val)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {WORKOUT_TYPES.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.short || type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Membro de Ênfase
              </Label>
              <Select value={emphasis} onValueChange={(val: any) => setEmphasis(val)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WORKOUT_EMPHASIS_OPTIONS.map((opt: { id: EmphasisSelection; label: string; icon: string }) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.icon} {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Cancelar</Button>
            <Button onClick={createPlan}><Plus className="mr-2 h-4 w-4" /> Criar treino</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {loading ? <Skeleton className="h-80" /> : filterStudent !== "all" ? (() => {
        const student = studentById.get(filterStudent);
        const name = student?.full_name || student?.email || "Aluno";
        const totalEx = filteredPlans.reduce((n, p) => n + p.exercises.length, 0);
        return (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => setFilterStudent("all")}>← Voltar</Button>
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold">{name}</p>
                  <p className="text-sm text-muted-foreground">{filteredPlans.length} dia(s) de treino · {totalEx} exercício(s)</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => {
                    setSmartStudent(filterStudent);
                    setSmartOpen(true);
                  }}
                >
                  <Zap className="mr-1.5 h-3.5 w-3.5 text-destructive" /> Gerador Inteligente
                </Button>
                <Button onClick={() => { setSelectedStudent(filterStudent); setNewOpen(true); }}>
                  <Plus className="mr-2 h-4 w-4" /> Novo dia de treino
                </Button>
              </div>
            </div>
            {filteredPlans.length === 0 ? <EmptyBox title="Este aluno ainda não tem treino" description="Crie o primeiro dia de treino ou use o Gerador Inteligente." /> : (
              <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredPlans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    student={student}
                    onReload={load}
                    onDelete={deletePlan}
                    pdf={pdfByPlan[plan.id]}
                    onPdfReload={reloadPdfs}
                    dbExercises={dbExercises}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })() : (() => {
        const q = search.trim().toLowerCase();
        const list = sortedStudents
          .map((s) => ({ s, plans: plans.filter((p) => p.student_id === s.id) }))
          .filter(({ s }) => !q || (s.full_name || "").toLowerCase().includes(q) || s.email.toLowerCase().includes(q))
          .sort((a, b) => Number(b.plans.length > 0) - Number(a.plans.length > 0));
        return (
          <div className="space-y-4">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar aluno por nome ou e-mail" />
            {list.length === 0 ? <EmptyBox title="Nenhum aluno encontrado" description="Tente outro nome ou cadastre o aluno na aba Alunos." /> : (
              <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                {list.map(({ s, plans: sp }) => {
                  const days = sp.map((p) => ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][p.day_of_week] ?? "").filter(Boolean);
                  const ex = sp.reduce((n, p) => n + p.exercises.length, 0);
                  return (
                    <button key={s.id} type="button" onClick={() => setFilterStudent(s.id)} className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/50">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15 font-semibold text-primary">{(s.full_name || s.email).charAt(0).toUpperCase()}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{s.full_name || s.email}</span>
                        <span className="block truncate text-xs text-muted-foreground">{sp.length ? `${sp.length} dia(s) · ${ex} exercício(s) · ${days.join(", ")}` : "Sem treino ainda"}</span>
                      </span>
                      {sp.length ? <StatusPill tone="green">Com treino</StatusPill> : <StatusPill tone="gray">Sem treino</StatusPill>}
                      <ChevronDown className="h-4 w-4 -rotate-90 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

export function PlanCard({
  plan,
  student,
  onReload,
  onDelete,
  pdf,
  onPdfReload,
  dbExercises = [],
}: {
  plan: PlanWithExercises;
  student?: Student;
  onReload: () => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  pdf?: { version: number; file_name: string | null; generated_at: string; source: string };
  onPdfReload: () => Promise<void>;
  dbExercises?: DbExerciseItem[];
}) {
  const [exerciseName, setExerciseName] = useState("");
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [rest, setRest] = useState("60");
  const [load, setLoad] = useState("");
  const [notes, setNotes] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState(EXERCISE_GROUPS[0].key);
  const [librarySearch, setLibrarySearch] = useState("");
  const [pending, setPending] = useState<{
    name: string;
    sets: string;
    reps: string;
    rest: string;
    load: string;
    exercise_id?: string | null;
  } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deletePlanOpen, setDeletePlanOpen] = useState(false);
  const [deleteExerciseId, setDeleteExerciseId] = useState<string | null>(null);
  const uploadRef = useRef<HTMLInputElement | null>(null);

  const addExerciseFn = useServerFn(addPlanExercise);
  const deleteExerciseFn = useServerFn(deletePlanExercise);
  const savePdfFn = useServerFn(saveWorkoutPdf);
  const deletePdfFn = useServerFn(deleteWorkoutPdf);
  const duplicatePlanFn = useServerFn(duplicateTrainingPlan);
  const pdfUrlFn = useServerFn(getWorkoutPdfUrl);

  const meta = parsePlanMetadata(plan.plan_name, (plan as any).workout_type, (plan as any).emphasis);

  async function confirmAddFromLibrary() {
    if (!pending) return;
    try {
      setBusy("add");
      await addExerciseFn({
        data: {
          plan_id: plan.id,
          exercise_name: pending.name,
          exercise_id: pending.exercise_id ?? null,
          sets: pending.sets,
          reps: pending.reps,
          load_text: pending.load || null,
          rest_seconds: Number(pending.rest || 0),
          notes: "",
          display_order: plan.exercises.length + 1,
        },
      });
      toast.success(`${pending.name} adicionado`);
      setPending(null);
      await onReload();
    } catch (error) {
      toast.error("Não foi possível adicionar o exercício", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setBusy(null);
    }
  }

  async function addExercise() {
    if (!exerciseName.trim()) {
      toast.error("Informe o exercício.");
      return;
    }
    try {
      setBusy("add");
      const matched = dbExercises.find((e) => e.name.toLowerCase() === exerciseName.trim().toLowerCase());
      await addExerciseFn({
        data: {
          plan_id: plan.id,
          exercise_name: exerciseName.trim(),
          exercise_id: matched?.id ?? null,
          sets: sets || null,
          reps: reps || null,
          load_text: load || null,
          rest_seconds: Number(rest || 0),
          notes: notes || null,
          display_order: plan.exercises.length + 1,
        },
      });
      setExerciseName("");
      setSets("");
      setReps("");
      setLoad("");
      setNotes("");
      toast.success("Exercício adicionado");
      await onReload();
    } catch (error) {
      toast.error("Não foi possível adicionar o exercício", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setBusy(null);
    }
  }

  async function deleteExercise(id: string) {
    try {
      setBusy(id);
      await deleteExerciseFn({ data: { exerciseId: id } });
      toast.success("Exercício removido");
      await onReload();
    } catch (error) {
      toast.error("Não foi possível remover o exercício", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setBusy(null);
    }
  }

  async function generatePdf() {
    if (plan.exercises.length === 0) {
      toast.error("Adicione exercícios antes de gerar o PDF.");
      return;
    }
    try {
      setBusy("pdf");
      const { buildWorkoutPdf } = await import("@/lib/workout-pdf");
      const { base64, fileName } = buildWorkoutPdf({
        studentName: student?.full_name || student?.email || "Aluno",
        planName: plan.plan_name || "Treino",
        dayOfWeek: plan.day_of_week,
        professional: "Gui Treinador",
        exercises: plan.exercises,
        workoutType: meta.workoutType,
        emphasis: meta.emphasis,
      });
      await savePdfFn({ data: { planId: plan.id, studentId: plan.student_id, fileBase64: base64, fileName, source: "generated" } });
      toast.success(pdf ? "Nova versão do PDF gerada" : "PDF gerado e vinculado ao aluno");
      await onPdfReload();
    } catch (error) {
      toast.error("Não foi possível gerar o PDF", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setBusy(null);
    }
  }

  async function uploadPdf(file: File) {
    if (file.type !== "application/pdf") {
      toast.error("Envie um arquivo PDF.");
      return;
    }
    try {
      setBusy("pdf");
      const base64 = await fileToBase64(file);
      await savePdfFn({ data: { planId: plan.id, studentId: plan.student_id, fileBase64: base64, fileName: file.name, source: "upload" } });
      toast.success("PDF enviado e vinculado ao treino");
      await onPdfReload();
    } catch (error) {
      toast.error("Não foi possível enviar o PDF", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setBusy(null);
    }
  }

  async function openPdf(download: boolean) {
    try {
      setBusy("pdf");
      const { url } = await pdfUrlFn({ data: { planId: plan.id, download } });
      window.open(url, "_blank", "noopener");
    } catch (error) {
      toast.error("Não foi possível abrir o PDF", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setBusy(null);
    }
  }

  async function removePdf() {
    try {
      setBusy("pdf");
      await deletePdfFn({ data: { planId: plan.id } });
      toast.success("PDF excluído");
      await onPdfReload();
    } catch (error) {
      toast.error("Não foi possível excluir o PDF", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setBusy(null);
    }
  }

  async function duplicatePlan() {
    try {
      setBusy("duplicate");
      await duplicatePlanFn({ data: { planId: plan.id } });
      toast.success("Treino duplicado");
      await onReload();
    } catch (error) {
      toast.error("Não foi possível duplicar", { description: error instanceof Error ? error.message : undefined });
    } finally { setBusy(null); }
  }

  const dayLabel = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"][plan.day_of_week] ?? `Dia ${plan.day_of_week}`;

  return (
    <>
      <Card className="flex min-h-64 flex-col overflow-hidden border border-border/80 hover:border-border transition-colors">
        <CardHeader className="space-y-3 p-5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <CardTitle className="truncate text-lg">{meta.cleanName || "Treino"}</CardTitle>
                {meta.workoutType === "intercalado" && (
                  <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[11px] gap-1 py-0">
                    <Zap className="h-3 w-3" /> Intercalado
                  </Badge>
                )}
                {meta.workoutType === "circuito" && (
                  <Badge className="bg-warning/15 text-warning border-warning/30 text-[11px] py-0">
                    Circuito
                  </Badge>
                )}
                {meta.hasEmphasis && (
                  <Badge className="bg-warning/15 text-warning border-warning/30 text-[11px] gap-1 py-0">
                    <Flame className="h-3 w-3" /> {meta.emphasis}
                  </Badge>
                )}
              </div>
              <p className="mt-1 truncate text-sm text-muted-foreground" title={student?.full_name || student?.email || "Aluno"}>
                {student?.full_name || student?.email || "Aluno"}
              </p>
            </div>
            <RowActions>
              <DropdownMenuItem onSelect={() => setDetailsOpen(true)}><Eye className="mr-2 h-4 w-4" /> Ver treino</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLibraryOpen(true)}><Pencil className="mr-2 h-4 w-4" /> Adicionar exercícios</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void duplicatePlan()}><Copy className="mr-2 h-4 w-4" /> Duplicar treino</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void generatePdf()}><FileText className="mr-2 h-4 w-4" /> {pdf ? "Gerar novo PDF" : "Gerar PDF"}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setDeletePlanOpen(true)}><Trash2 className="mr-2 h-4 w-4" /> Excluir treino</DropdownMenuItem>
            </RowActions>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" /> Dia</span>
              <strong className="mt-1 block font-medium">{dayLabel}</strong>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Dumbbell className="h-3.5 w-3.5" /> Exercícios</span>
              <strong className="mt-1 block font-medium">{plan.exercises.length}</strong>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <StatusPill tone={pdf ? "green" : "gray"}>{pdf ? `PDF versão ${pdf.version}` : "PDF pendente"}</StatusPill>
          </div>
        </CardHeader>
        <CardContent className="mt-auto grid grid-cols-2 gap-2 p-5 pt-0">
          <Button variant="outline" size="sm" onClick={() => setLibraryOpen(true)}><Plus className="h-4 w-4" /> Exercício</Button>
          <Button size="sm" onClick={() => setDetailsOpen(true)}>Ver treino <ChevronDown className="h-4 w-4" /></Button>
        </CardContent>
      </Card>
      <ConfirmDialog open={deletePlanOpen} onOpenChange={setDeletePlanOpen} title="Excluir este treino?" description="O treino, seus exercícios e o PDF vinculado serão removidos." confirmLabel="Sim, excluir treino" destructive onConfirm={() => onDelete(plan.id)} />
      
      {/* Modal de Detalhes do Treino */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="flex max-h-[92vh] w-[calc(100%-1rem)] max-w-6xl flex-col overflow-hidden p-0 sm:w-full">
          <DialogHeader className="border-b border-border px-5 py-4 sm:px-6">
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              <span>{meta.cleanName || "Treino"}</span>
              {meta.workoutType === "intercalado" && (
                <Badge className="bg-destructive/20 text-destructive border-destructive/40 text-xs gap-1">
                  <Zap className="h-3 w-3" /> Método Intercalado (A1 / A2)
                </Badge>
              )}
              {meta.hasEmphasis && (
                <Badge className="bg-warning/20 text-warning border-warning/40 text-xs gap-1">
                  <Flame className="h-3 w-3" /> Prioridade: {meta.emphasis}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>{student?.full_name || student?.email || "Aluno"} · {dayLabel} · {plan.exercises.length} exercício(s)</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">Exercícios do treino</p>
              <Button size="sm" onClick={() => setLibraryOpen(true)}><Dumbbell className="h-4 w-4" /> Abrir biblioteca</Button>
            </div>
            <div className="grid gap-3 md:grid-cols-6">
              <Input className="md:col-span-2" value={exerciseName} onChange={(event) => setExerciseName(event.target.value)} placeholder="Exercício manual" />
              <Input value={sets} onChange={(event) => setSets(event.target.value)} placeholder="Séries" />
              <Input value={reps} onChange={(event) => setReps(event.target.value)} placeholder="Reps" />
              <Input value={load} onChange={(event) => setLoad(event.target.value)} placeholder="Carga (ex: 20kg)" />
              <Input type="number" value={rest} onChange={(event) => setRest(event.target.value)} placeholder="Descanso (s)" />
              <Textarea className="md:col-span-5" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Observações e postura" />
              <Button onClick={addExercise} disabled={busy === "add"}>
                {busy === "add" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Adicionar
              </Button>
            </div>
            {plan.exercises.length === 0 ? <EmptyBox title="Sem exercícios" description="Adicione os exercícios deste treino pela biblioteca ou formulário acima." /> : (
              <div className="overflow-x-auto">
                <Table className="min-w-[640px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Exercício</TableHead>
                      <TableHead>Séries</TableHead>
                      <TableHead>Reps</TableHead>
                      <TableHead>Carga</TableHead>
                      <TableHead>Descanso</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plan.exercises.map((exercise, idx) => {
                      const isInterleaved = meta.workoutType === "intercalado";
                      const pairIndex = Math.floor(idx / 2) + 1;
                      const pairSlot = idx % 2 === 0 ? "A" : "B";
                      const pairLabel = isInterleaved ? `${pairIndex}${pairSlot}` : null;
                      const inEmphasis = meta.emphasis && isExerciseInEmphasis(exercise.exercise_name, meta.emphasis);
                      const matchedDb = dbExercises.find((e) =>
                        (exercise.exercise_id && e.id === exercise.exercise_id) ||
                        e.name.toLowerCase() === exercise.exercise_name.toLowerCase()
                      );

                      return (
                        <TableRow key={exercise.id}>
                          <TableCell>
                            <div className="flex items-center gap-2 flex-wrap">
                              {pairLabel && (
                                <Badge variant="outline" className={`font-mono text-[10px] px-1.5 py-0 ${idx % 2 === 0 ? "border-destructive/40 text-destructive bg-destructive/10" : "border-warning/40 text-warning bg-warning/10"}`}>
                                  {pairLabel}
                                </Badge>
                              )}
                              <span className="font-medium text-foreground">{exercise.exercise_name}</span>
                              {inEmphasis && (
                                <Badge className="bg-warning/15 text-warning border-warning/30 text-[10px] py-0 gap-1">
                                  <Flame className="h-2.5 w-2.5" /> Ênfase
                                </Badge>
                              )}
                              {matchedDb?.has_video && (
                                <span className="inline-flex items-center gap-1 rounded bg-success/10 px-1.5 py-0.5 text-[10px] font-semibold text-success border border-success/30" title="Vídeo disponível no banco de dados">
                                  <Film className="h-2.5 w-2.5" /> Vídeo
                                </span>
                              )}
                            </div>
                            {exercise.notes && <p className="text-xs text-muted-foreground mt-0.5">{exercise.notes}</p>}
                          </TableCell>
                          <TableCell>{exercise.sets || "—"}</TableCell>
                          <TableCell>{exercise.reps || "—"}</TableCell>
                          <TableCell>{exercise.load_text || "—"}</TableCell>
                          <TableCell>{exercise.rest_seconds ? `${exercise.rest_seconds}s` : "—"}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" aria-label={`Excluir ${exercise.exercise_name}`} disabled={busy === exercise.id} onClick={() => setDeleteExerciseId(exercise.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
            <ConfirmDialog open={Boolean(deleteExerciseId)} onOpenChange={(open) => { if (!open) setDeleteExerciseId(null); }} title="Excluir este exercício?" description="O exercício será removido deste treino." confirmLabel="Sim, excluir exercício" destructive onConfirm={async () => { if (deleteExerciseId) await deleteExercise(deleteExerciseId); setDeleteExerciseId(null); }} />
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">PDF do treino</p>
                  <p className="text-xs text-muted-foreground">
                    {pdf
                      ? `Versão ${pdf.version} · ${pdf.source === "upload" ? "enviado manualmente" : "gerado automaticamente"} · ${new Date(pdf.generated_at).toLocaleDateString("pt-BR")}`
                      : "Nenhum PDF vinculado a este treino ainda."}
                  </p>
                </div>
                <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap">
                  <Button size="sm" onClick={generatePdf} disabled={busy === "pdf"}>
                    {busy === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                    {pdf ? "Gerar novamente" : "Gerar PDF do treino"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => uploadRef.current?.click()} disabled={busy === "pdf"}>
                    <Upload className="h-4 w-4" /> {pdf ? "Substituir por arquivo" : "Enviar PDF"}
                  </Button>
                  {pdf ? (
                    <>
                      <Button size="sm" variant="outline" onClick={() => openPdf(false)} disabled={busy === "pdf"}>Visualizar</Button>
                      <Button size="sm" variant="outline" onClick={() => openPdf(true)} disabled={busy === "pdf"}>Baixar</Button>
                      <ConfirmDialog trigger={<Button size="sm" variant="outline" disabled={busy === "pdf"}><Trash2 className="h-4 w-4" /> Excluir PDF</Button>} title="Excluir o PDF deste treino?" description="O treino continua salvo, mas o aluno perde o acesso a este arquivo." confirmLabel="Sim, excluir PDF" destructive onConfirm={removePdf} />
                    </>
                  ) : null}
                </div>
              </div>
              <input
                ref={uploadRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void uploadPdf(file);
                }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal da Biblioteca de Exercícios com Integração de Vídeo */}
      <Dialog open={libraryOpen} onOpenChange={setLibraryOpen}>
        <DialogContent className="max-h-[90vh] w-[calc(100%-1rem)] max-w-5xl overflow-hidden flex flex-col sm:w-full">
          <DialogHeader>
            <DialogTitle>Biblioteca de exercícios</DialogTitle>
            <DialogDescription>
              Selecione os exercícios para adicionar. Exercícios com selo <span className="text-success font-medium">Vídeo</span> possuem demonstrações gravadas no banco de dados.
            </DialogDescription>
          </DialogHeader>
          <div className="px-1">
            <Input placeholder="Buscar exercício por nome..." value={librarySearch} onChange={(e) => setLibrarySearch(e.target.value)} />
          </div>
          <Tabs value={activeGroup} onValueChange={setActiveGroup} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="flex flex-wrap h-auto justify-start gap-1">
              {EXERCISE_GROUPS.map((g) => (
                <TabsTrigger key={g.key} value={g.key} className="gap-1">
                  <span>{g.emoji}</span>{g.name}
                  <Badge variant="secondary" className="ml-1">{g.exercises.length}</Badge>
                </TabsTrigger>
              ))}
            </TabsList>
            {EXERCISE_GROUPS.map((g) => {
              const filtered = g.exercises.filter((ex) => ex.toLowerCase().includes(librarySearch.toLowerCase()));
              return (
                <TabsContent key={g.key} value={g.key} className="flex-1 overflow-y-auto mt-4">
                  <div className="mb-3 flex items-center gap-2 text-lg font-semibold">
                    <span className="text-2xl">{g.emoji}</span> {g.name}
                    <Badge variant="secondary">{g.exercises.length}</Badge>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {filtered.map((ex) => {
                      const matchInDb = dbExercises.find((e) => e.name.toLowerCase() === ex.toLowerCase());
                      const hasVideo = matchInDb?.has_video;
                      const isEmphasisEx = meta.emphasis && isExerciseInEmphasis(ex, meta.emphasis);

                      return (
                        <button
                          key={ex}
                          onClick={() => setPending({
                            name: ex,
                            sets: isEmphasisEx ? "4" : "3",
                            reps: meta.workoutType === "intercalado" ? "10-12" : "12-15",
                            rest: meta.workoutType === "intercalado" ? "45" : "60",
                            load: "",
                            exercise_id: matchInDb?.id || null,
                          })}
                          className={`flex items-center justify-between gap-2 rounded-lg border p-3 text-left text-sm transition group hover:border-primary/50 hover:bg-accent/40 ${isEmphasisEx ? "border-warning/30 bg-warning/5" : "border-border"}`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-medium text-foreground">{ex}</span>
                              {hasVideo && (
                                <span className="inline-flex items-center gap-1 rounded bg-success/10 px-1.5 py-0.5 text-[10px] font-semibold text-success border border-success/30">
                                  <Film className="h-2.5 w-2.5" /> Vídeo
                                </span>
                              )}
                              {isEmphasisEx && (
                                <span className="inline-flex items-center gap-1 rounded bg-warning/10 px-1.5 py-0.5 text-[10px] font-semibold text-warning border border-warning/30">
                                  <Flame className="h-2.5 w-2.5" /> Ênfase
                                </span>
                              )}
                            </div>
                          </div>
                          <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary transition" />
                        </button>
                      );
                    })}
                    {filtered.length === 0 && (
                      <p className="text-sm text-muted-foreground col-span-full">Nenhum exercício encontrado.</p>
                    )}
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Modal de Configuração do Exercício Selecionado */}
      <Dialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent className="max-h-[90vh] w-[calc(100%-1.5rem)] max-w-md overflow-y-auto sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{pending?.name}</span>
              {pending?.exercise_id && (
                <span className="inline-flex items-center gap-1 text-xs text-success font-normal">
                  <Film className="h-3 w-3" /> Vídeo vinculado
                </span>
              )}
            </DialogTitle>
            <DialogDescription>Defina séries, repetições, descanso e carga para o aluno.</DialogDescription>
          </DialogHeader>
          {pending && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Séries">
                <Input value={pending.sets} onChange={(e) => setPending({ ...pending, sets: e.target.value })} placeholder="3" />
              </Field>
              <Field label="Repetições">
                <Input value={pending.reps} onChange={(e) => setPending({ ...pending, reps: e.target.value })} placeholder="10-12" />
              </Field>
              <Field label="Descanso (segundos)">
                <Input type="number" value={pending.rest} onChange={(e) => setPending({ ...pending, rest: e.target.value })} placeholder="60" />
              </Field>
              <Field label="Carga">
                <Input value={pending.load} onChange={(e) => setPending({ ...pending, load: e.target.value })} placeholder="20kg / livre" />
              </Field>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>Cancelar</Button>
            <Button onClick={confirmAddFromLibrary}><Plus className="h-4 w-4" /> Adicionar ao treino</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

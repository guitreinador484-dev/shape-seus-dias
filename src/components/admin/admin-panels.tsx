import { type ReactNode, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { AdminPageHeader, ConfirmDialog, EmptyBox, MetricCard, RowActions, StatusPill } from "@/components/admin/ui-kit";
import {
  BadgeDollarSign,
  CheckCircle2,
  ClipboardList,
  Dumbbell,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  ExternalLink,
  Eye,
  EyeOff,
  Trash2,
  Users,
  Video,
  Upload,
  ArrowUp,
  ArrowDown,
  Megaphone,
  Sparkles,
  SlidersHorizontal,
  LayoutGrid,
  Palette,
  Film,
  Check,
  AlertCircle,
  Info,
  Image as ImageIcon,
  Layers,
  BookOpen,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  User,
  FileText,
  Copy,
  MoreHorizontal,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json, Tables } from "@/integrations/supabase/types";
import { isAdminEmail, type AppRole } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { createStudent, updateStudentStatus, savePurchase, createTrainingPlan, deleteTrainingPlan, duplicateTrainingPlan, addPlanExercise, deletePlanExercise } from "@/lib/admin.functions";
import { saveWorkoutPdf, deleteWorkoutPdf, getWorkoutPdfUrl } from "@/lib/workout-pdf.functions";
import { buildWorkoutPdf, fileToBase64 } from "@/lib/workout-pdf";
import { useWorkoutPdfs } from "@/components/platform/workout-pdf-buttons";
import { EXERCISE_GROUPS } from "@/lib/exercise-library";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

type Profile = Tables<"profiles">;
type Purchase = Tables<"purchases">;
type Anamnese = Tables<"anamnese">;
type Workout = Tables<"workouts">;
type StudentPlan = Tables<"student_plans">;
type StudentPlanExercise = Tables<"student_plan_exercises">;
type BodyMeasurement = Tables<"body_measurements">;
type WorkoutInsert = Database["public"]["Tables"]["workouts"]["Insert"];
type WorkoutUpdate = Database["public"]["Tables"]["workouts"]["Update"];

export type Student = Profile & { role: AppRole | null };
type PlanWithExercises = StudentPlan & { exercises: StudentPlanExercise[] };
type AdminSettings = {
  personal_name: string;
  brand_title: string;
  support_whatsapp: string;
  checkout_url: string;
  welcome_message: string;
  platform_hero_workout_id: string;
  platform_hero_title: string;
  platform_hero_subtitle: string;
  platform_hero_image_path: string;
  platform_row_order: string;
  platform_theme: "dark" | "light";
  platform_announcement_enabled: boolean;
  platform_announcement_text: string;
  platform_announcement_type: "info" | "success" | "warning" | "purple";
  platform_show_continue_watching: boolean;
  platform_show_recommended: boolean;
  platform_show_search: boolean;
};

const defaultAdminSettings: AdminSettings = {
  personal_name: "",
  brand_title: "PERSONAL",
  support_whatsapp: "",
  checkout_url: "",
  welcome_message: "",
  platform_hero_workout_id: "",
  platform_hero_title: "",
  platform_hero_subtitle: "",
  platform_hero_image_path: "",
  platform_row_order: "",
  platform_theme: "dark",
  platform_announcement_enabled: false,
  platform_announcement_text: "",
  platform_announcement_type: "info",
  platform_show_continue_watching: true,
  platform_show_recommended: true,
  platform_show_search: true,
};

const roleLabels: Record<AppRole, string> = {
  admin: "Administrador",
  online: "Aluno online",
  presencial: "Aluno presencial",
};

export const purchaseStatusLabels: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  approved: "Aprovado",
  canceled: "Cancelado",
  refunded: "Reembolsado",
  failed: "Não concluída",
  rejected: "Recusada",
  expired: "Expirada",
  in_process: "Em análise",
};

export function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value ?? 0));
}

function asJsonObject(value: Json | null): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function readAdminSettings(value: Json | null): AdminSettings {
  const data = asJsonObject(value);
  const validAnnounceTypes = ["info", "success", "warning", "purple"];
  const annType = typeof data.platform_announcement_type === "string" && validAnnounceTypes.includes(data.platform_announcement_type)
    ? (data.platform_announcement_type as "info" | "success" | "warning" | "purple")
    : "info";

  return {
    personal_name: typeof data.personal_name === "string" ? data.personal_name : defaultAdminSettings.personal_name,
    brand_title: typeof data.brand_title === "string" ? data.brand_title : defaultAdminSettings.brand_title,
    support_whatsapp: typeof data.support_whatsapp === "string" ? data.support_whatsapp : defaultAdminSettings.support_whatsapp,
    checkout_url: typeof data.checkout_url === "string" ? data.checkout_url : defaultAdminSettings.checkout_url,
    welcome_message: typeof data.welcome_message === "string" ? data.welcome_message : defaultAdminSettings.welcome_message,
    platform_hero_workout_id: typeof data.platform_hero_workout_id === "string" ? data.platform_hero_workout_id : "",
    platform_hero_title: typeof data.platform_hero_title === "string" ? data.platform_hero_title : "",
    platform_hero_subtitle: typeof data.platform_hero_subtitle === "string" ? data.platform_hero_subtitle : "",
    platform_hero_image_path: typeof data.platform_hero_image_path === "string" ? data.platform_hero_image_path : "",
    platform_row_order: typeof data.platform_row_order === "string" ? data.platform_row_order : "",
    platform_theme: data.platform_theme === "light" ? "light" : "dark",
    platform_announcement_enabled: typeof data.platform_announcement_enabled === "boolean" ? data.platform_announcement_enabled : false,
    platform_announcement_text: typeof data.platform_announcement_text === "string" ? data.platform_announcement_text : "",
    platform_announcement_type: annType,
    platform_show_continue_watching: typeof data.platform_show_continue_watching === "boolean" ? data.platform_show_continue_watching : true,
    platform_show_recommended: typeof data.platform_show_recommended === "boolean" ? data.platform_show_recommended : true,
    platform_show_search: typeof data.platform_show_search === "boolean" ? data.platform_show_search : true,
  };
}

function PageHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="font-display text-3xl">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-28" />
      ))}
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-8 text-center">
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </div>
  );
}

function StatCard({ title, value, icon: Icon }: { title: string; value: string | number; icon: typeof Users }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

export async function fetchStudents(): Promise<Student[]> {
  const [{ data: profiles, error: profilesError }, { data: roles, error: rolesError }] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    supabase.from("user_roles").select("user_id, role"),
  ]);
  if (profilesError) throw profilesError;
  if (rolesError) throw rolesError;
  const roleByUser = new Map((roles ?? []).map((role) => [role.user_id, role.role as AppRole]));
  return (profiles ?? []).map((profile) => ({ ...profile, role: roleByUser.get(profile.id) ?? null }));
}

export function AdminDashboardPanel() {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [anamneses, setAnamneses] = useState<Anamnese[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [plans, setPlans] = useState<StudentPlan[]>([]);
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [evoLoading, setEvoLoading] = useState(false);
  const [evoPhotos, setEvoPhotos] = useState<Record<string, string>>({});
  const [searchStudent, setSearchStudent] = useState("");

  async function load() {
    setLoading(true);
    const [studentRows, purchaseRows, anamneseRows, workoutRows, planRows, measRows] = await Promise.all([
      fetchStudents(),
      supabase.from("purchases").select("*").order("created_at", { ascending: false }),
      supabase.from("anamnese").select("*").order("created_at", { ascending: false }),
      supabase.from("workouts").select("*").order("display_order", { ascending: true }),
      supabase.from("student_plans").select("*").order("created_at", { ascending: false }),
      supabase.from("body_measurements").select("*").order("measured_at", { ascending: true }),
    ]);
    if (purchaseRows.error) throw purchaseRows.error;
    if (anamneseRows.error) throw anamneseRows.error;
    if (workoutRows.error) throw workoutRows.error;
    if (planRows.error) throw planRows.error;
    if (measRows.error) throw measRows.error;
    setStudents(studentRows);
    setPurchases(purchaseRows.data ?? []);
    setAnamneses(anamneseRows.data ?? []);
    setWorkouts(workoutRows.data ?? []);
    setPlans(planRows.data ?? []);
    setMeasurements(measRows.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load().catch((error) => {
      setLoading(false);
      toast.error("Erro ao carregar o painel", { description: error.message });
    });
  }, []);

  async function loadStudentEvolution(studentId: string) {
    setSelectedStudentId(studentId);
    setEvoLoading(true);
    setEvoPhotos({});
    try {
      const { data } = await supabase
        .from("body_measurements")
        .select("*")
        .eq("user_id", studentId)
        .order("measured_at", { ascending: true });
      const rows = data ?? [];
      setMeasurements(rows);
      const photoRows = rows.filter((r) => r.photo_path);
      if (photoRows.length) {
        const entries = await Promise.all(photoRows.map(async (r) => {
          const { data: url } = await supabase.storage.from("progress-photos").createSignedUrl(r.photo_path!, 3600);
          return [r.id, url?.signedUrl ?? ""] as const;
        }));
        setEvoPhotos(Object.fromEntries(entries));
      }
    } finally {
      setEvoLoading(false);
    }
  }

  const revenue = purchases.filter((purchase) => ["paid", "approved"].includes(purchase.status)).reduce((sum, purchase) => sum + Number(purchase.amount), 0);
  const latestStudents = students.slice(0, 5);
  const latestPurchases = purchases.slice(0, 5);
  const activeStudents = students.filter((s) => s.is_active && s.has_class_access).length;
  const expiredStudents = students.filter((s) => s.access_expires_at && new Date(s.access_expires_at).getTime() <= Date.now()).length;
  const selectedStudent = students.find((s) => s.id === selectedStudentId);
  const studentMeasurements = measurements.filter((m) => m.user_id === selectedStudentId);
  const filteredStudents = students.filter((s) =>
    s.role !== "admin" && (s.full_name?.toLowerCase().includes(searchStudent.toLowerCase()) || s.email?.toLowerCase().includes(searchStudent.toLowerCase()))
  );

  const onlyStudents = students.filter((s) => s.role !== "admin");
  const studentsWithoutPlan = onlyStudents.filter((s) => s.is_active && !plans.some((p) => p.student_id === s.id));
  const blockedStudents = onlyStudents.filter((s) => !s.is_active);
  const pendingSales = purchases.filter((p) => p.status === "pending");
  const registeredEmails = new Set(students.map((s) => s.email?.toLowerCase()).filter(Boolean));
  const buyersWithoutLogin = purchases.filter(
    (p) => ["paid", "approved"].includes(p.status) && p.customer_email && !registeredEmails.has(p.customer_email.toLowerCase()),
  );
  const newStudents30d = onlyStudents.filter(
    (s) => Date.now() - new Date(s.created_at).getTime() < 30 * 24 * 60 * 60 * 1000,
  ).length;

  const attention: { key: string; text: string; to: string; tone: "amber" | "orange" | "red" | "blue" }[] = [];
  if (studentsWithoutPlan.length)
    attention.push({ key: "sem-treino", text: `${studentsWithoutPlan.length} aluno(s) ainda sem treino cadastrado.`, to: "/admin/treinos", tone: "amber" });
  if (expiredStudents)
    attention.push({ key: "vencidos", text: `${expiredStudents} aluno(s) com o acesso vencido.`, to: "/admin/alunos", tone: "orange" });
  if (blockedStudents.length)
    attention.push({ key: "bloqueados", text: `${blockedStudents.length} aluno(s) com o acesso bloqueado.`, to: "/admin/alunos", tone: "red" });
  if (buyersWithoutLogin.length)
    attention.push({ key: "sem-login", text: `${buyersWithoutLogin.length} comprador(es) ainda sem login criado.`, to: "/admin/alunos", tone: "blue" });
  if (pendingSales.length)
    attention.push({ key: "pendentes", text: `${pendingSales.length} venda(s) aguardando pagamento.`, to: "/admin/vendas", tone: "amber" });

  if (loading) return <LoadingGrid />;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-3xl sm:text-4xl tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground mt-1">Um resumo do que está acontecendo com seus alunos e vendas.</p>
        </div>
        <Button variant="outline" onClick={() => load()}><RefreshCw className="h-4 w-4 mr-2" /> Atualizar</Button>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Total de alunos" value={onlyStudents.length} icon={Users} tone="blue" />
        <MetricCard label="Alunos ativos" value={activeStudents} icon={CheckCircle2} tone="green" />
        <MetricCard label="Novos em 30 dias" value={newStudents30d} icon={TrendingUp} tone="purple" />
        <MetricCard label="Treinos cadastrados" value={plans.length} icon={Dumbbell} tone="amber" />
        <MetricCard label="Receita aprovada" value={formatCurrency(revenue)} icon={BadgeDollarSign} tone="green" />
        <MetricCard label="Acessos vencidos" value={expiredStudents} icon={AlertCircle} tone="red" />
      </div>

      {/* Attention */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500" /> O que precisa da sua atenção?
          </CardTitle>
        </CardHeader>
        <CardContent>
          {attention.length === 0 ? (
            <p className="text-sm text-muted-foreground">Tudo em dia. Nenhuma pendência no momento.</p>
          ) : (
            <ul className="space-y-2">
              {attention.map((item) => (
                <li key={item.key}>
                  <Link
                    to={item.to}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm transition hover:border-primary/40 hover:bg-muted/60"
                  >
                    <span className="flex items-center gap-2">
                      <StatusPill tone={item.tone}>Atenção</StatusPill>
                      {item.text}
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
                      Resolver <ChevronRight className="h-4 w-4" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Main grid: Students + Sales + Evolution */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent students */}
        <Card className="rounded-2xl border-white/10 bg-[#131316]/70 backdrop-blur-xl">
          <CardHeader className="border-b border-white/8 pb-4">
            <CardTitle className="text-lg flex items-center gap-2 text-white">
              <Users className="h-4 w-4 text-primary" /> Alunos recentes
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {latestStudents.length === 0 ? <EmptyState title="Nenhum aluno" description="Cadastre alunos para começar." /> : (
              <div className="space-y-2">
                {latestStudents.map((student) => (
                  <div key={student.id} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-3 hover:bg-white/[0.06] transition">
                    <div className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-primary to-blue-500 grid place-items-center text-white text-xs font-bold">
                      {(student.full_name || student.email || "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{student.full_name || student.email}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{student.email}</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0">{student.is_active ? "Ativo" : "Inativo"}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent sales */}
        <Card className="rounded-2xl border-white/10 bg-[#131316]/70 backdrop-blur-xl">
          <CardHeader className="border-b border-white/8 pb-4">
            <CardTitle className="text-lg flex items-center gap-2 text-white">
              <BadgeDollarSign className="h-4 w-4 text-amber-400" /> Vendas recentes
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {latestPurchases.length === 0 ? <EmptyState title="Nenhuma venda" description="As vendas aparecerão aqui." /> : (
              <div className="space-y-2">
                {latestPurchases.map((purchase) => (
                  <div key={purchase.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-3 hover:bg-white/[0.06] transition">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{purchase.customer_name || purchase.customer_email || "Sem cliente"}</p>
                      <p className="text-[11px] text-muted-foreground">{formatDate(purchase.created_at)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-white">{formatCurrency(purchase.amount)}</p>
                      <p className="text-[10px] text-muted-foreground">{purchaseStatusLabels[purchase.status] ?? purchase.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card className="rounded-2xl border-white/10 bg-[#131316]/70 backdrop-blur-xl">
          <CardHeader className="border-b border-white/8 pb-4">
            <CardTitle className="text-lg flex items-center gap-2 text-white">
              <Sparkles className="h-4 w-4 text-primary" /> Acesso rápido
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-2">
              {adminCards.slice(0, 5).map((card) => (
                <Link key={card.url} to={card.url} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-3 hover:bg-white/[0.06] hover:border-primary/30 transition group">
                  <div className="h-9 w-9 shrink-0 rounded-xl bg-primary/10 grid place-items-center">
                    <card.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{card.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{card.desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Evolution section */}
      <Card className="rounded-2xl border-white/10 bg-[#131316]/70 backdrop-blur-xl">
        <CardHeader className="border-b border-white/8 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-lg flex items-center gap-2 text-white">
              <TrendingUp className="h-4 w-4 text-emerald-400" /> Evolução dos Alunos
            </CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
                placeholder="Buscar aluno..."
                className="w-full rounded-full border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder:text-muted-foreground focus:border-primary/60 focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {!selectedStudentId ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {filteredStudents.length === 0 ? (
                <p className="text-sm text-muted-foreground col-span-full text-center py-8">Nenhum aluno encontrado.</p>
              ) : (
                filteredStudents.map((student) => {
                  const measCount = measurements.filter((m) => m.user_id === student.id).length;
                  return (
                    <button
                      key={student.id}
                      onClick={() => loadStudentEvolution(student.id)}
                      className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-3 hover:bg-primary/10 hover:border-primary/30 transition text-left"
                    >
                      <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-primary to-blue-500 grid place-items-center text-white text-sm font-bold">
                        {(student.full_name || student.email || "?")[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{student.full_name || student.email}</p>
                        <p className="text-[11px] text-muted-foreground">{measCount} {measCount === 1 ? "medição" : "medições"}</p>
                      </div>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </button>
                  );
                })
              )}
            </div>
          ) : evoLoading ? (
            <Skeleton className="h-48" />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => { setSelectedStudentId(""); setMeasurements([]); setEvoPhotos({}); }} className="rounded-full">
                  ← Voltar
                </Button>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-blue-500 grid place-items-center text-white text-xs font-bold">
                    {(selectedStudent?.full_name || selectedStudent?.email || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{selectedStudent?.full_name || selectedStudent?.email}</p>
                    <p className="text-[11px] text-muted-foreground">{studentMeasurements.length} {studentMeasurements.length === 1 ? "registro" : "registros"}</p>
                  </div>
                </div>
              </div>

              {studentMeasurements.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Este aluno ainda não registrou medições.</p>
              ) : (
                <>
                  {/* Weight chart summary */}
                  {studentMeasurements.some((m) => m.weight_kg !== null) && (
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Peso</p>
                        <div className="flex items-center gap-2">
                          {studentMeasurements.length >= 2 && studentMeasurements[0].weight_kg !== null && studentMeasurements[studentMeasurements.length - 1].weight_kg !== null && (
                            <span className={`flex items-center gap-1 text-xs font-semibold ${studentMeasurements[studentMeasurements.length - 1].weight_kg! < studentMeasurements[0].weight_kg! ? "text-emerald-400" : "text-red-400"}`}>
                              {studentMeasurements[studentMeasurements.length - 1].weight_kg! < studentMeasurements[0].weight_kg! ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                              {(studentMeasurements[studentMeasurements.length - 1].weight_kg! - studentMeasurements[0].weight_kg!).toFixed(1)} kg
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-end gap-1 h-16">
                        {studentMeasurements.filter((m) => m.weight_kg !== null).map((m, i) => {
                          const allWeights = studentMeasurements.filter((x) => x.weight_kg !== null).map((x) => x.weight_kg!);
                          const min = Math.min(...allWeights);
                          const max = Math.max(...allWeights);
                          const range = max - min || 1;
                          const height = ((m.weight_kg! - min) / range) * 100;
                          return (
                            <div key={m.id} className="flex-1 flex flex-col items-center gap-1">
                              <div
                                className="w-full rounded-t bg-gradient-to-t from-primary to-blue-500 transition-all duration-500"
                                style={{ height: `${Math.max(height, 8)}%` }}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between mt-2">
                        <span className="text-[10px] text-muted-foreground">{studentMeasurements.filter((m) => m.weight_kg !== null)[0]?.weight_kg} kg</span>
                        <span className="text-[10px] text-muted-foreground">{studentMeasurements.filter((m) => m.weight_kg !== null).slice(-1)[0]?.weight_kg} kg</span>
                      </div>
                    </div>
                  )}

                  {/* Measurement table */}
                  <div className="rounded-xl border border-white/10 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10 bg-white/[0.03]">
                          <th className="px-3 py-2.5 text-left text-[11px] text-muted-foreground font-medium">Data</th>
                          <th className="px-3 py-2.5 text-right text-[11px] text-muted-foreground font-medium">Peso</th>
                          <th className="px-3 py-2.5 text-right text-[11px] text-muted-foreground font-medium">Cintura</th>
                          <th className="px-3 py-2.5 text-right text-[11px] text-muted-foreground font-medium">Peito</th>
                          <th className="px-3 py-2.5 text-right text-[11px] text-muted-foreground font-medium">Braço</th>
                          <th className="px-3 py-2.5 text-right text-[11px] text-muted-foreground font-medium">Quadril</th>
                          <th className="px-3 py-2.5 text-right text-[11px] text-muted-foreground font-medium">Coxa</th>
                          <th className="px-3 py-2.5 text-center text-[11px] text-muted-foreground font-medium">Foto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...studentMeasurements].reverse().map((r) => (
                          <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                            <td className="px-3 py-2.5 whitespace-nowrap text-white">{formatDate(r.measured_at)}</td>
                            <td className="px-3 py-2.5 text-right text-white">{r.weight_kg ?? "—"}</td>
                            <td className="px-3 py-2.5 text-right text-white">{r.waist_cm ?? "—"}</td>
                            <td className="px-3 py-2.5 text-right text-white">{r.chest_cm ?? "—"}</td>
                            <td className="px-3 py-2.5 text-right text-white">{r.arm_cm ?? "—"}</td>
                            <td className="px-3 py-2.5 text-right text-white">{r.hip_cm ?? "—"}</td>
                            <td className="px-3 py-2.5 text-right text-white">{r.thigh_cm ?? "—"}</td>
                            <td className="px-3 py-2.5 text-center">
                              {evoPhotos[r.id] ? (
                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                  <ImageIcon className="h-3.5 w-3.5" />
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Photos grid */}
                  {Object.keys(evoPhotos).length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Fotos de progresso</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {Object.entries(evoPhotos).filter(([, url]) => url).map(([id, url]) => {
                          const row = studentMeasurements.find((r) => r.id === id);
                          return (
                            <figure key={id} className="group relative rounded-xl overflow-hidden border border-white/10">
                              <img src={url} alt="Progresso" className="h-40 w-full object-cover transition duration-300 group-hover:scale-105" />
                              <figcaption className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent px-3 py-2">
                                <p className="text-[11px] text-white font-medium">{formatDate(row?.measured_at)}</p>
                                {row?.weight_kg && <p className="text-[10px] text-white/70">{row.weight_kg} kg</p>}
                              </figcaption>
                            </figure>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function EvolutionDialog({ student, open, onOpenChange }: { student: Student; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [rows, setRows] = useState<BodyMeasurement[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !student) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("body_measurements")
        .select("*")
        .eq("user_id", student.id)
        .order("measured_at", { ascending: true });
      if (cancelled) return;
      const list = data ?? [];
      setRows(list);
      const photoRows = list.filter((r) => r.photo_path);
      if (photoRows.length) {
        const entries = await Promise.all(photoRows.map(async (r) => {
          const { data: url } = await supabase.storage.from("progress-photos").createSignedUrl(r.photo_path!, 3600);
          return [r.id, url?.signedUrl ?? ""] as const;
        }));
        if (!cancelled) setPhotos(Object.fromEntries(entries));
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, student]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Evolução — {student.full_name || student.email}</DialogTitle>
          <DialogDescription>Medidas e fotos de progresso registradas pelo aluno.</DialogDescription>
        </DialogHeader>
        {loading ? <Skeleton className="h-48" /> : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma medição registrada ainda.</p>
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Peso</TableHead>
                  <TableHead>Cintura</TableHead>
                  <TableHead>Peito</TableHead>
                  <TableHead>Braço</TableHead>
                  <TableHead>Quadril</TableHead>
                  <TableHead>Coxa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...rows].reverse().map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap">{formatDate(r.measured_at)}</TableCell>
                    <TableCell>{r.weight_kg ?? "—"}</TableCell>
                    <TableCell>{r.waist_cm ?? "—"}</TableCell>
                    <TableCell>{r.chest_cm ?? "—"}</TableCell>
                    <TableCell>{r.arm_cm ?? "—"}</TableCell>
                    <TableCell>{r.hip_cm ?? "—"}</TableCell>
                    <TableCell>{r.thigh_cm ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {Object.keys(photos).length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(photos).filter(([, url]) => url).map(([id, url]) => {
                  const row = rows.find((r) => r.id === id);
                  return (
                    <figure key={id} className="rounded-xl overflow-hidden border border-border">
                      <img src={url} alt="Progresso" className="h-40 w-full object-cover" />
                      {row && <figcaption className="text-[11px] text-muted-foreground px-2 py-1">{formatDate(row.measured_at)}{row.weight_kg ? ` · ${row.weight_kg} kg` : ""}</figcaption>}
                    </figure>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function AnamneseDialog({ student, open, onOpenChange }: { student: Student; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [row, setRow] = useState<Tables<"anamnese"> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !student) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase.from("anamnese").select("*").eq("user_id", student.id).maybeSingle();
      if (cancelled) return;
      setRow(data ?? null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, student]);

  function Item({ label, value }: { label: string; value: string | null | undefined }) {
    if (!value) return null;
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    );
  }

  const quiz = row?.quiz_answers as Record<string, unknown> | null | undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ficha de anamnese — {student.full_name || student.email}</DialogTitle>
          <DialogDescription>Informações preenchidas pelo aluno para montagem do programa.</DialogDescription>
        </DialogHeader>
        {loading ? (
          <Skeleton className="h-48" />
        ) : row === null ? (
          <p className="text-sm text-muted-foreground">Este aluno ainda não preencheu a ficha de anamnese.</p>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Item label="Objetivo" value={row.objetivo} />
              <Item label="Frequência" value={row.frequencia} />
              <Item label="Experiência" value={row.experiencia} />
              <Item label="Local de treino" value={row.local_treino} />
              {row.limitacao && (
                <div className="sm:col-span-2">
                  <Item label="Limitação" value={row.limitacao} />
                </div>
              )}
              {row.limitacao_descricao && (
                <div className="sm:col-span-2">
                  <Item label="Detalhes da limitação" value={row.limitacao_descricao} />
                </div>
              )}
            </div>
            {quiz && Object.keys(quiz).length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Respostas do quiz de vendas</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(quiz).map(([key, value]) => (
                    <div key={key} className="rounded-lg border border-border bg-muted/30 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{key}</p>
                      <p className="text-sm font-medium">{Array.isArray(value) ? value.join(", ") : String(value)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

const emptyWorkoutForm: WorkoutInsert = {
  title: "",
  category: "Geral",
  video_url: "",
  thumbnail_url: "",
  description: "",
  difficulty: "Iniciante",
  duration_minutes: 30,
  is_featured: false,
  display_order: 0,
};

export function AdminLessonsPanel() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("workouts").select("*").order("display_order", { ascending: true });
    if (error) throw error;
    setWorkouts(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load().catch((error) => {
      setLoading(false);
      toast.error("Erro ao carregar aulas", { description: error.message });
    });
  }, []);

  async function saveWorkout(values: WorkoutInsert | WorkoutUpdate, id?: string) {
    const payload = {
      ...values,
      video_url: values.video_url || null,
      thumbnail_url: values.thumbnail_url || null,
      video_path: values.video_path || null,
      thumbnail_path: values.thumbnail_path || null,
      description: values.description || null,
      difficulty: values.difficulty || null,
      duration_minutes: Number(values.duration_minutes || 0),
      display_order: Number(values.display_order || 0),
    };
    const result = id ? await supabase.from("workouts").update(payload).eq("id", id) : await supabase.from("workouts").insert(payload as WorkoutInsert);
    if (result.error) throw result.error;
    toast.success(id ? "Aula atualizada" : "Aula criada");
    setOpen(false);
    await load();
  }

  async function removeWorkout(id: string) {
    const workout = workouts.find((w) => w.id === id);
    if (!confirm(`Excluir a aula "${workout?.title ?? ""}"?`)) return;
    try {
      if (workout?.video_path) await supabase.storage.from("workout-videos").remove([workout.video_path]);
      if (workout?.thumbnail_path) await supabase.storage.from("workout-thumbnails").remove([workout.thumbnail_path]);
      const { error } = await supabase.from("workouts").delete().eq("id", id);
      if (error) throw error;
      toast.success("Aula removida");
      await load();
    } catch (error) {
      toast.error("Erro ao excluir aula", { description: error instanceof Error ? error.message : "Tente novamente." });
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Aulas em vídeo"
        description="Cadastre aulas, categorias, links de vídeo, duração e destaque."
        action={<WorkoutDialog open={open} onOpenChange={setOpen} onSave={saveWorkout} />}
      />
      {loading ? <Skeleton className="h-80" /> : workouts.length === 0 ? <EmptyState title="Nenhuma aula cadastrada" description="Crie a primeira aula para liberar conteúdo aos alunos online." /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workouts.map((workout) => (
            <Card key={workout.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{workout.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{workout.category} · {workout.difficulty || "Nível livre"}</p>
                  </div>
                  {workout.is_featured && <Badge>Destaque</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground min-h-10">{workout.description || "Sem descrição."}</p>
                <div className="text-sm grid grid-cols-2 gap-2">
                  <span>Duração: {workout.duration_minutes ?? 0} min</span>
                  <span>Ordem: {workout.display_order}</span>
                </div>
                <div className="flex gap-2">
                  <WorkoutDialog workout={workout} onSave={saveWorkout} />
                  <Button variant="destructive" size="sm" onClick={() => removeWorkout(workout.id)}><Trash2 className="h-4 w-4" /> Excluir</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function WorkoutDialog({ workout, open, onOpenChange, onSave }: { workout?: Workout; open?: boolean; onOpenChange?: (open: boolean) => void; onSave: (values: WorkoutInsert | WorkoutUpdate, id?: string) => Promise<void> }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const controlledOpen = open ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [form, setForm] = useState<WorkoutInsert | WorkoutUpdate>(workout ?? emptyWorkoutForm);
  const [saving, setSaving] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);

  useEffect(() => {
    setForm(workout ?? emptyWorkoutForm);
  }, [workout, controlledOpen]);

  async function uploadFile(file: File, bucket: "workout-videos" | "workout-thumbnails"): Promise<string> {
    const ext = file.name.split(".").pop() || "bin";
    const key = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(key, file, { upsert: false, contentType: file.type });
    if (error) throw error;
    return key;
  }

  async function removeFile(bucket: "workout-videos" | "workout-thumbnails", key: string) {
    const { error } = await supabase.storage.from(bucket).remove([key]);
    if (error) throw error;
  }

  async function deleteVideo() {
    if (!form.video_path) return;
    try {
      await removeFile("workout-videos", form.video_path);
      setForm((f) => ({ ...f, video_path: null }));
      toast.success("Vídeo removido");
    } catch (error) {
      toast.error("Erro ao remover vídeo", { description: error instanceof Error ? error.message : "Tente novamente." });
    }
  }

  async function deleteThumb() {
    if (!form.thumbnail_path) return;
    try {
      await removeFile("workout-thumbnails", form.thumbnail_path);
      setForm((f) => ({ ...f, thumbnail_path: null }));
      toast.success("Capa removida");
    } catch (error) {
      toast.error("Erro ao remover capa", { description: error instanceof Error ? error.message : "Tente novamente." });
    }
  }

  async function handleVideoFile(file: File) {
    setUploadingVideo(true);
    try {
      const key = await uploadFile(file, "workout-videos");
      setForm((f) => ({ ...f, video_path: key }));
      toast.success("Vídeo enviado");
    } catch (error) {
      toast.error("Erro ao enviar vídeo", { description: error instanceof Error ? error.message : "Tente novamente." });
    } finally {
      setUploadingVideo(false);
    }
  }

  async function handleThumbFile(file: File) {
    setUploadingThumb(true);
    try {
      const key = await uploadFile(file, "workout-thumbnails");
      setForm((f) => ({ ...f, thumbnail_path: key }));
      toast.success("Capa enviada");
    } catch (error) {
      toast.error("Erro ao enviar capa", { description: error instanceof Error ? error.message : "Tente novamente." });
    } finally {
      setUploadingThumb(false);
    }
  }

  async function submit() {
    if (!form.title || !form.category) {
      toast.error("Informe título e categoria.");
      return;
    }
    setSaving(true);
    try {
      await onSave(form, workout?.id);
      setOpen(false);
    } catch (error) {
      toast.error("Erro ao salvar aula", { description: error instanceof Error ? error.message : "Tente novamente." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={controlledOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={workout ? "outline" : "default"}>{workout ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {workout ? "Editar" : "Nova aula"}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{workout ? "Editar aula" : "Nova aula"}</DialogTitle>
          <DialogDescription>Envie o vídeo direto pela plataforma — cada aluno acessa por link assinado individual.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Título"><Input value={form.title ?? ""} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
          <Field label="Categoria"><Input value={form.category ?? ""} onChange={(event) => setForm({ ...form, category: event.target.value })} /></Field>
          <Field label="Vídeo da aula" className="sm:col-span-2">
            <div className="space-y-2">
              {form.video_path ? (
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
                  <Video className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-xs truncate flex-1" title={form.video_path}>{form.video_path}</span>
                  <Button type="button" size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={deleteVideo}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="inline-flex">
                  <input type="file" accept="video/*" className="hidden" disabled={uploadingVideo} onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleVideoFile(f); e.target.value = ""; }} />
                  <span className={`inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm cursor-pointer hover:bg-muted ${uploadingVideo ? "opacity-60 pointer-events-none" : ""}`}>
                    {uploadingVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {uploadingVideo ? "Enviando vídeo..." : "Enviar vídeo"}
                  </span>
                </label>
              )}
              <Input placeholder="ou cole uma URL externa (opcional)" value={form.video_url ?? ""} onChange={(event) => setForm({ ...form, video_url: event.target.value })} />
            </div>
          </Field>
          <Field label="Capa (imagem)" className="sm:col-span-2">
            <div className="space-y-2">
              {form.thumbnail_path ? (
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
                  <Eye className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-xs truncate flex-1" title={form.thumbnail_path}>{form.thumbnail_path}</span>
                  <Button type="button" size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={deleteThumb}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="inline-flex">
                  <input type="file" accept="image/*" className="hidden" disabled={uploadingThumb} onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleThumbFile(f); e.target.value = ""; }} />
                  <span className={`inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm cursor-pointer hover:bg-muted ${uploadingThumb ? "opacity-60 pointer-events-none" : ""}`}>
                    {uploadingThumb ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {uploadingThumb ? "Enviando capa..." : "Enviar capa"}
                  </span>
                </label>
              )}
              <Input placeholder="ou cole uma URL externa (opcional)" value={form.thumbnail_url ?? ""} onChange={(event) => setForm({ ...form, thumbnail_url: event.target.value })} />
            </div>
          </Field>
          <Field label="Dificuldade"><Input value={form.difficulty ?? ""} onChange={(event) => setForm({ ...form, difficulty: event.target.value })} /></Field>
          <Field label="Duração em minutos"><Input type="number" value={form.duration_minutes ?? 0} onChange={(event) => setForm({ ...form, duration_minutes: Number(event.target.value) })} /></Field>
          <Field label="Ordem"><Input type="number" value={form.display_order ?? 0} onChange={(event) => setForm({ ...form, display_order: Number(event.target.value) })} /></Field>
          <label className="flex items-center gap-2 pt-7 text-sm"><Checkbox checked={Boolean(form.is_featured)} onCheckedChange={(checked) => setForm({ ...form, is_featured: checked === true })} /> Aula em destaque</label>
          <Field label="Descrição" className="sm:col-span-2"><Textarea value={form.description ?? ""} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={saving || uploadingVideo || uploadingThumb}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return <div className={className}><Label className="mb-2 block">{label}</Label>{children}</div>;
}

export function AdminTrainingPanel() {
  const [students, setStudents] = useState<Student[]>([]);
  const [plans, setPlans] = useState<PlanWithExercises[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [filterStudent, setFilterStudent] = useState<string>("all");
  const [planName, setPlanName] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [loading, setLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);
  const { byPlan: pdfByPlan, reload: reloadPdfs } = useWorkoutPdfs();

  async function load() {
    setLoading(true);
    const [studentRows, planRows, exerciseRows] = await Promise.all([
      fetchStudents(),
      supabase.from("student_plans").select("*").order("day_of_week", { ascending: true }),
      supabase.from("student_plan_exercises").select("*").order("display_order", { ascending: true }),
    ]);
    if (planRows.error) throw planRows.error;
    if (exerciseRows.error) throw exerciseRows.error;
    setStudents(studentRows.filter((student) => student.role !== "admin"));
    const byPlan = new Map<string, StudentPlanExercise[]>();
    (exerciseRows.data ?? []).forEach((exercise) => byPlan.set(exercise.plan_id, [...(byPlan.get(exercise.plan_id) ?? []), exercise]));
    setPlans((planRows.data ?? []).map((plan) => ({ ...plan, exercises: byPlan.get(plan.id) ?? [] })));
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

  async function createPlan() {
    if (!selectedStudent) {
      toast.error("Selecione um aluno.");
      return;
    }
    await createPlanFn({ data: { student_id: selectedStudent, day_of_week: Number(dayOfWeek), plan_name: planName || "Treino" } });
    setPlanName("");
    setNewOpen(false);
    toast.success("Treino criado");
    await load();
  }

  async function deletePlan(id: string) {
    if (!confirm("Excluir este treino e todos os seus exercícios?")) return;
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
        description="Crie, organize e entregue os treinos e PDFs de cada aluno."
        action={<Button onClick={() => setNewOpen(true)}><Plus className="mr-2 h-4 w-4" /> Novo treino</Button>}
      />
      <Card className="mb-6">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <Select value={filterStudent} onValueChange={setFilterStudent}>
            <SelectTrigger><SelectValue placeholder="Filtrar por aluno" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos os alunos ({plans.length})</SelectItem>{sortedStudents.map((student) => <SelectItem key={student.id} value={student.id}>{student.full_name || student.email} ({plans.filter((plan) => plan.student_id === student.id).length})</SelectItem>)}</SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">{filteredPlans.length} treino(s)</p>
        </CardContent>
      </Card>
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader><DialogTitle>Novo treino</DialogTitle><DialogDescription>Escolha o aluno, o nome e o dia deste treino.</DialogDescription></DialogHeader>
          <div className="grid gap-4">
          <Select value={selectedStudent} onValueChange={setSelectedStudent}>
            <SelectTrigger><SelectValue placeholder="Selecione o aluno" /></SelectTrigger>
            <SelectContent>{students.map((student) => <SelectItem key={student.id} value={student.id}>{student.full_name || student.email}</SelectItem>)}</SelectContent>
          </Select>
          <Input value={planName} onChange={(event) => setPlanName(event.target.value)} placeholder="Nome do treino" />
          <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"].map((day, index) => <SelectItem key={day} value={String(index)}>{day}</SelectItem>)}</SelectContent>
          </Select>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setNewOpen(false)}>Cancelar</Button><Button onClick={createPlan}><Plus className="h-4 w-4" /> Criar treino</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      {loading ? <Skeleton className="h-80" /> : filteredPlans.length === 0 ? <EmptyBox title="Nenhum treino encontrado" description={filterStudent === "all" ? "Crie o primeiro treino e vincule a um aluno." : "Este aluno ainda não possui treinos."} action={<Button onClick={() => setNewOpen(true)}><Plus className="mr-2 h-4 w-4" /> Criar primeiro treino</Button>} /> : (
        <div className="space-y-4">
          {filteredPlans.map((plan) => <PlanCard key={plan.id} plan={plan} student={studentById.get(plan.student_id)} onReload={load} onDelete={deletePlan} pdf={pdfByPlan[plan.id]} onPdfReload={reloadPdfs} />)}
        </div>
      )}
    </div>
  );
}

function PlanCard({ plan, student, onReload, onDelete, pdf, onPdfReload }: { plan: PlanWithExercises; student?: Student; onReload: () => Promise<void>; onDelete: (id: string) => Promise<void>; pdf?: { version: number; file_name: string | null; generated_at: string; source: string }; onPdfReload: () => Promise<void> }) {
  const [exerciseName, setExerciseName] = useState("");
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [rest, setRest] = useState("60");
  const [load, setLoad] = useState("");
  const [notes, setNotes] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState(EXERCISE_GROUPS[0].key);
  const [librarySearch, setLibrarySearch] = useState("");
  const [pending, setPending] = useState<{ name: string; sets: string; reps: string; rest: string; load: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const uploadRef = useRef<HTMLInputElement | null>(null);

  const addExerciseFn = useServerFn(addPlanExercise);
  const deleteExerciseFn = useServerFn(deletePlanExercise);
  const savePdfFn = useServerFn(saveWorkoutPdf);
  const deletePdfFn = useServerFn(deleteWorkoutPdf);
  const duplicatePlanFn = useServerFn(duplicateTrainingPlan);
  const pdfUrlFn = useServerFn(getWorkoutPdfUrl);

  async function confirmAddFromLibrary() {
    if (!pending) return;
    try {
      setBusy("add");
      await addExerciseFn({
        data: {
          plan_id: plan.id,
          exercise_name: pending.name,
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
      await addExerciseFn({
        data: {
          plan_id: plan.id,
          exercise_name: exerciseName.trim(),
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
    if (!confirm("Remover este exercício do treino?")) return;
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
      const { base64, fileName } = buildWorkoutPdf({
        studentName: student?.full_name || student?.email || "Aluno",
        planName: plan.plan_name || "Treino",
        dayOfWeek: plan.day_of_week,
        professional: "Gui Treinador",
        exercises: plan.exercises,
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
    if (!confirm("Excluir o PDF deste treino?")) return;
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


  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{plan.plan_name || "Treino"}</CardTitle>
            <p className="text-sm text-muted-foreground">{student?.full_name || student?.email || "Aluno"} · dia {plan.day_of_week}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setLibraryOpen(true)}><Dumbbell className="h-4 w-4" /> Adicionar exercícios</Button>
            <RowActions>
              <DropdownMenuItem onSelect={() => setLibraryOpen(true)}><Pencil className="mr-2 h-4 w-4" /> Editar treino</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void duplicatePlan()}><Copy className="mr-2 h-4 w-4" /> Duplicar treino</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void generatePdf()}><FileText className="mr-2 h-4 w-4" /> {pdf ? "Gerar novo PDF" : "Gerar PDF"}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={(event) => { event.preventDefault(); document.getElementById(`delete-plan-${plan.id}`)?.click(); }}><Trash2 className="mr-2 h-4 w-4" /> Excluir treino</DropdownMenuItem>
            </RowActions>
            <ConfirmDialog trigger={<button id={`delete-plan-${plan.id}`} className="hidden" aria-hidden />} title="Excluir este treino?" description="O treino, seus exercícios e o PDF vinculado serão removidos." confirmLabel="Sim, excluir treino" destructive onConfirm={() => onDelete(plan.id)} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-6">
          <Input className="md:col-span-2" value={exerciseName} onChange={(event) => setExerciseName(event.target.value)} placeholder="Exercício" />
          <Input value={sets} onChange={(event) => setSets(event.target.value)} placeholder="Séries" />
          <Input value={reps} onChange={(event) => setReps(event.target.value)} placeholder="Reps" />
          <Input value={load} onChange={(event) => setLoad(event.target.value)} placeholder="Carga (ex: 20kg)" />
          <Input type="number" value={rest} onChange={(event) => setRest(event.target.value)} placeholder="Descanso" />
          <Textarea className="md:col-span-5" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Observações" />
          <Button onClick={addExercise} disabled={busy === "add"}>
            {busy === "add" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Adicionar
          </Button>
        </div>
        {plan.exercises.length === 0 ? <EmptyState title="Sem exercícios" description="Adicione os exercícios deste treino." /> : (
          <div className="overflow-x-auto"><Table className="min-w-[640px]">
            <TableHeader><TableRow><TableHead>Exercício</TableHead><TableHead>Séries</TableHead><TableHead>Reps</TableHead><TableHead>Carga</TableHead><TableHead>Descanso</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>{plan.exercises.map((exercise) => <TableRow key={exercise.id}><TableCell>{exercise.exercise_name}<p className="text-xs text-muted-foreground">{exercise.notes}</p></TableCell><TableCell>{exercise.sets}</TableCell><TableCell>{exercise.reps}</TableCell><TableCell>{exercise.load_text || "—"}</TableCell><TableCell>{exercise.rest_seconds}s</TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" disabled={busy === exercise.id} onClick={() => deleteExercise(exercise.id)}><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>)}</TableBody>
          </Table></div>
        )}
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
      </CardContent>
      <Dialog open={libraryOpen} onOpenChange={setLibraryOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Biblioteca de exercícios</DialogTitle>
            <DialogDescription>Clique em um exercício para definir séries, repetições e descanso antes de adicionar.</DialogDescription>
          </DialogHeader>
          <div className="px-1">
            <Input placeholder="Buscar exercício..." value={librarySearch} onChange={(e) => setLibrarySearch(e.target.value)} />
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
                    {filtered.map((ex) => (
                      <button
                        key={ex}
                        onClick={() => setPending({ name: ex, sets: "3", reps: "10-12", rest: "60", load: "" })}
                        className="flex items-center justify-between gap-2 rounded-md border p-3 text-left text-sm hover:bg-accent transition"
                      >
                        <span>{ex}</span>
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      </button>
                    ))}
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
      <Dialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{pending?.name}</DialogTitle>
            <DialogDescription>Defina séries, repetições e descanso.</DialogDescription>
          </DialogHeader>
          {pending && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Séries">
                <Input value={pending.sets} onChange={(e) => setPending({ ...pending, sets: e.target.value })} placeholder="3" />
              </Field>
              <Field label="Repetições">
                <Input value={pending.reps} onChange={(e) => setPending({ ...pending, reps: e.target.value })} placeholder="10-12" />
              </Field>
              <Field label="Descanso (s)">
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
    </Card>
  );
}

export function AdminSalesPanel() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ user_id: "none", amount: "97", status: "paid", customer_name: "", customer_email: "", transaction_id: "" });

  async function load() {
    setLoading(true);
    const [purchaseRows, studentRows] = await Promise.all([
      supabase.from("purchases").select("*").order("created_at", { ascending: false }),
      fetchStudents(),
    ]);
    if (purchaseRows.error) throw purchaseRows.error;
    setPurchases(purchaseRows.data ?? []);
    setStudents(studentRows.filter((student) => student.role !== "admin"));
    setLoading(false);
  }

  useEffect(() => {
    load().catch((error) => {
      setLoading(false);
      toast.error("Erro ao carregar vendas", { description: error.message });
    });
  }, []);

  const savePurchaseFn = useServerFn(savePurchase);
  const [pendingStatus, setPendingStatus] = useState<{ id: string; status: string } | null>(null);

  async function createPurchase() {
    const student = students.find((item) => item.id === form.user_id);
    await savePurchaseFn({
      data: {
        user_id: form.user_id === "none" ? null : form.user_id,
        amount: Number(form.amount || 0),
        status: form.status,
        customer_name: form.customer_name || student?.full_name || null,
        customer_email: form.customer_email || student?.email || null,
        transaction_id: form.transaction_id || null,
      },
    });
    if (["approved", "paid"].includes(form.status) && form.user_id !== "none") {
      toast.success("Venda registrada — acesso liberado para o aluno");
    } else {
      toast.success("Venda registrada");
    }
    await load();
  }

  function requestStatusChange(id: string, status: string) {
    const purchase = purchases.find((item) => item.id === id);
    const revoga = purchase && ["approved", "paid"].includes(purchase.status) && !["approved", "paid"].includes(status);
    if (revoga) {
      setPendingStatus({ id, status });
      return;
    }
    void updateStatus(id, status);
  }

  async function updateStatus(id: string, status: string) {
    const purchase = purchases.find((item) => item.id === id);
    await savePurchaseFn({
      data: {
        id,
        user_id: purchase?.user_id ?? null,
        amount: Number(purchase?.amount ?? 0),
        status,
        customer_name: purchase?.customer_name ?? null,
        customer_email: purchase?.customer_email ?? null,
        transaction_id: purchase?.transaction_id ?? null,
      },
    });
    if (["approved", "paid"].includes(status)) {
      toast.success("Venda aprovada — acesso liberado para o aluno");
    } else if (purchase && ["approved", "paid"].includes(purchase.status)) {
      toast.success("Venda atualizada — acesso revogado");
    } else {
      toast.success("Venda atualizada");
    }
    await load();
  }

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="Vendas" description="Registre vendas, acompanhe pagamentos e ajuste status de acesso." />
      <Card className="mb-6">
        <CardHeader><CardTitle>Registrar venda manual</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-6">
          <Select value={form.user_id} onValueChange={(value) => setForm({ ...form, user_id: value })}>
            <SelectTrigger className="md:col-span-2"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="none">Sem aluno vinculado</SelectItem>{students.map((student) => <SelectItem key={student.id} value={student.id}>{student.full_name || student.email}</SelectItem>)}</SelectContent>
          </Select>
          <Input value={form.customer_name} onChange={(event) => setForm({ ...form, customer_name: event.target.value })} placeholder="Nome" />
          <Input value={form.customer_email} onChange={(event) => setForm({ ...form, customer_email: event.target.value })} placeholder="Email" />
          <Input type="number" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="Valor" />
          <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(purchaseStatusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
          <Input className="md:col-span-5" value={form.transaction_id} onChange={(event) => setForm({ ...form, transaction_id: event.target.value })} placeholder="ID da transação" />
          <Button onClick={createPurchase}><Plus className="h-4 w-4" /> Registrar</Button>
        </CardContent>
      </Card>
      <ConfirmDialog
          open={pendingStatus !== null}
          onOpenChange={(open) => { if (!open) setPendingStatus(null); }}
          title="Alterar a situação desta venda?"
          description="Ao tirar a venda de aprovada, o aluno perde o acesso à plataforma automaticamente."
          confirmLabel="Sim, alterar situação"
          destructive
          onConfirm={async () => {
            if (!pendingStatus) return;
            const pending = pendingStatus;
            setPendingStatus(null);
            await updateStatus(pending.id, pending.status);
          }}
      />
      {loading ? <Skeleton className="h-80" /> : purchases.length === 0 ? <EmptyState title="Nenhuma venda registrada" description="Registre vendas manuais ou aguarde integrações de pagamento." /> : (
        <Card><CardContent className="pt-6"><Table><TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>Valor</TableHead><TableHead>Status</TableHead><TableHead>Transação</TableHead><TableHead>Data</TableHead></TableRow></TableHeader><TableBody>{purchases.map((purchase) => <TableRow key={purchase.id}><TableCell>{purchase.customer_name || "—"}<p className="text-xs text-muted-foreground">{purchase.customer_email}</p></TableCell><TableCell>{formatCurrency(purchase.amount)}</TableCell><TableCell><Select value={purchase.status} onValueChange={(value) => requestStatusChange(purchase.id, value)}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(purchaseStatusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></TableCell><TableCell className="text-muted-foreground">{purchase.transaction_id || purchase.appmax_order_id || "—"}</TableCell><TableCell>{formatDate(purchase.created_at)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
      )}
    </div>
  );
}

export function AdminSettingsPanel() {
  const [rowId, setRowId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AdminSettings>(defaultAdminSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("quiz_config").select("*").eq("section", "configuracoes").order("updated_at", { ascending: false }).limit(1);
    if (error) throw error;
    setRowId(data?.[0]?.id ?? null);
    setSettings(readAdminSettings(data?.[0]?.content ?? null));
    setLoading(false);
  }

  useEffect(() => {
    load().catch((error) => {
      setLoading(false);
      toast.error("Erro ao carregar configurações", { description: error.message });
    });
  }, []);

  async function save() {
    setSaving(true);
    const content = settings as unknown as Json;
    const result = rowId
      ? await supabase.from("quiz_config").update({ content }).eq("id", rowId)
      : await supabase.from("quiz_config").insert({ section: "configuracoes", content });
    setSaving(false);
    if (result.error) {
      toast.error("Erro ao salvar configurações", { description: result.error.message });
      return;
    }
    toast.success("Configurações salvas");
    await load();
  }

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader title="Configurações" description="Defina dados de marca, contato e links usados na operação da plataforma." />
      {loading ? <Skeleton className="h-80" /> : (
        <Card><CardContent className="pt-6 grid gap-4"><Field label="Nome do personal"><Input value={settings.personal_name} onChange={(event) => setSettings({ ...settings, personal_name: event.target.value })} /></Field><Field label="Nome da plataforma"><Input value={settings.brand_title} onChange={(event) => setSettings({ ...settings, brand_title: event.target.value })} /></Field><Field label="WhatsApp de suporte"><Input value={settings.support_whatsapp} onChange={(event) => setSettings({ ...settings, support_whatsapp: event.target.value })} /></Field><Field label="Link de checkout"><Input value={settings.checkout_url} onChange={(event) => setSettings({ ...settings, checkout_url: event.target.value })} /></Field><Field label="Mensagem de boas-vindas"><Textarea value={settings.welcome_message} onChange={(event) => setSettings({ ...settings, welcome_message: event.target.value })} /></Field><Button onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar configurações</Button></CardContent></Card>
      )}
    </div>
  );
}

export const adminCards = [
  { title: "Alunos", url: "/admin/alunos", icon: Users, desc: "Edite alunos, acesso, status e tipo." },
  { title: "Cursos", url: "/admin/cursos", icon: BookOpen, desc: "Crie cursos, módulos e aulas com vídeo." },
  { title: "Aulas em vídeo", url: "/admin/aulas", icon: Video, desc: "Cadastre aulas, categorias e vídeos." },
  { title: "Plataforma do aluno", url: "/admin/plataforma", icon: Video, desc: "Banner, destaque e ordem das prateleiras Netflix." },
  { title: "Treinos", url: "/admin/treinos", icon: Dumbbell, desc: "Monte planos por aluno e exercícios." },
  { title: "Vendas", url: "/admin/vendas", icon: BadgeDollarSign, desc: "Registre vendas e status de pagamento." },
  { title: "Funil de Vendas", url: "/admin/funil-vendas", icon: Sparkles, desc: "Configure páginas de venda e captura." },
  { title: "Configurações", url: "/admin/configuracoes", icon: Settings, desc: "Ajuste marca, contato e links." },
];

export function AdminPlatformPanel() {
  const [rowId, setRowId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AdminSettings>(defaultAdminSettings);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [cfg, wks] = await Promise.all([
      supabase.from("quiz_config").select("*").eq("section", "configuracoes").order("updated_at", { ascending: false }).limit(1),
      supabase.from("workouts").select("*").order("display_order", { ascending: true }),
    ]);
    setRowId(cfg.data?.[0]?.id ?? null);
    const loadedSettings = readAdminSettings(cfg.data?.[0]?.content ?? null);
    setSettings(loadedSettings);
    setWorkouts(wks.data ?? []);
    setLoading(false);

    if (loadedSettings.platform_hero_image_path) {
      const { data } = await supabase.storage.from("workout-thumbnails").createSignedUrl(loadedSettings.platform_hero_image_path, 3600);
      setBannerPreviewUrl(data?.signedUrl ?? null);
    } else {
      setBannerPreviewUrl(null);
    }
  }

  useEffect(() => {
    load().catch((error) => { setLoading(false); toast.error("Erro ao carregar", { description: error.message }); });
  }, []);

  async function save() {
    setSaving(true);
    const content = settings as unknown as Json;
    const result = rowId
      ? await supabase.from("quiz_config").update({ content }).eq("id", rowId)
      : await supabase.from("quiz_config").insert({ section: "configuracoes", content });
    setSaving(false);
    if (result.error) { toast.error("Erro ao salvar", { description: result.error.message }); return; }
    toast.success("Plataforma atualizada com sucesso!");
    await load();
  }

  async function uploadBanner(file: File) {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const key = `hero-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("workout-thumbnails").upload(key, file, { contentType: file.type });
      if (error) throw error;
      setSettings((s) => ({ ...s, platform_hero_image_path: key }));
      const { data } = await supabase.storage.from("workout-thumbnails").createSignedUrl(key, 3600);
      setBannerPreviewUrl(data?.signedUrl ?? null);
      toast.success("Banner enviado com sucesso");
    } catch (error) {
      toast.error("Erro ao enviar banner", { description: error instanceof Error ? error.message : "Tente novamente." });
    } finally {
      setUploading(false);
    }
  }

  async function deleteBanner() {
    const key = settings.platform_hero_image_path;
    if (!key) return;
    try {
      const { error } = await supabase.storage.from("workout-thumbnails").remove([key]);
      if (error) throw error;
      setSettings((s) => ({ ...s, platform_hero_image_path: "" }));
      setBannerPreviewUrl(null);
      toast.success("Banner removido");
    } catch (error) {
      toast.error("Erro ao remover banner", { description: error instanceof Error ? error.message : "Tente novamente." });
    }
  }

  // Categories extraction & ordering helper
  const allCategories = Array.from(new Set(workouts.map((w) => w.category).filter(Boolean))) as string[];
  const configuredOrder = settings.platform_row_order
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const currentCategoryOrder = [
    ...configuredOrder.filter((c) => allCategories.includes(c)),
    ...allCategories.filter((c) => !configuredOrder.includes(c)),
  ];

  function moveCategory(index: number, direction: "up" | "down") {
    const newOrder = [...currentCategoryOrder];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;
    setSettings((s) => ({ ...s, platform_row_order: newOrder.join(", ") }));
  }

  const selectedWorkout = workouts.find((w) => w.id === settings.platform_hero_workout_id);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header with Title and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border/60 rounded-2xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              <Sparkles className="h-3 w-3" /> Gestão da Área de Membros
            </span>
          </div>
          <h2 className="font-display text-3xl">Plataforma do Aluno</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Personalize banners, comunicados, temas e a ordem de exibição dos treinos.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <a href="/plataforma?preview=1" target="_blank" rel="noreferrer" className="inline-flex items-center">
              <ExternalLink className="h-4 w-4 mr-1.5" /> Ver como aluno
            </a>
          </Button>
          <Button onClick={save} disabled={saving || uploading} size="sm" className="rounded-full px-5 shadow-lg shadow-primary/20">
            {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
            Salvar alterações
          </Button>
        </div>
      </div>

      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Categorias</p>
            <p className="font-display text-2xl mt-1 text-white">{allCategories.length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Aulas de Vídeo</p>
            <p className="font-display text-2xl mt-1 text-white">{workouts.length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Tema Ativo</p>
            <p className="font-display text-xl mt-1 capitalize flex items-center gap-1.5 text-white">
              <Palette className="h-4 w-4 text-primary" /> {settings.platform_theme === "dark" ? "Escuro" : "Claro"}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Comunicado</p>
            <p className={`font-display text-xl mt-1 flex items-center gap-1.5 ${settings.platform_announcement_enabled ? "text-emerald-400" : "text-muted-foreground"}`}>
              <Megaphone className="h-4 w-4" /> {settings.platform_announcement_enabled ? "Ativo" : "Desativado"}
            </p>
          </div>
        </div>
      )}

      {loading ? <Skeleton className="h-96 rounded-3xl" /> : (
        <Tabs defaultValue="banner" className="space-y-6">
          <TabsList className="grid grid-cols-2 sm:grid-cols-5 h-auto p-1.5 bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl gap-1">
            <TabsTrigger value="banner" className="rounded-xl py-2.5 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 transition-all">
              <Film className="h-3.5 w-3.5 mr-1.5 shrink-0" /> Banner
            </TabsTrigger>
            <TabsTrigger value="categories" className="rounded-xl py-2.5 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 transition-all">
              <Layers className="h-3.5 w-3.5 mr-1.5 shrink-0" /> Prateleiras
            </TabsTrigger>
            <TabsTrigger value="appearance" className="rounded-xl py-2.5 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 transition-all">
              <Palette className="h-3.5 w-3.5 mr-1.5 shrink-0" /> Tema & Marca
            </TabsTrigger>
            <TabsTrigger value="announcement" className="rounded-xl py-2.5 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 transition-all">
              <Megaphone className="h-3.5 w-3.5 mr-1.5 shrink-0" /> Aviso
            </TabsTrigger>
            <TabsTrigger value="visibility" className="rounded-xl py-2.5 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 transition-all col-span-2 sm:col-span-1">
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5 shrink-0" /> Seções
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Banner & Destaque */}
          <TabsContent value="banner" className="space-y-6 mt-0">
            <Card className="glass-block rounded-3xl overflow-hidden shadow-2xl">
              <CardHeader className="border-b border-white/10 bg-white/[0.03]">
                <CardTitle className="text-xl flex items-center gap-2 text-white">
                  <Film className="h-5 w-5 text-primary" /> Banner Principal de Destaque
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Configure o hero banner exibido no topo da página de aulas da área de membros.
                </p>
              </CardHeader>
              <CardContent className="grid gap-5">
                <Field label="Aula em destaque (Botão Assistir)">
                  <Select
                    value={settings.platform_hero_workout_id || "none"}
                    onValueChange={(v) => setSettings({ ...settings, platform_hero_workout_id: v === "none" ? "" : v })}
                  >
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione um treino/aula..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum treino específico (Usar padrão)</SelectItem>
                      {workouts.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.title} {w.category ? `(${w.category})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Título principal do banner">
                  <Input
                    className="rounded-xl"
                    value={settings.platform_hero_title}
                    onChange={(e) => setSettings({ ...settings, platform_hero_title: e.target.value })}
                    placeholder={selectedWorkout ? selectedWorkout.title : "Ex: Mentoria Exclusiva de Alta Performance"}
                  />
                </Field>

                <Field label="Subtítulo / Descrição da Hero">
                  <Textarea
                    className="rounded-xl"
                    rows={3}
                    value={settings.platform_hero_subtitle}
                    onChange={(e) => setSettings({ ...settings, platform_hero_subtitle: e.target.value })}
                    placeholder={selectedWorkout ? (selectedWorkout.description || "Descrição do treino...") : "Acompanhe seus treinos e evolução com o método exclusivo."}
                  />
                </Field>

                <Field label="Imagem do Banner (Background)">
                  <div className="space-y-3">
                    {bannerPreviewUrl ? (
                      <div className="relative rounded-2xl overflow-hidden border border-border aspect-video max-h-56 w-full bg-black group">
                        <img src={bannerPreviewUrl} alt="Preview do banner" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4 justify-between">
                          <span className="text-xs text-white/80 font-mono truncate max-w-xs">{settings.platform_hero_image_path}</span>
                          <Button type="button" size="sm" variant="destructive" className="rounded-full text-xs" onClick={deleteBanner}>
                            <Trash2 className="h-3.5 w-3.5 mr-1" /> Remover imagem
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border/70 rounded-2xl cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition text-center">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploading}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) void uploadBanner(f);
                            e.target.value = "";
                          }}
                        />
                        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary mb-3">
                          {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
                        </div>
                        <p className="font-semibold text-sm">{uploading ? "Enviando imagem..." : "Clique para fazer upload da imagem do banner"}</p>
                        <p className="text-xs text-muted-foreground mt-1">Recomendado: 1920x1080px em JPG ou PNG</p>
                      </label>
                    )}
                  </div>
                </Field>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: Prateleiras & Ordem */}
          <TabsContent value="categories" className="space-y-6 mt-0">
            <Card className="rounded-3xl border border-white/10 bg-[#131316]/70 backdrop-blur-xl shadow-2xl shadow-black/40">
              <CardHeader className="border-b border-white/8 bg-white/[0.02]">
                <CardTitle className="text-xl flex items-center gap-2 text-white">
                  <Layers className="h-5 w-5 text-primary" /> Organizador Visual de Prateleiras
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Altere a ordem em que as categorias de treinos/aulas aparecem na tela do aluno.
                </p>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                {currentCategoryOrder.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                    Nenhuma categoria encontrada nos treinos cadastrados.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {currentCategoryOrder.map((cat, idx) => (
                      <div
                        key={cat}
                        className="flex items-center justify-between p-3.5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/8 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <span className="grid h-7 w-7 place-items-center rounded-xl bg-primary/20 text-primary border border-primary/30 font-display text-sm font-bold">
                            #{idx + 1}
                          </span>
                          <span className="font-semibold text-sm text-white">{cat}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-xl hover:bg-white/10"
                            disabled={idx === 0}
                            onClick={() => moveCategory(idx, "up")}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-xl hover:bg-white/10"
                            disabled={idx === currentCategoryOrder.length - 1}
                            onClick={() => moveCategory(idx, "down")}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Field label="Edição manual (código de ordem)">
                  <Input
                    className="rounded-xl font-mono text-xs"
                    value={settings.platform_row_order}
                    onChange={(e) => setSettings({ ...settings, platform_row_order: e.target.value })}
                    placeholder="Ex: Superior, Inferior, Cardio"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Ordem atual salva: {settings.platform_row_order || "Padrão (todas as categorias)"}
                  </p>
                </Field>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: Tema & Marca */}
          <TabsContent value="appearance" className="space-y-6 mt-0">
            <Card className="rounded-3xl border border-white/10 bg-[#131316]/70 backdrop-blur-xl shadow-2xl shadow-black/40">
              <CardHeader className="border-b border-white/8 bg-white/[0.02]">
                <CardTitle className="text-xl flex items-center gap-2 text-white">
                  <Palette className="h-5 w-5 text-primary" /> Aparência e Tema da Plataforma
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Escolha o estilo visual e mensagens padrão exibidas aos seus alunos.
                </p>
              </CardHeader>
              <CardContent className="grid gap-6 p-6">
                <div>
                  <Label className="text-sm font-semibold mb-3 block text-white">Tema da Área de Membros</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
                    {(["dark", "light"] as const).map((t) => {
                      const active = settings.platform_theme === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setSettings({ ...settings, platform_theme: t })}
                          className={`relative rounded-2xl border p-4 text-left transition-all ${
                            active
                              ? "border-primary bg-primary/10 shadow-lg shadow-primary/20 backdrop-blur-md"
                              : "border-white/10 hover:border-primary/40 bg-white/5 backdrop-blur-md"
                          }`}
                        >
                          <div className={`h-24 rounded-xl mb-3 border p-3 flex flex-col justify-between ${
                            t === "dark" ? "bg-[#09090b] border-white/10" : "bg-[#ffffff] border-[#e4e4e7]"
                          }`}>
                            <div className="flex items-center justify-between">
                              <div className={`h-2 w-12 rounded ${t === "dark" ? "bg-zinc-700" : "bg-zinc-300"}`} />
                              <div className="h-2 w-4 rounded bg-primary" />
                            </div>
                            <div className={`h-8 rounded-lg ${t === "dark" ? "bg-zinc-900 border border-zinc-800" : "bg-zinc-100 border border-zinc-200"}`} />
                          </div>
                          <p className="font-semibold text-sm text-white">{t === "dark" ? "Tema Escuro (Dark Mode)" : "Tema Claro (Light Mode)"}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {t === "dark" ? "Estilo streaming de alta resolução com blocos de vidro" : "Alto contraste e fundo limpo"}
                          </p>
                          {active && <CheckCircle2 className="absolute top-3 right-3 h-5 w-5 text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Field label="Nome da Marca (Logotipo no topo)">
                  <Input
                    className="rounded-xl"
                    value={settings.brand_title}
                    onChange={(e) => setSettings({ ...settings, brand_title: e.target.value })}
                    placeholder="Ex: PERSONAL VIP"
                  />
                </Field>

                <Field label="Nome do Personal / Treinador">
                  <Input
                    className="rounded-xl"
                    value={settings.personal_name}
                    onChange={(e) => setSettings({ ...settings, personal_name: e.target.value })}
                    placeholder="Ex: Lucas Soares"
                  />
                </Field>

                <Field label="Mensagem de Boas-Vindas">
                  <Textarea
                    className="rounded-xl"
                    rows={2}
                    value={settings.welcome_message}
                    onChange={(e) => setSettings({ ...settings, welcome_message: e.target.value })}
                    placeholder="Mensagem exibida aos alunos ao logar..."
                  />
                </Field>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: Comunicado / Aviso */}
          <TabsContent value="announcement" className="space-y-6 mt-0">
            <Card className="rounded-3xl border border-white/10 bg-[#131316]/70 backdrop-blur-xl shadow-2xl shadow-black/40">
              <CardHeader className="border-b border-white/8 bg-white/[0.02]">
                <CardTitle className="text-xl flex items-center gap-2 text-white">
                  <Megaphone className="h-5 w-5 text-primary" /> Barra de Comunicados / Avisos
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Exiba um banner de aviso importante no topo da plataforma de todos os alunos.
                </p>
              </CardHeader>
              <CardContent className="grid gap-5 p-6">
                <div className="flex items-center justify-between p-4.5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
                  <div>
                    <p className="font-semibold text-sm text-white">Ativar Barra de Comunicado</p>
                    <p className="text-xs text-muted-foreground">Exibe a mensagem no topo para todos os alunos</p>
                  </div>
                  <Switch
                    checked={settings.platform_announcement_enabled}
                    onCheckedChange={(checked) => setSettings({ ...settings, platform_announcement_enabled: checked })}
                  />
                </div>

                {settings.platform_announcement_enabled && (
                  <>
                    <Field label="Texto da Mensagem de Aviso">
                      <Input
                        className="rounded-xl"
                        value={settings.platform_announcement_text}
                        onChange={(e) => setSettings({ ...settings, platform_announcement_text: e.target.value })}
                        placeholder="Ex: 🔥 Novo módulo de treinos liberado nesta segunda-feira!"
                      />
                    </Field>

                    <Field label="Estilo / Cor do Aviso">
                      <Select
                        value={settings.platform_announcement_type}
                        onValueChange={(v: any) => setSettings({ ...settings, platform_announcement_type: v })}
                      >
                        <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="info">🔹 Azul Informativo</SelectItem>
                          <SelectItem value="success">🟢 Verde Sucesso / Novidade</SelectItem>
                          <SelectItem value="warning">⚡ Laranja Alerta / Atenção</SelectItem>
                          <SelectItem value="purple">✨ Roxo Destaque VIP</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>

                    {/* Preview Box */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Pré-visualização do Aviso:</Label>
                      <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-center gap-2 backdrop-blur-md shadow-md ${
                        settings.platform_announcement_type === "success" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : settings.platform_announcement_type === "warning" ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                        : settings.platform_announcement_type === "purple" ? "bg-purple-500/10 border-purple-500/30 text-purple-300"
                        : "bg-primary/10 border-primary/30 text-primary-foreground"
                      }`}>
                        <Megaphone className="h-4 w-4 shrink-0 text-primary" />
                        <span>{settings.platform_announcement_text || "Sua mensagem de comunicado aparecerá aqui..."}</span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 5: Seções & Visibilidade */}
          <TabsContent value="visibility" className="space-y-6 mt-0">
            <Card className="rounded-3xl border border-white/10 bg-[#131316]/70 backdrop-blur-xl shadow-2xl shadow-black/40">
              <CardHeader className="border-b border-white/8 bg-white/[0.02]">
                <CardTitle className="text-xl flex items-center gap-2 text-white">
                  <SlidersHorizontal className="h-5 w-5 text-primary" /> Recursos & Seções Visíveis
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Ligue ou desligue seções específicas da área de membros dos alunos.
                </p>
              </CardHeader>
              <CardContent className="grid gap-4 p-6">
                <div className="flex items-center justify-between p-4.5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
                  <div>
                    <p className="font-semibold text-sm text-white">Barra de Pesquisa de Cursos</p>
                    <p className="text-xs text-muted-foreground">Permite ao aluno pesquisar cursos por título</p>
                  </div>
                  <Switch
                    checked={settings.platform_show_search}
                    onCheckedChange={(checked) => setSettings({ ...settings, platform_show_search: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-4.5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
                  <div>
                    <p className="font-semibold text-sm text-white">Trilho "Continuar Assistindo"</p>
                    <p className="text-xs text-muted-foreground">Mostra a aula em andamento do aluno</p>
                  </div>
                  <Switch
                    checked={settings.platform_show_continue_watching}
                    onCheckedChange={(checked) => setSettings({ ...settings, platform_show_continue_watching: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-4.5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
                  <div>
                    <p className="font-semibold text-sm text-white">Trilho "Próximos Módulos / Recomendados"</p>
                    <p className="text-xs text-muted-foreground">Sugere novos módulos baseados no histórico</p>
                  </div>
                  <Switch
                    checked={settings.platform_show_recommended}
                    onCheckedChange={(checked) => setSettings({ ...settings, platform_show_recommended: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Floating / Bottom Save Bar */}
      {!loading && (
        <div className="flex items-center justify-between p-4 bg-[#131316]/90 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl">
          <p className="text-xs text-muted-foreground">
            Lembre-se de clicar em salvar após fazer alterações nas configurações.
          </p>
          <Button onClick={save} disabled={saving || uploading} size="sm" className="rounded-full px-6 bg-primary shadow-lg shadow-primary/30">
            {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
            Salvar Plataforma
          </Button>
        </div>
      )}
    </div>
  );
}

export function AdminHomeCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {adminCards.map((card) => (
        <Link key={card.url} to={card.url} className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/60">
          <card.icon className="h-6 w-6 text-primary mb-3" />
          <h3 className="font-semibold text-lg mb-1">{card.title}</h3>
          <p className="text-sm text-muted-foreground">{card.desc}</p>
          <div className="mt-4 flex items-center gap-2 text-sm text-primary"><CheckCircle2 className="h-4 w-4" /> Abrir gestão</div>
        </Link>
      ))}
    </div>
  );
}

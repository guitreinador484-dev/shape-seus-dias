import { type ReactNode, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json, Tables } from "@/integrations/supabase/types";
import { isAdminEmail, type AppRole } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { createStudent } from "@/lib/admin.functions";
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

type Profile = Tables<"profiles">;
type Purchase = Tables<"purchases">;
type QuizConfig = Tables<"quiz_config">;
type Anamnese = Tables<"anamnese">;
type Workout = Tables<"workouts">;
type StudentPlan = Tables<"student_plans">;
type StudentPlanExercise = Tables<"student_plan_exercises">;
type WorkoutInsert = Database["public"]["Tables"]["workouts"]["Insert"];
type WorkoutUpdate = Database["public"]["Tables"]["workouts"]["Update"];

type Student = Profile & { role: AppRole | null };
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
};

const roleLabels: Record<AppRole, string> = {
  admin: "Administrador",
  online: "Aluno online",
  presencial: "Aluno presencial",
};

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  approved: "Aprovado",
  canceled: "Cancelado",
  refunded: "Reembolsado",
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value ?? 0));
}

function asJsonObject(value: Json | null): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function readAdminSettings(value: Json | null): AdminSettings {
  const data = asJsonObject(value);
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

async function fetchStudents(): Promise<Student[]> {
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

  async function load() {
    setLoading(true);
    const [studentRows, purchaseRows, anamneseRows, workoutRows, planRows] = await Promise.all([
      fetchStudents(),
      supabase.from("purchases").select("*").order("created_at", { ascending: false }),
      supabase.from("anamnese").select("*").order("created_at", { ascending: false }),
      supabase.from("workouts").select("*").order("display_order", { ascending: true }),
      supabase.from("student_plans").select("*").order("created_at", { ascending: false }),
    ]);
    if (purchaseRows.error) throw purchaseRows.error;
    if (anamneseRows.error) throw anamneseRows.error;
    if (workoutRows.error) throw workoutRows.error;
    if (planRows.error) throw planRows.error;
    setStudents(studentRows);
    setPurchases(purchaseRows.data ?? []);
    setAnamneses(anamneseRows.data ?? []);
    setWorkouts(workoutRows.data ?? []);
    setPlans(planRows.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load().catch((error) => {
      setLoading(false);
      toast.error("Erro ao carregar o painel", { description: error.message });
    });
  }, []);

  const revenue = purchases.filter((purchase) => ["paid", "approved"].includes(purchase.status)).reduce((sum, purchase) => sum + Number(purchase.amount), 0);
  const latestStudents = students.slice(0, 5);
  const latestPurchases = purchases.slice(0, 5);

  if (loading) return <LoadingGrid />;

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Dashboard"
        description="Resumo operacional da plataforma, alunos, vendas e conteúdos."
        action={<Button variant="outline" onClick={() => load()}><RefreshCw className="h-4 w-4" /> Atualizar</Button>}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Alunos" value={students.length} icon={Users} />
        <StatCard title="Aulas" value={workouts.length} icon={Video} />
        <StatCard title="Treinos" value={plans.length} icon={Dumbbell} />
        <StatCard title="Anamneses" value={anamneses.length} icon={ClipboardList} />
        <StatCard title="Receita" value={formatCurrency(revenue)} icon={BadgeDollarSign} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2 mt-6">
        <Card>
          <CardHeader><CardTitle>Alunos recentes</CardTitle></CardHeader>
          <CardContent>
            {latestStudents.length === 0 ? <EmptyState title="Nenhum aluno" description="Os alunos aparecerão aqui após o cadastro." /> : (
              <div className="space-y-3">
                {latestStudents.map((student) => (
                  <div key={student.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{student.full_name || student.email}</p>
                      <p className="text-sm text-muted-foreground truncate">{student.email}</p>
                    </div>
                    <Badge variant="secondary">{student.role ? roleLabels[student.role] : "Sem papel"}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Vendas recentes</CardTitle></CardHeader>
          <CardContent>
            {latestPurchases.length === 0 ? <EmptyState title="Nenhuma venda" description="As vendas confirmadas e pendentes aparecerão aqui." /> : (
              <div className="space-y-3">
                {latestPurchases.map((purchase) => (
                  <div key={purchase.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{purchase.customer_name || purchase.customer_email || "Venda sem cliente"}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(purchase.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(purchase.amount)}</p>
                      <p className="text-xs text-muted-foreground">{statusLabels[purchase.status] ?? purchase.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function AdminStudentsPanel() {
  const [students, setStudents] = useState<Student[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  async function load() {
    setLoading(true);
    const [rows, purchaseRes] = await Promise.all([
      fetchStudents(),
      supabase.from("purchases").select("*").order("created_at", { ascending: false }),
    ]);
    if (purchaseRes.error) throw purchaseRes.error;
    setStudents(rows);
    setPurchases(purchaseRes.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load().catch((error) => {
      setLoading(false);
      toast.error("Erro ao carregar alunos", { description: error.message });
    });
  }, []);

  const filtered = students.filter((student) => [student.email, student.full_name, student.whatsapp, student.role].some((value) => value?.toLowerCase().includes(query.toLowerCase())));

  const registeredEmails = new Set(students.map((s) => s.email?.toLowerCase()).filter(Boolean));
  const buyersWithoutAccount = purchases.filter((p) => p.customer_email && !registeredEmails.has(p.customer_email.toLowerCase()));

  async function updateStudent(student: Student, patch: Partial<Profile>, nextRole?: AppRole) {
    if (isAdminEmail(student.email) && nextRole && nextRole !== "admin") {
      toast.error("Este email precisa continuar como administrador.");
      return;
    }
    const { error } = await supabase.from("profiles").update(patch).eq("id", student.id);
    if (error) throw error;
    if (nextRole && nextRole !== student.role) {
      const { error: deleteError } = await supabase.from("user_roles").delete().eq("user_id", student.id);
      if (deleteError) throw deleteError;
      const { error: insertError } = await supabase.from("user_roles").insert({ user_id: student.id, role: nextRole });
      if (insertError) throw insertError;
    }
    toast.success("Aluno atualizado");
    await load();
  }

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Alunos"
        description="Cadastre logins, edite dados, tipo de aluno e liberação de acesso às aulas."
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Cadastrar aluno
          </Button>
        }
      />
      <CreateStudentDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={() => load()} />
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-border px-3 py-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome, email, WhatsApp ou tipo" className="border-0 shadow-none focus-visible:ring-0" />
      </div>
      {loading ? <Skeleton className="h-80" /> : filtered.length === 0 ? <EmptyState title="Nenhum aluno encontrado" description="Ajuste a busca ou aguarde novos cadastros." /> : (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Aulas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((student) => (
                  <StudentRow key={student.id} student={student} onSave={updateStudent} />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      <div className="mt-8">
        <h3 className="font-display text-xl mb-1">Compradores</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Pessoas que compraram. Os que ainda não têm login estão marcados — clique para criar o acesso.
        </p>
        {purchases.length === 0 ? (
          <EmptyState title="Nenhuma compra registrada" description="As vendas aparecerão aqui automaticamente." />
        ) : (
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Login</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.map((purchase) => {
                    const hasAccount = purchase.customer_email && registeredEmails.has(purchase.customer_email.toLowerCase());
                    return (
                      <TableRow key={purchase.id}>
                        <TableCell>{purchase.customer_name || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{purchase.customer_email || "—"}</TableCell>
                        <TableCell>{formatCurrency(purchase.amount)}</TableCell>
                        <TableCell><Badge variant="secondary">{statusLabels[purchase.status] ?? purchase.status}</Badge></TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">{formatDate(purchase.created_at)}</TableCell>
                        <TableCell className="text-right">
                          {hasAccount ? (
                            <Badge><CheckCircle2 className="h-3 w-3" /> Cadastrado</Badge>
                          ) : purchase.customer_email ? (
                            <CreateStudentDialog
                              trigger={<Button size="sm" variant="outline"><Plus className="h-4 w-4" /> Criar login</Button>}
                              defaultEmail={purchase.customer_email}
                              defaultName={purchase.customer_name ?? ""}
                              onCreated={() => load()}
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground">Sem email</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {buyersWithoutAccount.length > 0 && (
                <p className="text-xs text-muted-foreground mt-3">
                  {buyersWithoutAccount.length} comprador(es) ainda sem login criado.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function CreateStudentDialog({
  open,
  onOpenChange,
  trigger,
  defaultEmail = "",
  defaultName = "",
  onCreated,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
  defaultEmail?: string;
  defaultName?: string;
  onCreated: () => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setOpen = (v: boolean) => { if (isControlled) onOpenChange?.(v); else setInternalOpen(v); };

  const createFn = useServerFn(createStudent);
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState(defaultName);
  const [whatsapp, setWhatsapp] = useState("");
  const [role, setRole] = useState<AppRole>("online");
  const [hasAccess, setHasAccess] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEmail(defaultEmail);
      setFullName(defaultName);
      setPassword("");
      setWhatsapp("");
      setRole("online");
      setHasAccess(true);
    }
  }, [isOpen, defaultEmail, defaultName]);

  async function submit() {
    setSaving(true);
    try {
      await createFn({ data: { email, password, full_name: fullName || undefined, whatsapp: whatsapp || undefined, role, has_class_access: hasAccess } });
      toast.success("Aluno cadastrado", { description: `Login criado para ${email}` });
      setOpen(false);
      onCreated();
    } catch (error) {
      toast.error("Erro ao cadastrar aluno", { description: error instanceof Error ? error.message : "Tente novamente." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cadastrar novo aluno</DialogTitle>
          <DialogDescription>Crie o login (email + senha). O aluno poderá entrar imediatamente.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="aluno@email.com" />
          </div>
          <div className="space-y-1">
            <Label>Senha provisória</Label>
            <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
          </div>
          <div className="space-y-1">
            <Label>Nome completo</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nome do aluno" />
          </div>
          <div className="space-y-1">
            <Label>WhatsApp</Label>
            <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(00) 00000-0000" />
          </div>
          <div className="space-y-1">
            <Label>Tipo de aluno</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="online">Aluno online</SelectItem>
                <SelectItem value="presencial">Aluno presencial</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <div>
              <p className="text-sm font-medium">Liberar aulas em vídeo</p>
              <p className="text-xs text-muted-foreground">Define o acesso inicial à área de aulas.</p>
            </div>
            <Switch checked={hasAccess} onCheckedChange={setHasAccess} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={submit} disabled={saving || !email || !password}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Cadastrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StudentRow({ student, onSave }: { student: Student; onSave: (student: Student, patch: Partial<Profile>, role?: AppRole) => Promise<void> }) {
  const [name, setName] = useState(student.full_name ?? "");
  const [whatsapp, setWhatsapp] = useState(student.whatsapp ?? "");
  const [role, setRole] = useState<AppRole>(student.role ?? "online");
  const [hasClassAccess, setHasClassAccess] = useState(student.has_class_access);
  const [isActive, setIsActive] = useState(student.is_active);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await onSave(student, { full_name: name || null, whatsapp: whatsapp || null, has_class_access: hasClassAccess, is_active: isActive }, role);
    } catch (error) {
      toast.error("Erro ao salvar aluno", { description: error instanceof Error ? error.message : "Tente novamente." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <TableRow>
      <TableCell>
        <div className="space-y-2">
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome" />
          <p className="text-xs text-muted-foreground">{student.email}</p>
          <Input value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} placeholder="WhatsApp" />
        </div>
      </TableCell>
      <TableCell className="min-w-44">
        <Select value={role} onValueChange={(value) => setRole(value as AppRole)} disabled={isAdminEmail(student.email)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="online">Aluno online</SelectItem>
            <SelectItem value="presencial">Aluno presencial</SelectItem>
            <SelectItem value="admin">Administrador</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Switch checked={hasClassAccess} onCheckedChange={setHasClassAccess} />
      </TableCell>
      <TableCell>
        <Switch checked={isActive} onCheckedChange={setIsActive} />
      </TableCell>
      <TableCell className="text-muted-foreground whitespace-nowrap">{formatDate(student.created_at)}</TableCell>
      <TableCell className="text-right">
        <Button size="sm" onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar</Button>
      </TableCell>
    </TableRow>
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
    const { error } = await supabase.from("workouts").delete().eq("id", id);
    if (error) throw error;
    toast.success("Aula removida");
    await load();
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
  const [planName, setPlanName] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [loading, setLoading] = useState(true);

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

  async function createPlan() {
    if (!selectedStudent) {
      toast.error("Selecione um aluno.");
      return;
    }
    const { error } = await supabase.from("student_plans").insert({ student_id: selectedStudent, day_of_week: Number(dayOfWeek), plan_name: planName || "Treino" });
    if (error) {
      toast.error("Erro ao criar treino", { description: error.message });
      return;
    }
    setPlanName("");
    toast.success("Treino criado");
    await load();
  }

  async function deletePlan(id: string) {
    const { error: exerciseError } = await supabase.from("student_plan_exercises").delete().eq("plan_id", id);
    if (exerciseError) {
      toast.error("Erro ao remover exercícios", { description: exerciseError.message });
      return;
    }
    const { error } = await supabase.from("student_plans").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao remover treino", { description: error.message });
      return;
    }
    toast.success("Treino removido");
    await load();
  }

  const studentById = new Map(students.map((student) => [student.id, student]));

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="Treinos" description="Crie planos por aluno e adicione exercícios com séries, repetições e descanso." />
      <Card className="mb-6">
        <CardHeader><CardTitle>Novo treino para aluno</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <Select value={selectedStudent} onValueChange={setSelectedStudent}>
            <SelectTrigger><SelectValue placeholder="Selecione o aluno" /></SelectTrigger>
            <SelectContent>{students.map((student) => <SelectItem key={student.id} value={student.id}>{student.full_name || student.email}</SelectItem>)}</SelectContent>
          </Select>
          <Input value={planName} onChange={(event) => setPlanName(event.target.value)} placeholder="Nome do treino" />
          <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"].map((day, index) => <SelectItem key={day} value={String(index)}>{day}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={createPlan}><Plus className="h-4 w-4" /> Criar treino</Button>
        </CardContent>
      </Card>
      {loading ? <Skeleton className="h-80" /> : plans.length === 0 ? <EmptyState title="Nenhum treino criado" description="Selecione um aluno e crie o primeiro plano de treino." /> : (
        <div className="space-y-4">
          {plans.map((plan) => <PlanCard key={plan.id} plan={plan} student={studentById.get(plan.student_id)} onReload={load} onDelete={deletePlan} />)}
        </div>
      )}
    </div>
  );
}

function PlanCard({ plan, student, onReload, onDelete }: { plan: PlanWithExercises; student?: Student; onReload: () => Promise<void>; onDelete: (id: string) => Promise<void> }) {
  const [exerciseName, setExerciseName] = useState("");
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [rest, setRest] = useState("60");
  const [notes, setNotes] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState(EXERCISE_GROUPS[0].key);
  const [librarySearch, setLibrarySearch] = useState("");
  const [pending, setPending] = useState<{ name: string; sets: string; reps: string; rest: string } | null>(null);

  async function confirmAddFromLibrary() {
    if (!pending) return;
    const { error } = await supabase.from("student_plan_exercises").insert({
      plan_id: plan.id,
      exercise_name: pending.name,
      sets: pending.sets,
      reps: pending.reps,
      rest_seconds: Number(pending.rest || 0),
      notes: "",
      display_order: plan.exercises.length + 1,
    });
    if (error) {
      toast.error("Erro ao adicionar exercício", { description: error.message });
      return;
    }
    toast.success(`${pending.name} adicionado`);
    setPending(null);
    await onReload();
  }

  async function addExercise() {
    if (!exerciseName) {
      toast.error("Informe o exercício.");
      return;
    }
    const { error } = await supabase.from("student_plan_exercises").insert({ plan_id: plan.id, exercise_name: exerciseName, sets, reps, rest_seconds: Number(rest || 0), notes, display_order: plan.exercises.length + 1 });
    if (error) {
      toast.error("Erro ao adicionar exercício", { description: error.message });
      return;
    }
    setExerciseName("");
    setSets("");
    setReps("");
    setNotes("");
    toast.success("Exercício adicionado");
    await onReload();
  }

  async function deleteExercise(id: string) {
    const { error } = await supabase.from("student_plan_exercises").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir exercício", { description: error.message });
      return;
    }
    toast.success("Exercício removido");
    await onReload();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{plan.plan_name || "Treino"}</CardTitle>
            <p className="text-sm text-muted-foreground">{student?.full_name || student?.email || "Aluno"} · dia {plan.day_of_week}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setLibraryOpen(true)}><Dumbbell className="h-4 w-4" /> Biblioteca de exercícios</Button>
            <Button variant="destructive" size="sm" onClick={() => onDelete(plan.id)}><Trash2 className="h-4 w-4" /> Excluir treino</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-6">
          <Input className="md:col-span-2" value={exerciseName} onChange={(event) => setExerciseName(event.target.value)} placeholder="Exercício" />
          <Input value={sets} onChange={(event) => setSets(event.target.value)} placeholder="Séries" />
          <Input value={reps} onChange={(event) => setReps(event.target.value)} placeholder="Reps" />
          <Input type="number" value={rest} onChange={(event) => setRest(event.target.value)} placeholder="Descanso" />
          <Button onClick={addExercise}><Plus className="h-4 w-4" /> Adicionar</Button>
          <Textarea className="md:col-span-6" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Observações" />
        </div>
        {plan.exercises.length === 0 ? <EmptyState title="Sem exercícios" description="Adicione os exercícios deste treino." /> : (
          <Table>
            <TableHeader><TableRow><TableHead>Exercício</TableHead><TableHead>Séries</TableHead><TableHead>Reps</TableHead><TableHead>Descanso</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>{plan.exercises.map((exercise) => <TableRow key={exercise.id}><TableCell>{exercise.exercise_name}<p className="text-xs text-muted-foreground">{exercise.notes}</p></TableCell><TableCell>{exercise.sets}</TableCell><TableCell>{exercise.reps}</TableCell><TableCell>{exercise.rest_seconds}s</TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => deleteExercise(exercise.id)}><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>)}</TableBody>
          </Table>
        )}
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
                        onClick={() => setPending({ name: ex, sets: "3", reps: "10-12", rest: "60" })}
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
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Séries">
                <Input value={pending.sets} onChange={(e) => setPending({ ...pending, sets: e.target.value })} placeholder="3" />
              </Field>
              <Field label="Repetições">
                <Input value={pending.reps} onChange={(e) => setPending({ ...pending, reps: e.target.value })} placeholder="10-12" />
              </Field>
              <Field label="Descanso (s)">
                <Input type="number" value={pending.rest} onChange={(e) => setPending({ ...pending, rest: e.target.value })} placeholder="60" />
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

  async function createPurchase() {
    const student = students.find((item) => item.id === form.user_id);
    const { error } = await supabase.from("purchases").insert({
      user_id: form.user_id === "none" ? null : form.user_id,
      amount: Number(form.amount || 0),
      status: form.status,
      customer_name: form.customer_name || student?.full_name || null,
      customer_email: form.customer_email || student?.email || null,
      transaction_id: form.transaction_id || null,
    });
    if (error) {
      toast.error("Erro ao criar venda", { description: error.message });
      return;
    }
    toast.success("Venda registrada");
    await load();
  }

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from("purchases").update({ status }).eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar venda", { description: error.message });
      return;
    }
    toast.success("Venda atualizada");
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
          <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(statusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
          <Input className="md:col-span-5" value={form.transaction_id} onChange={(event) => setForm({ ...form, transaction_id: event.target.value })} placeholder="ID da transação" />
          <Button onClick={createPurchase}><Plus className="h-4 w-4" /> Registrar</Button>
        </CardContent>
      </Card>
      {loading ? <Skeleton className="h-80" /> : purchases.length === 0 ? <EmptyState title="Nenhuma venda registrada" description="Registre vendas manuais ou aguarde integrações de pagamento." /> : (
        <Card><CardContent className="pt-6"><Table><TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>Valor</TableHead><TableHead>Status</TableHead><TableHead>Transação</TableHead><TableHead>Data</TableHead></TableRow></TableHeader><TableBody>{purchases.map((purchase) => <TableRow key={purchase.id}><TableCell>{purchase.customer_name || "—"}<p className="text-xs text-muted-foreground">{purchase.customer_email}</p></TableCell><TableCell>{formatCurrency(purchase.amount)}</TableCell><TableCell><Select value={purchase.status} onValueChange={(value) => updateStatus(purchase.id, value)}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(statusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></TableCell><TableCell className="text-muted-foreground">{purchase.transaction_id || purchase.appmax_order_id || "—"}</TableCell><TableCell>{formatDate(purchase.created_at)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
      )}
    </div>
  );
}

export function AdminQuizPanel() {
  const [configs, setConfigs] = useState<QuizConfig[]>([]);
  const [anamneses, setAnamneses] = useState<Anamnese[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [contentText, setContentText] = useState("");
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  async function load() {
    setLoading(true);
    const [configRows, anamneseRows, studentRows] = await Promise.all([
      supabase.from("quiz_config").select("*").order("section", { ascending: true }),
      supabase.from("anamnese").select("*").order("created_at", { ascending: false }),
      fetchStudents(),
    ]);
    if (configRows.error) throw configRows.error;
    if (anamneseRows.error) throw anamneseRows.error;
    setConfigs(configRows.data ?? []);
    setAnamneses(anamneseRows.data ?? []);
    setStudents(studentRows);
    const firstId = selectedId || configRows.data?.[0]?.id || "";
    setSelectedId(firstId);
    const selected = configRows.data?.find((item) => item.id === firstId) ?? configRows.data?.[0];
    setContentText(selected ? JSON.stringify(selected.content, null, 2) : "");
    setLoading(false);
  }

  useEffect(() => {
    load().catch((error) => {
      setLoading(false);
      toast.error("Erro ao carregar quiz", { description: error.message });
    });
  }, []);

  function selectConfig(id: string) {
    setSelectedId(id);
    const selected = configs.find((item) => item.id === id);
    setContentText(selected ? JSON.stringify(selected.content, null, 2) : "");
  }

  async function saveConfig() {
    try {
      const content = JSON.parse(contentText) as Json;
      const { error } = await supabase.from("quiz_config").update({ content }).eq("id", selectedId);
      if (error) throw error;
      toast.success("Quiz atualizado");
      await load();
    } catch (error) {
      toast.error("JSON inválido ou erro ao salvar", { description: error instanceof Error ? error.message : "Revise o conteúdo." });
    }
  }

  const studentById = new Map(students.map((student) => [student.id, student]));

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="Quiz / Anamnese" description="Edite textos e perguntas do quiz, e consulte respostas enviadas pelos alunos." />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPreview((v) => !v)}>
            {showPreview ? <><EyeOff className="h-4 w-4" /> Fechar prévia</> : <><Eye className="h-4 w-4" /> Ver ao vivo</>}
          </Button>
          <Button asChild variant="outline">
            <a href="/quiz" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" /> Abrir em nova aba
            </a>
          </Button>
        </div>
      </div>
      {loading ? <Skeleton className="h-80" /> : (
        <div className={showPreview ? "grid gap-4 lg:grid-cols-[1fr_420px]" : ""}>
          <div>
        <Tabs defaultValue="editor">
          <TabsList><TabsTrigger value="editor">Editor do quiz</TabsTrigger><TabsTrigger value="respostas">Respostas</TabsTrigger></TabsList>
          <TabsContent value="editor" className="mt-4">
            <Card><CardContent className="pt-6 space-y-4"><Select value={selectedId} onValueChange={selectConfig}><SelectTrigger><SelectValue placeholder="Selecione a seção" /></SelectTrigger><SelectContent>{configs.map((config) => <SelectItem key={config.id} value={config.id}>{config.section}</SelectItem>)}</SelectContent></Select><Textarea className="min-h-96 font-mono text-sm" value={contentText} onChange={(event) => setContentText(event.target.value)} /><Button onClick={saveConfig}><Save className="h-4 w-4" /> Salvar seção</Button></CardContent></Card>
          </TabsContent>
          <TabsContent value="respostas" className="mt-4">
            {anamneses.length === 0 ? <EmptyState title="Nenhuma anamnese recebida" description="As respostas dos alunos aparecerão aqui." /> : <div className="space-y-4">{anamneses.map((item) => <Card key={item.id}><CardHeader><CardTitle>{studentById.get(item.user_id)?.full_name || studentById.get(item.user_id)?.email || "Aluno"}</CardTitle><p className="text-sm text-muted-foreground">{formatDate(item.created_at)}</p></CardHeader><CardContent className="grid gap-3 md:grid-cols-2"><Info label="Objetivo" value={item.objetivo} /><Info label="Frequência" value={item.frequencia} /><Info label="Experiência" value={item.experiencia} /><Info label="Local" value={item.local_treino} /><Info label="Limitação" value={item.limitacao} /><Info label="Descrição" value={item.limitacao_descricao} /><pre className="md:col-span-2 overflow-auto rounded-lg bg-muted p-3 text-xs">{JSON.stringify(item.quiz_answers, null, 2)}</pre></CardContent></Card>)}</div>}
          </TabsContent>
        </Tabs>
          </div>
          {showPreview && (
            <Card className="overflow-hidden lg:sticky lg:top-4 h-[80vh]">
              <div className="flex items-center justify-between border-b px-3 py-2">
                <p className="text-sm font-medium">Prévia ao vivo</p>
                <Button size="sm" variant="ghost" onClick={() => setShowPreview(false)}>Fechar</Button>
              </div>
              <iframe src="/quiz" title="Quiz ao vivo" className="w-full h-[calc(80vh-41px)] border-0" />
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return <div><p className="text-xs uppercase text-muted-foreground">{label}</p><p className="font-medium">{value || "—"}</p></div>;
}

export function AdminSettingsPanel() {
  const [rowId, setRowId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AdminSettings>(defaultAdminSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("quiz_config").select("*").eq("section", "configuracoes").order("updated_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    setRowId(data?.id ?? null);
    setSettings(readAdminSettings(data?.content ?? null));
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
  { title: "Aulas em vídeo", url: "/admin/aulas", icon: Video, desc: "Cadastre aulas, categorias e vídeos." },
  { title: "Plataforma do aluno", url: "/admin/plataforma", icon: Video, desc: "Banner, destaque e ordem das prateleiras Netflix." },
  { title: "Treinos", url: "/admin/treinos", icon: Dumbbell, desc: "Monte planos por aluno e exercícios." },
  { title: "Vendas", url: "/admin/vendas", icon: BadgeDollarSign, desc: "Registre vendas e status de pagamento." },
  { title: "Quiz / Anamnese", url: "/admin/quiz", icon: ClipboardList, desc: "Edite perguntas e veja respostas." },
  { title: "Configurações", url: "/admin/configuracoes", icon: Settings, desc: "Ajuste marca, contato e links." },
];

export function AdminPlatformPanel() {
  const [rowId, setRowId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AdminSettings>(defaultAdminSettings);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function load() {
    setLoading(true);
    const [cfg, wks] = await Promise.all([
      supabase.from("quiz_config").select("*").eq("section", "configuracoes").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("workouts").select("*").order("display_order", { ascending: true }),
    ]);
    setRowId(cfg.data?.id ?? null);
    setSettings(readAdminSettings(cfg.data?.content ?? null));
    setWorkouts(wks.data ?? []);
    setLoading(false);
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
    toast.success("Plataforma atualizada");
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
      toast.success("Banner enviado");
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
      toast.success("Banner removido");
    } catch (error) {
      toast.error("Erro ao remover banner", { description: error instanceof Error ? error.message : "Tente novamente." });
    }
  }

  const categories = Array.from(new Set(workouts.map((w) => w.category).filter(Boolean)));

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <PageHeader title="Plataforma do aluno" description="Configure o banner em destaque e a ordem das prateleiras da experiência estilo Netflix." />
        <Button asChild variant="outline" className="mt-1">
          <a href="/plataforma?preview=1" target="_blank" rel="noreferrer" className="inline-flex items-center"><ExternalLink className="h-4 w-4 mr-2" />Ver como o aluno</a>
        </Button>
      </div>
      {loading ? <Skeleton className="h-96" /> : (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Banner de destaque</CardTitle></CardHeader>
            <CardContent className="grid gap-4">
              <Field label="Aula em destaque (CTA do banner)">
                <Select value={settings.platform_hero_workout_id || "none"} onValueChange={(v) => setSettings({ ...settings, platform_hero_workout_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {workouts.map((w) => <SelectItem key={w.id} value={w.id}>{w.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Título do banner (opcional)"><Input value={settings.platform_hero_title} onChange={(e) => setSettings({ ...settings, platform_hero_title: e.target.value })} placeholder="Ex: Treine como nunca" /></Field>
              <Field label="Subtítulo / descrição"><Textarea value={settings.platform_hero_subtitle} onChange={(e) => setSettings({ ...settings, platform_hero_subtitle: e.target.value })} placeholder="Frase de impacto" /></Field>
              <Field label="Imagem do banner">
                <div className="space-y-2">
                  {settings.platform_hero_image_path ? (
                    <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
                      <Eye className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-xs truncate flex-1" title={settings.platform_hero_image_path}>{settings.platform_hero_image_path}</span>
                      <Button type="button" size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={deleteBanner}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="inline-flex">
                      <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadBanner(f); e.target.value = ""; }} />
                      <span className={`inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm cursor-pointer hover:bg-muted ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        {uploading ? "Enviando..." : "Enviar banner"}
                      </span>
                    </label>
                  )}
                </div>
              </Field>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Aparência da plataforma</CardTitle></CardHeader>
            <CardContent className="grid gap-3">
              <p className="text-sm text-muted-foreground">Escolha o tema que seus alunos verão ao acessar a plataforma.</p>
              <div className="grid grid-cols-2 gap-3 max-w-md">
                {(["dark", "light"] as const).map((t) => {
                  const active = settings.platform_theme === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSettings({ ...settings, platform_theme: t })}
                      className={`relative rounded-xl border-2 p-4 text-left transition-all ${active ? "border-primary shadow-lg shadow-primary/20" : "border-border hover:border-primary/40"}`}
                    >
                      <div className={`h-20 rounded-md mb-3 border ${t === "dark" ? "bg-[#0a0a0a] border-[#2a2a2a]" : "bg-[#fafaf7] border-[#e5e5e0]"}`}>
                        <div className="flex gap-1 p-2">
                          <div className={`h-2 w-10 rounded ${t === "dark" ? "bg-[#2a2a2a]" : "bg-[#e0e0d8]"}`} />
                          <div className="h-2 w-6 rounded bg-primary" />
                        </div>
                        <div className={`mx-2 h-3 w-16 rounded ${t === "dark" ? "bg-[#1a1a1a]" : "bg-[#ececea]"}`} />
                      </div>
                      <p className="font-semibold text-sm">{t === "dark" ? "Escuro" : "Claro"}</p>
                      <p className="text-xs text-muted-foreground">{t === "dark" ? "Cinema-style, foco total" : "Limpo, alto contraste"}</p>
                      {active && <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Ordem das prateleiras</CardTitle></CardHeader>
            <CardContent className="grid gap-3">
              <p className="text-sm text-muted-foreground">Liste as categorias na ordem que devem aparecer, separadas por vírgula. Categorias não listadas aparecem depois.</p>
              <Input value={settings.platform_row_order} onChange={(e) => setSettings({ ...settings, platform_row_order: e.target.value })} placeholder={categories.join(", ")} />
              {categories.length > 0 && (
                <p className="text-xs text-muted-foreground">Categorias detectadas: {categories.join(" · ")}</p>
              )}
            </CardContent>
          </Card>
          <Button onClick={save} disabled={saving || uploading}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar plataforma</Button>
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

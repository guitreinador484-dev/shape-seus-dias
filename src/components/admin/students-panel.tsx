import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Dumbbell,
  Eye,
  FileText,
  KeyRound,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Unlock,
  UserPlus,
  Users,
  Apple,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { isAdminEmail, type AppRole } from "@/hooks/use-auth";
import {
  createStudent,
  updateStudentStatus,
  listStudentAccess,
  resetStudentPassword,
  removeStudent,
} from "@/lib/admin.functions";
import { resolvePlanTier } from "@/lib/plan-tiers";
import { AnamneseDialog, EvolutionDialog, fetchStudents, formatDate, formatCurrency, purchaseStatusLabels, type Student } from "@/components/admin/admin-panels";
import { AdminPageHeader, ConfirmDialog, EmptyBox, ErrorBox, LoadingBox, MetricCard, RowActions, StatusPill } from "@/components/admin/ui-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Purchase = Tables<"purchases">;

export type StudentAccessInfo = { last_sign_in_at: string | null };

/** Situação do aluno, sempre com texto (nunca só cor). */
export type AccessState = {
  label: string;
  tone: "green" | "amber" | "orange" | "red";
  key: "ativo" | "aguardando" | "expirado" | "bloqueado";
};

export function accessState(student: Student, lastSignIn: string | null | undefined): AccessState {
  if (!student.is_active) return { label: "Bloqueado", tone: "red", key: "bloqueado" };
  if (student.access_expires_at && new Date(student.access_expires_at).getTime() <= Date.now()) {
    return { label: "Acesso vencido", tone: "orange", key: "expirado" };
  }
  if (!lastSignIn) return { label: "Aguardando 1º acesso", tone: "amber", key: "aguardando" };
  return { label: "Ativo", tone: "green", key: "ativo" };
}

export function studentPlanLabel(purchases: Purchase[], student: Student): string | null {
  const email = student.email?.toLowerCase();
  const mine = purchases
    .filter(
      (p) =>
        (p.user_id && p.user_id === student.id) ||
        (email && p.customer_email?.toLowerCase() === email),
    )
    .filter((p) => ["paid", "approved"].includes(p.status));
  if (!mine.length) return null;
  return resolvePlanTier(mine[0].plan_id).shortName;
}

function initials(student: Student) {
  return (student.full_name || student.email || "?").trim()[0]?.toUpperCase() ?? "?";
}

function generateTemporaryPassword() {
  const bytes = new Uint32Array(14);
  crypto.getRandomValues(bytes);
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
}

function useStudentsData() {
  const listAccessFn = useServerFn(listStudentAccess);
  const [students, setStudents] = useState<Student[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [access, setAccess] = useState<Record<string, StudentAccessInfo>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rows, purchaseRes] = await Promise.all([
        fetchStudents(),
        supabase.from("purchases").select("*").order("created_at", { ascending: false }),
      ]);
      if (purchaseRes.error) throw purchaseRes.error;
      setStudents(rows);
      setPurchases(purchaseRes.data ?? []);
      try {
        const res = await listAccessFn();
        setAccess(
          Object.fromEntries(res.users.map((u) => [u.id, { last_sign_in_at: u.last_sign_in_at }])),
        );
      } catch {
        /* último acesso é complementar: a lista continua funcionando sem ele */
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }, [listAccessFn]);

  useEffect(() => {
    void load();
  }, [load]);

  return { students, purchases, access, loading, error, reload: load };
}

const FILTERS = [
  { key: "todos", label: "Todos" },
  { key: "ativo", label: "Ativos" },
  { key: "aguardando", label: "Aguardando 1º acesso" },
  { key: "expirado", label: "Acesso vencido" },
  { key: "bloqueado", label: "Bloqueados" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

export function AdminStudentsPanel() {
  const { students, purchases, access, loading, error, reload } = useStudentsData();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("todos");
  const [createOpen, setCreateOpen] = useState(false);
  const updateStudentFn = useServerFn(updateStudentStatus);

  const onlyStudents = useMemo(
    () => students.filter((s) => s.role !== "admin" && !isAdminEmail(s.email)),
    [students],
  );

  const counts = useMemo(() => {
    const base: Record<string, number> = { todos: onlyStudents.length, ativo: 0, aguardando: 0, expirado: 0, bloqueado: 0 };
    for (const s of onlyStudents) base[accessState(s, access[s.id]?.last_sign_in_at).key] += 1;
    return base;
  }, [onlyStudents, access]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return onlyStudents.filter((s) => {
      const matchesQuery =
        !q || [s.full_name, s.email, s.whatsapp].some((v) => v?.toLowerCase().includes(q));
      const state = accessState(s, access[s.id]?.last_sign_in_at).key;
      return matchesQuery && (filter === "todos" || state === filter);
    });
  }, [onlyStudents, query, filter, access]);

  const registeredEmails = useMemo(
    () => new Set(students.map((s) => s.email?.toLowerCase()).filter(Boolean)),
    [students],
  );
  const buyersWithoutAccount = purchases.filter(
    (p) => p.customer_email && !registeredEmails.has(p.customer_email.toLowerCase()),
  );

  async function setAccessFor(student: Student, liberado: boolean) {
    try {
      await updateStudentFn({ data: { userId: student.id, is_active: liberado } });
      toast.success(liberado ? "Acesso liberado com sucesso." : "Acesso bloqueado.");
      await reload();
    } catch (e) {
      toast.error("Não foi possível alterar o acesso", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <AdminPageHeader
        title="Alunos"
        description="Gerencie alunos, acessos, planos, treinos e informações de cadastro."
        action={
          <div className="grid grid-cols-1 gap-2 sm:flex">
            <Button variant="outline" onClick={() => void reload()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" /> Cadastrar aluno
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Total de alunos" value={counts.todos} icon={Users} tone="blue" />
          <MetricCard label="Com acesso ativo" value={counts.ativo} icon={CheckCircle2} tone="green" />
          <MetricCard label="Aguardando 1º acesso" value={counts.aguardando} icon={KeyRound} tone="amber" />
          <MetricCard label="Bloqueados ou vencidos" value={counts.bloqueado + counts.expirado} icon={Lock} tone="red" />
        </div>
      </AdminPageHeader>

      <CreateStudentDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={() => void reload()} />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Button
              key={f.key}
              size="sm"
              variant={filter === f.key ? "default" : "outline"}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
              <span className="ml-2 text-xs opacity-70">{counts[f.key]}</span>
            </Button>
          ))}
        </div>
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar por nome, e-mail ou telefone"
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <LoadingBox rows={5} />
      ) : error ? (
        <ErrorBox message={error} onRetry={() => void reload()} />
      ) : filtered.length === 0 ? (
        <EmptyBox
          title={onlyStudents.length === 0 ? "Nenhum aluno cadastrado" : "Nenhum aluno encontrado"}
          description={
            onlyStudents.length === 0
              ? "Você ainda não possui alunos cadastrados."
              : "Nenhum aluno corresponde à pesquisa ou ao filtro escolhido."
          }
          action={
            onlyStudents.length === 0 ? (
              <Button onClick={() => setCreateOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" /> Cadastrar primeiro aluno
              </Button>
            ) : (
              <Button variant="outline" onClick={() => { setQuery(""); setFilter("todos"); }}>
                Limpar pesquisa
              </Button>
            )
          }
        />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table className="min-w-[560px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead className="hidden md:table-cell">E-mail</TableHead>
                  <TableHead className="hidden lg:table-cell">Plano</TableHead>
                  <TableHead>Acesso</TableHead>
                  <TableHead className="hidden lg:table-cell">Último acesso</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((student) => {
                  const state = accessState(student, access[student.id]?.last_sign_in_at);
                  const plan = studentPlanLabel(purchases, student);
                  return (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                            {initials(student)}
                          </span>
                          <div className="min-w-0">
                            <Link
                              to="/admin/alunos/$id"
                              params={{ id: student.id }}
                              className="block truncate font-medium hover:underline"
                            >
                              {student.full_name || "Sem nome"}
                            </Link>
                            <p className="truncate text-xs text-muted-foreground md:hidden">{student.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">{student.email}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {plan ? <Badge variant="secondary">{plan}</Badge> : <span className="text-xs text-muted-foreground">Sem plano</span>}
                      </TableCell>
                      <TableCell>
                        <StatusPill tone={state.tone}>{state.label}</StatusPill>
                      </TableCell>
                      <TableCell className="hidden whitespace-nowrap text-muted-foreground lg:table-cell">
                        {access[student.id]?.last_sign_in_at ? formatDate(access[student.id]?.last_sign_in_at) : "Nunca entrou"}
                      </TableCell>
                      <TableCell className="text-right">
                        <StudentActionsMenu
                          student={student}
                          blocked={!student.is_active}
                          onToggleAccess={(liberado) => void setAccessFor(student, liberado)}
                          onChanged={() => void reload()}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <section className="mt-10">
        <h3 className="font-display text-xl">Compradores</h3>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">
          Pessoas que compraram pelo site. Quem ainda não tem login aparece com o botão para criar o acesso.
        </p>
        {loading ? (
          <LoadingBox rows={3} />
        ) : purchases.length === 0 ? (
          <EmptyBox title="Nenhuma compra registrada" description="As vendas do site aparecem aqui automaticamente." />
        ) : (
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="hidden md:table-cell">E-mail</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead className="hidden lg:table-cell">Data</TableHead>
                    <TableHead className="text-right">Login</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.map((purchase) => {
                    const hasAccount =
                      purchase.customer_email && registeredEmails.has(purchase.customer_email.toLowerCase());
                    return (
                      <TableRow key={purchase.id}>
                        <TableCell>{purchase.customer_name || "—"}</TableCell>
                        <TableCell className="hidden text-muted-foreground md:table-cell">
                          {purchase.customer_email || "—"}
                        </TableCell>
                        <TableCell>{formatCurrency(purchase.amount)}</TableCell>
                        <TableCell>
                          <StatusPill tone={["paid", "approved"].includes(purchase.status) ? "green" : purchase.status === "pending" ? "amber" : "red"}>
                            {purchaseStatusLabels[purchase.status] ?? purchase.status}
                          </StatusPill>
                        </TableCell>
                        <TableCell className="hidden whitespace-nowrap text-muted-foreground lg:table-cell">
                          {formatDate(purchase.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          {hasAccount ? (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Já tem login
                            </span>
                          ) : purchase.customer_email ? (
                            <CreateStudentDialog
                              trigger={
                                <Button size="sm" variant="outline">
                                  <Plus className="mr-1.5 h-4 w-4" /> Criar acesso
                                </Button>
                              }
                              defaultEmail={purchase.customer_email}
                              defaultName={purchase.customer_name ?? ""}
                              onCreated={() => void reload()}
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground">Sem e-mail</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {buyersWithoutAccount.length > 0 && (
                <p className="px-4 py-3 text-xs text-muted-foreground">
                  {buyersWithoutAccount.length} comprador(es) ainda sem login criado.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}

function StudentActionsMenu({
  student,
  blocked,
  onToggleAccess,
  onChanged,
}: {
  student: Student;
  blocked: boolean;
  onToggleAccess: (liberado: boolean) => void;
  onChanged: () => void;
}) {
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const removeFn = useServerFn(removeStudent);

  async function remove(mode: "inativar" | "excluir") {
    try {
      await removeFn({ data: { userId: student.id, mode } });
      toast.success(mode === "excluir" ? "Aluno removido com sucesso." : "Aluno inativado. O histórico foi mantido.");
      onChanged();
    } catch (e) {
      toast.error("Não foi possível concluir", { description: e instanceof Error ? e.message : undefined });
    }
  }

  return (
    <>
      <RowActions>
        <DropdownMenuItem onSelect={() => navigate({ to: "/admin/alunos/$id", params: { id: student.id } })}>
          <Eye className="mr-2 h-4 w-4" /> Ver aluno
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setEditOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" /> Editar dados
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onToggleAccess(blocked)}>
          {blocked ? <Unlock className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
          {blocked ? "Liberar acesso" : "Bloquear acesso"}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setPasswordOpen(true)}>
          <KeyRound className="mr-2 h-4 w-4" /> Redefinir senha
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onSelect={(e) => {
            e.preventDefault();
            document.getElementById(`remove-${student.id}`)?.click();
          }}
        >
          <Trash2 className="mr-2 h-4 w-4" /> Excluir aluno
        </DropdownMenuItem>
      </RowActions>

      <ConfirmDialog
        trigger={<button id={`remove-${student.id}`} className="hidden" aria-hidden />}
        title="Excluir aluno?"
        description="Essa ação remove o cadastro do aluno e o login dele. O histórico de compras é mantido. Se preferir guardar os dados, use 'Apenas inativar'."
        confirmLabel="Sim, excluir aluno"
        cancelLabel="Cancelar"
        destructive
        onConfirm={() => remove("excluir")}
      />

      <EditStudentDialog student={student} open={editOpen} onOpenChange={setEditOpen} onSaved={onChanged} />
      <ResetPasswordDialog student={student} open={passwordOpen} onOpenChange={setPasswordOpen} />
    </>
  );
}

export function ResetPasswordDialog({
  student,
  open,
  onOpenChange,
}: {
  student: Student;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const resetFn = useServerFn(resetStudentPassword);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setPassword(generateTemporaryPassword());
  }, [open]);

  async function submit() {
    setBusy(true);
    try {
      await resetFn({ data: { userId: student.id, password } });
      toast.success("Senha redefinida", { description: "Envie a nova senha para o aluno." });
      onOpenChange(false);
    } catch (e) {
      toast.error("Não foi possível redefinir a senha", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100%-1.5rem)] overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle>Redefinir senha de {student.full_name || student.email}</DialogTitle>
          <DialogDescription>Gere uma nova senha e envie para o aluno pelo WhatsApp ou e-mail.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Nova senha</Label>
           <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <Input value={password} onChange={(e) => setPassword(e.target.value)} />
            <Button type="button" variant="outline" onClick={() => setPassword(generateTemporaryPassword())}>
              Gerar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Mínimo de 10 caracteres com letras, números e símbolos.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={() => void submit()} disabled={busy || password.length < 10}>
            {busy ? "Salvando..." : "Salvar nova senha"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EditStudentDialog({
  student,
  open,
  onOpenChange,
  onSaved,
}: {
  student: Student;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const updateFn = useServerFn(updateStudentStatus);
  const [fullName, setFullName] = useState(student.full_name ?? "");
  const [whatsapp, setWhatsapp] = useState(student.whatsapp ?? "");
  const [role, setRole] = useState<AppRole>(student.role ?? "online");
  const [classAccess, setClassAccess] = useState(student.has_class_access);
  const [orderBump, setOrderBump] = useState(student.has_order_bump);
  const [expiresAt, setExpiresAt] = useState(student.access_expires_at ? student.access_expires_at.slice(0, 10) : "");
  const [mentoria, setMentoria] = useState(false);
  const [initialMentoria, setInitialMentoria] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFullName(student.full_name ?? "");
    setWhatsapp(student.whatsapp ?? "");
    setRole(student.role ?? "online");
    setClassAccess(student.has_class_access);
    setOrderBump(student.has_order_bump);
    setExpiresAt(student.access_expires_at ? student.access_expires_at.slice(0, 10) : "");
    let alive = true;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", student.id)
      .eq("role", "aluno_mentoria")
      .then(({ data }) => {
        if (!alive) return;
        const has = (data ?? []).length > 0;
        setMentoria(has);
        setInitialMentoria(has);
      });
    return () => {
      alive = false;
    };
  }, [open, student]);


  async function submit() {
    setBusy(true);
    try {
      await updateFn({
        data: {
          userId: student.id,
          full_name: fullName || null,
          whatsapp: whatsapp || null,
          has_class_access: classAccess,
          has_order_bump: orderBump,
          access_expires_at: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : null,
          role: role !== student.role ? role : undefined,
          is_mentoria: mentoria !== initialMentoria ? mentoria : undefined,
        },
      });
      toast.success("Aluno atualizado com sucesso.");
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error("Não foi possível salvar", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100%-1.5rem)] overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle>Editar aluno</DialogTitle>
          <DialogDescription>{student.email}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <FormSection title="Dados pessoais">
            <div className="space-y-1">
              <Label>Nome completo</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Telefone / WhatsApp</Label>
              <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(00) 00000-0000" />
            </div>
          </FormSection>
          <FormSection title="Acesso">
            <div className="space-y-1">
              <Label>Tipo de aluno</Label>
              <Select value={role} onValueChange={(v) => setRole(v as AppRole)} disabled={isAdminEmail(student.email)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Aluno online</SelectItem>
                  <SelectItem value="presencial">Aluno presencial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Acesso válido até (opcional)</Label>
              <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
            <ToggleRow
              title="Aulas em vídeo"
              hint="Libera a área de aulas gravadas."
              checked={classAccess}
              onChange={setClassAccess}
            />
            <ToggleRow
              title="Dieta e acompanhamento completo"
              hint="Oferta extra comprada no checkout."
              checked={orderBump}
              onChange={setOrderBump}
            />
            <ToggleRow
              title="Aluno da mentoria"
              hint="Libera a área Mentoria com a biblioteca de exercícios em vídeo."
              checked={mentoria}
              onChange={setMentoria}
            />
          </FormSection>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={() => void submit()} disabled={busy}>
            {busy ? "Salvando..." : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function ToggleRow({
  title,
  hint,
  checked,
  onChange,
}: {
  title: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-3 py-2">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function CreateStudentDialog({
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
  const setOpen = (v: boolean) => (isControlled ? onOpenChange?.(v) : setInternalOpen(v));

  const createFn = useServerFn(createStudent);
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState(defaultName);
  const [whatsapp, setWhatsapp] = useState("");
  const [role, setRole] = useState<AppRole>("online");
  const [hasAccess, setHasAccess] = useState(true);
  const [saving, setSaving] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEmail(defaultEmail);
      setFullName(defaultName);
      setPassword(generateTemporaryPassword());
      setWhatsapp("");
      setRole("online");
      setHasAccess(true);
      setCreatedId(null);
    }
  }, [isOpen, defaultEmail, defaultName]);

  async function submit() {
    setSaving(true);
    try {
      const res = await createFn({
        data: {
          email,
          password,
          full_name: fullName || undefined,
          whatsapp: whatsapp || undefined,
          role,
          has_class_access: hasAccess,
        },
      });
      toast.success("Aluno cadastrado com sucesso.");
      setCreatedId(res.user_id ?? null);
      onCreated();
    } catch (error) {
      toast.error("Erro ao cadastrar aluno", {
        description: error instanceof Error ? error.message : "Tente novamente.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-h-[90vh] w-[calc(100%-1.5rem)] overflow-y-auto sm:w-full">
        {createdId ? (
          <>
            <DialogHeader>
              <DialogTitle>Aluno cadastrado com sucesso.</DialogTitle>
              <DialogDescription>
                Envie para {email} a senha provisória <b>{password}</b>. Ele pode trocar depois na plataforma.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Fechar
              </Button>
              <Button asChild>
                <Link to="/admin/alunos/$id" params={{ id: createdId }} onClick={() => setOpen(false)}>
                  Ver aluno
                </Link>
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Cadastrar aluno</DialogTitle>
              <DialogDescription>Crie o acesso do aluno. Ele já poderá entrar com e-mail e senha.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <FormSection title="Dados pessoais">
                <div className="space-y-1">
                  <Label>Nome completo</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nome do aluno" />
                </div>
                <div className="space-y-1">
                  <Label>E-mail</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="aluno@email.com" />
                </div>
                <div className="space-y-1">
                  <Label>Telefone / WhatsApp</Label>
                  <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(00) 00000-0000" />
                </div>
              </FormSection>
              <FormSection title="Acesso">
                <div className="space-y-1">
                  <Label>Tipo de aluno</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">Aluno online</SelectItem>
                      <SelectItem value="presencial">Aluno presencial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Senha provisória</Label>
                   <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                    <Input value={password} onChange={(e) => setPassword(e.target.value)} />
                    <Button type="button" variant="outline" onClick={() => setPassword(generateTemporaryPassword())}>
                      Gerar
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Mínimo de 10 caracteres.</p>
                </div>
                <ToggleRow
                  title="Liberar aulas em vídeo"
                  hint="Define o acesso inicial à área de aulas."
                  checked={hasAccess}
                  onChange={setHasAccess}
                />
              </FormSection>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={() => void submit()} disabled={saving || !email || password.length < 10}>
                {saving ? "Salvando..." : "Cadastrar aluno"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Perfil do aluno                                                      */
/* ------------------------------------------------------------------ */

export function StudentProfilePanel({ studentId }: { studentId: string }) {
  const { students, purchases, access, loading, error, reload } = useStudentsData();
  const [plans, setPlans] = useState<Tables<"student_plans">[]>([]);
  const [nutrition, setNutrition] = useState<Tables<"nutrition_plans">[]>([]);
  const [pdfs, setPdfs] = useState<Tables<"workout_pdfs">[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [evolutionOpen, setEvolutionOpen] = useState(false);
  const [anamneseOpen, setAnamneseOpen] = useState(false);
  const updateFn = useServerFn(updateStudentStatus);
  const removeFn = useServerFn(removeStudent);
  const navigate = useNavigate();

  const student = students.find((s) => s.id === studentId);

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    (async () => {
      const [planRes, nutriRes, pdfRes] = await Promise.all([
        supabase.from("student_plans").select("*").eq("student_id", studentId).order("day_of_week"),
        supabase.from("nutrition_plans").select("*").eq("student_id", studentId),
        supabase.from("workout_pdfs").select("*").eq("student_id", studentId).order("generated_at", { ascending: false }),
      ]);
      if (cancelled) return;
      setPlans(planRes.data ?? []);
      setNutrition(nutriRes.data ?? []);
      setPdfs(pdfRes.data ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  if (loading) return <LoadingBox rows={6} />;
  if (error) return <ErrorBox message={error} onRetry={() => void reload()} />;
  if (!student) {
    return (
      <EmptyBox
        title="Aluno não encontrado"
        description="Este aluno pode ter sido removido."
        action={
          <Button asChild variant="outline">
            <Link to="/admin/alunos">Voltar para a lista</Link>
          </Button>
        }
      />
    );
  }

  const state = accessState(student, access[student.id]?.last_sign_in_at);
  const plan = studentPlanLabel(purchases, student);
  const studentPurchases = purchases.filter(
    (p) => p.user_id === student.id || p.customer_email?.toLowerCase() === student.email?.toLowerCase(),
  );

  async function setAccessFor(liberado: boolean) {
    if (!student) return;
    try {
      await updateFn({ data: { userId: student.id, is_active: liberado } });
      toast.success(liberado ? "Acesso liberado com sucesso." : "Acesso bloqueado.");
      await reload();
    } catch (e) {
      toast.error("Não foi possível alterar o acesso", { description: e instanceof Error ? e.message : undefined });
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/admin/alunos">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para alunos
        </Link>
      </Button>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-primary/15 text-xl font-semibold text-primary">
            {initials(student)}
          </span>
          <div>
            <h2 className="font-display text-2xl">{student.full_name || "Sem nome"}</h2>
            <p className="text-sm text-muted-foreground">{student.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusPill tone={state.tone}>{state.label}</StatusPill>
              {plan ? <Badge variant="secondary">Plano {plan}</Badge> : null}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Editar dados
          </Button>
          {student.is_active ? (
            <ConfirmDialog
              trigger={
                <Button variant="outline">
                  <Lock className="mr-2 h-4 w-4" /> Bloquear acesso
                </Button>
              }
              title="Bloquear o acesso deste aluno?"
              description="Ele deixa de conseguir entrar na plataforma até você liberar de novo. Nada é apagado."
              confirmLabel="Sim, bloquear acesso"
              onConfirm={() => setAccessFor(false)}
            />
          ) : (
            <ConfirmDialog
              trigger={
                <Button>
                  <Unlock className="mr-2 h-4 w-4" /> Liberar acesso
                </Button>
              }
              title="Liberar o acesso deste aluno?"
              description="Ele volta a entrar na plataforma com o mesmo e-mail e senha."
              confirmLabel="Sim, liberar acesso"
              onConfirm={() => setAccessFor(true)}
            />
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Dados do aluno</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <InfoRow label="Nome" value={student.full_name || "—"} />
            <InfoRow label="E-mail" value={student.email} />
            <InfoRow label="Telefone" value={student.whatsapp || "—"} />
            <InfoRow label="Tipo" value={student.role === "presencial" ? "Aluno presencial" : "Aluno online"} />
            <InfoRow label="Plano" value={plan ?? "Sem plano registrado"} />
            <InfoRow label="Cadastro" value={formatDate(student.created_at)} />
            <InfoRow
              label="Último acesso"
              value={access[student.id]?.last_sign_in_at ? formatDate(access[student.id]?.last_sign_in_at) : "Nunca entrou"}
            />
            <InfoRow
              label="Acesso válido até"
              value={student.access_expires_at ? formatDate(student.access_expires_at) : "Sem data de término"}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recursos liberados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <InfoRow label="Entrar na plataforma" value={student.is_active ? "Liberado" : "Bloqueado"} />
            <InfoRow label="Aulas em vídeo" value={student.has_class_access ? "Liberado" : "Bloqueado"} />
            <InfoRow label="Dieta / acompanhamento" value={student.has_order_bump ? "Liberado" : "Bloqueado"} />
            <div className="flex flex-wrap gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setPasswordOpen(true)}>
                <KeyRound className="mr-2 h-4 w-4" /> Redefinir senha
              </Button>
              <Button size="sm" variant="outline" onClick={() => setAnamneseOpen(true)}>
                <FileText className="mr-2 h-4 w-4" /> Ver ficha
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEvolutionOpen(true)}>
                <Eye className="mr-2 h-4 w-4" /> Ver evolução
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Dumbbell className="h-4 w-4" /> Treinos
          </CardTitle>
          <Button size="sm" variant="outline" asChild>
            <Link to="/admin/treinos">Gerenciar treinos</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {plans.length === 0 ? (
            <EmptyBox
              title="Este aluno ainda não possui treino"
              description="Crie o treino da semana para ele na área de Treinos."
              action={
                <Button asChild>
                  <Link to="/admin/treinos">
                    <Plus className="mr-2 h-4 w-4" /> Criar treino
                  </Link>
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-border">
              {plans.map((p) => {
                const pdf = pdfs.find((f) => f.plan_id === p.id);
                return (
                  <li key={p.id} className="grid grid-cols-1 gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{p.plan_name || "Treino"}</p>
                      <p className="text-xs text-muted-foreground">
                        Atualizado em {formatDate(p.updated_at)}
                      </p>
                    </div>
                    {pdf ? (
                      <StatusPill tone="green">PDF pronto</StatusPill>
                    ) : (
                      <StatusPill tone="amber">Sem PDF</StatusPill>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Apple className="h-4 w-4" /> Nutrição
          </CardTitle>
          <Button size="sm" variant="outline" asChild>
            <Link to="/admin/nutricao">Gerenciar dieta</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {nutrition.length === 0 ? (
            <EmptyBox title="Sem plano alimentar" description="Este aluno ainda não tem uma dieta cadastrada." />
          ) : (
            <ul className="divide-y divide-border">
              {nutrition.map((n) => (
                <li key={n.id} className="flex items-center justify-between py-3">
                  <p className="font-medium">{n.plan_name || "Plano alimentar"}</p>
                  <span className="text-xs text-muted-foreground">Atualizado em {formatDate(n.updated_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Histórico de compras</CardTitle>
        </CardHeader>
        <CardContent>
          {studentPurchases.length === 0 ? (
            <EmptyBox title="Nenhuma compra" description="Este aluno foi cadastrado manualmente ou ainda não comprou." />
          ) : (
            <ul className="divide-y divide-border">
              {studentPurchases.map((p) => (
                <li key={p.id} className="grid grid-cols-1 gap-2 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div>
                    <p className="font-medium">{resolvePlanTier(p.plan_id).shortName}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(p.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span>{formatCurrency(p.amount)}</span>
                    <StatusPill tone={["paid", "approved"].includes(p.status) ? "green" : p.status === "pending" ? "amber" : "red"}>
                      {purchaseStatusLabels[p.status] ?? p.status}
                    </StatusPill>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Remover aluno</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Prefira inativar: o aluno perde o acesso, mas o histórico de treinos e compras é mantido.
          </p>
          <div className="flex flex-wrap gap-2">
            <ConfirmDialog
              trigger={<Button variant="outline">Apenas inativar</Button>}
              title="Inativar este aluno?"
              description="Ele perde o acesso à plataforma, mas todos os dados continuam guardados."
              confirmLabel="Sim, inativar"
              onConfirm={async () => {
                try {
                  await removeFn({ data: { userId: student.id, mode: "inativar" } });
                  toast.success("Aluno inativado. O histórico foi mantido.");
                  await reload();
                } catch (e) {
                  toast.error("Não foi possível inativar", { description: e instanceof Error ? e.message : undefined });
                }
              }}
            />
            <ConfirmDialog
              trigger={
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Excluir aluno
                </Button>
              }
              title="Excluir aluno?"
              description="Essa ação removerá o cadastro e o login do aluno. Verifique se realmente deseja continuar."
              confirmLabel="Sim, excluir aluno"
              destructive
              onConfirm={async () => {
                try {
                  await removeFn({ data: { userId: student.id, mode: "excluir" } });
                  toast.success("Aluno removido com sucesso.");
                  navigate({ to: "/admin/alunos" });
                } catch (e) {
                  toast.error("Não foi possível excluir", { description: e instanceof Error ? e.message : undefined });
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

      <EditStudentDialog student={student} open={editOpen} onOpenChange={setEditOpen} onSaved={() => void reload()} />
      <ResetPasswordDialog student={student} open={passwordOpen} onOpenChange={setPasswordOpen} />
      <EvolutionDialog student={student} open={evolutionOpen} onOpenChange={setEvolutionOpen} />
      <AnamneseDialog student={student} open={anamneseOpen} onOpenChange={setAnamneseOpen} />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

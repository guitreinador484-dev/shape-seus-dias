import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { isAdminEmail } from "@/hooks/use-auth";
import {
  adminStudentsKey,
  fetchStudents,
  formatCurrency,
  formatDate,
  purchaseStatusLabels,
  type Student,
} from "@/lib/admin-data";
import { AdminPageHeader, ErrorBox, LoadingBox, StatusPill } from "@/components/admin/ui-kit";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadBar } from "@/components/ui/load-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type BodyMeasurement = Tables<"body_measurements">;
type DashboardPurchase = Pick<
  Tables<"purchases">,
  "id" | "customer_name" | "customer_email" | "amount" | "status" | "created_at"
>;

const dashboardKey = ["admin", "dashboard"] as const;

/** Só as colunas que a tela usa: anamneses, treinos e medições completas ficam para quando forem abertos. */
async function fetchDashboard() {
  const [purchases, plans, measurements] = await Promise.all([
    supabase
      .from("purchases")
      .select("id, customer_name, customer_email, amount, status, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("student_plans").select("id, student_id"),
    supabase.from("body_measurements").select("user_id"),
  ]);
  if (purchases.error) throw purchases.error;
  if (plans.error) throw plans.error;
  if (measurements.error) throw measurements.error;
  const measurementCount: Record<string, number> = {};
  for (const row of measurements.data ?? [])
    measurementCount[row.user_id] = (measurementCount[row.user_id] ?? 0) + 1;
  return {
    purchases: (purchases.data ?? []) as DashboardPurchase[],
    plans: plans.data ?? [],
    measurementCount,
  };
}

function initial(student: Student | undefined) {
  return (student?.full_name || student?.email || "?").trim()[0]?.toUpperCase() ?? "?";
}

function Avatar({ student, className }: { student?: Student; className?: string }) {
  return (
    <span
      className={cn(
        "grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold text-foreground",
        className,
      )}
      aria-hidden
    >
      {initial(student)}
    </span>
  );
}

function SectionTitle({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex min-h-9 flex-wrap items-center justify-between gap-2">
      <h3 className="font-display text-2xl leading-none">{children}</h3>
      {action}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "danger" }) {
  return (
    <div className="min-w-0 p-4 sm:p-5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 font-display text-3xl leading-none tabular-nums",
          tone === "danger" ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}

const MEASURE_COLUMNS: { key: keyof BodyMeasurement; label: string }[] = [
  { key: "weight_kg", label: "Peso" },
  { key: "waist_cm", label: "Cintura" },
  { key: "chest_cm", label: "Peito" },
  { key: "arm_cm", label: "Braço" },
  { key: "hip_cm", label: "Quadril" },
  { key: "thigh_cm", label: "Coxa" },
];

function StudentEvolution({ student, onBack }: { student: Student; onBack: () => void }) {
  const { data, isPending } = useQuery({
    queryKey: ["admin", "evolution", student.id],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("body_measurements")
        .select("*")
        .eq("user_id", student.id)
        .order("measured_at", { ascending: true });
      if (error) throw error;
      const measurements = rows ?? [];
      const paths = measurements.flatMap((row) => (row.photo_path ? [row.photo_path] : []));
      const signed = paths.length
        ? await supabase.storage.from("progress-photos").createSignedUrls(paths, 3600)
        : null;
      const urlByPath = new Map((signed?.data ?? []).map((row) => [row.path, row.signedUrl]));
      return {
        measurements,
        photos: measurements.flatMap((row) => {
          const url = row.photo_path ? urlByPath.get(row.photo_path) : null;
          return url ? [{ row, url }] : [];
        }),
      };
    },
    staleTime: 30 * 60 * 1000,
  });

  const measurements = data?.measurements ?? [];
  const weights = measurements.filter((row) => row.weight_kg !== null);
  const first = weights[0]?.weight_kg ?? null;
  const last = weights[weights.length - 1]?.weight_kg ?? null;
  const delta = first !== null && last !== null && weights.length >= 2 ? last - first : null;
  const min = weights.length ? Math.min(...weights.map((row) => row.weight_kg as number)) : 0;
  const max = weights.length ? Math.max(...weights.map((row) => row.weight_kg as number)) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          aria-label="Voltar para a lista de alunos"
        >
          <ArrowLeft />
        </Button>
        <Avatar student={student} />
        <div className="min-w-0">
          <Link
            to="/admin/alunos/$id"
            params={{ id: student.id }}
            className="block truncate text-sm font-semibold hover:underline"
          >
            {student.full_name || student.email}
          </Link>
          <p className="text-xs text-muted-foreground">
            {measurements.length} {measurements.length === 1 ? "registro" : "registros"}
          </p>
        </div>
      </div>

      {isPending ? (
        <Skeleton className="h-48" />
      ) : measurements.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Este aluno ainda não registrou medições.
        </p>
      ) : (
        <>
          {weights.length > 0 ? (
            <div className="rounded-lg bg-muted/50 p-4">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <p className="font-display text-3xl leading-none tabular-nums">{last} kg</p>
                {delta !== null ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold tabular-nums text-muted-foreground">
                    {delta < 0 ? (
                      <TrendingDown className="h-3.5 w-3.5" />
                    ) : (
                      <TrendingUp className="h-3.5 w-3.5" />
                    )}
                    {delta > 0 ? "+" : ""}
                    {delta.toFixed(1).replace(".", ",")} kg desde o início
                  </span>
                ) : null}
              </div>
              <div className="flex h-14 items-end gap-1" aria-hidden>
                {weights.map((row) => (
                  <div
                    key={row.id}
                    className="flex-1 rounded-t-sm bg-primary"
                    style={{
                      height: `${Math.max((((row.weight_kg as number) - min) / (max - min || 1)) * 100, 8)}%`,
                    }}
                  />
                ))}
              </div>
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="py-2 pr-3 text-left font-medium">Data</th>
                  {MEASURE_COLUMNS.map((column) => (
                    <th key={column.key} className="px-3 py-2 text-right font-medium">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border tabular-nums">
                {[...measurements].reverse().map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap py-2.5 pr-3">{formatDate(row.measured_at)}</td>
                    {MEASURE_COLUMNS.map((column) => (
                      <td key={column.key} className="px-3 py-2.5 text-right">
                        {(row[column.key] as number | null) ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data?.photos.length ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {data.photos.map(({ row, url }) => (
                <figure
                  key={row.id}
                  className="relative overflow-hidden rounded-lg border border-border"
                >
                  <img
                    src={url}
                    alt={`Progresso em ${formatDate(row.measured_at)}`}
                    loading="lazy"
                    decoding="async"
                    className="h-40 w-full object-cover"
                  />
                  <figcaption className="absolute inset-x-0 bottom-0 bg-black/70 px-2 py-1 text-[11px] font-medium text-white">
                    {formatDate(row.measured_at)}
                    {row.weight_kg ? ` · ${row.weight_kg} kg` : ""}
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function EvolutionSection({
  students,
  counts,
}: {
  students: Student[];
  counts: Record<string, number>;
}) {
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const selected = students.find((student) => student.id === selectedId);
  const query = search.trim().toLowerCase();
  const matching = useMemo(
    () =>
      [...students]
        .filter(
          (student) =>
            !query ||
            student.full_name?.toLowerCase().includes(query) ||
            student.email?.toLowerCase().includes(query),
        )
        .sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0)),
    [students, query, counts],
  );

  return (
    <section>
      <SectionTitle
        action={
          !selected ? (
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar aluno"
                aria-label="Buscar aluno"
                className="h-9 pl-8 text-sm"
              />
            </div>
          ) : null
        }
      >
        Evolução dos alunos
      </SectionTitle>
      <Card>
        <CardContent className="p-2 sm:p-3">
          {selected ? (
            <div className="p-2">
              <StudentEvolution student={selected} onBack={() => setSelectedId("")} />
            </div>
          ) : matching.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum aluno encontrado.
            </p>
          ) : (
            <ul className="grid max-h-[22rem] gap-x-2 overflow-y-auto sm:grid-cols-2">
              {matching.map((student) => {
                const count = counts[student.id] ?? 0;
                return (
                  <li key={student.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(student.id)}
                      className="flex min-h-14 w-full items-center gap-3 rounded-md p-2 text-left transition-colors duration-150 hover:bg-secondary"
                    >
                      <Avatar student={student} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {student.full_name || student.email}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {count
                            ? `${count} ${count === 1 ? "medição" : "medições"}`
                            : "Sem medições"}
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

export function AdminDashboardPanel() {
  const queryClient = useQueryClient();
  const studentsQuery = useQuery({ queryKey: adminStudentsKey, queryFn: fetchStudents });
  const dashboardQuery = useQuery({ queryKey: dashboardKey, queryFn: fetchDashboard });
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
  }, [dashboardQuery.dataUpdatedAt]);

  const fetching = studentsQuery.isFetching || dashboardQuery.isFetching;
  function refresh() {
    void queryClient.invalidateQueries({ queryKey: adminStudentsKey });
    void queryClient.invalidateQueries({ queryKey: dashboardKey });
  }

  const error = studentsQuery.error ?? dashboardQuery.error;
  if (error && !(studentsQuery.data && dashboardQuery.data)) {
    return (
      <div className="mx-auto max-w-6xl">
        <ErrorBox message={error.message} onRetry={refresh} />
      </div>
    );
  }

  const students = studentsQuery.data ?? [];
  const purchases = dashboardQuery.data?.purchases ?? [];
  const plans = dashboardQuery.data?.plans ?? [];
  const loading = studentsQuery.isPending || dashboardQuery.isPending;

  const onlyStudents = students.filter((s) => s.role !== "admin" && !isAdminEmail(s.email));
  const expired = onlyStudents.filter(
    (s) => s.access_expires_at && new Date(s.access_expires_at).getTime() <= now,
  );
  const activeStudents = onlyStudents.filter(
    (s) => s.is_active && s.has_class_access && !expired.includes(s),
  );
  const withPlan = new Set(plans.map((plan) => plan.student_id));
  const studentsWithoutPlan = onlyStudents.filter((s) => s.is_active && !withPlan.has(s.id));
  const blocked = onlyStudents.filter((s) => !s.is_active);
  const pendingSales = purchases.filter((p) => p.status === "pending");
  const registeredEmails = new Set(students.map((s) => s.email?.toLowerCase()).filter(Boolean));
  const buyersWithoutLogin = purchases.filter(
    (p) =>
      ["paid", "approved"].includes(p.status) &&
      p.customer_email &&
      !registeredEmails.has(p.customer_email.toLowerCase()),
  );
  const newStudents = onlyStudents.filter(
    (s) => now - new Date(s.created_at).getTime() < 30 * 24 * 60 * 60 * 1000,
  ).length;
  const revenue = purchases
    .filter((p) => ["paid", "approved"].includes(p.status))
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const attention = [
    {
      key: "sem-treino",
      count: studentsWithoutPlan.length,
      text: "sem treino cadastrado",
      cta: "Montar treino",
      link: <Link to="/admin/treinos" className="absolute inset-0" aria-label="Montar treino" />,
    },
    {
      key: "vencidos",
      count: expired.length,
      text: "com o acesso vencido",
      cta: "Ver alunos",
      link: (
        <Link
          to="/admin/alunos"
          search={{ filtro: "expirado" }}
          className="absolute inset-0"
          aria-label="Ver alunos com acesso vencido"
        />
      ),
    },
    {
      key: "bloqueados",
      count: blocked.length,
      text: "com o acesso bloqueado",
      cta: "Ver alunos",
      link: (
        <Link
          to="/admin/alunos"
          search={{ filtro: "bloqueado" }}
          className="absolute inset-0"
          aria-label="Ver alunos bloqueados"
        />
      ),
    },
    {
      key: "sem-login",
      count: buyersWithoutLogin.length,
      text: "comprou e ainda não tem login",
      cta: "Criar acesso",
      link: (
        <Link
          to="/admin/alunos"
          hash="compradores"
          className="absolute inset-0"
          aria-label="Criar acesso para compradores"
        />
      ),
    },
    {
      key: "pendentes",
      count: pendingSales.length,
      text: "aguardando pagamento",
      cta: "Ver vendas",
      link: (
        <Link to="/admin/vendas" className="absolute inset-0" aria-label="Ver vendas pendentes" />
      ),
    },
  ].filter((item) => item.count > 0);
  const pendingTotal = attention.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <AdminPageHeader
        title="Visão geral"
        description={
          loading
            ? "Carregando seus números."
            : pendingTotal
              ? `${pendingTotal} ${pendingTotal === 1 ? "pendência precisa" : "pendências precisam"} da sua atenção.`
              : "Tudo em dia com seus alunos e vendas."
        }
        action={
          <Button variant="outline" onClick={refresh} disabled={fetching} aria-label="Atualizar">
            <RefreshCw className={cn(fetching && "animate-spin")} />{" "}
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
        }
      />

      {loading ? (
        <LoadingBox rows={5} />
      ) : (
        <>
          <Card className="grid overflow-hidden lg:grid-cols-[minmax(0,1.5fr)_minmax(0,2.5fr)]">
            <div className="border-b border-border p-4 sm:p-6 lg:border-b-0 lg:border-r">
              <p className="text-xs font-medium text-muted-foreground">Alunos ativos</p>
              <p className="mt-1 font-display text-6xl leading-none tabular-nums">
                {activeStudents.length}
                <span className="pl-2 text-2xl text-muted-foreground">
                  de {onlyStudents.length}
                </span>
              </p>
              <LoadBar
                total={onlyStudents.length}
                done={activeStudents.length}
                maxSegments={30}
                label="Alunos ativos"
                className="mt-4 h-2.5"
              />
            </div>
            <div className="grid grid-cols-2 [&>*:nth-child(even)]:border-l [&>*:nth-child(n+3)]:border-t">
              <Stat label="Receita aprovada" value={formatCurrency(revenue)} />
              <Stat label="Novos em 30 dias" value={newStudents} />
              <Stat label="Treinos cadastrados" value={plans.length} />
              <Stat
                label="Acessos vencidos"
                value={expired.length}
                tone={expired.length ? "danger" : undefined}
              />
            </div>
          </Card>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <section>
              <SectionTitle>O que fazer agora</SectionTitle>
              <Card>
                {attention.length === 0 ? (
                  <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-5 w-5 text-success" /> Nenhuma pendência no momento.
                  </CardContent>
                ) : (
                  <ul className="divide-y divide-border">
                    {attention.map((item) => (
                      <li
                        key={item.key}
                        className="relative flex min-h-16 items-center gap-4 px-4 py-3 transition-colors duration-150 hover:bg-secondary sm:px-5"
                      >
                        <span className="w-9 shrink-0 text-center font-display text-3xl leading-none tabular-nums text-foreground">
                          {item.count}
                        </span>
                        <span className="min-w-0 flex-1 text-sm">
                          {item.count === 1 ? "aluno" : "alunos"} {item.text}
                        </span>
                        <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-muted-foreground">
                          <span className="hidden sm:inline">{item.cta}</span>{" "}
                          <ChevronRight className="h-4 w-4" />
                        </span>
                        {item.link}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </section>

            <section>
              <SectionTitle
                action={
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/admin/vendas">Ver todas</Link>
                  </Button>
                }
              >
                Vendas recentes
              </SectionTitle>
              <Card>
                {purchases.length === 0 ? (
                  <CardContent className="p-6 text-sm text-muted-foreground">
                    As vendas aparecerão aqui.
                  </CardContent>
                ) : (
                  <ul className="divide-y divide-border">
                    {purchases.slice(0, 5).map((purchase) => (
                      <li
                        key={purchase.id}
                        className="flex items-center justify-between gap-3 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {purchase.customer_name || purchase.customer_email || "Sem cliente"}
                          </p>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {formatDate(purchase.created_at)}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold tabular-nums">
                            {formatCurrency(purchase.amount)}
                          </p>
                          <StatusPill
                            tone={
                              ["paid", "approved"].includes(purchase.status)
                                ? "green"
                                : purchase.status === "pending"
                                  ? "amber"
                                  : "red"
                            }
                            className="mt-0.5 border-0 bg-transparent px-0 py-0"
                          >
                            {purchaseStatusLabels[purchase.status] ?? purchase.status}
                          </StatusPill>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </section>
          </div>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
            <section>
              <SectionTitle
                action={
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/admin/alunos">Ver todos</Link>
                  </Button>
                }
              >
                Alunos recentes
              </SectionTitle>
              <Card>
                {onlyStudents.length === 0 ? (
                  <CardContent className="p-6 text-sm text-muted-foreground">
                    Cadastre alunos para começar.
                  </CardContent>
                ) : (
                  <ul className="divide-y divide-border">
                    {onlyStudents.slice(0, 5).map((student) => (
                      <li
                        key={student.id}
                        className="relative flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-secondary"
                      >
                        <Avatar student={student} />
                        <div className="min-w-0 flex-1">
                          <Link
                            to="/admin/alunos/$id"
                            params={{ id: student.id }}
                            className="block truncate text-sm font-medium after:absolute after:inset-0"
                          >
                            {student.full_name || student.email}
                          </Link>
                          <p className="truncate text-xs text-muted-foreground">{student.email}</p>
                        </div>
                        <StatusPill
                          tone={student.is_active ? "green" : "red"}
                          className="border-0 bg-transparent px-0"
                        >
                          {student.is_active ? "Ativo" : "Bloqueado"}
                        </StatusPill>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </section>

            <EvolutionSection
              students={onlyStudents}
              counts={dashboardQuery.data?.measurementCount ?? {}}
            />
          </div>
        </>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/hooks/use-auth";
import type { Tables } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Flame, AlertTriangle } from "lucide-react";

type Checkin = Tables<"checkins">;
type Student = Tables<"profiles"> & { role: AppRole | null };

function localDateISO(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

export function AdminEngagementPanel() {
  const [students, setStudents] = useState<Student[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const from = shiftDate(localDateISO(), -29);
      const [{ data: profiles }, { data: roles }, { data: checkinRows }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("checkins").select("*").gte("checkin_date", from),
      ]);
      if (cancelled) return;
      const roleByUser = new Map((roles ?? []).map((r) => [r.user_id, r.role as AppRole]));
      setStudents((profiles ?? []).map((p) => ({ ...p, role: roleByUser.get(p.id) ?? null })));
      setCheckins(checkinRows ?? []);
      setLoading(false);
    })().catch((e) => {
      setLoading(false);
      toast.error("Erro ao carregar engajamento", { description: e.message });
    });
    return () => { cancelled = true; };
  }, []);

  const stats = useMemo(() => {
    const today = localDateISO();
    const byUser = new Map<string, Set<string>>();
    const lastByUser = new Map<string, string>();
    for (const c of checkins) {
      const set = byUser.get(c.user_id) ?? new Set<string>();
      set.add(c.checkin_date);
      byUser.set(c.user_id, set);
      const prev = lastByUser.get(c.user_id);
      if (!prev || c.checkin_date > prev) lastByUser.set(c.user_id, c.checkin_date);
    }
    const rows = students
      .filter((s) => s.role !== "admin")
      .map((s) => {
        const dates = byUser.get(s.id) ?? new Set<string>();
        let streak = 0;
        let day = dates.has(today) ? today : shiftDate(today, -1);
        while (dates.has(day)) {
          streak++;
          day = shiftDate(day, -1);
        }
        const last = lastByUser.get(s.id) ?? null;
        const daysSince = last ? Math.round((Date.now() - new Date(`${last}T12:00:00`).getTime()) / 86400000) : Infinity;
        const doneCount = dates.size;
        const completion = Math.min(100, Math.round((doneCount / 30) * 100));
        return { student: s, streak, last, daysSince, doneCount, completion };
      });
    rows.sort((a, b) => b.streak - a.streak || b.doneCount - a.doneCount);
    return rows;
  }, [students, checkins]);

  const activeToday = stats.filter((r) => r.last === localDateISO()).length;
  const atRisk = stats.filter((r) => r.daysSince >= 7).length;

  if (loading) return <Skeleton className="h-80" />;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h2 className="font-display text-2xl tracking-wide">Engajamento</h2>
          <p className="text-sm text-muted-foreground">Quem está treinando com consistência e quem precisa de atenção.</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="gap-1"><Flame className="h-3 w-3" /> {activeToday} check-in hoje</Badge>
          <Badge variant="secondary" className="gap-1 text-amber-500"><AlertTriangle className="h-3 w-3" /> {atRisk} sem contato há 7+ dias</Badge>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aluno</TableHead>
                <TableHead>Streak</TableHead>
                <TableHead>Último check-in</TableHead>
                <TableHead>Consistência (30d)</TableHead>
                <TableHead>Situação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum aluno com check-ins registrados.</TableCell></TableRow>
              ) : stats.map(({ student, streak, last, daysSince, completion }) => (
                <TableRow key={student.id}>
                  <TableCell>
                    <p className="font-medium">{student.full_name || student.email}</p>
                    <p className="text-xs text-muted-foreground">{student.email}</p>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-3 py-1 text-sm font-bold text-orange-500">
                      <Flame className="h-3.5 w-3.5" /> {streak}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{last ? formatDate(`${last}T12:00:00`) : "Nunca"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${completion}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground">{completion}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {daysSince >= 7 ? (
                      <Badge className="bg-amber-500/15 text-amber-500 gap-1"><AlertTriangle className="h-3 w-3" /> Precisando de contato</Badge>
                    ) : daysSince >= 3 ? (
                      <Badge variant="secondary">Alguns dias sem check-in</Badge>
                    ) : (
                      <Badge className="bg-emerald-500/15 text-emerald-500">Em dia</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground mt-3">
        Consistência = % de dias com check-in nos últimos 30 dias. Streak considera a sequência até hoje/ontem.
      </p>
    </div>
  );
}

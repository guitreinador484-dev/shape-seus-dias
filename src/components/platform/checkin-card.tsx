import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Apple, Check, CheckCircle2, Dumbbell, Flame, Loader2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

type Checkin = Tables<"checkins">;

const MOODS = [
  { value: 1, emoji: "😞", label: "Muito mal" },
  { value: 2, emoji: "😕", label: "Mal" },
  { value: 3, emoji: "😐", label: "Normal" },
  { value: 4, emoji: "🙂", label: "Bem" },
  { value: 5, emoji: "🔥", label: "Muito bem" },
];

function localDateISO(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function ToggleRow({ checked, onChange, icon: Icon, label }: { checked: boolean; onChange: () => void; icon: typeof Dumbbell; label: string }) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={onChange}
      className={cn(
        "flex min-h-12 items-center gap-3 rounded-lg border px-3 text-left text-sm font-medium transition-colors duration-150",
        checked ? "border-primary/50 bg-primary/10 text-foreground" : "border-input text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{label}</span>
      <span className={cn("grid h-5 w-5 place-items-center rounded border", checked ? "border-primary bg-primary text-primary-foreground" : "border-input")}>
        {checked ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
      </span>
    </button>
  );
}

export function CheckinCard({ userId }: { userId: string }) {
  const [rows, setRows] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const today = localDateISO();

  const todayRow = useMemo(() => rows.find((r) => r.checkin_date === today), [rows, today]);

  const [treinoDone, setTreinoDone] = useState(false);
  const [dietDone, setDietDone] = useState(false);
  const [mood, setMood] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const from = shiftDate(today, -29);
      const { data } = await supabase.from("checkins").select("*").eq("user_id", userId).gte("checkin_date", from);
      if (cancelled) return;
      setRows(data ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (todayRow) {
      setTreinoDone(todayRow.treino_done);
      setDietDone(todayRow.diet_done);
      setMood(todayRow.mood);
      setNotes(todayRow.notes ?? "");
    }
  }, [todayRow?.id]);

  const dates = useMemo(() => new Set(rows.map((r) => r.checkin_date)), [rows]);

  const streak = useMemo(() => {
    let count = 0;
    let day = dates.has(today) ? today : shiftDate(today, -1);
    while (dates.has(day)) {
      count++;
      day = shiftDate(day, -1);
    }
    return count;
  }, [dates, today]);

  const last7 = useMemo(() => Array.from({ length: 7 }, (_, i) => shiftDate(today, i - 6)), [today]);

  async function save() {
    setSaving(true);
    try {
      const { error } = await supabase.from("checkins").upsert(
        { user_id: userId, checkin_date: today, treino_done: treinoDone, diet_done: dietDone, mood, notes: notes || null },
        { onConflict: "user_id,checkin_date" },
      );
      if (error) throw error;
      toast.success("Check-in registrado");
      const from = shiftDate(today, -29);
      const { data } = await supabase.from("checkins").select("*").eq("user_id", userId).gte("checkin_date", from);
      setRows(data ?? []);
      setEditing(false);
    } catch (e) {
      toast.error("Erro ao registrar", { description: e instanceof Error ? e.message : "Tente novamente." });
    } finally {
      setSaving(false);
    }
  }

  const showForm = !todayRow || editing;

  return (
    <Card id="checkin-section" className="scroll-mt-20">
      <CardContent className="space-y-4 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-display text-2xl leading-none">
            {todayRow ? <CheckCircle2 className="h-5 w-5 text-success" /> : null} Check-in de hoje
          </h3>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold tabular-nums">
            <Flame className={cn("h-4 w-4", streak > 0 ? "text-primary" : "text-muted-foreground")} />
            {streak} {streak === 1 ? "dia" : "dias"}
          </span>
        </div>

        {loading ? (
          <Skeleton className="h-14" />
        ) : (
          <>
            <div className="grid grid-cols-7 gap-1 sm:gap-2" aria-label="Últimos 7 dias">
              {last7.map((d) => {
                const done = dates.has(d);
                const isToday = d === today;
                const date = new Date(`${d}T12:00:00`);
                return (
                  <div key={d} className="flex flex-col items-center gap-1">
                    <span className="text-[10px] uppercase text-muted-foreground">
                      {date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}
                    </span>
                    <span
                      aria-label={`${date.toLocaleDateString("pt-BR")}${done ? ", check-in feito" : ""}`}
                      className={cn(
                        "grid h-9 w-full place-items-center rounded-md text-xs font-semibold tabular-nums",
                        done ? "bg-primary text-primary-foreground" : isToday ? "border border-dashed border-input text-foreground" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {date.getDate()}
                    </span>
                  </div>
                );
              })}
            </div>

            {showForm ? (
              <div className="space-y-4">
                <div className="grid gap-2 sm:grid-cols-2">
                  <ToggleRow checked={treinoDone} onChange={() => setTreinoDone(!treinoDone)} icon={Dumbbell} label="Fiz meu treino" />
                  <ToggleRow checked={dietDone} onChange={() => setDietDone(!dietDone)} icon={Apple} label="Segui minha dieta" />
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Como você está se sentindo?</p>
                  <div className="grid grid-cols-5 gap-2">
                    {MOODS.map((m) => (
                      <button
                        type="button"
                        key={m.value}
                        aria-label={m.label}
                        aria-pressed={mood === m.value}
                        onClick={() => setMood(mood === m.value ? null : m.value)}
                        className={cn(
                          "h-12 rounded-lg border text-xl transition-colors duration-150",
                          mood === m.value ? "border-primary bg-primary/15" : "border-input hover:bg-secondary",
                        )}
                      >
                        {m.emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observações do dia (opcional)" aria-label="Observações do dia" />

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  {editing ? <Button variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button> : null}
                  <Button className="h-11 sm:min-w-44" onClick={save} disabled={saving}>
                    {saving ? <Loader2 className="animate-spin" /> : null} {todayRow ? "Salvar alterações" : "Salvar check-in"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                <p className="text-sm text-muted-foreground">
                  {[todayRow?.treino_done ? "Treino feito" : null, todayRow?.diet_done ? "Dieta seguida" : null, MOODS.find((m) => m.value === todayRow?.mood)?.emoji].filter(Boolean).join(" · ") || "Check-in registrado"}
                </p>
                <Button variant="ghost" size="sm" onClick={() => setEditing(true)}><Pencil /> Editar</Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

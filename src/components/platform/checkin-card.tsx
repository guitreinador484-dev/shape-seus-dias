import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Flame } from "lucide-react";

type Checkin = Tables<"checkins">;

const MOODS = [
  { value: 1, emoji: "😞" },
  { value: 2, emoji: "😕" },
  { value: 3, emoji: "😐" },
  { value: 4, emoji: "🙂" },
  { value: 5, emoji: "🔥" },
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

export function CheckinCard({ userId }: { userId: string }) {
  const [rows, setRows] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    } catch (e) {
      toast.error("Erro ao registrar", { description: e instanceof Error ? e.message : "Tente novamente." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="font-display text-xl flex items-center gap-2">
            Check-in de hoje
          </h3>
          <div className="flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5">
            <Flame className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-bold text-orange-500">{streak} dias seguidos</span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                onClick={() => setTreinoDone(!treinoDone)}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition ${
                  treinoDone ? "border-primary/50 bg-primary/10 text-primary" : "border-border/60 bg-muted/40 hover:border-primary/30"
                }`}
              >
                <span>🏋️ Fiz meu treino hoje</span>
                <span className="text-lg">{treinoDone ? "✅" : "⬜"}</span>
              </button>
              <button
                onClick={() => setDietDone(!dietDone)}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition ${
                  dietDone ? "border-primary/50 bg-primary/10 text-primary" : "border-border/60 bg-muted/40 hover:border-primary/30"
                }`}
              >
                <span>🥗 Segui minha dieta</span>
                <span className="text-lg">{dietDone ? "✅" : "⬜"}</span>
              </button>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Como você está se sentindo hoje?</p>
              <div className="flex gap-2">
                {MOODS.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setMood(mood === m.value ? null : m.value)}
                    className={`grid h-11 w-11 place-items-center rounded-xl border text-xl transition ${
                      mood === m.value ? "border-primary/60 bg-primary/10 scale-110" : "border-border/60 bg-muted/40 hover:border-primary/30"
                    }`}
                    title={`Humor ${m.value}/5`}
                  >
                    {m.emoji}
                  </button>
                ))}
              </div>
            </div>

            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observações do dia (opcional)" />

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                {last7.map((d) => {
                  const done = dates.has(d);
                  const isToday = d === today;
                  return (
                    <div key={d} className="flex flex-col items-center gap-1">
                      <div
                        className={`h-8 w-8 rounded-lg grid place-items-center text-xs font-bold ${
                          done
                            ? "bg-primary text-primary-foreground"
                            : isToday
                            ? "border border-dashed border-primary/40 text-muted-foreground"
                            : "bg-muted/40 text-muted-foreground/40"
                        }`}
                      >
                        {new Date(`${d}T12:00:00`).getDate()}
                      </div>
                      <span className="text-[9px] uppercase text-muted-foreground/50">
                        {new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}
                      </span>
                    </div>
                  );
                })}
              </div>
              <Button onClick={save} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Salvar check-in
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

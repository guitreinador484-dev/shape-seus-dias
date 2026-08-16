import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Loader2, Plus, Trash2, TrendingDown, TrendingUp, ImageIcon, Upload, X } from "lucide-react";
type Measurement = Tables<"body_measurements">;

const FIELDS: { key: "weight_kg" | "waist_cm" | "chest_cm" | "arm_cm" | "hip_cm" | "thigh_cm"; label: string; suffix: string }[] = [
  { key: "weight_kg", label: "Peso", suffix: "kg" },
  { key: "waist_cm", label: "Cintura", suffix: "cm" },
  { key: "chest_cm", label: "Peitoral", suffix: "cm" },
  { key: "arm_cm", label: "Braço", suffix: "cm" },
  { key: "hip_cm", label: "Quadril", suffix: "cm" },
  { key: "thigh_cm", label: "Coxa", suffix: "cm" },
];

function fmt(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

export function EvolutionTab({ userId }: { userId: string }) {
  const [rows, setRows] = useState<Measurement[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [photo, setPhoto] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    const { data } = await supabase
      .from("body_measurements")
      .select("*")
      .eq("user_id", userId)
      .order("measured_at", { ascending: true });
    const rows = data ?? [];
    setRows(rows);
    const photoRows = rows.filter((r) => r.photo_path);
    if (photoRows.length) {
      const entries = await Promise.all(photoRows.map(async (r) => {
        const { data: url } = await supabase.storage.from("progress-photos").createSignedUrl(r.photo_path!, 3600);
        return [r.id, url?.signedUrl ?? ""] as const;
      }));
      setSignedUrls(Object.fromEntries(entries));
    }
    setLoading(false);
  }

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [userId]);

  async function add() {
    setSaving(true);
    try {
      const payload: Record<string, string | number | null> = {};
      for (const f of FIELDS) {
        const v = parseFloat(form[f.key] ?? "");
        payload[f.key] = Number.isFinite(v) ? v : null;
      }
      let photoPath: string | null = null;
      if (photo) {
        const ext = photo.name.split(".").pop() ?? "jpg";
        const path = `${userId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("progress-photos").upload(path, photo, { upsert: false });
        if (error) throw error;
        photoPath = path;
      }
      const { error } = await supabase.from("body_measurements").insert({
        user_id: userId,
        measured_at: new Date().toISOString(),
        ...payload,
        photo_path: photoPath,
        notes: null,
      });
      if (error) throw error;
      toast.success("Evolução registrada");
      setForm({});
      setPhoto(null);
      if (fileRef.current) fileRef.current.value = "";
      await load();
    } catch (e) {
      toast.error("Erro ao registrar", { description: e instanceof Error ? e.message : "Tente novamente." });
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!confirm("Excluir este registro de evolução?")) return;
    if (row?.photo_path) {
      await supabase.storage.from("progress-photos").remove([row.photo_path]);
    }
    const { error } = await supabase.from("body_measurements").delete().eq("id", id);
    if (error) toast.error("Erro ao excluir", { description: error.message });
    else await load();
  }

  const chartData = rows.map((r) => ({ date: fmt(r.measured_at), peso: r.weight_kg ?? null, cintura: r.waist_cm ?? null }));
  const first = rows[0]?.weight_kg ?? null;
  const last = rows[rows.length - 1]?.weight_kg ?? null;
  const delta = first !== null && last !== null ? last - first : null;

  if (loading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-6">
      {delta !== null && delta !== 0 && (
        <Card><CardContent className="pt-6 flex items-center gap-3">
          {delta < 0 ? <TrendingDown className="h-8 w-8 text-emerald-500" /> : <TrendingUp className="h-8 w-8 text-red-500" />}
          <div>
            <p className="text-sm text-muted-foreground">Variação total de peso</p>
            <p className={`font-display text-2xl ${delta < 0 ? "text-emerald-500" : "text-red-500"}`}>
              {delta > 0 ? "+" : ""}{delta.toFixed(1)} kg
            </p>
          </div>
        </CardContent></Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <h3 className="font-display text-xl mb-4">Peso ao longo do tempo</h3>
          {chartData.length < 2 ? (
            <p className="text-sm text-muted-foreground">Registre pelo menos 2 medições para ver o gráfico.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={11} />
                  <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} domain={["auto", "auto"]} />
                  <Tooltip contentStyle={{ background: "rgba(0,0,0,0.85)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, fontSize: 12 }} />
                  <Legend />
                  <Line type="monotone" dataKey="peso" name="Peso (kg)" stroke="#7C5CFF" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  {chartData.some((d) => d.cintura !== null) && (
                    <Line type="monotone" dataKey="cintura" name="Cintura (cm)" stroke="#38bdf8" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="font-display text-xl mb-4">Registrar nova medição</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FIELDS.map((f) => (
              <div key={f.key} className="space-y-1">
                <Label>{f.label} ({f.suffix})</Label>
                <Input type="number" value={form[f.key] ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))} placeholder="0.0" />
              </div>
            ))}
            <div className="space-y-1 sm:col-span-2 lg:col-span-3">
              <Label>Foto de progresso (opcional)</Label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              />
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-4 w-4" /> {photo ? "Trocar foto" : "Enviar foto"}
                </Button>
                {photo && (
                  <>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">{photo.name}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setPhoto(null);
                        if (fileRef.current) fileRef.current.value = "";
                      }}
                    >
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={add} disabled={saving || Object.values(form).every((v) => !v && v !== "0")}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Registrar
            </Button>
          </div>
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-display text-xl mb-4">Histórico</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[...rows].reverse().map((r) => (
                <div key={r.id} className="rounded-2xl border border-border/60 bg-muted/40 p-4 flex flex-col gap-3">
                  {signedUrls[r.id] ? (
                    <img src={signedUrls[r.id]} alt={`Evolução ${fmt(r.measured_at)}`} className="h-36 w-full rounded-xl object-cover" />
                  ) : (
                    <div className="h-36 w-full rounded-xl bg-muted grid place-items-center"><ImageIcon className="h-8 w-8 text-muted-foreground/50" /></div>
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{fmt(r.measured_at)}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-1">
                        {r.weight_kg !== null && <span>Peso: {r.weight_kg} kg</span>}
                        {r.waist_cm !== null && <span>Cintura: {r.waist_cm} cm</span>}
                        {r.chest_cm !== null && <span>Peito: {r.chest_cm} cm</span>}
                        {r.arm_cm !== null && <span>Braço: {r.arm_cm} cm</span>}
                        {r.hip_cm !== null && <span>Quadril: {r.hip_cm} cm</span>}
                        {r.thigh_cm !== null && <span>Coxa: {r.thigh_cm} cm</span>}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

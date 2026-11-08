import { useEffect, useMemo, useRef, useState } from "react";
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
import { ConfirmDialog } from "@/components/admin/ui-kit";
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
  const [removing, setRemoving] = useState<string | null>(null);
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
      const { data: urls } = await supabase.storage.from("progress-photos").createSignedUrls(photoRows.map((r) => r.photo_path!), 3600);
      const urlByPath = new Map((urls ?? []).map((u) => [u.path, u.signedUrl]));
      setSignedUrls(Object.fromEntries(photoRows.map((r) => [r.id, urlByPath.get(r.photo_path!) ?? ""])));
    }
    setLoading(false);
  }

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [userId]);

  const photoPreview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview); }, [photoPreview]);

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
        <Card><CardContent className="flex items-center gap-3 p-4 sm:p-6">
          {delta < 0 ? <TrendingDown className="h-6 w-6 text-muted-foreground" /> : <TrendingUp className="h-6 w-6 text-muted-foreground" />}
          <div>
            <p className="text-xs font-medium text-muted-foreground">Variação total de peso</p>
            <p className="font-display text-4xl leading-none tabular-nums">
              {delta > 0 ? "+" : ""}{delta.toFixed(1).replace(".", ",")} kg
            </p>
          </div>
        </CardContent></Card>
      )}

      <Card>
        <CardContent className="p-4 sm:p-6">
          <h3 className="mb-4 font-display text-2xl leading-none">Peso ao longo do tempo</h3>
          {chartData.length < 2 ? (
            <p className="text-sm text-muted-foreground">Registre pelo menos 2 medições para ver o gráfico.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} domain={["auto", "auto"]} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--input)", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="peso" name="Peso (kg)" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} connectNulls />
                  {chartData.some((d) => d.cintura !== null) && (
                    <Line type="monotone" dataKey="cintura" name="Cintura (cm)" stroke="var(--chart-2)" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} connectNulls />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <h3 className="mb-4 font-display text-2xl leading-none">Registrar nova medição</h3>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {FIELDS.map((f) => (
              <div key={f.key} className="space-y-1">
                <Label>{f.label} ({f.suffix})</Label>
                <Input type="number" inputMode="decimal" step="0.1" value={form[f.key] ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))} placeholder="0,0" />
              </div>
            ))}
            <div className="col-span-2 space-y-2 lg:col-span-3">
              <Label>Foto de progresso (opcional)</Label>
              <Input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
              {photo ? (
                <div className="relative inline-block">
                  <img src={photoPreview ?? undefined} alt="Prévia da foto" className="h-32 w-32 rounded-lg border border-border object-cover" />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -right-3 -top-3 h-9 w-9 rounded-full sm:h-9 sm:w-9"
                    aria-label="Remover foto"
                    onClick={() => { setPhoto(null); if (fileRef.current) fileRef.current.value = ""; }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="h-32 w-full sm:w-64 border-dashed"
                  onClick={() => fileRef.current?.click()}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Selecionar foto</span>
                  </div>
                </Button>
              )}
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
          <CardContent className="p-4 sm:p-6">
            <h3 className="mb-4 font-display text-2xl leading-none">Histórico</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[...rows].reverse().map((r) => (
                <div key={r.id} className="flex flex-col gap-3 rounded-lg border border-border p-3">
                  {signedUrls[r.id] ? (
                    <img loading="lazy" decoding="async" src={signedUrls[r.id]} alt={`Evolução ${fmt(r.measured_at)}`} className="h-36 w-full rounded-md object-cover" />
                  ) : (
                    <div className="grid h-36 w-full place-items-center rounded-md bg-muted"><ImageIcon className="h-8 w-8 text-muted-foreground/50" /></div>
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
                    <Button variant="ghost" size="icon" aria-label={`Excluir registro de ${fmt(r.measured_at)}`} onClick={() => setRemoving(r.id)}><Trash2 className="text-muted-foreground" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => { if (!open) setRemoving(null); }}
        title="Excluir este registro?"
        description="A medição e a foto, se houver, serão apagadas do seu histórico."
        confirmLabel="Excluir registro"
        destructive
        onConfirm={() => { if (removing) void remove(removing); setRemoving(null); }}
      />
    </div>
  );
}

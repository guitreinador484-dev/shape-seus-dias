import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { formatDate, type Student } from "@/lib/admin-data";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type BodyMeasurement } from "./shared";

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
      <DialogContent className="max-h-[90vh] w-[calc(100%-1.5rem)] max-w-3xl overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle>Evolução — {student.full_name || student.email}</DialogTitle>
          <DialogDescription>Medidas e fotos de progresso registradas pelo aluno.</DialogDescription>
        </DialogHeader>
        {loading ? <Skeleton className="h-48" /> : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma medição registrada ainda.</p>
        ) : (
          <div className="space-y-4">
            <Table className="min-w-[680px]">
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
      <DialogContent className="max-h-[90vh] w-[calc(100%-1.5rem)] max-w-2xl overflow-y-auto sm:w-full">
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

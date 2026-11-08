import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { AppRole } from "@/hooks/use-auth";

export type Student = Tables<"profiles"> & { role: AppRole | null };

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
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(value),
  );
}

export function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(value ?? 0),
  );
}

export async function fetchStudents(): Promise<Student[]> {
  const [{ data: profiles, error: profilesError }, { data: roles, error: rolesError }] =
    await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
  if (profilesError) throw profilesError;
  if (rolesError) throw rolesError;
  const roleByUser = new Map((roles ?? []).map((role) => [role.user_id, role.role as AppRole]));
  return (profiles ?? []).map((profile) => ({
    ...profile,
    role: roleByUser.get(profile.id) ?? null,
  }));
}

/** Compartilhada entre dashboard, lista de alunos e busca rápida. */
export const adminStudentsKey = ["admin", "students"] as const;
export const adminStudentsQuery = { queryKey: adminStudentsKey, queryFn: fetchStudents };

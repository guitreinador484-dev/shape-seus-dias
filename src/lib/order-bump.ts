import { supabase } from "@/integrations/supabase/client";

export type OrderBumpConfig = {
  enabled: boolean;
  title: string;
  description: string;
  price: number;
};

export const DEFAULT_ORDER_BUMP: OrderBumpConfig = {
  enabled: true,
  title: "Acompanhamento completo",
  description: "Libere a aba de Dieta e todas as Aulas em vídeo dentro da plataforma.",
  price: 19.9,
};

export const ORDER_BUMP_SECTION = "order_bump";

export function parseOrderBump(content: unknown): OrderBumpConfig {
  const raw = (content ?? {}) as Partial<OrderBumpConfig>;
  return {
    enabled: typeof raw.enabled === "boolean" ? raw.enabled : DEFAULT_ORDER_BUMP.enabled,
    title: typeof raw.title === "string" && raw.title.trim() ? raw.title : DEFAULT_ORDER_BUMP.title,
    description:
      typeof raw.description === "string" && raw.description.trim()
        ? raw.description
        : DEFAULT_ORDER_BUMP.description,
    price: Number.isFinite(Number(raw.price)) && Number(raw.price) > 0 ? Number(raw.price) : DEFAULT_ORDER_BUMP.price,
  };
}

export async function loadOrderBump(): Promise<OrderBumpConfig> {
  const { data } = await supabase
    .from("quiz_config")
    .select("content")
    .eq("section", ORDER_BUMP_SECTION)
    .order("updated_at", { ascending: false })
    .limit(1);
  const row = data?.[0];
  return parseOrderBump(row?.content);
}

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

import { supabase } from "@/integrations/supabase/client";

export type OrderBumpConfig = {
  id: string;
  enabled: boolean;
  title: string;
  description: string;
  price: number;
};

export const DEFAULT_ORDER_BUMP: OrderBumpConfig = {
  id: "bump-1",
  enabled: true,
  title: "Acompanhamento completo",
  description: "Libere a aba de Dieta e todas as Aulas em vídeo dentro da plataforma.",
  price: 19.9,
};

export const ORDER_BUMP_SECTION = "order_bump";

function parseOne(raw: Partial<OrderBumpConfig>, index: number): OrderBumpConfig {
  return {
    id: typeof raw.id === "string" && raw.id.trim() ? raw.id : `bump-${index + 1}`,
    enabled: typeof raw.enabled === "boolean" ? raw.enabled : true,
    title: typeof raw.title === "string" && raw.title.trim() ? raw.title : DEFAULT_ORDER_BUMP.title,
    description:
      typeof raw.description === "string" && raw.description.trim()
        ? raw.description
        : DEFAULT_ORDER_BUMP.description,
    price:
      Number.isFinite(Number(raw.price)) && Number(raw.price) > 0
        ? Number(raw.price)
        : DEFAULT_ORDER_BUMP.price,
  };
}

/** Retrocompatível: aceita `{items: [...]}`, um array puro ou o formato antigo (objeto único). */
export function parseOrderBumps(content: unknown): OrderBumpConfig[] {
  if (!content) return [DEFAULT_ORDER_BUMP];
  const raw = content as { items?: unknown };
  const list = Array.isArray(content) ? content : Array.isArray(raw.items) ? raw.items : null;
  if (list) {
    const parsed = list
      .filter((item): item is Partial<OrderBumpConfig> => Boolean(item) && typeof item === "object")
      .map((item, i) => parseOne(item, i));
    return parsed;
  }
  return [parseOne(content as Partial<OrderBumpConfig>, 0)];
}

/** Compat: primeira oferta configurada. */
export function parseOrderBump(content: unknown): OrderBumpConfig {
  return parseOrderBumps(content)[0] ?? DEFAULT_ORDER_BUMP;
}

export async function loadOrderBumps(): Promise<OrderBumpConfig[]> {
  const { data } = await supabase
    .from("quiz_config")
    .select("content")
    .eq("section", ORDER_BUMP_SECTION)
    .order("updated_at", { ascending: false })
    .limit(1);
  return parseOrderBumps(data?.[0]?.content);
}

export async function loadOrderBump(): Promise<OrderBumpConfig> {
  return (await loadOrderBumps())[0] ?? DEFAULT_ORDER_BUMP;
}

export async function saveOrderBumps(items: OrderBumpConfig[]): Promise<void> {
  const { data: existing } = await supabase
    .from("quiz_config")
    .select("id")
    .eq("section", ORDER_BUMP_SECTION)
    .limit(1);
  const payload = {
    section: ORDER_BUMP_SECTION,
    content: { items } as unknown as never,
  };
  const { error } = existing?.[0]
    ? await supabase.from("quiz_config").update(payload).eq("id", existing[0].id)
    : await supabase.from("quiz_config").insert(payload);
  if (error) throw new Error(error.message);
}

export function newOrderBump(): OrderBumpConfig {
  return {
    id: crypto.randomUUID(),
    enabled: true,
    title: "Nova oferta",
    description: "Descreva o que o aluno recebe ao adicionar essa oferta.",
    price: 19.9,
  };
}

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

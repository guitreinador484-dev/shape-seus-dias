import { useEffect, useState } from "react";
import { MessageSquareText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { AdminPageHeader, EmptyBox, LoadingBox, StatusPill } from "@/components/admin/ui-kit";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Feedback = Tables<"feedbacks"> & { profiles: { full_name: string | null; email: string } | null };
const types: Record<string, string> = { sugestao: "Sugestão", critica: "Crítica", elogio: "Elogio", outro: "Outro" };

export function FeedbackPanel() {
  const [items, setItems] = useState<Feedback[]>([]);
  const [filter, setFilter] = useState("todos");
  const [loading, setLoading] = useState(true);
  async function load() { const { data, error } = await supabase.from("feedbacks").select("*, profiles(full_name,email)").order("created_at", { ascending: false }); if (error) throw error; setItems((data ?? []) as Feedback[]); }
  useEffect(() => { load().catch((error) => toast.error("Não foi possível carregar os feedbacks.", { description: error.message })).finally(() => setLoading(false)); }, []);
  async function setStatus(id: string, status: string) { const { error } = await supabase.from("feedbacks").update({ status }).eq("id", id); if (error) toast.error("Não foi possível atualizar."); else { toast.success("Feedback atualizado."); await load(); } }
  const visible = filter === "todos" ? items : items.filter((item) => item.status === filter);
  return <div className="mx-auto max-w-6xl"><AdminPageHeader title="Críticas e sugestões" description="Veja o que as clientes estão dizendo e acompanhe cada retorno."><Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos</SelectItem><SelectItem value="novo">Novos</SelectItem><SelectItem value="lido">Lidos</SelectItem><SelectItem value="resolvido">Resolvidos</SelectItem></SelectContent></Select></AdminPageHeader>{loading ? <LoadingBox rows={5} /> : visible.length === 0 ? <EmptyBox title="Nenhum feedback aqui" description="Quando uma cliente enviar uma mensagem, ela aparecerá nesta lista." /> : <div className="grid gap-3">{visible.map((item) => <article key={item.id} className="rounded-xl border border-border bg-card p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><MessageSquareText className="h-4 w-4 text-primary" /><p className="font-semibold">{item.profiles?.full_name || "Cliente"}</p><StatusPill tone={item.status === "novo" ? "blue" : item.status === "resolvido" ? "green" : "gray"}>{item.status === "novo" ? "Novo" : item.status === "lido" ? "Lido" : "Resolvido"}</StatusPill></div><p className="mt-1 text-xs text-muted-foreground">{item.profiles?.email} · {types[item.feedback_type] ?? item.feedback_type} · {new Date(item.created_at).toLocaleDateString("pt-BR")}</p><p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{item.message}</p></div><div className="flex shrink-0 gap-2">{item.status === "novo" ? <Button size="sm" variant="outline" onClick={() => void setStatus(item.id, "lido")}>Marcar como lido</Button> : null}{item.status !== "resolvido" ? <Button size="sm" onClick={() => void setStatus(item.id, "resolvido")}>Resolver</Button> : null}</div></div></article>)}</div>}</div>;
}
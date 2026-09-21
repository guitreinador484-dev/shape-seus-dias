import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, MessageSquareText, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Feedback = Tables<"feedbacks">;

const typeLabels: Record<string, string> = {
  sugestao: "Sugestão",
  critica: "Crítica",
  elogio: "Elogio",
  outro: "Outro",
};

export function FeedbackTab({ userId }: { userId: string }) {
  const [type, setType] = useState("sugestao");
  const [message, setMessage] = useState("");
  const [items, setItems] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data, error } = await supabase.from("feedbacks").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (error) throw error;
    setItems(data ?? []);
  }

  useEffect(() => {
    let alive = true;
    load().catch(() => toast.error("Não foi possível carregar seus feedbacks.")).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [userId]);

  async function submit() {
    const clean = message.trim();
    if (clean.length < 3) {
      toast.error("Escreva uma mensagem com pelo menos 3 caracteres.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("feedbacks").insert({ user_id: userId, feedback_type: type, message: clean });
    if (error) toast.error("Não foi possível enviar o feedback.", { description: error.message });
    else {
      setMessage("");
      toast.success("Feedback enviado. Obrigado por ajudar a melhorar!");
      await load();
    }
    setSaving(false);
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="space-y-5 pt-6">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary"><MessageSquareText className="h-5 w-5" /></span>
            <div><h2 className="font-display text-2xl">Críticas e sugestões</h2><p className="text-sm text-muted-foreground">Conte como podemos melhorar sua experiência e acompanhamento.</p></div>
          </div>
          <div className="grid gap-2 sm:max-w-xs"><Label>Tipo de feedback</Label><Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(typeLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label htmlFor="feedback-message">Sua mensagem</Label><Textarea id="feedback-message" value={message} maxLength={2000} rows={6} onChange={(event) => setMessage(event.target.value)} placeholder="Escreva sua sugestão, crítica ou elogio..." /><p className="text-right text-xs text-muted-foreground">{message.length}/2000</p></div>
          <Button className="h-12 w-full sm:w-auto" onClick={() => void submit()} disabled={saving || message.trim().length < 3}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Enviar feedback</Button>
        </CardContent>
      </Card>
      {!loading && items.length > 0 ? <div className="space-y-2"><p className="text-sm font-medium">Enviados recentemente</p>{items.slice(0, 3).map((item) => <div key={item.id} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><div className="min-w-0"><p className="text-xs font-semibold text-primary">{typeLabels[item.feedback_type] ?? "Feedback"}</p><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.message}</p></div></div>)}</div> : null}
    </div>
  );
}
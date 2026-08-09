import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getReferralCount } from "@/lib/admin.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, MessageCircle, Gift, Loader2 } from "lucide-react";

type ConfigRow = { content: Record<string, unknown> | null };

export function ReferralCard({ userId }: { userId: string }) {
  const [code, setCode] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(true);
  const getCount = useServerFn(getReferralCount);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: profile }, { data: config }, countRes] = await Promise.all([
        supabase.from("profiles").select("referral_code").eq("id", userId).single(),
        supabase.from("quiz_config").select("content").eq("section", "configuracoes").order("updated_at", { ascending: false }).limit(1),
        getCount(),
      ]);
      if (cancelled) return;
      setCode(profile?.referral_code ?? "");
      const content = (config?.[0] as ConfigRow | undefined)?.content;
      setWhatsapp(typeof content?.support_whatsapp === "string" ? content.support_whatsapp : "");
      setCount(countRes?.count ?? 0);
      setLoading(false);
    })().catch(() => {
      if (cancelled) return;
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [userId]);

  const link = code ? `${window.location.origin}/funil?ref=${code}` : "";
  const waLink = whatsapp
    ? `https://wa.me/55${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent("Olá! Tenho uma dúvida sobre meu programa.")}`
    : "";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link de indicação copiado!", { description: "Envie para amigos e família." });
    } catch {
      toast.error("Não foi possível copiar", { description: link });
    }
  }

  async function shareWhatsApp() {
    const text = encodeURIComponent(`Bora transformar seu corpo? Eu estou fazendo o programa do meu personal e indico muito! ${link}`);
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  }

  if (loading) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 mb-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-1">
            <Gift className="h-4 w-4 text-primary" />
            <h3 className="font-display text-lg">Indique e ganhe</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Compartilhe seu link e ajude mais gente a mudar de vida.
          </p>
          {code && (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2">
              <span className="font-mono font-bold tracking-wider text-primary flex-1 truncate">{code}</span>
              <Button size="sm" variant="outline" onClick={copyLink}>
                <Copy className="h-3.5 w-3.5" /> Copiar link
              </Button>
            </div>
          )}
          <div className="flex items-center justify-between mt-3">
            <Badge variant="secondary">{count ?? 0} pessoa{count === 1 ? "" : "s"} indicada{count === 1 ? "" : "s"}</Badge>
            <Button size="sm" variant="ghost" onClick={shareWhatsApp}>
              <MessageCircle className="h-3.5 w-3.5" /> Enviar no WhatsApp
            </Button>
          </div>
        </CardContent>
      </Card>

      {waLink && (
        <Card>
          <CardContent className="pt-6 flex flex-col items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <MessageCircle className="h-4 w-4 text-emerald-500" />
                <h3 className="font-display text-lg">Falar com o personal</h3>
              </div>
              <p className="text-sm text-muted-foreground">Tem alguma dúvida? Manda uma mensagem direto.</p>
            </div>
            <a href={waLink} target="_blank" rel="noopener noreferrer">
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Loader2 className="hidden" /> Abrir conversa
              </Button>
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

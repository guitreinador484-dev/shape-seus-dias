import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getReferralCount } from "@/lib/admin.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Gift, MessageCircle, Share2 } from "lucide-react";

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

  if (loading || (!code && !waLink)) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {code ? (
        <Card>
          <CardContent className="space-y-3 p-4 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 font-display text-2xl leading-none"><Gift className="h-4 w-4 text-primary" /> Indique e ganhe</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">Compartilhe seu link e ajude mais gente a mudar de vida.</p>
              </div>
              <p className="shrink-0 text-right">
                <span className="block font-display text-3xl leading-none tabular-nums">{count ?? 0}</span>
                <span className="text-[11px] text-muted-foreground">{count === 1 ? "indicação" : "indicações"}</span>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={copyLink}><Copy /> Copiar link</Button>
              <Button variant="outline" onClick={shareWhatsApp}><Share2 /> WhatsApp</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {waLink ? (
        <Card>
          <CardContent className="flex h-full flex-col justify-between gap-3 p-4 sm:p-6">
            <div>
              <h3 className="flex items-center gap-2 font-display text-2xl leading-none"><MessageCircle className="h-4 w-4 text-success" /> Falar com o personal</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">Tem alguma dúvida? Manda uma mensagem direto.</p>
            </div>
            <Button variant="outline" asChild>
              <a href={waLink} target="_blank" rel="noopener noreferrer">Abrir conversa</a>
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

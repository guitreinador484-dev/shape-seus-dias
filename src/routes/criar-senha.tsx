import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getPurchaseEmailFn, setPurchasePasswordFn } from "@/lib/set-password.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/criar-senha")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Crie sua senha — Plataforma do Personal" },
      { name: "description", content: "Defina a senha de acesso da sua conta após a compra." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CriarSenhaPage,
});

function CriarSenhaPage() {
  const navigate = useNavigate();
  const getEmail = useServerFn(getPurchaseEmailFn);
  const setPassword = useServerFn(setPurchasePasswordFn);

  const [reference, setReference] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    setReference(ref);
    if (!ref) {
      setLoading(false);
      return;
    }
    getEmail({ data: { reference: ref } })
      .then((r) => setEmail(r.email))
      .catch(() => setEmail(null))
      .finally(() => setLoading(false));
  }, [getEmail]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reference) return;
    if (pw.length < 8) {
      toast.error("A senha precisa ter pelo menos 8 caracteres");
      return;
    }
    if (pw !== pw2) {
      toast.error("As senhas não conferem");
      return;
    }
    setBusy(true);
    try {
      const result = await setPassword({ data: { reference, password: pw } });
      if (!result.ok) {
        toast.error("Não foi possível criar a senha", { description: result.message });
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email: result.email, password: pw });
      if (error) {
        toast.success("Senha criada! Entre com o seu e-mail e a nova senha.");
        navigate({ to: "/auth", replace: true });
        return;
      }
      toast.success("Tudo pronto! Bem-vindo à plataforma.");
      navigate({ to: "/plataforma", replace: true });
    } catch (err) {
      toast.error("Não foi possível criar a senha", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background">
      <Card className="w-full max-w-md bg-popover border-border p-6">
        <h1 className="text-2xl font-bold text-foreground">Crie sua senha de acesso</h1>

        {loading ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando sua compra...
          </p>
        ) : !reference || !email ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Não encontramos uma compra confirmada neste link. Se você já pagou, entre com o seu e-mail na tela de
              acesso ou use “Esqueci minha senha”.
            </p>
            <Link
              to="/auth"
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-4 font-semibold text-primary-foreground"
            >
              Ir para o acesso
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              Conta de <b>{email}</b>. Escolha uma senha e entre na plataforma.
            </p>
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="np">Senha</Label>
                <Input
                  id="np"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="np2">Confirmar senha</Label>
                <Input
                  id="np2"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={busy} className="w-full h-12 uppercase tracking-wider font-semibold">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar senha e entrar"}
              </Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}

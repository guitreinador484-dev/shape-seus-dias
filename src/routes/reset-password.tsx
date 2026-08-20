import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Definir senha — Plataforma do Personal" },
      { name: "description", content: "Crie a senha de acesso da sua conta de aluno." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("As senhas não conferem");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error("Não foi possível salvar a senha", { description: error.message });
      return;
    }
    toast.success("Senha criada! Bem-vindo à plataforma.");
    navigate({ to: "/plataforma", replace: true });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background">
      <Card className="w-full max-w-md bg-popover border-border p-6">
        <h1 className="text-2xl font-bold text-foreground">Crie sua senha de acesso</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {ready
            ? "Defina uma senha para entrar na plataforma."
            : "Abra esta página pelo link enviado no seu e-mail para definir a senha."}
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pw">Nova senha</Label>
            <Input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw2">Confirmar senha</Label>
            <Input id="pw2" type="password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <Button type="submit" disabled={busy || !ready} className="w-full h-12 uppercase tracking-wider font-semibold">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar senha e entrar"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

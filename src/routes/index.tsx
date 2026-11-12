import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { type AppRole, useAuth, roleHomePath, isAdminEmail } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { BrandLogoMark, BrandLogoName } from "@/components/brand-logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Acesso — Gui Treinador" },
      { name: "description", content: "Entre na sua área de aluno ou administrador." },
      { property: "og:title", content: "Acesso — Gui Treinador" },
      { property: "og:description", content: "Entre na sua área de aluno ou administrador." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();

  useEffect(() => {
    if (user && !loading) {
      navigate({ to: roleHomePath(role, user.email), replace: true });
    }
  }, [user, role, loading, navigate]);

  if (user || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background">
      <div className="w-full max-w-md">
        <div className="mb-7 text-center">
          <BrandLogoMark className="mx-auto h-24 w-auto" />
          <BrandLogoName className="mx-auto mt-4 h-12 w-auto" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">Força, disciplina e alta performance</p>
        </div>

        <Card className="bg-popover border-border p-6">
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2 bg-card">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="mt-6">
              <LoginForm />
            </TabsContent>
            <TabsContent value="signup" className="mt-6">
              <SignupForm />
            </TabsContent>
          </Tabs>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Quer conhecer o método?{" "}
          <Link to="/funil" className="text-primary hover:underline">
            Conheça o plano
          </Link>
        </p>
      </div>
    </div>
  );
}

function LoginForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error("Não foi possível entrar", { description: error.message });
      return;
    }
    const userId = data.user?.id;
    let nextRole: AppRole | null = null;
    if (isAdminEmail(data.user?.email)) {
      nextRole = "admin";
    } else if (userId) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      const roleList = (roles ?? []).map((item) => item.role as AppRole);
      nextRole =
        roleList.find((item) => item === "admin") ??
        roleList.find((item) => item === "online") ??
        roleList.find((item) => item === "presencial") ??
        null;
    }
    toast.success("Bem-vindo de volta!");
    navigate({ to: roleHomePath(nextRole, data.user?.email), replace: true });
  }

  if (forgot) return <ForgotPasswordForm initialEmail={email} onBack={() => setForgot(false)} />;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="login-email">Email</Label>
        <Input id="login-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="login-password">Senha</Label>
          <button type="button" onClick={() => setForgot(true)} className="-my-2 py-2 text-sm text-primary hover:underline">
            Esqueci minha senha
          </button>
        </div>
        <Input id="login-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <Button type="submit" disabled={busy} className="h-12 w-full uppercase font-bold">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
      </Button>
    </form>
  );
}

function ForgotPasswordForm({ initialEmail, onBack }: { initialEmail: string; onBack: () => void }) {
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const target = email.trim();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(target, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) {
      toast.error("Não foi possível enviar o link", {
        description: error.status === 429 ? "Aguarde alguns minutos antes de pedir outro link." : "Tente novamente em alguns minutos.",
      });
      return;
    }
    setSentTo(target);
  }

  if (sentTo) {
    return (
      <div role="status" className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Se existir uma conta com <span className="font-medium text-foreground [overflow-wrap:anywhere]">{sentTo}</span>, enviamos um link para criar uma nova senha. Confira também a caixa de spam.
        </p>
        <Button type="button" variant="outline" onClick={onBack} className="h-12 w-full">
          Voltar para o login
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">Informe seu e-mail e enviaremos um link para criar uma nova senha.</p>
      <div className="space-y-2">
        <Label htmlFor="forgot-email">Email</Label>
        <Input id="forgot-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <Button type="submit" disabled={busy} className="h-12 w-full uppercase font-bold">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar link"}
      </Button>
      <Button type="button" variant="ghost" onClick={onBack} className="w-full text-muted-foreground">
        Voltar para o login
      </Button>
    </form>
  );
}

function SignupForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const redirectUrl = `${window.location.origin}/plataforma`;
    const urlRef = new URLSearchParams(window.location.search).get("ref") ?? localStorage.getItem("referred_by_ref");
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName, whatsapp, ...(urlRef ? { referred_by: urlRef } : {}) },
      },
    });
    setBusy(false);
    if (error) {
      toast.error("Erro ao criar conta", { description: error.message });
      return;
    }
    toast.success("Conta criada!", {
      description: "O acesso à plataforma será liberado pelo seu personal após o pagamento.",
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="su-name">Nome completo</Label>
        <Input id="su-name" autoComplete="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="su-email">Email</Label>
        <Input id="su-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="su-wa">WhatsApp</Label>
        <Input id="su-wa" type="tel" autoComplete="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(11) 99999-9999" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="su-pw">Senha</Label>
        <Input id="su-pw" type="password" autoComplete="new-password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <Button type="submit" disabled={busy} className="h-12 w-full uppercase font-bold">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar conta"}
      </Button>
    </form>
  );
}

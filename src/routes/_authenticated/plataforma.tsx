import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { isAdminEmail, useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/plataforma")({
  component: PlataformaPage,
});

function PlataformaPage() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (role === "admin" || isAdminEmail(user?.email))) {
      navigate({ to: "/admin", replace: true });
    }
  }, [loading, role, user?.email, navigate]);

  if (loading || role === "admin" || isAdminEmail(user?.email)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-popover">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="font-display text-2xl">PERSONAL</h1>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground hidden sm:inline">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <h2 className="font-display text-4xl mb-3">Bem-vindo, {user?.email}</h2>
          <p className="text-muted-foreground">
            Sua área de aluno será construída nas próximas fases (aulas em vídeo, meu treino, perfil).
          </p>
          <p className="text-xs text-muted-foreground mt-4">
            Papel atual: <span className="text-primary font-mono">{role ?? "carregando..."}</span>
          </p>
        </div>
      </main>
    </div>
  );
}
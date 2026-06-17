import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

function AdminPage() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && role && role !== "admin") {
      navigate({ to: "/plataforma", replace: true });
    }
  }, [loading, role, navigate]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (loading || !role) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (role !== "admin") return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-popover">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="font-display text-2xl">ADMIN</h1>
            <span className="text-xs px-2 py-0.5 rounded bg-primary/15 text-primary">PERSONAL</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground hidden sm:inline">{user?.email}</span>
            <Link to="/plataforma" className="text-muted-foreground hover:text-foreground">Ver como aluno</Link>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="rounded-lg border border-border bg-card p-8">
          <h2 className="font-display text-4xl mb-3">Painel do administrador</h2>
          <p className="text-muted-foreground">
            Dashboard, vendas, alunos presenciais, biblioteca de aulas e editor do quiz virão nas próximas fases.
          </p>
        </div>
      </main>
    </div>
  );
}
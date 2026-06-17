import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Personal Trainer — Transformação em 3 meses" },
      {
        name: "description",
        content:
          "Plano de treino 100% personalizado com acompanhamento profissional. Descubra seu plano em 2 minutos.",
      },
      { property: "og:title", content: "Personal Trainer — Transformação em 3 meses" },
      {
        property: "og:description",
        content: "Plano de treino personalizado por um Personal Trainer de verdade.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="font-display text-2xl tracking-wider">PERSONAL</h1>
          <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">
            Entrar
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-20 pb-24 text-center">
        <span className="inline-block text-xs uppercase tracking-[0.2em] text-primary mb-6">
          Personal Trainer Online
        </span>
        <h2 className="font-display text-5xl md:text-7xl leading-none mb-6">
          Você está a <span className="text-primary">3 meses</span><br />
          do corpo que sempre quis.
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
          Plano 100% personalizado, treinos em vídeo e acompanhamento profissional.
          Comece com 5 perguntas rápidas.
        </p>
        <Link to="/quiz">
          <Button className="h-14 px-8 bg-primary hover:bg-[oklch(0.60_0.22_25)] uppercase tracking-wider font-semibold">
            Descobrir meu plano <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>

        <div className="mt-16 grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {[
            "+500 alunos transformados",
            "Personal certificado",
            "Acesso imediato após compra",
          ].map((t) => (
            <div key={t} className="flex items-center justify-center gap-2 text-sm text-muted-foreground border border-border rounded-lg py-3 px-4 bg-card">
              <CheckCircle2 className="h-4 w-4 text-primary" /> {t}
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Personal — Todos os direitos reservados
      </footer>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, Video, Dumbbell, ShoppingBag, ClipboardList, Settings } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

const cards = [
  { title: "Alunos", url: "/admin/alunos", icon: Users, desc: "Gerencie alunos online e presenciais." },
  { title: "Aulas em vídeo", url: "/admin/aulas", icon: Video, desc: "Biblioteca de aulas e categorias." },
  { title: "Treinos", url: "/admin/treinos", icon: Dumbbell, desc: "Planos e exercícios prescritos." },
  { title: "Vendas", url: "/admin/vendas", icon: ShoppingBag, desc: "Pedidos e acessos liberados." },
  { title: "Quiz / Anamnese", url: "/admin/quiz", icon: ClipboardList, desc: "Edite o quiz e veja respostas." },
  { title: "Configurações", url: "/admin/configuracoes", icon: Settings, desc: "Preferências do painel." },
];

function AdminDashboard() {
  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="font-display text-3xl mb-2">Painel do administrador</h2>
      <p className="text-muted-foreground mb-8">Escolha uma categoria para gerenciar.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.url}
            to={c.url}
            className="rounded-lg border border-border bg-card p-5 hover:border-primary/60 transition-colors"
          >
            <c.icon className="h-6 w-6 text-primary mb-3" />
            <h3 className="font-semibold text-lg mb-1">{c.title}</h3>
            <p className="text-sm text-muted-foreground">{c.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
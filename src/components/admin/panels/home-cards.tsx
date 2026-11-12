import { Link } from "@tanstack/react-router";
import { BadgeDollarSign, CheckCircle2, Dumbbell, Settings, Users, Video, Sparkles, BookOpen } from "lucide-react";
import { fetchStudents, formatCurrency, formatDate, purchaseStatusLabels, type Student } from "@/lib/admin-data";

export const adminCards = [
  { title: "Alunos", url: "/admin/alunos", icon: Users, desc: "Edite alunos, acesso, status e tipo." },
  { title: "Cursos", url: "/admin/cursos", icon: BookOpen, desc: "Crie cursos, módulos e aulas com vídeo." },
  { title: "Aulas em vídeo", url: "/admin/aulas", icon: Video, desc: "Cadastre aulas, categorias e vídeos." },
  { title: "Plataforma do aluno", url: "/admin/plataforma", icon: Video, desc: "Banner, destaque e ordem das prateleiras Netflix." },
  { title: "Treinos", url: "/admin/treinos", icon: Dumbbell, desc: "Monte planos por aluno e exercícios." },
  { title: "Vendas", url: "/admin/vendas", icon: BadgeDollarSign, desc: "Registre vendas e status de pagamento." },
  { title: "Funil de Vendas", url: "/admin/funil-vendas", icon: Sparkles, desc: "Configure páginas de venda e captura." },
  { title: "Configurações", url: "/admin/configuracoes", icon: Settings, desc: "Ajuste marca, contato e links." },
];

export function AdminHomeCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {adminCards.map((card) => (
        <Link key={card.url} to={card.url} className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/60">
          <card.icon className="h-6 w-6 text-primary mb-3" />
          <h3 className="font-semibold text-lg mb-1">{card.title}</h3>
          <p className="text-sm text-muted-foreground">{card.desc}</p>
          <div className="mt-4 flex items-center gap-2 text-sm text-primary"><CheckCircle2 className="h-4 w-4" /> Abrir gestão</div>
        </Link>
      ))}
    </div>
  );
}

export { fetchStudents, formatCurrency, formatDate, purchaseStatusLabels, type Student };

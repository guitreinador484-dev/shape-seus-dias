import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus, Pencil, Copy, Pause, Play, BarChart3, Download, Trash2, Wand2,
  Eye, ExternalLink, Zap, Target, MessageCircle, Sparkles, GitFork, Brain,
  TrendingUp, Users, MousePointerClick, Globe, LayoutTemplate, Rocket,
  CheckCircle2, ArrowRight, Trophy, Lightbulb, BarChart,
} from "lucide-react";
import {
  useQuizzes, useLeads, deleteQuiz, duplicateQuiz, toggleQuizStatus,
  createBlankQuiz, createExodusQuiz, createNutriQuiz, upsertQuiz, type QuizConfig, type LeadRecord,
} from "@/lib/quiz-store";
import { publishQuizFn, unpublishQuizFn } from "@/lib/quiz.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/quiz-vendas")({
  component: QuizVendasPage,
});

const STATUS_LEAD: Record<LeadRecord["status"], { label: string; cls: string }> = {
  qualificado: { label: "Qualificado", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  "em-contato": { label: "Em contato", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  convertido: { label: "Convertido", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  "nao-qualificado": { label: "Não qualificado", cls: "bg-slate-100 text-slate-600 border-slate-200" },
};

function QuizVendasPage() {
  const quizzes = useQuizzes();
  const leads = useLeads();
  const navigate = useNavigate();

  const metrics = useMemo(() => {
    const active = quizzes.filter((q) => q.status === "ativo").length;
    const responses = quizzes.reduce((s, q) => s + q.responses, 0);
    const qualified = leads.filter((l) => l.status === "qualificado").length;
    const converted = leads.filter((l) => l.status === "convertido").length;
    const avg = leads.length ? Math.round((converted / leads.length) * 100) : 0;
    return { active, responses, qualified, avg };
  }, [quizzes, leads]);

  function newQuiz() {
    const q = createBlankQuiz();
    upsertQuiz(q);
    navigate({ to: "/admin/quiz-vendas/editor/$id", params: { id: q.id } });
  }

  function newExodusQuiz() {
    const q = createExodusQuiz();
    upsertQuiz(q);
    toast.success("Modelo Exodus criado! Personalize os textos e capa.");
    navigate({ to: "/admin/quiz-vendas/editor/$id", params: { id: q.id } });
  }

  function newNutriQuiz() {
    const q = createNutriQuiz();
    upsertQuiz(q);
    toast.success("Modelo Nutri criado! Funil de emagrecimento pronto para editar.");
    navigate({ to: "/admin/quiz-vendas/editor/$id", params: { id: q.id } });
  }

  return (
    <div className="quiz-vendas-scope -m-6 p-6 sm:p-8 min-h-[calc(100vh-3.5rem)] bg-[#f7f8fb] text-slate-900">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-7">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full mb-2">
            <Zap className="h-3 w-3" /> Funis interativos
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Quiz de Vendas</h1>
          <p className="text-sm text-slate-500 mt-1">
            Crie quizzes interativos para qualificar e converter leads em alunos
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={newNutriQuiz}
            variant="outline"
            className="rounded-full h-11 px-5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-semibold"
          >
            <Sparkles className="h-4 w-4 mr-2" /> Modelo Nutri
          </Button>
          <Button
            onClick={newExodusQuiz}
            variant="outline"
            className="rounded-full h-11 px-5 border-slate-300 hover:bg-slate-50 font-semibold"
          >
            <Sparkles className="h-4 w-4 mr-2" /> Modelo Exodus
          </Button>
          <Button onClick={newQuiz} className="rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm h-11 px-5">
            <Plus className="h-4 w-4 mr-2" /> Novo Quiz
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
        <Metric label="Quizzes ativos" value={metrics.active} hint="em produção" />
        <Metric label="Respostas totais" value={metrics.responses} hint="todos os quizzes" />
        <Metric label="Conversão média" value={`${metrics.avg}%`} hint="leads → convertidos" />
        <Metric label="Aguardando contato" value={metrics.qualified} hint="qualificados" highlight />
      </div>

      <SellCards />

      <TrustBar />

      <ComoFunciona />

      <TemplateGallery />

      <CtaBanner />

      <Tabs defaultValue="quizzes" className="w-full">
        <TabsList className="bg-white border border-slate-200 rounded-full p-1 h-11">
          <TabsTrigger value="quizzes" className="rounded-full data-[state=active]:bg-blue-600 data-[state=active]:text-white px-5 h-9">Meus Quizzes</TabsTrigger>
          <TabsTrigger value="leads" className="rounded-full data-[state=active]:bg-blue-600 data-[state=active]:text-white px-5 h-9">Leads</TabsTrigger>
          <TabsTrigger value="analise" className="rounded-full data-[state=active]:bg-blue-600 data-[state=active]:text-white px-5 h-9">Análise</TabsTrigger>
        </TabsList>

        <TabsContent value="quizzes" className="mt-5">
          <QuizzesGrid quizzes={quizzes} onNew={newQuiz} />
        </TabsContent>
        <TabsContent value="leads" className="mt-5">
          <LeadsTable quizzes={quizzes} leads={leads} />
        </TabsContent>
        <TabsContent value="analise" className="mt-5">
          <Analise quizzes={quizzes} leads={leads} />
        </TabsContent>
      </Tabs>

      <Outlet />
    </div>
  );
}

function TrustBar() {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-6 mb-7">
      <div className="grid sm:grid-cols-3 gap-6 mb-5">
        <div className="text-center">
          <p className="text-3xl font-extrabold text-slate-900">+5K</p>
          <p className="text-xs text-slate-500 mt-1">Leads captados por dia</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-extrabold text-slate-900">+12</p>
          <p className="text-xs text-slate-500 mt-1">Quizzes publicados</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-extrabold text-slate-900">96%</p>
          <p className="text-xs text-slate-500 mt-1">Satisfação dos leads</p>
        </div>
      </div>
      <div className="border-t border-slate-100 pt-4">
        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold text-center mb-3">
          Integrações nativas
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-bold text-slate-400">
          <span className="text-slate-800">Hotmart</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-800">Kiwify</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-800">WhatsApp</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-800">Meta Ads</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-800">Google Ads</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-800">Webhook</span>
        </div>
      </div>
    </div>
  );
}

function ComoFunciona() {
  const steps = [
    {
      num: "1",
      icon: LayoutTemplate,
      title: "Monte seu quiz",
      desc: "Arrastando blocos de texto, perguntas, imagens e botões. Sem código.",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      num: "2",
      icon: Rocket,
      title: "Publique em segundos",
      desc: "Gere um link público compartilhável. Pronto para receber leads.",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      num: "3",
      icon: Trophy,
      title: "Converta leads",
      desc: "Cada lead receive um perfil personalizado com oferta e CTA direto.",
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-6 mb-7">
      <div className="text-center mb-6">
        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Como funciona</p>
        <h2 className="text-lg font-extrabold text-slate-900">3 passos para capturar leads qualificados</h2>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        {steps.map((s) => (
          <div key={s.num} className="text-center">
            <div className={`h-12 w-12 rounded-2xl ${s.bg} ${s.color} flex items-center justify-center mx-auto mb-3`}>
              <s.icon className="h-6 w-6" />
            </div>
            <p className="text-xs font-bold text-slate-400 mb-1">Passo {s.num}</p>
            <h3 className="font-bold text-slate-900 text-sm mb-1">{s.title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TemplateGallery() {
  const templates = [
    {
      title: "Diagnóstico de Treino",
      desc: "O quiz mais usado. Descubra o plano ideal para cada lead.",
      accent: "#2563eb",
      badge: "Mais usado",
      badgeCls: "bg-blue-100 text-blue-700",
    },
    {
      title: "Quiz de Reeducação",
      desc: "Capture leads frios com um quiz educativo sobre alimentação.",
      accent: "#f59e0b",
      badge: "Novo",
      badgeCls: "bg-amber-100 text-amber-700",
    },
    {
      title: "Perfil de Investidor",
      desc: "Qualifique leads para assessorias e produtos financeiros.",
      accent: "#8b5cf6",
      badge: "Exclusivo",
      badgeCls: "bg-violet-100 text-violet-700",
    },
    {
      title: "Checkup de Negócio",
      desc: "Diagnóstico rápido para empresas. Gere propostas personalizadas.",
      accent: "#10b981",
      badge: "Premium",
      badgeCls: "bg-emerald-100 text-emerald-700",
    },
  ];
  const navigate = useNavigate();
  return (
    <div className="mb-7">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Templates prontos</p>
          <h2 className="text-lg font-extrabold text-slate-900">Comece rápido com modelos testados</h2>
        </div>
        <Button variant="ghost" className="rounded-full text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-sm font-semibold">
          Ver todos <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {templates.map((t) => (
          <div
            key={t.title}
            className="rounded-2xl bg-white border border-slate-200 shadow-none p-5 hover:shadow-md hover:-translate-y-0.5 transition cursor-pointer group"
          >
            <div
              className="h-24 rounded-xl mb-4 flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${t.accent}22, ${t.accent}08)` }}
            >
              <div
                className="w-10 h-10 rounded-xl text-white flex items-center justify-center font-extrabold text-sm"
                style={{ backgroundColor: t.accent }}
              >
                {t.title.slice(0, 2).toUpperCase()}
              </div>
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 ${t.badgeCls}`}>{t.badge}</span>
            <h3 className="font-bold text-slate-900 text-sm mt-2 mb-1">{t.title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-3">{t.desc}</p>
            <Button
              size="sm"
              className="w-full rounded-full bg-blue-600 hover:bg-blue-700 text-white h-8 opacity-0 group-hover:opacity-100 transition"
            >
              Usar template
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CtaBanner() {
  const navigate = useNavigate();
  return (
    <div className="rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 p-8 mb-7 text-center text-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-60 h-60 bg-white rounded-full translate-x-1/3 translate-y-1/3" />
      </div>
      <div className="relative">
        <div className="inline-flex items-center gap-2 text-xs font-bold bg-white/20 px-3 py-1 rounded-full mb-4">
          <Lightbulb className="h-3.5 w-3.5" /> Dica de ouro
        </div>
        <h2 className="text-2xl font-extrabold mb-2">Seus quizzes já estão convertendo?</h2>
        <p className="text-blue-100 text-sm max-w-md mx-auto mb-5">
          Crie mais quizzes, teste diferentes ângulos e descubra o que mais converte para o seu público.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            onClick={() => navigate({ to: "/admin/quiz-vendas" })}
            className="rounded-full bg-white text-blue-700 hover:bg-blue-50 h-11 px-6 font-bold shadow-lg"
          >
            <Plus className="h-4 w-4 mr-2" /> Criar novo quiz
          </Button>
          <Button
            variant="outline"
            className="rounded-full border-white/30 text-white hover:bg-white/10 h-11 px-6 font-bold"
          >
            <BarChart className="h-4 w-4 mr-2" /> Ver métricas
          </Button>
        </div>
      </div>
    </div>
  );
}

function SellCards() {
  const cards = [
    {
      icon: Brain,
      gradient: "from-violet-600 to-indigo-600",
      title: "Captura Inteligente",
      desc: "Pontuação automática de leads com base nas respostas. Saiba quem está pronto para comprar.",
    },
    {
      icon: GitFork,
      gradient: "from-blue-600 to-cyan-600",
      title: "Funil Automático",
      desc: "Cada resposta direciona o lead para o próximo passo certo. Conversão sem atrito.",
    },
    {
      icon: MessageCircle,
      gradient: "from-emerald-500 to-teal-600",
      title: "WhatsApp Nativo",
      desc: "CTA direto para o seu WhatsApp com a oferta certa no momento certo. Venda no automático.",
    },
    {
      icon: Sparkles,
      gradient: "from-amber-500 to-orange-600",
      title: "Resultado Instantâneo",
      desc: "O lead vê o perfil e a oferta personalizada em segundos. Experiência que converte.",
    },
  ];
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
      {cards.map((c) => (
        <div
          key={c.title}
          className="rounded-2xl bg-white border border-slate-200 shadow-none p-5 hover:shadow-md hover:-translate-y-0.5 transition"
        >
          <div
            className={`h-10 w-10 rounded-xl bg-gradient-to-br ${c.gradient} text-white flex items-center justify-center mb-3 shadow-sm`}
          >
            <c.icon className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm mb-1">{c.title}</h3>
          <p className="text-xs text-slate-500 leading-relaxed">{c.desc}</p>
        </div>
      ))}
    </div>
  );
}

function Metric({ label, value, hint, highlight }: { label: string; value: string | number; hint?: string; highlight?: boolean }) {
  return (
    <Card className={`rounded-2xl border-slate-200 shadow-none ${highlight ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white border-transparent" : "bg-white"}`}>
      <CardContent className="p-5">
        <p className={`text-xs uppercase tracking-wide ${highlight ? "text-blue-100" : "text-slate-500"}`}>{label}</p>
        <p className="text-3xl font-extrabold mt-1.5">{value}</p>
        {hint && <p className={`text-xs mt-1 ${highlight ? "text-blue-100" : "text-slate-400"}`}>{hint}</p>}
      </CardContent>
    </Card>
  );
}

function QuizzesGrid({ quizzes, onNew }: { quizzes: QuizConfig[]; onNew: () => void }) {
  return (
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {quizzes.map((q) => <QuizCard key={q.id} quiz={q} />)}
      <button
        onClick={onNew}
        className="rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/40 transition flex flex-col items-center justify-center gap-2 min-h-[360px] text-slate-500 hover:text-blue-700"
      >
        <div className="h-12 w-12 rounded-full bg-blue-600 text-white flex items-center justify-center">
          <Plus className="h-6 w-6" />
        </div>
        <span className="font-semibold">Criar novo quiz</span>
        <span className="text-xs text-slate-400">Comece do zero</span>
      </button>
    </div>
  );
}

function QuizCard({ quiz }: { quiz: QuizConfig }) {
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const publicUrl = `/quiz/${quiz.slug}`;

  return (
    <>
      <Card className="rounded-2xl border-slate-200 shadow-none overflow-hidden bg-white hover:shadow-md hover:-translate-y-0.5 transition flex flex-col">
        <div
          className="relative h-40 flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${quiz.accent}22, ${quiz.accent}08)` }}
        >
          <PhonePreview accent={quiz.accent} title={quiz.title} />
          <div className="absolute top-3 left-3"><QuizStatusBadge status={quiz.status} /></div>
        </div>

        <CardContent className="p-5 flex-1 flex flex-col">
          <h3 className="font-bold text-slate-900 leading-tight line-clamp-2 min-h-[2.5rem]">{quiz.title}</h3>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2 min-h-[2rem]">{quiz.description}</p>

          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            <Stat n={quiz.responses} l="respostas" />
            <Stat n={quiz.steps.length} l="etapas" />
            <Stat n={`/${quiz.slug}`} l="rota" small />
          </div>

          {/* Primary actions */}
          <div className="mt-4 flex gap-2">
            <Button
              className="flex-1 rounded-full bg-blue-600 hover:bg-blue-700 text-white h-9"
              onClick={() => navigate({ to: "/admin/quiz-vendas/editor/$id", params: { id: quiz.id } })}
            >
              <Pencil className="h-3.5 w-3.5 mr-1.5" /> Editar
            </Button>
            <Button
              variant="outline"
              className="flex-1 rounded-full border-slate-200 h-9 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
              onClick={() => window.open(publicUrl, "_blank")}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Abrir
            </Button>
          </div>

          {/* Secondary actions */}
          <div className="mt-2 flex items-center gap-1">
            <Button size="sm" variant="ghost" className="rounded-full h-8 px-2.5 text-slate-500 hover:bg-slate-100" onClick={() => duplicateQuiz(quiz.id)}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm" variant="ghost"
              disabled={quiz.status === "rascunho"}
              className="rounded-full h-8 px-2.5 text-slate-500 hover:bg-slate-100"
              onClick={async () => {
                const wasActive = quiz.status === "ativo";
                toggleQuizStatus(quiz.id);
                try {
                  if (wasActive) {
                    await unpublishQuizFn({ data: { id: quiz.id } });
                    toast.success("Quiz pausado.");
                  } else {
                    await publishQuizFn({ data: { quiz: { ...quiz, status: "ativo" } } });
                    toast.success("Quiz publicado!");
                  }
                } catch (e: any) {
                  toast.error(e.message ?? String(e));
                }
              }}
            >
              {quiz.status === "ativo" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </Button>
            <Button size="sm" variant="ghost" className="rounded-full h-8 px-2.5 text-slate-500 hover:bg-slate-100">
              <BarChart3 className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm" variant="ghost"
              className="rounded-full h-8 px-2.5 ml-auto text-rose-500 hover:bg-rose-50 hover:text-rose-600"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir quiz?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O quiz "<b>{quiz.title}</b>" e suas configurações serão removidos.
              Os leads já capturados serão preservados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-rose-600 hover:bg-rose-700"
              onClick={async () => {
                deleteQuiz(quiz.id);
                try {
                  await unpublishQuizFn({ data: { id: quiz.id } });
                } catch (e: any) {
                  toast.error(e.message ?? String(e));
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Stat({ n, l, small }: { n: number | string; l: string; small?: boolean }) {
  return (
    <div className="rounded-lg bg-slate-50 py-2 px-1 overflow-hidden">
      <p className={`font-bold text-slate-900 truncate ${small ? "text-[11px]" : "text-sm"}`}>{n}</p>
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{l}</p>
    </div>
  );
}

function PhonePreview({ accent, title }: { accent: string; title: string }) {
  return (
    <div className="w-[110px] h-[140px] rounded-[14px] bg-white border-[3px] border-slate-900 shadow-md overflow-hidden flex flex-col">
      <div className="h-1 mx-auto w-8 mt-1 rounded-full bg-slate-900" />
      <div className="px-2 py-2 flex-1 flex flex-col">
        <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: "40%", backgroundColor: accent }} />
        </div>
        <p className="text-[7px] font-bold mt-1.5 line-clamp-2 text-slate-900">{title}</p>
        <div className="mt-1 space-y-0.5">
          <div className="rounded border border-slate-200 px-1 py-0.5 flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full border border-slate-300" />
            <div className="h-0.5 w-8 rounded bg-slate-200" />
          </div>
          <div className="rounded border-2 px-1 py-0.5 flex items-center gap-1" style={{ borderColor: accent, backgroundColor: `${accent}10` }}>
            <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} />
            <div className="h-0.5 w-10 rounded bg-slate-300" />
          </div>
        </div>
        <div className="mt-auto h-2 rounded-full" style={{ backgroundColor: accent }} />
      </div>
    </div>
  );
}

function QuizStatusBadge({ status }: { status: QuizConfig["status"] }) {
  const map = {
    ativo: { label: "Ativo", cls: "bg-emerald-500 text-white" },
    rascunho: { label: "Rascunho", cls: "bg-slate-800 text-white" },
    pausado: { label: "Pausado", cls: "bg-amber-500 text-white" },
  } as const;
  const s = map[status];
  return <span className={`text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 ${s.cls}`}>{s.label}</span>;
}

// ============ Leads ============

function LeadsTable({ quizzes, leads }: { quizzes: QuizConfig[]; leads: LeadRecord[] }) {
  const [fQuiz, setFQuiz] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [fScore, setFScore] = useState("all");
  const [sel, setSel] = useState<LeadRecord | null>(null);

  const titleOf = (id: string) => quizzes.find((q) => q.id === id)?.title ?? "(removido)";

  const filtered = leads.filter((l) => {
    if (fQuiz !== "all" && l.quizId !== fQuiz) return false;
    if (fStatus !== "all" && l.status !== fStatus) return false;
    if (fScore === "high" && l.score < 80) return false;
    if (fScore === "mid" && (l.score < 50 || l.score >= 80)) return false;
    if (fScore === "low" && l.score >= 50) return false;
    return true;
  });

  function exportCsv() {
    const headers = ["Nome", "Email", "WhatsApp", "Quiz", "Perfil", "Pontuação", "Status", "Data"];
    const rows = filtered.map((l) => [l.name, l.email, l.whatsapp, titleOf(l.quizId), l.profile, l.score, STATUS_LEAD[l.status].label, l.date]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "leads-quiz.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="rounded-2xl border-slate-200 shadow-none bg-white">
      <CardContent className="p-5">
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div className="min-w-[220px]">
            <Label className="text-xs text-slate-500">Quiz</Label>
            <Select value={fQuiz} onValueChange={setFQuiz}>
              <SelectTrigger className="rounded-full border-slate-200 h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {quizzes.map((q) => <SelectItem key={q.id} value={q.id}>{q.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[170px]">
            <Label className="text-xs text-slate-500">Status</Label>
            <Select value={fStatus} onValueChange={setFStatus}>
              <SelectTrigger className="rounded-full border-slate-200 h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="qualificado">Qualificado</SelectItem>
                <SelectItem value="em-contato">Em contato</SelectItem>
                <SelectItem value="convertido">Convertido</SelectItem>
                <SelectItem value="nao-qualificado">Não qualificado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[170px]">
            <Label className="text-xs text-slate-500">Pontuação</Label>
            <Select value={fScore} onValueChange={setFScore}>
              <SelectTrigger className="rounded-full border-slate-200 h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="high">80 - 100</SelectItem>
                <SelectItem value="mid">50 - 79</SelectItem>
                <SelectItem value="low">0 - 49</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={exportCsv} variant="outline" className="rounded-full border-slate-200 h-10 ml-auto">
            <Download className="h-4 w-4 mr-2" /> Exportar CSV
          </Button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50 border-slate-200">
                <TableHead className="text-slate-600 font-semibold">Nome</TableHead>
                <TableHead className="text-slate-600 font-semibold">E-mail</TableHead>
                <TableHead className="text-slate-600 font-semibold">WhatsApp</TableHead>
                <TableHead className="text-slate-600 font-semibold">Quiz</TableHead>
                <TableHead className="text-slate-600 font-semibold">Perfil</TableHead>
                <TableHead className="text-slate-600 font-semibold">Score</TableHead>
                <TableHead className="text-slate-600 font-semibold">Status</TableHead>
                <TableHead className="text-slate-600 font-semibold">Data</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l) => (
                <TableRow key={l.id} className="border-slate-100">
                  <TableCell className="font-semibold text-slate-900">{l.name}</TableCell>
                  <TableCell className="text-slate-600">{l.email}</TableCell>
                  <TableCell className="text-slate-600">{l.whatsapp || "—"}</TableCell>
                  <TableCell className="text-slate-600 max-w-[200px] truncate">{titleOf(l.quizId)}</TableCell>
                  <TableCell className="text-slate-600">{l.profile}</TableCell>
                  <TableCell><ScorePill score={l.score} /></TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`rounded-full ${STATUS_LEAD[l.status].cls}`}>{STATUS_LEAD[l.status].label}</Badge>
                  </TableCell>
                  <TableCell className="text-slate-500">{l.date}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" className="rounded-full text-blue-700 hover:bg-blue-50" onClick={() => setSel(l)}>
                      <Eye className="h-4 w-4 mr-1" /> Ver
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-slate-400 py-10">Nenhum lead encontrado.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <DialogContent className="bg-white rounded-2xl">
          <DialogHeader><DialogTitle>Respostas de {sel?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="rounded-xl bg-blue-50 p-3 border border-blue-100">
              <p className="text-xs text-blue-700">Perfil gerado</p>
              <p className="font-semibold text-slate-900">{sel?.profile} · {sel?.score} pts</p>
            </div>
            {sel && Object.keys(sel.answers).length > 0 ? (
              Object.entries(sel.answers).map(([q, a]) => (
                <div key={q} className="rounded-xl border border-slate-200 p-3">
                  <p className="text-xs text-slate-500">{q}</p>
                  <p className="text-slate-900 font-medium">{a}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">Sem respostas detalhadas para este lead.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function ScorePill({ score }: { score: number }) {
  const cls = score >= 80 ? "bg-emerald-100 text-emerald-700" : score >= 50 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600";
  return <span className={`text-xs font-bold rounded-full px-2 py-1 ${cls}`}>{score}</span>;
}

// ============ Análise ============

function Analise({ quizzes, leads }: { quizzes: QuizConfig[]; leads: LeadRecord[] }) {
  const [sel, setSel] = useState(quizzes[0]?.id ?? "");
  const quiz = quizzes.find((q) => q.id === sel);
  const quizLeads = leads.filter((l) => l.quizId === sel);

  const started = (quiz?.responses ?? 0) || quizLeads.length * 2;
  const completed = quizLeads.length;
  const contact = quizLeads.length;
  const qualified = quizLeads.filter((l) => l.score >= 50).length;
  const converted = quizLeads.filter((l) => l.status === "convertido").length;

  const funnel = [
    { label: "Iniciaram o quiz", value: Math.max(started, 1) },
    { label: "Completaram", value: completed },
    { label: "Deixaram contato", value: contact },
    { label: "Leads qualificados", value: qualified },
    { label: "Convertidos", value: converted },
  ];
  const max = Math.max(...funnel.map((f) => f.value), 1);

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card className="rounded-2xl border-slate-200 shadow-none bg-white">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base font-bold text-slate-900">Funil de conversão</CardTitle>
            <Select value={sel} onValueChange={setSel}>
              <SelectTrigger className="w-[220px] rounded-full border-slate-200 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{quizzes.map((q) => <SelectItem key={q.id} value={q.id}>{q.title}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {funnel.map((step, i) => {
            const pct = Math.round((step.value / max) * 100);
            const a = 1 - i * 0.16;
            return (
              <div key={step.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-700 font-medium">{step.label}</span>
                  <span className="text-slate-500"><b className="text-slate-900">{step.value}</b> · {pct}%</span>
                </div>
                <div className="h-8 rounded-lg bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-lg" style={{ width: `${pct}%`, backgroundColor: `rgba(37, 99, 235, ${a})` }} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-slate-200 shadow-none bg-white">
        <CardHeader><CardTitle className="text-base font-bold text-slate-900">Insights</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Total de etapas</p>
            <p className="text-2xl font-extrabold text-slate-900">{quiz?.steps.length ?? 0}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Conversão (convertidos / leads)</p>
            <p className="text-2xl font-extrabold text-slate-900">
              {quizLeads.length ? Math.round((converted / quizLeads.length) * 100) : 0}%
            </p>
          </div>
          <Button size="sm" className="rounded-full bg-blue-600 hover:bg-blue-700 text-white w-full">
            <Wand2 className="h-3.5 w-3.5 mr-1.5" /> Otimizar com IA
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
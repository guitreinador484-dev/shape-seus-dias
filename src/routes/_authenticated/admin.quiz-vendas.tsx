import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Pencil,
  Copy,
  Pause,
  Play,
  BarChart3,
  Download,
  Trash2,
  Wand2,
  GripVertical,
  Eye,
  ChevronLeft,
  ChevronRight,
  Type,
  ListChecks,
  MousePointerClick,
  Image as ImageIcon,
  Star,
  Smartphone,
  Link2,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/quiz-vendas")({
  component: QuizVendasPage,
});

// ============ Mock data ============

type QuizStatus = "ativo" | "rascunho" | "pausado";
type Quiz = {
  id: string;
  title: string;
  description: string;
  status: QuizStatus;
  responses: number;
  questions: number;
  offer: string;
  conversion: number;
  accent: string; // hex for the phone preview gradient
};

const initialQuizzes: Quiz[] = [
  {
    id: "q1",
    title: "Diagnóstico: Qual treino combina com você?",
    description: "Funil principal de captação para mentoria de emagrecimento.",
    status: "ativo",
    responses: 142,
    questions: 8,
    offer: "Mentoria Shape 90 dias",
    conversion: 28,
    accent: "#2563eb",
  },
  {
    id: "q2",
    title: "Você está pronto para hipertrofia?",
    description: "Qualificação para programa de ganho de massa muscular.",
    status: "ativo",
    responses: 89,
    questions: 10,
    offer: "Programa Massa Pro",
    conversion: 19,
    accent: "#0ea5e9",
  },
  {
    id: "q3",
    title: "Quiz Reeducação Alimentar",
    description: "Funil novo em construção para captar leads frios.",
    status: "rascunho",
    responses: 0,
    questions: 5,
    offer: "E-book gratuito",
    conversion: 0,
    accent: "#facc15",
  },
];

type LeadStatus = "qualificado" | "em-contato" | "convertido" | "nao-qualificado";
type Lead = {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  quiz: string;
  profile: string;
  score: number;
  status: LeadStatus;
  date: string;
};

const mockLeads: Lead[] = [
  { id: "l1", name: "Mariana Souza", email: "mariana.s@gmail.com", whatsapp: "(11) 98123-4567", quiz: "Diagnóstico: Qual treino combina com você?", profile: "Intermediário motivado", score: 87, status: "qualificado", date: "22/06/2026" },
  { id: "l2", name: "Carlos Almeida", email: "carlos.almeida@outlook.com", whatsapp: "(21) 99876-1234", quiz: "Você está pronto para hipertrofia?", profile: "Avançado disciplinado", score: 92, status: "convertido", date: "21/06/2026" },
  { id: "l3", name: "Juliana Pereira", email: "ju.pereira@gmail.com", whatsapp: "(31) 98765-4321", quiz: "Diagnóstico: Qual treino combina com você?", profile: "Iniciante comprometido", score: 64, status: "em-contato", date: "21/06/2026" },
  { id: "l4", name: "Rafael Mendes", email: "rafa.mendes@yahoo.com", whatsapp: "(11) 97777-2222", quiz: "Diagnóstico: Qual treino combina com você?", profile: "Intermediário motivado", score: 78, status: "qualificado", date: "20/06/2026" },
  { id: "l5", name: "Beatriz Lima", email: "bia.lima@hotmail.com", whatsapp: "(41) 96666-3333", quiz: "Você está pronto para hipertrofia?", profile: "Iniciante hesitante", score: 41, status: "nao-qualificado", date: "20/06/2026" },
  { id: "l6", name: "Felipe Costa", email: "felipe.costa@gmail.com", whatsapp: "(11) 95555-4444", quiz: "Diagnóstico: Qual treino combina com você?", profile: "Avançado disciplinado", score: 95, status: "convertido", date: "19/06/2026" },
  { id: "l7", name: "Camila Rocha", email: "camila.rocha@gmail.com", whatsapp: "(51) 94444-5555", quiz: "Diagnóstico: Qual treino combina com você?", profile: "Iniciante comprometido", score: 58, status: "em-contato", date: "18/06/2026" },
  { id: "l8", name: "Lucas Ferreira", email: "lucas.f@gmail.com", whatsapp: "(11) 93333-6666", quiz: "Você está pronto para hipertrofia?", profile: "Intermediário motivado", score: 81, status: "qualificado", date: "17/06/2026" },
];

const STATUS_LEAD: Record<LeadStatus, { label: string; cls: string }> = {
  qualificado: { label: "Qualificado", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  "em-contato": { label: "Em contato", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  convertido: { label: "Convertido", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  "nao-qualificado": { label: "Não qualificado", cls: "bg-slate-100 text-slate-600 border-slate-200" },
};

// ============ Page ============

function QuizVendasPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>(initialQuizzes);
  const [openCreator, setOpenCreator] = useState(false);

  const metrics = useMemo(() => {
    const active = quizzes.filter((q) => q.status === "ativo").length;
    const responses = quizzes.reduce((s, q) => s + q.responses, 0);
    const withResp = quizzes.filter((q) => q.responses > 0);
    const avg = withResp.length ? Math.round(withResp.reduce((s, q) => s + q.conversion, 0) / withResp.length) : 0;
    const qualified = mockLeads.filter((l) => l.status === "qualificado").length;
    return { active, responses, avg, qualified };
  }, [quizzes]);

  function toggleStatus(id: string) {
    setQuizzes((arr) => arr.map((q) => q.id === id
      ? { ...q, status: q.status === "ativo" ? "pausado" : q.status === "pausado" ? "ativo" : q.status }
      : q));
  }
  function duplicate(id: string) {
    const q = quizzes.find((x) => x.id === id);
    if (!q) return;
    setQuizzes((arr) => [...arr, { ...q, id: crypto.randomUUID(), title: q.title + " (cópia)", status: "rascunho", responses: 0, conversion: 0 }]);
  }

  return (
    <div className="-m-6 p-6 sm:p-8 min-h-[calc(100vh-3.5rem)] bg-[#f7f8fb] text-slate-900">
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
        <Button onClick={() => setOpenCreator(true)} className="rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm h-11 px-5">
          <Plus className="h-4 w-4 mr-2" /> Novo Quiz
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
        <Metric label="Quizzes ativos" value={metrics.active} hint="em produção" />
        <Metric label="Respostas este mês" value={metrics.responses} hint="+12% vs anterior" />
        <Metric label="Conversão média" value={`${metrics.avg}%`} hint="dos que completam" />
        <Metric label="Leads aguardando contato" value={metrics.qualified} hint="qualificados" highlight />
      </div>

      <Tabs defaultValue="quizzes" className="w-full">
        <TabsList className="bg-white border border-slate-200 rounded-full p-1 h-11">
          <TabsTrigger value="quizzes" className="rounded-full data-[state=active]:bg-blue-600 data-[state=active]:text-white px-5 h-9">
            Meus Quizzes
          </TabsTrigger>
          <TabsTrigger value="leads" className="rounded-full data-[state=active]:bg-blue-600 data-[state=active]:text-white px-5 h-9">
            Leads
          </TabsTrigger>
          <TabsTrigger value="analise" className="rounded-full data-[state=active]:bg-blue-600 data-[state=active]:text-white px-5 h-9">
            Análise
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quizzes" className="mt-5">
          <QuizzesGrid quizzes={quizzes} onToggle={toggleStatus} onDuplicate={duplicate} onNew={() => setOpenCreator(true)} />
        </TabsContent>
        <TabsContent value="leads" className="mt-5">
          <LeadsTable quizzes={quizzes} />
        </TabsContent>
        <TabsContent value="analise" className="mt-5">
          <Analise quizzes={quizzes} />
        </TabsContent>
      </Tabs>

      <QuizCreatorModal
        open={openCreator}
        onOpenChange={setOpenCreator}
        onSave={(q) => { setQuizzes((arr) => [...arr, q]); setOpenCreator(false); }}
      />
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

// ============ Tab 1: Quizzes (card grid w/ phone preview) ============

function QuizzesGrid({
  quizzes, onToggle, onDuplicate, onNew,
}: {
  quizzes: Quiz[];
  onToggle: (id: string) => void;
  onDuplicate: (id: string) => void;
  onNew: () => void;
}) {
  return (
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {quizzes.map((q) => <QuizCard key={q.id} quiz={q} onToggle={onToggle} onDuplicate={onDuplicate} />)}
      <button
        onClick={onNew}
        className="rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/40 transition flex flex-col items-center justify-center gap-2 min-h-[320px] text-slate-500 hover:text-blue-700"
      >
        <div className="h-12 w-12 rounded-full bg-blue-600 text-white flex items-center justify-center">
          <Plus className="h-6 w-6" />
        </div>
        <span className="font-semibold">Criar novo quiz</span>
        <span className="text-xs text-slate-400">Comece do zero ou use um modelo</span>
      </button>
    </div>
  );
}

function QuizCard({ quiz, onToggle, onDuplicate }: { quiz: Quiz; onToggle: (id: string) => void; onDuplicate: (id: string) => void }) {
  return (
    <Card className="rounded-2xl border-slate-200 shadow-none overflow-hidden bg-white hover:shadow-md hover:-translate-y-0.5 transition">
      {/* Phone-style preview header */}
      <div
        className="relative h-40 flex items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${quiz.accent}22, ${quiz.accent}08)` }}
      >
        <PhonePreview accent={quiz.accent} title={quiz.title} />
        <div className="absolute top-3 left-3"><QuizStatusBadge status={quiz.status} /></div>
        <div className="absolute top-3 right-3 flex gap-1">
          <button className="h-7 w-7 rounded-full bg-white/90 hover:bg-white border border-slate-200 flex items-center justify-center text-slate-600">
            <Eye className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <CardContent className="p-5">
        <h3 className="font-bold text-slate-900 leading-tight line-clamp-2 min-h-[2.5rem]">{quiz.title}</h3>
        <p className="text-xs text-slate-500 mt-1 line-clamp-2 min-h-[2rem]">{quiz.description}</p>

        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
          <Stat n={quiz.responses} l="respostas" />
          <Stat n={quiz.questions} l="perguntas" />
          <Stat n={`${quiz.conversion}%`} l="conversão" />
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
            <span>Conversão</span>
            <span className="font-semibold text-blue-700">{quiz.conversion}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full bg-blue-600" style={{ width: `${quiz.conversion}%` }} />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-1.5">
          <Button size="sm" variant="ghost" className="rounded-full h-8 px-3 hover:bg-blue-50 hover:text-blue-700">
            <BarChart3 className="h-3.5 w-3.5 mr-1" /> Métricas
          </Button>
          <Button size="sm" variant="ghost" className="rounded-full h-8 px-3 hover:bg-blue-50 hover:text-blue-700">
            <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
          </Button>
          <Button size="sm" variant="ghost" className="rounded-full h-8 px-3 hover:bg-blue-50 hover:text-blue-700" onClick={() => onDuplicate(quiz.id)}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={quiz.status === "rascunho"}
            className="rounded-full h-8 px-3 hover:bg-blue-50 hover:text-blue-700 ml-auto"
            onClick={() => onToggle(quiz.id)}
          >
            {quiz.status === "ativo"
              ? <><Pause className="h-3.5 w-3.5 mr-1" /> Pausar</>
              : <><Play className="h-3.5 w-3.5 mr-1" /> Ativar</>}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ n, l }: { n: number | string; l: string }) {
  return (
    <div className="rounded-lg bg-slate-50 py-2">
      <p className="text-sm font-bold text-slate-900">{n}</p>
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
          <div className="rounded border border-slate-200 px-1 py-0.5 flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full border border-slate-300" />
            <div className="h-0.5 w-6 rounded bg-slate-200" />
          </div>
        </div>
        <div className="mt-auto h-2 rounded-full" style={{ backgroundColor: accent }} />
      </div>
    </div>
  );
}

function QuizStatusBadge({ status }: { status: QuizStatus }) {
  const map = {
    ativo: { label: "Ativo", cls: "bg-emerald-500 text-white" },
    rascunho: { label: "Rascunho", cls: "bg-slate-800 text-white" },
    pausado: { label: "Pausado", cls: "bg-amber-500 text-white" },
  } as const;
  const s = map[status];
  return <span className={`text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 ${s.cls}`}>{s.label}</span>;
}

// ============ Tab 2: Leads ============

function LeadsTable({ quizzes }: { quizzes: Quiz[] }) {
  const [fQuiz, setFQuiz] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [fScore, setFScore] = useState("all");
  const [sel, setSel] = useState<Lead | null>(null);

  const filtered = mockLeads.filter((l) => {
    if (fQuiz !== "all" && l.quiz !== fQuiz) return false;
    if (fStatus !== "all" && l.status !== fStatus) return false;
    if (fScore === "high" && l.score < 80) return false;
    if (fScore === "mid" && (l.score < 50 || l.score >= 80)) return false;
    if (fScore === "low" && l.score >= 50) return false;
    return true;
  });

  function exportCsv() {
    const headers = ["Nome", "Email", "WhatsApp", "Quiz", "Perfil", "Pontuação", "Status", "Data"];
    const rows = filtered.map((l) => [l.name, l.email, l.whatsapp, l.quiz, l.profile, l.score, STATUS_LEAD[l.status].label, l.date]);
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
                {quizzes.map((q) => <SelectItem key={q.id} value={q.title}>{q.title}</SelectItem>)}
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
                  <TableCell className="text-slate-600">{l.whatsapp}</TableCell>
                  <TableCell className="text-slate-600 max-w-[200px] truncate">{l.quiz}</TableCell>
                  <TableCell className="text-slate-600">{l.profile}</TableCell>
                  <TableCell>
                    <ScorePill score={l.score} />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`rounded-full ${STATUS_LEAD[l.status].cls}`}>
                      {STATUS_LEAD[l.status].label}
                    </Badge>
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
            {[
              { q: "Qual seu objetivo principal?", a: "Emagrecer e ganhar disposição" },
              { q: "Com que frequência você treina hoje?", a: "2 a 3 vezes por semana" },
              { q: "Já fez acompanhamento com personal antes?", a: "Sim, há mais de 6 meses" },
              { q: "Qual seu nível de comprometimento (1-5)?", a: "5 - Totalmente comprometido" },
            ].map((it, i) => (
              <div key={i} className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-500">{it.q}</p>
                <p className="text-slate-900 font-medium">{it.a}</p>
              </div>
            ))}
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

// ============ Tab 3: Análise ============

function Analise({ quizzes }: { quizzes: Quiz[] }) {
  const [sel, setSel] = useState(quizzes[0]?.id ?? "");
  const funnel = [
    { label: "Iniciaram o quiz", value: 142 },
    { label: "Completaram", value: 118 },
    { label: "Deixaram contato", value: 76 },
    { label: "Leads qualificados", value: 40 },
    { label: "Convertidos", value: 11 },
  ];
  const max = funnel[0].value;
  const questions = [
    { q: "Qual sua faixa de orçamento mensal?", abandon: 38, top: "Até R$ 200/mês" },
    { q: "Você tem alguma lesão atual?", abandon: 22, top: "Não tenho lesões" },
    { q: "Em quanto tempo quer ver resultados?", abandon: 17, top: "3 meses" },
  ];

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
        <CardHeader><CardTitle className="text-base font-bold text-slate-900">Insights por pergunta</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {questions.map((q, i) => (
            <div key={i} className="rounded-xl border border-slate-200 p-3 hover:border-blue-300 transition">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">{q.q}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>Abandono: <b className="text-rose-600">{q.abandon}%</b></span>
                    <span>Mais comum: <b className="text-slate-700">{q.top}</b></span>
                  </div>
                </div>
                <Button size="sm" className="rounded-full bg-blue-600 hover:bg-blue-700 text-white shrink-0">
                  <Wand2 className="h-3.5 w-3.5 mr-1.5" /> Otimizar com IA
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ============ Quiz Creator Modal (inlead-style block builder) ============

type BlockType = "texto" | "multipla" | "escala" | "sim-nao" | "imagem";
type Option = { id: string; text: string; points: number };
type Block = {
  id: string;
  type: BlockType;
  text: string;
  options: Option[];
  eliminatory: boolean;
  disqualifyAnswer: string;
};
type Range = { id: string; min: number; max: number; profile: string; message: string; offer: string };

const BLOCK_LIB: { type: BlockType; label: string; icon: typeof Type }[] = [
  { type: "multipla", label: "Escolha Única", icon: ListChecks },
  { type: "texto", label: "Texto", icon: Type },
  { type: "sim-nao", label: "Sim ou Não", icon: MousePointerClick },
  { type: "escala", label: "Escala 1-5", icon: Star },
  { type: "imagem", label: "Imagem", icon: ImageIcon },
];

function QuizCreatorModal({
  open, onOpenChange, onSave,
}: { open: boolean; onOpenChange: (v: boolean) => void; onSave: (q: Quiz) => void }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("qualificar");
  const [offer, setOffer] = useState("");
  const [slug, setSlug] = useState("");
  const [accent, setAccent] = useState("#2563eb");

  const [blocks, setBlocks] = useState<Block[]>([
    { id: crypto.randomUUID(), type: "multipla", text: "Qual seu objetivo principal?", options: [
      { id: crypto.randomUUID(), text: "Emagrecer", points: 8 },
      { id: crypto.randomUUID(), text: "Ganhar massa", points: 9 },
      { id: crypto.randomUUID(), text: "Condicionamento", points: 7 },
    ], eliminatory: false, disqualifyAnswer: "" },
  ]);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(blocks[0]?.id ?? null);

  const [ranges, setRanges] = useState<Range[]>([
    { id: crypto.randomUUID(), min: 80, max: 100, profile: "Pronto para evoluir", message: "Você está no momento certo!", offer: "Mentoria premium" },
    { id: crypto.randomUUID(), min: 50, max: 79, profile: "Quase lá", message: "Vamos te preparar nas próximas semanas.", offer: "Lista de espera" },
    { id: crypto.randomUUID(), min: 0, max: 49, profile: "Começando", message: "Receba conteúdo gratuito para começar.", offer: "E-book gratuito" },
  ]);
  const [capture, setCapture] = useState({ name: true, email: true, whatsapp: true, text: "Insira seu e-mail para ver seu resultado", before: true });
  const [delivery, setDelivery] = useState({ webhook: "", pixel: "", gtm: "", redirect: false, redirectUrl: "", autoEmail: true });

  function addBlock(type: BlockType) {
    if (blocks.length >= 15) return;
    const b: Block = {
      id: crypto.randomUUID(), type, text: "Nova pergunta",
      options: type === "multipla" ? [{ id: crypto.randomUUID(), text: "Opção 1", points: 5 }] : [],
      eliminatory: false, disqualifyAnswer: "",
    };
    setBlocks((arr) => [...arr, b]);
    setSelectedBlock(b.id);
  }
  function update(id: string, patch: Partial<Block>) {
    setBlocks((arr) => arr.map((b) => b.id === id ? { ...b, ...patch } : b));
  }
  function remove(id: string) {
    setBlocks((arr) => arr.filter((b) => b.id !== id));
  }
  const current = blocks.find((b) => b.id === selectedBlock) ?? null;

  function handleSave(status: QuizStatus) {
    onSave({
      id: crypto.randomUUID(),
      title: name || "Novo quiz sem nome",
      description: `Objetivo: ${objective}`,
      status, responses: 0, questions: blocks.length,
      offer: offer || "—", conversion: 0, accent,
    });
    setStep(1); setName(""); setOffer(""); setSlug("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white rounded-2xl max-w-5xl max-h-[92vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-2xl font-extrabold">Construir Quiz</DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-2"><Stepper step={step} /></div>

        <div className="px-6 pb-4">
          {step === 1 && <StepInfo {...{ name, setName, objective, setObjective, offer, setOffer, slug, setSlug, accent, setAccent }} />}
          {step === 2 && (
            <BlockBuilder
              accent={accent}
              blocks={blocks}
              selectedBlockId={selectedBlock}
              setSelectedBlockId={setSelectedBlock}
              current={current}
              addBlock={addBlock}
              update={update}
              remove={remove}
            />
          )}
          {step === 3 && <StepResults ranges={ranges} setRanges={setRanges} />}
          {step === 4 && <StepCapture accent={accent} capture={capture} setCapture={setCapture} />}
          {step === 5 && <StepDelivery delivery={delivery} setDelivery={setDelivery} />}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between gap-2 px-6 pb-6 border-t border-slate-100 pt-4">
          <Button variant="outline" className="rounded-full border-slate-200" disabled={step === 1} onClick={() => setStep((s) => s - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <div className="flex gap-2">
            {step === 5 ? (
              <>
                <Button variant="outline" className="rounded-full border-slate-200" onClick={() => handleSave("rascunho")}>Salvar rascunho</Button>
                <Button className="rounded-full bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleSave("ativo")}>Publicar quiz</Button>
              </>
            ) : (
              <Button className="rounded-full bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setStep((s) => Math.min(5, s + 1))}>
                Avançar <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stepper({ step }: { step: number }) {
  const labels = ["Informações", "Perguntas", "Resultados", "Captura", "Entrega"];
  return (
    <div className="flex items-center gap-2 mb-2">
      {labels.map((l, i) => {
        const n = i + 1, active = n === step, done = n < step;
        return (
          <div key={l} className="flex-1 flex items-center gap-2">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${active ? "bg-blue-600 text-white" : done ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>{n}</div>
            <span className={`text-xs hidden md:inline ${active ? "text-blue-700 font-bold" : "text-slate-500"}`}>{l}</span>
            {i < labels.length - 1 && <div className={`flex-1 h-0.5 ${done ? "bg-blue-300" : "bg-slate-200"}`} />}
          </div>
        );
      })}
    </div>
  );
}

function StepInfo(props: {
  name: string; setName: (s: string) => void;
  objective: string; setObjective: (s: string) => void;
  offer: string; setOffer: (s: string) => void;
  slug: string; setSlug: (s: string) => void;
  accent: string; setAccent: (s: string) => void;
}) {
  const accents = ["#2563eb", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
  return (
    <div className="grid md:grid-cols-2 gap-5">
      <div className="space-y-4">
        <div>
          <Label className="font-semibold">Nome do quiz</Label>
          <Input className="rounded-lg" value={props.name} onChange={(e) => props.setName(e.target.value)} placeholder="Ex: Diagnóstico de treino" />
        </div>
        <div>
          <Label className="font-semibold">Objetivo</Label>
          <Select value={props.objective} onValueChange={props.setObjective}>
            <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="qualificar">Qualificar para mentoria</SelectItem>
              <SelectItem value="vender">Vender programa</SelectItem>
              <SelectItem value="lista">Capturar lista</SelectItem>
              <SelectItem value="diagnostico">Diagnóstico gratuito</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="font-semibold">Oferta vinculada</Label>
          <Input className="rounded-lg" value={props.offer} onChange={(e) => props.setOffer(e.target.value)} placeholder="Mentoria Shape 90 dias" />
        </div>
        <div>
          <Label className="font-semibold">URL personalizada</Label>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 h-10 bg-slate-50">
            <Link2 className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-500">seusite.com/quiz/</span>
            <input className="flex-1 bg-transparent outline-none text-sm" value={props.slug} onChange={(e) => props.setSlug(e.target.value)} placeholder="meu-quiz" />
          </div>
        </div>
        <div>
          <Label className="font-semibold">Cor do quiz</Label>
          <div className="flex gap-2 mt-2">
            {accents.map((c) => (
              <button key={c} onClick={() => props.setAccent(c)} className={`h-8 w-8 rounded-full border-2 ${props.accent === c ? "border-slate-900 scale-110" : "border-white"}`} style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
      </div>
      <div>
        <Label className="font-semibold">Capa do quiz</Label>
        <div className="mt-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 aspect-[4/5] flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:bg-blue-50/30 cursor-pointer transition">
          <ImageIcon className="h-10 w-10 mb-2" />
          <p className="text-sm font-medium">Arraste uma imagem</p>
          <p className="text-xs">ou clique para enviar</p>
        </div>
      </div>
    </div>
  );
}

function BlockBuilder({
  accent, blocks, selectedBlockId, setSelectedBlockId, current, addBlock, update, remove,
}: {
  accent: string;
  blocks: Block[];
  selectedBlockId: string | null;
  setSelectedBlockId: (id: string) => void;
  current: Block | null;
  addBlock: (t: BlockType) => void;
  update: (id: string, patch: Partial<Block>) => void;
  remove: (id: string) => void;
}) {
  return (
    <div className="grid lg:grid-cols-[200px_1fr_320px] gap-4">
      {/* Block library */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Componentes</p>
        <div className="space-y-1.5">
          {BLOCK_LIB.map((b) => (
            <button
              key={b.type}
              onClick={() => addBlock(b.type)}
              className="w-full flex items-center gap-2 rounded-xl border border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/40 px-3 py-2.5 text-sm font-medium text-slate-700"
            >
              <span className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                <b.icon className="h-3.5 w-3.5" />
              </span>
              {b.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 mt-3">{blocks.length}/15 perguntas</p>
      </div>

      {/* Canvas */}
      <div className="rounded-2xl bg-slate-100 p-4 min-h-[420px]">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">Fluxo do quiz</p>
        <div className="space-y-2">
          {blocks.map((b, i) => {
            const active = b.id === selectedBlockId;
            const Icon = (BLOCK_LIB.find((x) => x.type === b.type)?.icon) ?? Type;
            return (
              <button
                key={b.id}
                onClick={() => setSelectedBlockId(b.id)}
                className={`w-full text-left rounded-xl bg-white border-2 p-3 flex items-center gap-3 transition ${active ? "border-blue-600 shadow-sm" : "border-transparent hover:border-slate-200"}`}
              >
                <GripVertical className="h-4 w-4 text-slate-400" />
                <span className="h-8 w-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                <Icon className="h-4 w-4 text-slate-500 shrink-0" />
                <span className="flex-1 truncate text-sm font-medium text-slate-900">{b.text || "Sem título"}</span>
                {b.eliminatory && <Badge className="bg-amber-100 text-amber-700 rounded-full">eliminatória</Badge>}
                <button onClick={(e) => { e.stopPropagation(); remove(b.id); }} className="text-slate-400 hover:text-rose-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </button>
            );
          })}
        </div>
      </div>

      {/* Inspector + live preview */}
      <div className="space-y-4">
        {current ? (
          <>
            <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Editar bloco</p>
              <Input className="rounded-lg" value={current.text} onChange={(e) => update(current.id, { text: e.target.value })} placeholder="Texto da pergunta" />
              <Select value={current.type} onValueChange={(v) => update(current.id, { type: v as BlockType })}>
                <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BLOCK_LIB.map((b) => <SelectItem key={b.type} value={b.type}>{b.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {current.type === "multipla" && (
                <div className="space-y-2">
                  <Label className="text-xs">Opções e pontuação</Label>
                  {current.options.map((o) => (
                    <div key={o.id} className="flex gap-2">
                      <Input className="flex-1 rounded-lg" value={o.text} onChange={(e) => update(current.id, { options: current.options.map((x) => x.id === o.id ? { ...x, text: e.target.value } : x) })} />
                      <Input className="w-16 rounded-lg" type="number" min={0} max={10} value={o.points} onChange={(e) => update(current.id, { options: current.options.map((x) => x.id === o.id ? { ...x, points: Number(e.target.value) } : x) })} />
                    </div>
                  ))}
                  <Button size="sm" variant="outline" className="rounded-full border-slate-200 w-full" onClick={() => update(current.id, { options: [...current.options, { id: crypto.randomUUID(), text: "", points: 0 }] })}>
                    <Plus className="h-3 w-3 mr-1" /> Adicionar opção
                  </Button>
                </div>
              )}
              <div className="flex items-center justify-between rounded-lg border border-slate-200 p-2.5">
                <Label className="text-sm">Eliminatória</Label>
                <Switch checked={current.eliminatory} onCheckedChange={(v) => update(current.id, { eliminatory: v })} />
              </div>
              {current.eliminatory && (
                <Input className="rounded-lg" value={current.disqualifyAnswer} onChange={(e) => update(current.id, { disqualifyAnswer: e.target.value })} placeholder="Resposta que desqualifica" />
              )}
            </div>

            {/* Phone preview */}
            <div className="rounded-2xl bg-slate-900 p-3 flex justify-center">
              <div className="w-full max-w-[220px] rounded-2xl bg-white p-3 border-[3px] border-slate-700">
                <div className="h-1 mx-auto w-10 mb-2 rounded-full bg-slate-200" />
                <div className="h-1 rounded-full bg-slate-100 overflow-hidden mb-2">
                  <div className="h-full" style={{ width: "40%", backgroundColor: accent }} />
                </div>
                <p className="text-[11px] font-bold mb-2 text-slate-900">{current.text || "Sua pergunta"}</p>
                <div className="space-y-1.5">
                  {(current.type === "multipla" ? current.options : [
                    { id: "a", text: "Sim", points: 0 }, { id: "b", text: "Não", points: 0 },
                  ]).slice(0, 4).map((o, i) => (
                    <div key={o.id} className={`flex items-center gap-2 rounded-md border px-2 py-1.5 ${i === 0 ? "border-2" : "border"}`} style={{ borderColor: i === 0 ? accent : "#e2e8f0", backgroundColor: i === 0 ? `${accent}10` : "white" }}>
                      <div className="h-3 w-3 rounded-full border" style={{ borderColor: i === 0 ? accent : "#cbd5e1", backgroundColor: i === 0 ? accent : "transparent" }} />
                      <span className="text-[10px] text-slate-900 font-medium truncate">{o.text || `Opção ${i + 1}`}</span>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-3 rounded-md py-1.5 text-[10px] font-bold text-white" style={{ backgroundColor: accent }}>Continuar 👉</button>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-2xl bg-white border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
            Selecione um bloco para editar
          </div>
        )}
      </div>
    </div>
  );
}

function StepResults({ ranges, setRanges }: { ranges: Range[]; setRanges: (fn: (a: Range[]) => Range[]) => void }) {
  return (
    <div className="space-y-3">
      {ranges.map((r, i) => (
        <Card key={r.id} className="rounded-2xl border-slate-200 shadow-none">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="h-7 w-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">{String.fromCharCode(65 + i)}</span>
              <span className="text-sm font-semibold text-slate-700">Faixa {String.fromCharCode(65 + i)}</span>
              <Button size="sm" variant="ghost" className="ml-auto text-rose-600" onClick={() => setRanges((arr) => arr.filter((x) => x.id !== r.id))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Pontuação mínima</Label><Input className="rounded-lg" type="number" value={r.min} onChange={(e) => setRanges((arr) => arr.map((x) => x.id === r.id ? { ...x, min: Number(e.target.value) } : x))} /></div>
              <div><Label className="text-xs">Pontuação máxima</Label><Input className="rounded-lg" type="number" value={r.max} onChange={(e) => setRanges((arr) => arr.map((x) => x.id === r.id ? { ...x, max: Number(e.target.value) } : x))} /></div>
            </div>
            <Input className="rounded-lg" value={r.profile} onChange={(e) => setRanges((arr) => arr.map((x) => x.id === r.id ? { ...x, profile: e.target.value } : x))} placeholder="Nome do perfil" />
            <Textarea className="rounded-lg" value={r.message} onChange={(e) => setRanges((arr) => arr.map((x) => x.id === r.id ? { ...x, message: e.target.value } : x))} placeholder="Mensagem personalizada" rows={2} />
            <Input className="rounded-lg" value={r.offer} onChange={(e) => setRanges((arr) => arr.map((x) => x.id === r.id ? { ...x, offer: e.target.value } : x))} placeholder="Oferta apresentada" />
          </CardContent>
        </Card>
      ))}
      <Button variant="outline" className="rounded-full border-slate-200 w-full" onClick={() => setRanges((arr) => [...arr, { id: crypto.randomUUID(), min: 0, max: 0, profile: "", message: "", offer: "" }])}>
        <Plus className="h-4 w-4 mr-2" /> Adicionar faixa
      </Button>
    </div>
  );
}

function StepCapture({ accent, capture, setCapture }: { accent: string; capture: { name: boolean; email: boolean; whatsapp: boolean; text: string; before: boolean }; setCapture: (c: any) => void }) {
  return (
    <div className="grid md:grid-cols-2 gap-5">
      <div className="space-y-4">
        <div>
          <Label className="font-semibold">Texto acima do formulário</Label>
          <Textarea className="rounded-lg" value={capture.text} onChange={(e) => setCapture({ ...capture, text: e.target.value })} rows={2} />
        </div>
        <div className="space-y-2">
          <Label className="font-semibold">Campos a capturar</Label>
          {[
            { key: "name", label: "Nome (obrigatório)" },
            { key: "email", label: "E-mail (obrigatório)" },
            { key: "whatsapp", label: "WhatsApp (opcional)" },
          ].map((f) => (
            <div key={f.key} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
              <span className="text-sm">{f.label}</span>
              <Switch checked={(capture as any)[f.key]} onCheckedChange={(v) => setCapture({ ...capture, [f.key]: v })} />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
          <div>
            <p className="text-sm font-medium">Mostrar formulário antes do resultado</p>
            <p className="text-xs text-slate-500">Se desativado, o resultado aparece antes.</p>
          </div>
          <Switch checked={capture.before} onCheckedChange={(v) => setCapture({ ...capture, before: v })} />
        </div>
      </div>
      <div className="rounded-2xl bg-slate-900 p-3 flex justify-center">
        <div className="w-full max-w-[260px] rounded-2xl bg-white p-4 border-[3px] border-slate-700">
          <div className="h-1 mx-auto w-10 mb-3 rounded-full bg-slate-200" />
          <p className="text-xs font-bold text-slate-900 mb-3">{capture.text}</p>
          <div className="space-y-2">
            {capture.name && <div className="rounded-md border border-slate-200 px-2 py-1.5 text-[10px] text-slate-400">Nome</div>}
            {capture.email && <div className="rounded-md border border-slate-200 px-2 py-1.5 text-[10px] text-slate-400">E-mail</div>}
            {capture.whatsapp && <div className="rounded-md border border-slate-200 px-2 py-1.5 text-[10px] text-slate-400">WhatsApp</div>}
          </div>
          <button className="w-full mt-3 rounded-md py-1.5 text-[10px] font-bold text-white" style={{ backgroundColor: accent }}>Ver resultado 👉</button>
        </div>
      </div>
    </div>
  );
}

function StepDelivery({ delivery, setDelivery }: { delivery: any; setDelivery: (d: any) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="font-semibold">Webhook URL</Label>
        <Input className="rounded-lg" value={delivery.webhook} onChange={(e) => setDelivery({ ...delivery, webhook: e.target.value })} placeholder="https://hook.example.com/..." />
        <p className="text-xs text-slate-500 mt-1">Envia dados para ActiveCampaign, RD Station, etc.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="font-semibold">Pixel do Facebook</Label>
          <Input className="rounded-lg" value={delivery.pixel} onChange={(e) => setDelivery({ ...delivery, pixel: e.target.value })} placeholder="ID do pixel" />
        </div>
        <div>
          <Label className="font-semibold">Google Tag Manager</Label>
          <Input className="rounded-lg" value={delivery.gtm} onChange={(e) => setDelivery({ ...delivery, gtm: e.target.value })} placeholder="GTM-XXXXX" />
        </div>
      </div>
      <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
        <div>
          <p className="text-sm font-medium">Redirecionar após resultado</p>
          <p className="text-xs text-slate-500">Envia o lead para uma URL externa.</p>
        </div>
        <Switch checked={delivery.redirect} onCheckedChange={(v) => setDelivery({ ...delivery, redirect: v })} />
      </div>
      {delivery.redirect && (
        <Input className="rounded-lg" value={delivery.redirectUrl} onChange={(e) => setDelivery({ ...delivery, redirectUrl: e.target.value })} placeholder="https://..." />
      )}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
        <div>
          <p className="text-sm font-medium">Enviar e-mail automático ao lead</p>
          <p className="text-xs text-slate-500">Resumo do resultado por e-mail.</p>
        </div>
        <Switch checked={delivery.autoEmail} onCheckedChange={(v) => setDelivery({ ...delivery, autoEmail: v })} />
      </div>
    </div>
  );
}
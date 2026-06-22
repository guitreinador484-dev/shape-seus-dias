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
  Sparkles,
  GripVertical,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/quiz-vendas")({
  component: QuizVendasPage,
});

// ---------- Mock data ----------

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

const STATUS_COLORS: Record<LeadStatus, string> = {
  qualificado: "bg-primary/15 text-primary border-primary/30",
  "em-contato": "bg-amber-100 text-amber-700 border-amber-200",
  convertido: "bg-emerald-100 text-emerald-700 border-emerald-200",
  "nao-qualificado": "bg-muted text-muted-foreground border-border",
};
const STATUS_LABEL: Record<LeadStatus, string> = {
  qualificado: "Qualificado",
  "em-contato": "Em contato",
  convertido: "Convertido",
  "nao-qualificado": "Não qualificado",
};

// ---------- Main ----------

function QuizVendasPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>(initialQuizzes);
  const [openCreator, setOpenCreator] = useState(false);

  const metrics = useMemo(() => {
    const active = quizzes.filter((q) => q.status === "ativo").length;
    const responses = quizzes.reduce((s, q) => s + q.responses, 0);
    const withResp = quizzes.filter((q) => q.responses > 0);
    const avgConv = withResp.length
      ? Math.round(withResp.reduce((s, q) => s + q.conversion, 0) / withResp.length)
      : 0;
    const qualified = mockLeads.filter((l) => l.status === "qualificado").length;
    return { active, responses, avgConv, qualified };
  }, [quizzes]);

  function toggleStatus(id: string) {
    setQuizzes((arr) =>
      arr.map((q) =>
        q.id === id
          ? { ...q, status: q.status === "ativo" ? "pausado" : q.status === "pausado" ? "ativo" : q.status }
          : q,
      ),
    );
  }

  function duplicate(id: string) {
    const q = quizzes.find((x) => x.id === id);
    if (!q) return;
    setQuizzes((arr) => [
      ...arr,
      { ...q, id: crypto.randomUUID(), title: q.title + " (cópia)", status: "rascunho", responses: 0, conversion: 0 },
    ]);
  }

  return (
    <div className="quiz-vendas bg-background text-foreground -m-6 p-6 min-h-[calc(100vh-3.5rem)]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Quiz de Vendas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Crie quizzes interativos para qualificar e converter leads em alunos
          </p>
        </div>
        <Button
          onClick={() => setOpenCreator(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Plus className="h-4 w-4 mr-2" /> Novo Quiz
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <MetricCard label="Quizzes ativos" value={metrics.active} />
        <MetricCard label="Respostas este mês" value={metrics.responses} />
        <MetricCard label="Conversão média" value={`${metrics.avgConv}%`} />
        <MetricCard label="Leads aguardando contato" value={metrics.qualified} />
      </div>

      <Tabs defaultValue="quizzes" className="w-full">
        <TabsList className="bg-muted">
          <TabsTrigger value="quizzes" className="data-[state=active]:bg-white data-[state=active]:text-primary">
            Meus Quizzes
          </TabsTrigger>
          <TabsTrigger value="leads" className="data-[state=active]:bg-white data-[state=active]:text-primary">
            Leads
          </TabsTrigger>
          <TabsTrigger value="analise" className="data-[state=active]:bg-white data-[state=active]:text-primary">
            Análise
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quizzes" className="mt-4">
          <QuizzesList quizzes={quizzes} onToggle={toggleStatus} onDuplicate={duplicate} />
        </TabsContent>
        <TabsContent value="leads" className="mt-4">
          <LeadsTable quizzes={quizzes} />
        </TabsContent>
        <TabsContent value="analise" className="mt-4">
          <Analise quizzes={quizzes} />
        </TabsContent>
      </Tabs>

      <QuizCreatorModal
        open={openCreator}
        onOpenChange={setOpenCreator}
        onSave={(quiz) => {
          setQuizzes((arr) => [...arr, quiz]);
          setOpenCreator(false);
        }}
      />
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="border-border shadow-none">
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}

// ---------- Tab 1: Quizzes ----------

function QuizzesList({
  quizzes,
  onToggle,
  onDuplicate,
}: {
  quizzes: Quiz[];
  onToggle: (id: string) => void;
  onDuplicate: (id: string) => void;
}) {
  return (
    <div className="grid gap-3">
      {quizzes.map((q) => (
        <Card key={q.id} className="border-border shadow-none">
          <CardContent className="p-5">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <StatusBadge status={q.status} />
                  <h3 className="text-base font-semibold text-foreground truncate">{q.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{q.description}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span><b className="text-foreground">{q.responses}</b> respostas</span>
                  <span><b className="text-foreground">{q.questions}</b> perguntas</span>
                  <span>Oferta: <b className="text-foreground">{q.offer}</b></span>
                </div>
                <div className="mt-3 max-w-md">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Taxa de conversão</span>
                    <span className="font-semibold text-primary">{q.conversion}%</span>
                  </div>
                  <Progress value={q.conversion} className="h-2 [&>div]:bg-primary" />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 lg:flex-col lg:items-stretch lg:w-44">
                <Button variant="outline" size="sm" className="border-border">
                  <BarChart3 className="h-4 w-4 mr-2" /> Métricas
                </Button>
                <Button variant="outline" size="sm" className="border-border">
                  <Pencil className="h-4 w-4 mr-2" /> Editar
                </Button>
                <Button variant="outline" size="sm" className="border-border" onClick={() => onDuplicate(q.id)}>
                  <Copy className="h-4 w-4 mr-2" /> Duplicar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border"
                  onClick={() => onToggle(q.id)}
                  disabled={q.status === "rascunho"}
                >
                  {q.status === "ativo" ? (
                    <><Pause className="h-4 w-4 mr-2" /> Pausar</>
                  ) : (
                    <><Play className="h-4 w-4 mr-2" /> Ativar</>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: QuizStatus }) {
  const map = {
    ativo: "bg-emerald-100 text-emerald-700 border-emerald-200",
    rascunho: "bg-muted text-muted-foreground border-border",
    pausado: "bg-amber-100 text-amber-700 border-amber-200",
  } as const;
  const label = { ativo: "Ativo", rascunho: "Rascunho", pausado: "Pausado" }[status];
  return <Badge variant="outline" className={map[status]}>{label}</Badge>;
}

// ---------- Tab 2: Leads ----------

function LeadsTable({ quizzes }: { quizzes: Quiz[] }) {
  const [filterQuiz, setFilterQuiz] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterScore, setFilterScore] = useState("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const filtered = mockLeads.filter((l) => {
    if (filterQuiz !== "all" && l.quiz !== filterQuiz) return false;
    if (filterStatus !== "all" && l.status !== filterStatus) return false;
    if (filterScore === "high" && l.score < 80) return false;
    if (filterScore === "mid" && (l.score < 50 || l.score >= 80)) return false;
    if (filterScore === "low" && l.score >= 50) return false;
    return true;
  });

  function exportCsv() {
    const headers = ["Nome", "Email", "WhatsApp", "Quiz", "Perfil", "Pontuação", "Status", "Data"];
    const rows = filtered.map((l) => [l.name, l.email, l.whatsapp, l.quiz, l.profile, l.score, STATUS_LABEL[l.status], l.date]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads-quiz.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="border-border shadow-none">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div className="min-w-[200px]">
            <Label className="text-xs text-muted-foreground">Quiz</Label>
            <Select value={filterQuiz} onValueChange={setFilterQuiz}>
              <SelectTrigger className="border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {quizzes.map((q) => (
                  <SelectItem key={q.id} value={q.title}>{q.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[160px]">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="qualificado">Qualificado</SelectItem>
                <SelectItem value="em-contato">Em contato</SelectItem>
                <SelectItem value="convertido">Convertido</SelectItem>
                <SelectItem value="nao-qualificado">Não qualificado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[160px]">
            <Label className="text-xs text-muted-foreground">Pontuação</Label>
            <Select value={filterScore} onValueChange={setFilterScore}>
              <SelectTrigger className="border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="high">80 - 100</SelectItem>
                <SelectItem value="mid">50 - 79</SelectItem>
                <SelectItem value="low">0 - 49</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" className="border-border ml-auto" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-2" /> Exportar CSV
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Quiz</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Pontuação</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l) => (
                <TableRow key={l.id} className="border-border">
                  <TableCell className="font-medium text-foreground">{l.name}</TableCell>
                  <TableCell className="text-muted-foreground">{l.email}</TableCell>
                  <TableCell className="text-muted-foreground">{l.whatsapp}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">{l.quiz}</TableCell>
                  <TableCell className="text-muted-foreground">{l.profile}</TableCell>
                  <TableCell>
                    <span className="font-semibold text-primary">{l.score}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_COLORS[l.status]}>
                      {STATUS_LABEL[l.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{l.date}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" className="text-primary hover:text-primary hover:bg-primary/10" onClick={() => setSelectedLead(l)}>
                      <Eye className="h-4 w-4 mr-1" /> Ver
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhum lead encontrado.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={!!selectedLead} onOpenChange={(o) => !o && setSelectedLead(null)}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Respostas de {selectedLead?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="rounded-md bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Perfil gerado</p>
              <p className="font-medium text-foreground">{selectedLead?.profile}</p>
            </div>
            {[
              { q: "Qual seu objetivo principal?", a: "Emagrecer e ganhar disposição" },
              { q: "Com que frequência você treina hoje?", a: "2 a 3 vezes por semana" },
              { q: "Já fez acompanhamento com personal antes?", a: "Sim, há mais de 6 meses" },
              { q: "Qual seu nível de comprometimento (1-5)?", a: "5 - Totalmente comprometido" },
            ].map((item, i) => (
              <div key={i} className="border-l-2 border-primary pl-3">
                <p className="text-xs text-muted-foreground">{item.q}</p>
                <p className="text-foreground">{item.a}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ---------- Tab 3: Análise ----------

function Analise({ quizzes }: { quizzes: Quiz[] }) {
  const [selected, setSelected] = useState(quizzes[0]?.id ?? "");
  const funnel = [
    { label: "Iniciaram o quiz", value: 142 },
    { label: "Completaram", value: 118 },
    { label: "Deixaram contato", value: 76 },
    { label: "Leads qualificados", value: 40 },
    { label: "Convertidos", value: 11 },
  ];
  const max = funnel[0].value;

  const questions = [
    { q: "Qual sua faixa de orçamento mensal?", abandon: 38, topAnswer: "Até R$ 200/mês" },
    { q: "Você tem alguma lesão atual?", abandon: 22, topAnswer: "Não tenho lesões" },
    { q: "Em quanto tempo quer ver resultados?", abandon: 17, topAnswer: "3 meses" },
  ];

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card className="border-border shadow-none">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base text-foreground">Funil de conversão</CardTitle>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger className="w-[220px] border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                {quizzes.map((q) => (<SelectItem key={q.id} value={q.id}>{q.title}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {funnel.map((step, i) => {
            const pct = Math.round((step.value / max) * 100);
            const intensity = 1 - i * 0.15;
            return (
              <div key={step.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-foreground">{step.label}</span>
                  <span className="text-muted-foreground">
                    <b className="text-foreground">{step.value}</b> · {pct}%
                  </span>
                </div>
                <div className="h-7 rounded bg-muted overflow-hidden">
                  <div
                    className="h-full rounded"
                    style={{ width: `${pct}%`, backgroundColor: `rgba(220, 38, 38, ${intensity})` }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="border-border shadow-none">
        <CardHeader>
          <CardTitle className="text-base text-foreground">Insights por pergunta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {questions.map((q, i) => (
            <div key={i} className="rounded-lg border border-border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{q.q}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>Abandono: <b className="text-rose-600">{q.abandon}%</b></span>
                    <span>Resposta + comum: <b className="text-foreground">{q.topAnswer}</b></span>
                  </div>
                </div>
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0">
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Otimizar com IA
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------- Quiz Creator Modal ----------

type Option = { id: string; text: string; points: number };
type Question = {
  id: string;
  text: string;
  type: "multipla" | "escala" | "texto" | "sim-nao";
  options: Option[];
  eliminatory: boolean;
  disqualifyAnswer: string;
};
type Range = { id: string; min: number; max: number; profile: string; message: string; offer: string };

function QuizCreatorModal({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (q: Quiz) => void;
}) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("qualificar");
  const [offer, setOffer] = useState("");
  const [slug, setSlug] = useState("");
  const [questions, setQuestions] = useState<Question[]>([
    { id: crypto.randomUUID(), text: "", type: "multipla", options: [{ id: crypto.randomUUID(), text: "", points: 5 }], eliminatory: false, disqualifyAnswer: "" },
  ]);
  const [ranges, setRanges] = useState<Range[]>([
    { id: crypto.randomUUID(), min: 80, max: 100, profile: "Pronto para evoluir", message: "Você está no momento certo!", offer: "Mentoria premium" },
    { id: crypto.randomUUID(), min: 50, max: 79, profile: "Quase lá", message: "Vamos te preparar nas próximas semanas.", offer: "Lista de espera" },
    { id: crypto.randomUUID(), min: 0, max: 49, profile: "Começando", message: "Receba conteúdo gratuito para começar.", offer: "E-book gratuito" },
  ]);
  const [capture, setCapture] = useState({ name: true, email: true, whatsapp: true, text: "Insira seu e-mail para ver seu resultado", before: true });
  const [delivery, setDelivery] = useState({ webhook: "", pixel: "", gtm: "", redirect: false, redirectUrl: "", autoEmail: true });

  function addQuestion() {
    if (questions.length >= 15) return;
    setQuestions((arr) => [...arr, { id: crypto.randomUUID(), text: "", type: "multipla", options: [{ id: crypto.randomUUID(), text: "", points: 5 }], eliminatory: false, disqualifyAnswer: "" }]);
  }
  function updateQuestion(id: string, patch: Partial<Question>) {
    setQuestions((arr) => arr.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }
  function removeQuestion(id: string) {
    setQuestions((arr) => arr.filter((q) => q.id !== id));
  }
  function addOption(qid: string) {
    setQuestions((arr) => arr.map((q) => q.id === qid ? { ...q, options: [...q.options, { id: crypto.randomUUID(), text: "", points: 0 }] } : q));
  }

  function handleSave(status: QuizStatus) {
    onSave({
      id: crypto.randomUUID(),
      title: name || "Novo quiz sem nome",
      description: `Objetivo: ${objective}`,
      status,
      responses: 0,
      questions: questions.length,
      offer: offer || "—",
      conversion: 0,
    });
    // reset
    setStep(1); setName(""); setOffer(""); setSlug("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Quiz</DialogTitle>
        </DialogHeader>

        <Stepper step={step} />

        {step === 1 && (
          <div className="grid gap-4">
            <div>
              <Label>Nome do quiz</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Diagnóstico de treino" />
            </div>
            <div>
              <Label>Objetivo</Label>
              <Select value={objective} onValueChange={setObjective}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="qualificar">Qualificar para mentoria</SelectItem>
                  <SelectItem value="vender">Vender programa</SelectItem>
                  <SelectItem value="lista">Capturar lista</SelectItem>
                  <SelectItem value="diagnostico">Diagnóstico gratuito</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Oferta vinculada ao final</Label>
              <Input value={offer} onChange={(e) => setOffer(e.target.value)} placeholder="Ex: Mentoria Shape 90 dias" />
            </div>
            <div>
              <Label>URL personalizada</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">seusite.com/quiz/</span>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="nome-do-quiz" />
              </div>
            </div>
            <div>
              <Label>Thumbnail / capa</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center text-sm text-muted-foreground">
                Arraste uma imagem ou clique para enviar
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">{questions.length}/15 perguntas</p>
            {questions.map((q, idx) => (
              <Card key={q.id} className="border-border shadow-none">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    <span className="text-xs font-semibold text-muted-foreground">Pergunta {idx + 1}</span>
                    <Button size="sm" variant="ghost" className="ml-auto text-rose-600" onClick={() => removeQuestion(q.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input value={q.text} onChange={(e) => updateQuestion(q.id, { text: e.target.value })} placeholder="Texto da pergunta" />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Tipo</Label>
                      <Select value={q.type} onValueChange={(v) => updateQuestion(q.id, { type: v as Question["type"] })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="multipla">Múltipla escolha</SelectItem>
                          <SelectItem value="escala">Escala 1-5</SelectItem>
                          <SelectItem value="texto">Texto livre</SelectItem>
                          <SelectItem value="sim-nao">Sim ou Não</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end gap-2">
                      <Switch checked={q.eliminatory} onCheckedChange={(v) => updateQuestion(q.id, { eliminatory: v })} />
                      <Label className="text-xs">Pergunta eliminatória</Label>
                    </div>
                  </div>
                  {q.type === "multipla" && (
                    <div className="space-y-2">
                      <Label className="text-xs">Opções e pontuação</Label>
                      {q.options.map((opt) => (
                        <div key={opt.id} className="flex gap-2">
                          <Input
                            className="flex-1"
                            value={opt.text}
                            onChange={(e) => updateQuestion(q.id, { options: q.options.map((o) => o.id === opt.id ? { ...o, text: e.target.value } : o) })}
                            placeholder="Texto da opção"
                          />
                          <Input
                            type="number"
                            min={0}
                            max={10}
                            className="w-20"
                            value={opt.points}
                            onChange={(e) => updateQuestion(q.id, { options: q.options.map((o) => o.id === opt.id ? { ...o, points: Number(e.target.value) } : o) })}
                          />
                        </div>
                      ))}
                      <Button size="sm" variant="outline" className="border-border" onClick={() => addOption(q.id)}>
                        <Plus className="h-3 w-3 mr-1" /> Adicionar opção
                      </Button>
                    </div>
                  )}
                  {q.eliminatory && (
                    <Input value={q.disqualifyAnswer} onChange={(e) => updateQuestion(q.id, { disqualifyAnswer: e.target.value })} placeholder="Resposta que desqualifica" />
                  )}
                </CardContent>
              </Card>
            ))}
            <Button variant="outline" className="border-border w-full" onClick={addQuestion} disabled={questions.length >= 15}>
              <Plus className="h-4 w-4 mr-2" /> Adicionar pergunta
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            {ranges.map((r, i) => (
              <Card key={r.id} className="border-border shadow-none">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">Faixa {String.fromCharCode(65 + i)}</span>
                    <Button size="sm" variant="ghost" className="ml-auto text-rose-600" onClick={() => setRanges((arr) => arr.filter((x) => x.id !== r.id))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Pontuação mínima</Label>
                      <Input type="number" value={r.min} onChange={(e) => setRanges((arr) => arr.map((x) => x.id === r.id ? { ...x, min: Number(e.target.value) } : x))} />
                    </div>
                    <div>
                      <Label className="text-xs">Pontuação máxima</Label>
                      <Input type="number" value={r.max} onChange={(e) => setRanges((arr) => arr.map((x) => x.id === r.id ? { ...x, max: Number(e.target.value) } : x))} />
                    </div>
                  </div>
                  <Input value={r.profile} onChange={(e) => setRanges((arr) => arr.map((x) => x.id === r.id ? { ...x, profile: e.target.value } : x))} placeholder="Nome do perfil" />
                  <Textarea value={r.message} onChange={(e) => setRanges((arr) => arr.map((x) => x.id === r.id ? { ...x, message: e.target.value } : x))} placeholder="Mensagem personalizada" rows={2} />
                  <Input value={r.offer} onChange={(e) => setRanges((arr) => arr.map((x) => x.id === r.id ? { ...x, offer: e.target.value } : x))} placeholder="Oferta apresentada / redirecionamento" />
                </CardContent>
              </Card>
            ))}
            <Button variant="outline" className="border-border w-full" onClick={() => setRanges((arr) => [...arr, { id: crypto.randomUUID(), min: 0, max: 0, profile: "", message: "", offer: "" }])}>
              <Plus className="h-4 w-4 mr-2" /> Adicionar faixa
            </Button>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div>
              <Label>Texto acima do formulário</Label>
              <Textarea value={capture.text} onChange={(e) => setCapture({ ...capture, text: e.target.value })} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Campos a capturar</Label>
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <span className="text-sm">Nome (obrigatório)</span>
                <Switch checked={capture.name} onCheckedChange={(v) => setCapture({ ...capture, name: v })} />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <span className="text-sm">E-mail (obrigatório)</span>
                <Switch checked={capture.email} onCheckedChange={(v) => setCapture({ ...capture, email: v })} />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <span className="text-sm">WhatsApp (opcional)</span>
                <Switch checked={capture.whatsapp} onCheckedChange={(v) => setCapture({ ...capture, whatsapp: v })} />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <p className="text-sm font-medium">Mostrar formulário antes do resultado</p>
                <p className="text-xs text-muted-foreground">Se desativado, o resultado aparece antes da captura.</p>
              </div>
              <Switch checked={capture.before} onCheckedChange={(v) => setCapture({ ...capture, before: v })} />
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <div>
              <Label>Webhook URL</Label>
              <Input value={delivery.webhook} onChange={(e) => setDelivery({ ...delivery, webhook: e.target.value })} placeholder="https://hook.example.com/..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Pixel do Facebook</Label>
                <Input value={delivery.pixel} onChange={(e) => setDelivery({ ...delivery, pixel: e.target.value })} placeholder="ID do pixel" />
              </div>
              <div>
                <Label>Google Tag Manager</Label>
                <Input value={delivery.gtm} onChange={(e) => setDelivery({ ...delivery, gtm: e.target.value })} placeholder="GTM-XXXXX" />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <p className="text-sm font-medium">Redirecionar após resultado</p>
                <p className="text-xs text-muted-foreground">Envia o lead para uma URL externa.</p>
              </div>
              <Switch checked={delivery.redirect} onCheckedChange={(v) => setDelivery({ ...delivery, redirect: v })} />
            </div>
            {delivery.redirect && (
              <Input value={delivery.redirectUrl} onChange={(e) => setDelivery({ ...delivery, redirectUrl: e.target.value })} placeholder="https://..." />
            )}
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <p className="text-sm font-medium">Enviar e-mail automático ao lead</p>
                <p className="text-xs text-muted-foreground">O lead recebe um resumo do resultado por e-mail.</p>
              </div>
              <Switch checked={delivery.autoEmail} onCheckedChange={(v) => setDelivery({ ...delivery, autoEmail: v })} />
            </div>
          </div>
        )}

        <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
          <Button variant="outline" className="border-border" disabled={step === 1} onClick={() => setStep((s) => s - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <div className="flex gap-2">
            {step === 5 ? (
              <>
                <Button variant="outline" className="border-border" onClick={() => handleSave("rascunho")}>Salvar rascunho</Button>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => handleSave("ativo")}>Publicar quiz</Button>
              </>
            ) : (
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setStep((s) => Math.min(5, s + 1))}>
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
        const n = i + 1;
        const active = n === step;
        const done = n < step;
        return (
          <div key={l} className="flex-1 flex items-center gap-2">
            <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold ${active ? "bg-primary text-primary-foreground" : done ? "bg-primary/25 text-primary" : "bg-muted text-muted-foreground"}`}>
              {n}
            </div>
            <span className={`text-xs hidden md:inline ${active ? "text-primary font-semibold" : "text-muted-foreground"}`}>{l}</span>
            {i < labels.length - 1 && <div className={`flex-1 h-0.5 ${done ? "bg-primary/40" : "bg-muted"}`} />}
          </div>
        );
      })}
    </div>
  );
}
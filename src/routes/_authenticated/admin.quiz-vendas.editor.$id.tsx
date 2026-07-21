import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  X,
  Undo2,
  Redo2,
  Hammer,
  GitBranch,
  Palette,
  UsersRound,
  Settings2,
  Play,
  ExternalLink,
  Save,
  Plus,
  Trash2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Type,
  AlignLeft,
  Image as ImageIcon,
  ListChecks,
  MousePointerClick,
  ArrowDownToLine,
  SeparatorHorizontal,
  Check,
  MoreVertical,
  Eye,
  Columns,
  Monitor,
  Tablet,
  Smartphone,
  Settings,
  Video as VideoIcon,
  Sliders,
  CheckSquare,
  HelpCircle,
  Loader2,
  Quote,
  Star,
} from "lucide-react";
import {
  getQuiz,
  upsertQuiz,
  uid,
  type QuizConfig,
  type Step,
  type Block,
  type BlockKind,
  type TextStyle,
} from "@/lib/quiz-store";
import { publishQuizFn } from "@/lib/quiz.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/quiz-vendas/editor/$id")({
  component: QuizEditor,
});

type TabKey = "construtor" | "fluxo" | "design" | "leads" | "config";

const BLOCK_LIB: { kind: BlockKind; label: string; icon: typeof Type }[] = [
  { kind: "titulo", label: "Título", icon: Type },
  { kind: "paragrafo", label: "Parágrafo", icon: AlignLeft },
  { kind: "imagem", label: "Imagem", icon: ImageIcon },
  { kind: "video", label: "Vídeo", icon: VideoIcon },
  { kind: "escolha", label: "Escolha", icon: ListChecks },
  { kind: "multipla", label: "Múltipla", icon: CheckSquare },
  { kind: "sim-nao", label: "Sim / Não", icon: Check },
  { kind: "escala", label: "Escala 1-10", icon: Sliders },
  { kind: "entrada", label: "Entrada", icon: ArrowDownToLine },
  { kind: "botao", label: "Botão", icon: MousePointerClick },
  { kind: "loading", label: "Loading", icon: Loader2 },
  { kind: "depoimento", label: "Depoimentos", icon: Quote },
  { kind: "faq", label: "FAQ", icon: HelpCircle },
  { kind: "beneficio", label: "Benefício", icon: Check },
  { kind: "espacador", label: "Espaçador", icon: SeparatorHorizontal },
];

function makeBlock(kind: BlockKind): Block {
  const id = uid();
  switch (kind) {
    case "titulo":
      return { id, kind, text: "Novo título", align: "center" };
    case "paragrafo":
      return { id, kind, text: "Escreva um parágrafo aqui." };
    case "imagem":
      return { id, kind, url: "", alt: "" };
    case "escolha":
      return {
        id,
        kind,
        question: "Nova pergunta?",
        autoAdvance: true,
        options: [
          { id: uid(), text: "Opção 1", points: 5 },
          { id: uid(), text: "Opção 2", points: 5 },
        ],
      };
    case "sim-nao":
      return { id, kind, question: "Sim ou não?", yesPoints: 10, noPoints: 0 };
    case "entrada":
      return { id, kind, field: "name", label: "Nome", required: true };
    case "botao":
      return { id, kind, text: "Continuar", action: "next" };
    case "espacador":
      return { id, kind, height: 24 };
    case "video":
      return { id, kind, url: "", caption: "" };
    case "escala":
      return {
        id,
        kind,
        question: "De 0 a 10, quanto você concorda?",
        min: 0,
        max: 10,
        minLabel: "Discordo",
        maxLabel: "Concordo",
      };
    case "multipla":
      return {
        id,
        kind,
        question: "Selecione tudo que se aplica",
        options: [
          { id: uid(), text: "Opção A", points: 3 },
          { id: uid(), text: "Opção B", points: 3 },
          { id: uid(), text: "Opção C", points: 3 },
        ],
      };
    case "faq":
      return {
        id,
        kind,
        items: [
          { id: uid(), q: "Como funciona?", a: "Explique aqui como funciona." },
          { id: uid(), q: "Tem garantia?", a: "Sim, 7 dias de garantia." },
        ],
      };
    case "loading":
      return {
        id,
        kind,
        message: "Analisando suas respostas...",
        durationMs: 2500,
      };
    case "depoimento":
      return {
        id,
        kind,
        items: [
          {
            id: uid(),
            name: "Ana C.",
            role: "Aluna há 6 meses",
            text: "Mudou minha rotina completamente. Recomendo demais!",
            rating: 5,
          },
          {
            id: uid(),
            name: "Ricardo S.",
            role: "Aluno há 1 ano",
            text: "Resultados incríveis em pouco tempo.",
            rating: 5,
          },
        ],
      };
    case "beneficio":
      return { id, kind, text: "Resultado personalizado em 2 minutos", color: "green" };
  }
}

function QuizEditor() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const initial = getQuiz(id);
  const [quiz, setQuiz] = useState<QuizConfig | null>(initial ?? null);
  const [tab, setTab] = useState<TabKey>("construtor");
  const [stepIdx, setStepIdx] = useState(0);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [previewMode, setPreviewMode] = useState<"phone" | "tablet" | "desktop" | "quiz">("quiz");
  const isMobile = useIsMobile();
  useEffect(() => {
    if (isMobile) {
      setShowLeftSidebar(false);
      setShowRightSidebar(false);
    } else {
      setShowLeftSidebar(true);
      setShowRightSidebar(true);
    }
  }, [isMobile]);

  useEffect(() => {
    if (!quiz && id) {
      const fresh = getQuiz(id);
      if (fresh) setQuiz(fresh);
    }
  }, [id, quiz]);

  if (!quiz) {
    return (
      <div className="fixed inset-0 bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-3">Quiz não encontrado</p>
          <Button
            onClick={() => navigate({ to: "/admin/quiz-vendas" })}
            className="rounded-full bg-blue-600 hover:bg-blue-700"
          >
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  const step = quiz.steps[stepIdx] ?? quiz.steps[0];
  const selectedBlock = step?.blocks.find((b) => b.id === selectedBlockId) ?? null;

  function patchQuiz(patch: Partial<QuizConfig>) {
    setQuiz((q) => (q ? { ...q, ...patch } : q));
    setDirty(true);
  }
  function patchStep(idx: number, patch: Partial<Step>) {
    setQuiz((q) => {
      if (!q) return q;
      const steps = q.steps.map((s, i) => (i === idx ? { ...s, ...patch } : s));
      return { ...q, steps };
    });
    setDirty(true);
  }
  function addStep() {
    if (!quiz) return;
    setQuiz((q) => {
      if (!q) return q;
      const s: Step = { id: uid(), name: `Etapa ${q.steps.length + 1}`, blocks: [] };
      return { ...q, steps: [...q.steps, s] };
    });
    setStepIdx(quiz.steps.length);
    setDirty(true);
  }
  function removeStep(idx: number) {
    if (!quiz || quiz.steps.length <= 1) return;
    setQuiz((q) => (q ? { ...q, steps: q.steps.filter((_, i) => i !== idx) } : q));
    setStepIdx(Math.max(0, idx - 1));
    setDirty(true);
  }
  function moveStep(idx: number, dir: -1 | 1) {
    if (!quiz) return;
    const target = idx + dir;
    if (target < 0 || target >= quiz.steps.length) return;
    setQuiz((q) => {
      if (!q) return q;
      const next = [...q.steps];
      [next[idx], next[target]] = [next[target], next[idx]];
      return { ...q, steps: next };
    });
    setStepIdx(target);
    setDirty(true);
  }
  function addBlock(kind: BlockKind) {
    const b = makeBlock(kind);
    patchStep(stepIdx, { blocks: [...step.blocks, b] });
    setSelectedBlockId(b.id);
  }
  function updateBlock(blockId: string, patch: Partial<Block>) {
    patchStep(stepIdx, {
      blocks: step.blocks.map((b) => (b.id === blockId ? ({ ...b, ...patch } as Block) : b)),
    });
  }
  function removeBlock(blockId: string) {
    patchStep(stepIdx, { blocks: step.blocks.filter((b) => b.id !== blockId) });
    if (selectedBlockId === blockId) setSelectedBlockId(null);
  }

  function save() {
    if (!quiz) return;
    upsertQuiz(quiz);
    setDirty(false);
    // Keep the published copy in sync if the quiz is already live.
    if (quiz.status === "ativo") {
      publishQuizFn({ data: { quiz } }).catch((e) =>
        toast.error(`Falha ao sincronizar publicação: ${e.message ?? e}`),
      );
    }
  }
  async function publish() {
    if (!quiz) return;
    const updated = { ...quiz, status: "ativo" as const };
    upsertQuiz(updated);
    setQuiz(updated);
    setDirty(false);
    try {
      await publishQuizFn({ data: { quiz: updated } });
      toast.success("Quiz publicado! Link externo já está no ar.");
    } catch (e: any) {
      toast.error(`Falha ao publicar: ${e.message ?? e}`);
    }
  }
  async function openPublic() {
    if (!quiz) return;
    // Make sure the latest version is live on the backend before opening the public URL.
    const toPublish = { ...quiz, status: "ativo" as const };
    upsertQuiz(toPublish);
    setQuiz(toPublish);
    setDirty(false);
    try {
      await publishQuizFn({ data: { quiz: toPublish } });
    } catch (e: any) {
      toast.error(`Falha ao publicar antes de abrir: ${e.message ?? e}`);
      return;
    }
    window.open(`/quiz/${quiz.slug}`, "_blank");
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col">
      {/* Top toolbar */}
      <div className="h-14 border-b border-slate-800 grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center px-3 gap-2 shrink-0">
        <button
          onClick={() => {
            if (dirty) save();
            navigate({ to: "/admin/quiz-vendas" });
          }}
          className="h-10 w-10 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-400"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-1 ml-1 shrink-0">
          <ToolBtn icon={Undo2} />
          <ToolBtn icon={Redo2} />
        </div>

        <div className="min-w-0 flex items-center justify-start xl:justify-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabPill
            active={tab === "construtor"}
            onClick={() => setTab("construtor")}
            icon={Hammer}
            label="Construtor"
          />
          <TabPill
            active={tab === "fluxo"}
            onClick={() => setTab("fluxo")}
            icon={GitBranch}
            label="Fluxo"
          />
          <TabPill
            active={tab === "design"}
            onClick={() => setTab("design")}
            icon={Palette}
            label="Design"
          />
          <TabPill
            active={tab === "leads"}
            onClick={() => setTab("leads")}
            icon={UsersRound}
            label="Leads"
          />
          <TabPill
            active={tab === "config"}
            onClick={() => setTab("config")}
            icon={Settings2}
            label="Configurações"
          />
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <ToolBtn icon={Eye} onClick={openPublic} title="Pré-visualizar" />
          <ToolBtn icon={Play} onClick={openPublic} title="Testar" />
          <Button
            variant="ghost"
            className="rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white h-10"
            onClick={save}
          >
            <Save className="h-4 w-4 sm:mr-1.5" />{" "}
            <span className="hidden sm:inline">{dirty ? "Salvar*" : "Salvo"}</span>
          </Button>
          <Button
            onClick={publish}
            className="rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white h-10 px-3 sm:px-5"
          >
            Publicar
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex min-h-0 relative">
        {tab === "construtor" && (
          <>
            {/* Mobile backdrop */}
            {(showLeftSidebar || showRightSidebar) && isMobile && (
              <div
                onClick={() => {
                  setShowLeftSidebar(false);
                  setShowRightSidebar(false);
                }}
                className="md:hidden absolute inset-0 bg-black/50 z-20"
              />
            )}
            {/* Steps sidebar */}
            {showLeftSidebar && (
              <div className="md:contents absolute inset-y-0 left-0 z-30 flex bg-slate-950">
              <StepsSidebar
                quiz={quiz}
                stepIdx={stepIdx}
                setStepIdx={setStepIdx}
                addStep={addStep}
                removeStep={removeStep}
                moveStep={moveStep}
                patchStep={patchStep}
              />
              </div>
            )}

            {/* Block library */}
            {showLeftSidebar && (
              <div className="w-[152px] xl:w-[180px] border-r border-slate-800 overflow-y-auto p-3 shrink-0 absolute md:relative inset-y-0 left-[140px] xl:left-[160px] md:left-auto z-30 bg-slate-950">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2 px-2">
                  Componentes
                </p>
                <div className="space-y-1.5">
                  {BLOCK_LIB.map((b) => (
                    <button
                      key={b.kind}
                      onClick={() => addBlock(b.kind)}
                      className="w-full flex items-center gap-2.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 px-3 py-2.5 text-sm text-slate-200 transition"
                    >
                      <b.icon className="h-4 w-4 text-slate-400" />
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Canvas */}
            <div className="flex-1 min-w-0 min-h-0 bg-slate-900/50 overflow-y-auto p-2 sm:p-4 flex flex-col items-center justify-start">
              {/* Canvas Toolbar */}
              <div className="w-full max-w-4xl mb-4 flex flex-wrap items-center justify-between gap-3 px-3 py-2 bg-slate-950/80 backdrop-blur border border-slate-800 rounded-xl shrink-0">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowLeftSidebar(!showLeftSidebar)}
                    title={showLeftSidebar ? "Ocultar painel esquerdo" : "Mostrar painel esquerdo"}
                    className={`h-8 px-2.5 rounded-lg flex items-center gap-2 text-xs font-medium transition ${
                      showLeftSidebar
                        ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                        : "bg-blue-600 text-white hover:bg-blue-500"
                    }`}
                  >
                    <Columns className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Painel Esquerdo</span>
                  </button>
                  <button
                    onClick={() => setShowRightSidebar(!showRightSidebar)}
                    title={showRightSidebar ? "Ocultar painel direito" : "Mostrar painel direito"}
                    className={`h-8 px-2.5 rounded-lg flex items-center gap-2 text-xs font-medium transition ${
                      showRightSidebar
                        ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                        : "bg-blue-600 text-white hover:bg-blue-500"
                    }`}
                  >
                    <Settings className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Inspetor</span>
                  </button>
                </div>

                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setPreviewMode("phone")}
                    title="Móvel (375px)"
                    className={`h-7 px-2.5 rounded-md flex items-center gap-1.5 text-xs transition ${
                      previewMode === "phone"
                        ? "bg-blue-600 text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                    <span className="hidden md:inline">Móvel</span>
                  </button>
                  <button
                    onClick={() => setPreviewMode("tablet")}
                    title="Tablet (640px)"
                    className={`h-7 px-2.5 rounded-md flex items-center gap-1.5 text-xs transition ${
                      previewMode === "tablet"
                        ? "bg-blue-600 text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Tablet className="h-3.5 w-3.5" />
                    <span className="hidden md:inline">Tablet</span>
                  </button>
                  <button
                    onClick={() => setPreviewMode("desktop")}
                    title="Desktop (1024px)"
                    className={`h-7 px-2.5 rounded-md flex items-center gap-1.5 text-xs transition ${
                      previewMode === "desktop"
                        ? "bg-blue-600 text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Monitor className="h-3.5 w-3.5" />
                    <span className="hidden md:inline">Desktop</span>
                  </button>
                  <div className="h-4 w-px bg-slate-800 mx-1" />
                  <button
                    onClick={() => setPreviewMode("quiz")}
                    className={`h-7 px-2.5 rounded-md text-xs transition ${
                      previewMode === "quiz"
                        ? "bg-blue-600 text-white font-medium"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Quiz (
                    {quiz.width === "narrow"
                      ? "Estreito"
                      : quiz.width === "wide"
                        ? "Largo"
                        : "Médio"}
                    )
                  </button>
                </div>
              </div>

              <Canvas
                quiz={quiz}
                step={step}
                stepIdx={stepIdx}
                selectedBlockId={selectedBlockId}
                setSelectedBlockId={setSelectedBlockId}
                removeBlock={removeBlock}
                previewMode={previewMode}
              />
            </div>

            {/* Inspector */}
            {showRightSidebar && (
              <div className="md:contents absolute inset-y-0 right-0 z-30 flex bg-slate-950">
              <Inspector
                quiz={quiz}
                step={step}
                stepIdx={stepIdx}
                patchStep={patchStep}
                selectedBlock={selectedBlock}
                updateBlock={updateBlock}
              />
              </div>
            )}
          </>
        )}

        {tab === "fluxo" && <FluxoTab quiz={quiz} />}
        {tab === "design" && <DesignTab quiz={quiz} patchQuiz={patchQuiz} />}
        {tab === "leads" && <LeadsTab quizId={quiz.id} />}
        {tab === "config" && <ConfigTab quiz={quiz} patchQuiz={patchQuiz} />}
      </div>
    </div>
  );
}

function ToolBtn({
  icon: Icon,
  onClick,
  title,
}: {
  icon: typeof X;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="h-10 w-10 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function TabPill({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof X;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full px-3 lg:px-4 h-10 text-sm font-medium transition ${
        active ? "bg-emerald-500 text-white" : "text-slate-300 hover:bg-slate-800"
      }`}
    >
      <Icon className="h-4 w-4" /> <span className="hidden lg:inline">{label}</span>
    </button>
  );
}

// ============ Steps sidebar ============

function StepsSidebar({
  quiz,
  stepIdx,
  setStepIdx,
  addStep,
  removeStep,
  moveStep,
  patchStep,
}: {
  quiz: QuizConfig;
  stepIdx: number;
  setStepIdx: (i: number) => void;
  addStep: () => void;
  removeStep: (i: number) => void;
  moveStep: (i: number, dir: -1 | 1) => void;
  patchStep: (i: number, patch: Partial<Step>) => void;
}) {
  const [menuFor, setMenuFor] = useState<string | null>(null);
  return (
    <div className="w-[140px] xl:w-[160px] border-r border-slate-800 overflow-y-auto p-3 shrink-0">
      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2 px-2">
        Etapas
      </p>
      <div className="space-y-1">
        {quiz.steps.map((s, i) => {
          const active = i === stepIdx;
          return (
            <div key={s.id} className="relative">
              <button
                onClick={() => setStepIdx(i)}
                className={`group w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition ${
                  active
                    ? "bg-slate-800 ring-1 ring-blue-500 text-white"
                    : "text-slate-300 hover:bg-slate-800/60"
                }`}
              >
                <GripVertical className="h-3.5 w-3.5 text-slate-500" />
                <span className="flex-1 text-left truncate">{s.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuFor(menuFor === s.id ? null : s.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white p-1"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </button>
              </button>
              {menuFor === s.id && (
                <div className="absolute z-20 right-0 top-9 w-40 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 text-sm">
                  <MenuItem
                    icon={ChevronUp}
                    label="Mover para cima"
                    onClick={() => {
                      moveStep(i, -1);
                      setMenuFor(null);
                    }}
                  />
                  <MenuItem
                    icon={ChevronDown}
                    label="Mover para baixo"
                    onClick={() => {
                      moveStep(i, 1);
                      setMenuFor(null);
                    }}
                  />
                  <div className="my-1 border-t border-slate-800" />
                  <MenuItem
                    icon={Trash2}
                    label="Excluir"
                    danger
                    onClick={() => {
                      removeStep(i);
                      setMenuFor(null);
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
        <button
          onClick={addStep}
          className="w-full mt-2 flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-700 hover:border-blue-500 hover:bg-slate-800 px-2 py-2 text-sm text-slate-400 hover:text-white"
        >
          <Plus className="h-4 w-4" /> Adicionar Etapa
        </button>
      </div>
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof X;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-800 ${danger ? "text-rose-400" : "text-slate-200"}`}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

const widthClasses = {
  narrow: "max-w-md",
  medium: "max-w-xl",
  wide: "max-w-3xl",
};

const previewWidthClasses = {
  phone: "max-w-[375px]",
  tablet: "max-w-[640px]",
  desktop: "max-w-[1024px]",
};

const fontSizeMap: Record<string, string> = {
  xs: "0.75rem",
  sm: "0.875rem",
  base: "1rem",
  lg: "1.125rem",
  xl: "1.25rem",
  "2xl": "1.5rem",
  "3xl": "1.875rem",
  "4xl": "2.25rem",
};

function textStyle(style?: TextStyle): React.CSSProperties {
  if (!style) return {};
  return {
    color: style.color,
    fontWeight: style.fontWeight as React.CSSProperties["fontWeight"],
    fontSize: style.fontSize ? fontSizeMap[style.fontSize] : undefined,
    backgroundColor: style.bgColor,
  };
}

// ============ Canvas ============

function Canvas({
  quiz,
  step,
  stepIdx,
  selectedBlockId,
  setSelectedBlockId,
  removeBlock,
  previewMode,
}: {
  quiz: QuizConfig;
  step: Step;
  stepIdx: number;
  selectedBlockId: string | null;
  setSelectedBlockId: (id: string | null) => void;
  removeBlock: (id: string) => void;
  previewMode: "phone" | "tablet" | "desktop" | "quiz";
}) {
  const progress = ((stepIdx + 1) / quiz.steps.length) * 100;
  const canvasWidthClass =
    previewMode === "quiz"
      ? widthClasses[quiz.width || "medium"]
      : previewWidthClasses[previewMode];

  return (
    <div
      className={`w-full ${canvasWidthClass} bg-white text-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-800 transition-all duration-300`}
    >
      {quiz.showProgress && (
        <div className="h-1.5 bg-slate-100">
          <div
            className="h-full transition-all"
            style={{ width: `${progress}%`, backgroundColor: quiz.accent }}
          />
        </div>
      )}
      <div className="px-6 sm:px-10 py-8 min-h-[460px] flex flex-col gap-4">
        {step.blocks.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-12">
            <SeparatorHorizontal className="h-10 w-10 mb-3" />
            <p className="text-sm">Adicione componentes pela barra lateral.</p>
          </div>
        )}
        {step.blocks.map((b) => (
          <BlockRenderer
            key={b.id}
            block={b}
            accent={quiz.accent}
            selected={selectedBlockId === b.id}
            onSelect={() => setSelectedBlockId(b.id)}
            onRemove={() => removeBlock(b.id)}
          />
        ))}
      </div>
    </div>
  );
}

function BlockRenderer({
  block,
  accent,
  selected,
  onSelect,
  onRemove,
}: {
  block: Block;
  accent: string;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`group relative rounded-xl border transition cursor-pointer ${
        selected
          ? "ring-2 ring-blue-500 ring-offset-2 border-blue-300 bg-white"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute -top-2 -right-2 z-10 h-6 w-6 rounded-full bg-rose-500 text-white opacity-0 group-hover:opacity-100 hover:bg-rose-600 flex items-center justify-center shadow"
      >
        <Trash2 className="h-3 w-3" />
      </button>
      <div className="px-4 py-3">
        <BlockView block={block} accent={accent} />
      </div>
    </div>
  );
}

function BlockView({ block, accent }: { block: Block; accent: string }) {
  switch (block.kind) {
    case "titulo":
      return (
        <h2
          className={`text-3xl sm:text-4xl font-extrabold leading-tight text-slate-900 ${block.align === "center" ? "text-center" : ""}`}
          style={textStyle(block.style)}
        >
          {block.text}
        </h2>
      );
    case "paragrafo":
      return (
        <p className="text-slate-600 leading-relaxed" style={textStyle(block.style)}>
          {block.text}
        </p>
      );
    case "imagem":
      return block.url ? (
        <img src={block.url} alt={block.alt || ""} className="w-full rounded-xl" />
      ) : (
        <div className="w-full aspect-video rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
          <ImageIcon className="h-10 w-10" />
        </div>
      );
    case "escolha":
      return (
        <div>
          <p className="text-lg font-bold text-slate-900 mb-3">{block.question}</p>
          <div className="space-y-2">
            {block.options.map((o) => (
              <div
                key={o.id}
                className="rounded-full border-2 border-slate-200 px-5 py-3 flex items-center gap-3"
              >
                <span className="h-4 w-4 rounded-full border-2 border-slate-300 shrink-0" />
                <span className="text-slate-800">{o.text}</span>
              </div>
            ))}
          </div>
        </div>
      );
    case "sim-nao":
      return (
        <div>
          <p className="text-lg font-bold text-slate-900 mb-3">{block.question}</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-full border-2 border-slate-200 px-5 py-3 text-center font-medium">
              Sim
            </div>
            <div className="rounded-full border-2 border-slate-200 px-5 py-3 text-center font-medium">
              Não
            </div>
          </div>
        </div>
      );
    case "entrada":
      return (
        <div>
          <label className="text-xs font-semibold text-slate-600">
            {block.label}
            {block.required && " *"}
          </label>
          <div className="rounded-full border border-slate-200 px-5 h-12 mt-1 flex items-center text-slate-400 text-sm">
            {block.field === "email"
              ? "seu@email.com"
              : block.field === "whatsapp"
                ? "(11) 99999-9999"
                : "Seu nome"}
          </div>
        </div>
      );
    case "botao":
      return (
        <button
          className="w-full rounded-full h-[52px] py-3.5 text-white font-bold text-base shadow-sm"
          style={{ backgroundColor: accent, ...textStyle(block.style) }}
        >
          {block.text}
        </button>
      );
    case "espacador":
      return (
        <div
          style={{ height: block.height }}
          className="bg-slate-50/0 border border-dashed border-slate-200 rounded-md flex items-center justify-center text-[10px] text-slate-400"
        >
          Espaçador {block.height}px
        </div>
      );
    case "video":
      return block.url ? (
        <div className="w-full aspect-video rounded-xl overflow-hidden bg-black">
          {isYoutube(block.url) ? (
            <iframe
              src={toYoutubeEmbed(block.url)}
              className="w-full h-full"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video src={block.url} controls className="w-full h-full" />
          )}
        </div>
      ) : (
        <div className="w-full aspect-video rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
          <VideoIcon className="h-10 w-10" />
        </div>
      );
    case "escala":
      return (
        <div>
          <p className="text-lg font-bold text-slate-900 mb-3">{block.question}</p>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: block.max - block.min + 1 }).map((_, i) => (
              <div
                key={i}
                className="h-10 min-w-10 px-2 rounded-lg border-2 border-slate-200 flex items-center justify-center text-sm font-semibold text-slate-700"
              >
                {block.min + i}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[11px] text-slate-500 mt-2">
            <span>{block.minLabel}</span>
            <span>{block.maxLabel}</span>
          </div>
        </div>
      );
    case "multipla":
      return (
        <div>
          <p className="text-lg font-bold text-slate-900 mb-3">{block.question}</p>
          <div className="space-y-2">
            {block.options.map((o) => (
              <div
                key={o.id}
                className="rounded-xl border-2 border-slate-200 px-5 py-3 flex items-center gap-3"
              >
                <span className="h-4 w-4 rounded border-2 border-slate-300 shrink-0" />
                <span className="text-slate-800">{o.text}</span>
              </div>
            ))}
          </div>
        </div>
      );
    case "faq":
      return (
        <div className="space-y-2">
          {block.items.map((it) => (
            <div key={it.id} className="rounded-xl border border-slate-200 p-4">
              <p className="font-bold text-slate-900 flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-slate-500" /> {it.q}
              </p>
              <p className="text-sm text-slate-600 mt-1">{it.a}</p>
            </div>
          ))}
        </div>
      );
    case "loading":
      return (
        <div className="py-10 flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin" style={{ color: accent }} />
          <p className="text-slate-700 font-medium">{block.message}</p>
          <div className="w-full max-w-xs h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full w-2/3 rounded-full" style={{ backgroundColor: accent }} />
          </div>
        </div>
      );
    case "depoimento":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {block.items.map((t) => (
            <div key={t.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm overflow-hidden">
                  {t.avatarUrl ? (
                    <img src={t.avatarUrl} alt={t.name} className="h-full w-full object-cover" />
                  ) : (
                    t.name.charAt(0)
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-slate-900 truncate">{t.name}</p>
                  {t.role && <p className="text-[11px] text-slate-500 truncate">{t.role}</p>}
                </div>
              </div>
              {typeof t.rating === "number" && (
                <div className="flex gap-0.5 mb-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${i < (t.rating ?? 0) ? "fill-amber-400 text-amber-400" : "text-slate-300"}`}
                    />
                  ))}
                </div>
              )}
              <p className="text-sm text-slate-700">{t.text}</p>
            </div>
          ))}
        </div>
      );
    case "beneficio": {
      const colorMap: Record<string, string> = {
        green: "bg-emerald-500",
        blue: "bg-blue-600",
        red: "bg-red-600",
        amber: "bg-amber-500",
        slate: "bg-slate-700",
      };
      return (
        <div className="flex justify-center">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-white font-bold text-sm sm:text-base ${colorMap[block.color ?? "green"]}`}
          >
            <Check className="h-4 w-4" strokeWidth={3} /> {block.text}
          </span>
        </div>
      );
    }
  }
}

function isYoutube(url: string) {
  return /youtube\.com|youtu\.be/.test(url);
}
function toYoutubeEmbed(url: string) {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{6,})/);
  const id = m?.[1];
  return id ? `https://www.youtube.com/embed/${id}` : url;
}

// ============ Inspector ============

function Inspector({
  quiz,
  step,
  stepIdx,
  patchStep,
  selectedBlock,
  updateBlock,
}: {
  quiz: QuizConfig;
  step: Step;
  stepIdx: number;
  patchStep: (i: number, patch: Partial<Step>) => void;
  selectedBlock: Block | null;
  updateBlock: (id: string, patch: Partial<Block>) => void;
}) {
  return (
    <div className="w-[248px] xl:w-[280px] border-l border-slate-800 overflow-y-auto p-4 shrink-0 space-y-4">
      {/* Step settings */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Etapa</p>
        <div>
          <Label className="text-xs text-slate-400">Nome da etapa</Label>
          <Input
            value={step.name}
            onChange={(e) => patchStep(stepIdx, { name: e.target.value })}
            className="bg-slate-800 border-slate-700 text-white rounded-lg h-9"
          />
        </div>
      </div>

      {/* Block inspector */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
          {selectedBlock ? `Bloco: ${selectedBlock.kind}` : "Bloco"}
        </p>
        {selectedBlock ? (
          <BlockInspector block={selectedBlock} update={(p) => updateBlock(selectedBlock.id, p)} />
        ) : (
          <p className="text-xs text-slate-500">Selecione um bloco na tela para editar.</p>
        )}
      </div>
    </div>
  );
}

const TEXT_COLORS = [
  "#1e293b", "#475569", "#64748b", "#0f172a",
  "#2563eb", "#0ea5e9", "#10b981", "#059669",
  "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899",
  "#ffffff", "#f8fafc",
];

const BG_COLORS = [
  "transparent", "#ffffff", "#f8fafc", "#f1f5f9",
  "#dbeafe", "#ede9fe", "#fce7f3", "#d1fae5",
  "#fef3c7", "#fee2e2", "#e0e7ff",
];

const FONT_SIZES = [
  { value: "xs", label: "Extra pequeno" },
  { value: "sm", label: "Pequeno" },
  { value: "base", label: "Normal" },
  { value: "lg", label: "Grande" },
  { value: "xl", label: "Extra grande" },
  { value: "2xl", label: "2x" },
  { value: "3xl", label: "3x" },
  { value: "4xl", label: "4x" },
];

const FONT_WEIGHTS = [
  { value: "normal", label: "Normal" },
  { value: "500", label: "Medium" },
  { value: "600", label: "Semi Bold" },
  { value: "700", label: "Bold" },
  { value: "800", label: "Extra Bold" },
  { value: "900", label: "Black" },
];

function patchStyle(
  block: Block & { style?: TextStyle },
  update: (p: Partial<Block>) => void,
  patch: Partial<TextStyle>,
) {
  const s: TextStyle = { ...block.style, ...patch };
  const cleaned = Object.fromEntries(Object.entries(s).filter(([_, v]) => v !== undefined && v !== ""));
  update({ style: Object.keys(cleaned).length > 0 ? (cleaned as TextStyle) : undefined });
}

function TextStyleEditor({
  block,
  update,
}: {
  block: Block & { style?: TextStyle };
  update: (p: Partial<Block>) => void;
}) {
  const style = block.style ?? {};
  return (
    <div className="space-y-2 pt-2 border-t border-slate-800">
      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Estilo do texto</p>

      <Label className="text-xs text-slate-400">Cor do texto</Label>
      <div className="flex flex-wrap gap-1.5">
        {TEXT_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => patchStyle(block, update, { color: style.color === c ? undefined : c })}
            className="h-6 w-6 rounded-full border border-slate-600 shrink-0"
            style={{ backgroundColor: c, outline: style.color === c ? "2px solid #3b82f6" : undefined, outlineOffset: "1px" }}
          />
        ))}
      </div>

      <Label className="text-xs text-slate-400">Cor de fundo</Label>
      <div className="flex flex-wrap gap-1.5">
        {BG_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => patchStyle(block, update, { bgColor: style.bgColor === c ? undefined : c })}
            className="h-6 w-6 rounded border border-slate-600 shrink-0"
            style={{
              backgroundColor: c === "transparent" ? undefined : c,
              backgroundImage: c === "transparent" ? "linear-gradient(45deg, #e2e8f0 25%, transparent 25%, transparent 75%, #e2e8f0 75%), linear-gradient(45deg, #e2e8f0 25%, transparent 25%, transparent 75%, #e2e8f0 75%)" : undefined,
              backgroundSize: c === "transparent" ? "8px 8px" : undefined,
              backgroundPosition: c === "transparent" ? "0 0, 4px 4px" : undefined,
              outline: style.bgColor === c ? "2px solid #3b82f6" : undefined,
              outlineOffset: "1px",
            }}
          />
        ))}
      </div>

      <Label className="text-xs text-slate-400">Tamanho da fonte</Label>
      <Select
        value={style.fontSize ?? ""}
        onValueChange={(v) => patchStyle(block, update, { fontSize: (v || undefined) as TextStyle["fontSize"] })}
      >
        <SelectTrigger className="bg-slate-800 border-slate-700 text-white rounded-lg h-9">
          <SelectValue placeholder="Padrão" />
        </SelectTrigger>
        <SelectContent>
          {FONT_SIZES.map((f) => (
            <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Label className="text-xs text-slate-400">Peso da fonte</Label>
      <Select
        value={style.fontWeight ?? ""}
        onValueChange={(v) => patchStyle(block, update, { fontWeight: (v || undefined) as TextStyle["fontWeight"] })}
      >
        <SelectTrigger className="bg-slate-800 border-slate-700 text-white rounded-lg h-9">
          <SelectValue placeholder="Padrão" />
        </SelectTrigger>
        <SelectContent>
          {FONT_WEIGHTS.map((f) => (
            <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function BlockInspector({ block, update }: { block: Block; update: (p: Partial<Block>) => void }) {
  const Input2 = (p: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      {...p}
      className="w-full bg-slate-800 border border-slate-700 rounded-lg h-9 px-3 text-sm text-white outline-none focus:border-blue-500"
    />
  );
  const TA = (p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea
      {...p}
      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
    />
  );

  switch (block.kind) {
    case "titulo":
      return (
        <div className="space-y-2">
          <Label className="text-xs text-slate-400">Texto</Label>
          <Input2 value={block.text} onChange={(e) => update({ text: e.target.value })} />
          <Label className="text-xs text-slate-400">Alinhamento</Label>
          <Select
            value={block.align ?? "center"}
            onValueChange={(v) => update({ align: v as any })}
          >
            <SelectTrigger className="bg-slate-800 border-slate-700 text-white rounded-lg h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Esquerda</SelectItem>
              <SelectItem value="center">Centro</SelectItem>
            </SelectContent>
          </Select>
          <TextStyleEditor block={block} update={update} />
        </div>
      );
    case "paragrafo":
      return (
        <div className="space-y-2">
          <TA value={block.text} rows={4} onChange={(e) => update({ text: e.target.value })} />
          <TextStyleEditor block={block} update={update} />
        </div>
      );
    case "imagem":
      return (
        <div className="space-y-2">
          <Label className="text-xs text-slate-400">URL da imagem</Label>
          <Input2
            value={block.url}
            onChange={(e) => update({ url: e.target.value })}
            placeholder="https://..."
          />
          <Label className="text-xs text-slate-400">Texto alternativo</Label>
          <Input2 value={block.alt ?? ""} onChange={(e) => update({ alt: e.target.value })} />
        </div>
      );
    case "escolha":
      return (
        <div className="space-y-2">
          <Label className="text-xs text-slate-400">Pergunta</Label>
          <Input2 value={block.question} onChange={(e) => update({ question: e.target.value })} />
          <div className="flex items-center justify-between rounded-lg bg-slate-800 px-3 py-2">
            <span className="text-xs text-slate-300">Avançar automaticamente</span>
            <Switch
              checked={!!block.autoAdvance}
              onCheckedChange={(v) => update({ autoAdvance: v })}
            />
          </div>
          <Label className="text-xs text-slate-400">Opções (texto + pontos)</Label>
          {block.options.map((o, i) => (
            <div key={o.id} className="flex gap-1.5">
              <Input2
                value={o.text}
                onChange={(e) =>
                  update({
                    options: block.options.map((x) =>
                      x.id === o.id ? { ...x, text: e.target.value } : x,
                    ),
                  })
                }
              />
              <input
                type="number"
                min={0}
                max={10}
                value={o.points}
                onChange={(e) =>
                  update({
                    options: block.options.map((x) =>
                      x.id === o.id ? { ...x, points: Number(e.target.value) } : x,
                    ),
                  })
                }
                className="w-14 bg-slate-800 border border-slate-700 rounded-lg h-9 px-2 text-sm text-white text-center"
              />
              <button
                onClick={() => update({ options: block.options.filter((x) => x.id !== o.id) })}
                className="h-9 w-9 rounded-lg hover:bg-slate-800 text-rose-400 flex items-center justify-center"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              update({ options: [...block.options, { id: uid(), text: "Nova opção", points: 5 }] })
            }
            className="w-full rounded-lg border border-dashed border-slate-700 hover:border-blue-500 px-3 py-2 text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1"
          >
            <Plus className="h-3 w-3" /> Adicionar opção
          </button>
        </div>
      );
    case "sim-nao":
      return (
        <div className="space-y-2">
          <Label className="text-xs text-slate-400">Pergunta</Label>
          <Input2 value={block.question} onChange={(e) => update({ question: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-slate-400">Pts "Sim"</Label>
              <Input2
                type="number"
                value={block.yesPoints}
                onChange={(e) => update({ yesPoints: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label className="text-xs text-slate-400">Pts "Não"</Label>
              <Input2
                type="number"
                value={block.noPoints}
                onChange={(e) => update({ noPoints: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>
      );
    case "entrada":
      return (
        <div className="space-y-2">
          <Label className="text-xs text-slate-400">Tipo</Label>
          <Select value={block.field} onValueChange={(v) => update({ field: v as any })}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-white rounded-lg h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Nome</SelectItem>
              <SelectItem value="email">E-mail</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
            </SelectContent>
          </Select>
          <Label className="text-xs text-slate-400">Rótulo</Label>
          <Input2 value={block.label} onChange={(e) => update({ label: e.target.value })} />
          <div className="flex items-center justify-between rounded-lg bg-slate-800 px-3 py-2">
            <span className="text-xs text-slate-300">Obrigatório</span>
            <Switch checked={block.required} onCheckedChange={(v) => update({ required: v })} />
          </div>
        </div>
      );
    case "botao":
      return (
        <div className="space-y-2">
          <Label className="text-xs text-slate-400">Texto</Label>
          <Input2 value={block.text} onChange={(e) => update({ text: e.target.value })} />
          <Label className="text-xs text-slate-400">Ação</Label>
          <Select value={block.action} onValueChange={(v) => update({ action: v as any })}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-white rounded-lg h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="next">Próxima etapa</SelectItem>
              <SelectItem value="submit">Enviar (finalizar)</SelectItem>
            </SelectContent>
          </Select>
          <TextStyleEditor block={block} update={update} />
        </div>
      );
    case "espacador":
      return (
        <div>
          <Label className="text-xs text-slate-400">Altura (px)</Label>
          <Input2
            type="number"
            value={block.height}
            onChange={(e) => update({ height: Number(e.target.value) })}
          />
        </div>
      );
    case "video":
      return (
        <div className="space-y-2">
          <Label className="text-xs text-slate-400">URL do vídeo (YouTube ou MP4)</Label>
          <Input2
            value={block.url}
            onChange={(e) => update({ url: e.target.value })}
            placeholder="https://youtube.com/watch?v=..."
          />
          <Label className="text-xs text-slate-400">Legenda (opcional)</Label>
          <Input2 value={block.caption ?? ""} onChange={(e) => update({ caption: e.target.value })} />
        </div>
      );
    case "escala":
      return (
        <div className="space-y-2">
          <Label className="text-xs text-slate-400">Pergunta</Label>
          <Input2 value={block.question} onChange={(e) => update({ question: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-slate-400">Mín</Label>
              <Input2 type="number" value={block.min} onChange={(e) => update({ min: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs text-slate-400">Máx</Label>
              <Input2 type="number" value={block.max} onChange={(e) => update({ max: Number(e.target.value) })} />
            </div>
          </div>
          <Label className="text-xs text-slate-400">Rótulo mínimo</Label>
          <Input2 value={block.minLabel ?? ""} onChange={(e) => update({ minLabel: e.target.value })} />
          <Label className="text-xs text-slate-400">Rótulo máximo</Label>
          <Input2 value={block.maxLabel ?? ""} onChange={(e) => update({ maxLabel: e.target.value })} />
        </div>
      );
    case "multipla":
      return (
        <div className="space-y-2">
          <Label className="text-xs text-slate-400">Pergunta</Label>
          <Input2 value={block.question} onChange={(e) => update({ question: e.target.value })} />
          <Label className="text-xs text-slate-400">Opções (texto + pontos)</Label>
          {block.options.map((o) => (
            <div key={o.id} className="flex gap-1.5">
              <Input2
                value={o.text}
                onChange={(e) =>
                  update({
                    options: block.options.map((x) => (x.id === o.id ? { ...x, text: e.target.value } : x)),
                  })
                }
              />
              <input
                type="number"
                min={0}
                value={o.points}
                onChange={(e) =>
                  update({
                    options: block.options.map((x) =>
                      x.id === o.id ? { ...x, points: Number(e.target.value) } : x,
                    ),
                  })
                }
                className="w-14 bg-slate-800 border border-slate-700 rounded-lg h-9 px-2 text-sm text-white text-center"
              />
              <button
                onClick={() => update({ options: block.options.filter((x) => x.id !== o.id) })}
                className="h-9 w-9 rounded-lg hover:bg-slate-800 text-rose-400 flex items-center justify-center"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              update({ options: [...block.options, { id: uid(), text: "Nova opção", points: 3 }] })
            }
            className="w-full rounded-lg border border-dashed border-slate-700 hover:border-blue-500 px-3 py-2 text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1"
          >
            <Plus className="h-3 w-3" /> Adicionar opção
          </button>
        </div>
      );
    case "faq":
      return (
        <div className="space-y-2">
          {block.items.map((it) => (
            <div key={it.id} className="rounded-lg bg-slate-800 p-2 space-y-1.5">
              <Input2
                value={it.q}
                placeholder="Pergunta"
                onChange={(e) =>
                  update({
                    items: block.items.map((x) => (x.id === it.id ? { ...x, q: e.target.value } : x)),
                  })
                }
              />
              <TA
                value={it.a}
                rows={2}
                placeholder="Resposta"
                onChange={(e) =>
                  update({
                    items: block.items.map((x) => (x.id === it.id ? { ...x, a: e.target.value } : x)),
                  })
                }
              />
              <button
                onClick={() => update({ items: block.items.filter((x) => x.id !== it.id) })}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" /> Remover
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              update({ items: [...block.items, { id: uid(), q: "Nova pergunta", a: "Resposta" }] })
            }
            className="w-full rounded-lg border border-dashed border-slate-700 hover:border-blue-500 px-3 py-2 text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1"
          >
            <Plus className="h-3 w-3" /> Adicionar item
          </button>
        </div>
      );
    case "loading":
      return (
        <div className="space-y-2">
          <Label className="text-xs text-slate-400">Mensagem</Label>
          <Input2 value={block.message} onChange={(e) => update({ message: e.target.value })} />
          <Label className="text-xs text-slate-400">Duração (ms)</Label>
          <Input2
            type="number"
            value={block.durationMs}
            onChange={(e) => update({ durationMs: Number(e.target.value) })}
          />
          <p className="text-[11px] text-slate-500">Avança automaticamente para a próxima etapa.</p>
        </div>
      );
    case "depoimento":
      return (
        <div className="space-y-2">
          {block.items.map((t) => (
            <div key={t.id} className="rounded-lg bg-slate-800 p-2 space-y-1.5">
              <Input2
                value={t.name}
                placeholder="Nome"
                onChange={(e) =>
                  update({
                    items: block.items.map((x) => (x.id === t.id ? { ...x, name: e.target.value } : x)),
                  })
                }
              />
              <Input2
                value={t.role ?? ""}
                placeholder="Cargo / contexto"
                onChange={(e) =>
                  update({
                    items: block.items.map((x) => (x.id === t.id ? { ...x, role: e.target.value } : x)),
                  })
                }
              />
              <Input2
                value={t.avatarUrl ?? ""}
                placeholder="URL da foto (opcional)"
                onChange={(e) =>
                  update({
                    items: block.items.map((x) => (x.id === t.id ? { ...x, avatarUrl: e.target.value } : x)),
                  })
                }
              />
              <TA
                value={t.text}
                rows={2}
                placeholder="Depoimento"
                onChange={(e) =>
                  update({
                    items: block.items.map((x) => (x.id === t.id ? { ...x, text: e.target.value } : x)),
                  })
                }
              />
              <div className="flex items-center gap-2">
                <Label className="text-xs text-slate-400">Estrelas</Label>
                <input
                  type="number"
                  min={0}
                  max={5}
                  value={t.rating ?? 5}
                  onChange={(e) =>
                    update({
                      items: block.items.map((x) =>
                        x.id === t.id ? { ...x, rating: Number(e.target.value) } : x,
                      ),
                    })
                  }
                  className="w-14 bg-slate-800 border border-slate-700 rounded-lg h-9 px-2 text-sm text-white text-center"
                />
                <button
                  onClick={() => update({ items: block.items.filter((x) => x.id !== t.id) })}
                  className="ml-auto text-rose-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={() =>
              update({
                items: [
                  ...block.items,
                  { id: uid(), name: "Novo cliente", text: "Ótima experiência!", rating: 5 },
                ],
              })
            }
            className="w-full rounded-lg border border-dashed border-slate-700 hover:border-blue-500 px-3 py-2 text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1"
          >
            <Plus className="h-3 w-3" /> Adicionar depoimento
          </button>
        </div>
      );
    case "beneficio":
      return (
        <div className="space-y-2">
          <Label className="text-xs text-slate-400">Texto do benefício</Label>
          <Input2 value={block.text} onChange={(e) => update({ text: e.target.value })} />
          <Label className="text-xs text-slate-400">Cor</Label>
          <Select value={block.color ?? "green"} onValueChange={(v) => update({ color: v as any })}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-white rounded-lg h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="green">Verde</SelectItem>
              <SelectItem value="blue">Azul</SelectItem>
              <SelectItem value="red">Vermelho</SelectItem>
              <SelectItem value="amber">Âmbar</SelectItem>
              <SelectItem value="slate">Cinza</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[11px] text-slate-500">Pílula com ✅ no estilo XQuiz/Exodus.</p>
        </div>
      );
  }
}

// ============ Other tabs ============

function FluxoTab({ quiz }: { quiz: QuizConfig }) {
  return (
    <div className="flex-1 overflow-y-auto p-8 bg-slate-900/40">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold mb-1">Fluxo do quiz</h2>
        <p className="text-sm text-slate-400 mb-6">
          Visualize a sequência de etapas que o lead vai percorrer.
        </p>
        <div className="space-y-3">
          {quiz.steps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3">
              <div className="rounded-xl bg-slate-800 border border-slate-700 px-5 py-4 flex-1">
                <p className="text-xs text-slate-500">Etapa {i + 1}</p>
                <p className="font-semibold text-white">{s.name}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {s.blocks.length} bloco{s.blocks.length !== 1 ? "s" : ""}
                </p>
              </div>
              {i < quiz.steps.length - 1 && <div className="text-slate-500">↓</div>}
            </div>
          ))}
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-5 py-4 mt-4">
            <p className="text-xs text-emerald-400">Final</p>
            <p className="font-semibold text-white">Tela de resultado</p>
            <p className="text-xs text-slate-400 mt-1">
              {quiz.ranges.length} faixa{quiz.ranges.length !== 1 ? "s" : ""} de pontuação
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DesignTab({
  quiz,
  patchQuiz,
}: {
  quiz: QuizConfig;
  patchQuiz: (p: Partial<QuizConfig>) => void;
}) {
  const accents = [
    "#2563eb",
    "#0ea5e9",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
    "#facc15",
  ];
  return (
    <div className="flex-1 overflow-y-auto p-8 bg-slate-900/40">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-1">Design</h2>
        <p className="text-sm text-slate-400 mb-6">Personalize a aparência do quiz.</p>

        <div className="rounded-xl bg-slate-800 border border-slate-700 p-5 space-y-4">
          <div>
            <Label className="text-sm text-slate-300">Cor principal</Label>
            <div className="flex gap-2 mt-2 flex-wrap">
              {accents.map((c) => (
                <button
                  key={c}
                  onClick={() => patchQuiz({ accent: c })}
                  className={`h-10 w-10 rounded-full border-2 transition ${quiz.accent === c ? "border-white scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="pt-2">
            <Label className="text-sm text-slate-300">Largura máxima do quiz</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {[
                { label: "Estreito", value: "narrow" as const, desc: "448px" },
                { label: "Padrão", value: "medium" as const, desc: "576px" },
                { label: "Largo", value: "wide" as const, desc: "768px" },
              ].map((opt) => {
                const active = quiz.width === opt.value || (!quiz.width && opt.value === "medium");
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => patchQuiz({ width: opt.value })}
                    className={`py-2.5 px-3 rounded-lg border text-center transition flex flex-col items-center justify-center gap-0.5 ${
                      active
                        ? "bg-blue-600 border-blue-600 text-white font-semibold"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <span className="text-xs">{opt.label}</span>
                    <span className="text-[10px] opacity-70 font-normal">{opt.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-slate-900 px-3 py-2">
            <span className="text-sm text-slate-300">Mostrar logo</span>
            <Switch checked={quiz.showLogo} onCheckedChange={(v) => patchQuiz({ showLogo: v })} />
          </div>
          <div className="flex items-center justify-between rounded-lg bg-slate-900 px-3 py-2">
            <span className="text-sm text-slate-300">Mostrar barra de progresso</span>
            <Switch
              checked={quiz.showProgress}
              onCheckedChange={(v) => patchQuiz({ showProgress: v })}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg bg-slate-900 px-3 py-2">
            <span className="text-sm text-slate-300">Permitir voltar etapas</span>
            <Switch checked={quiz.allowBack} onCheckedChange={(v) => patchQuiz({ allowBack: v })} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfigTab({
  quiz,
  patchQuiz,
}: {
  quiz: QuizConfig;
  patchQuiz: (p: Partial<QuizConfig>) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto p-8 bg-slate-900/40">
      <div className="max-w-2xl mx-auto space-y-5">
        <div>
          <h2 className="text-2xl font-bold mb-1">Configurações</h2>
          <p className="text-sm text-slate-400">Dados gerais e faixas de resultado.</p>
        </div>

        <div className="rounded-xl bg-slate-800 border border-slate-700 p-5 space-y-3">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Geral</p>
          <div>
            <Label className="text-xs text-slate-400">Título</Label>
            <Input
              value={quiz.title}
              onChange={(e) => patchQuiz({ title: e.target.value })}
              className="bg-slate-900 border-slate-700 text-white rounded-lg h-9"
            />
          </div>
          <div>
            <Label className="text-xs text-slate-400">Descrição</Label>
            <Textarea
              value={quiz.description}
              rows={2}
              onChange={(e) => patchQuiz({ description: e.target.value })}
              className="bg-slate-900 border-slate-700 text-white rounded-lg"
            />
          </div>
          <div>
            <Label className="text-xs text-slate-400">URL pública (slug)</Label>
            <div className="flex items-center gap-2 rounded-lg bg-slate-900 border border-slate-700 px-3 h-9">
              <span className="text-xs text-slate-500">/quiz/</span>
              <input
                value={quiz.slug}
                onChange={(e) =>
                  patchQuiz({ slug: e.target.value.replace(/[^a-z0-9-]/gi, "-").toLowerCase() })
                }
                className="flex-1 bg-transparent outline-none text-sm text-white"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-slate-400">Oferta vinculada</Label>
            <Input
              value={quiz.offer}
              onChange={(e) => patchQuiz({ offer: e.target.value })}
              className="bg-slate-900 border-slate-700 text-white rounded-lg h-9"
            />
          </div>
        </div>

        <div className="rounded-xl bg-slate-800 border border-slate-700 p-5 space-y-3">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
            Faixas de resultado
          </p>
          {quiz.ranges.map((r, i) => (
            <div
              key={r.id}
              className="rounded-lg bg-slate-900 border border-slate-700 p-3 space-y-2"
            >
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="text-xs text-slate-400">Faixa {String.fromCharCode(65 + i)}</span>
                <button
                  className="ml-auto text-rose-400"
                  onClick={() => patchQuiz({ ranges: quiz.ranges.filter((x) => x.id !== r.id) })}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={r.min}
                  placeholder="Min"
                  onChange={(e) =>
                    patchQuiz({
                      ranges: quiz.ranges.map((x) =>
                        x.id === r.id ? { ...x, min: Number(e.target.value) } : x,
                      ),
                    })
                  }
                  className="bg-slate-800 border border-slate-700 rounded-lg h-9 px-3 text-sm text-white"
                />
                <input
                  type="number"
                  value={r.max}
                  placeholder="Max"
                  onChange={(e) =>
                    patchQuiz({
                      ranges: quiz.ranges.map((x) =>
                        x.id === r.id ? { ...x, max: Number(e.target.value) } : x,
                      ),
                    })
                  }
                  className="bg-slate-800 border border-slate-700 rounded-lg h-9 px-3 text-sm text-white"
                />
              </div>
              <input
                value={r.profile}
                placeholder="Nome do perfil"
                onChange={(e) =>
                  patchQuiz({
                    ranges: quiz.ranges.map((x) =>
                      x.id === r.id ? { ...x, profile: e.target.value } : x,
                    ),
                  })
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-lg h-9 px-3 text-sm text-white"
              />
              <textarea
                value={r.message}
                placeholder="Mensagem"
                rows={2}
                onChange={(e) =>
                  patchQuiz({
                    ranges: quiz.ranges.map((x) =>
                      x.id === r.id ? { ...x, message: e.target.value } : x,
                    ),
                  })
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={r.ctaText ?? ""}
                  placeholder="Texto do CTA"
                  onChange={(e) =>
                    patchQuiz({
                      ranges: quiz.ranges.map((x) =>
                        x.id === r.id ? { ...x, ctaText: e.target.value } : x,
                      ),
                    })
                  }
                  className="bg-slate-800 border border-slate-700 rounded-lg h-9 px-3 text-sm text-white"
                />
                <input
                  value={r.ctaUrl ?? ""}
                  placeholder="URL do CTA"
                  onChange={(e) =>
                    patchQuiz({
                      ranges: quiz.ranges.map((x) =>
                        x.id === r.id ? { ...x, ctaUrl: e.target.value } : x,
                      ),
                    })
                  }
                  className="bg-slate-800 border border-slate-700 rounded-lg h-9 px-3 text-sm text-white"
                />
              </div>
            </div>
          ))}
          <button
            onClick={() =>
              patchQuiz({
                ranges: [
                  ...quiz.ranges,
                  {
                    id: uid(),
                    min: 0,
                    max: 0,
                    profile: "",
                    message: "",
                    offer: "",
                    ctaText: "",
                    ctaUrl: "",
                  },
                ],
              })
            }
            className="w-full rounded-lg border border-dashed border-slate-700 hover:border-blue-500 px-3 py-2 text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1"
          >
            <Plus className="h-3 w-3" /> Adicionar faixa
          </button>
        </div>
      </div>
    </div>
  );
}

function LeadsTab({ quizId }: { quizId: string }) {
  return (
    <div className="flex-1 overflow-y-auto p-8 bg-slate-900/40">
      <div className="max-w-3xl mx-auto text-center py-20">
        <UsersRound className="h-12 w-12 mx-auto text-slate-600 mb-3" />
        <p className="text-slate-400">Os leads aparecem aqui após responderem o quiz.</p>
        <p className="text-xs text-slate-500 mt-1">
          Veja todos na aba "Leads" do painel principal.
        </p>
      </div>
    </div>
  );
}

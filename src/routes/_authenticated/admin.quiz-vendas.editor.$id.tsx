import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  X, Undo2, Redo2, Hammer, GitBranch, Palette, UsersRound, Settings2,
  Play, ExternalLink, Save, Plus, Trash2, GripVertical, ChevronUp, ChevronDown,
  Type, AlignLeft, Image as ImageIcon, ListChecks, MousePointerClick,
  ArrowDownToLine, SeparatorHorizontal, Check, MoreVertical, Eye,
} from "lucide-react";
import {
  getQuiz, upsertQuiz, uid,
  type QuizConfig, type Step, type Block, type BlockKind,
} from "@/lib/quiz-store";

export const Route = createFileRoute("/_authenticated/admin/quiz-vendas/editor/$id")({
  component: QuizEditor,
});

type TabKey = "construtor" | "fluxo" | "design" | "leads" | "config";

const BLOCK_LIB: { kind: BlockKind; label: string; icon: typeof Type }[] = [
  { kind: "titulo", label: "Título", icon: Type },
  { kind: "paragrafo", label: "Parágrafo", icon: AlignLeft },
  { kind: "imagem", label: "Imagem", icon: ImageIcon },
  { kind: "escolha", label: "Escolha", icon: ListChecks },
  { kind: "sim-nao", label: "Sim / Não", icon: Check },
  { kind: "entrada", label: "Entrada", icon: ArrowDownToLine },
  { kind: "botao", label: "Botão", icon: MousePointerClick },
  { kind: "espacador", label: "Espaçador", icon: SeparatorHorizontal },
];

function makeBlock(kind: BlockKind): Block {
  const id = uid();
  switch (kind) {
    case "titulo": return { id, kind, text: "Novo título", align: "center" };
    case "paragrafo": return { id, kind, text: "Escreva um parágrafo aqui." };
    case "imagem": return { id, kind, url: "", alt: "" };
    case "escolha": return { id, kind, question: "Nova pergunta?", autoAdvance: true, options: [
      { id: uid(), text: "Opção 1", points: 5 },
      { id: uid(), text: "Opção 2", points: 5 },
    ]};
    case "sim-nao": return { id, kind, question: "Sim ou não?", yesPoints: 10, noPoints: 0 };
    case "entrada": return { id, kind, field: "name", label: "Nome", required: true };
    case "botao": return { id, kind, text: "Continuar", action: "next" };
    case "espacador": return { id, kind, height: 24 };
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
          <Button onClick={() => navigate({ to: "/admin/quiz-vendas" })} className="rounded-full bg-blue-600 hover:bg-blue-700">
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
  }
  function publish() {
    if (!quiz) return;
    const updated = { ...quiz, status: "ativo" as const };
    upsertQuiz(updated);
    setQuiz(updated);
    setDirty(false);
  }
  function openPublic() {
    if (!quiz) return;
    if (dirty) save();
    window.open(`/quiz/${quiz.slug}`, "_blank");
  }

  return (
    <div className="fixed inset-0 bg-slate-950 text-white flex flex-col">
      {/* Top toolbar */}
      <div className="h-14 border-b border-slate-800 flex items-center px-3 gap-2 shrink-0">
        <button
          onClick={() => { if (dirty) save(); navigate({ to: "/admin/quiz-vendas" }); }}
          className="h-10 w-10 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-400"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-1 ml-1">
          <ToolBtn icon={Undo2} />
          <ToolBtn icon={Redo2} />
        </div>

        <div className="flex-1 flex items-center justify-center gap-1">
          <TabPill active={tab === "construtor"} onClick={() => setTab("construtor")} icon={Hammer} label="Construtor" />
          <TabPill active={tab === "fluxo"} onClick={() => setTab("fluxo")} icon={GitBranch} label="Fluxo" />
          <TabPill active={tab === "design"} onClick={() => setTab("design")} icon={Palette} label="Design" />
          <TabPill active={tab === "leads"} onClick={() => setTab("leads")} icon={UsersRound} label="Leads" />
          <TabPill active={tab === "config"} onClick={() => setTab("config")} icon={Settings2} label="Configurações" />
        </div>

        <div className="flex items-center gap-2">
          <ToolBtn icon={Eye} onClick={openPublic} title="Pré-visualizar" />
          <ToolBtn icon={Play} onClick={openPublic} title="Testar" />
          <Button
            variant="ghost"
            className="rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white h-10"
            onClick={save}
          >
            <Save className="h-4 w-4 mr-1.5" /> {dirty ? "Salvar*" : "Salvo"}
          </Button>
          <Button onClick={publish} className="rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white h-10 px-5">
            Publicar
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex min-h-0">
        {tab === "construtor" && (
          <>
            {/* Steps sidebar */}
            <StepsSidebar
              quiz={quiz}
              stepIdx={stepIdx}
              setStepIdx={setStepIdx}
              addStep={addStep}
              removeStep={removeStep}
              moveStep={moveStep}
              patchStep={patchStep}
            />

            {/* Block library */}
            <div className="w-[180px] border-r border-slate-800 overflow-y-auto p-3 shrink-0">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2 px-2">Componentes</p>
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

            {/* Canvas */}
            <div className="flex-1 min-w-0 bg-slate-900/50 overflow-auto p-4 flex items-start justify-center">
              <Canvas
                quiz={quiz}
                step={step}
                stepIdx={stepIdx}
                selectedBlockId={selectedBlockId}
                setSelectedBlockId={setSelectedBlockId}
                removeBlock={removeBlock}
              />
            </div>

            {/* Inspector */}
            <Inspector
              quiz={quiz}
              step={step}
              stepIdx={stepIdx}
              patchStep={patchStep}
              selectedBlock={selectedBlock}
              updateBlock={updateBlock}
            />
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

function ToolBtn({ icon: Icon, onClick, title }: { icon: typeof X; onClick?: () => void; title?: string }) {
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

function TabPill({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof X; label: string }) {
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
  quiz, stepIdx, setStepIdx, addStep, removeStep, moveStep, patchStep,
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
    <div className="w-[160px] border-r border-slate-800 overflow-y-auto p-3 shrink-0">
      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2 px-2">Etapas</p>
      <div className="space-y-1">
        {quiz.steps.map((s, i) => {
          const active = i === stepIdx;
          return (
            <div key={s.id} className="relative">
              <button
                onClick={() => setStepIdx(i)}
                className={`group w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition ${
                  active ? "bg-slate-800 ring-1 ring-blue-500 text-white" : "text-slate-300 hover:bg-slate-800/60"
                }`}
              >
                <GripVertical className="h-3.5 w-3.5 text-slate-500" />
                <span className="flex-1 text-left truncate">{s.name}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuFor(menuFor === s.id ? null : s.id); }}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white p-1"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </button>
              </button>
              {menuFor === s.id && (
                <div className="absolute z-20 right-0 top-9 w-40 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 text-sm">
                  <MenuItem icon={ChevronUp} label="Mover para cima" onClick={() => { moveStep(i, -1); setMenuFor(null); }} />
                  <MenuItem icon={ChevronDown} label="Mover para baixo" onClick={() => { moveStep(i, 1); setMenuFor(null); }} />
                  <div className="my-1 border-t border-slate-800" />
                  <MenuItem icon={Trash2} label="Excluir" danger onClick={() => { removeStep(i); setMenuFor(null); }} />
                </div>
              )}
            </div>
          );
        })}
        <button onClick={addStep} className="w-full mt-2 flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-700 hover:border-blue-500 hover:bg-slate-800 px-2 py-2 text-sm text-slate-400 hover:text-white">
          <Plus className="h-4 w-4" /> Adicionar Etapa
        </button>
      </div>
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger }: { icon: typeof X; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-800 ${danger ? "text-rose-400" : "text-slate-200"}`}>
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

// ============ Canvas ============

function Canvas({
  quiz, step, stepIdx, selectedBlockId, setSelectedBlockId, removeBlock,
}: {
  quiz: QuizConfig;
  step: Step;
  stepIdx: number;
  selectedBlockId: string | null;
  setSelectedBlockId: (id: string | null) => void;
  removeBlock: (id: string) => void;
}) {
  const progress = ((stepIdx + 1) / quiz.steps.length) * 100;
  return (
    <div className="w-full max-w-xl bg-white text-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-800">
      {quiz.showProgress && (
        <div className="h-1.5 bg-slate-100">
          <div className="h-full transition-all" style={{ width: `${progress}%`, backgroundColor: quiz.accent }} />
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
  block, accent, selected, onSelect, onRemove,
}: {
  block: Block; accent: string; selected: boolean; onSelect: () => void; onRemove: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`group relative rounded-xl transition cursor-pointer ${
        selected ? "ring-2 ring-blue-500 ring-offset-2" : "hover:ring-1 hover:ring-slate-200"
      }`}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="absolute -top-2 -right-2 z-10 h-6 w-6 rounded-full bg-rose-500 text-white opacity-0 group-hover:opacity-100 hover:bg-rose-600 flex items-center justify-center shadow"
      >
        <Trash2 className="h-3 w-3" />
      </button>
      <BlockView block={block} accent={accent} />
    </div>
  );
}

function BlockView({ block, accent }: { block: Block; accent: string }) {
  switch (block.kind) {
    case "titulo":
      return <h2 className={`text-3xl sm:text-4xl font-extrabold leading-tight text-slate-900 ${block.align === "center" ? "text-center" : ""}`}>{block.text}</h2>;
    case "paragrafo":
      return <p className="text-slate-600 leading-relaxed">{block.text}</p>;
    case "imagem":
      return block.url
        ? <img src={block.url} alt={block.alt || ""} className="w-full rounded-xl" />
        : <div className="w-full aspect-video rounded-xl bg-slate-100 flex items-center justify-center text-slate-400"><ImageIcon className="h-10 w-10" /></div>;
    case "escolha":
      return (
        <div>
          <p className="text-lg font-bold text-slate-900 mb-3">{block.question}</p>
          <div className="space-y-2">
            {block.options.map((o) => (
              <div key={o.id} className="rounded-full border-2 border-slate-200 px-5 py-3 flex items-center gap-3">
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
            <div className="rounded-full border-2 border-slate-200 px-5 py-3 text-center font-medium">Sim</div>
            <div className="rounded-full border-2 border-slate-200 px-5 py-3 text-center font-medium">Não</div>
          </div>
        </div>
      );
    case "entrada":
      return (
        <div>
          <label className="text-xs font-semibold text-slate-600">{block.label}{block.required && " *"}</label>
          <div className="rounded-full border border-slate-200 px-5 h-12 mt-1 flex items-center text-slate-400 text-sm">
            {block.field === "email" ? "seu@email.com" : block.field === "whatsapp" ? "(11) 99999-9999" : "Seu nome"}
          </div>
        </div>
      );
    case "botao":
      return (
        <button className="w-full rounded-full h-13 py-3.5 text-white font-bold text-base shadow-sm" style={{ backgroundColor: accent }}>
          {block.text}
        </button>
      );
    case "espacador":
      return <div style={{ height: block.height }} className="bg-slate-50/0 border border-dashed border-slate-200 rounded-md flex items-center justify-center text-[10px] text-slate-400">Espaçador {block.height}px</div>;
  }
}

// ============ Inspector ============

function Inspector({
  quiz, step, stepIdx, patchStep, selectedBlock, updateBlock,
}: {
  quiz: QuizConfig;
  step: Step;
  stepIdx: number;
  patchStep: (i: number, patch: Partial<Step>) => void;
  selectedBlock: Block | null;
  updateBlock: (id: string, patch: Partial<Block>) => void;
}) {
  return (
    <div className="w-[280px] border-l border-slate-800 overflow-y-auto p-4 shrink-0 space-y-4">
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
        {selectedBlock ? <BlockInspector block={selectedBlock} update={(p) => updateBlock(selectedBlock.id, p)} />
          : <p className="text-xs text-slate-500">Selecione um bloco na tela para editar.</p>}
      </div>
    </div>
  );
}

function BlockInspector({ block, update }: { block: Block; update: (p: Partial<Block>) => void }) {
  const Input2 = (p: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...p} className="w-full bg-slate-800 border border-slate-700 rounded-lg h-9 px-3 text-sm text-white outline-none focus:border-blue-500" />
  );
  const TA = (p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea {...p} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500" />
  );

  switch (block.kind) {
    case "titulo":
      return (
        <div className="space-y-2">
          <Label className="text-xs text-slate-400">Texto</Label>
          <Input2 value={block.text} onChange={(e) => update({ text: e.target.value })} />
          <Label className="text-xs text-slate-400">Alinhamento</Label>
          <Select value={block.align ?? "center"} onValueChange={(v) => update({ align: v as any })}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-white rounded-lg h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Esquerda</SelectItem>
              <SelectItem value="center">Centro</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    case "paragrafo":
      return <TA value={block.text} rows={4} onChange={(e) => update({ text: e.target.value })} />;
    case "imagem":
      return (
        <div className="space-y-2">
          <Label className="text-xs text-slate-400">URL da imagem</Label>
          <Input2 value={block.url} onChange={(e) => update({ url: e.target.value })} placeholder="https://..." />
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
            <Switch checked={!!block.autoAdvance} onCheckedChange={(v) => update({ autoAdvance: v })} />
          </div>
          <Label className="text-xs text-slate-400">Opções (texto + pontos)</Label>
          {block.options.map((o, i) => (
            <div key={o.id} className="flex gap-1.5">
              <Input2 value={o.text} onChange={(e) => update({ options: block.options.map((x) => x.id === o.id ? { ...x, text: e.target.value } : x) })} />
              <input type="number" min={0} max={10} value={o.points}
                onChange={(e) => update({ options: block.options.map((x) => x.id === o.id ? { ...x, points: Number(e.target.value) } : x) })}
                className="w-14 bg-slate-800 border border-slate-700 rounded-lg h-9 px-2 text-sm text-white text-center" />
              <button onClick={() => update({ options: block.options.filter((x) => x.id !== o.id) })}
                className="h-9 w-9 rounded-lg hover:bg-slate-800 text-rose-400 flex items-center justify-center">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <button
            onClick={() => update({ options: [...block.options, { id: uid(), text: "Nova opção", points: 5 }] })}
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
            <div><Label className="text-xs text-slate-400">Pts "Sim"</Label><Input2 type="number" value={block.yesPoints} onChange={(e) => update({ yesPoints: Number(e.target.value) })} /></div>
            <div><Label className="text-xs text-slate-400">Pts "Não"</Label><Input2 type="number" value={block.noPoints} onChange={(e) => update({ noPoints: Number(e.target.value) })} /></div>
          </div>
        </div>
      );
    case "entrada":
      return (
        <div className="space-y-2">
          <Label className="text-xs text-slate-400">Tipo</Label>
          <Select value={block.field} onValueChange={(v) => update({ field: v as any })}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-white rounded-lg h-9"><SelectValue /></SelectTrigger>
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
            <SelectTrigger className="bg-slate-800 border-slate-700 text-white rounded-lg h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="next">Próxima etapa</SelectItem>
              <SelectItem value="submit">Enviar (finalizar)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    case "espacador":
      return (
        <div>
          <Label className="text-xs text-slate-400">Altura (px)</Label>
          <Input2 type="number" value={block.height} onChange={(e) => update({ height: Number(e.target.value) })} />
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
        <p className="text-sm text-slate-400 mb-6">Visualize a sequência de etapas que o lead vai percorrer.</p>
        <div className="space-y-3">
          {quiz.steps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3">
              <div className="rounded-xl bg-slate-800 border border-slate-700 px-5 py-4 flex-1">
                <p className="text-xs text-slate-500">Etapa {i + 1}</p>
                <p className="font-semibold text-white">{s.name}</p>
                <p className="text-xs text-slate-400 mt-1">{s.blocks.length} bloco{s.blocks.length !== 1 ? "s" : ""}</p>
              </div>
              {i < quiz.steps.length - 1 && <div className="text-slate-500">↓</div>}
            </div>
          ))}
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-5 py-4 mt-4">
            <p className="text-xs text-emerald-400">Final</p>
            <p className="font-semibold text-white">Tela de resultado</p>
            <p className="text-xs text-slate-400 mt-1">{quiz.ranges.length} faixa{quiz.ranges.length !== 1 ? "s" : ""} de pontuação</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DesignTab({ quiz, patchQuiz }: { quiz: QuizConfig; patchQuiz: (p: Partial<QuizConfig>) => void }) {
  const accents = ["#2563eb", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#facc15"];
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
                <button key={c} onClick={() => patchQuiz({ accent: c })}
                  className={`h-10 w-10 rounded-full border-2 transition ${quiz.accent === c ? "border-white scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-slate-900 px-3 py-2">
            <span className="text-sm text-slate-300">Mostrar logo</span>
            <Switch checked={quiz.showLogo} onCheckedChange={(v) => patchQuiz({ showLogo: v })} />
          </div>
          <div className="flex items-center justify-between rounded-lg bg-slate-900 px-3 py-2">
            <span className="text-sm text-slate-300">Mostrar barra de progresso</span>
            <Switch checked={quiz.showProgress} onCheckedChange={(v) => patchQuiz({ showProgress: v })} />
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

function ConfigTab({ quiz, patchQuiz }: { quiz: QuizConfig; patchQuiz: (p: Partial<QuizConfig>) => void }) {
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
            <Input value={quiz.title} onChange={(e) => patchQuiz({ title: e.target.value })} className="bg-slate-900 border-slate-700 text-white rounded-lg h-9" />
          </div>
          <div>
            <Label className="text-xs text-slate-400">Descrição</Label>
            <Textarea value={quiz.description} rows={2} onChange={(e) => patchQuiz({ description: e.target.value })} className="bg-slate-900 border-slate-700 text-white rounded-lg" />
          </div>
          <div>
            <Label className="text-xs text-slate-400">URL pública (slug)</Label>
            <div className="flex items-center gap-2 rounded-lg bg-slate-900 border border-slate-700 px-3 h-9">
              <span className="text-xs text-slate-500">/quiz/</span>
              <input value={quiz.slug} onChange={(e) => patchQuiz({ slug: e.target.value.replace(/[^a-z0-9-]/gi, "-").toLowerCase() })}
                className="flex-1 bg-transparent outline-none text-sm text-white" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-slate-400">Oferta vinculada</Label>
            <Input value={quiz.offer} onChange={(e) => patchQuiz({ offer: e.target.value })} className="bg-slate-900 border-slate-700 text-white rounded-lg h-9" />
          </div>
        </div>

        <div className="rounded-xl bg-slate-800 border border-slate-700 p-5 space-y-3">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Faixas de resultado</p>
          {quiz.ranges.map((r, i) => (
            <div key={r.id} className="rounded-lg bg-slate-900 border border-slate-700 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">{String.fromCharCode(65 + i)}</span>
                <span className="text-xs text-slate-400">Faixa {String.fromCharCode(65 + i)}</span>
                <button className="ml-auto text-rose-400" onClick={() => patchQuiz({ ranges: quiz.ranges.filter((x) => x.id !== r.id) })}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" value={r.min} placeholder="Min"
                  onChange={(e) => patchQuiz({ ranges: quiz.ranges.map((x) => x.id === r.id ? { ...x, min: Number(e.target.value) } : x) })}
                  className="bg-slate-800 border border-slate-700 rounded-lg h-9 px-3 text-sm text-white" />
                <input type="number" value={r.max} placeholder="Max"
                  onChange={(e) => patchQuiz({ ranges: quiz.ranges.map((x) => x.id === r.id ? { ...x, max: Number(e.target.value) } : x) })}
                  className="bg-slate-800 border border-slate-700 rounded-lg h-9 px-3 text-sm text-white" />
              </div>
              <input value={r.profile} placeholder="Nome do perfil"
                onChange={(e) => patchQuiz({ ranges: quiz.ranges.map((x) => x.id === r.id ? { ...x, profile: e.target.value } : x) })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg h-9 px-3 text-sm text-white" />
              <textarea value={r.message} placeholder="Mensagem" rows={2}
                onChange={(e) => patchQuiz({ ranges: quiz.ranges.map((x) => x.id === r.id ? { ...x, message: e.target.value } : x) })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
              <div className="grid grid-cols-2 gap-2">
                <input value={r.ctaText ?? ""} placeholder="Texto do CTA"
                  onChange={(e) => patchQuiz({ ranges: quiz.ranges.map((x) => x.id === r.id ? { ...x, ctaText: e.target.value } : x) })}
                  className="bg-slate-800 border border-slate-700 rounded-lg h-9 px-3 text-sm text-white" />
                <input value={r.ctaUrl ?? ""} placeholder="URL do CTA"
                  onChange={(e) => patchQuiz({ ranges: quiz.ranges.map((x) => x.id === r.id ? { ...x, ctaUrl: e.target.value } : x) })}
                  className="bg-slate-800 border border-slate-700 rounded-lg h-9 px-3 text-sm text-white" />
              </div>
            </div>
          ))}
          <button
            onClick={() => patchQuiz({ ranges: [...quiz.ranges, { id: uid(), min: 0, max: 0, profile: "", message: "", offer: "", ctaText: "", ctaUrl: "" }] })}
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
        <p className="text-xs text-slate-500 mt-1">Veja todos na aba "Leads" do painel principal.</p>
      </div>
    </div>
  );
}
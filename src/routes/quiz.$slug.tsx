import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { addLead, getQuizBySlug, type Block, type QuizConfig, type Range, type TextStyle } from "@/lib/quiz-store";
import { fetchPublicQuizBySlug } from "@/lib/quiz.functions";
import { Loader2, HelpCircle, Star, ChevronDown } from "lucide-react";
import { Check } from "lucide-react";

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

function textStyle(s?: TextStyle): React.CSSProperties {
  if (!s) return {};
  return {
    color: s.color,
    fontWeight: s.fontWeight as React.CSSProperties["fontWeight"],
    fontSize: s.fontSize ? fontSizeMap[s.fontSize] : undefined,
    backgroundColor: s.bgColor,
  };
}

// Inline highlight parser: `[c=red]texto[/c]` -> colored span.
// Also supports **bold**.
const HIGHLIGHT_COLORS: Record<string, string> = {
  red: "#ef4444",
  green: "#16a34a",
  blue: "#2563eb",
  amber: "#f59e0b",
  black: "#000000",
};
function renderRich(text: string): React.ReactNode {
  const nodes: React.ReactNode[] = [];
  const re = /\[c=(red|green|blue|amber|black)\]([\s\S]+?)\[\/c\]|\*\*([\s\S]+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1]) {
      nodes.push(
        <span key={key++} style={{ color: HIGHLIGHT_COLORS[m[1]], fontWeight: 800 }}>
          {m[2]}
        </span>,
      );
    } else if (m[3]) {
      nodes.push(
        <strong key={key++} style={{ fontWeight: 800 }}>
          {m[3]}
        </strong>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export const Route = createFileRoute("/quiz/$slug")({
  ssr: false,
  component: PublicQuiz,
});

type FormState = { name: string; email: string; whatsapp: string };

function PublicQuiz() {
  const { slug } = Route.useParams();
  const [quiz, setQuiz] = useState<QuizConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [stepIdx, setStepIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { value: string; points: number }>>({});
  const [form, setForm] = useState<FormState>({ name: "", email: "", whatsapp: "" });
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const local = getQuizBySlug(slug);
    if (local) {
      setQuiz(local);
      setLoading(false);
    }
    // Always try backend so visitors on other devices see the latest published version.
    fetchPublicQuizBySlug(slug)
      .then((remote) => {
        if (cancelled) return;
        if (remote) setQuiz(remote);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const totalScore = useMemo(
    () => Object.values(answers).reduce((s, a) => s + a.points, 0),
    [answers],
  );
  const maxScore = useMemo(() => {
    if (!quiz) return 1;
    let total = 0;
    for (const s of quiz.steps) {
      for (const b of s.blocks) {
        if (b.kind === "escolha") total += Math.max(...b.options.map((o) => o.points), 0);
        else if (b.kind === "sim-nao") total += Math.max(b.yesPoints, b.noPoints);
        else if (b.kind === "multipla") total += b.options.reduce((s, o) => s + Math.max(o.points, 0), 0);
        else if (b.kind === "escala") total += b.max;
      }
    }
    return total || 1;
  }, [quiz]);
  const score = Math.round((totalScore / maxScore) * 100);
  const matchedRange: Range | undefined = useMemo(
    () => quiz?.ranges.find((r) => score >= r.min && score <= r.max) ?? quiz?.ranges[0],
    [quiz, score],
  );

  if (loading && !quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-slate-900 px-4">
        <div className="text-center">
          <div className="text-3xl mb-2">⏳</div>
          <p className="text-slate-500">Carregando quiz…</p>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-slate-900 px-4">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold mb-2">Quiz não encontrado</h1>
          <p className="text-slate-500">
            O link <code className="bg-slate-100 px-2 py-0.5 rounded">/quiz/{slug}</code> não
            corresponde a nenhum quiz publicado.
          </p>
        </div>
      </div>
    );
  }

  if (quiz.status === "pausado") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-slate-900 px-4">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-3">⏸️</div>
          <h1 className="text-2xl font-extrabold mb-2">Quiz pausado</h1>
          <p className="text-slate-500">
            Este quiz está temporariamente indisponível. Volte mais tarde.
          </p>
        </div>
      </div>
    );
  }

  const step = quiz.steps[stepIdx];
  const totalSteps = quiz.steps.length;
  const progress = finished ? 100 : Math.round(((stepIdx + 1) / totalSteps) * 100);

  function answerChoice(blockId: string, optionText: string, points: number, autoAdvance: boolean) {
    setAnswers((a) => ({ ...a, [blockId]: { value: optionText, points } }));
    if (autoAdvance) setTimeout(() => goNext(), 250);
  }

  function answerMulti(blockId: string, values: string[], points: number) {
    setAnswers((a) => ({ ...a, [blockId]: { value: values.join(", "), points } }));
  }

  function answerScale(blockId: string, value: number) {
    setAnswers((a) => ({ ...a, [blockId]: { value: String(value), points: value } }));
  }

  function goNext() {
    if (stepIdx + 1 >= totalSteps) return finalize();
    setStepIdx((i) => i + 1);
  }
  function goBack() {
    if (stepIdx > 0) setStepIdx((i) => i - 1);
  }

  function finalize() {
    if (!quiz) return;
    const profile = matchedRange?.profile ?? "Lead";
    const ans: Record<string, string> = {};
    // Map answers to readable {question: answer} dict
    for (const s of quiz.steps) {
      for (const b of s.blocks) {
        if ((b.kind === "escolha" || b.kind === "sim-nao") && answers[b.id]) {
          ans[b.kind === "escolha" ? b.question : b.question] = answers[b.id].value;
        }
      }
    }
    addLead({
      quizId: quiz.id,
      name: form.name || "(sem nome)",
      email: form.email || "—",
      whatsapp: form.whatsapp,
      score,
      profile,
      answers: ans,
    });
    setFinished(true);
  }

  // Validate current step: requires answered choice blocks; required inputs
  function canAdvanceFromStep(): boolean {
    if (!step) return false;
    for (const b of step.blocks) {
      if (
        (b.kind === "escolha" ||
          b.kind === "sim-nao" ||
          b.kind === "multipla" ||
          b.kind === "escala") &&
        !answers[b.id]
      )
        return false;
      if (b.kind === "entrada" && b.required) {
        const v = (form as any)[b.field] as string;
        if (!v || !v.trim()) return false;
        if (b.field === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return false;
      }
    }
    return true;
  }

  // RESULT screen
  if (finished && matchedRange) {
    return (
      <Shell quiz={quiz} progress={100}>
        <div className="animate-in fade-in zoom-in-95 duration-300 text-center">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full mb-4">
            Seu resultado
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 leading-tight mb-3">
            {matchedRange.profile}
          </h1>
          <div className="relative inline-flex items-center justify-center my-5">
            <svg className="h-32 w-32 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" stroke="#e2e8f0" strokeWidth="8" fill="none" />
              <circle
                cx="50"
                cy="50"
                r="42"
                stroke={quiz.accent}
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${(score / 100) * 264} 264`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-extrabold text-slate-900">{score}</span>
              <span className="text-[10px] uppercase tracking-wide text-slate-400">pontos</span>
            </div>
          </div>
          <p className="text-slate-600 mb-6 max-w-md mx-auto">{matchedRange.message}</p>
          {matchedRange.offer && (
            <p className="text-sm font-bold text-slate-900 mb-6">Oferta: {matchedRange.offer}</p>
          )}
          {matchedRange.ctaUrl && matchedRange.ctaUrl !== "#" && (
            <a href={matchedRange.ctaUrl} target="_blank" rel="noopener" className="inline-block">
              <Button
                className="rounded-full h-[52px] px-8 text-white text-base font-bold py-3 shadow-sm"
                style={{ backgroundColor: quiz.accent }}
              >
                {matchedRange.ctaText || "Continuar"} 💬
              </Button>
            </a>
          )}
        </div>
      </Shell>
    );
  }

  // STEP screen
  return (
    <Shell quiz={quiz} progress={progress}>
      <div key={stepIdx} className="animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="inline-flex items-center gap-2 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full mb-4">
          Etapa {stepIdx + 1} de {totalSteps}
        </div>
        <div className="space-y-5">
          {step?.blocks.map((b) => (
            <RuntimeBlock
              key={b.id}
              block={b}
              accent={quiz.accent}
              answers={answers}
              form={form}
              setForm={setForm}
              onAnswerChoice={answerChoice}
              onAnswerMulti={answerMulti}
              onAnswerScale={answerScale}
              onAutoAdvance={goNext}
              onClickNext={() => {
                if (canAdvanceFromStep()) goNext();
              }}
              onSubmit={() => {
                if (canAdvanceFromStep()) finalize();
              }}
            />
          ))}
        </div>

        {/* If the step has no explicit button block, render auto controls */}
        {step && !step.blocks.some((b) => b.kind === "botao") && (
          <div className="mt-7 flex items-center justify-between">
            {quiz.allowBack ? (
              <button
                className="text-sm font-semibold text-slate-500 hover:text-slate-900 disabled:opacity-40"
                disabled={stepIdx === 0}
                onClick={goBack}
              >
                ← Voltar
              </button>
            ) : (
              <span />
            )}
            <Button
              className="rounded-full h-12 px-7 text-white text-base font-bold shadow-sm disabled:opacity-50"
              style={{ backgroundColor: quiz.accent }}
              disabled={!canAdvanceFromStep()}
              onClick={() => (stepIdx + 1 >= totalSteps ? finalize() : goNext())}
            >
              {stepIdx + 1 === totalSteps ? "Ver resultado 🎯" : "Continuar 👉"}
            </Button>
          </div>
        )}

        {/* If step HAS button blocks but allowBack, show back link only */}
        {step && step.blocks.some((b) => b.kind === "botao") && quiz.allowBack && stepIdx > 0 && (
          <button
            className="mt-5 text-sm font-semibold text-slate-500 hover:text-slate-900"
            onClick={goBack}
          >
            ← Voltar
          </button>
        )}
      </div>
    </Shell>
  );
}

const widthClasses = {
  narrow: "max-w-md",
  medium: "max-w-xl",
  wide: "max-w-3xl",
};

function Shell({
  quiz,
  progress,
  children,
}: {
  quiz: QuizConfig;
  progress: number;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      {quiz.showProgress && (
        <div className="h-1.5 w-full bg-slate-100 sticky top-0 z-10">
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${progress}%`, backgroundColor: quiz.accent }}
          />
        </div>
      )}
      {quiz.showLogo && (
        <header
          className={`px-4 sm:px-6 py-4 flex items-center justify-between mx-auto w-full ${widthClasses[quiz.width || "medium"]} transition-all duration-300`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="h-9 w-9 rounded-xl text-white flex items-center justify-center font-extrabold text-sm"
              style={{ backgroundColor: quiz.accent }}
            >
              {quiz.title.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-900 leading-none">{quiz.title}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">/quiz/{quiz.slug}</p>
            </div>
          </div>
        </header>
      )}
      <main className="flex-1 flex items-start justify-center px-4 pb-12 pt-2 sm:pt-6">
        <div
          className={`w-full ${widthClasses[quiz.width || "medium"]} transition-all duration-300`}
        >
          {children}
        </div>
      </main>
      <footer className="text-center text-[11px] text-slate-400 py-4">
        Feito com <span className="font-bold text-slate-600">inlead</span>
      </footer>
    </div>
  );
}

function RuntimeBlock({
  block,
  accent,
  answers,
  form,
  setForm,
  onAnswerChoice,
  onAnswerMulti,
  onAnswerScale,
  onAutoAdvance,
  onClickNext,
  onSubmit,
}: {
  block: Block;
  accent: string;
  answers: Record<string, { value: string; points: number }>;
  form: FormState;
  setForm: (f: FormState) => void;
  onAnswerChoice: (blockId: string, text: string, points: number, autoAdvance: boolean) => void;
  onAnswerMulti: (blockId: string, values: string[], points: number) => void;
  onAnswerScale: (blockId: string, value: number) => void;
  onAutoAdvance: () => void;
  onClickNext: () => void;
  onSubmit: () => void;
}) {
  switch (block.kind) {
    case "titulo":
      return (
        <h1
          className={`text-3xl sm:text-4xl font-extrabold leading-tight text-slate-900 ${block.align === "center" ? "text-center" : ""}`}
          style={textStyle(block.style)}
        >
          {renderRich(block.text)}
        </h1>
      );
    case "paragrafo":
      return (
        <p className="text-slate-600 leading-relaxed" style={textStyle(block.style)}>
          {renderRich(block.text)}
        </p>
      );
    case "imagem":
      return block.url ? (
        <img src={block.url} alt={block.alt ?? ""} className="w-full rounded-2xl" />
      ) : null;
    case "escolha": {
      const a = answers[block.id];
      return (
        <div>
          <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-4">{block.question}</p>
          <div className="space-y-2.5">
            {block.options.map((opt) => {
              const active = a?.value === opt.text;
              return (
                <button
                  key={opt.id}
                  onClick={() =>
                    onAnswerChoice(block.id, opt.text, opt.points, !!block.autoAdvance)
                  }
                  className="group w-full text-left rounded-full border-2 px-5 py-4 transition flex items-center gap-3"
                  style={{
                    borderColor: active ? accent : "#e2e8f0",
                    backgroundColor: active ? `${accent}10` : "white",
                  }}
                >
                  <span
                    className="h-5 w-5 rounded-full border-2 shrink-0 flex items-center justify-center"
                    style={{
                      borderColor: active ? accent : "#cbd5e1",
                      backgroundColor: active ? accent : "transparent",
                    }}
                  >
                    {active && <span className="h-2 w-2 rounded-full bg-white" />}
                  </span>
                  <span className={`font-medium ${active ? "text-slate-900" : "text-slate-800"}`}>
                    {opt.text}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      );
    }
    case "sim-nao": {
      const a = answers[block.id];
      return (
        <div>
          <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-4">{block.question}</p>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: "Sim", points: block.yesPoints },
              { label: "Não", points: block.noPoints },
            ].map((o) => {
              const active = a?.value === o.label;
              return (
                <button
                  key={o.label}
                  onClick={() => onAnswerChoice(block.id, o.label, o.points, true)}
                  className="rounded-full border-2 px-5 py-4 text-center font-bold"
                  style={{
                    borderColor: active ? accent : "#e2e8f0",
                    backgroundColor: active ? accent : "white",
                    color: active ? "white" : "#1e293b",
                  }}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>
      );
    }
    case "entrada": {
      const value = form[block.field];
      return (
        <div>
          <label className="text-xs font-semibold text-slate-700">
            {block.label}
            {block.required && " *"}
          </label>
          <input
            type={block.field === "email" ? "email" : "text"}
            value={value}
            onChange={(e) => setForm({ ...form, [block.field]: e.target.value })}
            placeholder={
              block.field === "email"
                ? "seu@email.com"
                : block.field === "whatsapp"
                  ? "(11) 99999-9999"
                  : "Seu nome"
            }
            className="w-full rounded-full border border-slate-200 px-5 h-12 mt-1 text-slate-900 outline-none focus:border-blue-500"
          />
        </div>
      );
    }
    case "botao":
      return (
        <Button
          className="w-full rounded-full h-[52px] py-3.5 text-white font-bold text-base shadow-sm"
          style={{ backgroundColor: accent, ...textStyle(block.style) }}
          onClick={() => (block.action === "submit" ? onSubmit() : onClickNext())}
        >
          {block.text}
        </Button>
      );
    case "video": {
      if (!block.url) return null;
      const yt = /youtube\.com|youtu\.be/.test(block.url);
      const embed = yt
        ? (() => {
            const m = block.url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{6,})/);
            return m?.[1] ? `https://www.youtube.com/embed/${m[1]}` : block.url;
          })()
        : block.url;
      return (
        <div>
          <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black">
            {yt ? (
              <iframe
                src={embed}
                className="w-full h-full"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video src={block.url} controls className="w-full h-full" />
            )}
          </div>
          {block.caption && (
            <p className="text-sm text-slate-500 mt-2 text-center">{block.caption}</p>
          )}
        </div>
      );
    }
    case "escala": {
      const a = answers[block.id];
      const selected = a ? Number(a.value) : null;
      const values = Array.from({ length: block.max - block.min + 1 }, (_, i) => block.min + i);
      return (
        <div>
          <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-4">{block.question}</p>
          <div className="flex flex-wrap gap-1.5">
            {values.map((v) => {
              const active = selected === v;
              return (
                <button
                  key={v}
                  onClick={() => onAnswerScale(block.id, v)}
                  className="h-11 min-w-11 px-2 rounded-lg border-2 font-bold text-sm transition"
                  style={{
                    borderColor: active ? accent : "#e2e8f0",
                    backgroundColor: active ? accent : "white",
                    color: active ? "white" : "#1e293b",
                  }}
                >
                  {v}
                </button>
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-2">
            <span>{block.minLabel}</span>
            <span>{block.maxLabel}</span>
          </div>
        </div>
      );
    }
    case "multipla": {
      const a = answers[block.id];
      const selectedTexts = a ? a.value.split(", ").filter(Boolean) : [];
      const toggle = (text: string, points: number) => {
        const isOn = selectedTexts.includes(text);
        const next = isOn ? selectedTexts.filter((t) => t !== text) : [...selectedTexts, text];
        const nextPoints = block.options
          .filter((o) => next.includes(o.text))
          .reduce((s, o) => s + o.points, 0);
        onAnswerMulti(block.id, next, nextPoints);
      };
      return (
        <div>
          <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-4">{block.question}</p>
          <div className="space-y-2.5">
            {block.options.map((opt) => {
              const active = selectedTexts.includes(opt.text);
              return (
                <button
                  key={opt.id}
                  onClick={() => toggle(opt.text, opt.points)}
                  className="group w-full text-left rounded-xl border-2 px-5 py-4 transition flex items-center gap-3"
                  style={{
                    borderColor: active ? accent : "#e2e8f0",
                    backgroundColor: active ? `${accent}10` : "white",
                  }}
                >
                  <span
                    className="h-5 w-5 rounded border-2 shrink-0 flex items-center justify-center"
                    style={{
                      borderColor: active ? accent : "#cbd5e1",
                      backgroundColor: active ? accent : "transparent",
                    }}
                  >
                    {active && <span className="text-white text-xs leading-none">✓</span>}
                  </span>
                  <span className="font-medium text-slate-800">{opt.text}</span>
                </button>
              );
            })}
          </div>
        </div>
      );
    }
    case "faq":
      return <FaqRuntime items={block.items} accent={accent} />;
    case "loading":
      return <LoadingRuntime message={block.message} durationMs={block.durationMs} accent={accent} onDone={onAutoAdvance} />;
    case "depoimento":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {block.items.map((t) => (
            <div key={t.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold overflow-hidden">
                  {t.avatarUrl ? (
                    <img src={t.avatarUrl} alt={t.name} className="h-full w-full object-cover" />
                  ) : (
                    t.name.charAt(0)
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-slate-900 truncate">{t.name}</p>
                  {t.role && <p className="text-xs text-slate-500 truncate">{t.role}</p>}
                </div>
              </div>
              {typeof t.rating === "number" && (
                <div className="flex gap-0.5 mb-1.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${i < (t.rating ?? 0) ? "fill-amber-400 text-amber-400" : "text-slate-300"}`}
                    />
                  ))}
                </div>
              )}
              <p className="text-sm text-slate-700 leading-relaxed">{t.text}</p>
            </div>
          ))}
        </div>
      );
    case "espacador":
      return <div style={{ height: block.height }} />;
    case "beneficio": {
      const bg: Record<string, string> = {
        green: "#16a34a",
        blue: "#2563eb",
        red: "#ef4444",
        amber: "#f59e0b",
        slate: "#334155",
      };
      return (
        <div className="flex justify-center">
          <span
            className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-white font-bold text-sm sm:text-base"
            style={{ backgroundColor: bg[block.color ?? "green"] }}
          >
            <Check className="h-4 w-4" strokeWidth={3} /> {block.text}
          </span>
        </div>
      );
    }
  }
}

function FaqRuntime({
  items,
  accent,
}: {
  items: { id: string; q: string; a: string }[];
  accent: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      {items.map((it) => {
        const open = openId === it.id;
        return (
          <div key={it.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <button
              onClick={() => setOpenId(open ? null : it.id)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <span className="font-semibold text-slate-900 flex items-center gap-2">
                <HelpCircle className="h-4 w-4" style={{ color: accent }} /> {it.q}
              </span>
              <ChevronDown
                className={`h-4 w-4 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
              />
            </button>
            {open && <p className="px-4 pb-4 text-sm text-slate-600">{it.a}</p>}
          </div>
        );
      })}
    </div>
  );
}

function LoadingRuntime({
  message,
  durationMs,
  accent,
  onDone,
}: {
  message: string;
  durationMs: number;
  accent: string;
  onDone: () => void;
}) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => {
      const p = Math.min(100, ((Date.now() - start) / durationMs) * 100);
      setProgress(p);
      if (p >= 100) {
        clearInterval(timer);
        setTimeout(onDone, 200);
      }
    }, 50);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="py-14 flex flex-col items-center gap-5 text-center">
      <Loader2 className="h-12 w-12 animate-spin" style={{ color: accent }} />
      <p className="text-slate-800 font-semibold text-lg">{message}</p>
      <div className="w-full max-w-xs h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${progress}%`, backgroundColor: accent }}
        />
      </div>
      <p className="text-xs text-slate-400">{Math.round(progress)}%</p>
    </div>
  );
}

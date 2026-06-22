import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/quiz/$slug")({
  component: PublicQuiz,
});

type Opt = { text: string; points: number };
type Q = { text: string; options: Opt[] };

const DEMO: Q[] = [
  { text: "Qual seu objetivo principal?", options: [
    { text: "Emagrecer", points: 8 },
    { text: "Ganhar massa muscular", points: 9 },
    { text: "Melhorar condicionamento", points: 7 },
    { text: "Apenas curiosidade", points: 2 },
  ]},
  { text: "Com que frequência você consegue treinar?", options: [
    { text: "5+ vezes por semana", points: 10 },
    { text: "3 a 4 vezes", points: 8 },
    { text: "1 a 2 vezes", points: 4 },
    { text: "Quase nunca", points: 1 },
  ]},
  { text: "Quanto está disposto(a) a investir por mês?", options: [
    { text: "Acima de R$ 500", points: 10 },
    { text: "R$ 200 a R$ 500", points: 7 },
    { text: "Até R$ 200", points: 4 },
    { text: "Não pretendo investir agora", points: 0 },
  ]},
  { text: "Há quanto tempo busca esse resultado?", options: [
    { text: "Mais de 1 ano", points: 9 },
    { text: "Alguns meses", points: 7 },
    { text: "Acabei de começar", points: 4 },
  ]},
  { text: "Qual seu nível de comprometimento?", options: [
    { text: "5 - Totalmente", points: 10 },
    { text: "4 - Muito", points: 8 },
    { text: "3 - Médio", points: 5 },
    { text: "1-2 - Baixo", points: 2 },
  ]},
];

function PublicQuiz() {
  const { slug } = Route.useParams();
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [stage, setStage] = useState<"quiz" | "form" | "result">("quiz");
  const [form, setForm] = useState({ name: "", email: "", whatsapp: "" });

  const total = DEMO.length;
  const progress = stage === "result" ? 100 : stage === "form" ? 95 : Math.round(((idx + (answers[idx] !== undefined ? 1 : 0)) / total) * 100);
  const current = DEMO[idx];
  const selected = answers[idx];

  const score = useMemo(() => {
    const sum = answers.reduce((s, ai, i) => s + (DEMO[i]?.options[ai]?.points ?? 0), 0);
    const max = DEMO.reduce((s, q) => s + Math.max(...q.options.map((o) => o.points)), 0);
    return Math.round((sum / max) * 100);
  }, [answers]);

  const profile = score >= 80 ? "Pronto para evoluir" : score >= 50 ? "Quase lá" : "Começando agora";
  const message =
    score >= 80 ? "Você tem o perfil ideal para acelerar resultados com acompanhamento próximo."
    : score >= 50 ? "Com o plano certo, você pode dobrar seus resultados nos próximos 90 dias."
    : "Vamos te preparar com o conteúdo certo para começar com o pé direito.";

  function next() {
    if (selected === undefined) return;
    if (idx + 1 < total) setIdx((i) => i + 1);
    else setStage("form");
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      {/* Top progress bar */}
      <div className="h-1.5 w-full bg-slate-100">
        <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      {/* Header */}
      <header className="px-4 sm:px-6 py-4 flex items-center justify-between max-w-3xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-extrabold text-sm">IN</div>
          <div>
            <p className="text-sm font-extrabold text-slate-900 leading-none">Personal Trainer</p>
            <p className="text-[11px] text-slate-400 mt-0.5">/quiz/{slug}</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5">
          <span>⏳</span> Duração de 2min
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 pb-12 pt-2 sm:pt-6">
        <div className="w-full max-w-xl">
          {stage === "quiz" && current && (
            <div key={idx} className="animate-in fade-in slide-in-from-right-6 duration-300">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full mb-4">
                Pergunta {idx + 1} de {total}
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight mb-2">
                {current.text}
              </h1>
              <p className="text-sm text-slate-500 mb-6">Escolha a opção que mais combina com você.</p>

              <div className="space-y-2.5">
                {current.options.map((opt, i) => {
                  const active = selected === i;
                  return (
                    <button
                      key={i}
                      onClick={() => setAnswers((a) => { const n = [...a]; n[idx] = i; return n; })}
                      className={`group w-full text-left rounded-full border-2 px-5 py-4 transition flex items-center gap-3 ${active ? "border-blue-600 bg-blue-50" : "border-slate-200 hover:border-blue-300 bg-white"}`}
                    >
                      <span className={`h-5 w-5 rounded-full border-2 shrink-0 flex items-center justify-center ${active ? "border-blue-600 bg-blue-600" : "border-slate-300"}`}>
                        {active && <span className="h-2 w-2 rounded-full bg-white" />}
                      </span>
                      <span className={`font-medium ${active ? "text-blue-900" : "text-slate-800"}`}>{opt.text}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-7 flex items-center justify-between">
                <button
                  className="text-sm font-semibold text-slate-500 hover:text-slate-900 disabled:opacity-40"
                  disabled={idx === 0}
                  onClick={() => setIdx((i) => i - 1)}
                >
                  ← Voltar
                </button>
                <Button
                  className="rounded-full h-12 px-7 bg-blue-600 hover:bg-blue-700 text-white text-base font-bold shadow-sm disabled:opacity-50"
                  disabled={selected === undefined}
                  onClick={next}
                >
                  {idx + 1 === total ? "Ver meu resultado 🎯" : "Continuar 👉"}
                </Button>
              </div>
            </div>
          )}

          {stage === "form" && (
            <div className="animate-in fade-in slide-in-from-right-6 duration-300">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full mb-4">
                Último passo
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight mb-2">
                Insira seus dados para ver <span className="bg-yellow-200 px-2 rounded">seu resultado</span>
              </h1>
              <p className="text-sm text-slate-500 mb-6">Vamos te enviar o plano ideal por e-mail.</p>

              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold">Nome</Label>
                  <Input className="rounded-full h-12 px-5 border-slate-200" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Seu nome" />
                </div>
                <div>
                  <Label className="text-xs font-semibold">E-mail</Label>
                  <Input className="rounded-full h-12 px-5 border-slate-200" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="seu@email.com" />
                </div>
                <div>
                  <Label className="text-xs font-semibold">WhatsApp (opcional)</Label>
                  <Input className="rounded-full h-12 px-5 border-slate-200" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="(11) 99999-9999" />
                </div>
                <Button
                  className="w-full rounded-full h-13 mt-2 bg-blue-600 hover:bg-blue-700 text-white text-base font-bold py-3 shadow-sm disabled:opacity-50"
                  disabled={!form.name || !form.email}
                  onClick={() => setStage("result")}
                >
                  Ver meu resultado 🎯
                </Button>
                <p className="text-[11px] text-center text-slate-400">Seus dados estão seguros. Não enviamos spam.</p>
              </div>
            </div>
          )}

          {stage === "result" && (
            <div className="animate-in fade-in zoom-in-95 duration-300 text-center">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full mb-4">
                Seu resultado
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 leading-tight mb-3">
                {profile}
              </h1>
              <div className="relative inline-flex items-center justify-center my-5">
                <svg className="h-32 w-32 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" stroke="#e2e8f0" strokeWidth="8" fill="none" />
                  <circle cx="50" cy="50" r="42" stroke="#2563eb" strokeWidth="8" fill="none"
                    strokeDasharray={`${(score / 100) * 264} 264`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-extrabold text-slate-900">{score}</span>
                  <span className="text-[10px] uppercase tracking-wide text-slate-400">pontos</span>
                </div>
              </div>
              <p className="text-slate-600 mb-7 max-w-md mx-auto">{message}</p>
              <a
                href={`https://wa.me/5511999999999?text=${encodeURIComponent(`Quero conhecer a oferta! Meu perfil: ${profile} (${score} pts)`)}`}
                target="_blank"
                rel="noopener"
                className="inline-block"
              >
                <Button className="rounded-full h-13 px-8 bg-blue-600 hover:bg-blue-700 text-white text-base font-bold py-3 shadow-sm">
                  Falar no WhatsApp agora 💬
                </Button>
              </a>
              <p className="text-[11px] text-slate-400 mt-3">Resposta em até 5 minutos.</p>
            </div>
          )}
        </div>
      </main>

      <footer className="text-center text-[11px] text-slate-400 py-4">
        Feito com <span className="font-bold text-slate-600">inlead</span> · Personal Trainer
      </footer>
    </div>
  );
}
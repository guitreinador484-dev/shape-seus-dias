import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

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
    { text: "Acabei de começar a pensar", points: 4 },
  ]},
  { text: "Qual seu nível de comprometimento (1-5)?", options: [
    { text: "5 - Totalmente", points: 10 },
    { text: "4 - Muito", points: 8 },
    { text: "3 - Médio", points: 5 },
    { text: "1-2 - Baixo", points: 2 },
  ]},
];

export default function PublicQuiz() {
  const { slug } = Route.useParams();
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [stage, setStage] = useState<"quiz" | "form" | "result">("quiz");
  const [form, setForm] = useState({ name: "", email: "", whatsapp: "" });

  const total = DEMO.length;
  const progress = stage === "result" ? 100 : Math.round((idx / total) * 100);
  const current = DEMO[idx];
  const selected = answers[idx];

  const score = useMemo(() => {
    const sum = answers.reduce((s, ai, i) => s + (DEMO[i]?.options[ai]?.points ?? 0), 0);
    const max = DEMO.reduce((s, q) => s + Math.max(...q.options.map((o) => o.points)), 0);
    return Math.round((sum / max) * 100);
  }, [answers]);

  const profile = score >= 80 ? "Pronto para evoluir" : score >= 50 ? "Quase lá" : "Começando agora";
  const message =
    score >= 80
      ? "Você tem o perfil ideal para acelerar resultados com acompanhamento próximo."
      : score >= 50
      ? "Com o plano certo, você pode dobrar seus resultados nos próximos 90 dias."
      : "Vamos te preparar com o conteúdo certo para começar com o pé direito.";

  function next() {
    if (selected === undefined) return;
    if (idx + 1 < total) setIdx((i) => i + 1);
    else setStage("form");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold">PT</div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Personal Trainer</p>
            <p className="text-xs text-slate-500">/quiz/{slug}</p>
          </div>
        </div>

        <Progress value={progress} className="h-2 [&>div]:bg-purple-600 mb-6" />

        {stage === "quiz" && current && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm animate-in slide-in-from-right-4 duration-300" key={idx}>
            <p className="text-xs uppercase tracking-wide text-purple-600 font-semibold mb-2">
              Pergunta {idx + 1} de {total}
            </p>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-5">{current.text}</h2>
            <div className="space-y-2">
              {current.options.map((opt, i) => {
                const active = selected === i;
                return (
                  <button
                    key={i}
                    onClick={() => setAnswers((a) => { const n = [...a]; n[idx] = i; return n; })}
                    className={`w-full text-left rounded-xl border-2 p-4 transition ${active ? "border-purple-600 bg-purple-50" : "border-slate-200 hover:border-purple-300"}`}
                  >
                    <span className="text-slate-900">{opt.text}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-6 flex justify-between">
              <Button variant="ghost" disabled={idx === 0} onClick={() => setIdx((i) => i - 1)}>
                Voltar
              </Button>
              <Button className="bg-purple-600 hover:bg-purple-700 text-white" disabled={selected === undefined} onClick={next}>
                {idx + 1 === total ? "Ver meu resultado" : "Próxima"}
              </Button>
            </div>
          </div>
        )}

        {stage === "form" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">Quase lá!</h2>
            <p className="text-sm text-slate-500 mb-5">Insira seus dados para ver seu resultado personalizado.</p>
            <div className="space-y-3">
              <div>
                <Label>Nome</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <Label>WhatsApp (opcional)</Label>
                <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
              </div>
              <Button
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                disabled={!form.name || !form.email}
                onClick={() => setStage("result")}
              >
                Ver meu resultado
              </Button>
            </div>
          </div>
        )}

        {stage === "result" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm text-center">
            <p className="text-xs uppercase tracking-wide text-purple-600 font-semibold mb-2">Seu perfil</p>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">{profile}</h2>
            <div className="inline-flex items-center justify-center h-24 w-24 rounded-full bg-purple-600 text-white text-3xl font-bold my-4">
              {score}
            </div>
            <p className="text-slate-600 mb-6 max-w-md mx-auto">{message}</p>
            <a
              href={`https://wa.me/5511999999999?text=${encodeURIComponent("Quero conhecer a mentoria!")}`}
              target="_blank"
              rel="noopener"
            >
              <Button className="bg-purple-600 hover:bg-purple-700 text-white w-full sm:w-auto">
                Falar no WhatsApp agora
              </Button>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
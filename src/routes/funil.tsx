import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Activity, Check, Loader2, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { EXERCISE_GROUPS } from "@/lib/exercise-library";
import {
  DEFAULT_FUNNEL,
  type FunnelConfig,
  type FunnelPlan,
  loadFunnelLocal,
  saveFunnelLead,
} from "@/lib/funnel-store";
import { fetchPublicFunnel } from "@/lib/funnel.functions";

export const Route = createFileRoute("/funil")({
  component: FunnelPage,
  head: () => ({
    meta: [
      { title: "Monte seu treino personalizado — Shape Seus Dias" },
      {
        name: "description",
        content:
          "Responda algumas perguntas rápidas e receba um treino sob medida para o seu objetivo.",
      },
    ],
  }),
});

type Measurements = {
  peso: string;
  altura: string;
  idade: string;
  objetivo: string;
  nivel: string;
  dias: string;
  sexo: "" | "M" | "F";
};

type Stage = "form" | "plans" | "checkout" | "done";

const MEASUREMENT_FIELDS_REQUIRED = 7;

function FunnelPage() {
  const [cfg, setCfg] = useState<FunnelConfig>(DEFAULT_FUNNEL);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const remote = await fetchPublicFunnel();
      if (cancelled) return;
      setCfg(remote ?? loadFunnelLocal());
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.add("funnel-scope");
    return () => document.documentElement.classList.remove("funnel-scope");
  }, []);

  const [stage, setStage] = useState<Stage>("form");
  const [measurements, setMeasurements] = useState<Measurements>({
    peso: "",
    altura: "",
    idade: "",
    objetivo: "",
    nivel: "",
    dias: "",
    sexo: "",
  });
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [routine, setRoutine] = useState<Record<string, string>>({});
  const [selectedPlan, setSelectedPlan] = useState<FunnelPlan | null>(null);
  const [method, setMethod] = useState<"pix" | "card">("pix");
  const [contact, setContact] = useState({ name: "", email: "", whatsapp: "" });
  const [submitting, setSubmitting] = useState(false);

  const groups = useMemo(
    () => EXERCISE_GROUPS.filter((g) => cfg.groupKeys.includes(g.key)),
    [cfg.groupKeys]
  );

  const measurementProgress = useMemo(() => {
    const v = Object.values(measurements).filter(Boolean).length;
    return Math.round((v / MEASUREMENT_FIELDS_REQUIRED) * 100);
  }, [measurements]);

  const totalRequired = groups.length;
  const totalGroupsFilled = groups.filter((g) => (selections[g.key]?.length ?? 0) > 0).length;
  const routineFilled = cfg.routine.filter((r) => routine[r.label]).length;

  const canSubmit =
    measurementProgress === 100 && totalGroupsFilled === totalRequired && routineFilled === cfg.routine.length;

  const toggleExercise = (groupKey: string, ex: string) => {
    setSelections((prev) => {
      const cur = prev[groupKey] ?? [];
      const next = cur.includes(ex) ? cur.filter((x) => x !== ex) : [...cur, ex].slice(0, 5);
      return { ...prev, [groupKey]: next };
    });
  };

  const handleGoPlans = () => {
    if (!canSubmit) {
      alert("Preencha todas as informações antes de continuar.");
      return;
    }
    setStage("plans");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePickPlan = (plan: FunnelPlan) => {
    setSelectedPlan(plan);
    setStage("checkout");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFinish = () => {
    if (!contact.email || !selectedPlan) return;
    setSubmitting(true);
    saveFunnelLead({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      answers: { measurements, selections, routine },
      planId: selectedPlan.id,
      contact,
    });
    setTimeout(() => {
      setSubmitting(false);
      setStage("done");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 600);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6fbf7] text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-emerald-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 font-bold text-emerald-700">
            <span className="text-xl">{cfg.brandEmoji}</span>
            <span className="text-lg tracking-tight">{cfg.brand}</span>
          </div>
          <div className="text-xs text-slate-500 hidden sm:flex items-center gap-1">
            <ShieldCheck className="h-4 w-4 text-emerald-600" /> Pagamento seguro
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-5">
        {stage === "form" && (
          <>
            {/* Medidas Corporais */}
            <Card>
              <CardHeader
                title={cfg.headline}
                subtitle={cfg.subheadline}
                icon={<Activity className="h-4 w-4 text-emerald-600" />}
                progress={measurementProgress}
              />
              <div className="grid gap-3">
                <TextInput
                  placeholder="Peso (kg)"
                  value={measurements.peso}
                  onChange={(v) => setMeasurements((m) => ({ ...m, peso: v }))}
                  type="number"
                />
                <TextInput
                  placeholder="Altura (cm)"
                  value={measurements.altura}
                  onChange={(v) => setMeasurements((m) => ({ ...m, altura: v }))}
                  type="number"
                />
                <TextInput
                  placeholder="Idade"
                  value={measurements.idade}
                  onChange={(v) => setMeasurements((m) => ({ ...m, idade: v }))}
                  type="number"
                />
                <Select
                  placeholder="Objetivo"
                  options={cfg.objetivos}
                  value={measurements.objetivo}
                  onChange={(v) => setMeasurements((m) => ({ ...m, objetivo: v }))}
                />
                <Select
                  placeholder="Nível de treino 🔥"
                  options={cfg.niveis}
                  value={measurements.nivel}
                  onChange={(v) => setMeasurements((m) => ({ ...m, nivel: v }))}
                />
                <Select
                  placeholder="Dias disponíveis por semana"
                  options={cfg.dias}
                  value={measurements.dias}
                  onChange={(v) => setMeasurements((m) => ({ ...m, dias: v }))}
                />
                <div className="grid grid-cols-2 gap-3 pt-1">
                  {(["M", "F"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setMeasurements((m) => ({ ...m, sexo: s }))}
                      className={`rounded-xl border py-3 text-sm font-medium transition ${
                        measurements.sexo === s
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300"
                      }`}
                    >
                      {s === "M" ? "Masculino" : "Feminino"}
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            {/* Grupos musculares */}
            {groups.map((g) => {
              const chosen = selections[g.key] ?? [];
              return (
                <Card key={g.key}>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-base font-bold flex items-center gap-2">
                      {g.name} <span>{g.emoji}</span>
                    </h3>
                    <span
                      className={`text-xs font-medium ${chosen.length ? "text-emerald-600" : "text-slate-400"}`}
                    >
                      {chosen.length}/5 {chosen.length > 0 && <Check className="inline h-3 w-3" />}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">Selecione seus exercícios favoritos</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {g.exercises.slice(0, 12).map((ex) => {
                      const active = chosen.includes(ex);
                      return (
                        <button
                          key={ex}
                          onClick={() => toggleExercise(g.key, ex)}
                          className={`text-xs rounded-lg border px-3 py-2 text-left transition ${
                            active
                              ? "border-emerald-500 bg-emerald-500 text-white font-medium shadow-sm"
                              : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300"
                          }`}
                        >
                          <span className="mr-1">{g.emoji}</span>
                          {ex}
                          {active && <Check className="inline h-3 w-3 ml-1" />}
                        </button>
                      );
                    })}
                  </div>
                </Card>
              );
            })}

            {/* Rotina */}
            <Card>
              <CardHeader
                title="Informações de Rotina"
                subtitle="Detalhes sobre sua rotina de treinos"
                icon={<Sparkles className="h-4 w-4 text-emerald-600" />}
                progress={Math.round((routineFilled / cfg.routine.length) * 100)}
              />
              <div className="grid gap-3">
                {cfg.routine.map((r) => (
                  <Select
                    key={r.label}
                    placeholder={r.label}
                    options={r.options}
                    value={routine[r.label] ?? ""}
                    onChange={(v) => setRoutine((prev) => ({ ...prev, [r.label]: v }))}
                  />
                ))}
              </div>
            </Card>

            {/* CTA */}
            <Card className="text-center">
              <h3 className="text-xl font-bold">Seu treino, do seu jeito!</h3>
              <div className="mt-3 flex items-center justify-center gap-2">
                <div className="flex -space-x-2">
                  {cfg.results.slice(0, 5).map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt=""
                      className="h-8 w-8 rounded-full border-2 border-white object-cover"
                    />
                  ))}
                </div>
                <span className="text-xs text-slate-500">{cfg.socialProof}</span>
              </div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-4">Resultados reais</p>
              <div className="grid grid-cols-5 gap-1.5 mt-2">
                {cfg.results.slice(0, 5).map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt=""
                    className="h-20 w-full rounded-lg object-cover"
                  />
                ))}
              </div>
              <div className="mt-5 flex items-center justify-center gap-6">
                <div className="text-left">
                  <div className="text-[10px] uppercase tracking-widest text-slate-400">
                    A partir de
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900">{cfg.basePrice}</div>
                </div>
                <ul className="text-xs text-slate-600 space-y-1 text-left">
                  <li className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-emerald-600" /> Treino personalizado completo
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-emerald-600" /> Baseado nas suas preferências
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-emerald-600" /> Modifique quando quiser
                  </li>
                </ul>
              </div>
              <button
                onClick={handleGoPlans}
                disabled={!canSubmit}
                className="mt-5 w-full rounded-full bg-emerald-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cfg.ctaLabel} →
              </button>
              <p className="text-[10px] text-slate-400 mt-2 flex items-center justify-center gap-1">
                <Lock className="h-3 w-3" /> Pagamento seguro
              </p>
            </Card>

            <div className="text-center text-xs text-slate-400 pb-6">
              Já são mais de 850 mil pessoas com seus objetivos alcançados
            </div>
          </>
        )}

        {stage === "plans" && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-2xl font-extrabold">Escolha seu plano</h2>
              <p className="text-sm text-slate-500">Selecione o melhor plano para você</p>
              <button
                onClick={() => setStage("form")}
                className="mt-2 text-xs text-emerald-600 hover:underline"
              >
                ← Mudar objetivo
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {cfg.plans.map((p) => (
                <div
                  key={p.id}
                  className={`relative rounded-2xl border-2 bg-white p-5 flex flex-col transition ${
                    p.highlighted
                      ? "border-emerald-500 shadow-lg shadow-emerald-500/10"
                      : "border-slate-200"
                  }`}
                >
                  {p.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                      {p.badge}
                    </div>
                  )}
                  <div className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                    {cfg.brandEmoji} {cfg.brand}
                  </div>
                  <h3 className="mt-2 text-lg font-bold">{p.name}</h3>
                  <div className="mt-1 text-3xl font-extrabold text-slate-900">{p.price}</div>
                  <ul className="mt-4 space-y-2 text-sm text-slate-700 flex-1">
                    {p.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handlePickPlan(p)}
                    className={`mt-5 rounded-full py-2.5 text-sm font-semibold transition ${
                      p.highlighted
                        ? "bg-emerald-500 text-white hover:bg-emerald-600"
                        : "border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                    }`}
                  >
                    Escolher Plano
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {stage === "checkout" && selectedPlan && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setStage("plans")}
                className="text-sm text-slate-600 hover:text-slate-900"
              >
                ← Voltar
              </button>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-full px-3 py-1 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Pagamento Seguro
              </span>
            </div>
            <p className="text-center text-xs text-slate-500 mb-2">Escolha como pagar</p>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {(["pix", "card"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={`rounded-xl border-2 py-3 text-sm font-semibold transition ${
                    method === m
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-500"
                  }`}
                >
                  {m === "pix" ? "✚ PIX" : "💳 Cartão"}
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-slate-200 p-5 bg-white">
              <div className="text-center font-bold text-emerald-700 flex items-center justify-center gap-1">
                {cfg.brandEmoji} {cfg.brand}
              </div>
              <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  {method === "pix" ? "✚ Pagamento via PIX" : "💳 Pagamento via Cartão"}
                </span>
                <span className="text-lg font-bold text-emerald-600">{selectedPlan.price}</span>
              </div>
              <ul className="mt-4 space-y-1.5 text-sm text-slate-700">
                {selectedPlan.features.slice(0, 3).map((f, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="text-emerald-500">🎯</span> {f}
                  </li>
                ))}
              </ul>
              <div className="mt-5 space-y-2">
                <TextInput
                  placeholder="Seu nome"
                  value={contact.name}
                  onChange={(v) => setContact((c) => ({ ...c, name: v }))}
                />
                <TextInput
                  placeholder="Seu WhatsApp"
                  value={contact.whatsapp}
                  onChange={(v) => setContact((c) => ({ ...c, whatsapp: v }))}
                />
                <label className="block text-xs text-slate-500 pt-2">
                  Digite seu email para receber o treino:
                </label>
                <TextInput
                  placeholder="voce@email.com"
                  value={contact.email}
                  onChange={(v) => setContact((c) => ({ ...c, email: v }))}
                  type="email"
                />
              </div>
              <button
                onClick={handleFinish}
                disabled={!contact.email || submitting}
                className="mt-5 w-full rounded-full bg-emerald-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : method === "pix" ? (
                  <>Gerar PIX 🎯</>
                ) : (
                  <>Finalizar pagamento →</>
                )}
              </button>
            </div>
          </Card>
        )}

        {stage === "done" && (
          <Card className="text-center py-10">
            <div className="mx-auto h-14 w-14 rounded-full bg-emerald-500 flex items-center justify-center text-white text-3xl">
              ✓
            </div>
            <h2 className="mt-4 text-2xl font-extrabold">Tudo pronto, {contact.name || "atleta"}!</h2>
            <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">{cfg.thankYou}</p>
            <p className="mt-4 text-xs text-slate-400">
              Enviamos os detalhes para <b>{contact.email}</b>. Fique de olho na sua caixa de entrada.
            </p>
          </Card>
        )}
      </main>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}
    >
      {children}
    </section>
  );
}

function CardHeader({
  title,
  subtitle,
  icon,
  progress,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  progress?: number;
}) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold flex items-center gap-2">
          {icon}
          {title}
        </h2>
        {typeof progress === "number" && (
          <div className="h-1.5 w-20 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
      {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function TextInput({
  placeholder,
  value,
  onChange,
  type = "text",
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
    />
  );
}

function Select({
  placeholder,
  options,
  value,
  onChange,
}: {
  placeholder: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-9 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 ${
          value ? "text-slate-900" : "text-slate-400"
        }`}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
        ▾
      </span>
    </div>
  );
}

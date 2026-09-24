import { createFileRoute } from "@tanstack/react-router";
import { loadOrderBumps, formatBRL, type OrderBumpConfig } from "@/lib/order-bump";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Activity, Check, Loader2, Lock, ShieldCheck, Sparkles, Star, Award } from "lucide-react";
import {
  BROAD_QUESTIONS,
  DEFAULT_FUNNEL,
  type FunnelConfig,
  type FunnelPlan,
  loadFunnelLocal,
  saveFunnelLead,
} from "@/lib/funnel-store";
import { fetchPublicFunnel } from "@/lib/funnel.functions";
import { resolveFunnelConfigImages } from "@/lib/funnel-assets";
import { submitLeadFn } from "@/lib/leads.functions";
import {
  createMercadoPagoCheckoutFn,
  createPixPaymentFn,
  getPaymentStatusFn,
} from "@/lib/payments.functions";
import { provisionAccessFn } from "@/lib/access.functions";
import { generateAiPlanFn } from "@/lib/ai-plan.functions";
import { BrandLogo } from "@/components/brand-logo";

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
      { property: "og:title", content: "Monte seu treino personalizado — Gui Treinador" },
      { property: "og:description", content: "Responda algumas perguntas rápidas e receba um treino sob medida para o seu objetivo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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

type NutritionAnswers = {
  favoriteFoods: string;
  dislikedFoods: string;
  restrictions: string;
  allergies: string;
  routine: string;
  avoidedFoods: string;
  goal: string;
};

type Stage = "form" | "nutrition" | "plans" | "checkout" | "pix" | "done";

type PixData = {
  reference: string;
  qrCode: string;
  qrCodeBase64: string | null;
  ticketUrl: string | null;
  amount: number;
};

const MEASUREMENT_FIELDS_REQUIRED = 7;

function FunnelPage() {
  const [cfg, setCfg] = useState<FunnelConfig>(DEFAULT_FUNNEL);
  const [loading, setLoading] = useState(true);
  const submitLead = useServerFn(submitLeadFn);
  const createCheckout = useServerFn(createMercadoPagoCheckoutFn);
  const createPix = useServerFn(createPixPaymentFn);
  const getPaymentStatus = useServerFn(getPaymentStatusFn);
  const provisionAccess = useServerFn(provisionAccessFn);
  const generateAiPlan = useServerFn(generateAiPlanFn);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const remote = await fetchPublicFunnel();
      const base = remote ?? loadFunnelLocal();
      const resolved = await resolveFunnelConfigImages(base).catch(() => base);
      if (cancelled) return;
      setCfg(resolved);
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

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) localStorage.setItem("referred_by_ref", ref);
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
  const [broad, setBroad] = useState<Record<string, string>>({});
  const [routine, setRoutine] = useState<Record<string, string>>({});
  const [nutrition, setNutrition] = useState<NutritionAnswers>({ favoriteFoods: "", dislikedFoods: "", restrictions: "", allergies: "", routine: "", avoidedFoods: "", goal: "" });
  const [selectedPlan, setSelectedPlan] = useState<FunnelPlan | null>(null);
  const [bumps, setBumps] = useState<OrderBumpConfig[]>([]);
  const [bumpChecked, setBumpChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadOrderBumps().then(setBumps).catch(() => {});
  }, []);
  const [method, setMethod] = useState<"pix" | "card">("pix");
  const [contact, setContact] = useState({ name: "", email: "", whatsapp: "" });
  const [submitting, setSubmitting] = useState(false);
  const [pix, setPix] = useState<PixData | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
  const [pixPaid, setPixPaid] = useState(false);
  const [pixError, setPixError] = useState<string | null>(null);
  const [account, setAccount] = useState<{
    ok: boolean;
    created: boolean;
    emailSent: boolean;
    actionLink?: string | null;
  } | null>(null);
  const [accountLoading, setAccountLoading] = useState(false);

  const measurementProgress = useMemo(() => {
    const v = Object.values(measurements).filter(Boolean).length;
    return Math.round((v / MEASUREMENT_FIELDS_REQUIRED) * 100);
  }, [measurements]);

  const broadFilled = BROAD_QUESTIONS.filter((q) => broad[q.key]).length;
  const routineFilled = cfg.routine.filter((r) => routine[r.label]).length;

  const canSubmit =
    measurementProgress === 100 &&
    broadFilled === BROAD_QUESTIONS.length &&
    routineFilled === cfg.routine.length;

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

  const parsePlanPrice = (price: string | number): number => {
    if (typeof price === "number") return price;
    const cleaned = price.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
    const value = Number.parseFloat(cleaned);
    return Number.isFinite(value) ? value : 0;
  };
  const activeBumps = bumps.filter((b) => b.enabled);
  const chosenBumps = activeBumps.filter((b) => bumpChecked[b.id]);
  const withBump = chosenBumps.length > 0;
  const unlockNutrition = chosenBumps.some((b) => b.unlockNutrition);
  const unlockVideos = chosenBumps.some((b) => b.unlockVideos);
  const bumpsTotal = chosenBumps.reduce((sum, b) => sum + b.price, 0);
  const bumpsLabel = chosenBumps.map((b) => b.title).join(" + ");
  const totalPrice = selectedPlan ? parsePlanPrice(selectedPlan.price) + bumpsTotal : 0;

  const handleFinish = async () => {
    if (!contact.email || !selectedPlan) return;
    setSubmitting(true);
    saveFunnelLead({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      answers: { measurements, broad, routine, nutrition },
      planId: selectedPlan.id,
      contact,
    });
    // Persist no servidor para o admin ver leads reais (fire-and-forget com fallback)
    submitLead({
      data: {
        source: "funil",
        name: contact.name,
        email: contact.email,
        whatsapp: contact.whatsapp,
        planId: selectedPlan.id,
        answers: { measurements, broad, routine, nutrition, plan: selectedPlan },
      },
    }).catch((e) => console.error("[funil] falha ao salvar lead no servidor", e));

    try {
      if (method === "pix") {
        const data = await createPix({
          data: {
            planId: selectedPlan.id,
            planName: withBump ? `${selectedPlan.name} + ${bumpsLabel}` : selectedPlan.name,
            price: totalPrice,
            orderBump: withBump,
            orderBumpIds: chosenBumps.map((b) => b.id),
            unlockNutrition,
            unlockVideos,
            method: "pix",
            name: contact.name,
            email: contact.email,
            whatsapp: contact.whatsapp,
          },
        });
        setPix(data);
        setSubmitting(false);
        setStage("pix");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      const { checkoutUrl } = await createCheckout({
        data: {
          planId: selectedPlan.id,
          planName: withBump ? `${selectedPlan.name} + ${bumpsLabel}` : selectedPlan.name,
          price: totalPrice,
          orderBump: withBump,
          orderBumpIds: chosenBumps.map((b) => b.id),
          unlockNutrition,
          unlockVideos,
          method,
          name: contact.name,
          email: contact.email,
          whatsapp: contact.whatsapp,
        },
      });
      window.location.href = checkoutUrl;
    } catch (e) {
      console.error("[funil] falha ao criar checkout", e);
      if (method === "pix") {
        setPixError("Não foi possível gerar o PIX agora. Tente novamente em instantes.");
        setSubmitting(false);
        return;
      }
      setSubmitting(false);
      setStage("done");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Polling do status do PIX enquanto o cliente paga
  useEffect(() => {
    if (stage !== "pix" || !pix || pixPaid) return;
    let active = true;
    const timer = setInterval(async () => {
      try {
        const { status } = await getPaymentStatus({ data: { reference: pix.reference } });
        if (!active) return;
        if (status === "approved") {
          setPixPaid(true);
          clearInterval(timer);
          setStage("done");
          window.scrollTo({ top: 0, behavior: "smooth" });
          setAccountLoading(true);
          try {
            const result = await provisionAccess({ data: { reference: pix.reference } });
            // Dispara o treino da IA em paralelo (não bloqueia o redirecionamento).
            void generateAiPlan({ data: { reference: pix.reference } }).catch(() => {});
            if (active) setAccount(result);
            window.location.href = `/criar-senha?ref=${encodeURIComponent(pix.reference)}`;
            return;
          } catch (e) {
            console.error("[funil] falha ao criar conta de acesso", e);
          } finally {
            if (active) setAccountLoading(false);
          }
        }
      } catch {
        /* tenta de novo no próximo ciclo */
      }
    }, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [stage, pix, pixPaid, getPaymentStatus, provisionAccess, generateAiPlan]);

  // Volta do checkout de cartão: libera o acesso e leva direto para criar a senha.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("ref");
    if (params.get("pagamento") !== "sucesso" || !reference) return;
    let active = true;
    setStage("done");
    setAccountLoading(true);
    (async () => {
      try {
        const result = await provisionAccess({ data: { reference } });
        void generateAiPlan({ data: { reference } }).catch(() => {});
        if (!active) return;
        setAccount(result);
        window.location.href = `/criar-senha?ref=${encodeURIComponent(reference)}`;
        return;
      } catch (e) {
        console.error("[funil] falha ao liberar acesso após o cartão", e);
      } finally {
        if (active) setAccountLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-card">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <BrandLogo className="h-9 w-auto" />
          <div className="text-xs text-muted-foreground hidden sm:flex items-center gap-1">
            <ShieldCheck className="h-4 w-4 text-primary" /> Pagamento seguro
          </div>
        </div>
      </header>
      {cfg.urgencyText && (
        <div className="bg-primary text-white text-center text-xs font-semibold py-1.5 px-4 sticky top-[57px] z-30">
          {cfg.urgencyText}
        </div>
      )}

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-5">
        {stage === "form" && (
          <>
            {cfg.banner?.enabled && cfg.banner.image && (
              <section className="relative overflow-hidden rounded-lg shadow-lg">
                <img src={cfg.banner.image} alt="" className="h-56 w-full object-cover" />
                <div className="absolute inset-0 bg-linear-to-r from-background/90 via-background/65 to-transparent flex items-center">
                  <div className="px-6 py-4 text-white max-w-md">
                    <h2 className="text-2xl font-extrabold leading-tight">{cfg.banner.title}</h2>
                    <p className="text-sm text-foreground/80 mt-1">{cfg.banner.subtitle}</p>
                    {cfg.banner.ctaLabel && (
                      <div className="mt-3 inline-block rounded-lg bg-card text-primary text-xs font-bold px-4 py-2">
                        {cfg.banner.ctaLabel}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {cfg.video?.enabled && cfg.video.url && (
              <Card>
                <div className="text-center mb-3">
                  <h3 className="text-lg font-bold">{cfg.video.title}</h3>
                  <p className="text-xs text-muted-foreground">{cfg.video.subtitle}</p>
                </div>
                <VideoEmbed url={cfg.video.url} />
              </Card>
            )}

            {!!cfg.trustBadges?.length && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {cfg.trustBadges.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-lg border border-border bg-card px-3 py-2 text-center shadow-sm"
                  >
                    <div className="text-xl">{b.emoji}</div>
                    <div className="text-[11px] font-semibold text-foreground/80 mt-0.5 leading-tight">
                      {b.label}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Medidas Corporais */}
            <Card>
              <CardHeader
                title={cfg.headline}
                subtitle={cfg.subheadline}
                icon={<Activity className="h-4 w-4 text-primary" />}
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
                      className={`rounded-lg border py-3 text-sm font-medium transition ${
                        measurements.sexo === s
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-muted-foreground hover:border-primary/35"
                      }`}
                    >
                      {s === "M" ? "Masculino" : "Feminino"}
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            {/* Perguntas amplas */}
            <Card>
              <CardHeader
                title="Sobre você"
                subtitle="Perguntas rápidas para entender seu momento — sem termos técnicos"
                icon={<Sparkles className="h-4 w-4 text-primary" />}
                progress={Math.round((broadFilled / BROAD_QUESTIONS.length) * 100)}
              />
              <div className="space-y-5">
                {BROAD_QUESTIONS.map((q) => (
                  <div key={q.key}>
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <span>{q.emoji}</span> {q.title}
                    </h3>
                    {q.subtitle && <p className="text-xs text-muted-foreground mt-0.5">{q.subtitle}</p>}
                    <div className="grid gap-2 mt-2">
                      {q.options.map((opt) => {
                        const active = broad[q.key] === opt;
                        return (
                          <button
                            key={opt}
                            onClick={() => setBroad((prev) => ({ ...prev, [q.key]: opt }))}
                            className={`text-sm rounded-lg border px-4 py-3 text-left transition ${
                              active
                                ? "border-primary bg-primary text-white font-medium shadow-sm"
                                : "border-border bg-card text-foreground/80 hover:border-primary/35"
                            }`}
                          >
                            {opt}
                            {active && <Check className="inline h-3.5 w-3.5 ml-1.5" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Rotina */}
            <Card>
              <CardHeader
                title="Informações de Rotina"
                subtitle="Detalhes sobre sua rotina de treinos"
                icon={<Sparkles className="h-4 w-4 text-primary" />}
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
                      className="h-8 w-8 rounded-lg border-2 border-white object-cover"
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">{cfg.socialProof}</span>
              </div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70 mt-4">Resultados reais</p>
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
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground/70">
                    A partir de
                  </div>
                  <div className="text-2xl font-extrabold text-foreground">{cfg.basePrice}</div>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1 text-left">
                  <li className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-primary" /> Treino personalizado completo
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-primary" /> Baseado nas suas preferências
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-primary" /> Modifique quando quiser
                  </li>
                </ul>
              </div>
              <button
                onClick={handleGoPlans}
                disabled={!canSubmit}
                className="mt-5 w-full rounded-lg bg-primary py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cfg.ctaLabel} →
              </button>
              <p className="text-[10px] text-muted-foreground/70 mt-2 flex items-center justify-center gap-1">
                <Lock className="h-3 w-3" /> Pagamento seguro
              </p>
            </Card>

            {!!cfg.testimonials?.length && (
              <Card>
                <h3 className="text-lg font-bold text-center">O que nossos alunos dizem</h3>
                <p className="text-xs text-muted-foreground text-center mb-4">
                  Resultados reais de quem já começou
                </p>
                <div className="grid gap-3 md:grid-cols-3">
                  {cfg.testimonials.map((t) => (
                    <div
                      key={t.id}
                      className="rounded-lg border border-border bg-card p-4 flex flex-col"
                    >
                      <div className="flex items-center gap-3">
                        {t.avatar && (
                          <img
                            src={t.avatar}
                            alt=""
                            className="h-10 w-10 rounded-lg object-cover"
                          />
                        )}
                        <div>
                          <div className="text-sm font-bold">{t.name}</div>
                          {t.role && (
                            <div className="text-[10px] text-primary font-medium">{t.role}</div>
                          )}
                        </div>
                      </div>
                      {typeof t.rating === "number" && (
                        <div className="flex gap-0.5 mt-2">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3.5 w-3.5 ${
                                i < (t.rating ?? 0)
                                  ? "fill-primary text-primary"
                                  : "text-muted-foreground/30"
                              }`}
                            />
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">"{t.text}"</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {cfg.guarantee?.enabled && (
              <Card className="border-2 border-primary/25 bg-primary/5">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary p-2 text-white shrink-0">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">{cfg.guarantee.title}</h3>
                    <p className="text-xs text-foreground/80 mt-1">{cfg.guarantee.description}</p>
                  </div>
                </div>
              </Card>
            )}

            <div className="text-center text-xs text-muted-foreground/70 pb-6">
              Já são mais de 850 mil pessoas com seus objetivos alcançados
            </div>
          </>
        )}


        {stage === "plans" && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-2xl font-extrabold">Escolha seu plano</h2>
              <p className="text-sm text-muted-foreground">Selecione o melhor plano para você</p>
              <button
                onClick={() => setStage("nutrition")}
                className="mt-2 text-xs text-primary hover:underline"
              >
                ← Mudar objetivo
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {cfg.plans.map((p) => (
                <div
                  key={p.id}
                  className={`relative rounded-lg border-2 bg-card p-5 flex flex-col transition ${
                    p.highlighted
                      ? "border-primary shadow-lg shadow-primary/10"
                      : "border-border"
                  }`}
                >
                  {p.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                      {p.badge}
                    </div>
                  )}
                  <div className="text-xs text-primary font-semibold flex items-center gap-1">
                    {cfg.brandEmoji} {cfg.brand}
                  </div>
                  <h3 className="mt-2 text-lg font-bold">{p.name}</h3>
                  <div className="mt-1 text-3xl font-extrabold text-foreground">{p.price}</div>
                  <ul className="mt-4 space-y-2 text-sm text-foreground/80 flex-1">
                    {p.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handlePickPlan(p)}
                    className={`mt-5 rounded-lg py-2.5 text-sm font-semibold transition ${
                      p.highlighted
                        ? "bg-primary text-white hover:bg-primary"
                        : "border-2 border-primary text-primary hover:bg-primary/10"
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
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                ← Voltar
              </button>
              <span className="text-xs font-semibold text-primary bg-primary/10 rounded-lg px-3 py-1 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Pagamento Seguro
              </span>
            </div>
            <p className="text-center text-xs text-muted-foreground mb-2">Escolha como pagar</p>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {(["pix", "card"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={`rounded-lg border-2 py-3 text-sm font-semibold transition ${
                    method === m
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  {m === "pix" ? "✚ PIX" : "💳 Cartão"}
                </button>
              ))}
            </div>

            <div className="rounded-lg border border-border p-5 bg-card">
              <div className="text-center font-bold text-primary flex items-center justify-center gap-1">
                {cfg.brandEmoji} {cfg.brand}
              </div>
              <div className="mt-4 flex items-center justify-between rounded-lg bg-secondary px-4 py-3">
                <span className="text-sm font-medium text-foreground/80 flex items-center gap-2">
                  {method === "pix" ? "✚ Pagamento via PIX" : "💳 Pagamento via Cartão"}
                </span>
                <span className="text-lg font-bold text-primary">{formatBRL(totalPrice)}</span>
              </div>
              {activeBumps.map((b) => (
                <label
                  key={b.id}
                  className={`mt-4 flex cursor-pointer gap-3 rounded-lg border-2 border-dashed p-4 transition ${
                    bumpChecked[b.id] ? "border-primary bg-primary/10" : "border-primary/35 bg-primary/5"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(bumpChecked[b.id])}
                    onChange={(e) =>
                      setBumpChecked((prev) => ({ ...prev, [b.id]: e.target.checked }))
                    }
                    className="mt-1 h-5 w-5 accent-primary"
                  />
                  <span className="text-left">
                    <span className="block text-sm font-bold text-foreground">
                      Sim! Quero adicionar: {b.title} — +{formatBRL(b.price)}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">{b.description}</span>
                  </span>
                </label>
              ))}
              {unlockNutrition && (
                <div className="mt-5 rounded-lg border border-primary/30 bg-secondary p-4">
                  <p className="text-base font-bold text-foreground">Sua alimentação</p>
                  <p className="mb-4 text-xs text-muted-foreground">Toque nas opções para personalizarmos seu plano alimentar. Não substitui avaliação médica ou nutricional.</p>
                  <NutritionChoices value={nutrition} onChange={setNutrition} />
                </div>
              )}
              <ul className="mt-4 space-y-1.5 text-sm text-foreground/80">
                {selectedPlan.features.slice(0, 3).map((f, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="text-primary">🎯</span> {f}
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
                <label className="block text-xs text-muted-foreground pt-2">
                  Digite seu email para receber o treino:
                </label>
                <TextInput
                  placeholder="voce@email.com"
                  value={contact.email}
                  onChange={(v) => setContact((c) => ({ ...c, email: v }))}
                  type="email"
                />
              </div>
              {pixError && (
                <p className="mt-3 text-center text-xs font-medium text-red-600">{pixError}</p>
              )}
              <button
                onClick={handleFinish}
                disabled={!contact.email || submitting || (unlockNutrition && (!nutrition.goal || !nutrition.routine))}
                className="mt-5 w-full rounded-lg bg-primary py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary/25 hover:bg-primary disabled:opacity-50 flex items-center justify-center gap-2"
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

        {stage === "pix" && pix && (
          <Card>
            <div className="text-center">
              <span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <ShieldCheck className="h-3 w-3" /> Pagamento via PIX
              </span>
              <h2 className="mt-3 text-xl font-extrabold text-foreground">
                Escaneie o QR Code para pagar
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Valor:{" "}
                <b className="text-primary">
                  {pix.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </b>
              </p>
            </div>

            {pix.qrCodeBase64 && (
              <img
                src={`data:image/png;base64,${pix.qrCodeBase64}`}
                alt="QR Code PIX para pagamento"
                className="mx-auto mt-5 h-56 w-56 rounded-lg border border-border bg-card p-2"
              />
            )}

            <div className="mt-5">
              <label className="text-xs font-medium text-muted-foreground">PIX copia e cola</label>
              <div className="mt-1 rounded-lg border border-border bg-secondary p-3 text-[11px] break-all text-muted-foreground">
                {pix.qrCode}
              </div>
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(pix.qrCode);
                    setPixCopied(true);
                    setTimeout(() => setPixCopied(false), 2500);
                  } catch {
                    setPixCopied(false);
                  }
                }}
                className="mt-3 w-full rounded-lg bg-primary py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary/25 hover:bg-primary"
              >
                {pixCopied ? "Código copiado ✓" : "Copiar código PIX"}
              </button>
              {pix.ticketUrl && (
                <a
                  href={pix.ticketUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 block text-center text-xs font-medium text-primary hover:underline"
                >
                  Abrir comprovante no Mercado Pago
                </a>
              )}
            </div>

            <div className="mt-5 flex items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-3 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              Aguardando confirmação do pagamento... a liberação é automática.
            </div>

            <button
              onClick={() => {
                setPix(null);
                setStage("checkout");
              }}
              className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground"
            >
              ← Voltar e escolher outra forma de pagamento
            </button>
          </Card>
        )}

        {stage === "done" && (
          <Card className="text-center py-10">
            <div className="mx-auto h-14 w-14 rounded-lg bg-primary flex items-center justify-center text-white text-3xl">
              ✓
            </div>
            <h2 className="mt-4 text-2xl font-extrabold">Tudo pronto, {contact.name || "atleta"}!</h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">{cfg.thankYou}</p>

            {accountLoading && (
              <p className="mt-6 text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Criando sua conta de acesso...
              </p>
            )}

            {!accountLoading && account?.ok && (
              <div className="mx-auto mt-6 max-w-md rounded-lg border border-primary/25 bg-primary/10 p-5 text-left">
                <p className="text-sm font-bold text-primary">
                  {account.created ? "Sua conta foi criada!" : "Seu acesso foi liberado!"}
                </p>
                <p className="mt-2 text-sm text-foreground/80">
                  Agora é só criar a sua senha para entrar na plataforma. Também enviamos uma cópia para{" "}
                  <b>{contact.email}</b>.
                </p>
                <a
                  href={pix?.reference ? `/criar-senha?ref=${encodeURIComponent(pix.reference)}` : "/auth"}
                  className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary px-4 font-semibold text-white hover:bg-primary"
                >
                  Criar minha senha
                </a>
                {!account.emailSent && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Não conseguimos enviar o e-mail agora. Use “Esqueci minha senha” na tela de acesso com este
                    mesmo e-mail.
                  </p>
                )}
              </div>
            )}

            {!accountLoading && !account && (
              <p className="mt-4 text-xs text-muted-foreground/70">
                Enviamos os detalhes para <b>{contact.email}</b>. Fique de olho na sua caixa de entrada.
              </p>
            )}
          </Card>
        )}
      </main>
    </div>
  );
}

const NUTRITION_QUESTIONS: { key: keyof NutritionAnswers; label: string; options: string[]; single?: boolean }[] = [
  { key: "goal", label: "Qual seu objetivo principal com a alimentação?", single: true, options: ["Emagrecer", "Ganhar massa muscular", "Definir o corpo", "Ter mais energia", "Comer de forma mais saudável"] },
  { key: "routine", label: "Quantas refeições você faz por dia?", single: true, options: ["1 a 2", "3", "4", "5 ou mais", "Não tenho horário certo"] },
  { key: "favoriteFoods", label: "Quais alimentos você mais gosta?", options: ["Frango", "Carne vermelha", "Peixe", "Ovos", "Arroz e feijão", "Massas", "Frutas", "Legumes e verduras", "Laticínios", "Doces"] },
  { key: "dislikedFoods", label: "Quais alimentos você não gosta?", options: ["Peixe", "Ovos", "Legumes e verduras", "Frutas", "Carne vermelha", "Laticínios", "Nenhum"] },
  { key: "restrictions", label: "Possui alguma restrição alimentar?", options: ["Nenhuma", "Vegetariano", "Vegano", "Sem lactose", "Sem glúten", "Low carb"] },
  { key: "allergies", label: "Possui alguma alergia alimentar?", options: ["Nenhuma", "Lactose", "Glúten", "Amendoim / castanhas", "Frutos do mar", "Ovo"] },
  { key: "avoidedFoods", label: "Existe algum alimento que você não consome?", options: ["Nenhum", "Carne de porco", "Carne vermelha", "Açúcar", "Refrigerante", "Bebida alcoólica"] },
];

function NutritionChoices({ value, onChange }: { value: NutritionAnswers; onChange: (v: NutritionAnswers) => void }) {
  return (
    <div className="grid gap-5">
      {NUTRITION_QUESTIONS.map((q) => {
        const selected = value[q.key] ? value[q.key].split(", ") : [];
        const toggle = (opt: string) => {
          let next: string[];
          if (q.single) next = [opt];
          else if (selected.includes(opt)) next = selected.filter((s) => s !== opt);
          else if (/^Nenhum/.test(opt)) next = [opt];
          else next = [...selected.filter((s) => !/^Nenhum/.test(s)), opt];
          onChange({ ...value, [q.key]: next.join(", ") });
        };
        return (
          <div key={q.key}>
            <p className="mb-2 text-sm font-semibold text-foreground">
              {q.label} <span className="text-xs font-normal text-muted-foreground">{q.single ? "(escolha uma)" : "(pode marcar várias)"}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {q.options.map((opt) => {
                const on = selected.includes(opt);
                return (
                  <button key={opt} type="button" onClick={() => toggle(opt)} className={`min-h-10 rounded-lg border-2 px-3 py-2 text-sm font-medium transition ${on ? "border-primary bg-primary/15 text-foreground" : "border-border bg-card text-muted-foreground hover:border-primary/50"}`}>
                    {on && <Check className="mr-1 inline h-3.5 w-3.5 text-primary" />}{opt}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-lg border border-border bg-card p-5 shadow-sm ${className}`}
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
          <div className="h-1.5 w-20 rounded-lg bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
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
      className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20"
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
        className={`w-full appearance-none rounded-lg border border-border bg-card px-4 py-3 pr-9 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 ${
          value ? "text-foreground" : "text-muted-foreground/70"
        }`}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 text-xs">
        ▾
      </span>
    </div>
  );
}

function VideoEmbed({ url }: { url: string }) {
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (yt) {
    return (
      <div className="relative w-full overflow-hidden rounded-lg bg-black" style={{ paddingTop: "56.25%" }}>
        <iframe
          src={`https://www.youtube.com/embed/${yt[1]}`}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  if (vimeo) {
    return (
      <div className="relative w-full overflow-hidden rounded-lg bg-black" style={{ paddingTop: "56.25%" }}>
        <iframe
          src={`https://player.vimeo.com/video/${vimeo[1]}`}
          className="absolute inset-0 h-full w-full"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  return (
    <video src={url} controls className="w-full rounded-lg bg-black" />
  );
}

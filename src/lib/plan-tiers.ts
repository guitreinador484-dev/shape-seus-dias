// Planos vendidos na plataforma. Usado no funil, no pagamento, na IA e no PDF.

export type PlanTierId = "basico" | "intermediario" | "avancado";

export type PlanTier = {
  id: PlanTierId;
  emoji: string;
  name: string;
  shortName: string;
  tagline: string;
  price: string;
  badge?: string;
  highlighted?: boolean;
  features: string[];
  /** De quantos em quantos dias o treino é atualizado. */
  updateEveryDays: number;
  /** Faixa de exercícios por treino que a IA deve montar. */
  exercises: [number, number];
  /** Instruções extras enviadas à IA. */
  aiInstructions: string;
  /** Blocos extras no PDF. */
  pdf: { goals: boolean; progression: boolean; perExerciseNotes: boolean };
};

export const PLAN_TIERS: Record<PlanTierId, PlanTier> = {
  basico: {
    id: "basico",
    emoji: "🟢",
    name: "Plano Básico — Treino",
    shortName: "Básico",
    tagline: "Para quem quer receber um treino estruturado e começar.",
    price: "R$ 19,99",
    features: [
      "Treino personalizado",
      "Ficha de treino em PDF",
      "Acesso à plataforma",
      "Séries e repetições",
      "Carga sugerida",
      "Tempo de descanso",
      "Orientações de execução",
      "Atualização do treino a cada 30 dias",
      "Histórico básico de treinos",
    ],
    updateEveryDays: 30,
    exercises: [5, 7],
    aiInstructions:
      "Nível básico: treino simples e direto, com orientação curta de execução em cada exercício. " +
      "Sem periodização complexa. Não inclua metas nem progressão detalhada.",
    pdf: { goals: false, progression: false, perExerciseNotes: true },
  },
  intermediario: {
    id: "intermediario",
    emoji: "🔵",
    name: "Plano Intermediário — Evolução",
    shortName: "Intermediário",
    tagline: "Para quem quer acompanhar o próprio progresso.",
    price: "R$ 29,99",
    badge: "Mais vendido",
    highlighted: true,
    features: [
      "Tudo do Básico",
      "Treino personalizado por objetivo",
      "Divisão de treino personalizada",
      "Registro de cargas e repetições",
      "Histórico de evolução",
      "Metas de treino",
      "Ajustes no treino",
      "Atualização a cada 15 dias",
      "Avaliação mensal",
      "Relatório mensal de evolução",
      "PDF atualizado automaticamente",
    ],
    updateEveryDays: 15,
    exercises: [6, 8],
    aiInstructions:
      "Nível intermediário: divisão de treino escolhida de acordo com o objetivo do aluno. " +
      "Inclua metas de treino claras (goals) e uma orientação de progressão de cargas (progression) " +
      "para o aluno registrar carga e repetições a cada sessão.",
    pdf: { goals: true, progression: true, perExerciseNotes: true },
  },
  avancado: {
    id: "avancado",
    emoji: "🟣",
    name: "Plano Avançado — Performance",
    shortName: "Avançado",
    tagline: "Para quem quer um acompanhamento mais completo.",
    price: "R$ 49,99",
    badge: "Recomendado",
    features: [
      "Tudo do Intermediário",
      "Planejamento de treino mais detalhado",
      "Maior nível de personalização",
      "Ajustes frequentes",
      "Atualização semanal ou quinzenal",
      "Metas individualizadas",
      "Histórico completo",
      "Acompanhamento de evolução",
      "Avaliações periódicas e relatórios completos",
      "Controle de desempenho",
      "Progressão de cargas",
      "Observações específicas por exercício",
      "PDF atualizado a cada alteração",
      "Suporte prioritário",
    ],
    updateEveryDays: 7,
    exercises: [7, 10],
    aiInstructions:
      "Nível avançado: planejamento detalhado e altamente personalizado. Inclua metas individualizadas (goals), " +
      "progressão de cargas semana a semana (progression), técnicas de intensidade quando fizer sentido e " +
      "observações específicas de execução em TODOS os exercícios.",
    pdf: { goals: true, progression: true, perExerciseNotes: true },
  },
};

export const PLAN_TIER_LIST: PlanTier[] = [
  PLAN_TIERS.basico,
  PLAN_TIERS.intermediario,
  PLAN_TIERS.avancado,
];

const ALIASES: Record<string, PlanTierId> = {
  basico: "basico",
  básico: "basico",
  essencial: "basico",
  treino: "basico",
  intermediario: "intermediario",
  intermediário: "intermediario",
  completo: "intermediario",
  evolucao: "intermediario",
  avancado: "avancado",
  avançado: "avancado",
  premium: "avancado",
  performance: "avancado",
};

/** Resolve o plano comprado (com fallback para o Básico). */
export function resolvePlanTier(planId?: string | null): PlanTier {
  const key = (planId ?? "").trim().toLowerCase();
  return PLAN_TIERS[ALIASES[key] ?? "basico"];
}

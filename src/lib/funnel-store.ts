import { EXERCISE_GROUPS } from "@/lib/exercise-library";

export type FunnelPlan = {
  id: string;
  name: string;
  price: string;
  badge?: string;
  highlighted?: boolean;
  features: string[];
};

export type FunnelConfig = {
  slug: string;
  brand: string;
  brandEmoji: string;
  headline: string;
  subheadline: string;
  socialProof: string;
  results: string[]; // image URLs
  basePrice: string;
  ctaLabel: string;
  objetivos: string[];
  niveis: string[];
  dias: string[];
  groupKeys: string[]; // muscle group keys to show
  routine: { label: string; options: string[] }[];
  plans: FunnelPlan[];
  paymentDestination: { whatsapp?: string; email?: string };
  thankYou: string;
};

export const DEFAULT_RESULT_IMAGES = [
  "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1594381898411-846e7d193883?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1583500178690-f7ee36e18276?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=400&fit=crop",
];

export const DEFAULT_FUNNEL: FunnelConfig = {
  slug: "montar-meu-treino",
  brand: "Shape Seus Dias",
  brandEmoji: "🏋️",
  headline: "Medidas Corporais",
  subheadline: "Preencha para montar seu treino personalizado",
  socialProof: "+2 mil alunos já treinam com a gente",
  results: DEFAULT_RESULT_IMAGES,
  basePrice: "R$ 19,99",
  ctaLabel: "Montar meu treino",
  objetivos: ["Emagrecimento", "Hipertrofia", "Definição", "Condicionamento", "Saúde"],
  niveis: ["Iniciante", "Intermediário", "Avançado"],
  dias: ["2x na semana", "3x na semana", "4x na semana", "5x na semana", "6x na semana"],
  groupKeys: EXERCISE_GROUPS.map((g) => g.key),
  routine: [
    { label: "Como é sua rotina?", options: ["Sedentária", "Moderada", "Ativa", "Muito ativa"] },
    { label: "Onde vai treinar?", options: ["Casa", "Academia", "Ar livre", "Ambos"] },
    { label: "Possui alguma restrição?", options: ["Nenhuma", "Joelho", "Coluna", "Ombro", "Outra"] },
  ],
  plans: [
    {
      id: "essencial",
      name: "Plano Essencial",
      price: "R$ 19,99",
      features: [
        "Treino personalizado",
        "Divisão semanal completa",
        "Acompanhe seu progresso",
        "Suporte por email",
      ],
    },
    {
      id: "completo",
      name: "Treino + Dieta",
      price: "R$ 29,99",
      badge: "Mais vendido",
      highlighted: true,
      features: [
        "Treino personalizado",
        "Dieta incluída",
        "Treinos em vídeo",
        "Suporte via WhatsApp",
        "Ajustes semanais",
      ],
    },
    {
      id: "premium",
      name: "Plano Premium",
      price: "R$ 49,99",
      badge: "Recomendado",
      features: [
        "Tudo do plano completo",
        "Consulta com personal",
        "Plataforma de aulas online",
        "Lista de substituições",
        "Suplementação recomendada",
      ],
    },
  ],
  paymentDestination: { whatsapp: "", email: "" },
  thankYou: "Recebemos suas respostas! Você será redirecionado ao pagamento.",
};

const LS_KEY = "funnel:config:v1";

export function loadFunnelLocal(): FunnelConfig {
  if (typeof window === "undefined") return DEFAULT_FUNNEL;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_FUNNEL;
    return { ...DEFAULT_FUNNEL, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_FUNNEL;
  }
}

export function saveFunnelLocal(cfg: FunnelConfig) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(cfg));
}

export type FunnelLead = {
  id: string;
  createdAt: string;
  answers: Record<string, unknown>;
  planId?: string;
  contact: { name?: string; email?: string; whatsapp?: string };
};

const LEADS_KEY = "funnel:leads:v1";

export function saveFunnelLead(lead: FunnelLead) {
  if (typeof window === "undefined") return;
  const list = loadFunnelLeads();
  list.unshift(lead);
  localStorage.setItem(LEADS_KEY, JSON.stringify(list.slice(0, 500)));
}

export function loadFunnelLeads(): FunnelLead[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LEADS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

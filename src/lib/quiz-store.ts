import { useSyncExternalStore } from "react";

// ============ Types ============

export type TextStyle = {
  color?: string;
  fontWeight?: "normal" | "bold" | "300" | "400" | "500" | "600" | "700" | "800" | "900";
  fontSize?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
  bgColor?: string;
};

export type BlockKind =
  | "titulo"
  | "paragrafo"
  | "imagem"
  | "escolha"
  | "sim-nao"
  | "entrada"
  | "botao"
  | "espacador"
  | "video"
  | "escala"
  | "multipla"
  | "faq"
  | "loading"
  | "depoimento"
  | "beneficio";

export type Block =
  | { id: string; kind: "titulo"; text: string; align?: "left" | "center"; style?: TextStyle }
  | { id: string; kind: "paragrafo"; text: string; style?: TextStyle }
  | { id: string; kind: "imagem"; url: string; alt?: string }
  | {
      id: string;
      kind: "escolha";
      question: string;
      options: { id: string; text: string; points: number }[];
      autoAdvance?: boolean;
    }
  | { id: string; kind: "sim-nao"; question: string; yesPoints: number; noPoints: number }
  | {
      id: string;
      kind: "entrada";
      field: "name" | "email" | "whatsapp";
      label: string;
      required: boolean;
    }
  | { id: string; kind: "botao"; text: string; action: "next" | "submit"; style?: TextStyle }
  | { id: string; kind: "espacador"; height: number }
  | { id: string; kind: "video"; url: string; caption?: string }
  | {
      id: string;
      kind: "escala";
      question: string;
      min: number;
      max: number;
      minLabel?: string;
      maxLabel?: string;
    }
  | {
      id: string;
      kind: "multipla";
      question: string;
      options: { id: string; text: string; points: number }[];
    }
  | {
      id: string;
      kind: "faq";
      items: { id: string; q: string; a: string }[];
    }
  | {
      id: string;
      kind: "loading";
      message: string;
      durationMs: number;
    }
  | {
      id: string;
      kind: "depoimento";
      items: {
        id: string;
        name: string;
        role?: string;
        text: string;
        avatarUrl?: string;
        rating?: number;
      }[];
    }
  | {
      id: string;
      kind: "beneficio";
      text: string;
      color?: "green" | "blue" | "red" | "amber" | "slate";
    };

export type Step = {
  id: string;
  name: string;
  blocks: Block[];
};

export type Range = {
  id: string;
  min: number;
  max: number;
  profile: string;
  message: string;
  offer: string;
  ctaUrl?: string;
  ctaText?: string;
};

export type LeadRecord = {
  id: string;
  quizId: string;
  name: string;
  email: string;
  whatsapp: string;
  score: number;
  profile: string;
  status: "qualificado" | "em-contato" | "convertido" | "nao-qualificado";
  date: string;
  answers: Record<string, string>;
};

export type QuizConfig = {
  id: string;
  slug: string;
  title: string;
  description: string;
  status: "ativo" | "rascunho" | "pausado";
  accent: string;
  offer: string;
  steps: Step[];
  ranges: Range[];
  showLogo: boolean;
  showProgress: boolean;
  allowBack: boolean;
  responses: number;
  createdAt: string;
  width?: "narrow" | "medium" | "wide";
};

// ============ Store ============

const QKEY = "quiz-vendas:quizzes";
const LKEY = "quiz-vendas:leads";

function uid() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

function isBrowser() {
  return typeof window !== "undefined";
}

const qListeners = new Set<() => void>();
const lListeners = new Set<() => void>();
let quizzes: QuizConfig[] = [];
let leads: LeadRecord[] = [];

function persistQ() {
  if (isBrowser()) localStorage.setItem(QKEY, JSON.stringify(quizzes));
  qListeners.forEach((fn) => fn());
}
function persistL() {
  if (isBrowser()) localStorage.setItem(LKEY, JSON.stringify(leads));
  lListeners.forEach((fn) => fn());
}

export function getQuizzes() {
  return quizzes;
}
export function getQuiz(id: string) {
  return quizzes.find((q) => q.id === id);
}
export function getQuizBySlug(slug: string) {
  return quizzes.find((q) => q.slug === slug);
}
export function getLeads() {
  return leads;
}

export function useQuizzes() {
  return useSyncExternalStore(
    (l) => {
      qListeners.add(l);
      return () => qListeners.delete(l);
    },
    getQuizzes,
    () => SEED,
  );
}
export function useLeads() {
  return useSyncExternalStore(
    (l) => {
      lListeners.add(l);
      return () => lListeners.delete(l);
    },
    getLeads,
    () => SEED_LEADS,
  );
}

export function upsertQuiz(q: QuizConfig) {
  const i = quizzes.findIndex((x) => x.id === q.id);
  if (i === -1) quizzes = [...quizzes, q];
  else quizzes = quizzes.map((x) => (x.id === q.id ? q : x));
  persistQ();
}

export function deleteQuiz(id: string) {
  quizzes = quizzes.filter((q) => q.id !== id);
  persistQ();
}

export function duplicateQuiz(id: string) {
  const orig = getQuiz(id);
  if (!orig) return null;
  const copy: QuizConfig = {
    ...orig,
    id: uid(),
    slug: `${orig.slug}-${Math.random().toString(36).slice(2, 5)}`,
    title: `${orig.title} (cópia)`,
    status: "rascunho",
    responses: 0,
    createdAt: new Date().toISOString(),
  };
  quizzes = [...quizzes, copy];
  persistQ();
  return copy;
}

export function toggleQuizStatus(id: string) {
  const q = getQuiz(id);
  if (!q || q.status === "rascunho") return;
  upsertQuiz({ ...q, status: q.status === "ativo" ? "pausado" : "ativo" });
}

export function createBlankQuiz(): QuizConfig {
  const id = uid();
  const q: QuizConfig = {
    id,
    slug: `quiz-${id.slice(0, 6)}`,
    title: "Novo quiz",
    description: "Editado agora",
    status: "rascunho",
    accent: "#2563eb",
    offer: "",
    steps: [
      {
        id: uid(),
        name: "Boas-vindas",
        blocks: [
          { id: uid(), kind: "titulo", text: "Bem-vindo ao quiz!", align: "center" },
          {
            id: uid(),
            kind: "paragrafo",
            text: "Responda algumas perguntas rápidas para descobrir o melhor caminho para você.",
          },
          { id: uid(), kind: "botao", text: "Começar 👉", action: "next" },
        ],
      },
      {
        id: uid(),
        name: "Pergunta 1",
        blocks: [
          {
            id: uid(),
            kind: "escolha",
            question: "Qual seu objetivo principal?",
            autoAdvance: true,
            options: [
              { id: uid(), text: "Emagrecer", points: 8 },
              { id: uid(), text: "Ganhar massa", points: 9 },
              { id: uid(), text: "Condicionamento", points: 7 },
            ],
          },
        ],
      },
      {
        id: uid(),
        name: "Captura",
        blocks: [
          { id: uid(), kind: "titulo", text: "Quase lá!", align: "center" },
          { id: uid(), kind: "paragrafo", text: "Insira seus dados para ver o resultado." },
          { id: uid(), kind: "entrada", field: "name", label: "Nome", required: true },
          { id: uid(), kind: "entrada", field: "email", label: "E-mail", required: true },
          { id: uid(), kind: "entrada", field: "whatsapp", label: "WhatsApp", required: false },
          { id: uid(), kind: "botao", text: "Ver resultado 🎯", action: "submit" },
        ],
      },
    ],
    ranges: [
      {
        id: uid(),
        min: 80,
        max: 100,
        profile: "Pronto para evoluir",
        message: "Você tem perfil ideal para acelerar resultados.",
        offer: "Mentoria premium",
        ctaText: "Falar no WhatsApp",
        ctaUrl: "https://wa.me/5511999999999",
      },
      {
        id: uid(),
        min: 50,
        max: 79,
        profile: "Quase lá",
        message: "Com o plano certo você dobra seus resultados.",
        offer: "Lista de espera",
        ctaText: "Quero saber mais",
        ctaUrl: "https://wa.me/5511999999999",
      },
      {
        id: uid(),
        min: 0,
        max: 49,
        profile: "Começando",
        message: "Vamos te preparar com o conteúdo certo.",
        offer: "E-book gratuito",
        ctaText: "Receber e-book",
        ctaUrl: "#",
      },
    ],
    showLogo: true,
    showProgress: true,
    allowBack: true,
    responses: 0,
    createdAt: new Date().toISOString(),
    width: "medium",
  };
  return q;
}

// ============ Leads ============

export function addLead(
  lead: Omit<LeadRecord, "id" | "date" | "status"> & { status?: LeadRecord["status"] },
) {
  const rec: LeadRecord = {
    ...lead,
    id: uid(),
    date: new Date().toLocaleDateString("pt-BR"),
    status: lead.status ?? (lead.score >= 50 ? "qualificado" : "nao-qualificado"),
  };
  leads = [rec, ...leads];
  persistL();
  // Increment responses on the quiz
  const q = getQuiz(lead.quizId);
  if (q) upsertQuiz({ ...q, responses: q.responses + 1 });
}

// ============ Seed ============

const SEED: QuizConfig[] = [
  {
    id: "seed-1",
    slug: "diagnostico-treino",
    title: "Diagnóstico: Qual treino combina com você?",
    description: "Funil principal de captação para mentoria de emagrecimento.",
    status: "ativo",
    accent: "#2563eb",
    offer: "Mentoria Shape 90 dias",
    showLogo: true,
    showProgress: true,
    allowBack: true,
    responses: 142,
    createdAt: new Date().toISOString(),
    steps: [
      {
        id: "s1",
        name: "Boas-vindas",
        blocks: [
          { id: "b1", kind: "titulo", text: "Descubra seu plano de treino ideal", align: "center" },
          {
            id: "b2",
            kind: "paragrafo",
            text: "Responda 5 perguntas rápidas e descubra o programa perfeito para o seu objetivo.",
          },
          { id: "b3", kind: "botao", text: "Começar agora 👉", action: "next" },
        ],
      },
      {
        id: "s2",
        name: "Objetivo",
        blocks: [
          {
            id: "b4",
            kind: "escolha",
            question: "Qual seu objetivo principal?",
            autoAdvance: true,
            options: [
              { id: "o1", text: "Emagrecer", points: 8 },
              { id: "o2", text: "Ganhar massa muscular", points: 9 },
              { id: "o3", text: "Melhorar condicionamento", points: 7 },
              { id: "o4", text: "Apenas curiosidade", points: 2 },
            ],
          },
        ],
      },
      {
        id: "s3",
        name: "Frequência",
        blocks: [
          {
            id: "b5",
            kind: "escolha",
            question: "Com que frequência treina hoje?",
            autoAdvance: true,
            options: [
              { id: "o5", text: "5+ vezes por semana", points: 10 },
              { id: "o6", text: "3 a 4 vezes", points: 8 },
              { id: "o7", text: "1 a 2 vezes", points: 4 },
              { id: "o8", text: "Quase nunca", points: 1 },
            ],
          },
        ],
      },
      {
        id: "s4",
        name: "Investimento",
        blocks: [
          {
            id: "b6",
            kind: "escolha",
            question: "Quanto está disposto(a) a investir por mês?",
            autoAdvance: true,
            options: [
              { id: "o9", text: "Acima de R$ 500", points: 10 },
              { id: "o10", text: "R$ 200 a R$ 500", points: 7 },
              { id: "o11", text: "Até R$ 200", points: 4 },
              { id: "o12", text: "Não pretendo investir agora", points: 0 },
            ],
          },
        ],
      },
      {
        id: "s5",
        name: "Comprometimento",
        blocks: [
          {
            id: "b7",
            kind: "escolha",
            question: "Qual seu nível de comprometimento?",
            autoAdvance: true,
            options: [
              { id: "o13", text: "5 - Totalmente", points: 10 },
              { id: "o14", text: "4 - Muito", points: 8 },
              { id: "o15", text: "3 - Médio", points: 5 },
              { id: "o16", text: "1-2 - Baixo", points: 2 },
            ],
          },
        ],
      },
      {
        id: "s6",
        name: "Captura",
        blocks: [
          {
            id: "b8",
            kind: "titulo",
            text: "Insira seus dados para ver seu resultado",
            align: "center",
          },
          { id: "b9", kind: "paragrafo", text: "Vamos te enviar o plano ideal por e-mail." },
          { id: "b10", kind: "entrada", field: "name", label: "Nome", required: true },
          { id: "b11", kind: "entrada", field: "email", label: "E-mail", required: true },
          { id: "b12", kind: "entrada", field: "whatsapp", label: "WhatsApp", required: false },
          { id: "b13", kind: "botao", text: "Ver meu resultado 🎯", action: "submit" },
        ],
      },
    ],
    ranges: [
      {
        id: "r1",
        min: 80,
        max: 100,
        profile: "Pronto para evoluir",
        message: "Você tem o perfil ideal para acelerar resultados com acompanhamento próximo.",
        offer: "Mentoria premium",
        ctaText: "Falar no WhatsApp",
        ctaUrl: "https://wa.me/5511999999999",
      },
      {
        id: "r2",
        min: 50,
        max: 79,
        profile: "Quase lá",
        message: "Com o plano certo você dobra seus resultados nos próximos 90 dias.",
        offer: "Lista de espera",
        ctaText: "Quero saber mais",
        ctaUrl: "https://wa.me/5511999999999",
      },
      {
        id: "r3",
        min: 0,
        max: 49,
        profile: "Começando agora",
        message: "Vamos te preparar com o conteúdo certo para começar com o pé direito.",
        offer: "E-book gratuito",
        ctaText: "Receber e-book",
        ctaUrl: "#",
      },
    ],
  },
  {
    id: "seed-2",
    slug: "pronto-hipertrofia",
    title: "Você está pronto para hipertrofia?",
    description: "Qualificação para programa de ganho de massa muscular.",
    status: "ativo",
    accent: "#0ea5e9",
    offer: "Programa Massa Pro",
    showLogo: true,
    showProgress: true,
    allowBack: true,
    responses: 89,
    createdAt: new Date().toISOString(),
    steps: [
      {
        id: "s1",
        name: "Início",
        blocks: [
          { id: "b1", kind: "titulo", text: "Hipertrofia: você está pronto?", align: "center" },
          { id: "b2", kind: "botao", text: "Começar", action: "next" },
        ],
      },
      {
        id: "s2",
        name: "Experiência",
        blocks: [
          {
            id: "b3",
            kind: "escolha",
            question: "Quanto tempo de treino você tem?",
            autoAdvance: true,
            options: [
              { id: "o1", text: "Mais de 2 anos", points: 10 },
              { id: "o2", text: "Entre 6 meses e 2 anos", points: 7 },
              { id: "o3", text: "Menos de 6 meses", points: 3 },
            ],
          },
        ],
      },
      {
        id: "s3",
        name: "Captura",
        blocks: [
          { id: "b4", kind: "entrada", field: "name", label: "Nome", required: true },
          { id: "b5", kind: "entrada", field: "email", label: "E-mail", required: true },
          { id: "b6", kind: "botao", text: "Ver resultado", action: "submit" },
        ],
      },
    ],
    ranges: [
      {
        id: "r1",
        min: 70,
        max: 100,
        profile: "Pronto para massa",
        message: "Vamos acelerar!",
        offer: "Programa Massa Pro",
        ctaText: "Quero entrar",
        ctaUrl: "https://wa.me/5511999999999",
      },
      {
        id: "r2",
        min: 0,
        max: 69,
        profile: "Preparação",
        message: "Vamos te preparar primeiro.",
        offer: "Plano base",
        ctaText: "Saber mais",
        ctaUrl: "#",
      },
    ],
  },
  {
    id: "seed-3",
    slug: "reeducacao-alimentar",
    title: "Quiz Reeducação Alimentar",
    description: "Funil novo em construção para captar leads frios.",
    status: "rascunho",
    accent: "#facc15",
    offer: "E-book gratuito",
    showLogo: true,
    showProgress: true,
    allowBack: true,
    responses: 0,
    createdAt: new Date().toISOString(),
    steps: [
      {
        id: "s1",
        name: "Início",
        blocks: [
          { id: "b1", kind: "titulo", text: "Reeducação alimentar", align: "center" },
          { id: "b2", kind: "botao", text: "Começar", action: "next" },
        ],
      },
      {
        id: "s2",
        name: "Captura",
        blocks: [
          { id: "b3", kind: "entrada", field: "email", label: "E-mail", required: true },
          { id: "b4", kind: "botao", text: "Receber e-book", action: "submit" },
        ],
      },
    ],
    ranges: [
      {
        id: "r1",
        min: 0,
        max: 100,
        profile: "Lead capturado",
        message: "Obrigado!",
        offer: "E-book",
        ctaText: "Baixar",
        ctaUrl: "#",
      },
    ],
  },
];

const SEED_LEADS: LeadRecord[] = [
  {
    id: "l1",
    quizId: "seed-1",
    name: "Mariana Souza",
    email: "mariana.s@gmail.com",
    whatsapp: "(11) 98123-4567",
    profile: "Pronto para evoluir",
    score: 87,
    status: "qualificado",
    date: "22/06/2026",
    answers: {},
  },
  {
    id: "l2",
    quizId: "seed-2",
    name: "Carlos Almeida",
    email: "carlos.almeida@outlook.com",
    whatsapp: "(21) 99876-1234",
    profile: "Pronto para massa",
    score: 92,
    status: "convertido",
    date: "21/06/2026",
    answers: {},
  },
  {
    id: "l3",
    quizId: "seed-1",
    name: "Juliana Pereira",
    email: "ju.pereira@gmail.com",
    whatsapp: "(31) 98765-4321",
    profile: "Quase lá",
    score: 64,
    status: "em-contato",
    date: "21/06/2026",
    answers: {},
  },
  {
    id: "l4",
    quizId: "seed-1",
    name: "Rafael Mendes",
    email: "rafa.mendes@yahoo.com",
    whatsapp: "(11) 97777-2222",
    profile: "Pronto para evoluir",
    score: 78,
    status: "qualificado",
    date: "20/06/2026",
    answers: {},
  },
  {
    id: "l5",
    quizId: "seed-2",
    name: "Beatriz Lima",
    email: "bia.lima@hotmail.com",
    whatsapp: "(41) 96666-3333",
    profile: "Preparação",
    score: 41,
    status: "nao-qualificado",
    date: "20/06/2026",
    answers: {},
  },
  {
    id: "l6",
    quizId: "seed-1",
    name: "Felipe Costa",
    email: "felipe.costa@gmail.com",
    whatsapp: "(11) 95555-4444",
    profile: "Pronto para evoluir",
    score: 95,
    status: "convertido",
    date: "19/06/2026",
    answers: {},
  },
];

export { uid };

// Initialize after SEED constants are defined to avoid TDZ
function loadQuizzes(): QuizConfig[] {
  if (!isBrowser()) return SEED;
  try {
    const raw = localStorage.getItem(QKEY);
    if (!raw) {
      localStorage.setItem(QKEY, JSON.stringify(SEED));
      return SEED;
    }
    return JSON.parse(raw) as QuizConfig[];
  } catch {
    return SEED;
  }
}
function loadLeads(): LeadRecord[] {
  if (!isBrowser()) return SEED_LEADS;
  try {
    const raw = localStorage.getItem(LKEY);
    if (!raw) {
      localStorage.setItem(LKEY, JSON.stringify(SEED_LEADS));
      return SEED_LEADS;
    }
    return JSON.parse(raw) as LeadRecord[];
  } catch {
    return SEED_LEADS;
  }
}

quizzes = loadQuizzes();
leads = loadLeads();

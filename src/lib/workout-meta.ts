/**
 * workout-meta.ts
 *
 * Módulo central para suporte a:
 * 1. Tipos de Treino (Tradicional, Intercalado, Circuito)
 * 2. Membros de Ênfase (Glúteos, Peitoral, Costas, Ombros, Pernas, Braços, Abdômen)
 * 3. Formatação, detecção e compatibilidade retroativa (banco e tags no título)
 */

export type WorkoutType = "tradicional" | "intercalado" | "circuito";

export type WorkoutEmphasis =
  | "Glúteos"
  | "Peitoral"
  | "Costas"
  | "Ombros"
  | "Pernas"
  | "Braços"
  | "Abdômen";

export type EmphasisSelection = WorkoutEmphasis | "nenhum";

export const WORKOUT_TYPES: { id: WorkoutType; label: string; short: string; description: string; icon: string }[] = [
  {
    id: "tradicional",
    label: "Tradicional (Séries Convencionais)",
    short: "Tradicional",
    description: "Execução com descanso padrão entre séries do mesmo exercício. Foco em sobrecarga progressiva.",
    icon: "🎯",
  },
  {
    id: "intercalado",
    label: "Intercalado (Agonista/Antagonista ou Superior/Inferior)",
    short: "Intercalado",
    description: "Exercícios em pares alternados. Economiza tempo, queima mais calorias e mantém a musculatura ativa.",
    icon: "⚡",
  },
  {
    id: "circuito",
    label: "Circuito Metabólico",
    short: "Circuito",
    description: "Exercícios em sequência contínua com pausa no final da rodada. Foco em condicionamento e queima calórica.",
    icon: "🔥",
  },
];

export const EMPHASIS_OPTIONS: { id: WorkoutEmphasis; label: string; icon: string; description: string }[] = [
  {
    id: "Glúteos",
    label: "Glúteos & Posterior",
    icon: "🍑",
    description: "Prioriza elevação pélvica, agachamentos búlgaro/sumô, cadeira abdutora e stiff no início do treino.",
  },
  {
    id: "Peitoral",
    label: "Peitoral",
    icon: "💪",
    description: "Foco no desenvolvimento do tórax, supino inclinado/reto, crucifixo e crossovers.",
  },
  {
    id: "Costas",
    label: "Costas & Dorsal",
    icon: "🔙",
    description: "Foco em puxadas, remadas e densidade dorsal para melhora da postura e costas em V.",
  },
  {
    id: "Ombros",
    label: "Ombros & Deltoides",
    icon: "🏋️",
    description: "Prioriza elevação lateral, desenvolvimentos e posterior de ombro para ombros largos e desenhados.",
  },
  {
    id: "Pernas",
    label: "Pernas & Quadríceps",
    icon: "🦵",
    description: "Prioriza agachamento livre, leg press, extensora e afundo para coxas fortes e definidas.",
  },
  {
    id: "Braços",
    label: "Braços (Bíceps & Tríceps)",
    icon: "🔱",
    description: "Foco no volume e definição dos braços com roscas isoladas, tríceps testa e na polia.",
  },
  {
    id: "Abdômen",
    label: "Abdômen & Core",
    icon: "🔥",
    description: "Foco em estabilidade lombar, oblíquos, supra e infra para barriga firme e definida.",
  },
];

export const WORKOUT_EMPHASIS_OPTIONS: { id: EmphasisSelection; label: string; icon: string; description?: string }[] = [
  {
    id: "nenhum",
    label: "Nenhum (Equilíbrio uniforme)",
    icon: "⚖️",
    description: "Distribuição muscular equilibrada entre os grupos musculares da divisão.",
  },
  ...EMPHASIS_OPTIONS,
];

/** Extrai metadados de nome do plano, tipo de treino e ênfase. */
export function parsePlanMetadata(
  rawName: string | null | undefined,
  columnType?: string | null,
  columnEmphasis?: string | null,
): {
  cleanName: string;
  workoutType: WorkoutType;
  emphasis: WorkoutEmphasis | null;
  hasEmphasis: boolean;
} {
  const name = (rawName || "Treino").trim();
  let workoutType: WorkoutType = "tradicional";
  let emphasis: WorkoutEmphasis | null = null;

  // 1. Prioriza coluna direta do banco de dados quando informada
  if (columnType === "intercalado" || columnType === "circuito" || columnType === "tradicional") {
    workoutType = columnType;
  }
  if (columnEmphasis && columnEmphasis.toLowerCase() !== "nenhum") {
    const match = EMPHASIS_OPTIONS.find(
      (opt) => opt.id.toLowerCase() === columnEmphasis.toLowerCase(),
    );
    if (match) emphasis = match.id;
  }

  // 2. Extrai de tags inseridas no título se não definido por coluna
  if (!columnType) {
    if (/\[intercalado\]|\bintercalado\b/i.test(name)) {
      workoutType = "intercalado";
    } else if (/\[circuito\]|\bcircuito\b/i.test(name)) {
      workoutType = "circuito";
    }
  }

  if (!emphasis) {
    const emphasisRegex = /\[(?:ênfase|enfase|foco):\s*([^\]]+)\]/i;
    const match = name.match(emphasisRegex);
    if (match && match[1]) {
      const parsed = match[1].trim();
      const found = EMPHASIS_OPTIONS.find(
        (opt) => opt.id.toLowerCase() === parsed.toLowerCase() || opt.label.toLowerCase().includes(parsed.toLowerCase()),
      );
      if (found) emphasis = found.id;
    }
  }

  // 3. Remove as tags [Intercalado] e [Ênfase: ...] do nome visível do treino
  const cleanName = name
    .replace(/\[intercalado\]/gi, "")
    .replace(/\[circuito\]/gi, "")
    .replace(/\[tradicional\]/gi, "")
    .replace(/\[(?:ênfase|enfase|foco):[^\]]+\]/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim() || "Treino";

  return { cleanName, workoutType, emphasis, hasEmphasis: Boolean(emphasis) };
}

/** Formata o nome do plano adicionando tags caso as colunas do banco ainda não existam. */
export function formatPlanName(
  baseName: string,
  workoutType: WorkoutType,
  emphasis?: string | null,
): string {
  let clean = baseName
    .replace(/\[intercalado\]/gi, "")
    .replace(/\[circuito\]/gi, "")
    .replace(/\[tradicional\]/gi, "")
    .replace(/\[(?:ênfase|enfase|foco):[^\]]+\]/gi, "")
    .trim() || "Treino";

  const tags: string[] = [];
  if (workoutType === "intercalado") tags.push("[Intercalado]");
  else if (workoutType === "circuito") tags.push("[Circuito]");

  if (emphasis && emphasis.toLowerCase() !== "nenhum") {
    tags.push(`[Ênfase: ${emphasis}]`);
  }

  return tags.length ? `${clean} ${tags.join(" ")}`.trim() : clean;
}

/** Normaliza texto para comparações seguras. */
export const norm = (t: string) =>
  t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

/** Detecta o grupo muscular de um exercício com base no nome. */
export function getExerciseMuscleGroup(name: string): WorkoutEmphasis | "Outros" {
  const k = norm(name);
  if (/gluteo|pelvic|abdu|aduto|bumbum|quadril|hip thrust/.test(k)) return "Glúteos";
  if (/supino|crucifixo|peck|voador|crossover|peitoral|paralelas.*peito/.test(k)) return "Peitoral";
  if (/puxada|remada|pulldown|pull down|barra fixa|cavalinho|dorsal|lombar|trap[eé]zio|encolhimento/.test(k)) return "Costas";
  if (/desenvolvimento|eleva[cç][aã]o lateral|eleva[cç][aã]o frontal|ombro|deltoide|crucifixo invertido|face pull/.test(k)) return "Ombros";
  if (/agachamento|leg|press|extensora|flexora|panturrilha|afundo|passada|hack|stiff|terra|goblet|b[uú]lgaro|lunge/.test(k)) return "Pernas";
  if (/rosca|biceps|b[ií]ceps|triceps|tr[ií]ceps|mergulho|coice|frances|pulley/.test(k)) return "Braços";
  if (/abdom|abdominal|prancha|canivete|core|russian|dead bug|mountain/.test(k)) return "Abdômen";
  return "Outros";
}

/** Verifica se o exercício pertence ao membro de ênfase selecionado. */
export function isExerciseInEmphasis(exerciseName: string, emphasis: string | null): boolean {
  if (!emphasis || emphasis === "Nenhum") return false;
  const group = getExerciseMuscleGroup(exerciseName);
  return group.toLowerCase() === emphasis.toLowerCase();
}

/**
 * Organiza os exercícios para o modo Intercalado:
 * Agrupa em pares de bloco (A1 + A2, B1 + B2...) para exibição profissional.
 */
export type InterleavedPair<T> = {
  pairIndex: number;
  pairLabel: string;
  first: T;
  second?: T;
};

export function organizeInterleavedPairs<T>(exercises: T[]): InterleavedPair<T>[] {
  const pairs: InterleavedPair<T>[] = [];
  const letters = ["A", "B", "C", "D", "E", "F", "G", "H"];

  for (let i = 0; i < exercises.length; i += 2) {
    const pairIndex = Math.floor(i / 2);
    const pairLabel = `Par ${letters[pairIndex] || pairIndex + 1}`;
    pairs.push({
      pairIndex: pairIndex + 1,
      pairLabel,
      first: exercises[i]!,
      second: exercises[i + 1],
    });
  }

  return pairs;
}

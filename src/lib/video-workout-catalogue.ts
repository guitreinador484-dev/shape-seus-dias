/** Browser-safe rules shared by the immediate plan and AI validation. */
import { formatPlanName, parsePlanMetadata, type WorkoutEmphasis, type WorkoutType } from "./workout-meta";

export type CatalogueExercise = { id: string; name: string; muscle_group: string; description: string | null; exercise_videos: { video_path: string }[] };
export type VideoExercise = CatalogueExercise & { group: string; complexity: number };
export type WorkoutExercise = { exercise_name: string; exercise_id?: string; sets: string; reps: string; rest_seconds: number; load_text: string | null; notes: string | null };
export type WorkoutResult = {
  summary: string | null;
  goals: string[] | null;
  progression: string | null;
  plans: {
    day_of_week: number;
    plan_name: string;
    exercises: WorkoutExercise[];
    workout_type?: WorkoutType;
    emphasis?: WorkoutEmphasis | null;
  }[];
};

export const exerciseNameKey = (name: string) => name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

export function classifyExercise(exercise: CatalogueExercise): VideoExercise {
  const name = exerciseNameKey(exercise.name);
  const group = /crucifixo inverso|face pull|desenvolvimento|elevacao (lateral|frontal)/.test(name) ? 'Ombros'
    : /supino|crucifixo|peck|voador|crossover/.test(name) ? 'Peito'
    : /puxada|remada|pulldown|pull down/.test(name) ? 'Costas'
    : /triceps/.test(name) ? 'Tríceps'
    : /rosca|biceps/.test(name) ? 'Bíceps'
    : /gluteo|pelvica|abdu|aduto|adulto/.test(name) ? 'Glúteos'
    : /agachamento|leg[g]? press|extensora|flexora|panturrilha|afundo|passada|hack|stiff|terra/.test(name) ? 'Pernas'
    : /abdomen|abdominal|prancha|ab maquina/.test(name) ? 'Abdômen'
    : exercise.muscle_group;
  // Conservative technical complexity, not the commercial plan's tier.
  const complexity = /bulgaro|curvada|stiff|terra|agachamento livre|passada|afundo|unilateral|uni lateral|\buni\b|cruzada/.test(name) ? 3
    : /halteres|polia|barra|prancha|remador|cavalinho|smith|face pull|martelo|concentrada|abdominal infra/.test(name) ? 2
    : /maquina|cadeira|mesa flexora|leg[g]? press|hack|articulad|gluteo press|abdutora/.test(name) ? 1 : 3;
  return { ...exercise, group, complexity };
}

export function buyerProfile(answers: Record<string, unknown>) {
  const measurements = answers.measurements as Record<string, unknown> | undefined;
  const broad = answers.broad as Record<string, unknown> | undefined;
  const level = exerciseNameKey(String(measurements?.nivel ?? answers.nivel ?? broad?.experiencia ?? answers.experiencia ?? 'iniciante'));
  const complexity = /avancado/.test(level) ? 3 : /intermediario|com frequencia/.test(level) ? 2 : 1;
  const dayText = String(measurements?.dias ?? answers.dias ?? answers.frequencia ?? '4');
  const days = Math.min(6, Math.max(2, Number(dayText.match(/[2-6]/)?.[0] ?? 4)));
  const time = String(broad?.tempo ?? answers.tempo ?? '45');
  const minutes = /20/.test(time) ? 20 : /30/.test(time) ? 30 : /hora|60/.test(time) ? 60 : 45;
  const lose = /emagre|perder|gordura|secar/.test(exerciseNameKey(JSON.stringify(answers)));

  // Detecção de tipo de treino
  const rawType = String(answers.workout_type ?? broad?.tipo_treino ?? '');
  const workoutType: WorkoutType = /intercalad/.test(rawType) ? 'intercalado' : /circuit/.test(rawType) ? 'circuito' : 'tradicional';

  // Detecção de membro de ênfase
  const rawObj = String(measurements?.objetivo ?? answers.objetivo ?? answers.emphasis ?? '');
  let emphasis: WorkoutEmphasis | null = null;
  if (/gl[uú]teo|bumbum|quadril/.test(rawObj)) emphasis = 'Glúteos';
  else if (/peitoral|peito|t[oó]rax/.test(rawObj)) emphasis = 'Peitoral';
  else if (/costas|dorsal|postura/.test(rawObj)) emphasis = 'Costas';
  else if (/ombro|deltoide/.test(rawObj)) emphasis = 'Ombros';
  else if (/perna|coxa|quadr[ií]ceps/.test(rawObj)) emphasis = 'Pernas';
  else if (/bra[cç]o|b[ií]ceps|tr[ií]ceps/.test(rawObj)) emphasis = 'Braços';
  else if (/abd[oô]men|barriga|core/.test(rawObj)) emphasis = 'Abdômen';

  return { complexity, days, minutes, lose, workoutType, emphasis };
}

export function eligibleVideoExercises(rows: CatalogueExercise[], answers: Record<string, unknown>): VideoExercise[] {
  const { complexity } = buyerProfile(answers);
  const groups = ['Peito', 'Costas', 'Pernas', 'Ombros', 'Bíceps', 'Tríceps', 'Glúteos', 'Abdômen'];
  return rows.filter(row => row.exercise_videos.some(video => video.video_path.trim().length > 0))
    .map(classifyExercise).filter(row => row.complexity <= complexity && groups.includes(row.group))
    .sort((a, b) => a.complexity - b.complexity || a.name.localeCompare(b.name));
}

export type ImmediatePlanOptions = {
  maxExercises: number;
  goals: boolean;
  progression: boolean;
  workoutType?: WorkoutType;
  emphasis?: WorkoutEmphasis | null;
};

const SPLIT_DAYS = {
  Braços: ['Bíceps', 'Tríceps', 'Ombros'],
  Pernas: ['Pernas', 'Glúteos', 'Abdômen'],
  Costas: ['Costas', 'Peito'],
} as const;
type SplitDay = keyof typeof SPLIT_DAYS;

function emphasisDay(emphasis: WorkoutEmphasis | null | undefined): SplitDay | null {
  if (!emphasis) return null;
  if (emphasis === 'Braços' || emphasis === 'Ombros') return 'Braços';
  if (emphasis === 'Pernas' || emphasis === 'Glúteos' || emphasis === 'Abdômen') return 'Pernas';
  return 'Costas';
}

/** One day arms, one legs, one back; extra days repeat the emphasised day (or keep rotating). */
export function dailySplits(days: number, emphasis?: WorkoutEmphasis | null): { label: SplitDay; groups: string[] }[] {
  const order: SplitDay[] = ['Braços', 'Pernas', 'Costas'];
  const focus = emphasisDay(emphasis);
  return Array.from({ length: days }, (_, i) => {
    const label = i < 3 ? order[i]! : focus ?? order[i % 3]!;
    return { label, groups: [...SPLIT_DAYS[label]] };
  });
}

export function immediateVideoPlan(
  catalogue: VideoExercise[],
  answers: Record<string, unknown>,
  options: ImmediatePlanOptions,
): WorkoutResult {
  const profile = buyerProfile(answers);
  if (!catalogue.length) throw new Error('Ainda não há exercícios com vídeo adequados ao seu nível. O treinador precisa completar a biblioteca.');

  const effectiveType = options.workoutType ?? profile.workoutType ?? 'tradicional';
  const effectiveEmphasis = options.emphasis !== undefined ? options.emphasis : profile.emphasis;

  const count = Math.min(options.maxExercises, profile.minutes <= 20 ? 4 : profile.minutes <= 30 ? 5 : 7);
  const splits = dailySplits(profile.days, effectiveEmphasis);
  const week = profile.days === 2 ? [1, 4] : profile.days === 3 ? [1, 3, 5] : profile.days === 4 ? [1, 2, 4, 5] : [1, 2, 3, 4, 5, 6];

  const summaryText = effectiveType === 'intercalado'
    ? 'Musculação intercalada de alta eficiência e gasto calórico, com vídeos de execução.'
    : profile.lose
    ? 'Musculação adaptada para emagrecer, com vídeos de execução.'
    : 'Musculação adaptada ao seu nível, com vídeos de execução.';

  return {
    summary: summaryText,
    goals: options.goals
      ? ['Manter a frequência semanal', 'Aprender a execução correta com os vídeos', 'Progredir cargas com técnica perfeita']
      : null,
    progression: options.progression
      ? 'Aumente a carga gradualmente apenas quando completar as repetições com boa execução e sem dor.'
      : null,
    plans: Array.from({ length: profile.days }, (_, day) => {
      const split = splits[day]!;
      const groups = [...split.groups];
      // Repeated days (focused day) rotate to different exercises of the same group.
      const repeat = splits.slice(0, day).filter(s => s.label === split.label).length;

      // Se há membro de ênfase correspondente, prioriza no início da lista de grupos
      if (effectiveEmphasis) {
        const emphasisGroup = effectiveEmphasis === 'Peitoral' ? 'Peito'
          : effectiveEmphasis === 'Braços' ? 'Bíceps'
          : effectiveEmphasis;
        if (groups.includes(emphasisGroup)) {
          const idx = groups.indexOf(emphasisGroup);
          groups.splice(idx, 1);
          groups.unshift(emphasisGroup);
        }
      }

      const selected: VideoExercise[] = [];
      // Round-robin previne que um grupo domine todos os exercícios
      for (let round = 0; selected.length < count && round < catalogue.length; round++) {
        for (const group of groups) {
          const pool = catalogue.filter(ex => ex.group === group);
          const item = pool.length ? pool[(round + repeat * 2) % pool.length] : undefined;
          if (item && !selected.some(ex => ex.id === item.id) && selected.length < count) {
            selected.push(item);
          }
        }
      }
      // Biblioteca sem vídeos para os grupos do dia: usa os vídeos disponíveis para ninguém ficar sem treino.
      if (!selected.length) {
        for (let i = 0; selected.length < count && i < catalogue.length; i++) {
          const item = catalogue[(i + day * count) % catalogue.length]!;
          if (!selected.some(ex => ex.id === item.id)) selected.push(item);
        }
      }
      if (!selected.length) throw new Error('Faltam vídeos para montar uma divisão equilibrada. O treinador precisa completar a biblioteca.');

      // Se for treino intercalado, organiza em pares complementares (ex: Peito + Costas, Superior + Inferior)
      if (effectiveType === 'intercalado' && selected.length >= 2) {
        // Separação em pares alternados
        const reordered: VideoExercise[] = [];
        const copy = [...selected];
        while (copy.length) {
          const first = copy.shift()!;
          reordered.push(first);
          // Procura um exercício de grupo diferente para formar o par intercalado
          const secondIdx = copy.findIndex(c => c.group !== first.group);
          if (secondIdx !== -1) {
            reordered.push(copy.splice(secondIdx, 1)[0]!);
          } else if (copy.length) {
            reordered.push(copy.shift()!);
          }
        }
        selected.splice(0, selected.length, ...reordered);
      }

      const includedGroups = [...new Set(selected.map(ex => ex.group))];
      const basePlanName = `Treino ${String.fromCharCode(65 + day)} — ${split.label}${repeat ? ' (foco)' : ''} · ${includedGroups.join(', ')}`;
      const planNameFormatted = formatPlanName(basePlanName, effectiveType, effectiveEmphasis);

      const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
      const exercises: WorkoutExercise[] = selected.map((ex, index) => {
        let note = ex.description ? `${ex.description}. ` : '';

        if (effectiveType === 'intercalado') {
          const pairNum = Math.floor(index / 2);
          const letter = letters[pairNum] || String(pairNum + 1);
          const isSecondOfPair = index % 2 === 1;
          if (isSecondOfPair) {
            note = `⚡ Par ${letter}2 (Intercalado) • Execute logo após o anterior. Descanse ${ex.complexity > 1 ? 75 : 60}s ao final do par. ` + note;
          } else {
            note = `⚡ Par ${letter}1 • Execute a série e intercale com o próximo exercício sem pausa longa. ` + note;
          }
        } else {
          note = (note + 'Assista ao vídeo antes de executar. Não treine com dor.').trim();
        }

        return {
          exercise_id: ex.id,
          exercise_name: ex.name,
          sets: profile.complexity === 1 ? '3' : '4',
          reps: profile.lose ? '12 a 15' : '8 a 12',
          rest_seconds: effectiveType === 'intercalado'
            ? (index % 2 === 0 ? 30 : (ex.complexity > 1 ? 75 : 60))
            : (ex.complexity > 1 ? 90 : 60),
          load_text: profile.complexity === 1 ? 'Leve, mantendo a execução correta' : 'Moderada, sem perder a execução',
          notes: note.trim(),
        };
      });

      return {
        day_of_week: week[day],
        plan_name: planNameFormatted,
        workout_type: effectiveType,
        emphasis: effectiveEmphasis,
        exercises,
      };
    }),
  };
}

/** Reject invented exercises, technical difficulty above the buyer's level and duplicates. */
export function validateVideoPlan(result: WorkoutResult, catalogue: VideoExercise[], answers: Record<string, unknown>): WorkoutResult | null {
  if (!Array.isArray(result?.plans) || result.plans.length !== buyerProfile(answers).days) return null;
  const byName = new Map(catalogue.map(ex => [exerciseNameKey(ex.name), ex]));
  const days = new Set<number>();
  for (const plan of result.plans) {
    if (!Number.isInteger(plan.day_of_week) || plan.day_of_week < 0 || plan.day_of_week > 6 || days.has(plan.day_of_week) || !plan.exercises?.length) return null;
    days.add(plan.day_of_week);
    const seen = new Set<string>();
    for (const exercise of plan.exercises) {
      const found = byName.get(exerciseNameKey(exercise.exercise_name));
      if (!found || seen.has(found.id)) return null;
      seen.add(found.id);
      exercise.exercise_id = found.id;
      exercise.exercise_name = found.name;
    }
  }
  return result;
}
/** Browser-safe rules shared by the immediate plan and AI validation. */
export type CatalogueExercise = { id: string; name: string; muscle_group: string; description: string | null; exercise_videos: { video_path: string }[] };
export type VideoExercise = CatalogueExercise & { group: string; complexity: number };
export type WorkoutExercise = { exercise_name: string; exercise_id?: string; sets: string; reps: string; rest_seconds: number; load_text: string | null; notes: string | null };
export type WorkoutResult = { summary: string | null; goals: string[] | null; progression: string | null; plans: { day_of_week: number; plan_name: string; exercises: WorkoutExercise[] }[] };

export const exerciseNameKey = (name: string) => name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

export function classifyExercise(exercise: CatalogueExercise) {
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
    : /halteres|polia|barra|prancha|remador|cavalinho|smith|face pull/.test(name) ? 2 : 1;
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
  return { complexity, days, minutes, lose };
}

export function eligibleVideoExercises(rows: CatalogueExercise[], answers: Record<string, unknown>): VideoExercise[] {
  const { complexity } = buyerProfile(answers);
  const groups = ['Peito', 'Costas', 'Pernas', 'Ombros', 'Bíceps', 'Tríceps', 'Glúteos', 'Abdômen'];
  return rows.filter(row => row.exercise_videos.some(video => video.video_path.trim().length > 0))
    .map(classifyExercise).filter(row => row.complexity <= complexity && groups.includes(row.group))
    .sort((a, b) => a.complexity - b.complexity || a.name.localeCompare(b.name));
}

export function immediateVideoPlan(catalogue: VideoExercise[], answers: Record<string, unknown>, options: { maxExercises: number; goals: boolean; progression: boolean }): WorkoutResult {
  const profile = buyerProfile(answers);
  if (!catalogue.length) throw new Error('Ainda não há exercícios com vídeo adequados ao seu nível. O treinador precisa completar a biblioteca.');
  const count = Math.min(options.maxExercises, profile.minutes <= 20 ? 4 : profile.minutes <= 30 ? 5 : 7);
  const full = ['Pernas', 'Costas', 'Peito', 'Glúteos', 'Ombros', 'Abdômen', 'Bíceps', 'Tríceps'];
  const splits = profile.days <= 3 ? [full] : profile.days === 4
    ? [['Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps'], ['Pernas', 'Glúteos', 'Abdômen']]
    : [['Peito', 'Ombros', 'Tríceps'], ['Costas', 'Bíceps', 'Abdômen'], ['Pernas', 'Glúteos']];
  const week = profile.days === 2 ? [1, 4] : profile.days === 3 ? [1, 3, 5] : profile.days === 4 ? [1, 2, 4, 5] : [1, 2, 3, 4, 5, 6];
  return {
    summary: profile.lose ? 'Musculação adaptada para emagrecer, com vídeos de execução.' : 'Musculação adaptada ao seu nível, com vídeos de execução.',
    goals: options.goals ? ['Manter a frequência semanal', 'Aprender a execução correta', 'Progredir com segurança'] : null,
    progression: options.progression ? 'Aumente a carga gradualmente apenas quando completar as repetições com boa execução e sem dor.' : null,
    plans: Array.from({ length: profile.days }, (_, day) => {
      const groups = splits[day % splits.length];
      const selected: VideoExercise[] = [];
      // Round-robin prevents a large legs catalogue from crowding out other muscles.
      for (let round = 0; selected.length < count && round < catalogue.length; round++) {
        for (const group of groups) {
          const pool = catalogue.filter(ex => ex.group === group);
          const item = pool.length ? pool[(round + Math.floor(day / splits.length)) % pool.length] : undefined;
          if (item && !selected.some(ex => ex.id === item.id) && selected.length < count) selected.push(item);
        }
      }
      if (!selected.length) throw new Error('Faltam vídeos para montar uma divisão equilibrada. O treinador precisa completar a biblioteca.');
      return { day_of_week: week[day], plan_name: `Treino ${String.fromCharCode(65 + day)} — ${profile.days <= 3 ? 'Corpo inteiro' : groups.slice(0, 2).join(' e ')}`, exercises: selected.map(ex => ({
        exercise_id: ex.id, exercise_name: ex.name, sets: profile.complexity === 1 ? '3' : '4', reps: profile.lose ? '12 a 15' : '8 a 12', rest_seconds: ex.complexity > 1 ? 90 : 60,
        load_text: profile.complexity === 1 ? 'Leve, mantendo a execução correta' : 'Moderada, sem perder a execução',
        notes: [ex.description, 'Assista ao vídeo antes de executar. Não treine com dor.'].filter(Boolean).join(' '),
      })) };
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
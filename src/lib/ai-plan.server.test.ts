import { beforeEach, expect, it, vi } from 'vitest';
import { eligibleVideoExercises, immediateVideoPlan } from './video-workout-catalogue';

const state = vi.hoisted(() => ({ approved: true, inserts: [] as { table: string; value: any }[], rows: [
  { id: 'legs', name: 'Cadeira Extensora', muscle_group: 'Pernas', description: null, exercise_videos: [{ video_path: 'legs.mp4' }] },
  { id: 'back', name: 'Remada Articulada maquina', muscle_group: 'Costas', description: null, exercise_videos: [{ video_path: 'back.mp4' }] },
  { id: 'no-video', name: 'Supino Maquina', muscle_group: 'Peito', description: null, exercise_videos: [] },
] }));
vi.mock('@/integrations/supabase/client.server', () => ({ supabaseAdmin: {
  from(table: string) {
    const query: any = {
      select: () => query, eq: () => query, order: () => query, limit: () => query,
      insert: (value: any) => { state.inserts.push({ table, value }); return query; },
      upsert: (value: any) => { state.inserts.push({ table, value }); return query; },
      maybeSingle: async () => ({ data: table === 'purchases' ? { user_id: 'buyer', customer_email: 'test@example.invalid', customer_name: 'Teste', status: state.approved ? 'approved' : 'pending', plan_id: 'basico' } : table === 'leads' ? { answers: { measurements: { nivel: 'Iniciante', dias: '2x na semana' } } } : null }),
      single: async () => ({ data: { id: `plan-${state.inserts.length}` } }),
      then: (resolve: any) => Promise.resolve({ data: table === 'exercises' ? state.rows : [], error: null }).then(resolve),
    };
    return query;
  },
  storage: { from: () => ({ upload: async () => ({ error: null }) }) },
} }));
vi.mock('./workout-pdf', () => ({ DAY_NAMES: ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'], buildWorkoutPdf: () => ({ base64: 'dGVzdA==', fileName: 'treino.pdf' }) }));

beforeEach(() => { state.approved = true; state.inserts = []; vi.stubEnv('LOVABLE_API_KEY', 'test-only'); });

it('compra aprovada salva apenas exercícios com vídeo e identificador canônico', async () => {
  const answers = { measurements: { nivel: 'Iniciante', dias: '2x na semana' } };
  const result = immediateVideoPlan(eligibleVideoExercises(state.rows, answers), answers, { maxExercises: 6, goals: false, progression: false });
  vi.stubGlobal('fetch', vi.fn(async () => new Response(`data: ${JSON.stringify({ type: 'response.output_text.delta', delta: JSON.stringify(result) })}\n\n`)));
  const { generateAiPlanForPurchase } = await import('./ai-plan.server');
  const saved = await generateAiPlanForPurchase('test-approved-purchase');
  expect(saved.ok).toBe(true);
  expect(saved.plans).toBe(2);
  const exercises = state.inserts.filter(row => row.table === 'student_plan_exercises').flatMap(row => row.value);
  expect(exercises).toHaveLength(4);
  expect(exercises.every(row => ['legs', 'back'].includes(row.exercise_id))).toBe(true);
  expect(exercises.some(row => row.exercise_id === 'no-video')).toBe(false);
  vi.unstubAllGlobals();
});

it('não cria treino para pagamento pendente', async () => {
  state.approved = false;
  const { generateAiPlanForPurchase } = await import('./ai-plan.server');
  expect((await generateAiPlanForPurchase('test-pending-purchase')).ok).toBe(false);
  expect(state.inserts).toHaveLength(0);
});
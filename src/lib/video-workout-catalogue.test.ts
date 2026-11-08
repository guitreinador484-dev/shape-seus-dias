import { describe, expect, it } from 'vitest';
import { buyerProfile, eligibleVideoExercises, immediateVideoPlan, dailySplits, validateVideoPlan, type CatalogueExercise } from './video-workout-catalogue';
import { selectExecutionVideo } from './exercise-video-selection';

const row = (name: string, video = true): CatalogueExercise => ({ id: name, name, muscle_group: 'Outros', description: null, exercise_videos: video ? [{ video_path: `${name}.mp4` }] : [] });
const rows = ['Supino Maquina', 'Remada Articulada maquina', 'Cadeira Extensora', 'Cadeira Flexora', 'Elevacao Pelvica Maquina', 'Desenvolvimento Maquina', 'AB Maquina', 'Agachamento Bulgaro', 'Remada Curvada Barra', 'Elevacao Lateral Halteres'].map(name => row(name));
const answers = { measurements: { nivel: 'Iniciante', dias: '2x na semana', objetivo: 'Emagrecimento' }, broad: { tempo: 'Até 20 minutos' } };
const options = { maxExercises: 8, goals: true, progression: true };

describe('treinos de compradores com vídeos', () => {
  it('nunca seleciona exercício sem vídeo, mesmo que esteja cadastrado', () => {
    const eligible = eligibleVideoExercises([...rows, row('Supino sem vídeo', false), { ...row('Supino vazio'), exercise_videos: [{ video_path: ' ' }] }], answers);
    expect(eligible.some(ex => ex.name === 'Supino sem vídeo' || ex.name === 'Supino vazio')).toBe(false);
    const plan = immediateVideoPlan(eligible, answers, options);
    expect(plan.plans.flatMap(day => day.exercises).every(ex => eligible.some(item => item.id === ex.exercise_id))).toBe(true);
  });
  it('não inclui búlgaro ou remada curvada para iniciantes', () => {
    const eligible = eligibleVideoExercises(rows, answers);
    expect(eligible.map(ex => ex.name)).not.toContain('Agachamento Bulgaro');
    expect(eligible.map(ex => ex.name)).not.toContain('Remada Curvada Barra');
    expect(eligible.map(ex => ex.name)).toContain('Cadeira Extensora');
  });
  it('permite complexidade alta somente quando as respostas indicam avançado', () => {
    expect(eligibleVideoExercises(rows, { measurements: { nivel: 'Avançado' } }).map(ex => ex.name)).toContain('Agachamento Bulgaro');
    expect(buyerProfile({ broad: { experiencia: 'Já treinei, mas parei' } }).complexity).toBe(1);
  });
  it('respeita os dois dias e os vinte minutos informados no funil', () => {
    const result = immediateVideoPlan(eligibleVideoExercises(rows, answers), answers, options);
    expect(result.plans.map(day => day.day_of_week)).toEqual([1, 4]);
    expect(result.plans.every(day => day.exercises.length <= 4)).toBe(true);
  });
  it('rejeita exercício inventado pela IA antes de substituir o treino disponível', () => {
    const catalogue = eligibleVideoExercises(rows, answers);
    const result = immediateVideoPlan(catalogue, answers, options);
    result.plans[0].exercises[0].exercise_name = 'Exercício sem vídeo inventado pela IA';
    expect(validateVideoPlan(result, catalogue, answers)).toBeNull();
  });
  it('vincula o nome canônico ao identificador que libera o vídeo privado', () => {
    const catalogue = eligibleVideoExercises(rows, answers);
    const result = immediateVideoPlan(catalogue, answers, options);
    const expected = result.plans[0].exercises[0].exercise_id;
    for (const plan of result.plans) for (const ex of plan.exercises) delete ex.exercise_id;
    const checked = validateVideoPlan(result, catalogue, answers);
    expect(checked?.plans[0].exercises[0].exercise_id).toBe(expected);
  });
  it('divide em braço, perna e costas e repete o dia do foco', () => {
    expect(dailySplits(3).map(d => d.label)).toEqual(['Braços', 'Pernas', 'Costas']);
    expect(dailySplits(5, 'Glúteos').map(d => d.label)).toEqual(['Braços', 'Pernas', 'Costas', 'Pernas', 'Pernas']);
    expect(dailySplits(4, 'Costas').map(d => d.label)).toEqual(['Braços', 'Pernas', 'Costas', 'Costas']);
  });
  it('não cria treino vazio nem inventa exercícios quando faltam vídeos', () => {
    expect(() => immediateVideoPlan([], answers, options)).toThrow('Ainda não há exercícios com vídeo');
  });
  it('usa vídeo da academia, geral e depois de outra academia no treino', () => {
    const other = { gym_id: 'academia-b', video_path: 'b.mp4' };
    const general = { gym_id: null, video_path: 'geral.mp4' };
    const local = { gym_id: 'academia-a', video_path: 'a.mp4' };
    expect(selectExecutionVideo([other, general, local], 'academia-a', true)).toBe(local);
    expect(selectExecutionVideo([other, general], 'academia-a', true)).toBe(general);
    expect(selectExecutionVideo([other], 'academia-a', true)).toBe(other);
    expect(selectExecutionVideo([other], 'academia-a')).toBeNull();
  });
});
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Dumbbell, Flame, Loader2, Moon, Sparkles, Timer, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ensureMyPlanFn } from "@/lib/ai-plan.functions";
import {
  isDoneThisWeek,
  setExerciseCompletion,
  type PlanWithExercises,
  type StudentPlan,
  type StudentPlanExercise,
} from "@/lib/platform-data";
import { isExerciseInEmphasis, parsePlanMetadata } from "@/lib/workout-meta";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadBar } from "@/components/ui/load-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { ExerciseVideoPreview } from "@/components/platform/exercise-video-preview";
import { WorkoutPdfButton, useWorkoutPdfs } from "@/components/platform/workout-pdf-buttons";
import { RestTimer } from "@/components/platform/rest-timer";
import { cn } from "@/lib/utils";

const ExerciseVideoDialog = lazy(() =>
  import("@/components/platform/exercise-video-dialog").then((m) => ({
    default: m.ExerciseVideoDialog,
  })),
);

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const WEEKDAYS_SHORT = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
/** Segunda primeiro, como a semana de treino é contada. */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const PAIR_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

function nextTrainingDay(days: number[], today: number): number {
  for (let offset = 0; offset < 7; offset++) {
    const day = (today + offset) % 7;
    if (days.includes(day)) return day;
  }
  return today;
}

/** Sem treino: tenta montar na hora a partir da compra aprovada do aluno. */
function EmptyTraining() {
  const ensureMyPlan = useServerFn(ensureMyPlanFn);
  const [state, setState] = useState<"checking" | "none">("checking");
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Mostra o treino assim que ele for salvo (em poucos segundos), sem esperar a IA terminar.
    const poll = setInterval(async () => {
      const { data: u } = await supabase.auth.getSession();
      if (!u.session) return;
      const { count } = await supabase
        .from("student_plans")
        .select("id", { count: "exact", head: true })
        .eq("student_id", u.session.user.id);
      if (!cancelled && count) window.location.reload();
    }, 1500);
    (async () => {
      try {
        const result = await ensureMyPlan({ data: undefined });
        if (cancelled) return;
        if (result?.plans && result.plans > 0) {
          window.location.reload();
          return;
        }
        if (!result?.ok && result?.message && !result.message.includes("compra aprovada"))
          setReason(result.message);
      } catch {
        /* mostra o estado vazio abaixo */
      }
      if (!cancelled) {
        clearInterval(poll);
        setState("none");
      }
    })();
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [ensureMyPlan]);

  return (
    <Card className="border-dashed">
      <CardContent className="space-y-3 py-16 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-muted">
          {state === "checking" ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <Dumbbell className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <p className="font-display text-2xl">
          {state === "checking"
            ? "Estamos criando seu treino personalizado"
            : "Sem treino cadastrado"}
        </p>
        <p className="text-sm text-muted-foreground">
          {state === "checking"
            ? "Estamos montando seu treino com base nas suas respostas. Leva só alguns segundos."
            : (reason ?? "Seu personal ainda não montou seu plano. Fale com ele para começar.")}
        </p>
      </CardContent>
    </Card>
  );
}

export function TreinoSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <Skeleton className="h-16" />
      <Skeleton className="h-44" />
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
    </div>
  );
}

function DayStrip({
  plans,
  selected,
  today,
  onSelect,
}: {
  plans: PlanWithExercises[];
  selected: number;
  today: number;
  onSelect: (day: number) => void;
}) {
  return (
    <div className="grid grid-cols-7 gap-1 sm:gap-2" role="group" aria-label="Dias da semana">
      {WEEK_ORDER.map((day) => {
        const has = plans.some((plan) => plan.day_of_week === day);
        const active = day === selected;
        const exercises = plans
          .filter((plan) => plan.day_of_week === day)
          .flatMap((plan) => plan.exercises);
        const finished =
          exercises.length > 0 &&
          exercises.every((exercise) => isDoneThisWeek(exercise.completed_at));
        return (
          <button
            key={day}
            type="button"
            disabled={!has}
            aria-pressed={active}
            aria-label={`${WEEKDAYS[day]}${day === today ? ", hoje" : ""}${has ? "" : ", descanso"}${finished ? ", concluído" : ""}`}
            onClick={() => onSelect(day)}
            className={cn(
              "flex h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-lg border transition-colors duration-150",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : has
                  ? "border-border bg-card text-foreground hover:bg-secondary"
                  : "cursor-not-allowed border-transparent text-muted-foreground/50",
            )}
          >
            <span className="text-[11px] font-semibold tracking-wide">{WEEKDAYS_SHORT[day]}</span>
            {finished ? (
              <Check className="h-4 w-4" strokeWidth={3} />
            ) : (
              <span
                className={cn(
                  "h-1 w-4 rounded-full",
                  has ? (active ? "bg-primary-foreground" : "bg-foreground/35") : "bg-transparent",
                )}
              />
            )}
            <span
              className={cn(
                "h-3 text-[10px] font-medium leading-3",
                day === today ? (active ? "text-primary-foreground" : "text-primary") : "invisible",
              )}
            >
              hoje
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ExerciseRow({
  exercise,
  index,
  done,
  emphasis,
  workoutType,
  gymId,
  showVideos,
  onToggle,
  onRest,
  onVideo,
}: {
  exercise: StudentPlanExercise;
  index: number;
  done: boolean;
  emphasis: boolean;
  workoutType: string;
  gymId: string | null;
  showVideos: boolean;
  onToggle: () => void;
  onRest: () => void;
  onVideo: () => void;
}) {
  const interleaved = workoutType === "intercalado";
  const pairLetter = PAIR_LETTERS[Math.floor(index / 2)] ?? String(Math.floor(index / 2) + 1);
  const label = interleaved
    ? `${pairLetter}${index % 2 === 0 ? 1 : 2}`
    : String(index + 1).padStart(2, "0");

  return (
    <li
      className={cn(
        "flex items-start gap-3 p-3 transition-colors duration-150 sm:gap-4 sm:p-4",
        done && "bg-primary/[0.06]",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={done}
        aria-label={
          done
            ? `Desmarcar ${exercise.exercise_name}`
            : `Marcar ${exercise.exercise_name} como feito`
        }
        className={cn(
          "grid h-11 w-11 shrink-0 place-items-center rounded-lg border font-display text-lg transition-[background-color,border-color,color,transform] duration-150 active:scale-95",
          done
            ? "border-primary bg-primary text-primary-foreground"
            : "border-input text-muted-foreground hover:border-foreground/40 hover:text-foreground",
        )}
      >
        {done ? <Check className="h-5 w-5" strokeWidth={3} /> : label}
      </button>

      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={showVideos ? onVideo : onToggle}
          className={cn(
            "block max-w-full text-left text-[15px] font-semibold leading-snug underline-offset-4 hover:underline sm:text-base",
            done ? "text-muted-foreground line-through" : "text-foreground",
          )}
        >
          {exercise.exercise_name}
        </button>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="font-display text-xl leading-none tabular-nums text-foreground">
            {exercise.sets}
            <span className="px-1 text-muted-foreground">×</span>
            {exercise.reps}
          </span>
          {exercise.rest_seconds ? (
            <button
              type="button"
              onClick={onRest}
              aria-label={`Iniciar descanso de ${exercise.rest_seconds} segundos`}
              className="-my-1 inline-flex min-h-8 items-center gap-1 rounded-md px-1.5 text-xs font-medium tabular-nums text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <Timer className="h-3.5 w-3.5" /> {exercise.rest_seconds}s
            </button>
          ) : null}
          {exercise.load_text ? (
            <span className="text-xs font-medium text-muted-foreground">{exercise.load_text}</span>
          ) : null}
          {emphasis ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-warning">
              <Sparkles className="h-3 w-3" /> Ênfase
            </span>
          ) : null}
        </div>

        {exercise.notes ? (
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{exercise.notes}</p>
        ) : null}
      </div>

      {showVideos ? (
        <ExerciseVideoPreview
          exerciseName={exercise.exercise_name}
          exerciseId={exercise.exercise_id}
          gymId={gymId}
          onOpen={onVideo}
        />
      ) : null}
    </li>
  );
}

/** Colunas novas que ainda não constam nos tipos gerados do Supabase. */
function planMetadata(plan: StudentPlan) {
  const { workout_type, emphasis } = plan as StudentPlan & {
    workout_type?: string | null;
    emphasis?: string | null;
  };
  return parsePlanMetadata(plan.plan_name, workout_type, emphasis);
}

export function TreinoPanel({
  userId,
  plans,
  loading,
  showVideos = false,
  gymId = null,
  onGoToCheckin,
}: {
  userId: string;
  plans: PlanWithExercises[];
  loading: boolean;
  /** Quando ativo, cada exercício abre o vídeo demonstrativo da biblioteca. */
  showVideos?: boolean;
  gymId?: string | null;
  onGoToCheckin: () => void;
}) {
  const queryClient = useQueryClient();
  const today = new Date().getDay();
  const availableDays = useMemo(
    () => Array.from(new Set(plans.map((plan) => plan.day_of_week))),
    [plans],
  );
  const [selectedDay, setSelectedDay] = useState<number>(() =>
    nextTrainingDay(
      plans.map((plan) => plan.day_of_week),
      today,
    ),
  );
  const [done, setDone] = useState<Set<string>>(new Set());
  const [videoFor, setVideoFor] = useState<StudentPlanExercise | null>(null);
  const [videoOpened, setVideoOpened] = useState(false);
  const [activeTimer, setActiveTimer] = useState<{
    seconds: number;
    exerciseName: string;
    startedAt: number;
  } | null>(null);
  const { byPlan: pdfByPlan } = useWorkoutPdfs();

  useEffect(() => {
    if (availableDays.length > 0 && !availableDays.includes(selectedDay)) {
      setSelectedDay(nextTrainingDay(availableDays, today));
    }
  }, [availableDays, selectedDay, today]);

  // Sincroniza com o banco: o que foi marcado em semanas anteriores não conta mais.
  useEffect(() => {
    setDone(
      new Set(
        plans
          .flatMap((plan) => plan.exercises)
          .filter((exercise) => isDoneThisWeek(exercise.completed_at))
          .map((exercise) => exercise.id),
      ),
    );
  }, [plans]);

  if (loading) return <TreinoSkeleton />;
  if (plans.length === 0) return <EmptyTraining />;

  const dayPlans = plans.filter((plan) => plan.day_of_week === selectedDay);
  const dayExercises = dayPlans.flatMap((plan) => plan.exercises);
  const totalEx = dayExercises.length;
  const totalSets = dayExercises.reduce((sum, exercise) => sum + (Number(exercise.sets) || 0), 0);
  const completed = dayExercises.filter((exercise) => done.has(exercise.id)).length;
  const finished = totalEx > 0 && completed === totalEx;
  const primaryMeta = dayPlans[0] ? planMetadata(dayPlans[0]) : null;
  const restToday = !availableDays.includes(today);

  function toggle(exercise: StudentPlanExercise) {
    const wasDone = done.has(exercise.id);
    const completedAt = wasDone ? null : new Date().toISOString();
    setDone((prev) => {
      const next = new Set(prev);
      if (wasDone) next.delete(exercise.id);
      else next.add(exercise.id);
      return next;
    });
    if (!wasDone && exercise.rest_seconds) {
      setActiveTimer({
        seconds: exercise.rest_seconds,
        exerciseName: exercise.exercise_name,
        startedAt: Date.now(),
      });
    }
    const previous = exercise.completed_at;
    setExerciseCompletion(queryClient, userId, exercise.id, completedAt);
    supabase
      .from("student_plan_exercises")
      .update({ completed_at: completedAt })
      .eq("id", exercise.id)
      .then(({ error }) => {
        if (!error) return;
        toast.error("Erro ao salvar progresso", { description: error.message });
        setExerciseCompletion(queryClient, userId, exercise.id, previous);
      });
  }

  function openVideo(exercise: StudentPlanExercise) {
    setVideoOpened(true);
    setVideoFor(exercise);
  }

  return (
    <div className="space-y-4">
      <DayStrip plans={plans} selected={selectedDay} today={today} onSelect={setSelectedDay} />

      {restToday && selectedDay !== today ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Moon className="h-4 w-4 shrink-0" /> Hoje é dia de descanso. Seu próximo treino é{" "}
          {WEEKDAYS[selectedDay].toLowerCase()}.
        </p>
      ) : null}

      <section
        aria-label={`Treino de ${WEEKDAYS[selectedDay]}`}
        className="overflow-hidden rounded-lg border border-border bg-card"
      >
        <div className="space-y-4 p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                {WEEKDAYS[selectedDay]}
                {selectedDay === today ? " · hoje" : ""}
              </p>
              <h2 className="mt-1 font-display text-4xl leading-none text-foreground sm:text-5xl">
                {dayPlans.map((plan) => planMetadata(plan).cleanName).join(" + ")}
              </h2>
            </div>
            {dayPlans.map((plan) =>
              pdfByPlan[plan.id] ? <WorkoutPdfButton key={plan.id} planId={plan.id} /> : null,
            )}
          </div>

          {primaryMeta?.workoutType === "intercalado" ||
          primaryMeta?.workoutType === "circuito" ||
          primaryMeta?.emphasis ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold">
              {primaryMeta.workoutType === "intercalado" ? (
                <span className="inline-flex items-center gap-1.5 text-foreground">
                  <Zap className="h-3.5 w-3.5 text-primary" /> Método intercalado
                </span>
              ) : null}
              {primaryMeta.workoutType === "circuito" ? (
                <span className="inline-flex items-center gap-1.5 text-foreground">
                  <Flame className="h-3.5 w-3.5 text-primary" /> Circuito metabólico
                </span>
              ) : null}
              {primaryMeta.emphasis ? (
                <span className="inline-flex items-center gap-1.5 text-warning">
                  <Sparkles className="h-3.5 w-3.5" /> Ênfase em {primaryMeta.emphasis}
                </span>
              ) : null}
            </div>
          ) : null}

          <div>
            <div className="mb-2 flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium text-foreground tabular-nums">
                {completed} de {totalEx} exercícios
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">{totalSets} séries</span>
            </div>
            <LoadBar
              total={totalEx}
              done={completed}
              label="Exercícios concluídos"
              className="h-2.5"
            />
          </div>
        </div>

        {primaryMeta?.workoutType === "intercalado" ? (
          <p className="border-t border-border px-4 py-2.5 text-xs leading-relaxed text-muted-foreground sm:px-6">
            Faça os exercícios de cada par alternados (A1, A2, A1, A2) e descanse entre eles.
          </p>
        ) : null}

        {dayPlans.map((plan) => {
          const meta = planMetadata(plan);
          return plan.exercises.length === 0 ? (
            <p
              key={plan.id}
              className="border-t border-border p-4 text-sm text-muted-foreground sm:p-6"
            >
              Nenhum exercício adicionado ainda.
            </p>
          ) : (
            <ol key={plan.id} className="divide-y divide-border border-t border-border">
              {plan.exercises.map((exercise, index) => (
                <ExerciseRow
                  key={exercise.id}
                  exercise={exercise}
                  index={index}
                  done={done.has(exercise.id)}
                  emphasis={isExerciseInEmphasis(exercise.exercise_name, meta.emphasis)}
                  workoutType={meta.workoutType}
                  gymId={gymId}
                  showVideos={showVideos}
                  onToggle={() => toggle(exercise)}
                  onRest={() =>
                    setActiveTimer({
                      seconds: exercise.rest_seconds || 60,
                      exerciseName: exercise.exercise_name,
                      startedAt: Date.now(),
                    })
                  }
                  onVideo={() => openVideo(exercise)}
                />
              ))}
            </ol>
          );
        })}

        {finished ? (
          <div className="flex flex-col gap-3 border-t border-border bg-primary/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="font-display text-2xl leading-none">Treino concluído</p>
            <Button onClick={onGoToCheckin}>Registrar check-in de hoje</Button>
          </div>
        ) : null}
      </section>

      {activeTimer ? (
        <RestTimer
          key={activeTimer.startedAt}
          initialSeconds={activeTimer.seconds}
          exerciseName={activeTimer.exerciseName}
          onClose={() => setActiveTimer(null)}
        />
      ) : null}

      {videoOpened ? (
        <Suspense fallback={null}>
          <ExerciseVideoDialog
            open={!!videoFor}
            onOpenChange={(open) => !open && setVideoFor(null)}
            exerciseName={videoFor?.exercise_name ?? ""}
            exerciseId={videoFor?.exercise_id ?? null}
            planNotes={videoFor?.notes ?? null}
            gymId={gymId}
          />
        </Suspense>
      ) : null}
    </div>
  );
}

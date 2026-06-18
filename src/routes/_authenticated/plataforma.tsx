import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { isAdminEmail, useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { LogOut, Loader2, Dumbbell, Video, PlayCircle } from "lucide-react";

type StudentPlan = Tables<"student_plans">;
type StudentPlanExercise = Tables<"student_plan_exercises">;
type Workout = Tables<"workouts">;
type PlanWithExercises = StudentPlan & { exercises: StudentPlanExercise[] };

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export const Route = createFileRoute("/_authenticated/plataforma")({
  component: PlataformaPage,
});

function PlataformaPage() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<PlanWithExercises[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [hasClassAccess, setHasClassAccess] = useState<boolean>(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, { video?: string; thumb?: string }>>({});
  const [activeVideo, setActiveVideo] = useState<{ id: string; url: string; title: string } | null>(null);

  useEffect(() => {
    if (!loading && (role === "admin" || isAdminEmail(user?.email))) {
      navigate({ to: "/admin", replace: true });
    }
  }, [loading, role, user?.email, navigate]);

  useEffect(() => {
    if (loading || !user || role === "admin" || isAdminEmail(user?.email)) return;
    let cancelled = false;
    (async () => {
      setDataLoading(true);
      const [plansRes, exRes, workoutsRes, profileRes] = await Promise.all([
        supabase.from("student_plans").select("*").eq("student_id", user.id).order("day_of_week", { ascending: true }),
        supabase.from("student_plan_exercises").select("*").order("display_order", { ascending: true }),
        supabase.from("workouts").select("*").order("display_order", { ascending: true }),
        supabase.from("profiles").select("has_class_access").eq("id", user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      const allPlans = plansRes.data ?? [];
      const allEx = exRes.data ?? [];
      setPlans(allPlans.map((p) => ({ ...p, exercises: allEx.filter((e) => e.plan_id === p.id) })));
      setWorkouts(workoutsRes.data ?? []);
      setHasClassAccess(Boolean(profileRes.data?.has_class_access));
      setDataLoading(false);
    })();
    return () => { cancelled = true; };
  }, [loading, user, role]);

  useEffect(() => {
    if (!hasClassAccess || workouts.length === 0) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(workouts.map(async (w) => {
        const result: { video?: string; thumb?: string } = {};
        if (w.video_path) {
          const { data } = await supabase.storage.from("workout-videos").createSignedUrl(w.video_path, 3600);
          if (data?.signedUrl) result.video = data.signedUrl;
        }
        if (w.thumbnail_path) {
          const { data } = await supabase.storage.from("workout-thumbnails").createSignedUrl(w.thumbnail_path, 3600);
          if (data?.signedUrl) result.thumb = data.signedUrl;
        }
        return [w.id, result] as const;
      }));
      if (cancelled) return;
      setSignedUrls(Object.fromEntries(entries));
    })();
    return () => { cancelled = true; };
  }, [hasClassAccess, workouts]);

  if (loading || role === "admin" || isAdminEmail(user?.email)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const showVideos = hasClassAccess;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-popover">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="font-display text-2xl">PERSONAL</h1>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground hidden sm:inline">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h2 className="font-display text-3xl">Olá!</h2>
          <p className="text-muted-foreground text-sm">Acompanhe seu treino e {showVideos ? "aulas em vídeo" : "acesse seu plano"}.</p>
        </div>

        <Tabs defaultValue="treino">
          <TabsList>
            <TabsTrigger value="treino"><Dumbbell className="h-4 w-4 mr-2" /> Meu treino</TabsTrigger>
            {showVideos && <TabsTrigger value="aulas"><Video className="h-4 w-4 mr-2" /> Aulas em vídeo</TabsTrigger>}
          </TabsList>

          <TabsContent value="treino" className="mt-4 space-y-4">
            {dataLoading ? <Skeleton className="h-64" /> : plans.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                Seu treino ainda não foi cadastrado. Entre em contato com seu personal.
              </CardContent></Card>
            ) : plans.map((plan) => (
              <Card key={plan.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>{plan.plan_name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">{WEEKDAYS[plan.day_of_week] ?? ""}</p>
                  </div>
                  <Badge variant="secondary">{plan.exercises.length} exercícios</Badge>
                </CardHeader>
                <CardContent className="space-y-2">
                  {plan.exercises.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum exercício adicionado ainda.</p>
                  ) : plan.exercises.map((ex) => (
                    <div key={ex.id} className="rounded-lg border border-border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">{ex.exercise_name}</p>
                        <div className="flex gap-2 text-xs">
                          <Badge variant="outline">{ex.sets}x{ex.reps}</Badge>
                          {ex.rest_seconds ? <Badge variant="outline">Descanso {ex.rest_seconds}s</Badge> : null}
                        </div>
                      </div>
                      {ex.notes && <p className="text-sm text-muted-foreground mt-1">{ex.notes}</p>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {showVideos && (
            <TabsContent value="aulas" className="mt-4">
              {dataLoading ? <Skeleton className="h-64" /> : workouts.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma aula disponível ainda.</CardContent></Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {workouts.map((w) => (
                    <Card key={w.id} className="overflow-hidden">
                      {(signedUrls[w.id]?.thumb || w.thumbnail_url) && (
                        <img src={signedUrls[w.id]?.thumb || w.thumbnail_url || ""} alt={w.title} className="w-full h-40 object-cover" />
                      )}
                      <CardHeader>
                        <CardTitle className="text-base">{w.title}</CardTitle>
                        {w.description && <p className="text-xs text-muted-foreground line-clamp-2">{w.description}</p>}
                      </CardHeader>
                      <CardContent>
                        {signedUrls[w.id]?.video ? (
                          <Button size="sm" variant="secondary" onClick={() => setActiveVideo({ id: w.id, url: signedUrls[w.id]!.video!, title: w.title })}>
                            <PlayCircle className="h-4 w-4 mr-2" /> Assistir agora
                          </Button>
                        ) : w.video_url ? (
                          <a href={w.video_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                            <PlayCircle className="h-4 w-4" /> Assistir
                          </a>
                        ) : <p className="text-xs text-muted-foreground">Vídeo indisponível</p>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </main>
      {activeVideo && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setActiveVideo(null)}>
          <div className="bg-background rounded-xl overflow-hidden max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 border-b border-border">
              <p className="font-medium text-sm">{activeVideo.title}</p>
              <Button size="sm" variant="ghost" onClick={() => setActiveVideo(null)}>Fechar</Button>
            </div>
            <video src={activeVideo.url} controls autoPlay controlsList="nodownload" className="w-full max-h-[70vh] bg-black" />
          </div>
        </div>
      )}
    </div>
  );
}
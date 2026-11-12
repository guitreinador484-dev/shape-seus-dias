import { type ReactNode } from "react";
import { Users } from "lucide-react";
import type { Database, Json, Tables } from "@/integrations/supabase/types";
import { type AppRole } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export type Purchase = Tables<"purchases">;

export type Anamnese = Tables<"anamnese">;

export type Workout = Tables<"workouts">;

export type StudentPlan = Tables<"student_plans">;

export type StudentPlanExercise = Tables<"student_plan_exercises">;

export type BodyMeasurement = Tables<"body_measurements">;

export type WorkoutInsert = Database["public"]["Tables"]["workouts"]["Insert"];

export type WorkoutUpdate = Database["public"]["Tables"]["workouts"]["Update"];

export type PlanWithExercises = StudentPlan & { exercises: StudentPlanExercise[] };

export type AdminSettings = {
  personal_name: string;
  brand_title: string;
  support_whatsapp: string;
  checkout_url: string;
  welcome_message: string;
  platform_hero_workout_id: string;
  platform_hero_title: string;
  platform_hero_subtitle: string;
  platform_hero_image_path: string;
  platform_row_order: string;
  platform_theme: "dark" | "light";
  platform_announcement_enabled: boolean;
  platform_announcement_text: string;
  platform_announcement_type: "info" | "success" | "warning" | "purple";
  platform_show_continue_watching: boolean;
  platform_show_recommended: boolean;
  platform_show_search: boolean;
  welcome_video_url: string;
  welcome_video_title: string;
  welcome_video_text: string;
};

export const defaultAdminSettings: AdminSettings = {
  personal_name: "",
  brand_title: "PERSONAL",
  support_whatsapp: "",
  checkout_url: "",
  welcome_message: "",
  platform_hero_workout_id: "",
  platform_hero_title: "",
  platform_hero_subtitle: "",
  platform_hero_image_path: "",
  platform_row_order: "",
  platform_theme: "dark",
  platform_announcement_enabled: false,
  platform_announcement_text: "",
  platform_announcement_type: "info",
  platform_show_continue_watching: true,
  platform_show_recommended: true,
  platform_show_search: true,
  welcome_video_url: "",
  welcome_video_title: "Pagamento confirmado! 🎉",
  welcome_video_text: "Agora começa oficialmente sua jornada.",
};

export const roleLabels: Record<AppRole, string> = {
  admin: "Administrador",
  online: "Aluno online",
  presencial: "Aluno presencial",
  aluno_mentoria: "Aluno da mentoria",
};

export function asJsonObject(value: Json | null): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function readAdminSettings(value: Json | null): AdminSettings {
  const data = asJsonObject(value);
  const validAnnounceTypes = ["info", "success", "warning", "purple"];
  const annType = typeof data.platform_announcement_type === "string" && validAnnounceTypes.includes(data.platform_announcement_type)
    ? (data.platform_announcement_type as "info" | "success" | "warning" | "purple")
    : "info";

  return {
    personal_name: typeof data.personal_name === "string" ? data.personal_name : defaultAdminSettings.personal_name,
    brand_title: typeof data.brand_title === "string" ? data.brand_title : defaultAdminSettings.brand_title,
    support_whatsapp: typeof data.support_whatsapp === "string" ? data.support_whatsapp : defaultAdminSettings.support_whatsapp,
    checkout_url: typeof data.checkout_url === "string" ? data.checkout_url : defaultAdminSettings.checkout_url,
    welcome_message: typeof data.welcome_message === "string" ? data.welcome_message : defaultAdminSettings.welcome_message,
    platform_hero_workout_id: typeof data.platform_hero_workout_id === "string" ? data.platform_hero_workout_id : "",
    platform_hero_title: typeof data.platform_hero_title === "string" ? data.platform_hero_title : "",
    platform_hero_subtitle: typeof data.platform_hero_subtitle === "string" ? data.platform_hero_subtitle : "",
    platform_hero_image_path: typeof data.platform_hero_image_path === "string" ? data.platform_hero_image_path : "",
    platform_row_order: typeof data.platform_row_order === "string" ? data.platform_row_order : "",
    platform_theme: data.platform_theme === "light" ? "light" : "dark",
    platform_announcement_enabled: typeof data.platform_announcement_enabled === "boolean" ? data.platform_announcement_enabled : false,
    platform_announcement_text: typeof data.platform_announcement_text === "string" ? data.platform_announcement_text : "",
    platform_announcement_type: annType,
    platform_show_continue_watching: typeof data.platform_show_continue_watching === "boolean" ? data.platform_show_continue_watching : true,
    platform_show_recommended: typeof data.platform_show_recommended === "boolean" ? data.platform_show_recommended : true,
    platform_show_search: typeof data.platform_show_search === "boolean" ? data.platform_show_search : true,
    welcome_video_url: typeof data.welcome_video_url === "string" ? data.welcome_video_url : "",
    welcome_video_title: typeof data.welcome_video_title === "string" ? data.welcome_video_title : "Pagamento confirmado! 🎉",
    welcome_video_text: typeof data.welcome_video_text === "string" ? data.welcome_video_text : "Agora começa oficialmente sua jornada.",
  };
}

export function LoadingGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-28" />
      ))}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-8 text-center">
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </div>
  );
}

export function StatCard({ title, value, icon: Icon }: { title: string; value: string | number; icon: typeof Users }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return <div className={className}><Label className="mb-2 block">{label}</Label>{children}</div>;
}

export type DbExerciseItem = { id: string; name: string; muscle_group: string; has_video: boolean };

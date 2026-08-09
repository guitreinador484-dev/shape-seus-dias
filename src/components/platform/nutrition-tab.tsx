import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Apple, UtensilsCrossed } from "lucide-react";

type NutritionMeal = Tables<"nutrition_meals">;
type NutritionItem = Tables<"nutrition_items">;
type PlanFull = Tables<"nutrition_plans"> & { meals: (NutritionMeal & { items: NutritionItem[] })[] };

function num(v: number | null): number {
  return typeof v === "number" ? v : 0;
}

export function NutritionTab({ userId }: { userId: string }) {
  const [plans, setPlans] = useState<PlanFull[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: plansRes } = await supabase.from("nutrition_plans").select("*").eq("student_id", userId).order("created_at", { ascending: false });
      const planIds = (plansRes ?? []).map((p) => p.id);
      const { data: mealsRes } = planIds.length
        ? await supabase.from("nutrition_meals").select("*").in("plan_id", planIds).order("meal_order", { ascending: true })
        : { data: [] as NutritionMeal[] };
      const mealIds = (mealsRes ?? []).map((m) => m.id);
      const { data: itemsRes } = mealIds.length
        ? await supabase.from("nutrition_items").select("*").in("meal_id", mealIds).order("display_order", { ascending: true })
        : { data: [] as NutritionItem[] };
      if (cancelled) return;
      const itemsByMeal = new Map<string, NutritionItem[]>();
      (itemsRes ?? []).forEach((item) => itemsByMeal.set(item.meal_id, [...(itemsByMeal.get(item.meal_id) ?? []), item]));
      const mealsByPlan = new Map<string, (NutritionMeal & { items: NutritionItem[] })[]>();
      (mealsRes ?? []).forEach((meal) => mealsByPlan.set(meal.plan_id, [...(mealsByPlan.get(meal.plan_id) ?? []), { ...meal, items: itemsByMeal.get(meal.id) ?? [] }]));
      setPlans((plansRes ?? []).map((p) => ({ ...p, meals: mealsByPlan.get(p.id) ?? [] })));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  if (loading) return <Skeleton className="h-64" />;

  if (plans.length === 0) {
    return (
      <Card><CardContent className="py-12 text-center">
        <Apple className="h-8 w-8 text-primary/60 mx-auto mb-3" />
        <p className="font-medium">Seu plano alimentar ainda não foi liberado.</p>
        <p className="text-sm text-muted-foreground mt-1">Seu personal está preparando as refeições para você.</p>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-6">
      {plans.map((plan) => {
        const totals = plan.meals.reduce((acc, meal) => {
          const t = meal.items.reduce((a, item) => ({
            calories: a.calories + num(item.calories),
            protein: a.protein + num(item.protein),
            carbs: a.carbs + num(item.carbs),
            fat: a.fat + num(item.fat),
          }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
          return { calories: acc.calories + t.calories, protein: acc.protein + t.protein, carbs: acc.carbs + t.carbs, fat: acc.fat + t.fat };
        }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

        return (
          <Card key={plan.id}>
            <CardContent className="pt-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-display text-2xl tracking-tight flex items-center gap-2">
                  <Apple className="h-5 w-5 text-primary" /> {plan.plan_name || "Plano alimentar"}
                </h3>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>🔥 {Math.round(totals.calories)} kcal</span>
                  <span>🥩 {Math.round(totals.protein)}g prot</span>
                  <span>🌾 {Math.round(totals.carbs)}g carb</span>
                  <span>🫒 {Math.round(totals.fat)}g gord</span>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {plan.meals.map((meal) => (
                  <div key={meal.id} className="rounded-2xl border border-border/60 bg-muted/40 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <UtensilsCrossed className="h-4 w-4 text-primary" />
                      <p className="font-semibold">{meal.meal_label}</p>
                    </div>
                    {meal.notes && <p className="text-xs text-muted-foreground mb-2">{meal.notes}</p>}
                    {meal.items.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Sem alimentos.</p>
                    ) : (
                      <ul className="space-y-1.5 text-sm">
                        {meal.items.map((item) => (
                          <li key={item.id} className="flex items-baseline justify-between gap-2 border-b border-border/40 pb-1 last:border-0">
                            <span className="font-medium">{item.food}</span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {item.amount ? `${item.amount} · ` : ""}{num(item.calories) ? `${Math.round(num(item.calories))} kcal` : ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

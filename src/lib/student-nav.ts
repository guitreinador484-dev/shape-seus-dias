import {
  Apple,
  ClipboardList,
  CreditCard,
  Dumbbell,
  Library,
  MessageSquareText,
  TrendingUp,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Destinos do dia a dia: aparecem no menu flutuante do celular e no topo da barra lateral. */
export const PRIMARY_TABS = [
  { id: "treino", label: "Treino", icon: Dumbbell },
  { id: "aulas", label: "Aulas", icon: Video },
  { id: "dieta", label: "Dieta", icon: Apple },
  { id: "evolucao", label: "Evolução", icon: TrendingUp },
];

export function accountNavItems(isMentoria: boolean) {
  return [
    { id: "ficha", label: "Minha ficha", icon: ClipboardList },
    ...(isMentoria ? [{ id: "mentoria", label: "Mentoria", icon: Library }] : []),
    { id: "feedback", label: "Críticas e sugestões", icon: MessageSquareText },
    { id: "assinatura", label: "Minha assinatura", icon: CreditCard },
  ];
}

export function floatingNavItemClass(active: boolean) {
  return cn(
    "flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl transition-colors duration-150",
    active ? "bg-primary/10 text-foreground" : "text-muted-foreground",
  );
}

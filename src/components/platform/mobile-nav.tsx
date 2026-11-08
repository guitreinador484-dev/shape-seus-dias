import { Apple, Dumbbell, TrendingUp, Video } from "lucide-react";
import { ProfileMore, type MoreItem } from "./profile-more";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  onGoToCheckin: () => void;
  userEmail?: string;
  moreItems: MoreItem[];
}

const PRIMARY = [
  { id: "treino", label: "Treino", icon: Dumbbell },
  { id: "aulas", label: "Aulas", icon: Video },
  { id: "dieta", label: "Dieta", icon: Apple },
  { id: "evolucao", label: "Evolução", icon: TrendingUp },
];

export function MobileNav({ activeTab, onTabChange, onLogout, onGoToCheckin, userEmail, moreItems }: MobileNavProps) {
  return (
    <nav aria-label="Navegação principal" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="mx-auto grid h-16 max-w-lg grid-cols-5">
        {PRIMARY.map((item) => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 transition-colors duration-150",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {active ? <span className="absolute inset-x-4 top-0 h-0.5 rounded-b bg-primary" /> : null}
              <item.icon className={cn("h-5 w-5", active && "text-primary")} />
              <span className="text-[11px] font-medium">{item.label}</span>
            </button>
          );
        })}
        <ProfileMore
          userEmail={userEmail}
          activeTab={activeTab}
          items={moreItems}
          onTabChange={onTabChange}
          onGoToCheckin={onGoToCheckin}
          onLogout={onLogout}
        />
      </div>
    </nav>
  );
}

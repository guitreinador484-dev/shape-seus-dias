import { CalendarCheck, Dumbbell, Home, Library, TrendingUp } from "lucide-react";
import { ProfileMore } from "./profile-more";

interface MobileNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  userEmail?: string;
  showVideos?: boolean;
  isMentoria?: boolean;
}

export function MobileNav({ activeTab, onTabChange, onLogout, userEmail, isMentoria }: MobileNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-linear-to-t from-background via-background/95 to-transparent px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 lg:hidden">
      <nav className="mx-auto flex h-16 max-w-md items-center justify-between rounded-lg border border-border bg-card/95 px-3 shadow-2xl shadow-background backdrop-blur-xl">
        <button
          onClick={() => { onTabChange("treino"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          className={`flex flex-col items-center justify-center gap-1 transition-colors ${
            activeTab === "treino" ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Home className="h-5 w-5" />
          <span className="text-[10px] font-medium">Início</span>
        </button>

        <button onClick={() => { onTabChange("treino"); window.scrollTo({ top: 300, behavior: "smooth" }); }} className={`flex flex-col items-center justify-center gap-1 ${activeTab === "treino" ? "text-primary" : "text-muted-foreground"}`}><Dumbbell className="h-5 w-5" /><span className="text-[10px] font-medium">Treinos</span></button>

        <button onClick={() => { onTabChange("treino"); requestAnimationFrame(() => document.getElementById("checkin-section")?.scrollIntoView({ behavior: "smooth" })); }} className="flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground"><CalendarCheck className="h-5 w-5" /><span className="text-[10px] font-medium">Check-in</span></button>

        <button
          onClick={() => onTabChange(isMentoria ? "mentoria" : "evolucao")}
          className={`flex flex-col items-center justify-center gap-1 transition-colors ${
            activeTab === (isMentoria ? "mentoria" : "evolucao") ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {isMentoria ? <Library className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />}
          <span className="text-[10px] font-medium">{isMentoria ? "Mentoria" : "Evolução"}</span>
        </button>

        <ProfileMore 
          userEmail={userEmail} 
          onTabChange={onTabChange} 
          onLogout={onLogout}
          isMentoria={isMentoria}
        />
      </nav>
    </div>
  );
}

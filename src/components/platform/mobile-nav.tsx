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
    <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 bg-gradient-to-t from-[#0A0A0B] via-[#0A0A0B]/95 to-transparent">
      <nav className="max-w-md mx-auto h-16 bg-white/5 border border-white/10 backdrop-blur-2xl rounded-2xl px-3 flex items-center justify-between shadow-2xl shadow-black">
        <button
          onClick={() => { onTabChange("treino"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          className={`flex flex-col items-center justify-center gap-1 transition-colors ${
            activeTab === "treino" ? "text-primary" : "text-white/40 hover:text-white"
          }`}
        >
          <Home className="h-5 w-5" />
          <span className="text-[10px] font-medium">Início</span>
        </button>

        <button onClick={() => { onTabChange("treino"); window.scrollTo({ top: 300, behavior: "smooth" }); }} className={`flex flex-col items-center justify-center gap-1 ${activeTab === "treino" ? "text-primary" : "text-white/40"}`}><Dumbbell className="h-5 w-5" /><span className="text-[10px] font-medium">Treinos</span></button>

        <button onClick={() => { onTabChange("treino"); requestAnimationFrame(() => document.getElementById("checkin-section")?.scrollIntoView({ behavior: "smooth" })); }} className="flex flex-col items-center justify-center gap-1 text-white/40 hover:text-white"><CalendarCheck className="h-5 w-5" /><span className="text-[10px] font-medium">Check-in</span></button>

        <button
          onClick={() => onTabChange(isMentoria ? "mentoria" : "evolucao")}
          className={`flex flex-col items-center justify-center gap-1 transition-colors ${
            activeTab === (isMentoria ? "mentoria" : "evolucao") ? "text-primary" : "text-white/40 hover:text-white"
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

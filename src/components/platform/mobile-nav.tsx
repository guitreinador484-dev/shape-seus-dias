import { Dumbbell, Video, TrendingUp } from "lucide-react";
import { ProfileMore } from "./profile-more";

interface MobileNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  userEmail?: string;
  showVideos?: boolean;
  isMentoria?: boolean;
}

export function MobileNav({ activeTab, onTabChange, onLogout, userEmail, showVideos, isMentoria }: MobileNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden px-4 pb-6 pt-2 bg-gradient-to-t from-[#0A0A0B] via-[#0A0A0B]/95 to-transparent">
      <nav className="max-w-md mx-auto h-16 bg-white/5 border border-white/10 backdrop-blur-2xl rounded-3xl px-6 flex items-center justify-between shadow-2xl shadow-black">
        <button
          onClick={() => onTabChange("treino")}
          className={`flex flex-col items-center justify-center gap-1 transition-colors ${
            activeTab === "treino" ? "text-primary" : "text-white/40 hover:text-white"
          }`}
        >
          <Dumbbell className="h-5 w-5" />
          <span className="text-[10px] font-medium">Treino</span>
        </button>

        {showVideos && (
          <button
            onClick={() => onTabChange("aulas")}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === "aulas" ? "text-primary" : "text-white/40 hover:text-white"
            }`}
          >
            <Video className="h-5 w-5" />
            <span className="text-[10px] font-medium">Aulas</span>
          </button>
        )}

        <button
          onClick={() => onTabChange("evolucao")}
          className={`flex flex-col items-center justify-center gap-1 transition-colors ${
            activeTab === "evolucao" ? "text-primary" : "text-white/40 hover:text-white"
          }`}
        >
          <TrendingUp className="h-5 w-5" />
          <span className="text-[10px] font-medium">Evolução</span>
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

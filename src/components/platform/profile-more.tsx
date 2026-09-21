import { User, LogOut, Apple, ClipboardList, Library, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

interface ProfileMoreProps {
  userEmail?: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  isMentoria?: boolean;
}

export function ProfileMore({ userEmail, onTabChange, onLogout, isMentoria }: ProfileMoreProps) {
  const items = [
    { id: "dieta", label: "Minha Dieta", icon: Apple },
    { id: "ficha", label: "Minha Ficha", icon: ClipboardList },
    ...(isMentoria ? [{ id: "mentoria", label: "Mentoria", icon: Library }] : []),
  ];

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <button className="flex flex-col items-center justify-center gap-1 text-white/40 hover:text-white transition-colors">
          <User className="h-5 w-5" />
          <span className="text-[10px] font-medium">Perfil</span>
        </button>
      </DrawerTrigger>
      <DrawerContent className="bg-[#0E0E10] border-white/10 text-white px-4 pb-8">
        <DrawerHeader className="px-0">
          <DrawerTitle className="text-left font-display text-xl">Mais Opções</DrawerTitle>
          <p className="text-left text-xs text-white/40">{userEmail}</p>
        </DrawerHeader>
        
        <div className="space-y-2 mt-4">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className="flex w-full items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <item.icon className="h-5 w-5" />
                </div>
                <span className="font-medium">{item.label}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-white/20 group-hover:text-white/40" />
            </button>
          ))}
          
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-3 p-4 rounded-2xl text-red-400 hover:bg-red-500/10 transition-all mt-4"
          >
            <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <LogOut className="h-5 w-5" />
            </div>
            <span className="font-medium">Sair da conta</span>
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

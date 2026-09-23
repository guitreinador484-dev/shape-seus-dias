import { User, LogOut, Apple, ClipboardList, Library, ChevronRight, MessageSquareText, Video } from "lucide-react";
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
    { id: "aulas", label: "Aulas em vídeo", icon: Video },
    { id: "ficha", label: "Minha Ficha", icon: ClipboardList },
    ...(isMentoria ? [{ id: "mentoria", label: "Mentoria", icon: Library }] : []),
    { id: "feedback", label: "Críticas e sugestões", icon: MessageSquareText },
  ];

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <button className="flex flex-col items-center justify-center gap-1 text-muted-foreground transition-colors hover:text-foreground">
          <User className="h-5 w-5" />
          <span className="text-[10px] font-medium">Perfil</span>
        </button>
      </DrawerTrigger>
      <DrawerContent className="border-border bg-popover px-4 pb-8 text-foreground">
        <DrawerHeader className="px-0">
          <DrawerTitle className="text-left font-display text-xl">Mais Opções</DrawerTitle>
          <p className="text-left text-xs text-muted-foreground">{userEmail}</p>
        </DrawerHeader>
        
        <div className="space-y-2 mt-4">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className="group flex w-full items-center justify-between rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/40 hover:bg-surface-2"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
                  <item.icon className="h-5 w-5" />
                </div>
                <span className="font-medium">{item.label}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            </button>
          ))}
          
          <button
            onClick={onLogout}
            className="mt-4 flex w-full items-center gap-3 rounded-lg p-4 text-destructive transition-all hover:bg-destructive/10"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
              <LogOut className="h-5 w-5" />
            </div>
            <span className="font-medium">Sair da conta</span>
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

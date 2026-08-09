import { Link } from "@tanstack/react-router";
import { BookOpen, Play, Folder } from "lucide-react";

export default function LeftSidebar() {
  return (
    <aside className="hidden lg:block w-64 flex-shrink-0 bg-background/60 backdrop-blur-md border-r border-border/20 p-4 rounded-r-lg">
      <nav className="space-y-4">
        <Link to="/plataforma" className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
          <BookOpen className="h-4 w-4" />
          Meu treino
        </Link>
        <Link to="/plataforma/video" className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
          <Play className="h-4 w-4" />
          Aulas em vídeo
        </Link>
        <Link to="/plataforma/cursos" className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
          <Folder className="h-4 w-4" />
          Cursos
        </Link>
      </nav>
    </aside>
  );
}

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** Botão de ícone que alterna entre o tema escuro e o claro. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const label = theme === "light" ? "Usar tema escuro" : "Usar tema claro";
  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={label} title={label} className={cn("shrink-0 text-muted-foreground", className)}>
      {theme === "light" ? <Moon /> : <Sun />}
    </Button>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, User } from "lucide-react";
import { adminStudentsQuery } from "@/lib/admin-data";
import { isAdminEmail } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

type CommandPage = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
};

/** Busca rápida (⌘K / Ctrl K): abre qualquer tela do painel ou a ficha de um aluno. */
export function AdminCommand({ pages }: { pages: CommandPage[] }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: students } = useQuery({ ...adminStudentsQuery, enabled: open });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function go(to: string, params?: Record<string, string>) {
    setOpen(false);
    void navigate({ to, params } as never);
  }

  const isMac = typeof navigator !== "undefined" && /mac/i.test(navigator.platform);
  const people = (students ?? []).filter(
    (student) => student.role !== "admin" && !isAdminEmail(student.email),
  );

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label="Buscar no painel"
        className="justify-start gap-2 text-muted-foreground md:w-64"
      >
        <Search />
        <span className="hidden flex-1 text-left font-normal md:inline">Buscar aluno ou tela</span>
        <kbd className="hidden rounded border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-medium md:inline">
          {isMac ? "⌘K" : "Ctrl K"}
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Buscar aluno ou tela" />
        <CommandList>
          <CommandEmpty>Nada encontrado.</CommandEmpty>
          <CommandGroup heading="Telas">
            {pages.map((page) => (
              <CommandItem
                key={page.url}
                value={`tela ${page.title}`}
                onSelect={() => go(page.url)}
              >
                <page.icon className="mr-2 h-4 w-4" /> {page.title}
              </CommandItem>
            ))}
          </CommandGroup>
          {people.length > 0 ? (
            <CommandGroup heading="Alunos">
              {people.map((student) => (
                <CommandItem
                  key={student.id}
                  value={`aluno ${student.full_name ?? ""} ${student.email ?? ""} ${student.whatsapp ?? ""}`}
                  onSelect={() => go("/admin/alunos/$id", { id: student.id })}
                >
                  <User className="mr-2 h-4 w-4" />
                  <span className="truncate">{student.full_name || student.email}</span>
                  {student.full_name ? (
                    <span className="ml-2 truncate text-xs text-muted-foreground">
                      {student.email}
                    </span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
        </CommandList>
      </CommandDialog>
    </>
  );
}

import type { ReactNode } from "react";
import { Loader2, AlertTriangle, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/** Cabeçalho padrão de página do admin: título, explicação simples e a ação principal. */
export function AdminPageHeader({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-56">
          <h2 className="font-display text-4xl leading-none">{title}</h2>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>
        </div>
        {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
      </div>
      {children}
    </div>
  );
}

type Tone = "green" | "amber" | "orange" | "red" | "blue" | "gray" | "purple";

const toneClasses: Record<Tone, string> = {
  green: "bg-success/10 text-success border-success/25",
  amber: "bg-warning/10 text-warning border-warning/25",
  orange: "bg-warning/10 text-warning border-warning/25",
  red: "bg-destructive/15 text-primary border-destructive/35",
  blue: "bg-secondary text-foreground border-border",
  purple: "bg-secondary text-foreground border-border",
  gray: "bg-muted text-muted-foreground border-border",
};

/** Etiqueta de estado: sempre com texto, nunca só cor. */
export function StatusPill({ tone, children, className }: { tone: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {children}
    </span>
  );
}

/** Menu "Ações" das linhas de tabela — agrupa tudo, inclusive o que é destrutivo. */
export function RowActions({ children, label = "Ações" }: { children: ReactNode; label?: string }) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <MoreHorizontal className="h-4 w-4" />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Confirmação para ações importantes (excluir, bloquear...). */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancelar",
  destructive,
  onConfirm,
  open,
  onOpenChange,
}: {
  trigger?: ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger> : null}
      <AlertDialogContent className="max-h-[90vh] w-[calc(100%-1.5rem)] overflow-y-auto sm:w-full">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => void onConfirm()}
            className={destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Estado vazio amigável, sempre com o próximo passo. */
export function EmptyBox({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border p-10 text-center">
      <p className="font-medium">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

/** Erro de carregamento com opção de tentar de novo. */
export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
      <AlertTriangle className="mx-auto h-5 w-5 text-primary" />
      <p className="mt-2 font-medium">Não conseguimos carregar estas informações</p>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      {onRetry ? (
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          Tentar de novo
        </Button>
      ) : null}
    </div>
  );
}

export function LoadingBox({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

/** Card de número: informação, nunca parece botão. O número é o protagonista. */
export function MetricCard({
  label,
  value,
  hint,
  tone = "gray",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: Tone;
}) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
        <p className={cn("mt-1 truncate font-display text-4xl leading-none tabular-nums", tone === "red" && value ? "text-primary" : "text-foreground")}>{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export function BusyLabel({ busy, children }: { busy: boolean; children: ReactNode }) {
  return (
    <>
      {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {children}
    </>
  );
}

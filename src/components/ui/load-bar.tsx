import { cn } from "@/lib/utils";

/**
 * Barra de carga: cada segmento é uma "anilha" (um exercício, um dia, um aluno).
 * Acima de `maxSegments` a barra vira proporcional para não perder a leitura.
 */
export function LoadBar({
  total,
  done,
  maxSegments = 24,
  label,
  className,
}: {
  total: number;
  done: number;
  maxSegments?: number;
  label?: string;
  className?: string;
}) {
  const segments = Math.min(Math.max(total, 1), maxSegments);
  const filled = total > 0 ? Math.round((Math.min(done, total) / total) * segments) : 0;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={Math.min(done, total)}
      aria-label={label}
      className={cn("flex h-2 w-full gap-[3px]", className)}
    >
      {Array.from({ length: segments }).map((_, index) => (
        <span
          key={index}
          className={cn(
            "h-full min-w-0 flex-1 rounded-[2px] transition-colors duration-200",
            index < filled ? "bg-primary" : "bg-foreground/12",
          )}
        />
      ))}
    </div>
  );
}

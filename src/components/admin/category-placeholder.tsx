import { CheckCircle2 } from "lucide-react";

export function AdminCategoryPlaceholder({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: string[];
}) {
  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="font-display text-3xl mb-2">{title}</h2>
      <p className="text-muted-foreground mb-6">{description}</p>
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="font-semibold mb-4">O que será gerenciado aqui</h3>
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it} className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span>{it}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground mt-6">
          Esta categoria está pronta para receber a implementação completa.
        </p>
      </div>
    </div>
  );
}
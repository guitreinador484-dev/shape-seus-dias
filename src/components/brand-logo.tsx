import logoAsset from "@/assets/gui-treinador-logo.jpg.asset.json";
import { cn } from "@/lib/utils";

export function BrandLogo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <img
      src={logoAsset.url}
      alt="Gui Treinador"
      className={cn(
        "object-contain drop-shadow-[0_0_14px_color-mix(in_oklab,var(--primary)_28%,transparent)]",
        compact ? "h-10 w-14 object-cover object-top" : "h-auto w-full",
        className,
      )}
    />
  );
}
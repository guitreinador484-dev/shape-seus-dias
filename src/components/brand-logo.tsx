import iconAsset from "@/assets/tg-icon.png.asset.json";
import nameAsset from "@/assets/treinador-gui-name.png.asset.json";
import { cn } from "@/lib/utils";

/** Ícone da marca — monograma "TG". */
export function BrandLogoMark({ className }: { className?: string }) {
  return (
    <img
      src={iconAsset.url}
      alt="TG — Gui Treinador"
      className={cn("object-contain", className)}
    />
  );
}

/** Nome da marca — "TREINADOR GUI". */
export function BrandLogoName({ className }: { className?: string }) {
  return (
    <img
      src={nameAsset.url}
      alt="Treinador GUI"
      className={cn("object-contain", className)}
    />
  );
}

/** Logo completo: nome da marca (wordmark). */
export function BrandLogo({ className }: { className?: string }) {
  return <BrandLogoName className={className} />;
}

import { supabase } from "@/integrations/supabase/client";
import type { FunnelConfig } from "@/lib/funnel-store";

export const FUNNEL_BUCKET = "funnel-assets";
export const FUNNEL_PREFIX = "funnel://";

/** Faz upload de uma imagem para o bucket do funil e retorna a referência funnel://<path> */
export async function uploadFunnelImage(file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(FUNNEL_BUCKET)
    .upload(path, file, { contentType: file.type });
  if (error) throw error;
  return FUNNEL_PREFIX + path;
}

/** Remove uma imagem do bucket do funil a partir da referência funnel://<path> */
export async function deleteFunnelImage(ref: string): Promise<void> {
  if (!ref.startsWith(FUNNEL_PREFIX)) return;
  await supabase.storage.from(FUNNEL_BUCKET).remove([ref.slice(FUNNEL_PREFIX.length)]);
}

/** Converte uma referência (funnel:// ou URL externa) em URL utilizável */
export async function resolveFunnelUrl(src?: string): Promise<string | undefined> {
  if (!src) return src;
  if (!src.startsWith(FUNNEL_PREFIX)) return src;
  const { data, error } = await supabase.storage
    .from(FUNNEL_BUCKET)
    .createSignedUrl(src.slice(FUNNEL_PREFIX.length), 60 * 60 * 24 * 7);
  if (error || !data) return undefined;
  return data.signedUrl;
}

/** Resolve todas as imagens funnel:// da configuração para URLs assinadas */
export async function resolveFunnelConfigImages(cfg: FunnelConfig): Promise<FunnelConfig> {
  const [results, testimonials, bannerImage] = await Promise.all([
    Promise.all((cfg.results ?? []).map((r) => resolveFunnelUrl(r))),
    Promise.all(
      (cfg.testimonials ?? []).map(async (t) => ({
        ...t,
        avatar: await resolveFunnelUrl(t.avatar),
      })),
    ),
    cfg.banner?.image ? resolveFunnelUrl(cfg.banner.image) : Promise.resolve(cfg.banner?.image),
  ]);
  return {
    ...cfg,
    results: results.filter(Boolean) as string[],
    testimonials,
    banner: cfg.banner ? { ...cfg.banner, image: bannerImage } : cfg.banner,
  };
}

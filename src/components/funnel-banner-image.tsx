import { useEffect, useState, type CSSProperties } from 'react';
import type { FunnelBanner } from '@/lib/funnel-store';
import { resolveFunnelUrl } from '@/lib/funnel-assets';

export function FunnelBannerImage({ banner, device }: { banner: FunnelBanner; device?: 'desktop' | 'mobile' }) {
  const [url, setUrl] = useState(banner.image.startsWith('funnel://') ? '' : banner.image);
  useEffect(() => {
    let active = true;
    resolveFunnelUrl(banner.image).then((value) => { if (active) setUrl(value ?? ''); }).catch(() => { if (active) setUrl(''); });
    return () => { active = false; };
  }, [banner.image]);
  const desktop = banner.desktopFrame ?? { x: 50, y: 50, zoom: 100 };
  const mobile = banner.mobileFrame ?? { x: 50, y: 50, zoom: 100 };
  const chosen = device === 'mobile' ? mobile : desktop;
  const style = {
    '--banner-position': `${chosen.x}% ${chosen.y}%`,
    '--banner-zoom': chosen.zoom / 100,
    '--banner-desktop-position': `${desktop.x}% ${desktop.y}%`,
    '--banner-desktop-zoom': desktop.zoom / 100,
    '--banner-mobile-position': `${mobile.x}% ${mobile.y}%`,
    '--banner-mobile-zoom': mobile.zoom / 100,
  } as CSSProperties;
  return <div className="h-56 w-full overflow-hidden" style={style}>
    {url && <img src={url} alt="Banner do Gui Treinador" className={device
      ? 'h-full w-full object-cover [object-position:var(--banner-position)] [transform:scale(var(--banner-zoom))] [transform-origin:var(--banner-position)]'
      : 'h-full w-full object-cover [object-position:var(--banner-mobile-position)] [transform:scale(var(--banner-mobile-zoom))] [transform-origin:var(--banner-mobile-position)] sm:[object-position:var(--banner-desktop-position)] sm:[transform:scale(var(--banner-desktop-zoom))] sm:[transform-origin:var(--banner-desktop-position)]'} />}
  </div>;
}
import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { CreditCard, Loader2 } from 'lucide-react';
import { getSubscriptionReturnFn } from '@/lib/subscriptions.functions';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/brand-logo';

export const Route = createFileRoute('/assinatura')({ component: SubscriptionReturn, head: () => ({ meta: [{ title: 'Confirmação de assinatura — Gui Treinador' }, { name: 'description', content: 'Acompanhe a confirmação da primeira cobrança de sua assinatura mensal.' }, { property: 'og:title', content: 'Confirmação de assinatura — Gui Treinador' }, { property: 'og:description', content: 'Acompanhe a confirmação da primeira cobrança de sua assinatura mensal.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }) });
function SubscriptionReturn() {
  const status = useServerFn(getSubscriptionReturnFn);
  const [paid, setPaid] = useState(false);
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');
  const [canceled, setCanceled] = useState(false);
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (!ref) { setError('Referência não encontrada.'); return; }
    setReference(ref);
    let active = true;
    async function refresh() { try { const result = await status({ data: { reference: ref ?? '' } }); if (!active) return; setPaid(result.paid); setCanceled(['canceled', 'cancelled', 'creation_failed'].includes(result.status)); setError(''); } catch { if (active) setError('Não foi possível confirmar agora. Tentaremos novamente.'); } }
    void refresh(); const timer = setInterval(() => void refresh(), 10000);
    return () => { active = false; clearInterval(timer); };
  }, [status]);
  return <main className="min-h-dvh bg-background text-foreground px-5 py-12"><div className="mx-auto max-w-lg space-y-6"><BrandLogo /><CreditCard className="h-10 w-10 text-primary" /><h1 className="text-2xl font-bold">{paid ? 'Primeira cobrança confirmada' : canceled ? 'Assinatura não concluída' : 'Aguardando primeira cobrança'}</h1><p className="text-muted-foreground">{paid ? 'Seu acesso está liberado. Continue para entrar na plataforma.' : canceled ? 'Nenhum novo acesso foi liberado por esta contratação.' : 'A autorização do cartão não confirma o pagamento. O Mercado Pago pode levar cerca de uma hora para cobrar a primeira parcela. Seu acesso será liberado após a aprovação.'}</p>{error && <p role="alert" className="text-destructive">{error}</p>}{paid ? <Button asChild><a href={`/criar-senha?ref=${encodeURIComponent(reference)}`}>Continuar para o acesso</a></Button> : !canceled && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Aguardando confirmação do Mercado Pago</p>}<Button asChild variant="outline"><Link to="/">Já tenho conta · Entrar</Link></Button></div></main>;
}
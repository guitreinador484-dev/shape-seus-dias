import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { monthlyOffer, monthlyRecurrence } from './subscription-policy';
import { DEFAULT_FUNNEL, type FunnelConfig } from './funnel-store';

const checkoutSchema = z.object({ planId: z.string().min(1).max(100), bumpIds: z.array(z.string().min(1).max(100)).max(30), email: z.string().trim().email().max(255).transform((v) => v.toLowerCase()), name: z.string().trim().min(1).max(150), consent: z.literal(true) });

export const getSubscriptionAvailabilityFn = createServerFn({ method: 'GET' }).handler(async () => {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data } = await supabaseAdmin.from('billing_settings').select('enabled,verified_at').eq('id', true).maybeSingle();
  return { enabled: Boolean(data?.enabled && data.verified_at && process.env['MERCADOPAGO_WEBHOOK_SECRET']) };
});

export const createSubscriptionFn = createServerFn({ method: 'POST' }).inputValidator((input: unknown) => checkoutSchema.parse(input)).handler(async ({ data }) => {
  const token = process.env['MERCADOPAGO_ACCESS_TOKEN'];
  if (!token) throw new Error('Mercado Pago não configurado.');
  const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
  const { data: settings } = await db.from('billing_settings').select('enabled,verified_at').eq('id', true).maybeSingle();
  if (!settings?.enabled || !settings.verified_at || !process.env['MERCADOPAGO_WEBHOOK_SECRET']) throw new Error('Assinaturas ainda não ativadas.');
  const [{ data: funnel, error: funnelError }, { data: bumpRows, error: bumpError }] = await Promise.all([
    db.from('quiz_config').select('content').eq('section', 'funnel:default').maybeSingle(),
    db.from('quiz_config').select('content').eq('section', 'order_bump').maybeSingle(),
  ]);
  if (funnelError || bumpError) throw new Error('Não foi possível conferir os preços.');
  const config = (funnel?.content as unknown as FunnelConfig | null) ?? DEFAULT_FUNNEL;
  const raw = bumpRows?.content as { items?: { id: string; title: string; price: number; enabled: boolean; unlockNutrition: boolean; unlockVideos: boolean }[] } | null;
  const offer = monthlyOffer(config.plans, raw?.items ?? [], data.planId, data.bumpIds);
  const origin = new URL(getRequest().url).origin;
  if (!origin.startsWith('https://')) throw new Error('Abra o endereço seguro da plataforma para assinar.');
  const reference = crypto.randomUUID();
  const { data: purchase, error: purchaseError } = await db.from('purchases').insert({ provider: 'mercadopago', provider_reference: reference, billing_type: 'subscription', payment_method: 'card', amount: offer.amount, status: 'pending', plan_id: data.planId, customer_email: data.email, customer_name: data.name, order_bump: offer.ids.length > 0, order_bump_ids: offer.ids, unlock_nutrition: offer.unlockNutrition, unlock_videos: offer.unlockVideos }).select('id').single();
  if (purchaseError) throw new Error('Não foi possível registrar a contratação.');
  const { data: subscription, error: subscriptionError } = await db.from('subscriptions').insert({ reference, purchase_id: purchase.id, customer_email: data.email, customer_name: data.name, plan_id: data.planId, plan_name: offer.name, amount: offer.amount, order_bump_ids: offer.ids, unlock_nutrition: offer.unlockNutrition, unlock_videos: offer.unlockVideos }).select('id').single();
  if (subscriptionError) throw new Error('Não foi possível registrar a assinatura.');
  const response = await fetch('https://api.mercadopago.com/preapproval', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': reference }, body: JSON.stringify({ reason: offer.name.slice(0, 200), external_reference: reference, payer_email: data.email, auto_recurring: monthlyRecurrence(offer.amount), back_url: `${origin}/assinatura?ref=${reference}`, status: 'pending' }) });
  const result = await response.json() as { id?: string; init_point?: string };
  if (!response.ok || !result.id || !result.init_point) {
    await db.from('subscriptions').update({ status: 'creation_failed' }).eq('id', subscription.id);
    throw new Error('Mercado Pago não conseguiu iniciar a assinatura. Tente novamente.');
  }
  const target = new URL(result.init_point);
  if (target.protocol !== 'https:' || !(target.hostname === 'mercadopago.com.br' || target.hostname.endsWith('.mercadopago.com.br'))) throw new Error('Endereço de pagamento inválido.');
  const { error: updateError } = await db.from('subscriptions').update({ provider_id: result.id }).eq('id', subscription.id);
  if (updateError) throw new Error('Não foi possível vincular a assinatura.');
  return { checkoutUrl: target.href };
});

export const getSubscriptionReturnFn = createServerFn({ method: 'POST' }).inputValidator((input: unknown) => z.object({ reference: z.string().uuid() }).parse(input)).handler(async ({ data }) => {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data: row } = await supabaseAdmin.from('subscriptions').select('status,current_period_end').eq('reference', data.reference).maybeSingle();
  return { status: row?.status ?? 'pending', paid: Boolean(row?.current_period_end) };
});

export const listSubscriptionsFn = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.from('subscriptions').select('id,plan_name,amount,status,current_period_end,customer_name,created_at').order('created_at', { ascending: false });
  if (error) throw new Error('Não foi possível carregar assinaturas.');
  return data;
});

export const cancelSubscriptionFn = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input)).handler(async ({ data, context }) => {
  const { data: row, error } = await context.supabase.from('subscriptions').select('id,provider_id').eq('id', data.id).maybeSingle();
  if (error || !row?.provider_id) throw new Error('Assinatura indisponível.');
  const token = process.env['MERCADOPAGO_ACCESS_TOKEN'];
  if (!token) throw new Error('Mercado Pago não configurado.');
  const response = await fetch(`https://api.mercadopago.com/preapproval/${encodeURIComponent(row.provider_id)}`, { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'canceled' }) });
  if (!response.ok) throw new Error('Não foi possível cancelar no Mercado Pago. Tente novamente.');
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { error: updateError } = await supabaseAdmin.from('subscriptions').update({ status: 'canceled', canceled_at: new Date().toISOString() }).eq('id', row.id);
  if (updateError) throw new Error('Cancelamento enviado; atualização pendente.');
  return { ok: true };
});

export const subscriptionSetupFn = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data: admin } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
  if (!admin) throw new Error('Acesso restrito.');
  const { data } = await context.supabase.from('billing_settings').select('enabled,verified_at').eq('id', true).maybeSingle();
  return { enabled: Boolean(data?.enabled), verified: Boolean(data?.verified_at), secretReady: Boolean(process.env['MERCADOPAGO_WEBHOOK_SECRET']) };
});

export const activateSubscriptionsFn = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => z.object({ enabled: z.boolean() }).parse(input)).handler(async ({ data, context }) => {
  const { data: admin } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
  if (!admin) throw new Error('Acesso restrito.');
  const { data: settings } = await context.supabase.from('billing_settings').select('verified_at').eq('id', true).maybeSingle();
  if (data.enabled && (!settings?.verified_at || !process.env['MERCADOPAGO_WEBHOOK_SECRET'])) throw new Error('Configure as notificações e valide uma assinatura de teste antes de ativar.');
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { error } = await supabaseAdmin.from('billing_settings').upsert({ id: true, enabled: data.enabled, updated_at: new Date().toISOString() });
  if (error) throw new Error('Não foi possível salvar.');
  return { ok: true };
});
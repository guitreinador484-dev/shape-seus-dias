import { isPaidInstallment } from './subscription-policy';

export async function syncSubscriptionEvent(type: string, id: string, token: string, origin: string) {
  const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
  const path = type === 'subscription_preapproval' ? `/preapproval/${encodeURIComponent(id)}` : `/authorized_payments/${encodeURIComponent(id)}`;
  const response = await fetch(`https://api.mercadopago.com${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error('Não foi possível consultar a assinatura.');
  const resource = await response.json() as { id: string; preapproval_id?: string; external_reference?: string; status?: string; payment?: { id?: number | string } };
  const providerId = type === 'subscription_preapproval' ? String(resource.id) : resource.preapproval_id;
  if (!providerId) return;
  const { data: subscription, error } = await db.from('subscriptions').select('*').eq('provider_id', providerId).maybeSingle();
  if (error) throw error;
  if (!subscription) return;
  if (type === 'subscription_preapproval') {
    if (resource.external_reference !== subscription.reference) throw new Error('Referência divergente.');
    const status = resource.status ?? 'pending';
    if (!['pending', 'authorized', 'paused', 'cancelled', 'canceled'].includes(status)) return;
    const { error: updateError } = await db.from('subscriptions').update({ status, ...(status === 'cancelled' || status === 'canceled' ? { canceled_at: new Date().toISOString() } : {}), updated_at: new Date().toISOString() }).eq('id', subscription.id);
    if (updateError) throw updateError;
    return;
  }
  if (!resource.payment?.id) return;
  const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(String(resource.payment.id))}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!paymentResponse.ok) throw new Error('Não foi possível consultar a parcela.');
  const payment = await paymentResponse.json() as { id: number | string; status: string; transaction_amount: number; currency_id: string; date_approved?: string; external_reference?: string };
  if (!isPaidInstallment(payment, Number(subscription.amount))) return;
  if (payment.external_reference && payment.external_reference !== subscription.reference) throw new Error('Pagamento divergente.');
  if (!payment.date_approved || !Number.isFinite(Date.parse(payment.date_approved))) return;
  const { data: existingPayment } = await db.from('subscription_payments').select('id').eq('provider_payment_id', String(payment.id)).maybeSingle();
  if (existingPayment) return;
  let userId = subscription.user_id;
  if (!userId) {
    const { data: profile } = await db.from('profiles').select('id,has_class_access,access_expires_at').eq('email', subscription.customer_email).maybeSingle();
    if (profile) {
      const { error: baselineError } = await db.from('subscription_access_baselines').upsert({ user_id: profile.id, had_access: profile.has_class_access, expires_at: profile.access_expires_at }, { onConflict: 'user_id', ignoreDuplicates: true });
      if (baselineError) throw baselineError;
    }
    if (subscription.purchase_id) {
      const { error: approveError } = await db.from('purchases').update({ status: 'approved' }).eq('id', subscription.purchase_id).eq('billing_type', 'subscription');
      if (approveError) throw approveError;
    }
    const { provisionAccess } = await import('./access.server');
    const provision = await provisionAccess({ email: subscription.customer_email, name: subscription.customer_name, reference: subscription.reference, origin, subscription: true });
    if (!provision.ok) throw new Error('Não foi possível liberar a conta.');
    const { data: linked } = await db.from('purchases').select('user_id').eq('id', subscription.purchase_id ?? '').maybeSingle();
    userId = linked?.user_id ?? null;
    if (!userId) throw new Error('Conta ainda não vinculada.');
    if (!profile) {
      const { error: baselineError } = await db.from('subscription_access_baselines').upsert({ user_id: userId, had_access: false, expires_at: null }, { onConflict: 'user_id', ignoreDuplicates: true });
      if (baselineError) throw baselineError;
    }
    const { error: linkError } = await db.from('subscriptions').update({ user_id: userId, account_created: provision.created }).eq('id', subscription.id);
    if (linkError) throw linkError;
  }
  const { error: applyError } = await db.rpc('apply_subscription_payment', { _subscription_id: subscription.id, _payment_id: String(payment.id), _amount: Number(payment.transaction_amount), _paid_at: payment.date_approved });
  if (applyError) throw applyError;
  // Receber uma parcela não comprova um teste controlado. A ativação exige
  // validação independente da configuração e do fluxo de teste do provedor.
  const { generateAiPlanForPurchase } = await import('./ai-plan.server');
  await generateAiPlanForPurchase(subscription.reference);
}
export function monthlyOffer(
  plans: { id: string; name: string; price: string }[],
  bumps: { id: string; title: string; price: number; enabled: boolean; unlockNutrition: boolean; unlockVideos: boolean }[],
  planId: string,
  bumpIds: string[],
) {
  const plan = plans.find((p) => p.id === planId);
  if (!plan) throw new Error('Plano não disponível. Atualize a página.');
  const ids = [...new Set(bumpIds)];
  const selected = ids.map((id) => {
    const bump = bumps.find((b) => b.id === id && b.enabled);
    if (!bump) throw new Error('Oferta extra não disponível. Atualize a página.');
    return bump;
  });
  const base = Number(plan.price.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'));
  const amount = Math.round((base + selected.reduce((sum, b) => sum + b.price, 0)) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Valor mensal inválido.');
  return { amount, name: [plan.name, ...selected.map((b) => b.title)].join(' + '), ids, unlockNutrition: selected.some((b) => b.unlockNutrition), unlockVideos: selected.some((b) => b.unlockVideos) };
}

export const monthlyRecurrence = (amount: number) => ({ frequency: 1, frequency_type: 'months', transaction_amount: amount, currency_id: 'BRL' });
export const isPaidInstallment = (payment: { status?: string; transaction_amount?: number; currency_id?: string }, amount: number) => payment.status === 'approved' && payment.currency_id === 'BRL' && payment.transaction_amount === amount;
export const canUsePaidPeriod = (end: string | null, now: number) => end !== null && Date.parse(end) > now;
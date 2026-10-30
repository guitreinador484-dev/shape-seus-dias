import { describe, expect, it } from 'vitest';
import { monthlyOffer, monthlyRecurrence, isPaidInstallment, canUsePaidPeriod } from './subscription-policy';
describe('assinaturas mensais', () => {
  it('cobra os três planos a cada um mês', () => {
    for (const amount of [19.99, 29.99, 49.99]) expect(monthlyRecurrence(amount)).toEqual({ frequency: 1, frequency_type: 'months', transaction_amount: amount, currency_id: 'BRL' });
  });
  it('inclui alimentação e aulas no total mensal sem repetir adicionais', () => {
    const offer = monthlyOffer([{ id: 'basico', name: 'Básico', price: 'R$ 19,99' }], [{ id: 'alimentacao', title: 'Alimentação', price: 29.9, enabled: true, unlockNutrition: true, unlockVideos: false }, { id: 'aulas', title: 'Aulas', price: 10, enabled: true, unlockNutrition: false, unlockVideos: true }], 'basico', ['alimentacao', 'aulas', 'aulas']);
    expect(offer.amount).toBe(59.89);
    expect(offer.unlockNutrition && offer.unlockVideos).toBe(true);
  });
  it('não libera acesso por assinatura autorizada ou validação de cartão', () => {
    expect(isPaidInstallment({ status: 'authorized', transaction_amount: 29.99, currency_id: 'BRL' }, 29.99)).toBe(false);
    expect(isPaidInstallment({ status: 'approved', transaction_amount: 1, currency_id: 'BRL' }, 29.99)).toBe(false);
    expect(isPaidInstallment({ status: 'approved', transaction_amount: 29.99, currency_id: 'BRL' }, 29.99)).toBe(true);
  });
  it('mantém o período pago após cancelar, sem acesso após vencimento', () => {
    expect(canUsePaidPeriod('2026-11-30T00:00:00Z', Date.parse('2026-11-29T00:00:00Z'))).toBe(true);
    expect(canUsePaidPeriod('2026-11-30T00:00:00Z', Date.parse('2026-11-30T00:00:00Z'))).toBe(false);
  });
});
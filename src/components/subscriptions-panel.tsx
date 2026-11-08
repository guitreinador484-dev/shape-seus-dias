import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { AlertCircle, RefreshCw, CreditCard, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/admin/ui-kit';
import { listSubscriptionsFn, cancelSubscriptionFn, subscriptionSetupFn, activateSubscriptionsFn } from '@/lib/subscriptions.functions';

export function SubscriptionsPanel({ admin = false }: { admin?: boolean }) {
  const list = useServerFn(listSubscriptionsFn);
  const cancel = useServerFn(cancelSubscriptionFn);
  const setup = useServerFn(subscriptionSetupFn);
  const activate = useServerFn(activateSubscriptionsFn);
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listSubscriptionsFn>>>([]);
  const [settings, setSettings] = useState<{ enabled: boolean; verified: boolean; secretReady: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function load() {
    setLoading(true); setError('');
    try { setRows(await list()); if (admin) setSettings(await setup()); }
    catch { setError('Não foi possível carregar as assinaturas.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  const labels: Record<string, string> = { pending: 'Aguardando autorização', authorized: 'Autorizada', paused: 'Pausada', canceled: 'Cancelada', cancelled: 'Cancelada', creation_failed: 'Contratação não concluída' };
  return <section className="min-w-0 py-6 space-y-4">
    <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" />{admin ? 'Assinaturas mensais' : 'Minha assinatura'}</h2><Button variant="ghost" size="icon" aria-label="Atualizar assinaturas" title="Atualizar assinaturas" onClick={() => void load()}><RefreshCw className="h-4 w-4" /></Button></div>
    {admin && settings && <div className="border-l-2 border-primary pl-4 space-y-2 text-sm">
      <p className="font-medium">{settings.enabled ? 'Novas assinaturas ativadas' : 'Novas assinaturas ainda não ativadas'}</p>
      <p className="text-muted-foreground">Notificações seguras: {settings.secretReady ? 'chave configurada' : 'configuração pendente'}. Primeira parcela de teste: {settings.verified ? 'confirmada' : 'pendente'}.</p>
      <p className="text-muted-foreground break-all">Endereço das notificações: https://guitreinador.online/api/public/mercadopago/subscriptions</p>
      <Button variant="outline" disabled={busy || (!settings.enabled && (!settings.verified || !settings.secretReady))} onClick={async () => { setBusy(true); try { await activate({ data: { enabled: !settings.enabled } }); await load(); toast.success('Configuração atualizada'); } catch (e) { toast.error(e instanceof Error ? e.message : 'Não foi possível salvar.'); } finally { setBusy(false); } }}>{settings.enabled ? 'Desativar novas assinaturas' : 'Ativar novas assinaturas'}</Button>
    </div>}
    {loading ? <div className="flex gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando assinaturas...</div> : error ? <p role="alert" className="flex items-center gap-2 text-destructive"><AlertCircle className="h-4 w-4" />{error}</p> : rows.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma assinatura mensal registrada. Compras avulsas e acessos já liberados continuam válidos.</p> : <div className="divide-y divide-border">{rows.map((row) => <article key={row.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0"><h3 className="font-medium break-words">{row.plan_name}</h3>{admin && <p className="text-sm text-muted-foreground">{row.customer_name || 'Cliente'}</p>}<p className="text-sm">{Number(row.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês · {labels[row.status] ?? row.status}</p><p className="text-xs text-muted-foreground">{row.current_period_end ? `Período pago até ${new Date(row.current_period_end).toLocaleDateString('pt-BR')}` : 'Aguardando primeira cobrança aprovada'}</p></div>
      {!['canceled', 'cancelled', 'creation_failed'].includes(row.status) && <Button variant="outline" onClick={() => setSelected(row.id)}>Cancelar assinatura</Button>}
    </article>)}</div>}
    <ConfirmDialog open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }} title="Cancelar a assinatura?" description="As próximas cobranças serão interrompidas. O período já pago continua disponível até o vencimento." confirmLabel="Confirmar cancelamento" destructive onConfirm={async () => { if (!selected) return; try { await cancel({ data: { id: selected } }); setSelected(null); toast.success('Assinatura cancelada'); await load(); } catch (e) { toast.error(e instanceof Error ? e.message : 'Não foi possível cancelar.'); } }} />
  </section>;
}
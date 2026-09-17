import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/admin/ui-kit";
import {
  DEFAULT_ORDER_BUMP,
  formatBRL,
  loadOrderBumps,
  newOrderBump,
  saveOrderBumps,
  type OrderBumpConfig,
} from "@/lib/order-bump";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

/** Editor de ofertas extras (order bumps) do checkout — permite criar quantas quiser. */
export function OrderBumpEditor() {
  const [items, setItems] = useState<OrderBumpConfig[]>([DEFAULT_ORDER_BUMP]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadOrderBumps()
      .then((list) => setItems(list))
      .catch((error: Error) => toast.error("Erro ao carregar ofertas", { description: error.message }))
      .finally(() => setLoading(false));
  }, []);

  function update(index: number, patch: Partial<OrderBumpConfig>) {
    setItems((list) => list.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  async function save() {
    setSaving(true);
    try {
      await saveOrderBumps(items);
      toast.success("Ofertas salvas");
    } catch (error) {
      toast.error("Erro ao salvar", {
        description: error instanceof Error ? error.message : "Tente novamente.",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <Loader2 className="mx-auto h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Ofertas extras que aparecem no checkout do funil. Quem marcar qualquer uma delas ganha acesso à
        Dieta e às Aulas em vídeo.
      </p>

      {items.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          Nenhuma oferta criada. Adicione a primeira abaixo.
        </p>
      )}

      <div className="space-y-4">
        {items.map((item, i) => (
          <div key={item.id} className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                Oferta {i + 1}
              </span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Mostrar</Label>
                  <Switch
                    checked={item.enabled}
                    onCheckedChange={(v) => update(i, { enabled: v })}
                  />
                </div>
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="icon" aria-label="Excluir oferta">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  }
                  title="Excluir esta oferta do checkout?"
                  description="A oferta deixa de aparecer para quem comprar. Quem já comprou continua com o acesso."
                  confirmLabel="Sim, excluir oferta"
                  destructive
                  onConfirm={() => setItems((list) => list.filter((_, idx) => idx !== i))}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Título</Label>
                <Input value={item.title} onChange={(e) => update(i, { title: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Preço adicional (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.price}
                  onChange={(e) => update(i, { price: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição</Label>
              <Textarea
                rows={2}
                value={item.description}
                onChange={(e) => update(i, { description: e.target.value })}
              />
            </div>
            <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 text-sm">
              <p className="font-semibold">
                Sim! Quero adicionar: {item.title} — +{formatBRL(item.price)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => setItems((list) => [...list, newOrderBump()])}>
          <Plus className="h-4 w-4" /> Adicionar oferta
        </Button>
        <Button size="sm" onClick={() => void save()} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
          ofertas
        </Button>
      </div>
    </div>
  );
}

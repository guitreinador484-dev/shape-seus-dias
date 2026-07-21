import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Save, ExternalLink, Loader2, Users, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EXERCISE_GROUPS } from "@/lib/exercise-library";
import {
  DEFAULT_FUNNEL,
  type FunnelConfig,
  type FunnelPlan,
  loadFunnelLocal,
  saveFunnelLocal,
  loadFunnelLeads,
  type FunnelLead,
} from "@/lib/funnel-store";
import { publishFunnelFn, fetchPublicFunnel } from "@/lib/funnel.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/funil-vendas")({
  component: AdminFunnelPage,
});

function AdminFunnelPage() {
  const [cfg, setCfg] = useState<FunnelConfig>(DEFAULT_FUNNEL);
  const [saving, setSaving] = useState(false);
  const [leads, setLeads] = useState<FunnelLead[]>([]);
  const publish = useServerFn(publishFunnelFn);

  useEffect(() => {
    (async () => {
      const remote = await fetchPublicFunnel();
      setCfg(remote ?? loadFunnelLocal());
      setLeads(loadFunnelLeads());
    })();
  }, []);

  const update = <K extends keyof FunnelConfig>(key: K, value: FunnelConfig[K]) =>
    setCfg((c) => ({ ...c, [key]: value }));

  const updatePlan = (idx: number, patch: Partial<FunnelPlan>) =>
    setCfg((c) => ({
      ...c,
      plans: c.plans.map((p, i) => (i === idx ? { ...p, ...patch } : p)),
    }));

  const addPlan = () =>
    setCfg((c) => ({
      ...c,
      plans: [
        ...c.plans,
        { id: crypto.randomUUID(), name: "Novo plano", price: "R$ 0,00", features: [] },
      ],
    }));

  const removePlan = (idx: number) =>
    setCfg((c) => ({ ...c, plans: c.plans.filter((_, i) => i !== idx) }));

  const handleSave = async () => {
    setSaving(true);
    saveFunnelLocal(cfg);
    try {
      await publish({ data: { config: cfg } });
      toast.success("Funil publicado com sucesso!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao publicar");
    } finally {
      setSaving(false);
    }
  };

  const toggleGroup = (key: string) => {
    setCfg((c) => ({
      ...c,
      groupKeys: c.groupKeys.includes(key)
        ? c.groupKeys.filter((k) => k !== key)
        : [...c.groupKeys, key],
    }));
  };

  return (
    <div className="funnel-admin-scope p-4 md:p-6 space-y-6 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Funil de Vendas</h1>
          <p className="text-sm text-muted-foreground">
            Configure o funil no estilo Nutri Inteligente para vender treinos.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href="/funil" target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" /> Abrir funil
            </a>
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar e publicar
          </Button>
        </div>
      </div>

      {/* Identidade */}
      <Section title="Identidade">
        <Row>
          <Field label="Nome da marca">
            <Input value={cfg.brand} onChange={(e) => update("brand", e.target.value)} />
          </Field>
          <Field label="Emoji da marca">
            <Input
              value={cfg.brandEmoji}
              onChange={(e) => update("brandEmoji", e.target.value)}
              maxLength={4}
            />
          </Field>
        </Row>
        <Row>
          <Field label="Título principal">
            <Input value={cfg.headline} onChange={(e) => update("headline", e.target.value)} />
          </Field>
          <Field label="Subtítulo">
            <Input
              value={cfg.subheadline}
              onChange={(e) => update("subheadline", e.target.value)}
            />
          </Field>
        </Row>
        <Row>
          <Field label="Prova social">
            <Input
              value={cfg.socialProof}
              onChange={(e) => update("socialProof", e.target.value)}
            />
          </Field>
          <Field label="Preço em destaque">
            <Input value={cfg.basePrice} onChange={(e) => update("basePrice", e.target.value)} />
          </Field>
        </Row>
        <Field label="Texto do botão CTA">
          <Input value={cfg.ctaLabel} onChange={(e) => update("ctaLabel", e.target.value)} />
        </Field>
      </Section>

      {/* Opções do formulário */}
      <Section title="Opções do formulário">
        <Field label="Objetivos (uma opção por linha)">
          <Textarea
            rows={4}
            value={cfg.objetivos.join("\n")}
            onChange={(e) => update("objetivos", e.target.value.split("\n").filter(Boolean))}
          />
        </Field>
        <Field label="Níveis (uma opção por linha)">
          <Textarea
            rows={3}
            value={cfg.niveis.join("\n")}
            onChange={(e) => update("niveis", e.target.value.split("\n").filter(Boolean))}
          />
        </Field>
        <Field label="Dias disponíveis (uma opção por linha)">
          <Textarea
            rows={5}
            value={cfg.dias.join("\n")}
            onChange={(e) => update("dias", e.target.value.split("\n").filter(Boolean))}
          />
        </Field>
      </Section>

      {/* Grupos musculares */}
      <Section title="Grupos musculares exibidos">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {EXERCISE_GROUPS.map((g) => {
            const on = cfg.groupKeys.includes(g.key);
            return (
              <button
                key={g.key}
                onClick={() => toggleGroup(g.key)}
                className={`rounded-xl border px-3 py-2 text-sm text-left transition ${
                  on ? "border-primary bg-primary/10" : "border-border bg-background"
                }`}
              >
                <span className="mr-1">{g.emoji}</span>
                {g.name}
              </button>
            );
          })}
        </div>
      </Section>

      {/* Rotina */}
      <Section title="Perguntas de rotina">
        {cfg.routine.map((r, i) => (
          <div
            key={i}
            className="rounded-xl border border-border p-3 space-y-2 bg-background"
          >
            <Field label="Pergunta">
              <Input
                value={r.label}
                onChange={(e) =>
                  setCfg((c) => ({
                    ...c,
                    routine: c.routine.map((x, j) =>
                      j === i ? { ...x, label: e.target.value } : x
                    ),
                  }))
                }
              />
            </Field>
            <Field label="Opções (uma por linha)">
              <Textarea
                rows={3}
                value={r.options.join("\n")}
                onChange={(e) =>
                  setCfg((c) => ({
                    ...c,
                    routine: c.routine.map((x, j) =>
                      j === i
                        ? { ...x, options: e.target.value.split("\n").filter(Boolean) }
                        : x
                    ),
                  }))
                }
              />
            </Field>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setCfg((c) => ({ ...c, routine: c.routine.filter((_, j) => j !== i) }))
              }
            >
              <Trash2 className="h-4 w-4 mr-1" /> Remover
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setCfg((c) => ({
              ...c,
              routine: [...c.routine, { label: "Nova pergunta?", options: ["Opção 1", "Opção 2"] }],
            }))
          }
        >
          + Adicionar pergunta
        </Button>
      </Section>

      {/* Planos */}
      <Section title="Planos">
        <div className="grid gap-4 md:grid-cols-2">
          {cfg.plans.map((p, i) => (
            <div key={p.id} className="rounded-xl border border-border p-4 space-y-2 bg-background">
              <div className="flex items-center justify-between">
                <b>Plano {i + 1}</b>
                <Button variant="ghost" size="sm" onClick={() => removePlan(i)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Field label="Nome">
                <Input value={p.name} onChange={(e) => updatePlan(i, { name: e.target.value })} />
              </Field>
              <Field label="Preço">
                <Input value={p.price} onChange={(e) => updatePlan(i, { price: e.target.value })} />
              </Field>
              <Field label="Selo (opcional)">
                <Input
                  value={p.badge ?? ""}
                  onChange={(e) => updatePlan(i, { badge: e.target.value })}
                  placeholder="Mais vendido"
                />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!p.highlighted}
                  onChange={(e) => updatePlan(i, { highlighted: e.target.checked })}
                />
                Destaque este plano
              </label>
              <Field label="Benefícios (um por linha)">
                <Textarea
                  rows={5}
                  value={p.features.join("\n")}
                  onChange={(e) =>
                    updatePlan(i, { features: e.target.value.split("\n").filter(Boolean) })
                  }
                />
              </Field>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={addPlan}>
          + Adicionar plano
        </Button>
      </Section>

      {/* Leads */}
      <Section title={`Leads capturados (${leads.length})`}>
        {leads.length === 0 ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Users className="h-4 w-4" /> Nenhum lead ainda. Compartilhe seu funil para começar a captar.
          </p>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-2">Data</th>
                  <th className="p-2">Nome</th>
                  <th className="p-2">Email</th>
                  <th className="p-2">WhatsApp</th>
                  <th className="p-2">Plano</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id} className="border-t border-border">
                    <td className="p-2 text-xs">{new Date(l.createdAt).toLocaleString("pt-BR")}</td>
                    <td className="p-2">{l.contact.name}</td>
                    <td className="p-2">{l.contact.email}</td>
                    <td className="p-2">{l.contact.whatsapp}</td>
                    <td className="p-2">{l.planId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
      <h2 className="text-base font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 md:grid-cols-2">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
    </div>
  );
}

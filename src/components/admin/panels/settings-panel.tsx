import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/ui-kit";
import { Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Field, defaultAdminSettings, readAdminSettings, type AdminSettings } from "./shared";

export function AdminSettingsPanel() {
  const [rowId, setRowId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AdminSettings>(defaultAdminSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("quiz_config").select("*").eq("section", "configuracoes").order("updated_at", { ascending: false }).limit(1);
    if (error) throw error;
    setRowId(data?.[0]?.id ?? null);
    setSettings(readAdminSettings(data?.[0]?.content ?? null));
    setLoading(false);
  }

  useEffect(() => {
    load().catch((error) => {
      setLoading(false);
      toast.error("Erro ao carregar configurações", { description: error.message });
    });
  }, []);

  async function save() {
    setSaving(true);
    const content = settings as unknown as Json;
    const result = rowId
      ? await supabase.from("quiz_config").update({ content }).eq("id", rowId)
      : await supabase.from("quiz_config").insert({ section: "configuracoes", content });
    setSaving(false);
    if (result.error) {
      toast.error("Erro ao salvar configurações", { description: result.error.message });
      return;
    }
    toast.success("Configurações salvas");
    await load();
  }

  return (
    <div className="max-w-3xl mx-auto">
      <AdminPageHeader title="Configurações" description="Defina dados de marca, contato e links usados na operação da plataforma." />
      {loading ? <Skeleton className="h-80" /> : (
        <Card><CardContent className="grid gap-4 pt-6 sm:grid-cols-2"><Field label="Nome do personal"><Input value={settings.personal_name} onChange={(event) => setSettings({ ...settings, personal_name: event.target.value })} /></Field><Field label="Nome da plataforma"><Input value={settings.brand_title} onChange={(event) => setSettings({ ...settings, brand_title: event.target.value })} /></Field><Field label="WhatsApp de suporte"><Input value={settings.support_whatsapp} onChange={(event) => setSettings({ ...settings, support_whatsapp: event.target.value })} /></Field><Field label="Link de checkout"><Input value={settings.checkout_url} onChange={(event) => setSettings({ ...settings, checkout_url: event.target.value })} /></Field><Field label="Mensagem de boas-vindas" className="sm:col-span-2"><Textarea value={settings.welcome_message} onChange={(event) => setSettings({ ...settings, welcome_message: event.target.value })} /></Field><Button onClick={save} disabled={saving} className="w-full sm:col-span-2 sm:w-auto sm:justify-self-end">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar configurações</Button></CardContent></Card>
      )}
    </div>
  );
}

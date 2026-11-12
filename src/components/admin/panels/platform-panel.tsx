import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/ui-kit";
import {
  CheckCircle2,
  Loader2,
  Save,
  ExternalLink,
  Trash2,
  Upload,
  ArrowUp,
  ArrowDown,
  Megaphone,
  SlidersHorizontal,
  Palette,
  Film,
  Layers,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Field, defaultAdminSettings, readAdminSettings, type AdminSettings, type Workout } from "./shared";

export function AdminPlatformPanel() {
  const [rowId, setRowId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AdminSettings>(defaultAdminSettings);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [cfg, wks] = await Promise.all([
      supabase.from("quiz_config").select("*").eq("section", "configuracoes").order("updated_at", { ascending: false }).limit(1),
      supabase.from("workouts").select("*").order("display_order", { ascending: true }),
    ]);
    setRowId(cfg.data?.[0]?.id ?? null);
    const loadedSettings = readAdminSettings(cfg.data?.[0]?.content ?? null);
    setSettings(loadedSettings);
    setWorkouts(wks.data ?? []);
    setLoading(false);

    if (loadedSettings.platform_hero_image_path) {
      const { data } = await supabase.storage.from("workout-thumbnails").createSignedUrl(loadedSettings.platform_hero_image_path, 3600);
      setBannerPreviewUrl(data?.signedUrl ?? null);
    } else {
      setBannerPreviewUrl(null);
    }
  }

  useEffect(() => {
    load().catch((error) => { setLoading(false); toast.error("Erro ao carregar", { description: error.message }); });
  }, []);

  async function save() {
    setSaving(true);
    const content = settings as unknown as Json;
    const result = rowId
      ? await supabase.from("quiz_config").update({ content }).eq("id", rowId)
      : await supabase.from("quiz_config").insert({ section: "configuracoes", content });
    setSaving(false);
    if (result.error) { toast.error("Erro ao salvar", { description: result.error.message }); return; }
    toast.success("Plataforma atualizada com sucesso!");
    await load();
  }

  async function uploadBanner(file: File) {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const key = `hero-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("workout-thumbnails").upload(key, file, { contentType: file.type });
      if (error) throw error;
      setSettings((s) => ({ ...s, platform_hero_image_path: key }));
      const { data } = await supabase.storage.from("workout-thumbnails").createSignedUrl(key, 3600);
      setBannerPreviewUrl(data?.signedUrl ?? null);
      toast.success("Banner enviado com sucesso");
    } catch (error) {
      toast.error("Erro ao enviar banner", { description: error instanceof Error ? error.message : "Tente novamente." });
    } finally {
      setUploading(false);
    }
  }

  async function deleteBanner() {
    const key = settings.platform_hero_image_path;
    if (!key) return;
    try {
      const { error } = await supabase.storage.from("workout-thumbnails").remove([key]);
      if (error) throw error;
      setSettings((s) => ({ ...s, platform_hero_image_path: "" }));
      setBannerPreviewUrl(null);
      toast.success("Banner removido");
    } catch (error) {
      toast.error("Erro ao remover banner", { description: error instanceof Error ? error.message : "Tente novamente." });
    }
  }

  // Categories extraction & ordering helper
  const allCategories = Array.from(new Set(workouts.map((w) => w.category).filter(Boolean))) as string[];
  const configuredOrder = settings.platform_row_order
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const currentCategoryOrder = [
    ...configuredOrder.filter((c) => allCategories.includes(c)),
    ...allCategories.filter((c) => !configuredOrder.includes(c)),
  ];

  function moveCategory(index: number, direction: "up" | "down") {
    const newOrder = [...currentCategoryOrder];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;
    setSettings((s) => ({ ...s, platform_row_order: newOrder.join(", ") }));
  }

  const selectedWorkout = workouts.find((w) => w.id === settings.platform_hero_workout_id);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <AdminPageHeader
        title="Plataforma do aluno"
        description="Personalize banners, comunicados, temas e a ordem de exibição dos treinos."
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <a href="/plataforma?preview=1" target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" /> Ver como aluno
              </a>
            </Button>
            <Button onClick={save} disabled={saving || uploading}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar alterações
            </Button>
          </div>
        }
      />

      {loading ? <Skeleton className="h-96 rounded-lg" /> : (
        <Tabs defaultValue="banner" className="space-y-6">
          <TabsList className="grid grid-cols-2 sm:grid-cols-5 h-auto p-1.5 bg-secondary border border-border rounded-lg gap-1">
            <TabsTrigger value="banner" className="rounded-xl py-2.5 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground transition-all">
              <Film className="h-3.5 w-3.5 mr-1.5 shrink-0" /> Banner
            </TabsTrigger>
            <TabsTrigger value="categories" className="rounded-xl py-2.5 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground transition-all">
              <Layers className="h-3.5 w-3.5 mr-1.5 shrink-0" /> Prateleiras
            </TabsTrigger>
            <TabsTrigger value="appearance" className="rounded-xl py-2.5 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground transition-all">
              <Palette className="h-3.5 w-3.5 mr-1.5 shrink-0" /> Tema & Marca
            </TabsTrigger>
            <TabsTrigger value="announcement" className="rounded-xl py-2.5 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground transition-all">
              <Megaphone className="h-3.5 w-3.5 mr-1.5 shrink-0" /> Aviso
            </TabsTrigger>
            <TabsTrigger value="visibility" className="rounded-xl py-2.5 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground transition-all col-span-2 sm:col-span-1">
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5 shrink-0" /> Seções
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Banner & Destaque */}
          <TabsContent value="banner" className="space-y-6 mt-0">
            <Card className="glass-block rounded-lg overflow-hidden shadow-2xl">
              <CardHeader className="border-b border-border bg-muted/40">
                <CardTitle className="text-xl flex items-center gap-2 text-foreground">
                  <Film className="h-5 w-5 text-primary" /> Banner Principal de Destaque
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Configure o hero banner exibido no topo da página de aulas da área de membros.
                </p>
              </CardHeader>
              <CardContent className="grid gap-5">
                <Field label="Aula em destaque (Botão Assistir)">
                  <Select
                    value={settings.platform_hero_workout_id || "none"}
                    onValueChange={(v) => setSettings({ ...settings, platform_hero_workout_id: v === "none" ? "" : v })}
                  >
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione um treino/aula..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum treino específico (Usar padrão)</SelectItem>
                      {workouts.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.title} {w.category ? `(${w.category})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Título principal do banner">
                  <Input
                    className="rounded-xl"
                    value={settings.platform_hero_title}
                    onChange={(e) => setSettings({ ...settings, platform_hero_title: e.target.value })}
                    placeholder={selectedWorkout ? selectedWorkout.title : "Ex: Mentoria Exclusiva de Alta Performance"}
                  />
                </Field>

                <Field label="Subtítulo / Descrição da Hero">
                  <Textarea
                    className="rounded-xl"
                    rows={3}
                    value={settings.platform_hero_subtitle}
                    onChange={(e) => setSettings({ ...settings, platform_hero_subtitle: e.target.value })}
                    placeholder={selectedWorkout ? (selectedWorkout.description || "Descrição do treino...") : "Acompanhe seus treinos e evolução com o método exclusivo."}
                  />
                </Field>

                <Field label="Imagem do Banner (Background)">
                  <div className="space-y-3">
                    {bannerPreviewUrl ? (
                      <div className="relative rounded-lg overflow-hidden border border-border aspect-video max-h-56 w-full bg-black group">
                        <img src={bannerPreviewUrl} alt="Preview do banner" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-linear-to-t from-background/80 via-transparent to-transparent flex items-end p-4 justify-between">
                          <span className="text-xs text-muted-foreground font-mono truncate max-w-xs">{settings.platform_hero_image_path}</span>
                          <Button type="button" size="sm" variant="destructive" className="rounded-full text-xs" onClick={deleteBanner}>
                            <Trash2 className="h-3.5 w-3.5 mr-1" /> Remover imagem
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border/70 rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition text-center">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploading}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) void uploadBanner(f);
                            e.target.value = "";
                          }}
                        />
                        <div className="grid h-12 w-12 place-items-center rounded-lg bg-primary/10 text-primary mb-3">
                          {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
                        </div>
                        <p className="font-semibold text-sm">{uploading ? "Enviando imagem..." : "Clique para fazer upload da imagem do banner"}</p>
                        <p className="text-xs text-muted-foreground mt-1">Recomendado: 1920x1080px em JPG ou PNG</p>
                      </label>
                    )}
                  </div>
                </Field>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: Prateleiras & Ordem */}
          <TabsContent value="categories" className="space-y-6 mt-0">
            <Card className="rounded-lg border border-border bg-card shadow-2xl shadow-black/40">
              <CardHeader className="border-b border-border bg-muted/40">
                <CardTitle className="text-xl flex items-center gap-2 text-foreground">
                  <Layers className="h-5 w-5 text-primary" /> Organizador Visual de Prateleiras
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Altere a ordem em que as categorias de treinos/aulas aparecem na tela do aluno.
                </p>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                {currentCategoryOrder.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground border border-dashed border-border rounded-lg bg-muted/40">
                    Nenhuma categoria encontrada nos treinos cadastrados.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {currentCategoryOrder.map((cat, idx) => (
                      <div
                        key={cat}
                        className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-secondary hover:bg-surface-2 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <span className="grid h-7 w-7 place-items-center rounded-xl bg-primary/20 text-primary border border-primary/30 font-display text-sm font-bold">
                            #{idx + 1}
                          </span>
                          <span className="font-semibold text-sm text-foreground">{cat}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-xl hover:bg-surface-2"
                            disabled={idx === 0}
                            onClick={() => moveCategory(idx, "up")}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-xl hover:bg-surface-2"
                            disabled={idx === currentCategoryOrder.length - 1}
                            onClick={() => moveCategory(idx, "down")}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Field label="Edição manual (código de ordem)">
                  <Input
                    className="rounded-xl font-mono text-xs"
                    value={settings.platform_row_order}
                    onChange={(e) => setSettings({ ...settings, platform_row_order: e.target.value })}
                    placeholder="Ex: Superior, Inferior, Cardio"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Ordem atual salva: {settings.platform_row_order || "Padrão (todas as categorias)"}
                  </p>
                </Field>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: Tema & Marca */}
          <TabsContent value="appearance" className="space-y-6 mt-0">
            <Card className="rounded-lg border border-border bg-card shadow-2xl shadow-black/40">
              <CardHeader className="border-b border-border bg-muted/40">
                <CardTitle className="text-xl flex items-center gap-2 text-foreground">
                  <Palette className="h-5 w-5 text-primary" /> Aparência e Tema da Plataforma
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Escolha o estilo visual e mensagens padrão exibidas aos seus alunos.
                </p>
              </CardHeader>
              <CardContent className="grid gap-6 p-6">
                <div>
                  <Label className="text-sm font-semibold mb-3 block text-foreground">Tema padrão da área do aluno</Label>
                  <p className="-mt-2 mb-3 text-xs text-muted-foreground">Vale até o aluno escolher o dele no menu (ícone de sol/lua).</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
                    {(["dark", "light"] as const).map((t) => {
                      const active = settings.platform_theme === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setSettings({ ...settings, platform_theme: t })}
                          className={`relative rounded-lg border p-4 text-left transition-all ${
                            active
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/40 bg-secondary"
                          }`}
                        >
                          <div className={`h-24 rounded-xl mb-3 border p-3 flex flex-col justify-between ${
                            t === "dark" ? "bg-[#09090b] border-border" : "bg-[#ffffff] border-[#e4e4e7]"
                          }`}>
                            <div className="flex items-center justify-between">
                              <div className={`h-2 w-12 rounded ${t === "dark" ? "bg-zinc-700" : "bg-zinc-300"}`} />
                              <div className="h-2 w-4 rounded bg-primary" />
                            </div>
                            <div className={`h-8 rounded-lg ${t === "dark" ? "bg-zinc-900 border border-zinc-800" : "bg-zinc-100 border border-zinc-200"}`} />
                          </div>
                          <p className="font-semibold text-sm text-foreground">{t === "dark" ? "Escuro" : "Claro"}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {t === "dark" ? "Fundo preto, ideal para treinar à noite" : "Fundo claro, melhor sob luz forte"}
                          </p>
                          {active && <CheckCircle2 className="absolute top-3 right-3 h-5 w-5 text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Field label="Nome da Marca (Logotipo no topo)">
                  <Input
                    className="rounded-xl"
                    value={settings.brand_title}
                    onChange={(e) => setSettings({ ...settings, brand_title: e.target.value })}
                    placeholder="Ex: PERSONAL VIP"
                  />
                </Field>

                <Field label="Nome do Personal / Treinador">
                  <Input
                    className="rounded-xl"
                    value={settings.personal_name}
                    onChange={(e) => setSettings({ ...settings, personal_name: e.target.value })}
                    placeholder="Ex: Lucas Soares"
                  />
                </Field>

                <Field label="Mensagem de Boas-Vindas">
                  <Textarea
                    className="rounded-xl"
                    rows={2}
                    value={settings.welcome_message}
                    onChange={(e) => setSettings({ ...settings, welcome_message: e.target.value })}
                    placeholder="Mensagem exibida aos alunos ao logar..."
                  />
                </Field>

                <div className="grid gap-4 rounded-lg border border-border bg-secondary p-5">
                  <div><p className="font-semibold text-foreground">Primeiro acesso após a compra</p><p className="text-xs text-muted-foreground">Este vídeo aparece uma única vez depois do login e da confirmação real do pagamento.</p></div>
                  <Field label="URL do vídeo de agradecimento"><Input value={settings.welcome_video_url} onChange={(e) => setSettings({ ...settings, welcome_video_url: e.target.value })} placeholder="YouTube, Vimeo ou arquivo de vídeo" /></Field>
                  <Field label="Título da tela"><Input value={settings.welcome_video_title} maxLength={100} onChange={(e) => setSettings({ ...settings, welcome_video_title: e.target.value })} /></Field>
                  <Field label="Mensagem"><Textarea rows={2} value={settings.welcome_video_text} maxLength={300} onChange={(e) => setSettings({ ...settings, welcome_video_text: e.target.value })} /></Field>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: Comunicado / Aviso */}
          <TabsContent value="announcement" className="space-y-6 mt-0">
            <Card className="rounded-lg border border-border bg-card shadow-2xl shadow-black/40">
              <CardHeader className="border-b border-border bg-muted/40">
                <CardTitle className="text-xl flex items-center gap-2 text-foreground">
                  <Megaphone className="h-5 w-5 text-primary" /> Barra de Comunicados / Avisos
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Exiba um banner de aviso importante no topo da plataforma de todos os alunos.
                </p>
              </CardHeader>
              <CardContent className="grid gap-5 p-6">
                <div className="flex items-center justify-between p-4.5 rounded-lg border border-border bg-secondary">
                  <div>
                    <p className="font-semibold text-sm text-foreground">Ativar Barra de Comunicado</p>
                    <p className="text-xs text-muted-foreground">Exibe a mensagem no topo para todos os alunos</p>
                  </div>
                  <Switch
                    checked={settings.platform_announcement_enabled}
                    onCheckedChange={(checked) => setSettings({ ...settings, platform_announcement_enabled: checked })}
                  />
                </div>

                {settings.platform_announcement_enabled && (
                  <>
                    <Field label="Texto da Mensagem de Aviso">
                      <Input
                        className="rounded-xl"
                        value={settings.platform_announcement_text}
                        onChange={(e) => setSettings({ ...settings, platform_announcement_text: e.target.value })}
                        placeholder="Ex: 🔥 Novo módulo de treinos liberado nesta segunda-feira!"
                      />
                    </Field>

                    <Field label="Estilo / Cor do Aviso">
                      <Select
                        value={settings.platform_announcement_type}
                        onValueChange={(v: any) => setSettings({ ...settings, platform_announcement_type: v })}
                      >
                        <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="info">Vermelho informativo</SelectItem>
                          <SelectItem value="success">Prata sucesso / novidade</SelectItem>
                          <SelectItem value="warning">Cinza alerta / atenção</SelectItem>
                          <SelectItem value="purple">Vermelho destaque VIP</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>

                    {/* Preview Box */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Pré-visualização do Aviso:</Label>
                      <div className={`p-4 rounded-lg border text-xs font-semibold flex items-center gap-2 shadow-md ${
                        settings.platform_announcement_type === "success" ? "bg-success/10 border-success/30 text-success"
                        : settings.platform_announcement_type === "warning" ? "bg-warning/10 border-warning/30 text-warning"
                        : settings.platform_announcement_type === "purple" ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-primary/10 border-primary/30 text-primary-foreground"
                      }`}>
                        <Megaphone className="h-4 w-4 shrink-0 text-primary" />
                        <span>{settings.platform_announcement_text || "Sua mensagem de comunicado aparecerá aqui..."}</span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 5: Seções & Visibilidade */}
          <TabsContent value="visibility" className="space-y-6 mt-0">
            <Card className="rounded-lg border border-border bg-card shadow-2xl shadow-black/40">
              <CardHeader className="border-b border-border bg-muted/40">
                <CardTitle className="text-xl flex items-center gap-2 text-foreground">
                  <SlidersHorizontal className="h-5 w-5 text-primary" /> Recursos & Seções Visíveis
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Ligue ou desligue seções específicas da área de membros dos alunos.
                </p>
              </CardHeader>
              <CardContent className="grid gap-4 p-6">
                <div className="flex items-center justify-between p-4.5 rounded-lg border border-border bg-secondary">
                  <div>
                    <p className="font-semibold text-sm text-foreground">Barra de Pesquisa de Cursos</p>
                    <p className="text-xs text-muted-foreground">Permite ao aluno pesquisar cursos por título</p>
                  </div>
                  <Switch
                    checked={settings.platform_show_search}
                    onCheckedChange={(checked) => setSettings({ ...settings, platform_show_search: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-4.5 rounded-lg border border-border bg-secondary">
                  <div>
                    <p className="font-semibold text-sm text-foreground">Trilho "Continuar Assistindo"</p>
                    <p className="text-xs text-muted-foreground">Mostra a aula em andamento do aluno</p>
                  </div>
                  <Switch
                    checked={settings.platform_show_continue_watching}
                    onCheckedChange={(checked) => setSettings({ ...settings, platform_show_continue_watching: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-4.5 rounded-lg border border-border bg-secondary">
                  <div>
                    <p className="font-semibold text-sm text-foreground">Trilho "Próximos Módulos / Recomendados"</p>
                    <p className="text-xs text-muted-foreground">Sugere novos módulos baseados no histórico</p>
                  </div>
                  <Switch
                    checked={settings.platform_show_recommended}
                    onCheckedChange={(checked) => setSettings({ ...settings, platform_show_recommended: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Floating / Bottom Save Bar */}
      {!loading && (
        <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg shadow-2xl">
          <p className="text-xs text-muted-foreground">
            Lembre-se de clicar em salvar após fazer alterações nas configurações.
          </p>
          <Button onClick={save} disabled={saving || uploading} size="sm" className="rounded-full px-6 bg-primary">
            {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
            Salvar Plataforma
          </Button>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminPageHeader, ConfirmDialog } from "@/components/admin/ui-kit";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchStudents, formatCurrency, formatDate, purchaseStatusLabels, type Student } from "@/lib/admin-data";
import { useServerFn } from "@tanstack/react-start";
import { savePurchase } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SubscriptionsPanel } from '@/components/subscriptions-panel';
import { EmptyState, type Purchase } from "./shared";

export function AdminSalesPanel() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ user_id: "none", amount: "97", status: "paid", customer_name: "", customer_email: "", transaction_id: "" });

  async function load() {
    setLoading(true);
    const [purchaseRows, studentRows] = await Promise.all([
      supabase.from("purchases").select("*").order("created_at", { ascending: false }),
      fetchStudents(),
    ]);
    if (purchaseRows.error) throw purchaseRows.error;
    setPurchases(purchaseRows.data ?? []);
    setStudents(studentRows.filter((student) => student.role !== "admin"));
    setLoading(false);
  }

  useEffect(() => {
    load().catch((error) => {
      setLoading(false);
      toast.error("Erro ao carregar vendas", { description: error.message });
    });
  }, []);

  const savePurchaseFn = useServerFn(savePurchase);
  const [pendingStatus, setPendingStatus] = useState<{ id: string; status: string } | null>(null);

  async function createPurchase() {
    const student = students.find((item) => item.id === form.user_id);
    await savePurchaseFn({
      data: {
        user_id: form.user_id === "none" ? null : form.user_id,
        amount: Number(form.amount || 0),
        status: form.status,
        customer_name: form.customer_name || student?.full_name || null,
        customer_email: form.customer_email || student?.email || null,
        transaction_id: form.transaction_id || null,
      },
    });
    if (["approved", "paid"].includes(form.status) && form.user_id !== "none") {
      toast.success("Venda registrada — acesso liberado para o aluno");
    } else {
      toast.success("Venda registrada");
    }
    await load();
  }

  function requestStatusChange(id: string, status: string) {
    const purchase = purchases.find((item) => item.id === id);
    const revoga = purchase && ["approved", "paid"].includes(purchase.status) && !["approved", "paid"].includes(status);
    if (revoga) {
      setPendingStatus({ id, status });
      return;
    }
    void updateStatus(id, status);
  }

  async function updateStatus(id: string, status: string) {
    const purchase = purchases.find((item) => item.id === id);
    await savePurchaseFn({
      data: {
        id,
        user_id: purchase?.user_id ?? null,
        amount: Number(purchase?.amount ?? 0),
        status,
        customer_name: purchase?.customer_name ?? null,
        customer_email: purchase?.customer_email ?? null,
        transaction_id: purchase?.transaction_id ?? null,
      },
    });
    if (["approved", "paid"].includes(status)) {
      toast.success("Venda aprovada — acesso liberado para o aluno");
    } else if (purchase && ["approved", "paid"].includes(purchase.status)) {
      toast.success("Venda atualizada — acesso revogado");
    } else {
      toast.success("Venda atualizada");
    }
    await load();
  }

  return (
    <div className="max-w-7xl mx-auto">
      <AdminPageHeader title="Vendas" description="Registre vendas, acompanhe pagamentos e ajuste status de acesso." />
      <SubscriptionsPanel admin />
      <Card className="mb-6">
        <CardHeader><CardTitle>Registrar venda manual</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-6">
          <Select value={form.user_id} onValueChange={(value) => setForm({ ...form, user_id: value })}>
            <SelectTrigger className="md:col-span-2"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="none">Sem aluno vinculado</SelectItem>{students.map((student) => <SelectItem key={student.id} value={student.id}>{student.full_name || student.email}</SelectItem>)}</SelectContent>
          </Select>
          <Input value={form.customer_name} onChange={(event) => setForm({ ...form, customer_name: event.target.value })} placeholder="Nome" />
          <Input value={form.customer_email} onChange={(event) => setForm({ ...form, customer_email: event.target.value })} placeholder="Email" />
          <Input type="number" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="Valor" />
          <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(purchaseStatusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
          <Input className="md:col-span-5" value={form.transaction_id} onChange={(event) => setForm({ ...form, transaction_id: event.target.value })} placeholder="ID da transação" />
          <Button onClick={createPurchase}><Plus className="h-4 w-4" /> Registrar</Button>
        </CardContent>
      </Card>
      <ConfirmDialog
          open={pendingStatus !== null}
          onOpenChange={(open) => { if (!open) setPendingStatus(null); }}
          title="Alterar a situação desta venda?"
          description="Ao tirar a venda de aprovada, o aluno perde o acesso à plataforma automaticamente."
          confirmLabel="Sim, alterar situação"
          destructive
          onConfirm={async () => {
            if (!pendingStatus) return;
            const pending = pendingStatus;
            setPendingStatus(null);
            await updateStatus(pending.id, pending.status);
          }}
      />
      {loading ? <Skeleton className="h-80" /> : purchases.length === 0 ? <EmptyState title="Nenhuma venda registrada" description="Registre vendas manuais ou aguarde integrações de pagamento." /> : (
        <Card><CardContent className="pt-6"><Table className="min-w-[680px]"><TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>Valor</TableHead><TableHead>Status</TableHead><TableHead>Transação</TableHead><TableHead>Data</TableHead></TableRow></TableHeader><TableBody>{purchases.map((purchase) => <TableRow key={purchase.id}><TableCell>{purchase.customer_name || "—"}<p className="text-xs text-muted-foreground">{purchase.customer_email}</p></TableCell><TableCell>{formatCurrency(purchase.amount)}</TableCell><TableCell><Select value={purchase.status} onValueChange={(value) => requestStatusChange(purchase.id, value)}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(purchaseStatusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></TableCell><TableCell className="text-muted-foreground">{purchase.transaction_id || purchase.appmax_order_id || "—"}</TableCell><TableCell>{formatDate(purchase.created_at)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
      )}
    </div>
  );
}

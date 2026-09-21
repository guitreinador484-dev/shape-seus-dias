import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { updateStudentStatus } from "@/lib/admin.functions";
import { OrderBumpEditor } from "@/components/admin/order-bump-editor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { EmptyBox } from "@/components/admin/ui-kit";

type StudentRow = {
  id: string;
  email: string;
  full_name: string | null;
  has_order_bump: boolean;
};

export function AdminOrderBumpPanel() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const updateStudent = useServerFn(updateStudentStatus);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, email, full_name, has_order_bump")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) toast.error("Erro ao carregar alunos", { description: error.message });
        setStudents((data ?? []) as StudentRow[]);
        setLoading(false);
      });
  }, []);

  async function toggleStudent(student: StudentRow, value: boolean) {
    setStudents((list) => list.map((s) => (s.id === student.id ? { ...s, has_order_bump: value } : s)));
    try {
      await updateStudent({ data: { userId: student.id, has_order_bump: value } });
      toast.success(value ? "Adicional liberado" : "Adicional removido");
    } catch (error) {
      setStudents((list) => list.map((s) => (s.id === student.id ? { ...s, has_order_bump: !value } : s)));
      toast.error("Erro ao atualizar", { description: error instanceof Error ? error.message : "Tente novamente." });
    }
  }

  const filtered = students.filter((s) =>
    [s.email, s.full_name].some((v) => v?.toLowerCase().includes(query.toLowerCase())),
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Order bump</h1>
        <p className="text-sm text-muted-foreground">
          Ofertas extras no checkout que liberam as abas Dieta e Aulas em vídeo para os alunos online.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Ofertas no checkout</CardTitle></CardHeader>
         <CardContent className="overflow-x-auto">
          <OrderBumpEditor />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Quem já tem o adicional</CardTitle></CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-border px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              className="h-11 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              placeholder="Buscar por nome ou email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {loading ? (
            <div className="py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <EmptyBox title="Nenhum aluno encontrado" description="Tente buscar por outro nome ou e-mail." />
          ) : (<>
            <div className="grid gap-3 sm:hidden">
              {filtered.map((student) => (
                <div key={student.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border p-4">
                  <div className="min-w-0"><p className="truncate font-medium">{student.full_name || "Sem nome"}</p><p className="truncate text-xs text-muted-foreground">{student.email}</p></div>
                  <Switch checked={student.has_order_bump} onCheckedChange={(v) => void toggleStudent(student, v)} aria-label={`Alterar adicional de ${student.full_name || student.email}`} />
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto sm:block"><Table className="min-w-[420px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Dieta + Aulas em vídeo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <p className="font-medium">{student.full_name || "Sem nome"}</p>
                      <p className="text-xs text-muted-foreground">{student.email}</p>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={student.has_order_bump}
                        onCheckedChange={(v) => void toggleStudent(student, v)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table></div>
          </>)}
        </CardContent>
      </Card>
    </div>
  );
}

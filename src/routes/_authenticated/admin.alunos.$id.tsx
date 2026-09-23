import { createFileRoute, useParams } from "@tanstack/react-router";
import { StudentProfilePanel } from "@/components/admin/students-panel";

export const Route = createFileRoute("/_authenticated/admin/alunos/$id")({
  component: StudentProfileRoute,
  head: () => ({ meta: [{ title: "Perfil do aluno — Gui Treinador" }, { name: "description", content: "Consulte dados, acesso, treino e histórico do aluno." }, { property: "og:title", content: "Perfil do aluno — Gui Treinador" }, { property: "og:description", content: "Consulte dados, acesso, treino e histórico do aluno." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
});

function StudentProfileRoute() {
  const { id } = useParams({ from: "/_authenticated/admin/alunos/$id" });
  return <StudentProfilePanel studentId={id} />;
}

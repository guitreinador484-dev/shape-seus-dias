import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { AdminCourseEditor } from "@/components/admin/course-editor";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/cursos/$id")({
  component: AdminCoursePage,
  head: () => ({ meta: [{ title: "Editar curso — Gui Treinador" }, { name: "description", content: "Edite módulos, aulas e materiais do curso." }, { property: "og:title", content: "Editar curso — Gui Treinador" }, { property: "og:description", content: "Edite módulos, aulas e materiais do curso." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
});

function AdminCoursePage() {
  const { id } = useParams({ from: "/_authenticated/admin/cursos/$id" });
  return (
    <div className="space-y-4">
      <Button asChild size="sm" variant="ghost">
        <Link to="/admin/cursos"><ArrowLeft className="h-4 w-4 mr-2" /> Voltar aos cursos</Link>
      </Button>
      <AdminCourseEditor courseId={id} />
    </div>
  );
}
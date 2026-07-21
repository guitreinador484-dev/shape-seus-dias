import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { AdminCourseEditor } from "@/components/admin/course-editor";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/cursos/$id")({
  component: AdminCoursePage,
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
import { createFileRoute, useParams } from "@tanstack/react-router";
import { StudentProfilePanel } from "@/components/admin/students-panel";

export const Route = createFileRoute("/_authenticated/admin/alunos/$id")({
  component: StudentProfileRoute,
});

function StudentProfileRoute() {
  const { id } = useParams({ from: "/_authenticated/admin/alunos/$id" });
  return <StudentProfilePanel studentId={id} />;
}

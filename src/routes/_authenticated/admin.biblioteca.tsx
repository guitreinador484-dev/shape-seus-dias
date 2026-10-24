import { createFileRoute } from "@tanstack/react-router";
import { ExerciseLibraryPanel } from "@/components/admin/exercise-library-panel";

export const Route = createFileRoute("/_authenticated/admin/biblioteca")({
  validateSearch: (search: Record<string, unknown>): { view?: "uploads" } => ({ view: search['view'] === "uploads" ? "uploads" : undefined }),
  component: () => <ExerciseLibraryPanel />,
  head: () => ({ meta: [{ title: "Biblioteca de exercícios — Gui Treinador" }, { name: "description", content: "Gerencie exercícios, academias e vídeos demonstrativos." }, { property: "og:title", content: "Biblioteca de exercícios — Gui Treinador" }, { property: "og:description", content: "Gerencie exercícios, academias e vídeos demonstrativos." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
});

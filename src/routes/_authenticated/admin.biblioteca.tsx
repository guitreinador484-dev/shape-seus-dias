import { createFileRoute } from "@tanstack/react-router";
import { ExerciseLibraryPanel } from "@/components/admin/exercise-library-panel";

export const Route = createFileRoute("/_authenticated/admin/biblioteca")({
  component: () => <ExerciseLibraryPanel />,
});

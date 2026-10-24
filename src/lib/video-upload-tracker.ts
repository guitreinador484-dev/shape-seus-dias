import { useSyncExternalStore } from "react";

export type UploadTask = { id: string; fileName: string; exerciseName?: string; gymName?: string; progress: number; status: "aguardando" | "enviando" | "salvando" | "concluido" | "erro"; path?: string; error?: string };
const empty: UploadTask[] = [];
let tasks: UploadTask[] = empty;
const listeners = new Set<() => void>();
function emit() { listeners.forEach((listener) => listener()); }
export function addUploadTask(fileName: string, details?: { exerciseName?: string; gymName?: string }) {
  const id = crypto.randomUUID();
  tasks = [...tasks, { id, fileName, ...details, progress: 0, status: "aguardando" }];
  emit();
  return id;
}
export function updateUploadTask(id: string, patch: Partial<UploadTask>) {
  tasks = tasks.map((task) => task.id === id ? { ...task, ...patch } : task);
  emit();
}
export function finishUploadPath(path: string, error?: string) {
  tasks = tasks.map((task) => task.path === path ? { ...task, status: error ? "erro" : "concluido", progress: error ? task.progress : 100, error } : task);
  emit();
}
export function clearFinishedUploads() {
  tasks = tasks.filter((task) => task.status !== "concluido" && task.status !== "erro");
  emit();
}
export function uploadSummary(rows: UploadTask[]) {
  return {
    active: rows.filter((row) => ["aguardando", "enviando", "salvando"].includes(row.status)).length,
    done: rows.filter((row) => row.status === "concluido").length,
    errors: rows.filter((row) => row.status === "erro").length,
    progress: rows.length ? Math.round(rows.reduce((sum, row) => sum + (row.status === "concluido" ? 100 : Math.min(row.progress, 99)), 0) / rows.length) : 0,
  };
}
export function useVideoUploads() {
  return useSyncExternalStore((listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => tasks, () => empty);
}
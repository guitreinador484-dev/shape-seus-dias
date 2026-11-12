import { useSyncExternalStore } from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "gt-theme";
const listeners = new Set<() => void>();
/** Padrão definido pelo admin para a área do aluno; vale enquanto a pessoa não escolhe. */
let fallback: Theme | null = null;

function readStored(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

function current(): Theme {
  if (typeof window === "undefined") return "dark";
  return readStored() ?? fallback ?? "dark";
}

function apply() {
  const theme = current();
  document.documentElement.classList.toggle("light", theme === "light");
  document.documentElement.style.colorScheme = theme;
  listeners.forEach((listener) => listener());
}

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* sem armazenamento: vale só nesta visita */
    fallback = theme;
  }
  apply();
}

export function setThemeFallback(theme: Theme | null) {
  fallback = theme;
  apply();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => event.key === STORAGE_KEY && apply();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, current, () => "dark" as Theme);
  return { theme, setTheme, toggleTheme: () => setTheme(theme === "light" ? "dark" : "light") };
}

/** Roda antes da pintura para não piscar o tema escuro em quem escolheu o claro. */
export const themeBootScript = `try{if(localStorage.getItem("${STORAGE_KEY}")==="light"){document.documentElement.classList.add("light");document.documentElement.style.colorScheme="light"}}catch(e){}`;

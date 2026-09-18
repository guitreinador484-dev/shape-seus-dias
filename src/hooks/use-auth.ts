import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export type AppRole = "admin" | "online" | "presencial" | "aluno_mentoria";

export const ADMIN_EMAIL = "guitreinador484@gmail.com";

export function isAdminEmail(email?: string | null): boolean {
  return email?.trim().toLowerCase() === ADMIN_EMAIL;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  /** Todos os papéis do usuário (um aluno pode ser online e da mentoria ao mesmo tempo). */
  roles: AppRole[];
  isMentoria: boolean;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadRoles(uid: string): Promise<AppRole[]> {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid);
      if (error) {
        console.error("Erro ao carregar papel do usuário", error);
        return [];
      }
      return (data ?? []).map((r) => r.role as AppRole);
    }

    function pickMain(list: AppRole[]): AppRole | null {
      return (
        list.find((r) => r === "admin") ??
        list.find((r) => r === "online") ??
        list.find((r) => r === "presencial") ??
        null
      );
    }

    async function applySession(s: Session | null) {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        const list = await loadRoles(s.user.id);
        if (!mounted) return;
        if (isAdminEmail(s.user.email)) {
          setRoles(list.includes("admin") ? list : [...list, "admin"]);
          setRole("admin");
          if (mounted) setLoading(false);
          return;
        }
        setRoles(list);
        setRole(pickMain(list));
      } else {
        setRole(null);
        setRoles([]);
      }
      if (mounted) setLoading(false);
    }

    // 1) Restore session from storage first.
    supabase.auth.getSession().then(({ data }) => {
      void applySession(data.session);
    });

    // 2) React to subsequent auth changes (sign in/out, token refresh).
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (!mounted) return;
      if (event === "INITIAL_SESSION") return; // handled by getSession above
      setLoading(true);
      void applySession(s);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, session, role, loading };
}

export function roleHomePath(role: AppRole | null, email?: string | null): string {
  if (isAdminEmail(email)) return "/admin";
  if (role === "admin") return "/admin";
  return "/plataforma";
}
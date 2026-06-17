import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export type AppRole = "admin" | "online" | "presencial";

export const ADMIN_EMAIL = "guitreinador484@gmail.com";

export function isAdminEmail(email?: string | null): boolean {
  return email?.trim().toLowerCase() === ADMIN_EMAIL;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadRole(uid: string): Promise<AppRole | null> {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid);
      if (error) {
        console.error("Erro ao carregar papel do usuário", error);
        return null;
      }
      const roles = (data ?? []).map((r) => r.role as AppRole);
      return (
        roles.find((r) => r === "admin") ??
        roles.find((r) => r === "online") ??
        roles.find((r) => r === "presencial") ??
        null
      );
    }

    async function applySession(s: Session | null) {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        if (isAdminEmail(s.user.email)) {
          setRole("admin");
          if (mounted) setLoading(false);
          return;
        }
        const nextRole = await loadRole(s.user.id);
        if (!mounted) return;
        setRole(nextRole);
      } else {
        setRole(null);
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
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export type AppRole = "admin" | "online" | "presencial";

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

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setLoading(true);
        setTimeout(() => {
          loadRole(s.user.id).then((nextRole) => {
            if (!mounted) return;
            setRole(nextRole);
            setLoading(false);
          });
        }, 0);
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        const nextRole = await loadRole(data.session.user.id);
        if (!mounted) return;
        setRole(nextRole);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, session, role, loading };
}

export function roleHomePath(role: AppRole | null): string {
  if (role === "admin") return "/admin";
  return "/plataforma";
}
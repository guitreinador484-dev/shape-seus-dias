import { type ReactNode } from "react";
import { AuthContext, useAuthState } from "@/hooks/use-auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuthState();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

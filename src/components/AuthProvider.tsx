"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { auth } from "@/lib/endpoints";
import { clearToken, getToken, setToken, subscribeToken } from "@/lib/authToken";
import type { CurrentUser } from "@/types/api";

type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  status: AuthStatus;
  user: CurrentUser | null;
  /** Signs in; throws ApiError (401) on bad credentials so the form can show it. */
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Owns the authenticated session (H2). On mount it checks for a persisted token and validates it
 * with GET /api/auth/me — so a reload keeps the session and a stale token is discarded cleanly.
 * The token itself lives in lib/authToken (shared with the fetch layer); this context holds the
 * derived user/roles for the UI.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<CurrentUser | null>(null);
  const queryClient = useQueryClient();

  // Validate any persisted token once on load.
  useEffect(() => {
    let cancelled = false;

    if (!getToken()) {
      setStatus("anonymous");
      return;
    }

    auth
      .me()
      .then((me) => {
        if (cancelled) return;
        setUser(me);
        setStatus("authenticated");
      })
      .catch(() => {
        // Invalid/expired token — treat as signed out. (api.ts already cleared it on 401.)
        if (cancelled) return;
        clearToken();
        setUser(null);
        setStatus("anonymous");
      });

    return () => {
      cancelled = true;
    };
    // Validate once on mount only; `auth` is a stable module import.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If the token is cleared elsewhere (e.g. a 401 during normal use), drop the user here too.
  useEffect(
    () =>
      subscribeToken(() => {
        if (!getToken()) {
          setUser(null);
          setStatus("anonymous");
        }
      }),
    [],
  );

  const login = useCallback(
    async (username: string, password: string) => {
      const result = await auth.login({ username, password });
      setToken(result.token);
      setUser({ username: result.username, roles: result.roles });
      setStatus("authenticated");
    },
    [],
  );

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setStatus("anonymous");
    // Drop any cached data belonging to the signed-out user.
    queryClient.clear();
  }, [queryClient]);

  const hasRole = useCallback(
    (role: string) => user?.roles?.some((r) => r.toLowerCase() === role.toLowerCase()) ?? false,
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, login, logout, hasRole }),
    [status, user, login, logout, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Access the auth session. Throws if used outside <AuthProvider>. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>.");
  return ctx;
}

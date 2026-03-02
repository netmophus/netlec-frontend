"use client";

import { useEffect, useMemo, useState } from "react";

type Role = "admin" | "supervisor" | "agent" | "customer";

type Session =
  | { isAuthenticated: false }
  | { isAuthenticated: true; role: Role | null };

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function readSessionFromStorage(): Session {
  if (typeof window === "undefined") return { isAuthenticated: false };
  const token = localStorage.getItem("nigelec_access_token");
  if (!token) return { isAuthenticated: false };

  const payload = decodeJwtPayload(token);
  const role = (payload?.role as Role | undefined) ?? null;
  return { isAuthenticated: true, role };
}

export function AppHeader() {
  const [session, setSession] = useState<Session>({ isAuthenticated: false });

  useEffect(() => {
    setSession(readSessionFromStorage());
  }, []);

  const dashboardHref = useMemo(() => {
    if (!session.isAuthenticated) return "/login";
    if (session.role === "admin") return "/admin";
    if (session.role === "supervisor") return "/supervisor";
    if (session.role === "agent") return "/agent";
    if (session.role === "customer") return "/customer";
    return "/";
  }, [session]);

  return (
    <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
      <a href="/" className="flex items-center gap-2">
        <img src="/nigelec-logo.svg" alt="NIGELEC" className="h-9 w-auto" />
      </a>

      {session.isAuthenticated ? (
        <nav className="flex items-center gap-2">
          <a
            href={dashboardHref}
            className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-900/5 hover:text-zinc-900 dark:text-zinc-200 dark:hover:bg-white/10 dark:hover:text-white"
          >
            Dashboard
          </a>
          <button
            type="button"
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-50 transition hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            onClick={() => {
              localStorage.removeItem("nigelec_access_token");
              window.location.href = "/";
            }}
          >
            Logout
          </button>
        </nav>
      ) : (
        <nav className="flex items-center gap-2">
          <a
            href="/login"
            className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-900/5 hover:text-zinc-900 dark:text-zinc-200 dark:hover:bg-white/10 dark:hover:text-white"
          >
            Connexion
          </a>
          <a
            href="/register"
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Créer un compte
          </a>
        </nav>
      )}
    </header>
  );
}

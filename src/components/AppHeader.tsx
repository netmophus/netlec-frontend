"use client";

import { useEffect, useMemo, useState } from "react";

type Role = "admin" | "supervisor" | "agent" | "customer";

type Session =
  | { isAuthenticated: false }
  | { isAuthenticated: true; role: Role | null };

type PortalSettings = {
  logoUrl: string;
};

const roleLabels: Record<Role, string> = {
  admin: "Administration",
  supervisor: "Superviseur",
  agent: "Agent Releveur",
  customer: "Espace Client",
};

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
  const [logoUrl, setLogoUrl] = useState("/nigelec-logo.svg");

  useEffect(() => {
    setSession(readSessionFromStorage());

    try {
      const raw = localStorage.getItem("nigelec_portal_settings");
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<PortalSettings>;
      if (parsed.logoUrl?.trim()) {
        setLogoUrl(parsed.logoUrl.trim());
      }
    } catch {
      // keep default logo
    }
  }, []);

  const dashboardHref = useMemo(() => {
    if (!session.isAuthenticated) return "/login";
    if (session.role === "admin") return "/admin";
    if (session.role === "supervisor") return "/supervisor";
    if (session.role === "agent") return "/agent";
    if (session.role === "customer") return "/customer";
    return "/";
  }, [session]);

  const roleLabel = session.isAuthenticated && session.role ? roleLabels[session.role] : null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-900/8 bg-white/80 backdrop-blur-md dark:border-white/8 dark:bg-zinc-950/80">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <a href="/" className="flex items-center gap-3 min-w-0">
          <img src={logoUrl} alt="NIGELEC" className="h-8 w-auto shrink-0" />
          {roleLabel ? (
            <span className="hidden shrink-0 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-zinc-600 sm:inline-flex dark:border-white/10 dark:bg-white/5 dark:text-zinc-300">
              {roleLabel}
            </span>
          ) : null}
        </a>

        {session.isAuthenticated ? (
          <nav className="flex items-center gap-2">
            <a
              href={dashboardHref}
              className="rounded-xl px-3.5 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-900/6 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-white/8 dark:hover:text-white"
            >
              Dashboard
            </a>
            <button
              type="button"
              className="rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm font-semibold text-zinc-700 shadow-xs transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10"
              onClick={() => {
                localStorage.removeItem("nigelec_access_token");
                window.location.href = "/";
              }}
            >
              Déconnexion
            </button>
          </nav>
        ) : (
          <nav className="flex items-center gap-2">
            <a
              href="/login"
              className="rounded-xl px-3.5 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-900/6 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-white/8 dark:hover:text-white"
            >
              Connexion
            </a>
            <a
              href="/register"
              className="rounded-xl bg-red-600 px-3.5 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-red-700 active:bg-red-800"
            >
              Créer un compte
            </a>
          </nav>
        )}
      </div>
    </header>
  );
}

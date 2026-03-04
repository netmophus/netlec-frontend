"use client";

import { useEffect, useState, type ReactNode } from "react";

type PortalSettings = {
  logoUrl: string;
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const [logoUrl, setLogoUrl] = useState("/nigelec-logo.svg");

  useEffect(() => {
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

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-28 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-red-500/20 via-rose-400/10 to-transparent blur-3xl dark:from-red-500/20 dark:via-rose-500/10 dark:to-transparent" />
        <div className="absolute -bottom-44 right-[-140px] h-[560px] w-[560px] rounded-full bg-gradient-to-tr from-zinc-900/10 via-red-500/10 to-transparent blur-3xl dark:from-white/5 dark:via-red-500/10 dark:to-transparent" />
      </div>

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 items-center gap-10 px-6 py-10 lg:grid-cols-2">
        <div className="hidden lg:block">
          <a href="/" className="inline-flex items-center gap-2">
            <img src={logoUrl} alt="NIGELEC" className="h-8 w-auto" />
          </a>

          <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight">
            Relevés intelligents.
            <span className="block text-zinc-600 dark:text-zinc-300">
              Tournées, contrôle, réconciliation SI.
            </span>
          </h1>

          <p className="mt-4 max-w-md text-base leading-7 text-zinc-600 dark:text-zinc-300">
            Accède au back-office pour suivre les tournées, traiter les anomalies et auditer les relevés.
          </p>

          <div className="mt-8 grid max-w-md gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
              <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Sécurité</div>
              <div className="mt-1 text-sm font-semibold">JWT + rôles</div>
              <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                Admin, superviseur, agent.
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
              <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Audit</div>
              <div className="mt-1 text-sm font-semibold">Preuve photo</div>
              <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                Snapshot immuable au relevé.
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="rounded-3xl border border-zinc-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
            {children}
          </div>
          <p className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
            © {new Date().getFullYear()} NIGELEC
          </p>
        </div>
      </div>
    </div>
  );
}

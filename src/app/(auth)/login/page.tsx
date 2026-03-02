"use client";

import { useMemo, useState } from "react";

type FormState = {
  phone: string;
  password: string;
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

export default function LoginPage() {
  const inputClassName =
    "h-12 w-full rounded-md border border-zinc-200 bg-white/70 px-5 text-base shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-red-600/10 dark:border-white/10 dark:bg-white/5 dark:placeholder:text-zinc-500 dark:focus:border-white/20 dark:focus:ring-red-500/15";

  const [form, setForm] = useState<FormState>({ phone: "", password: "" });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const errors = useMemo(() => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.phone.trim()) e.phone = "Le téléphone est requis.";
    if (!form.password) e.password = "Le mot de passe est requis.";
    return e;
  }, [form.password, form.phone]);

  const canSubmit = Object.keys(errors).length === 0;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
    setServerError(null);
    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
      const body = new URLSearchParams();
      body.set("username", form.phone);
      body.set("password", form.password);

      const res = await fetch(`${apiBase}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { detail?: string } | null;
        setServerError(data?.detail ?? "Connexion impossible.");
        return;
      }

      const data = (await res.json()) as {
        access_token: string;
        token_type: string;
        mustChangePassword?: boolean;
      };
      localStorage.setItem("nigelec_access_token", data.access_token);

      if (data.mustChangePassword) {
        window.location.href = "/change-password";
        return;
      }

      const payload = decodeJwtPayload(data.access_token);
      const role = payload?.role;
      if (role === "admin") {
        window.location.href = "/admin";
      } else if (role === "supervisor") {
        window.location.href = "/supervisor";
      } else if (role === "customer") {
        window.location.href = "/customer";
      } else if (role === "agent") {
        window.location.href = "/agent";
      } else {
        window.location.href = "/";
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Connexion</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            Accède au back-office NIGELEC.
          </p>
        </div>
        <a
          href="/"
          className="rounded-md px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-900/5 hover:text-zinc-900 dark:text-zinc-200 dark:hover:bg-white/10 dark:hover:text-white"
        >
          Accueil
        </a>
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium">Téléphone</label>
          <input
            value={form.phone}
            onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
            placeholder="Ex: 90 00 00 00"
            className={inputClassName}
            inputMode="tel"
            autoComplete="tel"
          />
          {submitted && errors.phone ? (
            <p className="text-xs text-rose-600 dark:text-rose-400">{errors.phone}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Mot de passe</label>
          <input
            value={form.password}
            onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
            placeholder="••••••••"
            className={inputClassName}
            type="password"
            autoComplete="current-password"
          />
          {submitted && errors.password ? (
            <p className="text-xs text-rose-600 dark:text-rose-400">{errors.password}</p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-12 w-full items-center justify-center rounded-md bg-red-600 px-5 text-base font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Connexion…" : "Se connecter"}
        </button>

        <div className="flex items-center justify-between gap-4 text-sm">
          <a
            href="/register"
            className="font-semibold text-red-700 underline underline-offset-4 dark:text-red-200"
          >
            Créer un compte
          </a>
          <a
            href="#"
            className="text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
          >
            Mot de passe oublié
          </a>
        </div>

        {!submitted || canSubmit ? null : (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
            Vérifie les champs en rouge puis réessaie.
          </div>
        )}

        {serverError ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
            {serverError}
          </div>
        ) : null}
      </form>

      <div className="mt-6 rounded-md border border-zinc-200 bg-white/70 p-4 text-xs text-zinc-600 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-zinc-300">
        Connexion via API: <span className="font-medium">{process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000"}</span>
      </div>
    </div>
  );
}

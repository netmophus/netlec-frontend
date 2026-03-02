"use client";

import { useEffect, useMemo, useState } from "react";

type FormState = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export default function ChangePasswordPage() {
  const inputClassName =
    "h-12 w-full rounded-2xl border border-zinc-200 bg-white/70 px-5 text-base shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-900/5 dark:border-white/10 dark:bg-white/5 dark:placeholder:text-zinc-500 dark:focus:border-white/20 dark:focus:ring-white/10";

  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState<FormState>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const errors = useMemo(() => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.currentPassword) e.currentPassword = "Le mot de passe temporaire est requis.";
    if (!form.newPassword) e.newPassword = "Le nouveau mot de passe est requis.";
    if (form.newPassword && form.newPassword.length < 8) e.newPassword = "Minimum 8 caractères.";
    if (form.confirmPassword !== form.newPassword) e.confirmPassword = "Les mots de passe ne correspondent pas.";
    return e;
  }, [form.confirmPassword, form.currentPassword, form.newPassword]);

  const canSubmit = Object.keys(errors).length === 0;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
    setServerError(null);
    setSuccess(null);
    if (!canSubmit) return;

    const token = localStorage.getItem("nigelec_access_token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    setIsSubmitting(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
      const res = await fetch(`${apiBase}/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { detail?: string } | null;
        setServerError(data?.detail ?? "Impossible de modifier le mot de passe.");
        return;
      }

      setSuccess("Mot de passe modifié. Redirection…");
      setTimeout(() => {
        localStorage.removeItem("nigelec_access_token");
        window.location.href = "/login";
      }, 600);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!mounted) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white/70 p-4 text-sm text-zinc-600 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-zinc-300">
        Chargement…
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Changer le mot de passe</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            Ton mot de passe a été réinitialisé. Définis un nouveau mot de passe pour continuer.
          </p>
        </div>
        <a
          href="/"
          className="rounded-xl px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-900/5 hover:text-zinc-900 dark:text-zinc-200 dark:hover:bg-white/10 dark:hover:text-white"
        >
          Accueil
        </a>
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium">Mot de passe temporaire</label>
          <input
            value={form.currentPassword}
            onChange={(e) => setForm((s) => ({ ...s, currentPassword: e.target.value }))}
            placeholder="Mot de passe temporaire"
            className={inputClassName}
            type="password"
            autoComplete="current-password"
          />
          {submitted && errors.currentPassword ? (
            <p className="text-xs text-rose-600 dark:text-rose-400">{errors.currentPassword}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Nouveau mot de passe</label>
          <input
            value={form.newPassword}
            onChange={(e) => setForm((s) => ({ ...s, newPassword: e.target.value }))}
            placeholder="Minimum 8 caractères"
            className={inputClassName}
            type="password"
            autoComplete="new-password"
          />
          {submitted && errors.newPassword ? (
            <p className="text-xs text-rose-600 dark:text-rose-400">{errors.newPassword}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Confirmer le mot de passe</label>
          <input
            value={form.confirmPassword}
            onChange={(e) => setForm((s) => ({ ...s, confirmPassword: e.target.value }))}
            placeholder="Confirmer"
            className={inputClassName}
            type="password"
            autoComplete="new-password"
          />
          {submitted && errors.confirmPassword ? (
            <p className="text-xs text-rose-600 dark:text-rose-400">{errors.confirmPassword}</p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-zinc-900 px-5 text-base font-semibold text-zinc-50 shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isSubmitting ? "Enregistrement…" : "Enregistrer"}
        </button>

        {!submitted || canSubmit ? null : (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
            Vérifie les champs en rouge puis réessaie.
          </div>
        )}

        {serverError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
            {serverError}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
            {success}
          </div>
        ) : null}
      </form>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";

type FormState = {
  phone: string;
  password: string;
  confirmPassword: string;
};

type LookupUser = {
  _id: string;
  phone: string;
  name?: string | null;
  meterNumber?: string | null;
  subscriberNumber?: string | null;
  police?: string | null;
  address?: string | null;
  center?: string | null;
  zone?: string | null;
  sector?: string | null;
  tariffCode?: string | null;
};

export default function RegisterPage() {
  const inputClassName =
    "h-12 w-full rounded-md border border-zinc-200 bg-white/70 px-5 text-base shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-red-600/10 dark:border-white/10 dark:bg-white/5 dark:placeholder:text-zinc-500 dark:focus:border-white/20 dark:focus:ring-red-500/15";

  const [form, setForm] = useState<FormState>({
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverSuccess, setServerSuccess] = useState<string | null>(null);
  const [lookupUser, setLookupUser] = useState<LookupUser | null>(null);

  const errors = useMemo(() => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.phone.trim()) e.phone = "Le téléphone est requis.";

    if (lookupUser) {
      if (!form.password) e.password = "Le mot de passe est requis.";
      if (form.password && form.password.length < 6) e.password = "Minimum 6 caractères.";
      if (!form.confirmPassword) e.confirmPassword = "Confirmation requise.";
      if (form.password && form.confirmPassword && form.password !== form.confirmPassword)
        e.confirmPassword = "Les mots de passe ne correspondent pas.";
    }
    return e;
  }, [form.confirmPassword, form.password, form.phone, lookupUser]);

  const canSubmit = Object.keys(errors).length === 0;

  async function lookupByPhone() {
    setSubmitted(true);
    setServerError(null);
    setServerSuccess(null);
    setLookupUser(null);
    if (!form.phone.trim()) return;

    setIsLookingUp(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
      const res = await fetch(`${apiBase}/auth/register/lookup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: form.phone,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { detail?: string } | null;
        setServerError(data?.detail ?? "Vérification impossible.");
        return;
      }

      const data = (await res.json()) as LookupUser;
      setLookupUser(data);
    } finally {
      setIsLookingUp(false);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
    setServerError(null);
    setServerSuccess(null);
    if (!canSubmit) return;

    if (!lookupUser) {
      await lookupByPhone();
      return;
    }

    setIsSubmitting(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
      const res = await fetch(`${apiBase}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: form.phone,
          password: form.password,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { detail?: string } | null;
        setServerError(data?.detail ?? "Inscription impossible.");
        return;
      }

      setServerSuccess("Compte activé. Tu peux maintenant te connecter.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Créer un compte</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            Compte pour accéder au back-office.
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
            onChange={(e) => {
              setLookupUser(null);
              setForm((s) => ({ ...s, phone: e.target.value }));
            }}
            placeholder="Ex: 90 00 00 00"
            className={inputClassName}
            inputMode="tel"
            autoComplete="tel"
          />
          {submitted && errors.phone ? (
            <p className="text-xs text-rose-600 dark:text-rose-400">{errors.phone}</p>
          ) : null}
        </div>

        {!lookupUser ? (
          <button
            type="button"
            onClick={() => void lookupByPhone()}
            disabled={isLookingUp || isSubmitting}
            className="inline-flex h-12 w-full items-center justify-center rounded-md border border-zinc-200 bg-white px-5 text-base font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/10 dark:bg-white/5 dark:text-zinc-50 dark:hover:bg-white/10"
          >
            {isLookingUp ? "Vérification…" : "Continuer"}
          </button>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border border-zinc-200 bg-white/70 p-4 text-sm shadow-sm dark:border-white/10 dark:bg-white/5">
              <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Compte pré-enregistré</div>
              <div className="mt-2 grid gap-2 text-sm">
                <div>
                  <span className="font-semibold">Nom:</span> {lookupUser.name ?? "—"}
                </div>
                <div>
                  <span className="font-semibold">Compteur:</span> {lookupUser.meterNumber ?? "—"}
                </div>
                <div>
                  <span className="font-semibold">Abonné:</span> {lookupUser.subscriberNumber ?? "—"}
                </div>
                <div>
                  <span className="font-semibold">Police:</span> {lookupUser.police ?? "—"}
                </div>
                <div>
                  <span className="font-semibold">Zone:</span> {lookupUser.center ?? "—"} / {lookupUser.zone ?? "—"} / {lookupUser.sector ?? "—"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setLookupUser(null);
                  setForm((s) => ({ ...s, password: "", confirmPassword: "" }));
                }}
                className="mt-3 inline-flex h-10 items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-white/10 dark:bg-white/5 dark:text-zinc-50 dark:hover:bg-white/10"
              >
                Changer le téléphone
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Mot de passe</label>
              <input
                value={form.password}
                onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
                placeholder="••••••••"
                className={inputClassName}
                type="password"
                autoComplete="new-password"
              />
              {submitted && errors.password ? (
                <p className="text-xs text-rose-600 dark:text-rose-400">{errors.password}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Confirmer le mot de passe</label>
              <input
                value={form.confirmPassword}
                onChange={(e) => setForm((s) => ({ ...s, confirmPassword: e.target.value }))}
                placeholder="••••••••"
                className={inputClassName}
                type="password"
                autoComplete="new-password"
              />
              {submitted && errors.confirmPassword ? (
                <p className="text-xs text-rose-600 dark:text-rose-400">{errors.confirmPassword}</p>
              ) : null}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || isLookingUp || !lookupUser}
          className="inline-flex h-12 w-full items-center justify-center rounded-md bg-red-600 px-5 text-base font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Création…" : "Créer le compte"}
        </button>

        <div className="text-sm">
          <a
            href="/login"
            className="font-semibold text-red-700 underline underline-offset-4 dark:text-red-200"
          >
            J’ai déjà un compte
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

        {serverSuccess ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
            {serverSuccess}
          </div>
        ) : null}
      </form>

      <div className="mt-6 rounded-md border border-zinc-200 bg-white/70 p-4 text-xs text-zinc-600 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-zinc-300">
        Activation via API: <span className="font-medium">{process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000"}</span>
      </div>
    </div>
  );
}

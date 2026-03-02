"use client";

import { useEffect, useMemo, useState } from "react";

type Role = "admin" | "supervisor" | "agent" | "customer";

type TokenPayload = {
  role?: Role;
  sub?: string;
  exp?: number;
};

type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number | null };

type BillingLineItem = {
  date: string;
  meterNumber: string;
  oldIndex?: number | null;
  newIndex: number;
  consumption?: number | null;
  tariffCode?: string | null;
  amount?: number | null;
  createdAt: string;
};

type CustomerBillingResponse = {
  meterNumber?: string | null;
  tariffCode?: string | null;
  totalConsumption?: number | null;
  totalAmount?: number | null;
  items: BillingLineItem[];
};

type InvoicePublic = {
  id: string;
  period: string;
  date: string;
  dueDate?: string | null;
  meterNumber: string;
  tariffCode?: string | null;
  consumption?: number | null;
  amount?: number | null;
  status: string;
  readingId: string;
};

type PaymentPublic = {
  _id: string;
  invoiceId: string;
  customerId: string;
  provider: "NITA" | "BANK_TRANSFER" | "PISPI" | string;
  amount?: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type TariffTier = {
  _id: string;
  code: string;
  fromKwh: number;
  toKwh: number | null;
  ratePerKwh: number;
};

function decodeJwtPayload(token: string): TokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = atob(padded);
    return JSON.parse(json) as TokenPayload;
  } catch {
    return null;
  }
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<ApiResult<T>> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
  const token = getToken();

  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  try {
    const res = await fetch(`${apiBase}${path}`, { ...options, headers });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { detail?: string } | null;
      return { ok: false, status: res.status, error: data?.detail ?? `Erreur HTTP ${res.status}` };
    }
    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch {
    return { ok: false, status: null, error: "Impossible de joindre le serveur." };
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("nigelec_access_token");
}

export default function CustomerDashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [billing, setBilling] = useState<CustomerBillingResponse | null>(null);
  const [invoices, setInvoices] = useState<InvoicePublic[]>([]);
  const [payments, setPayments] = useState<PaymentPublic[]>([]);
  const [tariffs, setTariffs] = useState<TariffTier[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    setMounted(true);
    setToken(getToken());
  }, []);

  const payload = useMemo(() => (token ? decodeJwtPayload(token) : null), [token]);
  const role = payload?.role;

  useEffect(() => {
    if (!mounted) return;
    if (!token) {
      window.location.href = "/login";
      return;
    }

    if (role && role !== "customer") {
      if (role === "admin") window.location.href = "/admin";
      else window.location.href = "/";
    }
  }, [mounted, role, token]);

  async function loadBilling() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await apiFetch<CustomerBillingResponse>("/customer/billing?limit=100", { method: "GET" });
      if (!res.ok) {
        setMessage({ type: "error", text: res.error });
        return;
      }
      setBilling(res.data);
    } finally {
      setBusy(false);
    }
  }

  async function loadInvoices() {
    setBusy(true);
    try {
      const res = await apiFetch<InvoicePublic[]>("/customer/invoices?limit=24", { method: "GET" });
      if (!res.ok) {
        setMessage({ type: "error", text: res.error });
        return;
      }
      setInvoices(res.data);
    } finally {
      setBusy(false);
    }
  }

  async function loadPayments() {
    setBusy(true);
    try {
      const res = await apiFetch<PaymentPublic[]>("/customer/payments?limit=50", { method: "GET" });
      if (!res.ok) {
        setMessage({ type: "error", text: res.error });
        return;
      }
      setPayments(res.data);
    } finally {
      setBusy(false);
    }
  }

  async function loadTariffs() {
    setBusy(true);
    try {
      const res = await apiFetch<TariffTier[]>("/customer/tariffs?limit=50", { method: "GET" });
      if (!res.ok) {
        setMessage({ type: "error", text: res.error });
        return;
      }
      setTariffs(res.data);
    } finally {
      setBusy(false);
    }
  }

  async function initiatePayment(invoiceId: string, provider: "NITA" | "BANK_TRANSFER" | "PISPI") {
    setBusy(true);
    setMessage(null);
    try {
      const res = await apiFetch<PaymentPublic>("/customer/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId, provider }),
      });
      if (!res.ok) {
        setMessage({ type: "error", text: res.error });
        return;
      }
      setMessage({ type: "ok", text: `Paiement simulé réussi via ${provider}.` });
      void loadInvoices();
      void loadPayments();
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!mounted || !token) return;
    if (role && role !== "customer") return;
    void loadBilling();
    void loadInvoices();
    void loadPayments();
    void loadTariffs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, token]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-indigo-400/35 via-sky-400/25 to-emerald-400/25 blur-3xl dark:from-indigo-500/20 dark:via-sky-500/15 dark:to-emerald-500/15" />
        <div className="absolute -bottom-40 right-[-120px] h-[520px] w-[520px] rounded-full bg-gradient-to-tr from-fuchsia-400/25 via-rose-400/20 to-amber-300/15 blur-3xl dark:from-fuchsia-500/15 dark:via-rose-500/10 dark:to-amber-400/10" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <a href="/" className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900">
            N
          </span>
          <div>
            <div className="text-sm font-semibold tracking-wide">NIGELEC</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">Espace Client</div>
          </div>
        </a>

        <nav className="flex items-center gap-2">
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
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-16 pt-4">
        {!mounted ? (
          <div className="rounded-3xl border border-zinc-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
            <h1 className="text-xl font-semibold">Chargement…</h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">Vérification de la session.</p>
          </div>
        ) : !token ? (
          <div className="rounded-3xl border border-zinc-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
            <h1 className="text-xl font-semibold">Accès requis</h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">Connecte-toi pour accéder à ton espace.</p>
            <a
              href="/login"
              className="mt-4 inline-flex h-12 items-center justify-center rounded-2xl bg-zinc-900 px-5 text-base font-semibold text-zinc-50 shadow-sm transition hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Aller au login
            </a>
          </div>
        ) : (
          <div className="space-y-6">
            <section className="rounded-3xl border border-zinc-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
              <h1 className="text-2xl font-semibold tracking-tight">Bienvenue</h1>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                Consulte tes informations et l’historique de tes relevés.
              </p>

              {message ? (
                <div
                  className={`mt-4 rounded-2xl border p-4 text-sm shadow-sm ${
                    message.type === "ok"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
                      : "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200"
                  }`}
                >
                  {message.text}
                </div>
              ) : null}

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-zinc-200 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-black/30">
                  <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">N° Compteur</div>
                  <div className="mt-2 text-lg font-semibold">{billing?.meterNumber ?? "—"}</div>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-black/30">
                  <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Tarif</div>
                  <div className="mt-2 text-lg font-semibold">{billing?.tariffCode ?? "—"}</div>

                  <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200 dark:border-white/10">
                    <table className="w-full text-xs">
                      <thead className="bg-zinc-50 text-left text-[11px] text-zinc-500 dark:bg-white/5 dark:text-zinc-400">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Code</th>
                          <th className="px-3 py-2 font-semibold">De</th>
                          <th className="px-3 py-2 font-semibold">À</th>
                          <th className="px-3 py-2 font-semibold">Prix</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 bg-white/70 dark:divide-white/10 dark:bg-black/30">
                        {tariffs.length ? (
                          tariffs
                            .slice()
                            .sort((a, b) => Number(a.fromKwh || 0) - Number(b.fromKwh || 0))
                            .map((t) => (
                              <tr key={t._id}>
                                <td className="px-3 py-2 font-semibold">{t.code}</td>
                                <td className="px-3 py-2">{t.fromKwh}</td>
                                <td className="px-3 py-2">{t.toKwh == null ? "∞" : t.toKwh}</td>
                                <td className="px-3 py-2">{t.ratePerKwh}</td>
                              </tr>
                            ))
                        ) : (
                          <tr>
                            <td className="px-3 py-2" colSpan={4}>
                              {busy ? "Chargement…" : "—"}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-black/30">
                  <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Consommation (total)</div>
                  <div className="mt-2 text-lg font-semibold">{billing?.totalConsumption ?? "—"}</div>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-black/30">
                  <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Montant estimé (total)</div>
                  <div className="mt-2 text-lg font-semibold">{billing?.totalAmount != null ? `${billing.totalAmount} FCFA` : "—"}</div>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => void loadBilling()}
                  disabled={busy}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-zinc-50 transition hover:bg-zinc-800 disabled:opacity-70 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {busy ? "Chargement…" : "Actualiser"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void loadInvoices();
                    void loadPayments();
                  }}
                  disabled={busy}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white/70 px-4 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-white disabled:opacity-70 dark:border-white/10 dark:bg-black/30 dark:text-white dark:hover:bg-white/10"
                >
                  {busy ? "Chargement…" : "Actualiser paiements"}
                </button>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-zinc-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
                <h2 className="text-lg font-semibold">Historique des relevés</h2>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Derniers relevés.</p>
                <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/10">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-50 text-left text-xs text-zinc-500 dark:bg-white/5 dark:text-zinc-400">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Date</th>
                        <th className="px-4 py-3 font-semibold">Ancien</th>
                        <th className="px-4 py-3 font-semibold">Nouveau</th>
                        <th className="px-4 py-3 font-semibold">Conso</th>
                        <th className="px-4 py-3 font-semibold">Montant</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 bg-white/70 dark:divide-white/10 dark:bg-black/30">
                      {billing?.items?.length ? (
                        billing.items.map((it) => (
                          <tr key={`${it.date}-${it.meterNumber}-${it.createdAt}`}>
                            <td className="px-4 py-3">{it.date}</td>
                            <td className="px-4 py-3">{it.oldIndex ?? "—"}</td>
                            <td className="px-4 py-3">{it.newIndex}</td>
                            <td className="px-4 py-3">{it.consumption ?? "—"}</td>
                            <td className="px-4 py-3">{it.amount != null ? `${it.amount} FCFA` : "—"}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="px-4 py-3" colSpan={5}>
                            {busy ? "Chargement…" : "Aucun relevé."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
                <h2 className="text-lg font-semibold">Paiement en ligne (simulation)</h2>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                  MVP fictif: NITA / Virement bancaire / PI-SPI. Aucun paiement réel n’est exécuté.
                </p>

                <div className="mt-5 space-y-3">
                  {invoices.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-200 bg-white/60 p-4 text-sm text-zinc-700 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-zinc-200">
                      {busy ? "Chargement…" : "Aucune facture disponible."}
                    </div>
                  ) : (
                    invoices.map((inv) => (
                      <div key={inv.id} className="rounded-2xl border border-zinc-200 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-black/30">
                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                          <div>
                            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{inv.id}</div>
                            <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                              Période: <span className="font-medium">{inv.period}</span> · Date: <span className="font-medium">{inv.date}</span>
                              {inv.dueDate ? (
                                <>
                                  {" "}· Échéance: <span className="font-medium">{inv.dueDate}</span>
                                </>
                              ) : null}
                            </div>
                            <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">
                              Compteur: <span className="font-medium">{inv.meterNumber}</span>
                              {inv.tariffCode ? (
                                <>
                                  {" "}· Tarif: <span className="font-medium">{inv.tariffCode}</span>
                                </>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex flex-col items-start gap-2 sm:items-end">
                            <div
                              className={
                                inv.status === "OVERDUE"
                                  ? "inline-flex items-center rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white"
                                  : "inline-flex items-center rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                              }
                            >
                              {inv.status}
                            </div>
                            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                              {inv.amount != null ? `${inv.amount.toLocaleString()} FCFA` : "—"}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={busy || inv.status === "PAID"}
                            onClick={() => void initiatePayment(inv.id, "NITA")}
                            className="inline-flex h-9 items-center justify-center rounded-xl bg-zinc-900 px-3 text-sm font-semibold text-zinc-50 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                          >
                            Payer (NITA)
                          </button>
                          <button
                            type="button"
                            disabled={busy || inv.status === "PAID"}
                            onClick={() => void initiatePayment(inv.id, "BANK_TRANSFER")}
                            className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-200 bg-white/70 px-3 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/10 dark:bg-black/30 dark:text-white dark:hover:bg-white/10"
                          >
                            Payer (Virement)
                          </button>
                          <button
                            type="button"
                            disabled={busy || inv.status === "PAID"}
                            onClick={() => void initiatePayment(inv.id, "PISPI")}
                            className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-200 bg-white/70 px-3 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/10 dark:bg-black/30 dark:text-white dark:hover:bg-white/10"
                          >
                            Payer (PI-SPI)
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-6">
                  <div className="text-sm font-semibold">Historique des paiements</div>
                  <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/10">
                    <table className="w-full text-sm">
                      <thead className="bg-zinc-50 text-left text-xs text-zinc-500 dark:bg-white/5 dark:text-zinc-400">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Date</th>
                          <th className="px-4 py-3 font-semibold">Facture</th>
                          <th className="px-4 py-3 font-semibold">Mode</th>
                          <th className="px-4 py-3 font-semibold">Montant</th>
                          <th className="px-4 py-3 font-semibold">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 bg-white/70 dark:divide-white/10 dark:bg-black/30">
                        {payments.length ? (
                          payments.map((p) => (
                            <tr key={p._id}>
                              <td className="px-4 py-3">{String(p.createdAt).slice(0, 10)}</td>
                              <td className="px-4 py-3">{p.invoiceId}</td>
                              <td className="px-4 py-3">{p.provider}</td>
                              <td className="px-4 py-3">{p.amount != null ? `${p.amount} FCFA` : "—"}</td>
                              <td className="px-4 py-3">{p.status}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td className="px-4 py-3" colSpan={5}>
                              {busy ? "Chargement…" : "Aucun paiement."}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
                <h2 className="text-lg font-semibold">Notifications</h2>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Messages et informations (placeholder).</p>
                <div className="mt-5 space-y-3">
                  <div className="rounded-2xl border border-zinc-200 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-black/30">
                    <div className="text-sm font-semibold">Avis de coupure</div>
                    <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">Travaux programmés dans votre zone · 2026-02-18</div>
                  </div>
                  <div className="rounded-2xl border border-zinc-200 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-black/30">
                    <div className="text-sm font-semibold">Rappel</div>
                    <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">Pensez à vérifier votre facture du mois.</div>
                  </div>
                </div>
              </div>
            </section>

            <footer className="border-t border-zinc-200 pt-8 text-sm text-zinc-500 dark:border-white/10 dark:text-zinc-400">
              © {new Date().getFullYear()} NIGELEC · Espace Client
            </footer>
          </div>
        )}
      </main>
    </div>
  );
}

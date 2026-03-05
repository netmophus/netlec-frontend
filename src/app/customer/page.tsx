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
  energyAmount?: number | null;
  tvFee?: number | null;
  fsspFee?: number | null;
  subtotal?: number | null;
  taxAmount?: number | null;
  totalAmount?: number | null;
  breakdown?: Array<{
    label: string;
    code?: string | null;
    kwh?: number | null;
    ratePerKwh?: number | null;
    amount: number;
  }>;
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

type LoyaltyReadingHistoryItem = {
  date: string;
  meterNumber: string;
  newIndex: number;
  status: string;
  pointsAwarded: number;
  createdAt: string;
};

type CustomerLoyaltySummary = {
  pointsSemester: number;
  pointsLifetime: number;
  eligibleForDraw: boolean;
  excluded: boolean;
  threshold: number;
  pointsPerConformReading: number;
  nextDrawFrequency: string;
  history: LoyaltyReadingHistoryItem[];
};

type SelfReadingAvailabilityResponse = {
  date: string;
  meterNumber?: string | null;
  oldIndex?: number | null;
  canSubmit: boolean;
  reason?: string | null;
};

type PortalAnnouncement = {
  id: string;
  title: string;
  message: string;
  date: string;
};

const defaultLatestAnnouncements: PortalAnnouncement[] = [
  {
    id: "ann-1",
    title: "Maintenance planifiee",
    message: "Intervention reseau ce samedi de 22h a 01h sur Conakry Nord.",
    date: "04 Mars 2026",
  },
  {
    id: "ann-2",
    title: "Nouveaux points de paiement",
    message: "Le paiement NITA est disponible dans 12 nouveaux points partenaires.",
    date: "03 Mars 2026",
  },
  {
    id: "ann-3",
    title: "Tournees prioritaires",
    message: "Les releves des zones Koubia Nord et Bambeto sont prioritaires aujourd'hui.",
    date: "02 Mars 2026",
  },
];

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

function formatFcfa(value: number | null | undefined): string {
  if (typeof value !== "number") return "—";
  return `${value.toLocaleString()} FCFA`;
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
  const [activeAnnouncement, setActiveAnnouncement] = useState(0);
  const [latestAnnouncements, setLatestAnnouncements] = useState<PortalAnnouncement[]>(defaultLatestAnnouncements);
  const [expandedInvoices, setExpandedInvoices] = useState<Record<string, boolean>>({});
  const [loyalty, setLoyalty] = useState<CustomerLoyaltySummary | null>(null);
  const [selfReadingDate, setSelfReadingDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [selfReadingIndex, setSelfReadingIndex] = useState<string>("");
  const [selfReadingPhotoFile, setSelfReadingPhotoFile] = useState<File | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "getting" | "ok" | "error">("idle");
  const [geoError, setGeoError] = useState<string | null>(null);
  const [selfReadingAvailability, setSelfReadingAvailability] = useState<SelfReadingAvailabilityResponse | null>(null);
  const [checkingSelfReadingAvailability, setCheckingSelfReadingAvailability] = useState(false);

  useEffect(() => {
    setMounted(true);
    setToken(getToken());
  }, []);

  const payload = useMemo(() => (token ? decodeJwtPayload(token) : null), [token]);
  const role = payload?.role;
  const invoiceLabelById = useMemo(() => {
    const labels = new Map<string, string>();
    for (const inv of invoices) {
      labels.set(inv.id, `${inv.period} · ${inv.date}`);
    }
    return labels;
  }, [invoices]);

  useEffect(() => {
    if (latestAnnouncements.length === 0) return;
    const interval = setInterval(() => {
      setActiveAnnouncement((current) => (current + 1) % latestAnnouncements.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [latestAnnouncements.length]);

  useEffect(() => {
    setActiveAnnouncement((current) => Math.min(current, Math.max(0, latestAnnouncements.length - 1)));
  }, [latestAnnouncements.length]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("nigelec_portal_settings");
      if (!raw) return;
      const parsed = JSON.parse(raw) as { latestAnnouncements?: Array<Partial<PortalAnnouncement>> };
      if (!Array.isArray(parsed.latestAnnouncements) || parsed.latestAnnouncements.length === 0) return;

      const safeAnnouncements = Array.from({ length: 3 }, (_, index) => {
        const item = parsed.latestAnnouncements?.[index];
        const fallback = defaultLatestAnnouncements[index];
        return {
          id: typeof item?.id === "string" && item.id.trim() ? item.id : fallback.id,
          title: typeof item?.title === "string" ? item.title : fallback.title,
          message: typeof item?.message === "string" ? item.message : fallback.message,
          date: typeof item?.date === "string" ? item.date : fallback.date,
        };
      });

      setLatestAnnouncements(safeAnnouncements);
    } catch {
      // keep defaults when local storage value is malformed
    }
  }, []);

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

  async function loadLoyalty() {
    const res = await apiFetch<CustomerLoyaltySummary>("/customer/loyalty?limit=20", { method: "GET" });
    if (!res.ok) {
      setMessage({ type: "error", text: res.error });
      return;
    }
    setLoyalty(res.data);
  }

  async function submitSelfReading() {
    if (!selfReadingAvailability?.canSubmit) {
      setMessage({ type: "error", text: selfReadingAvailability?.reason ?? "Envoi indisponible sans tournée générée." });
      return;
    }
    if (!selfReadingDate.trim()) {
      setMessage({ type: "error", text: "Date du relevé obligatoire." });
      return;
    }
    const indexValue = Number(selfReadingIndex.trim());
    if (!Number.isFinite(indexValue) || indexValue < 0) {
      setMessage({ type: "error", text: "Index invalide." });
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      let liveCoords = coords;
      if (!liveCoords) {
        liveCoords = await captureGeolocation();
      }
      if (!liveCoords) {
        setMessage({ type: "error", text: "Position actuelle requise pour envoyer le relevé." });
        return;
      }

      const formData = new FormData();
      formData.set("date", selfReadingDate);
      formData.set("newIndex", String(indexValue));
      if (selfReadingPhotoFile) formData.set("photo", selfReadingPhotoFile);
      formData.set("gpsLat", String(liveCoords.lat));
      formData.set("gpsLng", String(liveCoords.lng));
      if (typeof liveCoords.accuracy === "number") formData.set("gpsAccuracy", String(liveCoords.accuracy));

      const res = await apiFetch<{ _id: string; loyaltyPointsAwarded?: number | null; selfReadingStatus?: string | null }>(
        "/customer/readings/self",
        {
          method: "POST",
          body: formData,
        },
      );
      if (!res.ok) {
        setMessage({ type: "error", text: res.error });
        return;
      }

      const pts = (res.data?.loyaltyPointsAwarded ?? 0) as number;
      const statusLabel = (res.data?.selfReadingStatus ?? "TRAITE") as string;
      const successText = `Relevé client enregistré. Statut: ${statusLabel}. Points gagnés: ${pts}.`;
      setMessage({ type: "ok", text: successText });
      window.alert("Relevé envoyé avec succès.");
      setSelfReadingIndex("");
      setSelfReadingPhotoFile(null);
      void loadBilling();
      void loadInvoices();
      void loadLoyalty();
    } finally {
      setBusy(false);
    }
  }

  function captureGeolocation(): Promise<{ lat: number; lng: number; accuracy?: number } | null> {
    setGeoError(null);
    setGeoStatus("getting");

    if (typeof window === "undefined" || !navigator.geolocation) {
      setGeoStatus("error");
      setGeoError("Géolocalisation non supportée sur cet appareil.");
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const nextCoords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
          setCoords(nextCoords);
          setGeoStatus("ok");
          resolve(nextCoords);
        },
        (err) => {
          setGeoStatus("error");
          setGeoError(err.message || "Impossible de récupérer la position actuelle.");
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        },
      );
    });
  }

  async function loadSelfReadingAvailability(targetDate: string) {
    const safeDate = targetDate?.trim() ? targetDate : new Date().toISOString().slice(0, 10);
    setCheckingSelfReadingAvailability(true);
    try {
      const res = await apiFetch<SelfReadingAvailabilityResponse>(
        `/customer/readings/self/availability?dateValue=${encodeURIComponent(safeDate)}`,
        { method: "GET" },
      );
      if (!res.ok) {
        setSelfReadingAvailability({
          date: safeDate,
          canSubmit: false,
          reason: res.error,
          meterNumber: billing?.meterNumber ?? null,
          oldIndex: billing?.items?.[0]?.oldIndex ?? null,
        });
        return;
      }
      setSelfReadingAvailability(res.data);
    } finally {
      setCheckingSelfReadingAvailability(false);
    }
  }

  function printInvoice(inv: InvoicePublic) {
    if (typeof window === "undefined") return;
    const popup = window.open("", "_blank", "width=980,height=820");
    if (!popup) {
      setMessage({ type: "error", text: "Impossible d'ouvrir la fenetre d'impression." });
      return;
    }

    const rows = (inv.breakdown ?? [])
      .map(
        (line) => `
          <tr>
            <td>${line.label}</td>
            <td>${line.code ?? "—"}</td>
            <td>${line.kwh ?? "—"}</td>
            <td>${line.ratePerKwh ?? "—"}</td>
            <td style="text-align:right;">${formatFcfa(line.amount)}</td>
          </tr>
        `,
      )
      .join("");

    const total = inv.totalAmount ?? inv.amount;
    popup.document.write(`
      <html>
        <head>
          <title>Facture client NIGELEC</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 28px; color: #111827; }
            h1 { margin: 0 0 8px; }
            .muted { color: #6b7280; font-size: 13px; }
            .head { margin-bottom: 16px; }
            .grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px; margin: 14px 0; }
            .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 14px; }
            th, td { border: 1px solid #e5e7eb; padding: 8px; font-size: 13px; }
            th { background: #f9fafb; text-align: left; }
            .total { margin-top: 14px; text-align: right; font-size: 18px; font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="head">
            <h1>NIGELEC - Facture client</h1>
            <div class="muted">Periode: ${inv.period} · Date: ${inv.date}</div>
          </div>

          <div class="grid">
            <div class="card"><strong>Compteur</strong><br/>${inv.meterNumber}</div>
            <div class="card"><strong>Statut</strong><br/>${inv.status}</div>
            <div class="card"><strong>Consommation</strong><br/>${inv.consumption ?? "—"} kWh</div>
            <div class="card"><strong>Echeance</strong><br/>${inv.dueDate ?? "—"}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Ligne</th>
                <th>Code</th>
                <th>kWh</th>
                <th>Prix/kWh</th>
                <th style="text-align:right;">Montant</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="5">Aucune ligne de detail.</td></tr>'}
            </tbody>
          </table>

          <div class="total">Total a payer: ${formatFcfa(total)}</div>

          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `);
    popup.document.close();
  }

  function toggleInvoiceDetails(invoiceId: string) {
    setExpandedInvoices((current) => ({
      ...current,
      [invoiceId]: !current[invoiceId],
    }));
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
    void loadLoyalty();
    void loadSelfReadingAvailability(selfReadingDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, token]);

  useEffect(() => {
    if (!mounted || !token) return;
    if (role && role !== "customer") return;
    void loadSelfReadingAvailability(selfReadingDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selfReadingDate]);

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
            <section className="rounded-2xl border border-red-100 bg-white/85 p-4 shadow-sm backdrop-blur dark:border-red-500/20 dark:bg-white/5">
              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex items-center rounded-full bg-red-600 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                  Dernieres annonces
                </div>
                <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-300">
                  {latestAnnouncements.length ? `${activeAnnouncement + 1}/${latestAnnouncements.length}` : "0/0"}
                </div>
              </div>

              <div className="mt-3 h-16 overflow-hidden">
                <div
                  className="space-y-2 transition-transform duration-700 ease-out"
                  style={{ transform: `translateY(-${activeAnnouncement * 72}px)` }}
                >
                  {latestAnnouncements.map((announcement) => (
                    <article
                      key={announcement.id}
                      className="h-16 rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2 dark:border-white/10 dark:bg-black/30"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{announcement.title}</p>
                        <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{announcement.date}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-300">{announcement.message}</p>
                    </article>
                  ))}
                </div>
              </div>

              {selfReadingAvailability?.canSubmit ? (
                <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-xs text-emerald-900 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200">
                  Tournée générée pour le {selfReadingAvailability.date}. Vous pouvez envoyer votre relevé maintenant.
                </div>
              ) : null}

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-zinc-200 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-black/30">
                  <h3 className="text-sm font-semibold">Envoyer mon relevé</h3>
                  <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                    Le relevé client validé marque ce compteur comme déjà relevé pour la tournée.
                  </p>
                  <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                    Compteur récupéré automatiquement: <span className="font-semibold">{billing?.meterNumber ?? "lié à votre compte"}</span>
                  </p>
                  <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                    {checkingSelfReadingAvailability
                      ? "Vérification disponibilité tournée..."
                      : selfReadingAvailability?.canSubmit
                        ? "Tournée trouvée: envoi autorisé."
                        : selfReadingAvailability?.reason ?? "Envoi non autorisé pour cette date."}
                  </p>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <input
                      type="date"
                      value={selfReadingDate}
                      onChange={(e) => setSelfReadingDate(e.target.value)}
                      className="h-10 rounded-xl border border-zinc-200 bg-white/80 px-3 text-sm dark:border-white/10 dark:bg-black/30"
                    />
                    <input
                      type="number"
                      min={0}
                      value={selfReadingIndex}
                      onChange={(e) => setSelfReadingIndex(e.target.value)}
                      placeholder="Nouvel index"
                      className="h-10 rounded-xl border border-zinc-200 bg-white/80 px-3 text-sm dark:border-white/10 dark:bg-black/30"
                    />
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">Ancien index</label>
                      <input
                        type="text"
                        value={
                          typeof selfReadingAvailability?.oldIndex === "number"
                            ? String(selfReadingAvailability.oldIndex)
                            : "Non disponible"
                        }
                        readOnly
                        disabled
                        aria-label="Ancien index"
                        className="h-10 w-full cursor-not-allowed rounded-xl border border-zinc-200 bg-zinc-100/70 px-3 text-sm text-zinc-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200"
                      />
                    </div>
                  </div>

                  <div className="mt-2">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        setSelfReadingPhotoFile(f);
                      }}
                      className="h-10 w-full rounded-xl border border-zinc-200 bg-white/80 px-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white dark:border-white/10 dark:bg-black/30 dark:file:bg-zinc-50 dark:file:text-zinc-900"
                    />
                    <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                      Photo recommandée: 8MB max (JPG/PNG/WEBP). Sans photo: 0 point.
                    </p>
                  </div>

                  <div className="mt-2 rounded-xl border border-zinc-200 bg-white/70 p-3 text-xs dark:border-white/10 dark:bg-black/30">
                    <div className="font-semibold">Position actuelle</div>
                    <div className="mt-1 text-zinc-600 dark:text-zinc-300">
                      {coords
                        ? `Lat: ${coords.lat.toFixed(6)} · Lng: ${coords.lng.toFixed(6)}${typeof coords.accuracy === "number" ? ` · ±${Math.round(coords.accuracy)}m` : ""}`
                        : "Non capturée"}
                    </div>
                    {geoError ? <div className="mt-1 text-rose-700 dark:text-rose-300">{geoError}</div> : null}
                    <button
                      type="button"
                      onClick={() => void captureGeolocation()}
                      disabled={geoStatus === "getting" || busy}
                      className="mt-2 inline-flex h-8 items-center justify-center rounded-lg border border-zinc-200 bg-white/70 px-3 text-xs font-semibold text-zinc-900 shadow-sm transition hover:bg-white disabled:opacity-60 dark:border-white/10 dark:bg-black/30 dark:text-white dark:hover:bg-white/10"
                    >
                      {geoStatus === "getting" ? "Localisation..." : coords ? "Rafraîchir position" : "Capturer position"}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => void submitSelfReading()}
                    disabled={busy || checkingSelfReadingAvailability || !selfReadingAvailability?.canSubmit}
                    className="mt-3 inline-flex h-10 items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-zinc-50 transition hover:bg-zinc-800 disabled:opacity-70 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    {busy ? "Envoi..." : "Envoyer mon relevé"}
                  </button>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-black/30">
                  <h3 className="text-sm font-semibold">Programme Clients Fidèles</h3>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div>Points semestre: <span className="font-semibold">{loyalty?.pointsSemester ?? 0}</span></div>
                    <div>Points cumulés: <span className="font-semibold">{loyalty?.pointsLifetime ?? 0}</span></div>
                    <div>Seuil tirage: <span className="font-semibold">{loyalty?.threshold ?? 120}</span></div>
                    <div>Statut: <span className="font-semibold">{loyalty?.excluded ? "Exclu" : loyalty?.eligibleForDraw ? "Éligible" : "En progression"}</span></div>
                  </div>

                  <div className="mt-3 max-h-36 overflow-auto rounded-xl border border-zinc-200 dark:border-white/10">
                    <table className="w-full text-xs">
                      <thead className="bg-zinc-50 text-left text-zinc-500 dark:bg-white/5 dark:text-zinc-400">
                        <tr>
                          <th className="px-2 py-2">Date</th>
                          <th className="px-2 py-2">Index</th>
                          <th className="px-2 py-2">Statut</th>
                          <th className="px-2 py-2 text-right">Pts</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-white/10">
                        {loyalty?.history?.length ? (
                          loyalty.history.map((h, idx) => (
                            <tr key={`${h.createdAt}-${idx}`}>
                              <td className="px-2 py-2">{h.date}</td>
                              <td className="px-2 py-2">{h.newIndex}</td>
                              <td className="px-2 py-2">{h.status}</td>
                              <td className="px-2 py-2 text-right">{h.pointsAwarded}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td className="px-2 py-2" colSpan={4}>Aucun historique fidélité.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>

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
                <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-cyan-50 p-4 shadow-sm dark:border-sky-500/30 dark:bg-sky-500/10">
                  <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">N° Compteur</div>
                  <div className="mt-2 text-base font-semibold leading-6">{billing?.meterNumber ?? "—"}</div>
                </div>
                <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-4 shadow-sm dark:border-violet-500/30 dark:bg-violet-500/10">
                  <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Tarif</div>

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
                <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-4 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-500/10">
                  <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Consommation (total)</div>
                  <div className="mt-2 text-lg font-semibold">{billing?.totalConsumption ?? "—"}</div>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10">
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
                            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Facture client</div>
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
                              {formatFcfa(inv.totalAmount ?? inv.amount)}
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleInvoiceDetails(inv.id)}
                              className="inline-flex h-8 items-center justify-center rounded-lg border border-zinc-200 bg-white/70 px-3 text-xs font-semibold text-zinc-900 shadow-sm transition hover:bg-white dark:border-white/10 dark:bg-black/30 dark:text-white dark:hover:bg-white/10"
                            >
                              {expandedInvoices[inv.id] ? "Réduire" : "Voir détails"}
                            </button>
                          </div>
                        </div>

                        {expandedInvoices[inv.id] ? (
                          <>
                            <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 dark:border-white/10">
                              <table className="w-full text-xs">
                                <thead className="bg-zinc-50 text-left text-[11px] text-zinc-500 dark:bg-white/5 dark:text-zinc-400">
                                  <tr>
                                    <th className="px-3 py-2 font-semibold">Ligne</th>
                                    <th className="px-3 py-2 font-semibold">Code</th>
                                    <th className="px-3 py-2 font-semibold">kWh</th>
                                    <th className="px-3 py-2 font-semibold">Prix/kWh</th>
                                    <th className="px-3 py-2 text-right font-semibold">Montant</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-200 bg-white/70 dark:divide-white/10 dark:bg-black/30">
                                  {inv.breakdown?.length ? (
                                    inv.breakdown.map((line, idx) => (
                                      <tr key={`${inv.id}-${line.code ?? line.label}-${idx}`}>
                                        <td className="px-3 py-2">{line.label}</td>
                                        <td className="px-3 py-2">{line.code ?? "—"}</td>
                                        <td className="px-3 py-2">{line.kwh ?? "—"}</td>
                                        <td className="px-3 py-2">{line.ratePerKwh ?? "—"}</td>
                                        <td className="px-3 py-2 text-right">{formatFcfa(line.amount)}</td>
                                      </tr>
                                    ))
                                  ) : (
                                    <tr>
                                      <td className="px-3 py-2" colSpan={5}>
                                        Aucun detail de facture.
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>

                            <div className="mt-3 grid gap-2 text-xs text-zinc-700 dark:text-zinc-200 sm:grid-cols-2">
                              <div>Sous-total energie: <span className="font-semibold">{formatFcfa(inv.energyAmount ?? inv.subtotal)}</span></div>
                              <div>Redevance TV: <span className="font-semibold">{formatFcfa(inv.tvFee)}</span></div>
                              <div>Redevance FSSP: <span className="font-semibold">{formatFcfa(inv.fsspFee)}</span></div>
                              <div>Total facture: <span className="font-semibold">{formatFcfa(inv.totalAmount ?? inv.amount)}</span></div>
                            </div>
                          </>
                        ) : null}

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => printInvoice(inv)}
                            className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-200 bg-white/70 px-3 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-white dark:border-white/10 dark:bg-black/30 dark:text-white dark:hover:bg-white/10"
                          >
                            Imprimer facture
                          </button>
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
                              <td className="px-4 py-3">{invoiceLabelById.get(p.invoiceId) ?? "Facture client"}</td>
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

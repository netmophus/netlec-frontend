"use client";

import { useEffect, useMemo, useState } from "react";

type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number | null };

type ReadingRow = {
  _id: string;
  date: string;
  tourId: string;
  agentId: string;
  meterNumber: string;
  oldIndex?: number | null;
  newIndex: number;
  consumption?: number | null;
  tariffCode?: string | null;
  amount?: number | null;
  center?: string | null;
  zone?: string | null;
  sector?: string | null;
  createdAt: string;
  updatedAt: string;
};

type Role = "admin" | "supervisor" | "agent" | "customer";

type ZoneRef = {
  center: string;
  zone: string;
  sector: string;
};

type UserPublic = {
  _id: string;
  phone: string;
  name?: string | null;
  role: Role;
  isActive: boolean;
  assignedZones?: ZoneRef[] | null;
};

type CreateAgentForm = {
  phone: string;
  name: string;
  password: string;
  isActive: boolean;
  zoneKey: string;
};

type AgentRow = {
  _id: string;
  phone: string;
  name?: string | null;
  role: Role;
  isActive: boolean;
  center?: string | null;
  zone?: string | null;
  sector?: string | null;
};

type CustomerRow = {
  _id: string;
  phone: string;
  name?: string | null;
  role: Role;
  isActive: boolean;
  meterNumber?: string | null;
  subscriberNumber?: string | null;
  police?: string | null;
  center?: string | null;
  zone?: string | null;
  sector?: string | null;
};

type MeterRow = {
  _id: string;
  meterNumber: string;
  routeOrder?: number | null;
  center?: string | null;
  zone?: string | null;
  sector?: string | null;
  subscriberNumber?: string | null;
  police?: string | null;
  address?: string | null;
};

type TourItemRow = {
  meterId?: string | null;
  meterNumber: string;
  routeOrder?: number | null;
  oldIndex?: number | null;
};

type TourRow = {
  _id: string;
  date: string;
  center: string;
  zone: string;
  sector: string;
  agentId: string;
  items: TourItemRow[];
  createdAt: string;
  updatedAt: string;
};

type GenerateToursResponse = {
  created: number;
  skipped: number;
  errors: number;
  errorLines: string[];
  tours: TourRow[];
};

type TabKey = "overview" | "agents" | "tours" | "readings" | "customers" | "meters";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("nigelec_access_token");
}

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

async function downloadPdf(path: string, filename: string): Promise<ApiResult<null>> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
  const token = getToken();
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  try {
    const res = await fetch(`${apiBase}${path}`, { method: "GET", headers });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { detail?: string } | null;
      return { ok: false, status: res.status, error: data?.detail ?? `Erreur HTTP ${res.status}` };
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return { ok: true, data: null };
  } catch {
    return { ok: false, status: null, error: "Impossible de joindre le serveur." };
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

export default function SupervisorDashboardPage() {
  const inputClassName =
    "h-12 w-full rounded-md border border-zinc-200 bg-white/70 px-5 text-base shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-900/5 dark:border-white/10 dark:bg-white/5 dark:placeholder:text-zinc-500 dark:focus:border-white/20 dark:focus:ring-white/10";

  const cardClassName =
    "rounded-3xl border border-zinc-200 bg-white/70 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5";

  const primaryButtonClassName =
    "inline-flex h-11 items-center justify-center rounded-2xl bg-red-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70";

  const secondaryButtonClassName =
    "inline-flex h-11 items-center justify-center rounded-2xl border border-zinc-200 bg-white/60 px-4 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10";

  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const payload = useMemo(() => (token ? decodeJwtPayload(token) : null), [token]);
  const role = payload?.role as Role | undefined;

  const [me, setMe] = useState<UserPublic | null>(null);
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [agentsBusy, setAgentsBusy] = useState(false);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [customersBusy, setCustomersBusy] = useState(false);
  const [customersQuery, setCustomersQuery] = useState("");
  const [meters, setMeters] = useState<MeterRow[]>([]);
  const [metersBusy, setMetersBusy] = useState(false);
  const [metersQuery, setMetersQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const [tab, setTab] = useState<TabKey>("overview");

  const [tourDate, setTourDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [tourMode, setTourMode] = useState<"A" | "B2" | "MANUAL">("A");
  const [tourZoneKey, setTourZoneKey] = useState<string>("");
  const [tourAgentId, setTourAgentId] = useState<string>("");
  const [tourAgentIds, setTourAgentIds] = useState<string[]>([]);
  const [maxMetersPerTour, setMaxMetersPerTour] = useState<number>(5);
  const [toursBusy, setToursBusy] = useState(false);
  const [manualCountsByAgent, setManualCountsByAgent] = useState<Record<string, number>>({});
  const [manualAgentId, setManualAgentId] = useState<string>("");
  const [manualCount, setManualCount] = useState<number>(5);
  const [zoneOptions, setZoneOptions] = useState<ZoneRef[]>([]);

  const [tours, setTours] = useState<TourRow[]>([]);
  const [toursListBusy, setToursListBusy] = useState(false);
  const [expandedTourId, setExpandedTourId] = useState<string | null>(null);

  const [readingsDate, setReadingsDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [readingsBusy, setReadingsBusy] = useState(false);
  const [readings, setReadings] = useState<ReadingRow[]>([]);

  const [form, setForm] = useState<CreateAgentForm>({
    phone: "",
    name: "",
    password: "",
    isActive: true,
    zoneKey: "",
  });

  useEffect(() => {
    setMounted(true);
    setToken(getToken());
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!token) {
      window.location.href = "/login";
      return;
    }
    if (role && role !== "supervisor") {
      if (role === "admin") window.location.href = "/admin";
      else if (role === "agent") window.location.href = "/agent";
      else if (role === "customer") window.location.href = "/customer";
      else window.location.href = "/";
    }
  }, [mounted, role, token]);

  useEffect(() => {
    if (!mounted || !token) return;
    void loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, token]);

  async function loadReadings() {
    setReadingsBusy(true);
    try {
      const params = new URLSearchParams();
      if (readingsDate) params.set("date", readingsDate);
      params.set("limit", "500");
      const res = await apiFetch<ReadingRow[]>(`/supervisor/readings?${params.toString()}`, { method: "GET" });
      if (!res.ok) {
        setMessage({ type: "error", text: res.error });
        return;
      }
      setReadings(res.data);
    } finally {
      setReadingsBusy(false);
    }
  }

  async function loadMe() {
    const res = await apiFetch<UserPublic>("/auth/me", { method: "GET" });
    if (!res.ok) {
      setMessage({ type: "error", text: res.error });
      return;
    }
    setMe(res.data);

    void loadAgents();
    void loadCustomers();
    void loadMeters();

    void loadTours();

    void loadReadings();

    const zonesRes = await apiFetch<ZoneRef[]>("/supervisor/zones", { method: "GET" });
    const zones = zonesRes.ok ? zonesRes.data : [];
    if (!zonesRes.ok) {
      setMessage({ type: "error", text: zonesRes.error });
    }
    setZoneOptions(zones);

    if (zones.length > 0 && !form.zoneKey) {
      setForm((s) => ({ ...s, zoneKey: `${zones[0].center}|||${zones[0].zone}|||${zones[0].sector}` }));
    }

    if (zones.length > 0 && !tourZoneKey) {
      setTourZoneKey(`${zones[0].center}|||${zones[0].zone}|||${zones[0].sector}`);
    }
  }

  async function loadTours() {
    setToursListBusy(true);
    try {
      const params = new URLSearchParams();
      if (tourDate) params.set("date", tourDate);
      params.set("limit", "500");

      const res = await apiFetch<TourRow[]>(`/supervisor/tours?${params.toString()}`, { method: "GET" });
      if (!res.ok) {
        setMessage({ type: "error", text: res.error });
        return;
      }
      setTours(res.data);
    } finally {
      setToursListBusy(false);
    }
  }

  async function generateTours() {
    setMessage(null);
    if (!tourDate) {
      setMessage({ type: "error", text: "Date requise." });
      return;
    }
    if (!tourZoneKey) {
      setMessage({ type: "error", text: "Zone requise." });
      return;
    }

    const [center, zone, sector] = tourZoneKey.split("|||");
    if (!center || !zone || !sector) {
      setMessage({ type: "error", text: "Zone invalide." });
      return;
    }

    if (tourMode === "A") {
      if (!tourAgentId) {
        setMessage({ type: "error", text: "Sélectionne un agent (mode A)." });
        return;
      }
    } else if (tourMode === "B2") {
      if (tourAgentIds.length === 0) {
        setMessage({ type: "error", text: "Sélectionne au moins 1 agent (mode B2)." });
        return;
      }
      if (!maxMetersPerTour || maxMetersPerTour < 1) {
        setMessage({ type: "error", text: "maxMetersPerTour invalide." });
        return;
      }
    }

    if (tourMode === "MANUAL") {
      const manualAssignments = Object.entries(manualCountsByAgent)
        .map(([agentId, count]) => ({ agentId, count: Number(count) }))
        .filter((x) => x.agentId && Number.isFinite(x.count) && x.count > 0);

      if (manualAssignments.length === 0) {
        setMessage({ type: "error", text: "Saisis au moins 1 agent avec un nombre > 0 (mode MANUAL)." });
        return;
      }
    }

    setToursBusy(true);
    try {
      const body: Record<string, unknown> = {
        date: tourDate,
        mode: tourMode,
        center,
        zone,
        sector,
      };
      if (tourMode === "A") body.agentId = tourAgentId;
      else if (tourMode === "B2") {
        body.agentIds = tourAgentIds;
        body.maxMetersPerTour = maxMetersPerTour;
      } else {
        body.assignments = Object.entries(manualCountsByAgent)
          .map(([agentId, count]) => ({ agentId, count: Number(count) }))
          .filter((x) => x.agentId && Number.isFinite(x.count) && x.count > 0);
      }

      const res = await apiFetch<GenerateToursResponse>("/supervisor/tours/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        setMessage({ type: "error", text: res.error });
        return;
      }

      const r = res.data;
      setMessage({
        type: r.errors > 0 ? "error" : "ok",
        text: `Tournées: créées=${r.created} · ignorées=${r.skipped} · erreurs=${r.errors}`,
      });

      if (Array.isArray(r.tours) && r.tours.length > 0) {
        setTours(r.tours);
        setExpandedTourId(r.tours[0]._id);
      }
      void loadTours();
    } finally {
      setToursBusy(false);
    }
  }

  async function loadAgents() {
    setAgentsBusy(true);
    try {
      const res = await apiFetch<AgentRow[]>("/supervisor/agents", { method: "GET" });
      if (!res.ok) {
        setMessage({ type: "error", text: res.error });
        return;
      }
      setAgents(res.data);
    } finally {
      setAgentsBusy(false);
    }
  }

  async function loadCustomers() {
    setCustomersBusy(true);
    try {
      const params = new URLSearchParams();
      if (customersQuery.trim()) params.set("q", customersQuery.trim());
      params.set("limit", "500");

      const qs = params.toString();
      const res = await apiFetch<CustomerRow[]>(`/supervisor/customers${qs ? `?${qs}` : ""}`, { method: "GET" });
      if (!res.ok) {
        setMessage({ type: "error", text: res.error });
        return;
      }
      setCustomers(res.data);
    } finally {
      setCustomersBusy(false);
    }
  }

  async function loadMeters() {
    setMetersBusy(true);
    try {
      const params = new URLSearchParams();
      if (metersQuery.trim()) params.set("q", metersQuery.trim());
      params.set("limit", "1000");

      const qs = params.toString();
      const res = await apiFetch<MeterRow[]>(`/supervisor/meters${qs ? `?${qs}` : ""}`, { method: "GET" });
      if (!res.ok) {
        setMessage({ type: "error", text: res.error });
        return;
      }
      setMeters(res.data);
    } finally {
      setMetersBusy(false);
    }
  }

  async function onCreateAgent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);

    if (!form.phone.trim() || !form.name.trim() || !form.password || !form.zoneKey) {
      setMessage({ type: "error", text: "Champs requis manquants." });
      return;
    }

    const [center, zone, sector] = form.zoneKey.split("|||");
    if (!center || !zone || !sector) {
      setMessage({ type: "error", text: "Zone invalide." });
      return;
    }

    setBusy(true);
    try {
      const res = await apiFetch<UserPublic>("/supervisor/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: form.phone.trim(),
          name: form.name.trim(),
          password: form.password,
          center,
          zone,
          sector,
          isActive: form.isActive,
        }),
      });

      if (!res.ok) {
        setMessage({ type: "error", text: res.error });
        return;
      }

      setMessage({ type: "ok", text: `Agent créé: ${res.data.name ?? "(sans nom)"} · ${res.data.phone}` });
      setForm((s) => ({ ...s, phone: "", name: "", password: "" }));

      void loadAgents();
    } finally {
      setBusy(false);
    }
  }

  const assignedZones = zoneOptions;

  const navItem = (key: TabKey, label: string, sub?: string) => {
    const active = tab === key;
    return (
      <button
        type="button"
        onClick={() => setTab(key)}
        className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
          active
            ? "bg-red-600 text-white shadow-sm"
            : "text-zinc-700 hover:bg-red-600/10 hover:text-zinc-900 dark:text-zinc-200 dark:hover:bg-white/10 dark:hover:text-white"
        }`}
      >
        <span>
          <span>{label}</span>
          {sub ? <span className={`ml-2 text-xs ${active ? "text-white/80" : "text-zinc-400 dark:text-zinc-500"}`}>{sub}</span> : null}
        </span>
        <span className={`text-xs font-bold ${active ? "text-white/80" : "text-zinc-400 dark:text-zinc-500"}`}>↵</span>
      </button>
    );
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-red-500/20 via-zinc-900/10 to-zinc-500/10 blur-3xl dark:from-red-500/15 dark:via-white/5 dark:to-zinc-500/10" />
        <div className="absolute -bottom-44 right-[-140px] h-[560px] w-[560px] rounded-full bg-gradient-to-tr from-zinc-900/10 via-red-500/15 to-zinc-500/10 blur-3xl dark:from-white/5 dark:via-red-500/15 dark:to-zinc-500/10" />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className={`${cardClassName} p-5`}>
            <div className="flex items-center gap-3">
              <img src="/nigelec-logo.svg" alt="NIGELEC" className="h-9 w-auto" />
              <div>
                <div className="text-sm font-semibold tracking-wide">Superviseur</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">NIGELEC</div>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              {navItem("overview", "Vue d’ensemble")}
              {navItem("agents", "Agents", `${agents.length}`)}
              {navItem("tours", "Tournées")}
              {navItem("readings", "Relevés", `${readings.length}`)}
              {navItem("customers", "Clients", `${customers.length}`)}
              {navItem("meters", "Compteurs", `${meters.length}`)}
            </div>

            <div className="mt-6 h-px bg-zinc-200/70 dark:bg-white/10" />

            <div className="mt-6 grid gap-2">
              <a href="/" className={secondaryButtonClassName}>
                Accueil
              </a>
              <a
                href="/login"
                className={primaryButtonClassName}
                onClick={() => localStorage.removeItem("nigelec_access_token")}
              >
                Déconnexion
              </a>
            </div>
          </aside>

          <section className="min-w-0">
            {!mounted ? (
              <div className={`${cardClassName} p-6`}>
                <h1 className="text-xl font-semibold">Chargement…</h1>
              </div>
            ) : !token ? (
              <div className={`${cardClassName} p-6`}>
                <h1 className="text-xl font-semibold">Accès requis</h1>
                <a href="/login" className={`mt-4 ${primaryButtonClassName}`}>
                  Aller au login
                </a>
              </div>
            ) : (
              <div className="space-y-6">
                {message ? (
                  <div
                    className={`rounded-3xl border p-4 text-sm shadow-sm ${
                      message.type === "ok"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
                        : "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200"
                    }`}
                  >
                    {message.text}
                  </div>
                ) : null}

                {tab === "overview" ? (
                  <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                    <div className="space-y-6">
                      <div className={`${cardClassName} p-6`}>
                        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                          <div>
                            <h1 className="text-2xl font-semibold tracking-tight">Dashboard Superviseur</h1>
                            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                              Zones: {assignedZones.length} · Agents: {agents.length} · Clients: {customers.length}
                            </p>
                          </div>
                          <button type="button" className={secondaryButtonClassName} onClick={() => void loadMe()}>
                            Actualiser
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <button type="button" className={`${cardClassName} p-5 text-left transition hover:bg-white/80 dark:hover:bg-white/10`} onClick={() => setTab("agents")}>
                          <div className="text-sm font-semibold">Gérer mes agents</div>
                          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Créer + consulter</div>
                        </button>
                        <button type="button" className={`${cardClassName} p-5 text-left transition hover:bg-white/80 dark:hover:bg-white/10`} onClick={() => setTab("tours")}>
                          <div className="text-sm font-semibold">Générer des tournées</div>
                          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Mode A / B2</div>
                        </button>
                        <button type="button" className={`${cardClassName} p-5 text-left transition hover:bg-white/80 dark:hover:bg-white/10`} onClick={() => setTab("readings")}>
                          <div className="text-sm font-semibold">Relevés</div>
                          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Filtrer par date</div>
                        </button>
                        <button type="button" className={`${cardClassName} p-5 text-left transition hover:bg-white/80 dark:hover:bg-white/10`} onClick={() => setTab("customers")}>
                          <div className="text-sm font-semibold">Clients & Compteurs</div>
                          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Recherche rapide</div>
                        </button>
                      </div>
                    </div>

                    <div className={`${cardClassName} p-6`}>
                      <div className="text-sm font-semibold">Mes zones</div>
                      <div className="mt-3 space-y-2">
                        {assignedZones.length === 0 ? (
                          <div className="text-sm text-zinc-600 dark:text-zinc-300">Aucune zone affectée.</div>
                        ) : (
                          assignedZones.map((z) => (
                            <div key={`${z.center}-${z.zone}-${z.sector}`} className="rounded-2xl border border-zinc-200 bg-white/60 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5">
                              <div className="font-medium">{z.center}</div>
                              <div className="text-xs text-zinc-600 dark:text-zinc-300">
                                {z.zone} · {z.sector}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}

                {tab === "agents" ? (
                  <div className="space-y-6">
                    <section className={`${cardClassName} p-6`}>
                      <h1 className="text-2xl font-semibold tracking-tight">Créer un agent</h1>
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                        L’agent sera rattaché à une zone autorisée (parmi tes zones assignées).
                      </p>

                      {assignedZones.length === 0 ? (
                        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                          Aucune zone ne t’est affectée. Demande à l’admin de t’affecter au moins une zone.
                        </div>
                      ) : null}

                      <form onSubmit={onCreateAgent} className="mt-5 grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Téléphone *</label>
                          <input className={inputClassName} value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Nom *</label>
                          <input className={inputClassName} value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Mot de passe initial *</label>
                          <input
                            className={inputClassName}
                            type="password"
                            value={form.password}
                            onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Zone *</label>
                          <select
                            className={inputClassName}
                            value={form.zoneKey}
                            onChange={(e) => setForm((s) => ({ ...s, zoneKey: e.target.value }))}
                          >
                            {assignedZones.map((z) => {
                              const key = `${z.center}|||${z.zone}|||${z.sector}`;
                              return (
                                <option key={key} value={key}>
                                  {z.center} / {z.zone} / {z.sector}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        <div className="sm:col-span-2 flex items-center justify-between gap-4">
                          <label className="flex items-center gap-3 text-sm">
                            <input
                              type="checkbox"
                              checked={form.isActive}
                              onChange={(e) => setForm((s) => ({ ...s, isActive: e.target.checked }))}
                            />
                            Actif
                          </label>

                          <button type="submit" disabled={busy || assignedZones.length === 0} className={primaryButtonClassName}>
                            {busy ? "Création…" : "Créer l’agent"}
                          </button>
                        </div>
                      </form>
                    </section>

                    <section className={`${cardClassName} p-6`}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-lg font-semibold">Mes agents</h2>
                        <button type="button" onClick={loadAgents} disabled={agentsBusy} className={secondaryButtonClassName}>
                          {agentsBusy ? "Actualisation…" : "Actualiser"}
                        </button>
                      </div>

                      {agentsBusy ? (
                        <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">Chargement…</div>
                      ) : agents.length === 0 ? (
                        <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">Aucun agent créé pour le moment.</div>
                      ) : (
                        <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/10">
                          <div className="grid grid-cols-12 gap-2 bg-zinc-50 px-4 py-3 text-xs font-semibold text-zinc-600 dark:bg-white/5 dark:text-zinc-300">
                            <div className="col-span-4">Nom</div>
                            <div className="col-span-3">Téléphone</div>
                            <div className="col-span-4">Zone</div>
                            <div className="col-span-1 text-right">Statut</div>
                          </div>
                          <div className="divide-y divide-zinc-200 dark:divide-white/10">
                            {agents.map((a) => (
                              <div key={a._id} className="grid grid-cols-12 gap-2 px-4 py-3 text-sm">
                                <div className="col-span-4 font-medium">{a.name ?? "(sans nom)"}</div>
                                <div className="col-span-3 text-zinc-700 dark:text-zinc-200">{a.phone}</div>
                                <div className="col-span-4 text-xs text-zinc-600 dark:text-zinc-300">
                                  {(a.center ?? "-") + " / " + (a.zone ?? "-") + " / " + (a.sector ?? "-")}
                                </div>
                                <div className="col-span-1 text-right">
                                  <span
                                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                                      a.isActive
                                        ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200"
                                        : "bg-zinc-100 text-zinc-700 dark:bg-white/10 dark:text-zinc-300"
                                    }`}
                                  >
                                    {a.isActive ? "Actif" : "Inactif"}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </section>
                  </div>
                ) : null}

                {tab === "tours" ? (
                  <div className="space-y-6">
                    <section className={`${cardClassName} p-6`}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h2 className="text-lg font-semibold">Générer des tournées</h2>
                          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                            Mode A: 1 tournée par zone/jour (1 agent). Mode B2: découpage par taille + répartition sur plusieurs agents.
                          </p>
                        </div>
                        <button
                          type="button"
                          className={secondaryButtonClassName}
                          onClick={async () => {
                            const qs = tourDate ? `?date=${encodeURIComponent(tourDate)}` : "";
                            const r = await downloadPdf(`/supervisor/tours/report.pdf${qs}`, `tours_${tourDate || "all"}.pdf`);
                            if (!r.ok) setMessage({ type: "error", text: r.error });
                          }}
                        >
                          Imprimer PDF
                        </button>
                      </div>

                      <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Date *</label>
                        <input className={inputClassName} type="date" value={tourDate} onChange={(e) => setTourDate(e.target.value)} />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Mode *</label>
                        <select className={inputClassName} value={tourMode} onChange={(e) => setTourMode(e.target.value as "A" | "B2" | "MANUAL")}>
                          <option value="A">A — 1 tournée / zone / jour</option>
                          <option value="B2">B2 — Découpage (maxMetersPerTour)</option>
                          <option value="MANUAL">MANUAL — Affectation par agent (nombre exact)</option>
                        </select>
                      </div>

                      <div className="space-y-2 sm:col-span-2">
                        <label className="text-sm font-medium">Zone *</label>
                        <select className={inputClassName} value={tourZoneKey} onChange={(e) => setTourZoneKey(e.target.value)}>
                          {assignedZones.map((z) => {
                            const key = `${z.center}|||${z.zone}|||${z.sector}`;
                            return (
                              <option key={key} value={key}>
                                {z.center} / {z.zone} / {z.sector}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {tourMode === "A" ? (
                        <div className="space-y-2 sm:col-span-2">
                          <label className="text-sm font-medium">Agent *</label>
                          <select className={inputClassName} value={tourAgentId} onChange={(e) => setTourAgentId(e.target.value)}>
                            <option value="">— sélectionner —</option>
                            {agents.map((a) => (
                              <option key={a._id} value={a._id}>
                                {(a.name ?? a.phone) + " — " + (a.center ?? "-") + "/" + (a.zone ?? "-") + "/" + (a.sector ?? "-")}
                              </option>
                            ))}
                          </select>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">Astuce: choisis l’agent rattaché à la zone.</div>
                        </div>
                      ) : tourMode === "B2" ? (
                        <>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Par taille *</label>
                            <input
                              className={inputClassName}
                              type="number"
                              min={1}
                              max={500}
                              value={maxMetersPerTour}
                              onChange={(e) => setMaxMetersPerTour(Number(e.target.value))}
                            />
                          </div>
                          <div className="space-y-2 sm:col-span-2">
                            <div className="text-sm font-medium">Agents (sélection) *</div>
                            {agents.length === 0 ? (
                              <div className="text-sm text-zinc-600 dark:text-zinc-300">Crée d’abord des agents.</div>
                            ) : (
                              <div className="grid gap-2 sm:grid-cols-2">
                                {agents.map((a) => {
                                  const checked = tourAgentIds.includes(a._id);
                                  return (
                                    <label
                                      key={a._id}
                                      className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white/60 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={(e) => {
                                          setTourAgentIds((s) =>
                                            e.target.checked ? [...s, a._id] : s.filter((id) => id !== a._id),
                                          );
                                        }}
                                      />
                                      <div>
                                        <div className="font-medium">{a.name ?? a.phone}</div>
                                        <div className="text-xs text-zinc-600 dark:text-zinc-300">
                                          {(a.center ?? "-") + " / " + (a.zone ?? "-") + " / " + (a.sector ?? "-")}
                                        </div>
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="space-y-2 sm:col-span-2">
                          <div className="text-sm font-medium">Affectation par agent *</div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            Saisis le nombre exact de compteurs à affecter à chaque agent. Le reste restera disponible.
                          </div>
                          {agents.length === 0 ? (
                            <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">Crée d’abord des agents.</div>
                          ) : (
                            <>
                              <div className="mt-3 grid gap-3 sm:grid-cols-[180px_1fr_160px]">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Nombre</label>
                                  <input
                                    className={inputClassName}
                                    type="number"
                                    min={1}
                                    max={500}
                                    value={manualCount}
                                    onChange={(e) => setManualCount(Number(e.target.value))}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Agent</label>
                                  <select className={inputClassName} value={manualAgentId} onChange={(e) => setManualAgentId(e.target.value)}>
                                    <option value="">— sélectionner —</option>
                                    {agents.map((a) => (
                                      <option key={a._id} value={a._id}>
                                        {(a.name ?? a.phone) + " — " + (a.center ?? "-") + "/" + (a.zone ?? "-") + "/" + (a.sector ?? "-")}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="flex items-end">
                                  <button
                                    type="button"
                                    className={`w-full ${secondaryButtonClassName}`}
                                    onClick={() => {
                                      const count = Number(manualCount);
                                      if (!manualAgentId) return;
                                      if (!Number.isFinite(count) || count <= 0) return;
                                      setManualCountsByAgent((s) => ({ ...s, [manualAgentId]: count }));
                                      setManualAgentId("");
                                    }}
                                  >
                                    Ajouter
                                  </button>
                                </div>
                              </div>

                              <div className="mt-4">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="text-sm font-medium">Affectations</div>
                                  <button
                                    type="button"
                                    className={secondaryButtonClassName}
                                    onClick={() => setManualCountsByAgent({})}
                                    disabled={Object.keys(manualCountsByAgent).length === 0}
                                  >
                                    Réinitialiser
                                  </button>
                                </div>

                                {Object.keys(manualCountsByAgent).length === 0 ? (
                                  <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">Aucune affectation pour le moment.</div>
                                ) : (
                                  <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/10">
                                    <div className="grid grid-cols-12 gap-2 bg-zinc-50 px-4 py-3 text-xs font-semibold text-zinc-600 dark:bg-white/5 dark:text-zinc-300">
                                      <div className="col-span-7">Agent</div>
                                      <div className="col-span-3">Nombre</div>
                                      <div className="col-span-2 text-right">Actions</div>
                                    </div>
                                    <div className="divide-y divide-zinc-200 dark:divide-white/10">
                                      {Object.entries(manualCountsByAgent).map(([agentId, count]) => {
                                        const a = agents.find((x) => x._id === agentId);
                                        return (
                                          <div key={agentId} className="grid grid-cols-12 gap-2 px-4 py-3 text-sm">
                                            <div className="col-span-7 font-medium">{a?.name ?? a?.phone ?? agentId}</div>
                                            <div className="col-span-3 text-zinc-700 dark:text-zinc-200">{count}</div>
                                            <div className="col-span-2 text-right">
                                              <button
                                                type="button"
                                                className="text-xs font-semibold text-red-700 hover:underline dark:text-red-300"
                                                onClick={() =>
                                                  setManualCountsByAgent((s) => {
                                                    const next = { ...s };
                                                    delete next[agentId];
                                                    return next;
                                                  })
                                                }
                                              >
                                                Supprimer
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      <div className="sm:col-span-2">
                        <button
                          type="button"
                          onClick={() => void generateTours()}
                          disabled={toursBusy || assignedZones.length === 0}
                          className={`w-full ${primaryButtonClassName}`}
                        >
                          {toursBusy ? "Génération…" : "Générer"}
                        </button>
                      </div>
                      </div>
                    </section>

                    <section className={`${cardClassName} p-6`}>
                      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <div>
                          <h2 className="text-lg font-semibold">Tournées générées</h2>
                          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Affichées pour la date sélectionnée.</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => void loadTours()}
                          disabled={toursListBusy}
                          className={secondaryButtonClassName}
                        >
                          {toursListBusy ? "Actualisation…" : "Actualiser"}
                        </button>
                      </div>

                      {toursListBusy ? (
                        <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">Chargement…</div>
                      ) : tours.length === 0 ? (
                        <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">
                          Aucune tournée trouvée pour cette date.
                        </div>
                      ) : (
                        <div className="mt-4 space-y-3">
                          {tours.map((t) => {
                            const expanded = expandedTourId === t._id;
                            const agentLabel = agents.find((a) => a._id === t.agentId)?.name ?? t.agentId;
                            return (
                              <div key={t._id} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white/60 dark:border-white/10 dark:bg-white/5">
                                <button
                                  type="button"
                                  className="flex w-full items-start justify-between gap-4 px-4 py-3 text-left"
                                  onClick={() => setExpandedTourId((s) => (s === t._id ? null : t._id))}
                                >
                                  <div>
                                    <div className="text-sm font-semibold">
                                      {t.center} / {t.zone} / {t.sector}
                                    </div>
                                    <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                                      Date: {t.date} · Agent: {agentLabel} · Compteurs: {t.items?.length ?? 0}
                                    </div>
                                  </div>
                                  <div className="text-xs font-bold text-zinc-500 dark:text-zinc-400">{expanded ? "—" : "+"}</div>
                                </button>

                                {expanded ? (
                                  <div className="border-t border-zinc-200 px-4 py-3 text-sm dark:border-white/10">
                                    <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-white/10">
                                      <div className="grid grid-cols-12 gap-2 bg-zinc-50 px-3 py-2 text-[11px] font-semibold text-zinc-600 dark:bg-white/5 dark:text-zinc-300">
                                        <div className="col-span-2">Ordre</div>
                                        <div className="col-span-5">Compteur</div>
                                        <div className="col-span-5">Ancien index</div>
                                      </div>
                                      <div className="divide-y divide-zinc-200 dark:divide-white/10">
                                        {(t.items ?? []).map((it, idx) => (
                                          <div key={`${t._id}-${it.meterNumber}-${idx}`} className="grid grid-cols-12 gap-2 px-3 py-2 text-xs">
                                            <div className="col-span-2 text-zinc-600 dark:text-zinc-300">{it.routeOrder ?? "—"}</div>
                                            <div className="col-span-5 font-medium">{it.meterNumber}</div>
                                            <div className="col-span-5 text-zinc-600 dark:text-zinc-300">
                                              {typeof it.oldIndex === "number" ? it.oldIndex : "—"}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  </div>
                ) : null}

                {tab === "readings" ? (
                  <section className={`${cardClassName} p-6`}>
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                      <div>
                        <h2 className="text-lg font-semibold">Relevés</h2>
                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Relevés validés par les agents (par date).</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button type="button" onClick={() => void loadReadings()} className={secondaryButtonClassName} disabled={readingsBusy}>
                          {readingsBusy ? "Actualisation…" : "Actualiser"}
                        </button>
                        <button
                          type="button"
                          className={secondaryButtonClassName}
                          onClick={async () => {
                            const qs = readingsDate ? `?date=${encodeURIComponent(readingsDate)}` : "";
                            const r = await downloadPdf(`/supervisor/readings/report.pdf${qs}`, `releves_${readingsDate || "all"}.pdf`);
                            if (!r.ok) setMessage({ type: "error", text: r.error });
                          }}
                        >
                          Imprimer PDF
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Date</label>
                        <input className={inputClassName} type="date" value={readingsDate} onChange={(e) => setReadingsDate(e.target.value)} />
                      </div>
                      <div className="flex items-end">
                        <button type="button" onClick={() => void loadReadings()} className={`w-full ${secondaryButtonClassName}`}>
                          Appliquer
                        </button>
                      </div>
                    </div>

                    <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/10">
                      <table className="w-full text-sm">
                        <thead className="bg-zinc-50 text-left text-xs text-zinc-500 dark:bg-white/5 dark:text-zinc-400">
                          <tr>
                            <th className="px-4 py-3 font-semibold">Date</th>
                            <th className="px-4 py-3 font-semibold">Centre</th>
                            <th className="px-4 py-3 font-semibold">Zone</th>
                            <th className="px-4 py-3 font-semibold">Compteur</th>
                            <th className="px-4 py-3 font-semibold">Ancien</th>
                            <th className="px-4 py-3 font-semibold">Nouveau</th>
                            <th className="px-4 py-3 font-semibold">Conso</th>
                            <th className="px-4 py-3 font-semibold">Tarif</th>
                            <th className="px-4 py-3 font-semibold">Montant</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 bg-white/70 dark:divide-white/10 dark:bg-black/30">
                          {readings.length ? (
                            readings.map((r) => (
                              <tr key={r._id}>
                                <td className="px-4 py-3">{r.date}</td>
                                <td className="px-4 py-3">{r.center ?? "—"}</td>
                                <td className="px-4 py-3">{r.zone ?? "—"}</td>
                                <td className="px-4 py-3">{r.meterNumber}</td>
                                <td className="px-4 py-3">{r.oldIndex ?? "—"}</td>
                                <td className="px-4 py-3">{r.newIndex}</td>
                                <td className="px-4 py-3">{r.consumption ?? "—"}</td>
                                <td className="px-4 py-3">{r.tariffCode ?? "—"}</td>
                                <td className="px-4 py-3">{r.amount != null ? `${r.amount} FCFA` : "—"}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td className="px-4 py-3" colSpan={9}>
                                {readingsBusy ? "Chargement…" : "Aucun relevé."}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>
                ) : null}

                {tab === "customers" ? (
                  <section className={`${cardClassName} p-6`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold">Mes clients</h2>
                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Clients présents dans tes zones assignées.</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button type="button" onClick={loadCustomers} disabled={customersBusy} className={secondaryButtonClassName}>
                          {customersBusy ? "Actualisation…" : "Actualiser"}
                        </button>
                        <button
                          type="button"
                          className={secondaryButtonClassName}
                          onClick={async () => {
                            const r = await downloadPdf(`/supervisor/customers/report.pdf`, `clients.pdf`);
                            if (!r.ok) setMessage({ type: "error", text: r.error });
                          }}
                        >
                          Imprimer PDF
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <input
                        className={inputClassName}
                        placeholder="Rechercher (téléphone/nom/compteur)"
                        value={customersQuery}
                        onChange={(e) => setCustomersQuery(e.target.value)}
                      />
                      <div className="sm:col-span-2 flex items-center justify-end gap-2">
                        <button type="button" onClick={loadCustomers} disabled={customersBusy} className={primaryButtonClassName}>
                          Appliquer
                        </button>
                      </div>
                    </div>

                    {customersBusy ? (
                      <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">Chargement…</div>
                    ) : customers.length === 0 ? (
                      <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">Aucun client trouvé.</div>
                    ) : (
                      <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/10">
                        <div className="grid grid-cols-12 gap-2 bg-zinc-50 px-4 py-3 text-xs font-semibold text-zinc-600 dark:bg-white/5 dark:text-zinc-300">
                          <div className="col-span-3">Nom</div>
                          <div className="col-span-2">Téléphone</div>
                          <div className="col-span-2">Compteur</div>
                          <div className="col-span-3">Zone</div>
                          <div className="col-span-2 text-right">Statut</div>
                        </div>
                        <div className="divide-y divide-zinc-200 dark:divide-white/10">
                          {customers.map((c) => (
                            <div key={c._id} className="grid grid-cols-12 gap-2 px-4 py-3 text-sm">
                              <div className="col-span-3 font-medium">{c.name ?? "(sans nom)"}</div>
                              <div className="col-span-2 text-zinc-700 dark:text-zinc-200">{c.phone}</div>
                              <div className="col-span-2 text-zinc-700 dark:text-zinc-200">{c.meterNumber ?? "-"}</div>
                              <div className="col-span-3 text-xs text-zinc-600 dark:text-zinc-300">
                                {(c.center ?? "-") + " / " + (c.zone ?? "-") + " / " + (c.sector ?? "-")}
                              </div>
                              <div className="col-span-2 text-right">
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                                    c.isActive
                                      ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200"
                                      : "bg-zinc-100 text-zinc-700 dark:bg-white/10 dark:text-zinc-300"
                                  }`}
                                >
                                  {c.isActive ? "Actif" : "Inactif"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </section>
                ) : null}

                {tab === "meters" ? (
                  <section className={`${cardClassName} p-6`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold">Mes compteurs (meters)</h2>
                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Compteurs rattachés à tes zones (ordre = routeOrder).</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button type="button" onClick={loadMeters} disabled={metersBusy} className={secondaryButtonClassName}>
                          {metersBusy ? "Actualisation…" : "Actualiser"}
                        </button>
                        <button
                          type="button"
                          className={secondaryButtonClassName}
                          onClick={async () => {
                            const r = await downloadPdf(`/supervisor/meters/report.pdf`, `compteurs.pdf`);
                            if (!r.ok) setMessage({ type: "error", text: r.error });
                          }}
                        >
                          Imprimer PDF
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <input
                        className={inputClassName}
                        placeholder="Rechercher (compteur/abonné/police)"
                        value={metersQuery}
                        onChange={(e) => setMetersQuery(e.target.value)}
                      />
                      <div className="sm:col-span-2 flex items-center justify-end gap-2">
                        <button type="button" onClick={loadMeters} disabled={metersBusy} className={primaryButtonClassName}>
                          Appliquer
                        </button>
                      </div>
                    </div>

                    {metersBusy ? (
                      <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">Chargement…</div>
                    ) : meters.length === 0 ? (
                      <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">Aucun compteur trouvé.</div>
                    ) : (
                      <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/10">
                        <div className="grid grid-cols-12 gap-2 bg-zinc-50 px-4 py-3 text-xs font-semibold text-zinc-600 dark:bg-white/5 dark:text-zinc-300">
                          <div className="col-span-3">Compteur</div>
                          <div className="col-span-2">Ordre</div>
                          <div className="col-span-3">Zone</div>
                          <div className="col-span-4">Infos</div>
                        </div>
                        <div className="divide-y divide-zinc-200 dark:divide-white/10">
                          {meters.map((m) => (
                            <div key={m._id} className="grid grid-cols-12 gap-2 px-4 py-3 text-sm">
                              <div className="col-span-3 font-medium">{m.meterNumber}</div>
                              <div className="col-span-2 text-zinc-700 dark:text-zinc-200">{m.routeOrder ?? "-"}</div>
                              <div className="col-span-3 text-xs text-zinc-600 dark:text-zinc-300">
                                {(m.center ?? "-") + " / " + (m.zone ?? "-") + " / " + (m.sector ?? "-")}
                              </div>
                              <div className="col-span-4 text-xs text-zinc-600 dark:text-zinc-300">
                                {(m.subscriberNumber ? `Abonné: ${m.subscriberNumber}` : "") + (m.police ? ` · Police: ${m.police}` : "")}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </section>
                ) : null}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

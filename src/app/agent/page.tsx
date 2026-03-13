"use client";

import { useEffect, useMemo, useState } from "react";

type Role = "admin" | "supervisor" | "agent" | "customer";

type TokenPayload = {
  role?: Role;
  sub?: string;
  exp?: number;
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

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("nigelec_access_token");
}

type ReadingForm = {
  meterNumber: string;
  indexValue: string;
  oldIndexValue: string;
  note: string;
};

type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number | null };

type PendingReading = {
  id: string;
  createdAt: string;
  payload: {
    tourId: string;
    date: string;
    meterNumber: string;
    newIndex: number;
    gps: any;
    gpsMissing: boolean;
    gpsMissingReason: string;
  };
};

const PENDING_DB = "nigelec_agent_db";
const PENDING_STORE = "pending_readings";

function openAgentDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(PENDING_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(PENDING_STORE)) {
        db.createObjectStore(PENDING_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB error"));
  });
}

async function idbPutPending(item: PendingReading): Promise<void> {
  const db = await openAgentDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(PENDING_STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB tx error"));
    tx.objectStore(PENDING_STORE).put(item);
  });
  db.close();
}

async function idbListPending(): Promise<PendingReading[]> {
  const db = await openAgentDb();
  const items = await new Promise<PendingReading[]>((resolve, reject) => {
    const tx = db.transaction(PENDING_STORE, "readonly");
    const req = tx.objectStore(PENDING_STORE).getAll();
    req.onsuccess = () => resolve((req.result ?? []) as PendingReading[]);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB getAll error"));
  });
  db.close();
  return items;
}

async function idbDeletePending(id: string): Promise<void> {
  const db = await openAgentDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(PENDING_STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB tx error"));
    tx.objectStore(PENDING_STORE).delete(id);
  });
  db.close();
}

function randomId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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

type OcrState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "ok"; proposedIndex: string; confidence: number }
  | { status: "error"; error: string };

type TourMeterItem = {
  meterId?: string | null;
  meterNumber: string;
  routeOrder?: number | null;
  oldIndex?: number | null;
  selfSubmittedByCustomer?: boolean;
  selfSubmittedAt?: string | null;
};

type TourPublic = {
  _id: string;
  date: string;
  center: string;
  zone: string;
  sector: string;
  agentId: string;
  items: TourMeterItem[];
  createdAt: string;
  updatedAt: string;
};

type CorrectionStatus = "NONE" | "PENDING_SUPERVISOR" | "APPROVED" | "REJECTED";

type AgentReadingSummaryItem = {
  tourId: string;
  meterNumber: string;
  date: string;
};

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
  source?: "AGENT" | "CUSTOMER" | null;
  correctionStatus?: "NONE" | "PENDING_SUPERVISOR" | "APPROVED" | "REJECTED" | null;
  createdAt: string;
  updatedAt: string;
};

type RecentHistoryRow = {
  key: string;
  meterNumber: string;
  indexValue: string;
  statusLabel: "Sync OK" | "En attente";
  createdAt: string;
};

type TabKey = "overview" | "tours" | "reading" | "sync";

type PortalSettings = {
  logoUrl: string;
};

export default function AgentDashboardPage() {
  const inputClassName =
    "h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm shadow-xs outline-none transition placeholder:text-zinc-400 focus:border-red-400 focus:ring-4 focus:ring-red-600/10 dark:border-white/10 dark:bg-white/5 dark:placeholder:text-zinc-500 dark:focus:border-red-500/50 dark:focus:ring-red-500/10";

  const cardClassName =
    "rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-white/8 dark:bg-zinc-900/60";

  const primaryButtonClassName =
    "inline-flex h-10 items-center justify-center rounded-xl bg-red-600 px-4 text-sm font-semibold text-white shadow-xs transition hover:bg-red-700 active:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60";

  const secondaryButtonClassName =
    "inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800 shadow-xs transition hover:bg-zinc-50 hover:border-zinc-300 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10";

  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState("/nigelec-logo.svg");
  const payload = useMemo(() => (token ? decodeJwtPayload(token) : null), [token]);
  const role = payload?.role;

  const [form, setForm] = useState<ReadingForm>({ meterNumber: "", indexValue: "", oldIndexValue: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [ocr, setOcr] = useState<OcrState>({ status: "idle" });
  // selectedTourId moved above with tours state
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "getting" | "ok" | "error">("idle");
  const [geoError, setGeoError] = useState<string | null>(null);
  const [gpsMissing, setGpsMissing] = useState(false);
  const [gpsMissingReason, setGpsMissingReason] = useState("");

  const [toursDate, setToursDate] = useState<string>("");
  const [toursBusy, setToursBusy] = useState(false);
  const [tours, setTours] = useState<TourPublic[]>([]);
  const [previousToursInfo, setPreviousToursInfo] = useState<string | null>(null);
  const [previousToursTargetDate, setPreviousToursTargetDate] = useState<string | null>(null);
  const [selectedTourId, setSelectedTourId] = useState<string | null>(null);
  const [selectedMeter, setSelectedMeter] = useState<TourMeterItem | null>(null);
  const [editingReadingId, setEditingReadingId] = useState<string | null>(null);

  const [readSummaryBusy, setReadSummaryBusy] = useState(false);
  const [readKeySet, setReadKeySet] = useState<Set<string>>(new Set());
  const [correctionStatusByKey, setCorrectionStatusByKey] = useState<Record<string, CorrectionStatus>>({});

  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const [recentHistoryBusy, setRecentHistoryBusy] = useState(false);
  const [recentHistory, setRecentHistory] = useState<RecentHistoryRow[]>([]);

  const [tab, setTab] = useState<TabKey>("overview");

  async function refreshPendingCount() {
    try {
      const items = await idbListPending();
      setPendingCount(items.length);
    } catch {
      setPendingCount(0);
    }
  }

  async function requestCorrectionForMeter(tourId: string, it: TourMeterItem) {
    setMessage(null);
    setBusy(true);
    try {
      const params = new URLSearchParams();
      params.set("tourId", tourId);
      params.set("meterNumber", it.meterNumber);
      params.set("limit", "5");
      const res = await apiFetch<ReadingRow[]>(`/agent/readings?${params.toString()}`, { method: "GET" });
      if (!res.ok) {
        setMessage({ type: "error", text: res.error });
        return;
      }

      const row = (res.data ?? [])[0];
      if (!row) {
        setMessage({ type: "error", text: "Aucun relevé trouvé pour ce compteur." });
        return;
      }
      if ((row.source ?? "AGENT") !== "AGENT") {
        setMessage({ type: "error", text: "Correction possible uniquement pour les relevés agent." });
        return;
      }
      if (row.correctionStatus === "PENDING_SUPERVISOR") {
        setMessage({ type: "ok", text: "Une correction est déjà en attente de validation superviseur." });
        return;
      }

      const proposedRaw = window.prompt("Nouvel index proposé", String(row.newIndex));
      if (proposedRaw === null) return;
      const proposed = Number(proposedRaw.trim());
      if (!Number.isFinite(proposed) || proposed < 0) {
        setMessage({ type: "error", text: "Index proposé invalide." });
        return;
      }

      const reason = window.prompt("Motif de correction (obligatoire)", "Erreur de saisie d'un chiffre");
      if (reason === null) return;
      if (!reason.trim() || reason.trim().length < 3) {
        setMessage({ type: "error", text: "Motif de correction trop court." });
        return;
      }

      const req = await apiFetch<ReadingRow>(`/agent/readings/${row._id}/correction-request`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposedNewIndex: proposed, reason: reason.trim() }),
      });
      if (!req.ok) {
        setMessage({ type: "error", text: req.error });
        return;
      }

      setMessage({ type: "ok", text: "Demande de correction envoyée au superviseur pour validation." });
      void loadReadSummary();
      void loadRecentHistory();
    } finally {
      setBusy(false);
    }
  }

  async function syncPendingReadings() {
    if (syncing) return;
    setSyncing(true);
    try {
      const items = await idbListPending();
      for (const it of items) {
        const res = await apiFetch<{ _id: string }>("/agent/readings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(it.payload),
        });
        const isTrueDuplicate = !res.ok && res.status === 409 && !res.error.toLowerCase().includes("cycle");
        if (res.ok || isTrueDuplicate) {
          await idbDeletePending(it.id);
        }
      }
    } finally {
      await refreshPendingCount();
      void loadRecentHistory();
      setSyncing(false);
    }
  }

  async function loadRecentHistory() {
    setRecentHistoryBusy(true);
    try {
      const [pending, readingsRes] = await Promise.all([
        idbListPending().catch(() => [] as PendingReading[]),
        apiFetch<ReadingRow[]>(`/agent/readings?limit=10`, { method: "GET" }),
      ]);

      const rows: RecentHistoryRow[] = [];

      if (readingsRes.ok) {
        for (const r of readingsRes.data ?? []) {
          rows.push({
            key: `srv::${r._id}`,
            meterNumber: String(r.meterNumber ?? ""),
            indexValue: String((r as any).newIndex ?? ""),
            statusLabel: "Sync OK",
            createdAt: String(r.createdAt ?? ""),
          });
        }
      }

      for (const p of pending ?? []) {
        rows.push({
          key: `pend::${p.id}`,
          meterNumber: String(p.payload?.meterNumber ?? ""),
          indexValue: String(p.payload?.newIndex ?? ""),
          statusLabel: "En attente",
          createdAt: String(p.createdAt ?? ""),
        });
      }

      rows.sort((a, b) => {
        const da = new Date(a.createdAt).getTime();
        const db = new Date(b.createdAt).getTime();
        return db - da;
      });

      setRecentHistory(rows.slice(0, 10));
    } finally {
      setRecentHistoryBusy(false);
    }
  }

  async function loadTours(dateOverride?: string) {
    setToursBusy(true);
    try {
      const effectiveDate = (dateOverride ?? toursDate).trim() || new Date().toISOString().slice(0, 10);
      const params = new URLSearchParams();
      if (effectiveDate) params.set("date", effectiveDate);
      params.set("limit", "200");
      const qs = params.toString();
      const res = await apiFetch<TourPublic[]>(`/agent/tours${qs ? `?${qs}` : ""}`, { method: "GET" });
      if (!res.ok) {
        setMessage({ type: "error", text: res.error });
        return;
      }
      setTours(res.data);
      if ((res.data ?? []).length === 0 && effectiveDate) {
        await loadPreviousToursInfo(effectiveDate);
      } else {
        setPreviousToursInfo(null);
        setPreviousToursTargetDate(null);
      }
      if (res.data.length === 1) {
        setSelectedTourId(res.data[0]._id);
      }
    } finally {
      setToursBusy(false);
    }
  }

  async function loadPreviousToursInfo(currentDate: string) {
    const [allToursRes, allSummaryRes] = await Promise.all([
      apiFetch<TourPublic[]>("/agent/tours?limit=200", { method: "GET" }),
      apiFetch<AgentReadingSummaryItem[]>("/agent/readings/summary?limit=20000", { method: "GET" }),
    ]);

    if (!allToursRes.ok || !allSummaryRes.ok) {
      setPreviousToursInfo(null);
      setPreviousToursTargetDate(null);
      return;
    }

    const previousTours = (allToursRes.data ?? []).filter((t) => typeof t.date === "string" && t.date < currentDate);
    if (previousTours.length === 0) {
      setPreviousToursInfo("Aucune tournée antérieure.");
      setPreviousToursTargetDate(null);
      return;
    }

    const readSet = new Set<string>();
    for (const it of allSummaryRes.data ?? []) {
      readSet.add(`${it.tourId}::${it.meterNumber}`);
    }

    let openCount = 0;
    let closedCount = 0;
    let latestDate = "";
    let latestOpenDate = "";

    for (const t of previousTours) {
      if (!latestDate || t.date > latestDate) latestDate = t.date;
      const total = (t.items ?? []).length;
      const handled = (t.items ?? []).reduce((acc, it) => {
        const done = readSet.has(`${t._id}::${it.meterNumber}`) || Boolean(it.selfSubmittedByCustomer);
        return acc + (done ? 1 : 0);
      }, 0);
      if (total > 0 && handled >= total) closedCount += 1;
      else {
        openCount += 1;
        if (!latestOpenDate || t.date > latestOpenDate) latestOpenDate = t.date;
      }
    }

    setPreviousToursInfo(`Tournées antérieures: ${openCount} en cours, ${closedCount} clôturées (dernière date: ${latestDate}).`);
    setPreviousToursTargetDate(latestOpenDate || latestDate || null);
  }

  async function loadReadSummary(dateOverride?: string) {
    setReadSummaryBusy(true);
    try {
      const effectiveDate = (dateOverride ?? toursDate).trim() || new Date().toISOString().slice(0, 10);
      const params = new URLSearchParams();
      if (effectiveDate) params.set("date", effectiveDate);
      params.set("limit", "20000");
      const qs = params.toString();
      const res = await apiFetch<AgentReadingSummaryItem[]>(`/agent/readings/summary${qs ? `?${qs}` : ""}`, {
        method: "GET",
      });
      if (!res.ok) {
        setReadKeySet(new Set());
        setCorrectionStatusByKey({});
        return;
      }
      const s = new Set<string>();
      for (const it of res.data) {
        s.add(`${it.tourId}::${it.meterNumber}`);
      }
      setReadKeySet(s);

      const readingsParams = new URLSearchParams();
      if (effectiveDate) readingsParams.set("date", effectiveDate);
      readingsParams.set("limit", "1000");
      const readingsRes = await apiFetch<ReadingRow[]>(`/agent/readings?${readingsParams.toString()}`, {
        method: "GET",
      });
      if (!readingsRes.ok) {
        setCorrectionStatusByKey({});
        return;
      }

      const statusMap: Record<string, CorrectionStatus> = {};
      for (const row of readingsRes.data ?? []) {
        const k = `${row.tourId}::${row.meterNumber}`;
        statusMap[k] = row.correctionStatus ?? "NONE";
      }
      setCorrectionStatusByKey(statusMap);
    } finally {
      setReadSummaryBusy(false);
    }
  }

  function isMeterRead(tourId: string, meterNumber: string): boolean {
    return readKeySet.has(`${tourId}::${meterNumber}`);
  }

  function isMeterHandled(tourId: string, item: TourMeterItem): boolean {
    if (isMeterRead(tourId, item.meterNumber)) return true;
    return Boolean(item.selfSubmittedByCustomer);
  }

  function getCorrectionStatus(tourId: string, meterNumber: string): CorrectionStatus {
    return correctionStatusByKey[`${tourId}::${meterNumber}`] ?? "NONE";
  }

  useEffect(() => {
    setMounted(true);
    setToken(getToken());

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

  useEffect(() => {
    if (!mounted) return;
    if (!token) {
      window.location.href = "/login";
      return;
    }

    if (role && role !== "agent") {
      if (role === "admin") window.location.href = "/admin";
      else if (role === "customer") window.location.href = "/customer";
      else window.location.href = "/";
    }
  }, [mounted, role, token]);

  useEffect(() => {
    if (!mounted || !token) return;
    if (role && role !== "agent") return;
    void loadTours();
    void loadReadSummary();
    void refreshPendingCount();
    void loadRecentHistory();
    const onOnline = () => void syncPendingReadings();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, token]);

  function runOcrSimulation(file: File) {
    setOcr({ status: "running" });

    const timer = window.setTimeout(() => {
      const proposed = String(Math.floor(10000 + Math.random() * 90000));
      const confidence = Math.min(0.96, Math.max(0.55, 0.6 + Math.random() * 0.35));
      setOcr({ status: "ok", proposedIndex: proposed, confidence });
      setForm((s) => ({
        ...s,
        indexValue: s.indexValue.trim() ? s.indexValue : proposed,
      }));
    }, 900);

    return () => window.clearTimeout(timer);
  }

  function ocrLabel(state: OcrState): string {
    if (state.status === "idle") return "En attente de photo";
    if (state.status === "running") return "OCR en cours…";
    if (state.status === "error") return "OCR échoué";
    const pct = Math.round(state.confidence * 100);
    if (pct >= 85) return `Bonne confiance (${pct}%)`;
    if (pct >= 70) return `Confiance moyenne (${pct}%)`;
    return `Faible confiance (${pct}%)`;
  }

  function captureGeolocation(): Promise<boolean> {
    setGeoError(null);
    setGeoStatus("getting");

    if (typeof window === "undefined" || !navigator.geolocation) {
      setGeoStatus("error");
      setGeoError("Géolocalisation non supportée sur cet appareil.");
      return Promise.resolve(false);
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
          setGeoStatus("ok");
          resolve(true);
        },
        (err) => {
          setGeoStatus("error");
          setGeoError(err.message || "Impossible de récupérer la position.");
          resolve(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }

  function selectMeter(tourId: string, it: TourMeterItem) {
    setSelectedTourId(tourId);
    setSelectedMeter(it);
    setEditingReadingId(null);
    setMessage(null);
    setGpsMissing(false);
    setGpsMissingReason("");
    setForm((s) => ({
      ...s,
      meterNumber: it.meterNumber,
      oldIndexValue: typeof it.oldIndex === "number" ? String(it.oldIndex) : "",
      note: it.routeOrder != null ? `Ordre: ${it.routeOrder}` : "",
    }));
  }

  async function startEditReading(tourId: string, it: TourMeterItem) {
    setMessage(null);
    setBusy(true);
    try {
      const params = new URLSearchParams();
      const selectedTour = tours.find((tour) => tour._id === tourId);
      if (selectedTour?.date) params.set("date", selectedTour.date);
      params.set("tourId", tourId);
      params.set("meterNumber", it.meterNumber);
      params.set("limit", "5");
      const res = await apiFetch<ReadingRow[]>(`/agent/readings?${params.toString()}`, { method: "GET" });
      if (!res.ok) {
        setMessage({ type: "error", text: res.error });
        return;
      }
      const found = (res.data ?? [])[0];
      if (!found?._id) {
        setMessage({ type: "error", text: "Relevé introuvable pour ce compteur." });
        return;
      }

      setSelectedTourId(tourId);
      setSelectedMeter(it);
      setEditingReadingId(found._id);
      setTab("reading");
      setForm((s) => ({
        ...s,
        meterNumber: it.meterNumber,
        oldIndexValue: typeof found.oldIndex === "number" ? String(found.oldIndex) : typeof it.oldIndex === "number" ? String(it.oldIndex) : "",
        indexValue: String(found.newIndex ?? ""),
        note: it.routeOrder != null ? `Ordre: ${it.routeOrder}` : "",
      }));
    } finally {
      setBusy(false);
    }
  }

  async function submitReading(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setGpsMissing(false);
    setGpsMissingReason("");

    if (!form.meterNumber.trim()) {
      setMessage({ type: "error", text: "N° compteur est requis." });
      return;
    }

    if (!editingReadingId && !photoFile) {
      setMessage({ type: "error", text: "Photo obligatoire (pas de validation sans photo)." });
      return;
    }

    if (!form.indexValue.trim()) {
      setMessage({ type: "error", text: "Index obligatoire (proposé par OCR puis corrigé si besoin)." });
      return;
    }

    if (!selectedTourId) {
      setMessage({ type: "error", text: "Sélectionne d'abord un compteur depuis une tournée." });
      return;
    }

    const newIndex = Number(form.indexValue.trim());
    if (!Number.isFinite(newIndex) || newIndex < 0) {
      setMessage({ type: "error", text: "Index invalide." });
      return;
    }

    setBusy(true);
    try {
      const currentTour = tours.find((tour) => tour._id === selectedTourId);
      const readingDate = currentTour?.date || toursDate || new Date().toISOString().slice(0, 10);
      const ok = coords ? true : await captureGeolocation();
      if (!ok) {
        setGpsMissing(true);
      }

      const createPayload = {
        tourId: selectedTourId,
        date: readingDate,
        meterNumber: form.meterNumber.trim(),
        newIndex,
        gps: coords,
        gpsMissing: !ok,
        gpsMissingReason: !ok ? gpsMissingReason : "",
      };

      const updatePayload = {
        newIndex,
        gps: coords,
        gpsMissing: !ok,
        gpsMissingReason: !ok ? gpsMissingReason : "",
      };

      const res = await apiFetch<{ _id: string; consumption?: number | null }>(
        editingReadingId ? `/agent/readings/${editingReadingId}` : "/agent/readings",
        {
          method: editingReadingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editingReadingId ? updatePayload : createPayload),
        },
      );

      if (!res.ok) {
        if (res.status === null) {
          if (editingReadingId) {
            setMessage({ type: "error", text: "Réseau indisponible: impossible de modifier un relevé sans connexion." });
            return;
          }
          const item: PendingReading = {
            id: randomId("pending"),
            createdAt: new Date().toISOString(),
            payload: {
              tourId: selectedTourId,
              date: readingDate,
              meterNumber: form.meterNumber.trim(),
              newIndex,
              gps: coords,
              gpsMissing: !ok,
              gpsMissingReason: !ok ? gpsMissingReason : "",
            },
          };
          await idbPutPending(item);
          await refreshPendingCount();
          setMessage({ type: "ok", text: "Réseau indisponible: relevé enregistré localement. Il sera synchronisé dès que le réseau revient." });
          return;
        }
        if (res.status === 409) {
          if (res.error.toLowerCase().includes("cycle")) {
            setMessage({ type: "error", text: "Aucun cycle de facturation ouvert. L'administrateur doit ouvrir un cycle. Votre relevé peut être enregistré localement en attendant." });
          } else {
            await refreshPendingCount();
            setMessage({ type: "ok", text: "Relevé déjà présent sur le serveur (sync ok)." });
          }
          return;
        }
        setMessage({ type: "error", text: res.error });
        return;
      }

      const consumption = (res.data as any)?.consumption;
      setMessage({
        type: "ok",
        text: `${editingReadingId ? "Relevé modifié" : "Relevé enregistré"}. Consommation: ${typeof consumption === "number" ? consumption : "—"}`,
      });
      setForm({ meterNumber: "", indexValue: "", oldIndexValue: "", note: "" });
      setPhotoName(null);
      setPhotoFile(null);
      setOcr({ status: "idle" });
      setSelectedTourId(null);
      setSelectedMeter(null);
      setEditingReadingId(null);
      setCoords(null);
      setGeoStatus("idle");
      setGeoError(null);
      setGpsMissing(false);
      setGpsMissingReason("");

      void loadTours();
      void loadReadSummary();
      void syncPendingReadings();
    } finally {
      setBusy(false);
    }
  }

  const navItem = (key: TabKey, label: string, sub?: string) => {
    const active = tab === key;
    return (
      <button
        type="button"
        onClick={() => setTab(key)}
        className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold transition ${
          active
            ? "bg-red-600/10 text-red-700 dark:bg-red-500/15 dark:text-red-400"
            : "text-zinc-600 hover:bg-zinc-900/5 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-white/8 dark:hover:text-white"
        }`}
      >
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full transition ${
            active ? "bg-red-600 dark:bg-red-400" : "bg-zinc-300 dark:bg-zinc-600"
          }`}
        />
        <span>
          {label}
          {sub ? (
            <span className={`ml-2 text-xs font-medium ${active ? "text-red-500 dark:text-red-400" : "text-zinc-400 dark:text-zinc-500"}`}>{sub}</span>
          ) : null}
        </span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className={`self-start lg:sticky lg:top-20 ${cardClassName} p-4`}>
            <div className="flex items-center gap-3 px-1">
              <img src={logoUrl} alt="NIGELEC" className="h-8 w-auto" />
              <div>
                <div className="text-sm font-semibold tracking-wide">Agent Releveur</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">NIGELEC</div>
              </div>
            </div>

            <div className="mt-5 space-y-0.5">
              {navItem("overview", "Vue d’ensemble")}
              {navItem("tours", "Tournées", `${tours.length}`)}
              {navItem("reading", "Saisie relevé", selectedMeter?.meterNumber ?? undefined)}
              {navItem("sync", "Synchronisation", `${pendingCount}`)}
            </div>

            <div className="mt-4 h-px bg-zinc-200/80 dark:bg-white/8" />

            <div className="mt-4 grid gap-2">
              <a href="/" className={secondaryButtonClassName}>
                Accueil
              </a>
              <button
                type="button"
                className={primaryButtonClassName}
                onClick={() => {
                  localStorage.removeItem("nigelec_access_token");
                  window.location.href = "/";
                }}
              >
                Déconnexion
              </button>
            </div>
          </aside>

          <section className="min-w-0">
            {!mounted ? (
              <div className={`${cardClassName} p-6`}>
                <h1 className="text-xl font-semibold">Chargement…</h1>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">Vérification de la session.</p>
              </div>
            ) : !token ? (
              <div className={`${cardClassName} p-6`}>
                <h1 className="text-xl font-semibold">Accès requis</h1>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">Connecte-toi avec un compte agent.</p>
                <a href="/login" className={`mt-4 ${primaryButtonClassName}`}>
                  Aller au login
                </a>
              </div>
            ) : (
              <div className="space-y-6">
                {message ? (
                  <div
                    className={`rounded-xl border p-4 text-sm shadow-xs ${
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
                            <h1 className="text-2xl font-semibold tracking-tight">Espace Agent</h1>
                            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                              Tournées: {tours.length} · En attente de sync: {pendingCount}
                            </p>
                          </div>
                          <button
                            type="button"
                            className={secondaryButtonClassName}
                            onClick={() => {
                              void (async () => {
                                await loadTours();
                                await loadReadSummary();
                                await refreshPendingCount();
                                await loadRecentHistory();
                              })();
                            }}
                            disabled={toursBusy}
                          >
                            Actualiser
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <button
                          type="button"
                          className={`${cardClassName} p-5 text-left transition hover:bg-white/80 dark:hover:bg-white/10`}
                          onClick={() => setTab("tours")}
                        >
                          <div className="text-sm font-semibold">Voir mes tournées</div>
                          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Sélectionner un compteur</div>
                        </button>
                        <button
                          type="button"
                          className={`${cardClassName} p-5 text-left transition hover:bg-white/80 dark:hover:bg-white/10`}
                          onClick={() => setTab("reading")}
                        >
                          <div className="text-sm font-semibold">Saisie relevé</div>
                          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Photo + OCR + validation</div>
                        </button>
                        <button
                          type="button"
                          className={`${cardClassName} p-5 text-left transition hover:bg-white/80 dark:hover:bg-white/10`}
                          onClick={() => {
                            void syncPendingReadings();
                            setTab("sync");
                          }}
                        >
                          <div className="text-sm font-semibold">Synchroniser</div>
                          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Envoyer les relevés en attente</div>
                        </button>
                        <button
                          type="button"
                          className={`${cardClassName} p-5 text-left transition hover:bg-white/80 dark:hover:bg-white/10`}
                          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                        >
                          <div className="text-sm font-semibold">Aide rapide</div>
                          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Sélectionner → photo → valider</div>
                        </button>
                      </div>
                    </div>

                    <div className={`${cardClassName} p-6`}>
                      <div className="text-sm font-semibold">Synchronisation</div>
                      <div className="mt-3 space-y-2">
                        <div className="rounded-2xl border border-zinc-200 bg-white/60 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5">
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">En attente</div>
                          <div className="mt-1 text-lg font-semibold">{pendingCount}</div>
                        </div>
                        <button type="button" onClick={() => void syncPendingReadings()} disabled={syncing} className={primaryButtonClassName}>
                          {syncing ? "Synchronisation…" : "Synchroniser"}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}

                {tab === "tours" ? (
                  <section className={`${cardClassName} p-6`}>
              <h1 className="text-2xl font-semibold tracking-tight">Tournée du jour</h1>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                Liste des tournées assignées (données depuis la collection tours).
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <div className="rounded-2xl border border-zinc-200 bg-white/70 px-4 py-2 text-sm shadow-sm dark:border-white/10 dark:bg-black/30">
                  En attente de synchronisation: <span className="font-semibold">{pendingCount}</span>
                </div>
                <button
                  type="button"
                  onClick={() => void syncPendingReadings()}
                  disabled={syncing}
                  className="inline-flex h-10 items-center justify-center rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/10 dark:bg-white/5 dark:text-zinc-50 dark:hover:bg-white/10"
                >
                  {syncing ? "Synchronisation…" : "Synchroniser"}
                </button>
              </div>

              <div className="mt-4 flex items-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void (async () => {
                        await loadTours("");
                        await loadReadSummary("");
                      })();
                    }}
                    disabled={toursBusy}
                    className={primaryButtonClassName}
                  >
                    {toursBusy ? "Chargement…" : "Charger mes tournées"}
                  </button>
              </div>

              {toursBusy ? (
                <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">Chargement…</div>
              ) : tours.length === 0 ? (
                <div className="mt-4 space-y-2">
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                    Aucune tournée trouvée pour ce cycle.
                  </div>
                  {previousToursInfo ? (
                    <div className="rounded-2xl border border-zinc-200 bg-white/70 p-3 text-xs text-zinc-700 dark:border-white/10 dark:bg-black/30 dark:text-zinc-200">
                      <div>{previousToursInfo}</div>
                      {previousToursTargetDate ? (
                        <button
                          type="button"
                          className="mt-2 inline-flex h-8 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-900 transition hover:bg-zinc-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                          onClick={() => {
                            const targetDate = previousToursTargetDate;
                            setToursDate(targetDate);
                            void (async () => {
                              await loadTours(targetDate);
                              await loadReadSummary(targetDate);
                            })();
                          }}
                        >
                          Aller à la dernière date utile ({previousToursTargetDate})
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  {tours.map((t) => {
                    const open = selectedTourId ? selectedTourId === t._id : false;

                    const total = (t.items ?? []).length;
                    const readCount = (t.items ?? []).reduce(
                      (acc, it) => acc + (isMeterHandled(t._id, it) ? 1 : 0),
                      0,
                    );
                    const tourStatus: "done" | "partial" | "todo" =
                      total > 0 && readCount === total ? "done" : readCount > 0 ? "partial" : "todo";

                    const tourCardClassName =
                      tourStatus === "done"
                        ? "rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm dark:border-emerald-500/20 dark:bg-emerald-500/10"
                        : tourStatus === "partial"
                          ? "rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm dark:border-amber-500/20 dark:bg-amber-500/10"
                          : "rounded-2xl border border-zinc-200 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-black/30";

                    return (
                      <div key={t._id} className={tourCardClassName}>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold">
                              {t.center} / {t.zone} / {t.sector}
                            </div>
                            <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                              Date: {t.date} · Compteurs: {t.items?.length ?? 0} · Relevés: {readCount}/{total}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {tourStatus === "done" ? (
                              <span className="inline-flex items-center rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">
                                Déjà relevée
                              </span>
                            ) : tourStatus === "partial" ? (
                              <span className="inline-flex items-center rounded-full bg-amber-600 px-3 py-1 text-xs font-semibold text-white">
                                En cours
                              </span>
                            ) : readSummaryBusy ? (
                              <span className="inline-flex items-center rounded-full bg-zinc-700 px-3 py-1 text-xs font-semibold text-white">
                                Vérif…
                              </span>
                            ) : null}
                          <button
                            type="button"
                            onClick={() => setSelectedTourId((s) => (s === t._id ? null : t._id))}
                            className="inline-flex h-10 items-center justify-center rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-white/10 dark:bg-white/5 dark:text-zinc-50 dark:hover:bg-white/10"
                          >
                            {open ? "Masquer" : "Voir"}
                          </button>
                          </div>
                        </div>

                        {open ? (
                          <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/10">
                            <div className="grid grid-cols-12 gap-2 bg-zinc-50 px-4 py-3 text-xs font-semibold text-zinc-600 dark:bg-white/5 dark:text-zinc-300">
                              <div className="col-span-2">Ordre</div>
                              <div className="col-span-7">Compteur</div>
                              <div className="col-span-3 text-right">Action</div>
                            </div>
                            <div className="divide-y divide-zinc-200 dark:divide-white/10">
                              {(t.items ?? []).map((it, idx) => (
                                <div
                                  key={`${t._id}-${it.meterNumber}-${idx}`}
                                  className={`grid grid-cols-12 gap-2 px-4 py-3 text-sm ${
                                    isMeterHandled(t._id, it)
                                      ? "bg-emerald-50/60 dark:bg-emerald-500/10"
                                      : ""
                                  }`}
                                >
                                  <div className="col-span-2 text-zinc-700 dark:text-zinc-200">{it.routeOrder ?? "-"}</div>
                                  <div className="col-span-7 font-medium">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span>{it.meterNumber}</span>
                                      {isMeterRead(t._id, it.meterNumber) ? (
                                        <span className="inline-flex items-center rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                                          Déjà relevé
                                        </span>
                                      ) : null}
                                      {!isMeterRead(t._id, it.meterNumber) && it.selfSubmittedByCustomer ? (
                                        <span className="inline-flex items-center rounded-full bg-sky-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                                          Envoyé par client
                                        </span>
                                      ) : null}
                                      {isMeterRead(t._id, it.meterNumber) && getCorrectionStatus(t._id, it.meterNumber) === "PENDING_SUPERVISOR" ? (
                                        <span className="inline-flex items-center rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                                          Correction en attente
                                        </span>
                                      ) : null}
                                      {isMeterRead(t._id, it.meterNumber) && getCorrectionStatus(t._id, it.meterNumber) === "APPROVED" ? (
                                        <span className="inline-flex items-center rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                                          Correction validée
                                        </span>
                                      ) : null}
                                      {isMeterRead(t._id, it.meterNumber) && getCorrectionStatus(t._id, it.meterNumber) === "REJECTED" ? (
                                        <span className="inline-flex items-center rounded-full bg-rose-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                                          Correction rejetée
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>
                                  <div className="col-span-3 text-right">
                                    {isMeterRead(t._id, it.meterNumber) ? (
                                      getCorrectionStatus(t._id, it.meterNumber) === "PENDING_SUPERVISOR" ? (
                                        <span className="inline-flex h-9 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                                          En attente superviseur
                                        </span>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => void requestCorrectionForMeter(t._id, it)}
                                          className="inline-flex h-9 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:bg-emerald-500/20"
                                        >
                                          Corriger
                                        </button>
                                      )
                                    ) : it.selfSubmittedByCustomer ? (
                                      <span className="inline-flex h-9 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 px-3 text-xs font-semibold text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200">
                                        Tournée évitée
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => selectMeter(t._id, it)}
                                        className="inline-flex h-9 items-center justify-center rounded-xl bg-red-600 px-3 text-xs font-semibold text-white transition hover:bg-red-700"
                                      >
                                        Sélectionner
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
                ) : null}

                {tab === "reading" ? (
                  <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-zinc-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
                <h2 className="text-lg font-semibold">Saisie relevé</h2>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                  Photo → OCR → correction → validation → sync (MVP: simulation).
                </p>

                <div className="mt-5 rounded-2xl border border-zinc-200 bg-white/70 p-4 text-sm shadow-sm dark:border-white/10 dark:bg-black/30">
                  <div className="font-semibold">Géolocalisation</div>
                  <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">
                    {coords
                      ? `Lat: ${coords.lat.toFixed(6)} · Lng: ${coords.lng.toFixed(6)}${
                          typeof coords.accuracy === "number" ? ` · ±${Math.round(coords.accuracy)}m` : ""
                        }`
                      : "Non capturée"}
                  </div>
                  {geoStatus === "error" && geoError ? (
                    <div className="mt-2 text-xs font-semibold text-rose-700 dark:text-rose-200">{geoError}</div>
                  ) : null}
                  <button
                    type="button"
                    onClick={captureGeolocation}
                    disabled={geoStatus === "getting"}
                    className="mt-3 inline-flex h-10 items-center justify-center rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/10 dark:bg-white/5 dark:text-zinc-50 dark:hover:bg-white/10"
                  >
                    {geoStatus === "getting" ? "Localisation…" : coords ? "Rafraîchir la position" : "Capturer la position"}
                  </button>
                </div>

                {gpsMissing ? (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm shadow-sm dark:border-amber-500/20 dark:bg-amber-500/10">
                    <div className="font-semibold text-amber-900 dark:text-amber-200">GPS manquant</div>
                    <div className="mt-1 text-xs text-amber-800/80 dark:text-amber-200/80">
                      Autorisé à valider, mais on marque gpsMissing=true.
                    </div>
                    <div className="mt-3 space-y-2">
                      <label className="text-sm font-medium text-amber-900 dark:text-amber-200">Motif (optionnel)</label>
                      <input
                        className={inputClassName}
                        value={gpsMissingReason}
                        onChange={(e) => setGpsMissingReason(e.target.value)}
                        placeholder="Ex: refus GPS / réseau / zone couverte"
                      />
                    </div>
                  </div>
                ) : null}

                <form onSubmit={submitReading} className="mt-5 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">N° compteur *</label>
                    <input
                      className={inputClassName}
                      value={form.meterNumber}
                      onChange={(e) => setForm((s) => ({ ...s, meterNumber: e.target.value }))}
                      placeholder="Ex: MT-00012345"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Ancien index</label>
                    <input
                      className={inputClassName + " opacity-70"}
                      value={form.oldIndexValue}
                      disabled
                      placeholder="—"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Index *</label>
                    <input
                      className={inputClassName}
                      value={form.indexValue}
                      onChange={(e) => setForm((s) => ({ ...s, indexValue: e.target.value }))}
                      placeholder="Ex: 012345"
                      inputMode="numeric"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Photo compteur *</label>
                    <input
                      className={inputClassName}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        setPhotoName(f ? f.name : null);
                        setPhotoFile(f ?? null);
                        setOcr({ status: "idle" });
                        if (f) {
                          runOcrSimulation(f);
                        }
                      }}
                    />
                    {photoName ? (
                      <div className="text-xs text-zinc-600 dark:text-zinc-300">Sélectionné: {photoName}</div>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-zinc-200 bg-white/70 p-4 text-sm shadow-sm dark:border-white/10 dark:bg-black/30">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold">OCR</div>
                        <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">{ocrLabel(ocr)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={!photoFile || ocr.status === "running"}
                          onClick={() => {
                            if (!photoFile) return;
                            setForm((s) => ({ ...s, indexValue: "" }));
                            runOcrSimulation(photoFile);
                          }}
                          className="inline-flex h-10 items-center justify-center rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-zinc-50 dark:hover:bg-white/10"
                        >
                          Relancer OCR
                        </button>
                        <button
                          type="button"
                          disabled={!photoFile || busy}
                          onClick={() => {
                            setPhotoName(null);
                            setPhotoFile(null);
                            setOcr({ status: "idle" });
                            setForm((s) => ({ ...s, indexValue: "" }));
                          }}
                          className="inline-flex h-10 items-center justify-center rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-zinc-50 dark:hover:bg-white/10"
                        >
                          Effacer photo
                        </button>
                      </div>
                    </div>

                    {ocr.status === "ok" ? (
                      <div className="mt-4">
                        <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Proposition OCR</div>
                        <div className="mt-1 text-lg font-semibold">{ocr.proposedIndex}</div>
                        <div className="mt-3">
                          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-white/10">
                            <div
                              className={`h-full rounded-full ${
                                ocr.confidence >= 0.85
                                  ? "bg-emerald-500"
                                  : ocr.confidence >= 0.7
                                    ? "bg-amber-500"
                                    : "bg-rose-500"
                              }`}
                              style={{ width: `${Math.round(ocr.confidence * 100)}%` }}
                            />
                          </div>
                          <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">
                            {Math.round(ocr.confidence * 100)}% · Vérifie l’index avant validation.
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {ocr.status === "running" ? (
                      <div className="mt-4 text-xs text-zinc-600 dark:text-zinc-300">Analyse de la photo…</div>
                    ) : null}

                    {ocr.status === "error" ? (
                      <div className="mt-4 text-xs font-semibold text-rose-700 dark:text-rose-200">{ocr.error}</div>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Note</label>
                    <input
                      className={inputClassName}
                      value={form.note}
                      onChange={(e) => setForm((s) => ({ ...s, note: e.target.value }))}
                      placeholder="Ex: compteur inaccessible"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    className={`w-full ${primaryButtonClassName}`}
                  >
                    {busy ? "Enregistrement…" : "Valider le relevé"}
                  </button>
                </form>
              </div>

              <div className="space-y-6">
                <div className="rounded-3xl border border-zinc-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
                  <h2 className="text-lg font-semibold">Sync</h2>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">État des envois (placeholder).</p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-zinc-200 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-black/30">
                      <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">En attente</div>
                      <div className="mt-2 text-xl font-semibold">—</div>
                    </div>
                    <div className="rounded-2xl border border-zinc-200 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-black/30">
                      <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Dernier envoi</div>
                      <div className="mt-2 text-xl font-semibold">—</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-zinc-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
                  <h2 className="text-lg font-semibold">Historique récent</h2>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Derniers relevés.</p>
                  <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/10">
                    <table className="w-full text-sm">
                      <thead className="bg-zinc-50 text-left text-xs text-zinc-500 dark:bg-white/5 dark:text-zinc-400">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Compteur</th>
                          <th className="px-4 py-3 font-semibold">Index</th>
                          <th className="px-4 py-3 font-semibold">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 bg-white/70 dark:divide-white/10 dark:bg-black/30">
                        {recentHistoryBusy ? (
                          <tr>
                            <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300" colSpan={3}>
                              Chargement…
                            </td>
                          </tr>
                        ) : recentHistory.length === 0 ? (
                          <tr>
                            <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300" colSpan={3}>
                              Aucun relevé.
                            </td>
                          </tr>
                        ) : (
                          recentHistory.map((r) => (
                            <tr key={r.key}>
                              <td className="px-4 py-3">{r.meterNumber}</td>
                              <td className="px-4 py-3">{r.indexValue}</td>
                              <td className="px-4 py-3">{r.statusLabel}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>

                ) : null}

                {tab === "sync" ? (
                  <section className="grid gap-6 lg:grid-cols-2">
                    <div className={`${cardClassName} p-6`}>
                      <h2 className="text-lg font-semibold">Synchronisation</h2>
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Envois des relevés stockés localement.</p>
                      <div className="mt-5 grid gap-3">
                        <div className="rounded-2xl border border-zinc-200 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-black/30">
                          <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">En attente</div>
                          <div className="mt-2 text-2xl font-semibold">{pendingCount}</div>
                        </div>
                        <button type="button" onClick={() => void syncPendingReadings()} disabled={syncing} className={`w-full ${primaryButtonClassName}`}>
                          {syncing ? "Synchronisation…" : "Synchroniser maintenant"}
                        </button>
                      </div>
                    </div>
                    <div className={`${cardClassName} p-6`}>
                      <h2 className="text-lg font-semibold">Historique récent</h2>
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Derniers relevés.</p>
                      <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/10">
                        <table className="w-full text-sm">
                          <thead className="bg-zinc-50 text-left text-xs text-zinc-500 dark:bg-white/5 dark:text-zinc-400">
                            <tr>
                              <th className="px-4 py-3 font-semibold">Compteur</th>
                              <th className="px-4 py-3 font-semibold">Index</th>
                              <th className="px-4 py-3 font-semibold">Statut</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-200 bg-white/70 dark:divide-white/10 dark:bg-black/30">
                            {recentHistoryBusy ? (
                              <tr>
                                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300" colSpan={3}>
                                  Chargement…
                                </td>
                              </tr>
                            ) : recentHistory.length === 0 ? (
                              <tr>
                                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300" colSpan={3}>
                                  Aucun relevé.
                                </td>
                              </tr>
                            ) : (
                              recentHistory.map((r) => (
                                <tr key={r.key}>
                                  <td className="px-4 py-3">{r.meterNumber}</td>
                                  <td className="px-4 py-3">{r.indexValue}</td>
                                  <td className="px-4 py-3">{r.statusLabel}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </section>
                ) : null}

                <footer className="border-t border-zinc-200 pt-8 text-sm text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                  © {new Date().getFullYear()} NIGELEC · Espace Agent
                </footer>
          </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

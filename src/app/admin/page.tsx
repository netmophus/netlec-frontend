"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number | null };

async function apiDownload(path: string): Promise<ApiResult<Blob>> {
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
    return { ok: true, data: blob };
  } catch {
    return { ok: false, status: null, error: "Impossible de joindre le serveur." };
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("nigelec_access_token");
}

async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<ApiResult<T>> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
  const token = options.token ?? getToken();

  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  try {
    const res = await fetch(`${apiBase}${path}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { detail?: string } | null;
      return {
        ok: false,
        status: res.status,
        error: data?.detail ?? `Erreur HTTP ${res.status}`,
      };
    }

    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch {
    return { ok: false, status: null, error: "Impossible de joindre le serveur." };
  }
}

type StaffRole = "agent" | "supervisor";

type Role = "admin" | "supervisor" | "agent" | "customer";

type ZoneRef = {
  center: string;
  zone: string;
  sector: string;
};

type ZoneRow = {
  _id: string;
  center: string;
  zone: string;
  sector: string;
  createdAt?: string;
};

type ImportCustomersReport = {
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
  errorLines: number[];
};

type ImportMetersReport = {
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
  errorLines: number[];
};

type SyncInvoicesReport = {
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
};

type TariffRow = {
  _id: string;
  code: string;
  fromKwh: number;
  toKwh: number | null;
  ratePerKwh: number;
  createdAt?: string;
  updatedAt?: string;
};

type UserRow = {
  _id: string;
  phone: string;
  name?: string | null;
  role: Role;
  isActive: boolean;
  mustChangePassword?: boolean;
  createdAt?: string;
  assignedZones?: ZoneRef[] | null;
};

type CustomerRow = {
  _id: string;
  phone: string;
  name?: string | null;
  role: "customer";
  isActive: boolean;
  meterNumber?: string | null;
  subscriberNumber?: string | null;
  police?: string | null;
  tariffCode?: string | null;
  category?: string | null;
  grouping?: string | null;
  address?: string | null;
  center?: string | null;
  zone?: string | null;
  sector?: string | null;
  source?: string | null;
  createdAt?: string;
};

type PreRegisterCustomerForm = {
  phone: string;
  meterNumber: string;
  subscriberNumber: string;
  police: string;
  name: string;
  address: string;
  tariffCode: string;
  center: string;
  zone: string;
  sector: string;
};

type CreateStaffForm = {
  phone: string;
  name: string;
  password: string;
  role: StaffRole;
};

type TabKey = "overview" | "users" | "clients" | "customers" | "ops";

export default function AdminDashboardPage() {
  const inputClassName =
    "h-12 w-full rounded-md border border-zinc-200 bg-white/70 px-5 text-base shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-900/5 dark:border-white/10 dark:bg-white/5 dark:placeholder:text-zinc-500 dark:focus:border-white/20 dark:focus:ring-white/10";

  const cardClassName =
    "rounded-3xl border border-zinc-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5";
  const cardTintRedClassName =
    "rounded-3xl border border-red-100 bg-red-50/60 p-6 shadow-sm backdrop-blur dark:border-red-500/20 dark:bg-red-500/10";
  const cardTintZincClassName =
    "rounded-3xl border border-zinc-200 bg-zinc-50/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5";
  const cardSoftClassName =
    "rounded-2xl border border-zinc-200 bg-white/60 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5";
  const tableCardClassName =
    "overflow-hidden rounded-2xl border border-zinc-200 bg-white/70 shadow-sm dark:border-white/10 dark:bg-black/30";

  const primaryButtonClassName =
    "inline-flex items-center justify-center rounded-md bg-red-600 px-5 text-base font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70";
  const primaryButtonSmClassName =
    "inline-flex items-center justify-center rounded-md bg-red-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70";
  const secondaryButtonClassName =
    "inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white/70 px-5 text-base font-semibold text-zinc-900 shadow-sm backdrop-blur transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10";
  const secondaryButtonSmClassName =
    "inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white/70 px-4 text-sm font-semibold text-zinc-900 shadow-sm backdrop-blur transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10";

  const sectionHeader = (title: string, subtitle: string, right?: ReactNode) => (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{subtitle}</p>
      </div>
      {right ? <div className="flex flex-wrap items-center justify-end gap-2">{right}</div> : null}
    </div>
  );

  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setToken(getToken());
  }, []);

  const isAuthenticated = useMemo(() => Boolean(token), [token]);

  const [pre, setPre] = useState<PreRegisterCustomerForm>({
    phone: "",
    meterNumber: "",
    subscriberNumber: "",
    police: "",
    name: "",
    address: "",
    tariffCode: "",
    center: "",
    zone: "",
    sector: "",
  });
  const [staff, setStaff] = useState<CreateStaffForm>({
    phone: "",
    name: "",
    password: "",
    role: "agent",
  });

  const [busy, setBusy] = useState<null | "pre" | "staff">(null);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const [tab, setTab] = useState<TabKey>("overview");

  const [usersSubTab, setUsersSubTab] = useState<"create" | "manage">("manage");
  const [customersSubTab, setCustomersSubTab] = useState<"pre" | "imports" | "zones" | "assign">("pre");
  const [opsSubTab, setOpsSubTab] = useState<"invoices" | "tariffs" | "tours" | "field">("invoices");

  const [kpiInternalUsers, setKpiInternalUsers] = useState<number | null>(null);
  const [kpiPreRegisteredCustomers, setKpiPreRegisteredCustomers] = useState<number | null>(null);
  const [kpisLoading, setKpisLoading] = useState(false);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersQuery, setUsersQuery] = useState("");
  const [usersRoleFilter, setUsersRoleFilter] = useState<Role | "">("");
  const [usersActiveFilter, setUsersActiveFilter] = useState<"" | "active" | "inactive">("");
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<Role>("agent");
  const [editIsActive, setEditIsActive] = useState(true);

  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersQuery, setCustomersQuery] = useState("");
  const [customersActiveFilter, setCustomersActiveFilter] = useState<"" | "active" | "inactive">("");

  const [zones, setZones] = useState<ZoneRow[]>([]);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [zoneForm, setZoneForm] = useState({ center: "", zone: "", sector: "" });
  const [supervisors, setSupervisors] = useState<UserRow[]>([]);
  const [supervisorsLoading, setSupervisorsLoading] = useState(false);
  const [assignSupervisorId, setAssignSupervisorId] = useState<string>("");
  const [assignZoneKeys, setAssignZoneKeys] = useState<string[]>([]);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importDelimiter, setImportDelimiter] = useState(",");
  const [importUpdateExisting, setImportUpdateExisting] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [importReport, setImportReport] = useState<ImportCustomersReport | null>(null);

  const [importMetersFile, setImportMetersFile] = useState<File | null>(null);
  const [importMetersDelimiter, setImportMetersDelimiter] = useState(";");
  const [importMetersUpsert, setImportMetersUpsert] = useState(true);
  const [importMetersValidateZones, setImportMetersValidateZones] = useState(true);
  const [importMetersBusy, setImportMetersBusy] = useState(false);
  const [importMetersReport, setImportMetersReport] = useState<ImportMetersReport | null>(null);

  const [syncInvoicesBusy, setSyncInvoicesBusy] = useState(false);
  const [syncInvoicesGraceDays, setSyncInvoicesGraceDays] = useState(10);
  const [syncInvoicesReport, setSyncInvoicesReport] = useState<SyncInvoicesReport | null>(null);

  const [tariffsBusy, setTariffsBusy] = useState(false);
  const [tariffs, setTariffs] = useState<TariffRow[]>([]);

  const kpis = useMemo(
    () => [
      {
        label: "Utilisateurs internes",
        value: kpisLoading ? "…" : kpiInternalUsers === null ? "—" : String(kpiInternalUsers),
        hint: "Agents · superviseurs · admins",
      },
      {
        label: "Clients pré-enregistrés",
        value: kpisLoading ? "…" : kpiPreRegisteredCustomers === null ? "—" : String(kpiPreRegisteredCustomers),
        hint: "En attente d’activation",
      },
      { label: "Factures DUE", value: "—", hint: "À venir" },
      { label: "Agents offline", value: "—", hint: "À venir" },
    ],
    [kpiInternalUsers, kpiPreRegisteredCustomers, kpisLoading],
  );

  async function loadKpiCounts() {
    setKpisLoading(true);
    try {
      const res = await apiFetch<{ internalUsers: number; preRegisteredCustomers: number }>("/admin/stats", {
        method: "GET",
      });
      if (res.ok) {
        setKpiInternalUsers(res.data.internalUsers);
        setKpiPreRegisteredCustomers(res.data.preRegisteredCustomers);
      }
    } finally {
      setKpisLoading(false);
    }
  }

  const tabButton = (key: TabKey, label: string) => {
    const active = tab === key;
    return (
      <button
        type="button"
        onClick={() => setTab(key)}
        className={`inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold transition ${
          active
            ? "bg-red-600 text-white shadow-sm"
            : "text-zinc-700 hover:bg-red-600/10 hover:text-zinc-900 dark:text-zinc-200 dark:hover:bg-white/10 dark:hover:text-white"
        }`}
      >
        {label}
      </button>
    );
  };

  const subTabButton = (active: boolean, label: string, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold transition ${
        active
          ? "bg-zinc-900 text-white shadow-sm dark:bg-white dark:text-zinc-900"
          : "text-zinc-700 hover:bg-zinc-900/5 hover:text-zinc-900 dark:text-zinc-200 dark:hover:bg-white/10 dark:hover:text-white"
      }`}
    >
      {label}
    </button>
  );

  async function syncInvoices() {
    setMessage(null);
    setSyncInvoicesReport(null);
    setSyncInvoicesBusy(true);
    try {
      const params = new URLSearchParams();
      params.set("graceDays", String(syncInvoicesGraceDays));
      const res = await apiFetch<SyncInvoicesReport>(`/admin/invoices/sync?${params.toString()}`, {
        method: "POST",
      });
      if (!res.ok) {
        setMessage({ type: "error", text: res.error });
        return;
      }
      setSyncInvoicesReport(res.data);
      setMessage({ type: "ok", text: "Synchronisation des factures terminée." });
    } finally {
      setSyncInvoicesBusy(false);
    }
  }

  async function loadTariffs() {
    setTariffsBusy(true);
    try {
      const res = await apiFetch<TariffRow[]>("/admin/tariffs?limit=50", { method: "GET" });
      if (!res.ok) {
        return;
      }
      setTariffs(res.data);
    } finally {
      setTariffsBusy(false);
    }
  }

  async function saveTariffs() {
    setTariffsBusy(true);
    try {
      const items = tariffs.map((t) => ({
        code: t.code,
        fromKwh: Number(t.fromKwh) || 1,
        toKwh: t.toKwh === null || Number.isNaN(Number(t.toKwh)) ? null : Number(t.toKwh),
        ratePerKwh: Number(t.ratePerKwh) || 0,
      }));
      const res = await apiFetch<TariffRow[]>("/admin/tariffs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) {
        return;
      }
      setTariffs(res.data);
    } finally {
      setTariffsBusy(false);
    }
  }

  async function loadUsers() {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams();
      if (usersQuery.trim()) params.set("q", usersQuery.trim());
      if (usersRoleFilter) params.set("role", usersRoleFilter);
      if (usersActiveFilter === "active") params.set("active", "true");
      if (usersActiveFilter === "inactive") params.set("active", "false");

      const query = params.toString();
      const res = await apiFetch<UserRow[]>(`/admin/users${query ? `?${query}` : ""}`, {
        method: "GET",
      });

      if (!res.ok) {
        setMessage({ type: "error", text: res.error });
        return;
      }

      setUsers(res.data);
    } finally {
      setUsersLoading(false);
    }
  }

  async function importMetersCsv() {
    setMessage(null);
    setImportMetersReport(null);
    if (!importMetersFile) {
      setMessage({ type: "error", text: "Sélectionne un fichier CSV meters." });
      return;
    }
    if (!importMetersDelimiter || importMetersDelimiter.length !== 1) {
      setMessage({ type: "error", text: "Délimiteur invalide." });
      return;
    }

    setImportMetersBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", importMetersFile);

      const qs = new URLSearchParams();
      qs.set("delimiter", importMetersDelimiter);
      qs.set("upsert", importMetersUpsert ? "true" : "false");
      qs.set("validateZones", importMetersValidateZones ? "true" : "false");

      const res = await apiFetch<ImportMetersReport>(`/admin/meters/import?${qs.toString()}`, {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        setMessage({ type: "error", text: res.error });
        return;
      }

      setImportMetersReport(res.data);
      setMessage({ type: "ok", text: "Import meters terminé." });
    } finally {
      setImportMetersBusy(false);
    }
  }

  useEffect(() => {
    if (!mounted || !isAuthenticated) return;
    if (tab !== "users") return;
    if (usersSubTab !== "manage") return;
    void loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, isAuthenticated, tab, usersSubTab]);

  useEffect(() => {
    if (!mounted || !isAuthenticated) return;
    if (tab !== "overview") return;
    void loadKpiCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, isAuthenticated, tab]);

  useEffect(() => {
    if (!mounted || !isAuthenticated) return;
    if (tab !== "clients") return;
    void loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, isAuthenticated, tab]);

  useEffect(() => {
    if (!mounted || !isAuthenticated) return;
    if (tab !== "customers") return;
    if (customersSubTab !== "zones" && customersSubTab !== "assign") return;
    void loadZones();
    if (customersSubTab === "assign") void loadSupervisors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, isAuthenticated, tab, customersSubTab]);

  useEffect(() => {
    if (!mounted || !isAuthenticated) return;
    if (tab !== "ops") return;
    if (opsSubTab !== "tariffs") return;
    void loadTariffs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, isAuthenticated, tab, opsSubTab]);

  async function loadCustomers() {
    setCustomersLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("role", "customer");
      params.set("limit", "500");
      if (customersQuery.trim()) params.set("q", customersQuery.trim());
      if (customersActiveFilter === "active") params.set("active", "true");
      if (customersActiveFilter === "inactive") params.set("active", "false");

      const res = await apiFetch<CustomerRow[]>(`/admin/users?${params.toString()}`, { method: "GET" });
      if (!res.ok) {
        setMessage({ type: "error", text: res.error });
        return;
      }
      setCustomers(res.data);
    } finally {
      setCustomersLoading(false);
    }
  }

  async function loadZones() {
    setZonesLoading(true);
    try {
      const res = await apiFetch<ZoneRow[]>("/admin/zones", { method: "GET" });
      if (!res.ok) {
        setMessage({ type: "error", text: res.error });
        return;
      }
      setZones(res.data);
    } finally {
      setZonesLoading(false);
    }
  }

  async function loadSupervisors() {
    setSupervisorsLoading(true);
    try {
      const res = await apiFetch<UserRow[]>("/admin/users?role=supervisor&limit=500", { method: "GET" });
      if (!res.ok) {
        setMessage({ type: "error", text: res.error });
        return;
      }
      setSupervisors(res.data);
    } finally {
      setSupervisorsLoading(false);
    }
  }

  async function createZone(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    if (!zoneForm.center.trim() || !zoneForm.zone.trim() || !zoneForm.sector.trim()) {
      setMessage({ type: "error", text: "Champs requis manquants." });
      return;
    }

    const res = await apiFetch<ZoneRow>("/admin/zones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        center: zoneForm.center.trim(),
        zone: zoneForm.zone.trim(),
        sector: zoneForm.sector.trim(),
      }),
    });

    if (!res.ok) {
      setMessage({ type: "error", text: res.error });
      return;
    }

    setZones((prev) => [res.data, ...prev]);
    setZoneForm({ center: "", zone: "", sector: "" });
    setMessage({ type: "ok", text: "Zone créée." });
  }

  async function assignZonesToSupervisor() {
    setMessage(null);
    if (!assignSupervisorId) {
      setMessage({ type: "error", text: "Sélectionne un superviseur." });
      return;
    }

    const assignedZones: ZoneRef[] = zones
      .filter((z) => assignZoneKeys.includes(z._id))
      .map((z) => ({ center: z.center, zone: z.zone, sector: z.sector }));

    const res = await apiFetch<UserRow>(`/admin/users/${assignSupervisorId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedZones }),
    });

    if (!res.ok) {
      setMessage({ type: "error", text: res.error });
      return;
    }

    setUsers((prev) => prev.map((u) => (u._id === assignSupervisorId ? res.data : u)));
    setSupervisors((prev) => prev.map((u) => (u._id === assignSupervisorId ? res.data : u)));
    setMessage({ type: "ok", text: "Zones affectées au superviseur." });
  }

  async function importCustomersCsv() {
    setMessage(null);
    setImportReport(null);
    if (!importFile) {
      setMessage({ type: "error", text: "Sélectionne un fichier CSV." });
      return;
    }
    if (!importDelimiter || importDelimiter.length !== 1) {
      setMessage({ type: "error", text: "Délimiteur invalide." });
      return;
    }

    setImportBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", importFile);

      const qs = new URLSearchParams();
      qs.set("delimiter", importDelimiter);
      qs.set("updateExisting", importUpdateExisting ? "true" : "false");

      const res = await apiFetch<ImportCustomersReport>(`/admin/customers/import?${qs.toString()}`, {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        setMessage({ type: "error", text: res.error });
        return;
      }

      setImportReport(res.data);
      setMessage({ type: "ok", text: "Import terminé." });
    } finally {
      setImportBusy(false);
    }
  }

  async function downloadCustomersPdf() {
    setMessage(null);
    const res = await apiDownload("/admin/customers/report.pdf");
    if (!res.ok) {
      setMessage({ type: "error", text: res.error });
      return;
    }
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = "clients_report.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function toggleUserActive(u: UserRow) {
    setMessage(null);
    const res = await apiFetch<UserRow>(`/admin/users/${u._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !u.isActive }),
    });

    if (!res.ok) {
      setMessage({ type: "error", text: res.error });
      return;
    }

    setUsers((prev) => prev.map((x) => (x._id === u._id ? res.data : x)));
    setMessage({ type: "ok", text: res.data.isActive ? "Compte activé." : "Compte désactivé." });
  }

  async function resetUserPassword(u: UserRow) {
    setMessage(null);
    const res = await apiFetch<{ temporaryPassword: string }>(`/admin/users/${u._id}/reset-password`, {
      method: "POST",
    });

    if (!res.ok) {
      setMessage({ type: "error", text: res.error });
      return;
    }

    setMessage({
      type: "ok",
      text: `Mot de passe temporaire: ${res.data.temporaryPassword} (à communiquer puis changer au prochain login).`,
    });
  }

  function startEdit(u: UserRow) {
    setEditingUser(u);
    setEditName(u.name ?? "");
    setEditRole(u.role);
    setEditIsActive(u.isActive);
  }

  async function saveEdit() {
    if (!editingUser) return;
    setMessage(null);

    const res = await apiFetch<UserRow>(`/admin/users/${editingUser._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() || null, role: editRole, isActive: editIsActive }),
    });

    if (!res.ok) {
      setMessage({ type: "error", text: res.error });
      return;
    }

    setUsers((prev) => prev.map((x) => (x._id === editingUser._id ? res.data : x)));
    setEditingUser(null);
    setMessage({ type: "ok", text: "Utilisateur mis à jour." });
  }

  async function handlePreRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);

    const missing = ["phone", "meterNumber", "subscriberNumber", "police"].filter(
      (k) => !(pre as any)[k]?.trim(),
    );
    if (missing.length) {
      setMessage({ type: "error", text: "Champs requis manquants." });
      return;
    }

    setBusy("pre");
    try {
      const res = await apiFetch<any>("/admin/customers/pre-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: pre.phone,
          meterNumber: pre.meterNumber,
          subscriberNumber: pre.subscriberNumber,
          police: pre.police,
          name: pre.name || undefined,
          address: pre.address || undefined,
          tariffCode: pre.tariffCode || undefined,
          center: pre.center || undefined,
          zone: pre.zone || undefined,
          sector: pre.sector || undefined,
          source: "BACKOFFICE",
        }),
      });

      if (!res.ok) {
        setMessage({ type: "error", text: res.error });
        return;
      }

      setMessage({ type: "ok", text: "Client pré-enregistré avec succès." });
      setPre((s) => ({
        ...s,
        phone: "",
        meterNumber: "",
        subscriberNumber: "",
        police: "",
      }));
    } finally {
      setBusy(null);
    }
  }

  async function handleCreateStaff(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);

    if (!staff.phone.trim() || !staff.name.trim() || !staff.password) {
      setMessage({ type: "error", text: "Champs requis manquants." });
      return;
    }

    setBusy("staff");
    try {
      const res = await apiFetch<any>("/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: staff.phone,
          name: staff.name,
          password: staff.password,
          role: staff.role,
          isActive: true,
        }),
      });

      if (!res.ok) {
        setMessage({ type: "error", text: res.error });
        return;
      }

      setMessage({ type: "ok", text: `Utilisateur ${staff.role} créé avec succès.` });
      setStaff({ phone: "", name: "", password: "", role: staff.role });
    } finally {
      setBusy(null);
    }
  }

  const tabMeta = useMemo(() => {
    const map: Record<TabKey, { title: string; subtitle: string }> = {
      overview: {
        title: "Vue d’ensemble",
        subtitle: "Gardien du système: utilisateurs, référentiels, imports et opérations.",
      },
      users: {
        title: "Utilisateurs",
        subtitle: "Comptes internes, rôles, activation et support terrain.",
      },
      clients: {
        title: "Clients",
        subtitle: "Référentiel clients et état d’activation.",
      },
      customers: {
        title: "Référentiels",
        subtitle: "Pré-enregistrement, imports, zones et affectations.",
      },
      ops: {
        title: "Opérations",
        subtitle: "Outils d’exploitation (sync factures, suivi, tournées).",
      },
    };
    return map;
  }, []);

  const navItem = (key: TabKey, label: string) => {
    const active = tab === key;
    return (
      <button
        type="button"
        onClick={() => {
          setTab(key);
          if (key === "users") setUsersSubTab("manage");
          if (key === "customers") setCustomersSubTab("pre");
          if (key === "ops") setOpsSubTab("invoices");
        }}
        className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
          active
            ? "bg-red-600 text-white shadow-sm"
            : "text-zinc-700 hover:bg-red-600/10 hover:text-zinc-900 dark:text-zinc-200 dark:hover:bg-white/10 dark:hover:text-white"
        }`}
      >
        <span>{label}</span>
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
          <aside className="rounded-3xl border border-zinc-200 bg-white/70 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center gap-3">
              <img src="/nigelec-logo.svg" alt="NIGELEC" className="h-9 w-auto" />
              <div>
                <div className="text-sm font-semibold tracking-wide">Admin</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">NIGELEC</div>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              {navItem("overview", "Vue d’ensemble")}
              {navItem("users", "Utilisateurs")}
              {navItem("clients", "Clients")}
              {navItem("customers", "Référentiels")}
              {navItem("ops", "Opérations")}
            </div>

            <div className="mt-6 h-px bg-zinc-200/70 dark:bg-white/10" />

            <div className="mt-6 grid gap-2">
              <a
                href="/"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-zinc-200 bg-white/60 px-4 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
              >
                Accueil
              </a>
              <a
                href="/login"
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-red-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
                onClick={() => localStorage.removeItem("nigelec_access_token")}
              >
                Déconnexion
              </a>
            </div>
          </aside>

          <section className="space-y-6">
            {!mounted ? (
              <div className={cardClassName}>
                <h1 className="text-xl font-semibold">Chargement…</h1>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">Vérification de la session.</p>
              </div>
            ) : !isAuthenticated ? (
              <div className={cardClassName}>
                <h1 className="text-xl font-semibold">Accès requis</h1>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                  Connecte-toi avec un compte admin pour accéder au dashboard.
                </p>
                <a href="/login" className={"mt-4 h-12 " + primaryButtonClassName}>
                  Aller au login
                </a>
              </div>
            ) : (
              <>
                <div className={cardTintZincClassName + " p-7"}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Dashboard
                      </div>
                      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{tabMeta[tab].title}</h1>
                      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{tabMeta[tab].subtitle}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white/60 px-3 py-1 text-xs font-semibold text-zinc-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200">
                        {new Date().toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                  </div>

                  {tab === "users" ? (
                    <div className="mt-6 flex flex-wrap items-center gap-2">
                      {subTabButton(usersSubTab === "manage", "Gérer", () => setUsersSubTab("manage"))}
                      {subTabButton(usersSubTab === "create", "Créer", () => setUsersSubTab("create"))}
                    </div>
                  ) : null}

                  {tab === "customers" ? (
                    <div className="mt-6 flex flex-wrap items-center gap-2">
                      {subTabButton(customersSubTab === "pre", "Pré-enregistrement", () => setCustomersSubTab("pre"))}
                      {subTabButton(customersSubTab === "imports", "Imports", () => setCustomersSubTab("imports"))}
                      {subTabButton(customersSubTab === "zones", "Zones", () => setCustomersSubTab("zones"))}
                      {subTabButton(customersSubTab === "assign", "Affectations", () => setCustomersSubTab("assign"))}
                    </div>
                  ) : null}

                  {tab === "ops" ? (
                    <div className="mt-6 flex flex-wrap items-center gap-2">
                      {subTabButton(opsSubTab === "invoices", "Factures", () => setOpsSubTab("invoices"))}
                      {subTabButton(opsSubTab === "tariffs", "Tarifs", () => setOpsSubTab("tariffs"))}
                      {subTabButton(opsSubTab === "tours", "Tournées", () => setOpsSubTab("tours"))}
                      {subTabButton(opsSubTab === "field", "Suivi terrain", () => setOpsSubTab("field"))}
                    </div>
                  ) : null}

                  {tab === "overview" ? (
                    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {kpis.map((k) => (
                        <div
                          key={k.label}
                          className={`rounded-2xl border p-4 shadow-sm dark:bg-black/30 ${
                            k.label === "Utilisateurs internes"
                              ? "border-red-100 bg-red-50/60 dark:border-red-500/20 dark:bg-red-500/10"
                              : k.label === "Clients pré-enregistrés"
                                ? "border-amber-100 bg-amber-50/60 dark:border-amber-500/20 dark:bg-amber-500/10"
                                : "border-zinc-200 bg-white/70 dark:border-white/10 dark:bg-black/30"
                          }`}
                        >
                          <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{k.label}</div>
                          <div className="mt-2 text-2xl font-semibold tracking-tight">{k.value}</div>
                          <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">{k.hint}</div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

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

            {tab === "clients" ? (
              <div className="grid gap-6">
                <section className={cardClassName}>
                  {sectionHeader(
                    "Clients",
                    "Liste des clients (import SI + pré-enregistrés). Recherche et filtre par statut.",
                    <>
                      <button
                        type="button"
                        onClick={() => void loadCustomers()}
                        className={"h-10 " + secondaryButtonSmClassName}
                        disabled={customersLoading}
                      >
                        Appliquer filtres
                      </button>
                      <button
                        type="button"
                        onClick={() => void loadCustomers()}
                        className={"h-10 " + primaryButtonSmClassName}
                        disabled={customersLoading}
                      >
                        {customersLoading ? "Actualisation…" : "Actualiser"}
                      </button>
                    </>,
                  )}

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <input
                      className={inputClassName}
                      placeholder="Rechercher (téléphone/nom)"
                      value={customersQuery}
                      onChange={(e) => setCustomersQuery(e.target.value)}
                    />
                    <select
                      className={inputClassName}
                      value={customersActiveFilter}
                      onChange={(e) => setCustomersActiveFilter(e.target.value as "" | "active" | "inactive")}
                    >
                      <option value="">Tous statuts</option>
                      <option value="active">Actifs</option>
                      <option value="inactive">Inactifs</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => void loadCustomers()}
                      className={"h-12 " + secondaryButtonClassName}
                      disabled={customersLoading}
                    >
                      Appliquer filtres
                    </button>
                  </div>

                  <div className={"mt-5 " + tableCardClassName}>
                    <div className="grid grid-cols-12 gap-2 bg-zinc-50 px-4 py-3 text-xs font-semibold text-zinc-600 dark:bg-white/5 dark:text-zinc-300">
                      <div className="col-span-2">Téléphone</div>
                      <div className="col-span-2">Compteur</div>
                      <div className="col-span-2">Abonné</div>
                      <div className="col-span-2">Police</div>
                      <div className="col-span-2">Nom</div>
                      <div className="col-span-1">Zone</div>
                      <div className="col-span-1 text-right">Statut</div>
                    </div>

                    {customersLoading ? (
                      <div className="px-4 py-4 text-sm text-zinc-700 dark:text-zinc-200">Chargement…</div>
                    ) : customers.length === 0 ? (
                      <div className="px-4 py-4 text-sm text-zinc-700 dark:text-zinc-200">Aucun client.</div>
                    ) : (
                      <div className="divide-y divide-zinc-200 dark:divide-white/10">
                        {customers.map((c) => (
                          <div key={c._id} className="grid grid-cols-12 gap-2 px-4 py-3 text-sm">
                            <div className="col-span-2 font-medium">{c.phone}</div>
                            <div className="col-span-2 text-zinc-700 dark:text-zinc-200">{c.meterNumber ?? "-"}</div>
                            <div className="col-span-2 text-zinc-700 dark:text-zinc-200">{c.subscriberNumber ?? "-"}</div>
                            <div className="col-span-2 text-zinc-700 dark:text-zinc-200">{c.police ?? "-"}</div>
                            <div className="col-span-2 text-zinc-700 dark:text-zinc-200">{c.name ?? "-"}</div>
                            <div className="col-span-1 text-xs text-zinc-600 dark:text-zinc-300">
                              {(c.center ?? "-") + " / " + (c.zone ?? "-")}
                            </div>
                            <div className="col-span-1 text-right">
                              <span
                                className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold ${
                                  c.isActive
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
                                    : "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200"
                                }`}
                              >
                                {c.isActive ? "Actif" : "Inactif"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              </div>
            ) : null}

            {tab === "overview" ? (
              <div className="grid gap-6 lg:grid-cols-3">
                <section className={"lg:col-span-2 " + cardTintRedClassName}>
                  {sectionHeader("Raccourcis", "Accès rapide aux actions du back-office.")}

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setTab("users")}
                      className={"rounded-2xl border border-red-100 bg-red-50/60 p-4 text-left shadow-sm transition hover:bg-red-50 dark:border-red-500/20 dark:bg-red-500/10 dark:hover:bg-red-500/15"}
                    >
                      <div className="text-sm font-semibold">Créer un agent / superviseur</div>
                      <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                        Comptes internes et support terrain.
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTab("customers")}
                      className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4 text-left shadow-sm transition hover:bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10 dark:hover:bg-amber-500/15"
                    >
                      <div className="text-sm font-semibold">Pré-enregistrer un client</div>
                      <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                        Activation ensuite via /register.
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTab("customers")}
                      className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 text-left shadow-sm transition hover:bg-zinc-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                    >
                      <div className="text-sm font-semibold">Importer clients (CSV)</div>
                      <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                        À venir (MVP) · Import SI.
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTab("ops")}
                      className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 text-left shadow-sm transition hover:bg-zinc-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                    >
                      <div className="text-sm font-semibold">Créer / assigner des tournées</div>
                      <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">À venir (MVP léger).</div>
                    </button>
                  </div>
                </section>

                <aside className={cardTintZincClassName}>
                  <h2 className="text-lg font-semibold">État système</h2>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-600 dark:text-zinc-300">Backend</span>
                      <span className="font-semibold">{process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-600 dark:text-zinc-300">Mongo</span>
                      <span className="font-semibold">OK</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-600 dark:text-zinc-300">Mode</span>
                      <span className="font-semibold">MVP</span>
                    </div>
                  </div>
                  <div className={"mt-6 " + cardSoftClassName + " text-xs text-zinc-600 dark:text-zinc-300"}>
                    API: <span className="font-medium">{process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000"}</span>
                  </div>
                </aside>
              </div>
            ) : null}

            {tab === "users" ? (
              usersSubTab === "create" ? (
                <div className="grid gap-6 lg:grid-cols-2">
                  <section className={cardClassName}>
                    {sectionHeader(
                      "Créer un agent / superviseur",
                      "Création de comptes internes. Un reset temporaire est recommandé en exploitation.",
                    )}

                    <form onSubmit={handleCreateStaff} className="mt-5 space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Rôle *</label>
                      <select
                        className={inputClassName}
                        value={staff.role}
                        onChange={(e) => setStaff((s) => ({ ...s, role: e.target.value as StaffRole }))}
                      >
                        <option value="agent">agent</option>
                        <option value="supervisor">supervisor</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Téléphone *</label>
                      <input className={inputClassName} value={staff.phone} onChange={(e) => setStaff((s) => ({ ...s, phone: e.target.value }))} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nom *</label>
                      <input className={inputClassName} value={staff.name} onChange={(e) => setStaff((s) => ({ ...s, name: e.target.value }))} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Mot de passe initial *</label>
                      <input
                        className={inputClassName}
                        type="password"
                        value={staff.password}
                        onChange={(e) => setStaff((s) => ({ ...s, password: e.target.value }))}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={busy === "staff"}
                      className={"h-12 w-full " + primaryButtonClassName}
                    >
                      {busy === "staff" ? "Création…" : "Créer"}
                    </button>
                  </form>
                  </section>
                </div>
              ) : (
                <div className="grid gap-6">
                  <section className={cardClassName}>
                    {sectionHeader(
                      "Utilisateurs",
                      "Liste + édition, activation et reset mot de passe temporaire.",
                      <>
                        <button
                          type="button"
                          onClick={() => void loadUsers()}
                          className={"h-10 " + secondaryButtonSmClassName}
                          disabled={usersLoading}
                        >
                          Appliquer filtres
                        </button>
                        <button
                          type="button"
                          onClick={() => void loadUsers()}
                          className={"h-10 " + primaryButtonSmClassName}
                          disabled={usersLoading}
                        >
                          {usersLoading ? "Actualisation…" : "Actualiser"}
                        </button>
                      </>,
                    )}

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <input
                        className={inputClassName}
                        placeholder="Rechercher (téléphone/nom)"
                        value={usersQuery}
                        onChange={(e) => setUsersQuery(e.target.value)}
                      />
                      <select
                        className={inputClassName}
                        value={usersRoleFilter}
                        onChange={(e) => setUsersRoleFilter(e.target.value as Role | "")}
                      >
                        <option value="">Tous rôles</option>
                        <option value="admin">admin</option>
                        <option value="supervisor">supervisor</option>
                        <option value="agent">agent</option>
                        <option value="customer">customer</option>
                      </select>
                      <select
                        className={inputClassName}
                        value={usersActiveFilter}
                        onChange={(e) => setUsersActiveFilter(e.target.value as "" | "active" | "inactive")}
                      >
                        <option value="">Tous statuts</option>
                        <option value="active">Actifs</option>
                        <option value="inactive">Inactifs</option>
                      </select>
                    </div>

                    <div className="mt-5">
                      <div className={tableCardClassName}>
                        <div className="grid grid-cols-12 gap-2 bg-zinc-50 px-4 py-3 text-xs font-semibold text-zinc-600 dark:bg-white/5 dark:text-zinc-300">
                          <div className="col-span-5">Utilisateur</div>
                          <div className="col-span-2">Rôle</div>
                          <div className="col-span-2">Statut</div>
                          <div className="col-span-3 text-right">Actions</div>
                        </div>

                        {usersLoading ? (
                          <div className="px-4 py-4 text-sm text-zinc-700 dark:text-zinc-200">Chargement…</div>
                        ) : users.length === 0 ? (
                          <div className="px-4 py-4 text-sm text-zinc-700 dark:text-zinc-200">Aucun utilisateur.</div>
                        ) : (
                          <div className="divide-y divide-zinc-200 dark:divide-white/10">
                            {users.map((u) => {
                              const name = u.name || "(sans nom)";
                              const initials = name
                                .split(" ")
                                .filter(Boolean)
                                .slice(0, 2)
                                .map((p) => p[0]!.toUpperCase())
                                .join("");

                              return (
                                <div key={u._id} className="grid grid-cols-12 gap-2 px-4 py-3 text-sm">
                                  <div className="col-span-5 flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600/10 text-sm font-bold text-red-700 dark:bg-red-500/15 dark:text-red-200">
                                      {initials || "U"}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="truncate font-semibold text-zinc-900 dark:text-white">{name}</div>
                                      <div className="truncate text-xs text-zinc-600 dark:text-zinc-300">{u.phone}</div>
                                    </div>
                                  </div>

                                  <div className="col-span-2 flex items-center">
                                    <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white/70 px-2.5 py-1 text-xs font-semibold text-zinc-800 dark:border-white/10 dark:bg-white/5 dark:text-zinc-100">
                                      {u.role}
                                    </span>
                                  </div>

                                  <div className="col-span-2 flex items-center">
                                    <span
                                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
                                        u.isActive
                                          ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
                                          : "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200"
                                      }`}
                                    >
                                      {u.isActive ? "Actif" : "Inactif"}
                                    </span>
                                  </div>

                                  <div className="col-span-3 grid grid-cols-2 justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => startEdit(u)}
                                      className={"h-9 w-full " + secondaryButtonSmClassName}
                                    >
                                      Éditer
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void toggleUserActive(u)}
                                      className={"h-9 w-full " + secondaryButtonSmClassName}
                                    >
                                      {u.isActive ? "Désactiver" : "Activer"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void resetUserPassword(u)}
                                      className="col-span-2 inline-flex h-9 w-full items-center justify-center rounded-md bg-red-600 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
                                    >
                                      Reset
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {editingUser ? (
                      <div className={"mt-6 " + cardSoftClassName}>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-sm font-semibold">Éditer utilisateur</div>
                            <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">{editingUser.phone}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditingUser(null)}
                            className="rounded-xl px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-900/5 hover:text-zinc-900 dark:text-zinc-200 dark:hover:bg-white/10 dark:hover:text-white"
                          >
                            Fermer
                          </button>
                        </div>

                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Nom</label>
                            <input className={inputClassName} value={editName} onChange={(e) => setEditName(e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Rôle</label>
                            <select className={inputClassName} value={editRole} onChange={(e) => setEditRole(e.target.value as Role)}>
                              <option value="admin">admin</option>
                              <option value="supervisor">supervisor</option>
                              <option value="agent">agent</option>
                              <option value="customer">customer</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Statut</label>
                            <select
                              className={inputClassName}
                              value={editIsActive ? "active" : "inactive"}
                              onChange={(e) => setEditIsActive(e.target.value === "active")}
                            >
                              <option value="active">Actif</option>
                              <option value="inactive">Inactif</option>
                            </select>
                          </div>
                        </div>

                        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingUser(null)}
                            className={secondaryButtonSmClassName}
                          >
                            Annuler
                          </button>
                          <button type="button" onClick={() => void saveEdit()} className={"h-10 " + primaryButtonSmClassName}>
                            Enregistrer
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </section>
                </div>
              )
            ) : null}

            {tab === "customers" ? (
              customersSubTab === "pre" ? (
                <div className="grid gap-6 lg:grid-cols-2">
                  <section className={cardClassName}>
                    {sectionHeader(
                      "Pré-enregistrer un client",
                      "Référentiel client/compteur (activation via /register côté client).",
                    )}

                    <form onSubmit={handlePreRegister} className="mt-5 space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Téléphone (login) *</label>
                          <input className={inputClassName} value={pre.phone} onChange={(e) => setPre((s) => ({ ...s, phone: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">N° compteur *</label>
                          <input className={inputClassName} value={pre.meterNumber} onChange={(e) => setPre((s) => ({ ...s, meterNumber: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">N° abonné *</label>
                          <input className={inputClassName} value={pre.subscriberNumber} onChange={(e) => setPre((s) => ({ ...s, subscriberNumber: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Police *</label>
                          <input className={inputClassName} value={pre.police} onChange={(e) => setPre((s) => ({ ...s, police: e.target.value }))} />
                        </div>
                      </div>

                      <details className={cardSoftClassName}>
                        <summary className="cursor-pointer text-sm font-semibold">Champs optionnels</summary>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Nom</label>
                            <input className={inputClassName} value={pre.name} onChange={(e) => setPre((s) => ({ ...s, name: e.target.value }))} />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Adresse</label>
                            <input className={inputClassName} value={pre.address} onChange={(e) => setPre((s) => ({ ...s, address: e.target.value }))} />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Code tarif</label>
                            <input className={inputClassName} value={pre.tariffCode} onChange={(e) => setPre((s) => ({ ...s, tariffCode: e.target.value }))} />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Centre</label>
                            <input className={inputClassName} value={pre.center} onChange={(e) => setPre((s) => ({ ...s, center: e.target.value }))} />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Zone</label>
                            <input className={inputClassName} value={pre.zone} onChange={(e) => setPre((s) => ({ ...s, zone: e.target.value }))} />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Secteur</label>
                            <input className={inputClassName} value={pre.sector} onChange={(e) => setPre((s) => ({ ...s, sector: e.target.value }))} />
                          </div>
                        </div>
                      </details>

                      <button type="submit" disabled={busy === "pre"} className={"h-12 w-full " + primaryButtonClassName}>
                        {busy === "pre" ? "Création…" : "Pré-enregistrer"}
                      </button>
                    </form>
                  </section>
                </div>
              ) : customersSubTab === "imports" ? (
                <div className="grid gap-6 lg:grid-cols-2">
                  <section className={cardClassName}>
                    {sectionHeader(
                      "Importer clients (CSV)",
                      "Pré-enregistrement en masse (insert + option mise à jour si le client existe déjà).",
                    )}

                    <div className="mt-5 grid gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Fichier CSV *</label>
                        <input type="file" accept=".csv,text/csv" className={inputClassName} onChange={(e) => setImportFile(e.target.files?.[0] ?? null)} />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Délimiteur</label>
                          <input className={inputClassName} value={importDelimiter} onChange={(e) => setImportDelimiter(e.target.value)} placeholder="," />
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">Ex: "," ou ";"</div>
                        </div>
                        <div className="flex items-end">
                          <label className="flex items-center gap-3 text-sm">
                            <input type="checkbox" checked={importUpdateExisting} onChange={(e) => setImportUpdateExisting(e.target.checked)} />
                            Mettre à jour existants
                          </label>
                        </div>
                      </div>

                      <button type="button" onClick={() => void importCustomersCsv()} disabled={importBusy} className={"h-12 " + primaryButtonClassName}>
                        {importBusy ? "Import…" : "Lancer l’import"}
                      </button>

                      <button type="button" onClick={() => void downloadCustomersPdf()} className={"h-12 " + secondaryButtonClassName}>
                        Télécharger PDF
                      </button>

                      {importReport ? (
                        <div className={cardSoftClassName + " text-sm text-zinc-700 dark:text-zinc-200"}>
                          <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Rapport</div>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            <div><span className="font-semibold">Insérés:</span> {importReport.inserted}</div>
                            <div><span className="font-semibold">Mis à jour:</span> {importReport.updated}</div>
                            <div><span className="font-semibold">Ignorés:</span> {importReport.skipped}</div>
                            <div><span className="font-semibold">Erreurs:</span> {importReport.errors}</div>
                          </div>
                          {importReport.errorLines?.length ? (
                            <div className="mt-3 text-xs text-zinc-600 dark:text-zinc-300">
                              Lignes en erreur: {importReport.errorLines.slice(0, 20).join(", ")}
                              {importReport.errorLines.length > 20 ? "…" : ""}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </section>

                  <section className={cardClassName}>
                    {sectionHeader(
                      "Importer meters (CSV)",
                      "Import des compteurs (collection meters). Champs requis: meterNumber + routeOrder. Délimiteur par défaut: \";\".",
                    )}

                    <div className="mt-5 grid gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Fichier CSV meters *</label>
                        <input type="file" accept=".csv,text/csv" className={inputClassName} onChange={(e) => setImportMetersFile(e.target.files?.[0] ?? null)} />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Délimiteur</label>
                          <input className={inputClassName} value={importMetersDelimiter} onChange={(e) => setImportMetersDelimiter(e.target.value)} placeholder=";" />
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">Ex: ";" ou ","</div>
                        </div>
                        <div className="flex items-end">
                          <label className="flex items-center gap-3 text-sm">
                            <input type="checkbox" checked={importMetersUpsert} onChange={(e) => setImportMetersUpsert(e.target.checked)} />
                            Upsert (créer si inexistant)
                          </label>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-sm">
                        <input type="checkbox" checked={importMetersValidateZones} onChange={(e) => setImportMetersValidateZones(e.target.checked)} />
                        Valider l’existence des zones (centre/zone/secteur)
                      </div>

                      <button type="button" onClick={() => void importMetersCsv()} disabled={importMetersBusy} className={"h-12 " + primaryButtonClassName}>
                        {importMetersBusy ? "Import…" : "Lancer l’import meters"}
                      </button>

                      {importMetersReport ? (
                        <div className={cardSoftClassName + " text-sm text-zinc-700 dark:text-zinc-200"}>
                          <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Rapport</div>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            <div><span className="font-semibold">Insérés:</span> {importMetersReport.inserted}</div>
                            <div><span className="font-semibold">Mis à jour:</span> {importMetersReport.updated}</div>
                            <div><span className="font-semibold">Ignorés:</span> {importMetersReport.skipped}</div>
                            <div><span className="font-semibold">Erreurs:</span> {importMetersReport.errors}</div>
                          </div>
                          {importMetersReport.errorLines?.length ? (
                            <div className="mt-3 text-xs text-zinc-600 dark:text-zinc-300">
                              Lignes en erreur: {importMetersReport.errorLines.slice(0, 20).join(", ")}
                              {importMetersReport.errorLines.length > 20 ? "…" : ""}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </section>
                </div>
              ) : customersSubTab === "zones" ? (
                <div className="grid gap-6">
                  <section className={cardClassName}>
                    {sectionHeader(
                      "Zones (centre · zone · secteur)",
                      "Référentiel des zones. Utilisé pour affecter les superviseurs et structurer les compteurs.",
                      <button type="button" onClick={() => void loadZones()} className={"h-10 " + primaryButtonSmClassName} disabled={zonesLoading}>
                        {zonesLoading ? "Actualisation…" : "Actualiser"}
                      </button>,
                    )}

                    <form onSubmit={createZone} className="mt-5 grid gap-4 sm:grid-cols-3">
                      <input className={inputClassName} placeholder="Centre" value={zoneForm.center} onChange={(e) => setZoneForm((s) => ({ ...s, center: e.target.value }))} />
                      <input className={inputClassName} placeholder="Zone" value={zoneForm.zone} onChange={(e) => setZoneForm((s) => ({ ...s, zone: e.target.value }))} />
                      <input className={inputClassName} placeholder="Secteur" value={zoneForm.sector} onChange={(e) => setZoneForm((s) => ({ ...s, sector: e.target.value }))} />

                      <div className="sm:col-span-3">
                        <button type="submit" className={"h-10 " + secondaryButtonSmClassName}>
                          Créer la zone
                        </button>
                      </div>
                    </form>

                    <div className={"mt-5 " + cardSoftClassName + " text-sm text-zinc-700 dark:text-zinc-200"}>
                      <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Zones existantes</div>
                      <div className="mt-3 space-y-2">
                        {zonesLoading ? (
                          <div>Chargement…</div>
                        ) : zones.length === 0 ? (
                          <div>Aucune zone.</div>
                        ) : (
                          zones.slice(0, 30).map((z) => (
                            <div key={z._id} className="flex items-center justify-between">
                              <div className="text-sm font-semibold">{z.center}</div>
                              <div className="text-sm">{z.zone}</div>
                              <div className="text-sm">{z.sector}</div>
                            </div>
                          ))
                        )}
                        {zones.length > 30 ? (
                          <div className="pt-2 text-xs text-zinc-500 dark:text-zinc-400">+ {zones.length - 30} autres…</div>
                        ) : null}
                      </div>
                    </div>
                  </section>
                </div>
              ) : (
                <div className="grid gap-6">
                  <section className={cardClassName}>
                    {sectionHeader(
                      "Affectation superviseur → zones",
                      "Mode 2: on utilise uniquement assignedZones.",
                      <button type="button" onClick={() => void loadSupervisors()} className={"h-10 " + secondaryButtonSmClassName} disabled={supervisorsLoading}>
                        {supervisorsLoading ? "Actualisation…" : "Rafraîchir"}
                      </button>,
                    )}

                    <div className="mt-5 grid gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Superviseur</label>
                        <select
                          className={inputClassName}
                          value={assignSupervisorId}
                          onChange={(e) => {
                            const id = e.target.value;
                            setAssignSupervisorId(id);
                            const sup = supervisors.find((s) => s._id === id);
                            if (!sup?.assignedZones?.length) {
                              setAssignZoneKeys([]);
                              return;
                            }
                            const keys = zones
                              .filter((z) => sup.assignedZones?.some((az) => az.center === z.center && az.zone === z.zone && az.sector === z.sector))
                              .map((z) => z._id);
                            setAssignZoneKeys(keys);
                          }}
                        >
                          <option value="">Sélectionner…</option>
                          {supervisors.map((s) => (
                            <option key={s._id} value={s._id}>
                              {s.name || s.phone}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Zones attribuées</label>
                        <div className="max-h-56 overflow-auto rounded-xl border border-zinc-200 bg-white/60 p-3 shadow-sm dark:border-white/10 dark:bg-white/5">
                          {zones.length === 0 ? (
                            <div className="text-sm text-zinc-600 dark:text-zinc-300">Aucune zone.</div>
                          ) : (
                            zones.map((z) => {
                              const checked = assignZoneKeys.includes(z._id);
                              return (
                                <label key={z._id} className="flex cursor-pointer items-center gap-3 py-2 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      setAssignZoneKeys((prev) => {
                                        if (e.target.checked) return Array.from(new Set([...prev, z._id]));
                                        return prev.filter((x) => x !== z._id);
                                      });
                                    }}
                                  />
                                  <span className="font-semibold">{z.center}</span>
                                  <span>{z.zone}</span>
                                  <span className="text-zinc-600 dark:text-zinc-300">{z.sector}</span>
                                </label>
                              );
                            })
                          )}
                        </div>
                      </div>

                      <button type="button" onClick={() => void assignZonesToSupervisor()} className={"h-10 " + primaryButtonSmClassName}>
                        Enregistrer l’affectation
                      </button>
                    </div>
                  </section>
                </div>
              )
            ) : null}

            {tab === "ops" ? (
              opsSubTab === "invoices" ? (
                <div className="grid gap-6">
                  <section className={cardClassName}>
                    {sectionHeader(
                      "Factures",
                      "Synchroniser la collection invoices depuis les readings (rattrapage / recalcul).",
                    )}

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <div className="sm:col-span-1">
                        <label className="text-sm font-medium">Grace (jours)</label>
                        <input
                          className={inputClassName}
                          type="number"
                          min={0}
                          max={60}
                          value={syncInvoicesGraceDays}
                          onChange={(e) => setSyncInvoicesGraceDays(Number(e.target.value))}
                        />
                      </div>
                      <div className="sm:col-span-2 flex items-end gap-2">
                        <button
                          type="button"
                          onClick={() => void syncInvoices()}
                          disabled={syncInvoicesBusy}
                          className={"h-12 " + primaryButtonClassName}
                        >
                          {syncInvoicesBusy ? "Synchronisation…" : "Synchroniser invoices"}
                        </button>
                      </div>
                    </div>

                    {syncInvoicesReport ? (
                      <div className="mt-5 grid gap-3 sm:grid-cols-4">
                        <div className={"rounded-2xl border border-zinc-200 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-black/30"}>
                          <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Insérés</div>
                          <div className="mt-2 text-xl font-semibold">{syncInvoicesReport.inserted}</div>
                        </div>
                        <div className={"rounded-2xl border border-zinc-200 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-black/30"}>
                          <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Mis à jour</div>
                          <div className="mt-2 text-xl font-semibold">{syncInvoicesReport.updated}</div>
                        </div>
                        <div className={"rounded-2xl border border-zinc-200 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-black/30"}>
                          <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Ignorés</div>
                          <div className="mt-2 text-xl font-semibold">{syncInvoicesReport.skipped}</div>
                        </div>
                        <div className={"rounded-2xl border border-zinc-200 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-black/30"}>
                          <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Erreurs</div>
                          <div className="mt-2 text-xl font-semibold">{syncInvoicesReport.errors}</div>
                        </div>
                      </div>
                    ) : null}
                  </section>
                </div>
              ) : opsSubTab === "tariffs" ? (
                <div className="grid gap-6">
                  <section className={cardClassName}>
                    {sectionHeader(
                      "Tarifs (kWh)",
                      "Configurer des tranches de consommation (T1/T2/T3) et calculer le montant comme T1+T2+T3.",
                      <button
                        key="reload"
                        type="button"
                        onClick={() => void loadTariffs()}
                        className={"h-10 " + secondaryButtonSmClassName}
                        disabled={tariffsBusy}
                      >
                        {tariffsBusy ? "Chargement…" : "Rafraîchir"}
                      </button>,
                    )}

                    <div className="mt-5 grid gap-3">
                      {tariffs.length === 0 ? (
                        <div className={"rounded-2xl border border-zinc-200 bg-white/70 p-4 text-sm shadow-sm dark:border-white/10 dark:bg-black/30"}>
                          Aucun tarif chargé.
                        </div>
                      ) : (
                        <div className={tableCardClassName}>
                          <table className="w-full text-sm">
                            <thead className="bg-zinc-50 text-left text-xs text-zinc-500 dark:bg-white/5 dark:text-zinc-400">
                              <tr>
                                <th className="px-4 py-3 font-semibold">Code</th>
                                <th className="px-4 py-3 font-semibold">De (kWh)</th>
                                <th className="px-4 py-3 font-semibold">À (kWh)</th>
                                <th className="px-4 py-3 font-semibold">Prix / kWh</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-200 bg-white/70 dark:divide-white/10 dark:bg-black/30">
                              {tariffs
                                .slice()
                                .sort((a, b) => Number(a.fromKwh || 0) - Number(b.fromKwh || 0))
                                .map((t) => (
                                  <tr key={t._id}>
                                    <td className="px-4 py-3 font-semibold">{t.code}</td>
                                    <td className="px-4 py-3">
                                      <input
                                        className={inputClassName}
                                        type="number"
                                        min={1}
                                        step={1}
                                        value={t.fromKwh}
                                        onChange={(e) => {
                                          const v = Number(e.target.value);
                                          setTariffs((prev) => prev.map((x) => (x._id === t._id ? { ...x, fromKwh: v } : x)));
                                        }}
                                      />
                                    </td>
                                    <td className="px-4 py-3">
                                      <input
                                        className={inputClassName}
                                        type="number"
                                        min={1}
                                        step={1}
                                        value={t.toKwh === null ? "" : t.toKwh}
                                        placeholder="∞"
                                        onChange={(e) => {
                                          const raw = e.target.value;
                                          const v = raw.trim() === "" ? null : Number(raw);
                                          setTariffs((prev) => prev.map((x) => (x._id === t._id ? { ...x, toKwh: v } : x)));
                                        }}
                                      />
                                    </td>
                                    <td className="px-4 py-3">
                                      <input
                                        className={inputClassName}
                                        type="number"
                                        min={0}
                                        step={1}
                                        value={t.ratePerKwh}
                                        onChange={(e) => {
                                          const v = Number(e.target.value);
                                          setTariffs((prev) => prev.map((x) => (x._id === t._id ? { ...x, ratePerKwh: v } : x)));
                                        }}
                                      />
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => void saveTariffs()}
                        disabled={tariffsBusy || tariffs.length === 0}
                        className={"h-12 " + primaryButtonClassName}
                      >
                        {tariffsBusy ? "Enregistrement…" : "Enregistrer les tarifs"}
                      </button>

                      <button
                        type="button"
                        onClick={() => void syncInvoices()}
                        disabled={syncInvoicesBusy}
                        className={"h-12 " + secondaryButtonClassName}
                      >
                        {syncInvoicesBusy ? "Recalcul…" : "Appliquer aux factures (recalcul)"}
                      </button>
                    </div>
                  </section>
                </div>
              ) : opsSubTab === "tours" ? (
                <div className="grid gap-6">
                  <section className={cardClassName}>
                    {sectionHeader("Tournées", "Créer / assigner des tournées (MVP léger): à venir.")}
                    <div className={"mt-5 " + cardSoftClassName + " text-sm text-zinc-700 dark:text-zinc-200"}>
                      Prochain écran: création tournée + assignation agents.
                    </div>
                  </section>
                </div>
              ) : (
                <div className="grid gap-6">
                  <section className={cardClassName}>
                    {sectionHeader("Suivi terrain", "Agents bloqués, backlog offline, uploads photo en échec: à venir.")}
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-zinc-200 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-black/30">
                        <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Uploads photo en échec</div>
                        <div className="mt-2 text-xl font-semibold">—</div>
                      </div>
                      <div className="rounded-2xl border border-zinc-200 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-black/30">
                        <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Backlog offline</div>
                        <div className="mt-2 text-xl font-semibold">—</div>
                      </div>
                    </div>
                  </section>
                </div>
              )
            ) : null}

              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

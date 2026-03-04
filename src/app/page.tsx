"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";

type PortalSettings = {
  logoUrl: string;
  facebookUrl: string;
  linkedinUrl: string;
  xUrl: string;
  youtubeUrl: string;
  supportPhone: string;
  supportWhatsapp: string;
  latestAnnouncements: PortalAnnouncement[];
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

const defaultPortalSettings: PortalSettings = {
  logoUrl: "/nigelec-logo.svg",
  facebookUrl: "https://facebook.com",
  linkedinUrl: "https://linkedin.com",
  xUrl: "https://x.com",
  youtubeUrl: "https://youtube.com",
  supportPhone: "+224 611 00 00 00",
  supportWhatsapp: "+224611000000",
  latestAnnouncements: defaultLatestAnnouncements,
};

export default function Home() {
  const [activeAnnouncement, setActiveAnnouncement] = useState(0);
  const [portalSettings, setPortalSettings] = useState<PortalSettings>(defaultPortalSettings);
  const latestAnnouncements = portalSettings.latestAnnouncements.length
    ? portalSettings.latestAnnouncements
    : defaultLatestAnnouncements;

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
      const parsed = JSON.parse(raw) as Partial<PortalSettings> & { whatsappNumber?: string };
      const safeAnnouncements = Array.isArray(parsed.latestAnnouncements)
        ? Array.from({ length: 3 }, (_, index) => {
            const item = parsed.latestAnnouncements?.[index];
            const fallback = defaultLatestAnnouncements[index];
            return {
              id: typeof item?.id === "string" && item.id.trim() ? item.id : fallback.id,
              title: typeof item?.title === "string" ? item.title : fallback.title,
              message: typeof item?.message === "string" ? item.message : fallback.message,
              date: typeof item?.date === "string" ? item.date : fallback.date,
            };
          })
        : undefined;

      setPortalSettings((current) => ({
        ...current,
        ...parsed,
        supportWhatsapp:
          typeof parsed.supportWhatsapp === "string"
            ? parsed.supportWhatsapp
            : typeof parsed.whatsappNumber === "string"
              ? parsed.whatsappNumber
              : current.supportWhatsapp,
        latestAnnouncements: safeAnnouncements ?? current.latestAnnouncements,
      }));
    } catch {
      // keep defaults when local storage value is malformed
    }
  }, []);

  const whatsappDigits = portalSettings.supportWhatsapp.replace(/\D/g, "");
  const whatsappHref = whatsappDigits ? `https://wa.me/${whatsappDigits}` : "https://wa.me/";
  const supportTelHref = `tel:${portalSettings.supportPhone.replace(/\s+/g, "")}`;

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-red-500/25 via-zinc-900/10 to-zinc-500/15 blur-3xl dark:from-red-500/20 dark:via-white/5 dark:to-zinc-500/10" />
        <div className="absolute -bottom-44 right-[-140px] h-[560px] w-[560px] rounded-full bg-gradient-to-tr from-zinc-900/10 via-red-500/15 to-zinc-500/10 blur-3xl dark:from-white/5 dark:via-red-500/15 dark:to-zinc-500/10" />
      </div>

      <AppHeader />

      <section className="relative z-10 mx-auto w-full max-w-6xl px-6">
        <div className="rounded-2xl border border-red-100 bg-white/85 p-4 shadow-sm backdrop-blur dark:border-red-500/20 dark:bg-white/5">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center rounded-full bg-red-600 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
              Dernieres annonces
            </div>
            <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-300">
              {activeAnnouncement + 1}/{latestAnnouncements.length}
            </div>
          </div>

          <div className="mt-3 h-16 overflow-hidden">
            <div
              className="space-y-2 transition-transform duration-700 ease-out"
              style={{ transform: `translateY(-${activeAnnouncement * 72}px)` }}
            >
              {latestAnnouncements.map((announcement) => (
                <article key={announcement.id} className="h-16 rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2 dark:border-white/10 dark:bg-black/30">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{announcement.title}</p>
                    <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{announcement.date}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-300">{announcement.message}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-16 pt-8">
        <section className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/75 px-4 py-2 text-xs font-semibold text-zinc-700 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-zinc-200">
              Plateforme Relevés · Facturation · Paiements
              <span className="inline-flex items-center rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                NIGELEC
              </span>
            </div>

            <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Relevés intelligents,
              <span className="text-red-600"> facturation fiable</span>, suivi en temps réel.
            </h1>

            <p className="max-w-xl text-base leading-7 text-zinc-600 dark:text-zinc-300">
              Digitalisez les tournées terrain, sécurisez chaque relevé avec photo, synchronisez même hors ligne et améliorez durablement la facturation et le paiement client.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href="/login"
                className="inline-flex items-center justify-center rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Se connecter
              </a>
              <a
                href="/register"
                className="inline-flex items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200 dark:hover:bg-red-500/15"
              >
                Activer mon compte client
              </a>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex min-h-[190px] flex-col justify-center rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-950 via-slate-900 to-zinc-900 p-4 text-center text-sm shadow-lg shadow-slate-900/30">
                <div className="text-xs font-semibold text-slate-300">Terrain</div>
                <div className="mt-2 font-semibold text-zinc-100">Tournées maîtrisées et preuves photo fiables</div>
                <div className="mt-1 text-xs text-slate-300">Chaque relevé est validé, tracé et prêt pour le contrôle.</div>
              </div>
              <div className="flex min-h-[190px] flex-col justify-center rounded-2xl border border-red-700/70 bg-gradient-to-br from-red-950 via-red-900 to-rose-900 p-4 text-center text-sm shadow-lg shadow-red-950/30">
                <div className="text-xs font-semibold text-red-200">Gestion intelligente des factures</div>
                <div className="mt-2 font-semibold text-red-50">Invoices persistantes</div>
                <div className="mt-1 text-xs text-red-100/90">Suivi des échéances, retards et paiements.</div>
              </div>
              <div className="flex min-h-[190px] flex-col justify-center rounded-2xl border border-emerald-700/70 bg-gradient-to-br from-emerald-950 via-teal-900 to-cyan-900 p-4 text-center text-sm shadow-lg shadow-emerald-950/30">
                <div className="text-xs font-semibold text-emerald-200">Des règlements rapides, simples et sécurisés</div>
                <div className="mt-2 font-semibold text-emerald-50">En ligne (MVP)</div>
                <div className="mt-1 text-xs text-emerald-100/90">NITA · Virement · PI-SPI.</div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Accès rapide</div>
                <div className="mt-1 text-lg font-semibold">Choisir votre espace</div>
              </div>
              <img src={portalSettings.logoUrl || "/nigelec-logo.svg"} alt="NIGELEC" className="h-8 w-auto opacity-90" />
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <a
                href="/agent"
                className="group flex min-h-[248px] flex-col justify-center rounded-2xl border border-red-700/60 bg-gradient-to-br from-red-950 via-rose-900 to-zinc-900 p-6 text-center shadow-lg shadow-red-950/35 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-red-950/45"
              >
                <div className="text-xs font-semibold uppercase tracking-wide text-red-200">Agent releveur</div>
                <div className="mt-2 text-3xl font-semibold leading-tight text-red-50">Saisir des relevés</div>
                <div className="mt-3 text-base leading-8 text-red-100/90">Tournées, offline, synchronisation.</div>
                <div className="mt-5 text-sm font-semibold text-red-200 group-hover:text-white">
                  Ouvrir →
                </div>
              </a>

              <a
                href="/supervisor"
                className="group flex min-h-[248px] flex-col justify-center rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 text-center shadow-lg shadow-slate-950/35 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-950/45"
              >
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">Superviseur</div>
                <div className="mt-2 text-3xl font-semibold leading-tight text-zinc-100">Gérer agents et zones</div>
                <div className="mt-3 text-base leading-8 text-slate-300">Gère les tournées, relevés, clients et compteurs.</div>
                <div className="mt-5 text-sm font-semibold text-slate-200 group-hover:text-white">
                  Ouvrir →
                </div>
              </a>

              <a
                href="/admin"
                className="group flex min-h-[248px] flex-col justify-center rounded-2xl border border-fuchsia-700/60 bg-gradient-to-br from-fuchsia-950 via-purple-900 to-zinc-900 p-6 text-center shadow-lg shadow-fuchsia-950/35 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-fuchsia-950/45"
              >
                <div className="text-xs font-semibold uppercase tracking-wide text-fuchsia-200">Administration</div>
                <div className="mt-2 text-3xl font-semibold leading-tight text-fuchsia-50">Paramétrer et piloter</div>
                <div className="mt-3 text-base leading-8 text-fuchsia-100/90">Paramétrage, création utilisateurs, imports clients et compteurs, zones et affectations superviseurs.</div>
                <div className="mt-5 text-sm font-semibold text-fuchsia-200 group-hover:text-white">
                  Ouvrir →
                </div>
              </a>

              <a
                href="/customer"
                className="group flex min-h-[248px] flex-col justify-center rounded-2xl border border-emerald-700/60 bg-gradient-to-br from-emerald-950 via-teal-900 to-cyan-900 p-6 text-center shadow-lg shadow-emerald-950/35 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-950/45"
              >
                <div className="text-xs font-semibold uppercase tracking-wide text-emerald-200">Espace client</div>
                <div className="mt-2 text-3xl font-semibold leading-tight text-emerald-50">Suivre et payer</div>
                <div className="mt-3 text-base leading-8 text-emerald-100/90">Historique relevés, consommation, tarifications appliquées et paiement de facture.</div>
                <div className="mt-5 text-sm font-semibold text-emerald-200 group-hover:text-white">
                  Ouvrir →
                </div>
              </a>
            </div>
          </div>
        </section>

        <section className="mt-12 rounded-3xl border border-zinc-200 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
          <div className="grid gap-6 lg:grid-cols-3">
            <div>
              <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Pourquoi choisir cette plateforme ?</div>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">Une chaîne digitale complète, du relevé terrain jusqu’au paiement</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                Centralisez les relevés, fiabilisez la facturation, suivez les échéances en temps réel et améliorez durablement le recouvrement.
              </p>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-5 text-sm shadow-sm dark:border-white/10 dark:bg-black/30">
              <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Robustesse</div>
              <div className="mt-2 font-semibold">Synchronisation fiable, même hors connexion</div>
              <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                Aucune duplication, continuité de service et remontée sécurisée des données.
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 text-sm shadow-sm dark:border-white/10 dark:bg-black/30">
              <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Suivi</div>
              <div className="mt-2 font-semibold">Des statuts clairs pour un meilleur pilotage</div>
              <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">À payer · En retard · Payée, avec suivi précis des échéances.</div>
            </div>
          </div>
        </section>

        <footer className="mt-14 overflow-hidden rounded-3xl border border-red-100 bg-gradient-to-br from-white via-red-50/50 to-rose-100/60 p-6 text-zinc-800 shadow-lg shadow-red-200/40">
          <div className="grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-end">
            <div>
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white p-2 ring-1 ring-red-200 shadow-sm">
                  <img src={portalSettings.logoUrl || "/nigelec-logo.svg"} alt="NIGELEC" className="h-8 w-auto" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-zinc-900">NIGELEC Digital Platform</div>
                  <div className="text-xs text-zinc-500">Back-office · Relevés intelligents · Facturation</div>
                </div>
              </div>
              <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-600">
                Une plateforme unifiée pour piloter les relevés, la facturation et le recouvrement avec fiabilité, visibilité et performance.
              </p>
            </div>

            <div className="md:text-right">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Suivez-nous</div>
              <div className="mt-3 flex flex-wrap gap-2 md:justify-end">
                <a
                  href={portalSettings.facebookUrl || "https://facebook.com"}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-red-400 hover:bg-red-50"
                >
                  Facebook
                </a>
                <a
                  href={portalSettings.linkedinUrl || "https://linkedin.com"}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-red-400 hover:bg-red-50"
                >
                  LinkedIn
                </a>
                <a
                  href={portalSettings.xUrl || "https://x.com"}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-red-400 hover:bg-red-50"
                >
                  X
                </a>
                <a
                  href={portalSettings.youtubeUrl || "https://youtube.com"}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-red-400 hover:bg-red-50"
                >
                  YouTube
                </a>
              </div>
              <div className="mt-4 space-y-1 text-sm text-zinc-600 md:text-right">
                <a href={supportTelHref} className="block font-semibold text-zinc-700 hover:text-red-700">
                  Support: {portalSettings.supportPhone}
                </a>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
                >
                  WhatsApp support
                </a>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-red-100 pt-4 text-xs text-zinc-500">
            © {new Date().getFullYear()} NIGELEC · Tous droits réservés.
          </div>
        </footer>
      </main>
    </div>
  );
}

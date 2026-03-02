import { AppHeader } from "@/components/AppHeader";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-red-500/25 via-zinc-900/10 to-zinc-500/15 blur-3xl dark:from-red-500/20 dark:via-white/5 dark:to-zinc-500/10" />
        <div className="absolute -bottom-44 right-[-140px] h-[560px] w-[560px] rounded-full bg-gradient-to-tr from-zinc-900/10 via-red-500/15 to-zinc-500/10 blur-3xl dark:from-white/5 dark:via-red-500/15 dark:to-zinc-500/10" />
      </div>

      <AppHeader />

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
              Relevés terrain modernisés,
              <span className="text-red-600"> factures persistantes</span>, suivi clair.
            </h1>

            <p className="max-w-xl text-base leading-7 text-zinc-600 dark:text-zinc-300">
              Tournées terrain, saisie sécurisée (photo), synchronisation offline, génération de factures et paiement en ligne.
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
              <div className="rounded-2xl border border-zinc-200 bg-white/75 p-4 text-sm shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
                <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Terrain</div>
                <div className="mt-2 font-semibold">Tournées & preuves photo</div>
                <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">Validation agent + audit.</div>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-white/75 p-4 text-sm shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
                <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Facturation</div>
                <div className="mt-2 font-semibold">Invoices persistantes</div>
                <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">DUE / OVERDUE / PAID.</div>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-white/75 p-4 text-sm shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
                <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Paiements</div>
                <div className="mt-2 font-semibold">En ligne (MVP)</div>
                <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">NITA · Virement · PI-SPI.</div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Accès rapide</div>
                <div className="mt-1 text-lg font-semibold">Choisir votre espace</div>
              </div>
              <img src="/nigelec-logo.svg" alt="NIGELEC" className="h-8 w-auto opacity-90" />
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <a
                href="/agent"
                className="group rounded-2xl border border-red-100 bg-red-50/70 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-50 hover:shadow-md dark:border-white/10 dark:bg-black/30 dark:hover:border-red-500/30"
              >
                <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Agent releveur</div>
                <div className="mt-2 text-sm font-semibold">Saisir des relevés</div>
                <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Tournées, offline, synchronisation.</div>
                <div className="mt-4 text-xs font-semibold text-red-700 group-hover:text-red-800 dark:text-red-200">
                  Ouvrir →
                </div>
              </a>

              <a
                href="/supervisor"
                className="group rounded-2xl border border-zinc-200 bg-zinc-50/70 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-zinc-50 hover:shadow-md dark:border-white/10 dark:bg-black/30 dark:hover:border-white/20"
              >
                <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Superviseur</div>
                <div className="mt-2 text-sm font-semibold">Contrôler &amp; filtrer</div>
                <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Relevés par date, zone, agent.</div>
                <div className="mt-4 text-xs font-semibold text-red-700 group-hover:text-red-800 dark:text-red-200">
                  Ouvrir →
                </div>
              </a>

              <a
                href="/admin"
                className="group rounded-2xl border border-zinc-200 bg-rose-50/60 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:bg-rose-50 hover:shadow-md dark:border-white/10 dark:bg-black/30 dark:hover:border-red-500/30"
              >
                <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Administration</div>
                <div className="mt-2 text-sm font-semibold">Paramétrer &amp; synchroniser</div>
                <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Imports, zones, invoices, coupures.</div>
                <div className="mt-4 text-xs font-semibold text-red-700 group-hover:text-red-800 dark:text-red-200">
                  Ouvrir →
                </div>
              </a>

              <a
                href="/customer"
                className="group rounded-2xl border border-red-100 bg-red-50/40 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-50/60 hover:shadow-md dark:border-white/10 dark:bg-black/30 dark:hover:border-red-500/30"
              >
                <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Espace client</div>
                <div className="mt-2 text-sm font-semibold">Consulter &amp; payer</div>
                <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Factures, échéances, paiements.</div>
                <div className="mt-4 text-xs font-semibold text-red-700 group-hover:text-red-800 dark:text-red-200">
                  Ouvrir →
                </div>
              </a>
            </div>
          </div>
        </section>

        <section className="mt-12 rounded-3xl border border-zinc-200 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
          <div className="grid gap-6 lg:grid-cols-3">
            <div>
              <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Pourquoi cette plateforme ?</div>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">Une chaîne complète, du terrain à la facture</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                Centralisation des relevés, génération automatique des factures persistantes et visibilité sur les impayés.
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 text-sm shadow-sm dark:border-white/10 dark:bg-black/30">
              <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Robustesse</div>
              <div className="mt-2 font-semibold">Idempotence & offline</div>
              <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Pas de doublons, synchronisation fiable.</div>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 text-sm shadow-sm dark:border-white/10 dark:bg-black/30">
              <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Suivi</div>
              <div className="mt-2 font-semibold">Statuts clairs</div>
              <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">DUE / OVERDUE / PAID + échéances.</div>
            </div>
          </div>
        </section>

        <footer className="mt-14 border-t border-zinc-200 pt-8 text-sm text-zinc-500 dark:border-white/10 dark:text-zinc-400">
          © {new Date().getFullYear()} NIGELEC · Back-office & relevés intelligents
        </footer>
      </main>
    </div>
  );
}

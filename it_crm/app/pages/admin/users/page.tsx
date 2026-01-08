"use client"; // Kažemo Next.js-u da se ova stranica renderuje na klijentu (browser), jer koristimo hook-ove i fetch.

import { useEffect, useMemo, useState } from "react"; // Uvozimo React hook-ove: state, efekti i memoizacija.
import { useRouter } from "next/navigation"; // Uvozimo Next.js router za navigaciju/redirect.

import type { Role } from "@/src/client/types/role"; // Tip za ulogu korisnika (admin/sales_manager/freelance_consultant).
import type { Me } from "@/src/client/types/me"; // Tip za trenutno ulogovanog korisnika (/me odgovor).
import type { UserRow } from "@/src/client/types/userRow"; // Tip za red u tabeli korisnika (ono što backend vraća).
import type { SortBy } from "@/src/client/types/sortBy"; // Tip za kolonu po kojoj sortiramo (npr. name/email/role/isActive).
import type { SortDir } from "@/src/client/types/sortDir"; // Tip za smer sortiranja (asc/desc).

function useDebounce<T>(value: T, delayMs = 350) { // Custom hook za debouncing vrednosti (da ne šaljemo request na svaki keystroke).
  const [debounced, setDebounced] = useState(value); // Interni state gde čuvamo "usporenu" verziju vrednosti.
  useEffect(() => { // Svaki put kada value ili delayMs promene, restartujemo timer.
    const t = setTimeout(() => setDebounced(value), delayMs); // Nakon delayMs, upisujemo novu vrednost u debounced.
    return () => clearTimeout(t); // Cleanup: brišemo timer da ne ostane "viseći".
  }, [value, delayMs]); // Zavisnosti: value i delayMs.
  return debounced; // Vraćamo debounced vrednost.
}

function buildQuery(params: Record<string, string | number | boolean | undefined | null>) { // Helper za pravljenje query string-a.
  const sp = new URLSearchParams(); // Kreiramo URLSearchParams da lako dodajemo parametre.
  Object.entries(params).forEach(([k, v]) => { // Iteriramo kroz sve parove (ključ, vrednost).
    if (v === undefined || v === null || v === "") return; // Preskačemo prazne/undefined/null vrednosti da ne idu u URL.
    sp.set(k, String(v)); // Postavljamo parametar kao string (URL mora biti string).
  });
  const qs = sp.toString(); // Pretvaramo sve parametre u "a=1&b=2".
  return qs ? `?${qs}` : ""; // Ako ima parametara, vraćamo sa ?, u suprotnom prazan string.
}

function badgeRole(role: Role) { // Funkcija koja mapira role na label (za prikaz u UI).
  if (role === "admin") return "Admin."; // Ako je admin, prikaži Admin.
  if (role === "sales_manager") return "Sales manager."; // Ako je sales_manager, prikaži Sales manager.
  return "Freelancer."; // U suprotnom (freelance_consultant), prikaži Freelancer.
}

function rolePillClass(role: Role) { // Funkcija koja vraća Tailwind klase za "pill" u zavisnosti od role.
  if (role === "admin") return "bg-slate-900 text-white border-slate-900"; // Admin = tamna oznaka.
  if (role === "sales_manager") return "bg-cyan-50 text-cyan-900 border-cyan-200"; // Sales manager = cyan tema.
  return "bg-fuchsia-50 text-fuchsia-900 border-fuchsia-200"; // Freelancer = fuchsia tema.
}

function statusPillClass(active: boolean) { // Funkcija koja vraća Tailwind klase za "pill" u zavisnosti od aktivnog statusa.
  return active
    ? "bg-emerald-50 text-emerald-900 border-emerald-200" // Active = zelena oznaka.
    : "bg-rose-50 text-rose-900 border-rose-200"; // Inactive = crvena oznaka.
}

export default function AdminUsersPage() { // Glavna Admin stranica za upravljanje korisnicima.
  const router = useRouter(); // Router za redirect ako nije admin ili nije ulogovan.

  const PAGE_SIZE = 5; // Koliko redova prikazujemo po strani (pagination).

  const [me, setMe] = useState<Me | null>(null); // Trenutno ulogovani korisnik.
  const [authLoading, setAuthLoading] = useState(true); // Da li još traje provera autentifikacije.

  const [rows, setRows] = useState<UserRow[]>([]); // Podaci za tabelu (korisnici).
  const [total, setTotal] = useState(0); // Ukupan broj korisnika (za pagination).

  const [page, setPage] = useState(1); // Trenutna strana.

  const [search, setSearch] = useState(""); // Unos za pretragu (name/email).
  const debouncedSearch = useDebounce(search, 350); // Debounced verzija pretrage da ne spamujemo backend.

  const [roleFilter, setRoleFilter] = useState<Role | "all">("all"); // Filter po roli (ili all).
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all"); // Filter po statusu (aktivni/neaktivni).

  const [sortBy, setSortBy] = useState<SortBy>("name"); // Koja kolona je aktivna za sortiranje.
  const [sortDir, setSortDir] = useState<SortDir>("asc"); // Smer sortiranja: asc ili desc.

  const [loading, setLoading] = useState(true); // Da li se lista učitava.
  const [error, setError] = useState<string | null>(null); // Greška za prikaz u UI.

  const totalPages = useMemo(() => { // Memoizujemo izračun totalPages da se ne računa bespotrebno.
    const tp = Math.ceil(total / PAGE_SIZE); // Zaokružujemo na gore broj strana.
    return tp <= 0 ? 1 : tp; // Ako total=0, i dalje prikazujemo 1 stranu u UI.
  }, [total]); // Zavisnost: total.

  useEffect(() => { // Guard: proveravamo da li je korisnik ulogovan i da li je admin.
    let cancelled = false; // Flag da spreči setState nakon unmount-a.

    (async () => { // Async IIFE za fetch.
      try {
        const res = await fetch("/api/auth/me"); // Dohvat trenutnog korisnika.
        if (!res.ok) { // Ako nije ok, nema sesije ili nije autorizovan.
          router.push("/pages/auth/login"); // Prebaci na login.
          return; // Prekini.
        }

        const data = (await res.json()) as Me; // Parsiramo /me odgovor.

        if (!data || data.role !== "admin") { // Ako nije admin, nema pristup ovoj stranici.
          if (data?.role) router.push(`/pages/${data.role}/home`); // Ako ima rolu, vodi na njegov home.
          else router.push("/pages/auth/login"); // Ako nema rolu, vodi na login.
          return; // Prekini.
        }

        if (!cancelled) setMe(data); // Upisujemo u state samo ako nije unmount.
      } catch {
        router.push("/pages/auth/login"); // Ako fetch pukne, tretiramo kao neulogovanog.
      } finally {
        if (!cancelled) setAuthLoading(false); // Završavamo auth loading (samo ako nije unmount).
      }
    })();

    return () => {
      cancelled = true; // Cleanup: označimo unmount.
    };
  }, [router]); // Zavisnost: router.

  useEffect(() => { // Kada se promene filteri/pretraga, vraćamo pagination na prvu stranu.
    setPage(1); // Reset stranice na 1.
  }, [debouncedSearch, roleFilter, statusFilter]); // Zavisnosti: debouncedSearch i filteri.

  useEffect(() => { // Učitavanje liste korisnika sa backend-a.
    if (authLoading) return; // Ako auth još traje, ne učitavamo listu.
    if (!me) return; // Ako nema user-a (ne bi trebalo posle guard-a), prekid.

    let cancelled = false; // Flag protiv setState posle unmount-a.

    (async () => { // Async IIFE.
      setLoading(true); // Postavljamo loading na true pre request-a.
      setError(null); // Resetujemo grešku.

      try {
        const isActive =
          statusFilter === "all" ? undefined : statusFilter === "active" ? true : false; // Pretvaramo status filter u boolean.

        const qs = buildQuery({ // Gradimo query string za backend.
          page, // Trenutna strana.
          pageSize: PAGE_SIZE, // Veličina strane.
          q: debouncedSearch || undefined, // Backend očekuje q.
          role: roleFilter === "all" ? undefined : roleFilter, // Backend očekuje role.
          isActive: typeof isActive === "boolean" ? isActive : undefined, // Backend očekuje isActive.
        });

        const res = await fetch(`/api/admin/users${qs}`, { method: "GET" }); // Pozivamo endpoint.
        if (!res.ok) throw new Error("Cannot load users list."); // Poruka na engleskom.

        const json = await res.json(); // Parsiramo JSON.
        const items: UserRow[] = json?.items ?? []; // Items ili prazan niz.
        const totalValue: number = json?.total ?? 0; // Total ili 0.

        if (!cancelled) {
          setRows(Array.isArray(items) ? items : []); // Upisujemo rows.
          setTotal(typeof totalValue === "number" ? totalValue : 0); // Upisujemo total.
        }
      } catch (e: any) {
        if (!cancelled) {
          setRows([]); // Reset rows.
          setTotal(0); // Reset total.
          setError(e?.message || "Something went wrong."); // Greška na engleskom.
        }
      } finally {
        if (!cancelled) setLoading(false); // Gasimo loading.
      }
    })();

    return () => {
      cancelled = true; // Cleanup.
    };
  }, [authLoading, me, page, debouncedSearch, roleFilter, statusFilter]); // Zavisnosti.

  function toggleSort(next: SortBy) { // Menja sort kolonu i smer.
    if (sortBy !== next) { // Ako prelazimo na novu kolonu...
      setSortBy(next); // Postavi novu kolonu.
      setSortDir("asc"); // Resetuj smer.
      return; // Prekini.
    }
    setSortDir((d) => (d === "asc" ? "desc" : "asc")); // Toggle smer.
  }

  function SortIcon({ col }: { col: SortBy }) { // Ikonica sortiranja.
    const active = sortBy === col; // Da li je aktivno.
    if (!active) return <span className="text-slate-300">⇅</span>; // Neutralno.
    return <span className="text-slate-700">{sortDir === "asc" ? "↑" : "↓"}</span>; // Smer.
  }

  const sortedRows = useMemo(() => { // Sortiranje client-side.
    const copy = [...rows]; // Kopija niza.

    copy.sort((a, b) => { // Sort comparator.
      const dir = sortDir === "asc" ? 1 : -1; // Faktor smera.
      const av = (a as any)[sortBy]; // Vrednost a.
      const bv = (b as any)[sortBy]; // Vrednost b.

      if (typeof av === "boolean" && typeof bv === "boolean") return (Number(av) - Number(bv)) * dir; // Boolean sort.
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir; // Number sort.

      return (
        String(av ?? "").localeCompare(String(bv ?? ""), undefined, { sensitivity: "base" }) * dir
      ); // String sort (case-insensitive).
    });

    return copy; // Vraćamo sortirano.
  }, [rows, sortBy, sortDir]); // Zavisnosti.

  if (authLoading) { // Skeleton dok traje auth.
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="h-10 w-56 animate-pulse rounded bg-slate-200" />
        <div className="mt-6 h-64 animate-pulse rounded-2xl bg-slate-100" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Users.</h1>
          <p className="mt-1 text-sm text-slate-600">User list with search, filters, and sorting.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">{me?.name}.</div>
          <div className="text-xs text-slate-600">Administrator.</div>
        </div>
      </header>

      <section className="mt-6 grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <div className="md:col-span-2">
          <label className="text-xs font-semibold text-slate-700">Search.</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email."
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700">Role.</label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400"
          >
            <option value="all">All.</option>
            <option value="admin">Admin.</option>
            <option value="sales_manager">Sales manager.</option>
            <option value="freelance_consultant">Freelancer.</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700">Status.</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400"
          >
            <option value="all">All.</option>
            <option value="active">Active.</option>
            <option value="inactive">Inactive.</option>
          </select>
        </div>
      </section>

      <section className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="text-sm font-semibold text-slate-900">
            Results: <span className="text-slate-600">{total}.</span>
          </div>
          <div className="text-xs text-slate-600">
            Page {page} / {totalPages}.
          </div>
        </div>

        {error ? <div className="px-4 py-6 text-sm text-rose-700">{error}</div> : null}

        <div className="w-full overflow-x-auto">
          {/* VAŽNO: unutar <table> ne sme da postoji {" "} ili bilo kakav tekst node */}
          <table className="w-full min-w-[720px]">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold text-slate-700">
                <th className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleSort("name")}
                    className="inline-flex items-center gap-2"
                  >
                    Name <SortIcon col="name" />
                  </button>
                </th>

                <th className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleSort("email")}
                    className="inline-flex items-center gap-2"
                  >
                    Email <SortIcon col="email" />
                  </button>
                </th>

                <th className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleSort("role")}
                    className="inline-flex items-center gap-2"
                  >
                    Role <SortIcon col="role" />
                  </button>
                </th>

                <th className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleSort("isActive")}
                    className="inline-flex items-center gap-2"
                  >
                    Status <SortIcon col="isActive" />
                  </button>
                </th>

                <th className="px-4 py-3">Manager ID.</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-4">
                      <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 w-56 animate-pulse rounded bg-slate-200" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-6 w-24 animate-pulse rounded-full bg-slate-200" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-6 w-24 animate-pulse rounded-full bg-slate-200" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 w-16 animate-pulse rounded bg-slate-200" />
                    </td>
                  </tr>
                ))
              ) : sortedRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-600" colSpan={5}>
                    No results for the selected filters.
                  </td>
                </tr>
              ) : (
                sortedRows.map((u) => (
                  <tr key={u.id} className="text-sm text-slate-900">
                    <td className="px-4 py-4 font-semibold">{u.name}.</td>
                    <td className="px-4 py-4 text-slate-700">{u.email}.</td>

                    <td className="px-4 py-4">
                      <span
                        className={[
                          "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
                          rolePillClass(u.role),
                        ].join(" ")}
                      >
                        {badgeRole(u.role)}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={[
                          "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
                          statusPillClass(u.isActive),
                        ].join(" ")}
                      >
                        {u.isActive ? "Active." : "Inactive."}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-slate-700">{u.managerId ?? "-"}.</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition disabled:opacity-50"
          >
            Prev.
          </button>

          <div className="text-xs text-slate-600">
            Showing {sortedRows.length} of {total}.
          </div>

          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition disabled:opacity-50"
          >
            Next.
          </button>
        </div>
      </section>
    </main>
  );
}

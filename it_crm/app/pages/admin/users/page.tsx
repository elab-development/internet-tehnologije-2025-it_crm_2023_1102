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
        const isActive = // Pretvaramo statusFilter u boolean ili undefined (kako backend očekuje).
          statusFilter === "all" ? undefined : statusFilter === "active" ? true : false;

        const qs = buildQuery({ // Gradimo query string za backend.
          page, // Trenutna strana.
          pageSize: PAGE_SIZE, // Veličina strane.
          q: debouncedSearch || undefined, // Backend očekuje q kao search parametar.
          role: roleFilter === "all" ? undefined : roleFilter, // Ako je all, ne šaljemo role.
          isActive: typeof isActive === "boolean" ? isActive : undefined, // Backend očekuje isActive true/false.
        });

        const res = await fetch(`/api/admin/users${qs}`, { method: "GET" }); // Pozivamo admin users list endpoint.
        if (!res.ok) throw new Error("Cannot load users list."); // Poruka greške na engleskom (traženo).

        const json = await res.json(); // Parsiramo JSON odgovor.

        // ok() wrapper vraća objekat { items, total, page, pageSize } (po tvojoj napomeni).
        const items: UserRow[] = json?.items ?? []; // Sigurno uzimamo items ili prazan niz.
        const totalValue: number = json?.total ?? 0; // Sigurno uzimamo total ili 0.

        if (!cancelled) { // Ako nije unmount, ažuriramo state.
          setRows(Array.isArray(items) ? items : []); // Provera da li je items zaista niz.
          setTotal(typeof totalValue === "number" ? totalValue : 0); // Provera da li je total broj.
        }
      } catch (e: any) {
        if (!cancelled) { // Ako nije unmount, postavljamo error state.
          setRows([]); // Praznimo tabelu.
          setTotal(0); // Resetujemo total.
          setError(e?.message || "Something went wrong."); // Greška na engleskom (fallback).
        }
      } finally {
        if (!cancelled) setLoading(false); // Gasimo loading.
      }
    })();

    return () => {
      cancelled = true; // Cleanup: označimo unmount.
    };
  }, [authLoading, me, page, debouncedSearch, roleFilter, statusFilter]); // Zavisnosti koje menjaju listu.

  function toggleSort(next: SortBy) { // Funkcija koja menja sort kolonu i smer.
    if (sortBy !== next) { // Ako menjamo na novu kolonu...
      setSortBy(next); // Postavljamo novu kolonu.
      setSortDir("asc"); // Resetujemo smer na asc.
      return; // Prekid.
    }
    setSortDir((d) => (d === "asc" ? "desc" : "asc")); // Ako je ista kolona, samo toggluj asc/desc.
  }

  function SortIcon({ col }: { col: SortBy }) { // Mala komponenta za prikaz ikonice sortiranja u header-u.
    const active = sortBy === col; // Da li je ova kolona aktivna.
    if (!active) return <span className="text-slate-300">⇅</span>; // Ako nije aktivna, prikaži neutralnu ikonu.
    return <span className="text-slate-700">{sortDir === "asc" ? "↑" : "↓"}</span>; // Ako jeste, prikaži smer.
  }

  // Sortiranje client-side (pošto backend ne sortira).
  const sortedRows = useMemo(() => { // Memoizujemo sortiranu listu.
    const copy = [...rows]; // Pravimo kopiju da ne mutiramo original state.

    copy.sort((a, b) => { // Sort funkcija.
      const dir = sortDir === "asc" ? 1 : -1; // Dir faktor koji menja smer.

      const av = (a as any)[sortBy]; // Uzmi vrednost iz objekta a za izabranu kolonu.
      const bv = (b as any)[sortBy]; // Uzmi vrednost iz objekta b za izabranu kolonu.

      if (typeof av === "boolean" && typeof bv === "boolean") { // Ako su boolean vrednosti...
        return (Number(av) - Number(bv)) * dir; // Sortiramo preko 0/1.
      }

      if (typeof av === "number" && typeof bv === "number") { // Ako su brojevi...
        return (av - bv) * dir; // Numeričko sortiranje.
      }

      return String(av ?? "") // Ako su string (ili nešto drugo), pretvorimo u string.
        .localeCompare(String(bv ?? ""), undefined, { sensitivity: "base" }) * dir; // Case-insensitive compare.
    });

    return copy; // Vraćamo sortiranu kopiju.
  }, [rows, sortBy, sortDir]); // Zavisnosti: kada se promeni rows ili sort podešavanje.

  if (authLoading) { // Dok traje auth provera, prikazujemo skeleton.
    return (
      <main className="mx-auto max-w-6xl px-4 py-8"> {/* Wrapper za skeleton. */}
        <div className="h-10 w-56 animate-pulse rounded bg-slate-200" /> {/* Skeleton za naslov. */}
        <div className="mt-6 h-64 animate-pulse rounded-2xl bg-slate-100" /> {/* Skeleton za tabelu. */}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8"> {/* Glavni container stranice. */}
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"> {/* Header sa naslovom i user badge-om. */}
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Users.</h1> {/* Naslov na engleskom. */}
          <p className="mt-1 text-sm text-slate-600">
            User list with search, filters, and sorting.
          </p> {/* Opis na engleskom (traženo). */}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"> {/* Kartica sa info o adminu. */}
          <div className="text-sm font-semibold text-slate-900">{me?.name}.</div> {/* Ime admina. */}
          <div className="text-xs text-slate-600">Administrator.</div> {/* Label (može i "Administrator." ostaje ok). */}
        </div>
      </header>

      <section className="mt-6 grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4"> {/* Filter bar. */}
        <div className="md:col-span-2">
          <label className="text-xs font-semibold text-slate-700">Search.</label> {/* Label na engleskom. */}
          <input
            value={search} // Controlled input: vrednost iz state-a.
            onChange={(e) => setSearch(e.target.value)} // Update state na promenu input-a.
            placeholder="Search by name or email." // Placeholder na engleskom.
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400" // Tailwind stil.
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700">Role.</label> {/* Filter label na engleskom. */}
          <select
            value={roleFilter} // Controlled select: vrednost iz state-a.
            onChange={(e) => setRoleFilter(e.target.value as any)} // Update role filter.
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400" // Stil.
          >
            <option value="all">All.</option> {/* Opcija za sve role. */}
            <option value="admin">Admin.</option> {/* Admin opcija. */}
            <option value="sales_manager">Sales manager.</option> {/* Sales manager opcija. */}
            <option value="freelance_consultant">Freelancer.</option> {/* Freelancer opcija. */}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700">Status.</label> {/* Filter label na engleskom. */}
          <select
            value={statusFilter} // Controlled select.
            onChange={(e) => setStatusFilter(e.target.value as any)} // Update status filter.
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400" // Stil.
          >
            <option value="all">All.</option> {/* Sve. */}
            <option value="active">Active.</option> {/* Aktivni. */}
            <option value="inactive">Inactive.</option> {/* Neaktivni. */}
          </select>
        </div>
      </section>

      <section className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"> {/* Tabela wrapper. */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"> {/* Header tabele. */}
          <div className="text-sm font-semibold text-slate-900">
            Results: <span className="text-slate-600">{total}.</span>
          </div> {/* Ukupan broj rezultata. */}
          <div className="text-xs text-slate-600">
            Page {page} / {totalPages}.
          </div> {/* Pagination info. */}
        </div>

        {error ? <div className="px-4 py-6 text-sm text-rose-700">{error}</div> : null} {/* Prikaz greške ako postoji. */}

        <div className="w-full overflow-x-auto"> {/* Omogućava horizontalni scroll na manjim ekranima. */}
          <table className="w-full min-w-[720px]"> {/* Tabela sa minimalnom širinom. */}
            <thead className="bg-slate-50"> {/* Zaglavlje tabele. */}
              <tr className="text-left text-xs font-semibold text-slate-700"> {/* Red zaglavlja. */}
                <th className="px-4 py-3">
                  <button type="button" onClick={() => toggleSort("name")} className="inline-flex items-center gap-2">
                    Name <SortIcon col="name" />
                  </button> {/* Klik menja sortiranje po name. */}
                </th>

                <th className="px-4 py-3">
                  <button type="button" onClick={() => toggleSort("email")} className="inline-flex items-center gap-2">
                    Email <SortIcon col="email" />
                  </button> {/* Klik menja sortiranje po email. */}
                </th>

                <th className="px-4 py-3">
                  <button type="button" onClick={() => toggleSort("role")} className="inline-flex items-center gap-2">
                    Role <SortIcon col="role" />
                  </button> {/* Klik menja sortiranje po role. */}
                </th>

                <th className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleSort("isActive")}
                    className="inline-flex items-center gap-2"
                  >
                    Status <SortIcon col="isActive" />
                  </button> {/* Klik menja sortiranje po isActive. */}
                </th>

                <th className="px-4 py-3">Manager ID.</th> {/* Kolona bez sortiranja. */}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100"> {/* Telo tabele sa separatorima. */}
              {loading ? ( // Ako učitava, prikaži skeleton redove.
                Array.from({ length: PAGE_SIZE }).map((_, i) => ( // Generišemo PAGE_SIZE skeleton redova.
                  <tr key={i}>
                    <td className="px-4 py-4"><div className="h-4 w-40 animate-pulse rounded bg-slate-200" /></td> {/* Skeleton za name. */}
                    <td className="px-4 py-4"><div className="h-4 w-56 animate-pulse rounded bg-slate-200" /></td> {/* Skeleton za email. */}
                    <td className="px-4 py-4"><div className="h-6 w-24 animate-pulse rounded-full bg-slate-200" /></td> {/* Skeleton za role pill. */}
                    <td className="px-4 py-4"><div className="h-6 w-24 animate-pulse rounded-full bg-slate-200" /></td> {/* Skeleton za status pill. */}
                    <td className="px-4 py-4"><div className="h-4 w-16 animate-pulse rounded bg-slate-200" /></td> {/* Skeleton za managerId. */}
                  </tr>
                ))
              ) : sortedRows.length === 0 ? ( // Ako nema rezultata...
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-600" colSpan={5}>
                    No results for the selected filters.
                  </td> {/* Poruka na engleskom. */}
                </tr>
              ) : ( // Inače, renderujemo stvarne redove.
                sortedRows.map((u) => ( // Iteriramo kroz sortirane korisnike.
                  <tr key={u.id} className="text-sm text-slate-900"> {/* Jedan red tabele. */}
                    <td className="px-4 py-4 font-semibold">{u.name}.</td> {/* Ime korisnika. */}
                    <td className="px-4 py-4 text-slate-700">{u.email}.</td> {/* Email korisnika. */}
                    <td className="px-4 py-4">
                      <span
                        className={[
                          "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
                          rolePillClass(u.role),
                        ].join(" ")}
                      >
                        {badgeRole(u.role)}
                      </span> {/* Role badge sa bojom. */}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={[
                          "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
                          statusPillClass(u.isActive),
                        ].join(" ")}
                      >
                        {u.isActive ? "Active." : "Inactive."}
                      </span> {/* Status badge sa bojom. */}
                    </td>
                    <td className="px-4 py-4 text-slate-700">{u.managerId ?? "-"}.</td> {/* ManagerId ili "-" ako nema. */}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3"> {/* Footer tabele sa paginacijom. */}
          <button
            type="button" // Button element.
            disabled={page <= 1 || loading} // Disable ako smo na prvoj strani ili se učitava.
            onClick={() => setPage((p) => Math.max(1, p - 1))} // Prethodna strana.
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition disabled:opacity-50" // Stil.
          >
            Prev.
          </button>

          <div className="text-xs text-slate-600">
            Showing {sortedRows.length} of {total}.
          </div> {/* Informacija koliko prikazujemo. */}

          <button
            type="button" // Button element.
            disabled={page >= totalPages || loading} // Disable ako smo na poslednjoj strani ili se učitava.
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))} // Sledeća strana.
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition disabled:opacity-50" // Stil.
          >
            Next.
          </button>
        </div>
      </section>
    </main>
  );
}

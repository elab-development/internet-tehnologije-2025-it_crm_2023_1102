"use client"; // Ovim označavamo da je komponenta Client Component (izvršava se u browser-u).

import { useEffect, useMemo, useState } from "react"; // Uvozimo React hook-ove: state, side effects i memoizaciju.
import { useRouter } from "next/navigation"; // Uvozimo Next.js router za navigaciju (redirect).

import type { Me } from "@/src/client/types/me"; // Tip za trenutno ulogovanog korisnika.

import type { ClientCategory } from "@/src/client/types/clientCategory"; // Tip za kategorije klijenata (dropdown).

import type { ClientCompany } from "@/src/client/types/clientCompany"; // Tip za klijentsku kompaniju (red u tabeli + detalji).

function useDebounce<T>(value: T, delayMs = 350) { // Debounce hook: odlaže promenu vrednosti da ne spamujemo API.
  const [debounced, setDebounced] = useState(value); // Čuvamo debounced vrednost u state-u.

  useEffect(() => { // Effect se okida kad se value ili delay promene.
    const t = setTimeout(() => setDebounced(value), delayMs); // Čekamo delayMs pa tek onda setujemo novu vrednost.
    return () => clearTimeout(t); // Čistimo timeout da se stara vrednost ne primeni kasnije.
  }, [value, delayMs]); // Zavisnosti: value i delayMs.

  return debounced; // Vraćamo debounced vrednost.
}

function buildQuery(params: Record<string, string | number | boolean | undefined | null>) { // Helper za pravljenje query string-a iz parametara.
  const sp = new URLSearchParams(); // Kreiramo URLSearchParams objekat.
  Object.entries(params).forEach(([k, v]) => { // Prolazimo kroz sve parametre.
    if (v === undefined || v === null || v === "") return; // Preskačemo prazne parametre.
    sp.set(k, String(v)); // Upisujemo parametar kao string.
  });
  const qs = sp.toString(); // Pretvaramo u "a=1&b=2" format.
  return qs ? `?${qs}` : ""; // Ako ima parametara vraćamo ?..., inače prazan string.
}

export default function FreelancerClientCompaniesPage() { // Glavna stranica za freelancer konsultanta (client companies list).
  const router = useRouter(); // Inicijalizujemo router za redirect.
  const PAGE_SIZE = 5; // Broj redova po strani.

  const [me, setMe] = useState<Me | null>(null); // State za ulogovanog korisnika.
  const [authLoading, setAuthLoading] = useState(true); // State za loading tokom auth provere.

  const [categories, setCategories] = useState<ClientCategory[]>([]); // Kategorije za client-side filter (dropdown).
  const [rows, setRows] = useState<ClientCompany[]>([]); // Sirovi server-side rezultat (pre category filtera).
  const [total, setTotal] = useState(0); // Ukupan broj rezultata sa servera.

  const [page, setPage] = useState(1); // Trenutna strana paginacije.

  const [q, setQ] = useState(""); // Search input (client name).
  const dq = useDebounce(q, 350); // Debounced search string.

  const [city, setCity] = useState(""); // City filter input.
  const dCity = useDebounce(city, 350); // Debounced city filter.

  const [status, setStatus] = useState<string>("all"); // Status filter (server-side).
  const [categoryId, setCategoryId] = useState<number | "all">("all"); // Category filter (client-side).

  const [loading, setLoading] = useState(true); // Loading state za listu.
  const [error, setError] = useState<string | null>(null); // Error state za listu.

  // Details drawer.
  const [openId, setOpenId] = useState<number | null>(null); // ID kompanije čiji drawer je otvoren.
  const [details, setDetails] = useState<ClientCompany | null>(null); // Detalji kompanije za drawer.
  const [detailsLoading, setDetailsLoading] = useState(false); // Loading state za detalje.
  const [detailsError, setDetailsError] = useState<string | null>(null); // Error state za detalje.

  const totalPages = useMemo(() => { // Memoizujemo ukupan broj strana.
    const tp = Math.ceil(total / PAGE_SIZE); // Računamo totalPages.
    return tp <= 0 ? 1 : tp; // Minimalno 1 da UI ne pokaže 0 strana.
  }, [total]); // Zavisnost je total.

  // Guard.
  useEffect(() => { // Proveravamo auth i ulogu korisnika.
    let cancelled = false; // Flag da ne radimo setState posle unmount-a.

    (async () => { // IIFE za async/await.
      try {
        const res = await fetch("/api/auth/me"); // Pozivamo endpoint koji vraća user-a.
        if (!res.ok) { // Ako nije ok, user nije ulogovan.
          router.push("/pages/auth/login"); // Redirect na login.
          return; // Prekid.
        }

        const data = (await res.json()) as Me; // Parsiramo user-a.

        if (!data || data.role !== "freelance_consultant") { // Ako user nije freelancer.
          if (data?.role) router.push(`/pages/${data.role}/home`); // Redirect na njegov home.
          else router.push("/pages/auth/login"); // Ako nema role, na login.
          return; // Prekid.
        }

        if (!cancelled) setMe(data); // Setujemo me ako nije unmount.
      } catch {
        router.push("/pages/auth/login"); // Ako se desi greška, vraćamo na login.
      } finally {
        if (!cancelled) setAuthLoading(false); // Gasimo auth loading.
      }
    })();

    return () => {
      cancelled = true; // Cleanup: označimo da je komponenta unmount-ovana.
    };
  }, [router]); // Zavisnost: router.

  // Fetch categories (GET returns array directly).
  useEffect(() => { // Učitavamo kategorije (za dropdown).
    if (authLoading) return; // Ne radimo dok traje auth.

    let cancelled = false; // Flag za cleanup.

    (async () => {
      try {
        const res = await fetch("/api/client-categories", { method: "GET" }); // Pozivamo API za kategorije.
        if (!res.ok) return; // Ako nije ok, samo odustanemo (nije kritično).

        const json = await res.json(); // Parsiramo JSON.
        const items = Array.isArray(json) ? (json as ClientCategory[]) : (json?.items ?? []); // Podržavamo oba formata.
        if (!cancelled) setCategories(Array.isArray(items) ? items : []); // Sigurno setujemo categories.
      } catch {
        // ignore. // Namerno ignorišemo grešku jer kategorije nisu kritične za prikaz liste.
      }
    })();

    return () => {
      cancelled = true; // Cleanup.
    };
  }, [authLoading]); // Zavisnost: authLoading.

  // Reset pagination on filters.
  useEffect(() => { // Kad se promene filteri ili search, vraćamo se na prvu stranu.
    setPage(1); // Reset page na 1.
  }, [dq, dCity, status, categoryId]); // Zavisnosti: svi filteri (uključujući client-side categoryId).

  // Fetch list (server-side filters).
  useEffect(() => { // Učitavamo listu sa servera (q/city/status su server-side).
    if (authLoading) return; // Ne radimo dok traje auth.
    if (!me) return; // Ne radimo ako nemamo me.

    let cancelled = false; // Flag za cleanup.

    (async () => {
      setLoading(true); // Uključujemo loading.
      setError(null); // Resetujemo grešku.

      try {
        const qs = buildQuery({ // Pravljenje query string-a.
          page, // Trenutna strana.
          pageSize: PAGE_SIZE, // Koliko po strani.
          q: dq || undefined, // Search (ako je prazan string -> undefined).
          city: dCity || undefined, // City filter (ako je prazan string -> undefined).
          status: status === "all" ? undefined : status, // Status filter (all -> ne šaljemo parametar).
        });

        const res = await fetch(`/api/client-companies${qs}`, { method: "GET" }); // Pozivamo list endpoint.
        if (!res.ok) throw new Error("Cannot load client companies."); // Greška na engleskom.

        const json = await res.json(); // Parsiramo JSON.

        const items: ClientCompany[] = json?.items ?? []; // Uzimamo items.
        const totalValue: number = json?.total ?? 0; // Uzimamo total.

        if (!cancelled) {
          setRows(Array.isArray(items) ? items : []); // Setujemo rows kao niz.
          setTotal(typeof totalValue === "number" ? totalValue : 0); // Setujemo total kao number.
        }
      } catch (e: any) {
        if (!cancelled) {
          setRows([]); // Resetujemo listu.
          setTotal(0); // Resetujemo total.
          setError(e?.message || "An error occurred."); // Setujemo grešku (eng fallback).
        }
      } finally {
        if (!cancelled) setLoading(false); // Gasimo loading.
      }
    })();

    return () => {
      cancelled = true; // Cleanup.
    };
  }, [authLoading, me, page, dq, dCity, status]); // Zavisnosti: auth, me, page i server-side filteri.

  // Client-side category filter (jer backend nema categoryId param).
  const filteredRows = useMemo(() => { // Memoizujemo filtriranje da se ne računa bez potrebe.
    if (categoryId === "all") return rows; // Ako je all, vraćamo sve.
    return rows.filter((r) => r.categoryId === categoryId); // Inače filtriramo po categoryId.
  }, [rows, categoryId]); // Zavisnosti: rows i categoryId.

  // Details fetch (GET /api/client-company/[id]).
  useEffect(() => { // Učitavamo detalje kada se klikne na red (openId).
    if (!openId) { // Ako nema openId, zatvaramo drawer state.
      setDetails(null); // Reset detalja.
      setDetailsError(null); // Reset greške.
      return; // Prekid.
    }

    let cancelled = false; // Flag za cleanup.

    (async () => {
      setDetailsLoading(true); // Uključujemo loading.
      setDetailsError(null); // Reset greške.

      try {
        const res = await fetch(`/api/client-company/${openId}`, { method: "GET" }); // Pozivamo details endpoint.
        if (!res.ok) throw new Error("Cannot load client details."); // Greška na engleskom.

        const json = await res.json(); // Parsiramo JSON.
        if (!cancelled) setDetails(json as ClientCompany); // Setujemo detalje.
      } catch (e: any) {
        if (!cancelled) setDetailsError(e?.message || "Error."); // Setujemo grešku.
      } finally {
        if (!cancelled) setDetailsLoading(false); // Gasimo loading.
      }
    })();

    return () => {
      cancelled = true; // Cleanup.
    };
  }, [openId]); // Zavisnost: openId.

  if (authLoading) { // Ako auth još traje.
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="h-10 w-56 animate-pulse rounded bg-slate-200" />
        <div className="mt-6 h-64 animate-pulse rounded-2xl bg-slate-100" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8"> {/* Glavni wrapper layout. */}
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"> {/* Header sa naslovom i user info. */}
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">My client companies.</h1> {/* Naslov na engleskom. */}
          <p className="mt-1 text-sm text-slate-600">
            Overview of client companies assigned to a freelance consultant, with search and filters.
            {/* Opis na engleskom (traženo). */}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">{me?.name}.</div> {/* Ime ulogovanog korisnika. */}
          <div className="text-xs text-slate-600">Freelance consultant.</div> {/* Uloga na engleskom. */}
        </div>
      </header>

      <section className="mt-6 grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-5"> {/* Filter sekcija. */}
        <div className="md:col-span-2">
          <label className="text-xs font-semibold text-slate-700">Search (name).</label> {/* Labela na engleskom. */}
          <input
            value={q} // Controlled input.
            onChange={(e) => setQ(e.target.value)} // Menjamo q state.
            placeholder="Search by client name." // Placeholder na engleskom.
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700">City.</label> {/* Labela na engleskom. */}
          <input
            value={city} // Controlled input.
            onChange={(e) => setCity(e.target.value)} // Menjamo city state.
            placeholder="Filter by city." // Placeholder na engleskom.
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700">Status.</label> {/* Labela na engleskom. */}
          <select
            value={status} // Controlled select.
            onChange={(e) => setStatus(e.target.value)} // Menjamo status state.
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
          >
            <option value="all">All.</option>
            <option value="active">Active.</option>
            <option value="inactive">Inactive.</option>
            <option value="prospect">Prospect.</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700">Category (client-side).</label> {/* Labela na engleskom. */}
          <select
            value={categoryId} // Controlled select za client-side filter.
            onChange={(e) => setCategoryId(e.target.value === "all" ? "all" : Number(e.target.value))} // Parsiranje vrednosti.
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
          >
            <option value="all">All.</option>
            {categories.map((c) => ( // Render opcija iz kategorija.
              <option key={c.id} value={c.id}>
                {c.name}.
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"> {/* Sekcija tabele. */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="text-sm font-semibold text-slate-900">
            Results: <span className="text-slate-600">{total}.</span> {/* Ukupan broj sa servera. */}
          </div>
          <div className="text-xs text-slate-600">
            Page {page} / {totalPages}. {/* Paginacija info. */}
          </div>
        </div>

        {error ? <div className="px-4 py-6 text-sm text-rose-700">{error}</div> : null} {/* Prikaz greške. */}

        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold text-slate-700">
                <th className="px-4 py-3">Name.</th>
                <th className="px-4 py-3">Industry.</th>
                <th className="px-4 py-3">Size.</th>
                <th className="px-4 py-3">City.</th>
                <th className="px-4 py-3">Status.</th>
                <th className="px-4 py-3">Category.</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? ( // Skeleton kada loading traje.
                Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-4"><div className="h-4 w-44 animate-pulse rounded bg-slate-200" /></td>
                    <td className="px-4 py-4"><div className="h-4 w-28 animate-pulse rounded bg-slate-200" /></td>
                    <td className="px-4 py-4"><div className="h-4 w-20 animate-pulse rounded bg-slate-200" /></td>
                    <td className="px-4 py-4"><div className="h-4 w-24 animate-pulse rounded bg-slate-200" /></td>
                    <td className="px-4 py-4"><div className="h-6 w-20 animate-pulse rounded-full bg-slate-200" /></td>
                    <td className="px-4 py-4"><div className="h-4 w-28 animate-pulse rounded bg-slate-200" /></td>
                  </tr>
                ))
              ) : filteredRows.length === 0 ? ( // Ako nema rezultata posle client-side filtera.
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-600" colSpan={6}>
                    No results.
                  </td>
                </tr>
              ) : ( // Inače render redove.
                filteredRows.map((c) => (
                  <tr
                    key={c.id} // Key za React listu.
                    className="cursor-pointer text-sm text-slate-900 hover:bg-slate-50" // Hover efekat i cursor.
                    onClick={() => setOpenId(c.id)} // Klik otvara drawer.
                  >
                    <td className="px-4 py-4 font-semibold">{c.name}.</td>
                    <td className="px-4 py-4 text-slate-700">{c.industry}.</td>
                    <td className="px-4 py-4 text-slate-700">{c.companySize}.</td>
                    <td className="px-4 py-4 text-slate-700">{c.city}.</td>
                    <td className="px-4 py-4 text-slate-700">{c.status}.</td>
                    <td className="px-4 py-4 text-slate-700">{c.category?.name ?? "-"}.</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <button
            type="button"
            disabled={page <= 1 || loading} // Ne dozvoljavamo prev na prvoj strani ili dok se učitava.
            onClick={() => setPage((p) => Math.max(1, p - 1))} // Idemo na prethodnu stranu.
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold transition disabled:opacity-50"
          >
            Prev.
          </button>

          <div className="text-xs text-slate-600">Showing {filteredRows.length} of {total}.</div> {/* Prikaz info. */}

          <button
            type="button"
            disabled={page >= totalPages || loading} // Ne dozvoljavamo next na poslednjoj strani ili dok se učitava.
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))} // Idemo na sledeću stranu.
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold transition disabled:opacity-50"
          >
            Next.
          </button>
        </div>
      </section>

      {/* Details drawer. */}
      {openId ? ( // Ako je openId setovan, prikazujemo drawer.
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpenId(null)} /> {/* Klik na overlay zatvara drawer. */}
          <div className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <div className="text-sm font-semibold text-slate-900">Client details.</div>
                <div className="text-xs text-slate-600">GET /api/client-company/{openId}.</div>
              </div>
              <button
                type="button"
                onClick={() => setOpenId(null)} // Zatvaramo drawer.
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold"
              >
                Close.
              </button>
            </div>

            {detailsError ? <div className="px-5 py-4 text-sm text-rose-700">{detailsError}</div> : null} {/* Greška u drawer-u. */}

            {detailsLoading ? ( // Skeleton za detalje.
              <div className="px-5 py-6">
                <div className="h-6 w-60 animate-pulse rounded bg-slate-200" />
                <div className="mt-3 h-4 w-80 animate-pulse rounded bg-slate-200" />
                <div className="mt-3 h-4 w-64 animate-pulse rounded bg-slate-200" />
              </div>
            ) : details ? ( // Sadržaj detalja.
              <div className="px-5 py-5">
                <h2 className="text-xl font-semibold text-slate-900">{details.name}.</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {details.industry} · {details.companySize}.
                </p>

                <div className="mt-5 section space-y-3 text-sm"> {/* Fix typo: "seection" -> "section". */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-semibold text-slate-700">Location.</div>
                    <div className="mt-1 text-slate-900">
                      {details.country}, {details.city}.
                    </div>
                    <div className="text-slate-700">{details.address}.</div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-semibold text-slate-700">Status & category.</div>
                    <div className="mt-1 text-slate-900">Status: {details.status}.</div>
                    <div className="text-slate-700">Category: {details.category?.name ?? "-"}.</div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-semibold text-slate-700">Owners.</div>
                    <div className="mt-1 text-slate-700">Sales manager ID: {details.salesManagerId}.</div>
                    <div className="text-slate-700">Freelancer ID: {details.freelanceConsultantId}.</div>
                  </div>

                  {details.website ? ( // Ako postoji website, prikažemo link.
                    <a
                      href={details.website} // URL.
                      target="_blank" // Otvaramo u novom tabu.
                      rel="noreferrer" // Sigurnosni atributi za external link.
                      className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Open website.
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}

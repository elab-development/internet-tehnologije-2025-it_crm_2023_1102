"use client"; // Ovim označavamo da je komponenta Client Component (izvršava se u browser-u).

import { useEffect, useMemo, useState } from "react"; // Uvozimo React hook-ove: state, side effects i memoizaciju.
import { useRouter } from "next/navigation"; // Uvozimo Next.js router za navigaciju (redirect).

import type { Me } from "@/src/client/types/me"; // Uvozimo tip za ulogovanog korisnika.

import type { Opportunity } from "@/src/client/types/opportunity"; // Uvozimo tip za Opportunity (priliku).

function useDebounce<T>(value: T, delayMs = 350) { // Debounce hook da uspori promene inputa (npr. search) pre poziva API-ja.
  const [debounced, setDebounced] = useState(value); // Čuvamo debounced vrednost u state-u.
  useEffect(() => { // Effect se okida kad se value ili delay promeni.
    const t = setTimeout(() => setDebounced(value), delayMs); // Čekamo delayMs pa tek onda postavimo vrednost.
    return () => clearTimeout(t); // Čistimo timeout da ne bismo triggerovali staru vrednost.
  }, [value, delayMs]); // Zavisnosti: kad se value ili delay promene, restartujemo debounce.
  return debounced; // Vraćamo debounced vrednost.
}

function buildQuery(params: Record<string, string | number | boolean | undefined | null>) { // Helper za pravljenje query string-a iz parametara.
  const sp = new URLSearchParams(); // Kreiramo URLSearchParams objekat.
  Object.entries(params).forEach(([k, v]) => { // Iteriramo kroz key-value parove.
    if (v === undefined || v === null || v === "") return; // Preskačemo prazne/undefined/null vrednosti.
    sp.set(k, String(v)); // Upisujemo parametar kao string.
  });
  const qs = sp.toString(); // Pretvaramo parametre u "a=1&b=2" format.
  return qs ? `?${qs}` : ""; // Ako ima parametara vraćamo ?..., inače prazan string.
}

const STAGES = ["new", "qualification", "proposal", "negotiation", "won", "lost"]; // Definišemo moguće faze prilike.
const STATUSES = ["open", "on_hold", "won", "lost"]; // Definišemo moguće statuse prilike.

export default function FreelancerOpportunitiesPage() { // Glavna stranica za freelancer konsultanta (opportunities list).
  const router = useRouter(); // Inicijalizujemo router za redirect.
  const PAGE_SIZE = 5; // Broj redova po strani.

  const [me, setMe] = useState<Me | null>(null); // State za ulogovanog korisnika.
  const [authLoading, setAuthLoading] = useState(true); // State koji prati da li još proveravamo auth.

  const [rows, setRows] = useState<Opportunity[]>([]); // State za listu opportunity redova.
  const [total, setTotal] = useState(0); // State za ukupan broj rezultata iz API-ja.

  const [page, setPage] = useState(1); // Trenutna stranica paginacije.

  const [q, setQ] = useState(""); // Search string (input).
  const dq = useDebounce(q, 350); // Debounced search string da ne spamujemo API.

  const [stage, setStage] = useState<string>("all"); // Filter za stage (default all).
  const [status, setStatus] = useState<string>("all"); // Filter za status (default all).

  const [loading, setLoading] = useState(true); // State za loading liste.
  const [error, setError] = useState<string | null>(null); // State za poruku greške.

  // Details drawer.
  const [openId, setOpenId] = useState<number | null>(null); // ID odabrane prilike za drawer (null = zatvoren).
  const [details, setDetails] = useState<Opportunity | null>(null); // Detalji prilike iz GET /api/opportunities/[id].
  const [detailsLoading, setDetailsLoading] = useState(false); // Loading state za drawer detalje.
  const [detailsError, setDetailsError] = useState<string | null>(null); // Greška za drawer detalje.

  const totalPages = useMemo(() => { // Računamo ukupan broj strana memoizovano (da se ne računa bez potrebe).
    const tp = Math.ceil(total / PAGE_SIZE); // total / PAGE_SIZE za broj strana.
    return tp <= 0 ? 1 : tp; // Minimalno 1 strana (da UI ne pokaže 0).
  }, [total]); // Zavisnost je samo total.

  // Guard.
  useEffect(() => { // Effect za auth guard: proverava da li je user ulogovan i da li je freelancer.
    let cancelled = false; // Flag da sprečimo setState nakon unmount-a.

    (async () => { // IIFE da koristimo await.
      try { // U try bloku radimo fetch.
        const res = await fetch("/api/auth/me"); // Pozivamo API da dobijemo trenutno ulogovanog user-a.
        if (!res.ok) { // Ako nije ok, user nije ulogovan ili nema validan token.
          router.push("/pages/auth/login"); // Redirect na login.
          return; // Prekidamo dalje izvršavanje.
        }

        const data = (await res.json()) as Me; // Parsiramo odgovor kao Me.

        if (!data || data.role !== "freelance_consultant") { // Ako nema data ili uloga nije freelancer.
          if (data?.role) router.push(`/pages/${data.role}/home`); // Ako postoji uloga, prebacujemo na odgovarajući home.
          else router.push("/pages/auth/login"); // Ako ne postoji uloga, vraćamo na login.
          return; // Prekidamo dalje izvršavanje.
        }

        if (!cancelled) setMe(data); // Ako nije unmount-ovano, setujemo me.
      } catch { // Hvata mrežne/JS greške.
        router.push("/pages/auth/login"); // Ako nešto pukne, šaljemo na login.
      } finally { // Uvek gasimo auth loading.
        if (!cancelled) setAuthLoading(false); // Postavljamo authLoading na false (ako nije unmount).
      }
    })(); // Pozivamo IIFE.

    return () => { // Cleanup.
      cancelled = true; // Setujemo flag da sprečimo setState nakon unmount-a.
    };
  }, [router]); // Zavisnost: router.

  // Reset page on filters.
  useEffect(() => { // Kad se promene filteri ili search, vraćamo se na prvu stranu.
    setPage(1); // Reset paginacije.
  }, [dq, stage, status]); // Zavisnosti: debounced search, stage filter, status filter.

  // Fetch list.
  useEffect(() => { // Effect za učitavanje liste prilika.
    if (authLoading) return; // Ako auth još traje, ne radimo fetch.
    if (!me) return; // Ako me nije setovan, ne radimo fetch.

    let cancelled = false; // Flag da sprečimo setState nakon unmount-a.

    (async () => { // IIFE za async/await.
      setLoading(true); // Uključujemo loading.
      setError(null); // Resetujemo grešku.

      try { // Pokušavamo da učitamo listu.
        const qs = buildQuery({ // Kreiramo query string iz parametara.
          page, // Trenutna strana.
          pageSize: PAGE_SIZE, // Koliko po strani.
          q: dq || undefined, // Search query (ako je prazan string -> undefined).
          stage: stage === "all" ? undefined : stage, // Stage filter (all -> bez parametra).
          status: status === "all" ? undefined : status, // Status filter (all -> bez parametra).
        });

        const res = await fetch(`/api/opportunities${qs}`, { method: "GET" }); // Pozivamo API list endpoint.
        if (!res.ok) throw new Error("Cannot load opportunities."); // Ako API ne vrati ok, bacamo grešku (eng label).

        const json = await res.json(); // Parsiramo JSON.

        const items: Opportunity[] = json?.items ?? []; // Uzimamo items iz json-a, fallback na [].
        const totalValue: number = json?.total ?? 0; // Uzimamo total iz json-a, fallback na 0.

        if (!cancelled) { // Ako komponenta i dalje postoji.
          setRows(Array.isArray(items) ? items : []); // Sigurno setujemo rows kao niz.
          setTotal(typeof totalValue === "number" ? totalValue : 0); // Sigurno setujemo total kao number.
        }
      } catch (e: any) { // Hvatanje greške.
        if (!cancelled) { // Ako nije unmount-ovano.
          setRows([]); // Čistimo listu.
          setTotal(0); // Resetujemo total.
          setError(e?.message || "An error occurred."); // Postavljamo poruku greške (eng fallback).
        }
      } finally { // Uvek gasimo loading.
        if (!cancelled) setLoading(false); // Isključujemo loading.
      }
    })(); // Pozivamo IIFE.

    return () => { // Cleanup.
      cancelled = true; // Sprečavamo setState nakon unmount-a.
    };
  }, [authLoading, me, page, dq, stage, status]); // Zavisnosti: auth, me, paginacija i filteri.

  // Details fetch.
  useEffect(() => { // Effect za učitavanje detalja kada se otvori drawer.
    if (!openId) { // Ako nema openId, znači da je drawer zatvoren.
      setDetails(null); // Resetujemo details.
      setDetailsError(null); // Resetujemo error.
      return; // Prekidamo effect.
    }

    let cancelled = false; // Flag za unmount.

    (async () => { // IIFE za async.
      setDetailsLoading(true); // Uključujemo loading za detalje.
      setDetailsError(null); // Resetujemo error.

      try { // Pokušaj fetch-a detalja.
        const res = await fetch(`/api/opportunities/${openId}`, { method: "GET" }); // Pozivamo details endpoint.
        if (!res.ok) throw new Error("Cannot load opportunity details."); // Ako nije ok, bacamo grešku (eng).

        const json = await res.json(); // Parsiramo JSON.
        if (!cancelled) setDetails(json as Opportunity); // Setujemo details ako nije unmount.
      } catch (e: any) { // Hvatanje greške.
        if (!cancelled) setDetailsError(e?.message || "Error."); // Postavljamo grešku (eng fallback).
      } finally { // Uvek gasimo details loading.
        if (!cancelled) setDetailsLoading(false); // Isključujemo details loading.
      }
    })(); // Pozivamo IIFE.

    return () => { // Cleanup.
      cancelled = true; // Sprečavamo setState posle unmount-a.
    };
  }, [openId]); // Zavisnost: openId (kad se promeni, učitavamo nove detalje).

  async function patchOpportunity(id: number, payload: Partial<Opportunity>) { // Helper za PATCH update na opportunity.
    const res = await fetch(`/api/opportunities/${id}`, { // Pozivamo PATCH endpoint.
      method: "PATCH", // HTTP metoda PATCH.
      headers: { "Content-Type": "application/json" }, // Postavljamo JSON header.
      body: JSON.stringify(payload), // Payload šaljemo kao JSON string.
    });

    if (!res.ok) { // Ako odgovor nije ok.
      const msg = await res.json().catch(() => null); // Pokušavamo da izvučemo poruku iz JSON-a.
      throw new Error(msg?.message || "Update failed."); // Bacamo grešku (eng fallback).
    }

    return (await res.json()) as Opportunity; // Vraćamo updated opportunity iz odgovora.
  }

  async function onChangeStage(id: number, next: string) { // Handler za promenu stage-a iz dropdown-a.
    const prev = rows; // Čuvamo prethodno stanje liste (za rollback).
    setRows((r) => r.map((x) => (x.id === id ? { ...x, stage: next } : x))); // Optimistic update: odmah menjamo u UI.

    try { // Pokušavamo da sačuvamo na backend-u.
      await patchOpportunity(id, { stage: next }); // Pozivamo PATCH sa stage promenom.
    } catch (e: any) { // Ako pukne.
      setRows(prev); // Vraćamo prethodno stanje (rollback).
      alert(e?.message || "Error."); // Prikazujemo grešku korisniku.
    }
  }

  async function onChangeStatus(id: number, next: string) { // Handler za promenu status-a iz dropdown-a.
    const prev = rows; // Čuvamo prethodno stanje liste.
    setRows((r) => r.map((x) => (x.id === id ? { ...x, status: next } : x))); // Optimistic update.

    try { // Pokušavamo da sačuvamo promenu.
      await patchOpportunity(id, { status: next }); // PATCH sa status promenom.
    } catch (e: any) { // Ako backend vrati grešku.
      setRows(prev); // Rollback.
      alert(e?.message || "Error."); // Alert sa porukom.
    }
  }

  if (authLoading) { // Ako se auth još učitava.
    return ( // Prikazujemo skeleton loader.
      <main className="mx-auto max-w-6xl px-4 py-8"> {/* Layout wrapper. */}
        <div className="h-10 w-56 animate-pulse rounded bg-slate-200" /> {/* Skeleton za naslov. */}
        <div className="mt-6 h-64 animate-pulse rounded-2xl bg-slate-100" /> {/* Skeleton za tabelu/kontenat. */}
      </main>
    );
  }

  return ( // Glavni UI kada je auth završen.
    <main className="mx-auto max-w-6xl px-4 py-8"> {/* Centralni layout. */}
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"> {/* Header sa nazivom i user info. */}
        <div> {/* Leva strana header-a. */}
          <h1 className="text-2xl font-semibold text-slate-900">My opportunities.</h1> {/* Naslov na engleskom. */}
          <p className="mt-1 text-sm text-slate-600"> {/* Podnaslov/objašnjenje. */}
            Overview of opportunities assigned to a freelance consultant, with quick stage and status updates.
            {/* Tekst na engleskom (traženo). */}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"> {/* Kartica sa user info. */}
          <div className="text-sm font-semibold text-slate-900">{me?.name}.</div> {/* Ime korisnika. */}
          <div className="text-xs text-slate-600">Freelance consultant.</div> {/* Uloga na engleskom. */}
        </div>
      </header>

      <section className="mt-6 grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4"> {/* Filter sekcija. */}
        <div className="md:col-span-2"> {/* Search zauzima 2 kolone na md+. */}
          <label className="text-xs font-semibold text-slate-700">Search (title).</label> {/* Labela na engleskom. */}
          <input
            value={q} // Input je controlled preko q state-a.
            onChange={(e) => setQ(e.target.value)} // Update q state na promenu.
            placeholder="Search by opportunity title." // Placeholder na engleskom.
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400" // Tailwind stilovi.
          />
        </div>

        <div> {/* Stage filter. */}
          <label className="text-xs font-semibold text-slate-700">Stage.</label> {/* Labela (eng). */}
          <select
            value={stage} // Controlled select.
            onChange={(e) => setStage(e.target.value)} // Update stage filter.
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400" // Stilovi.
          >
            <option value="all">All.</option> {/* All opcija. */}
            {STAGES.map((s) => ( // Renderujemo sve stage opcije.
              <option key={s} value={s}>
                {s}.
              </option>
            ))}
          </select>
        </div>

        <div> {/* Status filter. */}
          <label className="text-xs font-semibold text-slate-700">Status.</label> {/* Labela (eng). */}
          <select
            value={status} // Controlled select.
            onChange={(e) => setStatus(e.target.value)} // Update status filter.
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400" // Stilovi.
          >
            <option value="all">All.</option> {/* All opcija. */}
            {STATUSES.map((s) => ( // Renderujemo sve status opcije.
              <option key={s} value={s}>
                {s}.
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"> {/* Sekcija tabele. */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"> {/* Header tabele. */}
          <div className="text-sm font-semibold text-slate-900"> {/* Levo: broj rezultata. */}
            Results: <span className="text-slate-600">{total}.</span> {/* Ukupan broj rezultata. */}
          </div>
          <div className="text-xs text-slate-600"> {/* Desno: paginacija info. */}
            Page {page} / {Math.max(1, totalPages)}.
          </div>
        </div>

        {error ? <div className="px-4 py-6 text-sm text-rose-700">{error}</div> : null} {/* Prikaz greške ako postoji. */}

        <div className="w-full overflow-x-auto"> {/* Omogućavamo horizontalni scroll na manjim ekranima. */}
          <table className="w-full min-w-[1120px]"> {/* Tabela sa minimalnom širinom. */}
            <thead className="bg-slate-50"> {/* Header tabele. */}
              <tr className="text-left text-xs font-semibold text-slate-700">
                <th className="px-4 py-3">Title.</th> {/* Kolona: title. */}
                <th className="px-4 py-3">Contact.</th> {/* Kolona: contact. */}
                <th className="px-4 py-3">Client.</th> {/* Kolona: client. */}
                <th className="px-4 py-3">Stage.</th> {/* Kolona: stage. */}
                <th className="px-4 py-3">Status.</th> {/* Kolona: status. */}
                <th className="px-4 py-3">Value.</th> {/* Kolona: value. */}
                <th className="px-4 py-3">Probability.</th> {/* Kolona: probability. */}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100"> {/* Body tabele sa linijama između redova. */}
              {loading ? ( // Ako se učitava lista.
                Array.from({ length: PAGE_SIZE }).map((_, i) => ( // Renderujemo skeleton redove.
                  <tr key={i}>
                    <td className="px-4 py-4"><div className="h-4 w-56 animate-pulse rounded bg-slate-200" /></td>
                    <td className="px-4 py-4"><div className="h-4 w-40 animate-pulse rounded bg-slate-200" /></td>
                    <td className="px-4 py-4"><div className="h-4 w-40 animate-pulse rounded bg-slate-200" /></td>
                    <td className="px-4 py-4"><div className="h-9 w-36 animate-pulse rounded bg-slate-200" /></td>
                    <td className="px-4 py-4"><div className="h-9 w-36 animate-pulse rounded bg-slate-200" /></td>
                    <td className="px-4 py-4"><div className="h-4 w-24 animate-pulse rounded bg-slate-200" /></td>
                    <td className="px-4 py-4"><div className="h-4 w-20 animate-pulse rounded bg-slate-200" /></td>
                  </tr>
                ))
              ) : rows.length === 0 ? ( // Ako nema rezultata.
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-600" colSpan={7}>
                    No results.
                  </td>
                </tr>
              ) : ( // Inače renderujemo redove.
                rows.map((o) => (
                  <tr key={o.id} className="text-sm text-slate-900"> {/* Jedan red tabele. */}
                    <td
                      className="px-4 py-4 font-semibold hover:underline cursor-pointer" // Stil i klikabilnost.
                      onClick={() => setOpenId(o.id)} // Otvaramo drawer tako što setujemo openId.
                      title="Open details." // Tooltip na engleskom.
                    >
                      {o.title}. {/* Prikaz title-a. */}
                    </td>

                    <td className="px-4 py-4 text-slate-700">{o.contact?.name ?? `#${o.contactId}` }.</td> {/* Contact ime ili fallback. */}
                    <td className="px-4 py-4 text-slate-700">{o.clientCompany?.name ?? "-" }.</td> {/* Client name ili "-". */}

                    <td className="px-4 py-4"> {/* Stage dropdown u redu. */}
                      <select
                        value={o.stage} // Trenutna vrednost stage-a.
                        onChange={(e) => onChangeStage(o.id, e.target.value)} // Pozivamo handler.
                        className="w-40 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400" // Stil.
                      >
                        {STAGES.map((s) => ( // Render svih stage opcija.
                          <option key={s} value={s}>
                            {s}.
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-4 py-4"> {/* Status dropdown u redu. */}
                      <select
                        value={o.status} // Trenutna vrednost status-a.
                        onChange={(e) => onChangeStatus(o.id, e.target.value)} // Pozivamo handler.
                        className="w-40 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400" // Stil.
                      >
                        {STATUSES.map((s) => ( // Render svih status opcija.
                          <option key={s} value={s}>
                            {s}.
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-4 py-4 text-slate-700"> {/* Value prikaz. */}
                      {Number(o.estimatedValue).toLocaleString()} {o.currency}. {/* Formatiramo broj + valuta. */}
                    </td>

                    <td className="px-4 py-4 text-slate-700"> {/* Probability prikaz. */}
                      {Math.round(Number(o.probability) * 100)}%. {/* Pretvaramo 0..1 u procenat. */}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3"> {/* Footer tabele sa paginacijom. */}
          <button
            type="button" // Tip dugmeta.
            disabled={page <= 1 || loading} // Disable ako smo na prvoj strani ili se učitava.
            onClick={() => setPage((p) => Math.max(1, p - 1))} // Smanjujemo stranu ali ne ispod 1.
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold transition disabled:opacity-50" // Stil.
          >
            Prev.
          </button>

          <div className="text-xs text-slate-600">Showing {rows.length} of {total}.</div> {/* Info o prikazu. */}

          <button
            type="button" // Tip dugmeta.
            disabled={page >= totalPages || loading} // Disable ako smo na poslednjoj strani ili se učitava.
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))} // Uvećavamo stranu ali ne preko max.
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold transition disabled:opacity-50" // Stil.
          >
            Next.
          </button>
        </div>
      </section>

      {/* Details drawer. */}
      {openId ? ( // Ako postoji openId, prikazujemo drawer overlay.
        <div className="fixed inset-0 z-50"> {/* Overlay wrapper preko celog ekrana. */}
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpenId(null)} /> {/* Klik na pozadinu zatvara drawer. */}
          <div className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl"> {/* Sam drawer panel. */}
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"> {/* Drawer header. */}
              <div>
                <div className="text-sm font-semibold text-slate-900">Opportunity details.</div> {/* Naslov drawer-a. */}
                <div className="text-xs text-slate-600">GET /api/opportunities/{openId}.</div> {/* Informacija o ruti. */}
              </div>
              <button
                type="button" // Tip dugmeta.
                onClick={() => setOpenId(null)} // Zatvaramo drawer.
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold" // Stil.
              >
                Close.
              </button>
            </div>

            {detailsError ? <div className="px-5 py-4 text-sm text-rose-700">{detailsError}</div> : null} {/* Prikaz greške. */}

            {detailsLoading ? ( // Ako se učitava drawer.
              <div className="px-5 py-6">
                <div className="h-6 w-60 animate-pulse rounded bg-slate-200" /> {/* Skeleton naslov. */}
                <div className="mt-3 h-4 w-80 animate-pulse rounded bg-slate-200" /> {/* Skeleton podnaslov. */}
              </div>
            ) : details ? ( // Ako imamo details, prikazujemo sadržaj.
              <div className="px-5 py-5">
                <h2 className="text-xl font-semibold text-slate-900">{details.title}.</h2> {/* Title. */}
                <p className="mt-1 text-sm text-slate-600">
                  {details.contact?.name ?? `Contact #${details.contactId}`} ·{" "}
                  {details.clientCompany?.name ?? "No client company"}.
                </p>

                {details.description ? ( // Ako postoji opis, prikazujemo ga.
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800">
                    {details.description}.
                  </div>
                ) : null}

                <div className="mt-4 grid gap-3 md:grid-cols-2"> {/* Grid kartice sa vrednostima. */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-semibold text-slate-700">Stage.</div>
                    <div className="mt-1 text-slate-900">{details.stage}.</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-semibold text-slate-700">Status.</div>
                    <div className="mt-1 text-slate-900">{details.status}.</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-semibold text-slate-700">Value.</div>
                    <div className="mt-1 text-slate-900">
                      {Number(details.estimatedValue).toLocaleString()} {details.currency}.
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-semibold text-slate-700">Probability.</div>
                    <div className="mt-1 text-slate-900">{Math.round(details.probability * 100)}%.</div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}

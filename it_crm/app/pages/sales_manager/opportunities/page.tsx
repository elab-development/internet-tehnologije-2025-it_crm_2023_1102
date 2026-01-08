"use client"; // Ovim kažemo Next.js-u da je ovo Client Component (radi u browser-u).

import React, { useEffect, useMemo, useState } from "react"; // Uvozimo React i hook-ove koji nam trebaju.
import { useRouter } from "next/navigation"; // Uvozimo router za navigaciju (redirect).

import type { Me } from "@/src/client/types/me"; // Tip za trenutno ulogovanog korisnika.
import type { Opportunity } from "@/src/client/types/opportunity"; // Tip za Opportunity entitet (priliku).

function useDebounce<T>(value: T, delayMs = 350) { // Debounce hook: odlaže promenu vrednosti da ne zovemo API prečesto.
  const [debounced, setDebounced] = useState(value); // Čuvamo debounced vrednost u state-u.
  useEffect(() => { // Effect se okida kad se value ili delayMs promene.
    const t = setTimeout(() => setDebounced(value), delayMs); // Nakon delay-a postavljamo debounced vrednost.
    return () => clearTimeout(t); // Čistimo timeout kad se effect re-run-uje ili komponenta unmount-uje.
  }, [value, delayMs]); // Zavisnosti: kad se value ili delayMs promene, pokrećemo novi timer.
  return debounced; // Vraćamo debounced vrednost.
}

function buildQuery(params: Record<string, string | number | boolean | undefined | null>) { // Helper za pravljenje query string-a.
  const sp = new URLSearchParams(); // Kreiramo URLSearchParams objekat.
  Object.entries(params).forEach(([k, v]) => { // Prolazimo kroz sve parametre.
    if (v === undefined || v === null || v === "") return; // Preskačemo prazne vrednosti (da query bude čist).
    sp.set(k, String(v)); // U query dodajemo key/value kao string.
  }); // Zatvaramo forEach.
  const qs = sp.toString(); // Pretvaramo u query string (npr. "page=1&status=open").
  return qs ? `?${qs}` : ""; // Ako postoji nešto u qs, vraćamo sa "?", inače prazan string.
}

// Napomena: usklađeno sa seed.js (stages i statuses). 
const STAGES = ["prospecting", "discovery", "proposal", "negotiation", "won", "lost"]; // Dozvoljene faze prilike.
const STATUSES = ["open", "closed"]; // Dozvoljeni statusi prilike.

export default function SalesManagerOpportunitiesPage() { // Glavna stranica za prikaz i upravljanje prilikama.
  const router = useRouter(); // Router koristimo za redirekcije.
  const PAGE_SIZE = 5; // Koliko redova prikazujemo po strani.

  const [me, setMe] = useState<Me | null>(null); // State za trenutno ulogovanog korisnika.
  const [authLoading, setAuthLoading] = useState(true); // State koji govori da li još proveravamo autentifikaciju.

  const [rows, setRows] = useState<Opportunity[]>([]); // Lista opportunity-ja koja se prikazuje u tabeli.
  const [total, setTotal] = useState(0); // Ukupan broj opportunity-ja (za paginaciju).

  const [page, setPage] = useState(1); // Trenutna stranica paginacije.

  const [q, setQ] = useState(""); // Search tekst (unos).
  const dq = useDebounce(q, 350); // Debounced search tekst (da ne “spamujemo” API).

  const [stage, setStage] = useState<string>("all"); // Filter za stage (default "all").
  const [status, setStatus] = useState<string>("all"); // Filter za status (default "all").

  const [loading, setLoading] = useState(true); // Da li se lista trenutno učitava.
  const [error, setError] = useState<string | null>(null); // Tekst greške ako API poziv padne.

  const totalPages = useMemo(() => { // Računamo total pages iz total i PAGE_SIZE.
    const tp = Math.ceil(total / PAGE_SIZE); // Ukupno stranica = ceil(total / pageSize).
    return tp <= 0 ? 1 : tp; // Minimum je 1 stranica (da UI ne pukne).
  }, [total]); // Ponovo računamo kad se total promeni.

  // Drawer (detalji).
  const [openId, setOpenId] = useState<number | null>(null); // ID opportunity-ja koji je otvoren u drawer-u.
  const [details, setDetails] = useState<Opportunity | null>(null); // Detalji izabrane prilike.
  const [detailsLoading, setDetailsLoading] = useState(false); // Da li se detalji trenutno učitavaju.
  const [detailsError, setDetailsError] = useState<string | null>(null); // Greška pri učitavanju detalja.

  const [saving, setSaving] = useState(false); // Da li se trenutno čuvaju izmene (PATCH).
  const [editForm, setEditForm] = useState<Partial<Opportunity>>({}); // Edit forma (lokalna kopija vrednosti).

  // Guard (RBAC) — proverimo /api/auth/me i ulogu.
  useEffect(() => { // Effect koji radi odmah pri mount-u (i kad se router promeni).
    let cancelled = false; // Flag da sprečimo setState ako se komponenta unmount-uje.

    (async () => { // IIFE async funkcija.
      try { // Try blok za fetch.
        const res = await fetch("/api/auth/me"); // Pozivamo endpoint koji vraća trenutno ulogovanog korisnika.
        if (!res.ok) { // Ako nije 2xx.
          router.push("/pages/auth/login"); // Prebacujemo na login.
          return; // Prekidamo dalje.
        }

        const data = (await res.json()) as Me; // Parsiramo JSON u Me tip.

        if (!data || data.role !== "sales_manager") { // Ako korisnik ne postoji ili nije sales_manager.
          if (data?.role) router.push(`/pages/${data.role}/home`); // Ako ima ulogu, vodi na njegov home.
          else router.push("/pages/auth/login"); // Ako nema ulogu, vodi na login.
          return; // Prekidamo.
        }

        if (!cancelled) setMe(data); // Ako nije otkazano, upisujemo user-a u state.
      } catch { // Ako fetch/parse pukne.
        router.push("/pages/auth/login"); // Idemo na login.
      } finally { // Uvek.
        if (!cancelled) setAuthLoading(false); // Gasimo auth loading.
      }
    })(); // Pozivamo IIFE.

    return () => { // Cleanup funkcija effect-a.
      cancelled = true; // Obeležavamo da ne smemo više da setujemo state.
    };
  }, [router]); // Zavisnost je router (obično stabilno, ali OK).

  // Reset pagination kada se filteri promene.
  useEffect(() => { // Kad se search/stage/status promene, vraćamo page na 1.
    setPage(1); // Reset page.
  }, [dq, stage, status]); // Zavisnosti: debounced search i filteri.

  // Fetch list (GET /api/opportunities).
  useEffect(() => { // Effect koji učitava listu.
    if (authLoading) return; // Ako još traje auth, ne radimo ništa.
    if (!me) return; // Ako nema user-a, ne učitavamo.

    let cancelled = false; // Flag za cleanup.

    (async () => { // Async IIFE.
      setLoading(true); // Kažemo UI-u da se učitava.
      setError(null); // Resetujemo grešku.

      try { // Try fetch.
        const qs = buildQuery({ // Gradimo query string.
          page, // Trenutna stranica.
          pageSize: PAGE_SIZE, // Veličina strane.
          q: dq || undefined, // Search query, samo ako nije prazno.
          stage: stage === "all" ? undefined : stage, // Stage filter, samo ako nije "all".
          status: status === "all" ? undefined : status, // Status filter, samo ako nije "all".
        }); // Kraj buildQuery parametara.

        const res = await fetch(`/api/opportunities${qs}`, { method: "GET" }); // Pozivamo API za listu.
        if (!res.ok) throw new Error("Unable to load opportunities."); // Ako nije OK, bacamo grešku.

        const json = await res.json(); // Parsiramo JSON.
        const items: Opportunity[] = json?.items ?? []; // Uzmi items ili prazno.
        const totalValue: number = json?.total ?? 0; // Uzmi total ili 0.

        if (!cancelled) { // Ako nije otkazano.
          setRows(Array.isArray(items) ? items : []); // Setujemo rows (samo ako je niz).
          setTotal(typeof totalValue === "number" ? totalValue : 0); // Setujemo total (samo ako je broj).
        }
      } catch (e: any) { // Catch za greške.
        if (!cancelled) { // Ako nije otkazano.
          setRows([]); // Praznimo listu.
          setTotal(0); // Reset total.
          setError(e?.message || "Something went wrong."); // Setujemo poruku greške.
        }
      } finally { // Uvek.
        if (!cancelled) setLoading(false); // Gasimo loading.
      }
    })(); // Poziv IIFE.

    return () => { // Cleanup.
      cancelled = true; // Sprečavamo setState posle unmount-a.
    };
  }, [authLoading, me, page, dq, stage, status]); // Kad se bilo šta od ovoga promeni, refetch.

  // Details fetch (GET /api/opportunities/[id]).
  useEffect(() => { // Effect za učitavanje detalja kad se openId promeni.
    if (!openId) { // Ako ništa nije otvoreno.
      setDetails(null); // Resetujemo details.
      setDetailsError(null); // Resetujemo error.
      setEditForm({}); // Resetujemo formu.
      return; // Prekidamo.
    }

    let cancelled = false; // Cleanup flag.

    (async () => { // Async IIFE.
      setDetailsLoading(true); // Uključujemo loading za detalje.
      setDetailsError(null); // Reset greške za detalje.

      try { // Try fetch.
        const res = await fetch(`/api/opportunities/${openId}`, { method: "GET" }); // Pozivamo API za detalje.
        if (!res.ok) throw new Error("Unable to load opportunity details."); // Ako nije OK, bacamo grešku.

        const json = await res.json(); // Parsiramo detalje.
        if (!cancelled) { // Ako nije otkazano.
          setDetails(json as Opportunity); // Postavljamo details.
          setEditForm({ // Popunjavamo edit formu (kontrolisana forma).
            title: json?.title, // Naslov.
            description: json?.description ?? "", // Opis (fallback na "").
            stage: json?.stage, // Stage.
            status: json?.status, // Status.
            estimatedValue: json?.estimatedValue, // Procena vrednosti.
            currency: json?.currency, // Valuta.
            probability: json?.probability, // Verovatnoća.
            expectedCloseDate: json?.expectedCloseDate ?? null, // Datum zatvaranja (nullable).
            clientCompanyId: json?.clientCompanyId ?? null, // ID klijenta (nullable).
          }); // Kraj setEditForm.
        }
      } catch (e: any) { // Catch.
        if (!cancelled) setDetailsError(e?.message || "Error."); // Prikazujemo grešku.
      } finally { // Uvek.
        if (!cancelled) setDetailsLoading(false); // Gasimo loading.
      }
    })(); // Poziv IIFE.

    return () => { // Cleanup.
      cancelled = true; // Sprečavamo setState posle unmount-a.
    };
  }, [openId]); // Kad openId promeni, učitavamo drugi zapis.

  async function patchOpportunity(id: number, payload: any) { // Helper za PATCH poziv.
    const res = await fetch(`/api/opportunities/${id}`, { // Pozivamo PATCH endpoint.
      method: "PATCH", // HTTP metoda.
      headers: { "Content-Type": "application/json" }, // Šaljemo JSON.
      body: JSON.stringify(payload), // Payload pretvaramo u JSON string.
    }); // Kraj fetch.

    if (!res.ok) { // Ako PATCH nije uspeo.
      const msg = await res.json().catch(() => null); // Pokušamo da izvučemo message.
      throw new Error(msg?.message || "Update failed."); // Bacamo grešku.
    }

    return (await res.json()) as Opportunity; // Vraćamo updated objekat.
  }

  async function onQuickStage(id: number, next: string) { // Brza izmena stage-a direktno u tabeli.
    const prev = rows; // Čuvamo prethodnu listu za rollback.
    setRows((r) => r.map((x) => (x.id === id ? { ...x, stage: next } : x))); // Optimistički ažuriramo UI.

    try { // Pokušamo da snimimo na backend.
      await patchOpportunity(id, { stage: next }); // PATCH stage.
    } catch (e: any) { // Ako pukne.
      setRows(prev); // Vraćamo staru listu.
      alert(e?.message || "Error."); // Prikazujemo poruku.
    }
  }

  async function onQuickStatus(id: number, next: string) { // Brza izmena status-a direktno u tabeli.
    const prev = rows; // Čuvamo staru listu.
    setRows((r) => r.map((x) => (x.id === id ? { ...x, status: next } : x))); // Optimistički update.

    try { // Pokušamo da snimimo.
      await patchOpportunity(id, { status: next }); // PATCH status.
    } catch (e: any) { // Ako pukne.
      setRows(prev); // Rollback.
      alert(e?.message || "Error."); // Alert poruka.
    }
  }

  async function saveEdits() { // Snimanje izmena iz drawer-a (edit forma).
    if (!openId) return; // Ako nema openId, nema šta da snimamo.

    setSaving(true); // Uključujemo saving state.
    try { // Try.
      const payload = { // Sklapamo payload i normalizujemo tipove.
        ...editForm, // Sve iz forme.
        estimatedValue: editForm.estimatedValue !== undefined ? Number(editForm.estimatedValue) : undefined, // Osiguramo broj.
        probability: editForm.probability !== undefined ? Number(editForm.probability) : undefined, // Osiguramo broj.
        clientCompanyId: // clientCompanyId može biti null ili broj ili undefined.
          editForm.clientCompanyId === null
            ? null
            : editForm.clientCompanyId !== undefined
              ? Number(editForm.clientCompanyId)
              : undefined,
        expectedCloseDate: // expectedCloseDate: string ili null ili undefined.
          editForm.expectedCloseDate !== undefined
            ? (editForm.expectedCloseDate ? String(editForm.expectedCloseDate) : null)
            : undefined,
      }; // Kraj payload.

      const updated = await patchOpportunity(openId, payload); // Snimamo na backend.
      setDetails(updated); // Ažuriramo details state.

      // Refresh list for visible changes.
      const idx = rows.findIndex((r) => r.id === updated.id); // Nalazimo red u tabeli.
      if (idx >= 0) { // Ako postoji.
        const clone = [...rows]; // Kopiramo niz (immutability).
        clone[idx] = { ...clone[idx], ...updated }; // Merge-ujemo promene.
        setRows(clone); // Postavljamo novi niz.
      }
    } catch (e: any) { // Catch.
      alert(e?.message || "Error."); // Alert poruka.
    } finally { // Uvek.
      setSaving(false); // Gasimo saving.
    }
  }

  if (authLoading) { // Ako se auth još učitava.
    return ( // Prikazujemo skeleton.
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="h-10 w-56 animate-pulse rounded bg-slate-200" />
        <div className="mt-6 h-64 animate-pulse rounded-2xl bg-slate-100" />
      </main>
    );
  }

  return ( // Glavni UI.
    <main className="mx-auto max-w-6xl px-4 py-8">
      {/* Header card */}
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-cyan-50 via-fuchsia-50 to-yellow-50 p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Opportunities.</h1>
            <p className="mt-1 text-sm text-slate-700">
              Team opportunities overview with quick stage and status updates.
            </p>
          </div>

          <button
            type="button"
            disabled
            className="rounded-2xl bg-slate-900/40 px-4 py-3 text-sm font-semibold text-white"
            title="Opportunity creation requires a /api/contacts list route to select contactId."
          >
            + New opportunity (soon).
          </button>
        </div>
      </div>

      {/* Filters */}
      <section className="mt-6 grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <div className="md:col-span-2">
          <label className="text-xs font-semibold text-slate-700">Search (title).</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by title."
            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700">Stage.</label>
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
          >
            <option value="all">All.</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s}.
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700">Status.</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
          >
            <option value="all">All.</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}.
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Table */}
      <section className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="text-sm font-semibold text-slate-900">
            Results: <span className="text-slate-600">{total}.</span>
          </div>
          <div className="text-xs text-slate-600">
            Page {page}/{Math.max(1, totalPages)}.
          </div>
        </div>

        {error ? <div className="px-4 py-6 text-sm text-rose-700">{error}</div> : null}

        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[1120px]">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold text-slate-700">
                <th className="px-4 py-3">Title.</th>
                <th className="px-4 py-3">Contact.</th>
                <th className="px-4 py-3">Client.</th>
                <th className="px-4 py-3">Stage.</th>
                <th className="px-4 py-3">Status.</th>
                <th className="px-4 py-3">Value.</th>
                <th className="px-4 py-3">Probability.</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: PAGE_SIZE }).map((_, i) => (
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
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-600" colSpan={7}>
                    No results.
                  </td>
                </tr>
              ) : (
                rows.map((o) => (
                  <tr key={o.id} className="text-sm text-slate-900">
                    <td
                      className="px-4 py-4 font-semibold hover:underline cursor-pointer"
                      onClick={() => setOpenId(o.id)}
                      title="Open details."
                    >
                      {o.title}.
                    </td>

                    <td className="px-4 py-4 text-slate-700">{o.contact?.name ?? `#${o.contactId}`}.</td>
                    <td className="px-4 py-4 text-slate-700">{o.clientCompany?.name ?? "-"}.</td>

                    <td className="px-4 py-4">
                      <select
                        value={o.stage}
                        onChange={(e) => onQuickStage(o.id, e.target.value)}
                        className="w-40 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                      >
                        {STAGES.map((s) => (
                          <option key={s} value={s}>
                            {s}.
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-4 py-4">
                      <select
                        value={o.status}
                        onChange={(e) => onQuickStatus(o.id, e.target.value)}
                        className="w-40 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}.
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-4 py-4 text-slate-700">
                      {Number(o.estimatedValue).toLocaleString()} {o.currency}.
                    </td>

                    <td className="px-4 py-4 text-slate-700">
                      {Math.round(Number(o.probability) * 100)}%.
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold transition disabled:opacity-50"
          >
            Prev.
          </button>

          <div className="text-xs text-slate-600">Showing {rows.length} of {total}.</div>

          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold transition disabled:opacity-50"
          >
            Next.
          </button>
        </div>
      </section>

      {/* Details drawer */}
      {openId ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpenId(null)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <div className="text-sm font-semibold text-slate-900">Opportunity details.</div>
                <div className="text-xs text-slate-600">GET/PATCH /api/opportunities/{openId}.</div>
              </div>
              <button
                type="button"
                onClick={() => setOpenId(null)}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold"
              >
                Close.
              </button>
            </div>

            {detailsError ? <div className="px-5 py-4 text-sm text-rose-700">{detailsError}</div> : null}

            {detailsLoading ? (
              <div className="px-5 py-6">
                <div className="h-6 w-60 animate-pulse rounded bg-slate-200" />
                <div className="mt-3 h-4 w-80 animate-pulse rounded bg-slate-200" />
              </div>
            ) : details ? (
              <div className="px-5 py-5">
                <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-cyan-50 via-fuchsia-50 to-yellow-50 p-4">
                  <div className="text-lg font-semibold text-slate-900">{details.title}.</div>
                  <div className="text-sm text-slate-700">
                    {details.contact?.name ?? `Contact #${details.contactId}`} ·{" "}
                    {details.clientCompany?.name ?? "No client"}.
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  <Field label="Title">
                    <input
                      value={String(editForm.title ?? "")}
                      onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                    />
                  </Field>

                  <Field label="Description">
                    <textarea
                      value={String(editForm.description ?? "")}
                      onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                      rows={4}
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                    />
                  </Field>

                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Stage">
                      <select
                        value={String(editForm.stage ?? details.stage)}
                        onChange={(e) => setEditForm((f) => ({ ...f, stage: e.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                      >
                        {STAGES.map((s) => (
                          <option key={s} value={s}>
                            {s}.
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Status">
                      <select
                        value={String(editForm.status ?? details.status)}
                        onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}.
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <Field label="Estimated value">
                      <input
                        value={String(editForm.estimatedValue ?? details.estimatedValue)}
                        onChange={(e) => setEditForm((f) => ({ ...f, estimatedValue: Number(e.target.value) }))}
                        type="number"
                        min={0}
                        className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                      />
                    </Field>

                    <Field label="Currency">
                      <input
                        value={String(editForm.currency ?? details.currency)}
                        onChange={(e) => setEditForm((f) => ({ ...f, currency: e.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                      />
                    </Field>

                    <Field label="Probability (0..1)">
                      <input
                        value={String(editForm.probability ?? details.probability)}
                        onChange={(e) => setEditForm((f) => ({ ...f, probability: Number(e.target.value) }))}
                        type="number"
                        min={0}
                        max={1}
                        step={0.05}
                        className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                      />
                    </Field>
                  </div>

                  <Field label="Expected close date (optional)">
                    <input
                      value={editForm.expectedCloseDate ? String(editForm.expectedCloseDate) : ""}
                      onChange={(e) => setEditForm((f) => ({ ...f, expectedCloseDate: e.target.value || null }))}
                      type="date"
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                    />
                  </Field>

                  <Field label="Client company ID (optional)">
                    <input
                      value={
                        editForm.clientCompanyId === null || editForm.clientCompanyId === undefined
                          ? ""
                          : String(editForm.clientCompanyId)
                      }
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, clientCompanyId: e.target.value ? Number(e.target.value) : null }))
                      }
                      placeholder="Leave empty for null."
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                    />
                  </Field>

                  <button
                    type="button"
                    onClick={saveEdits}
                    disabled={saving}
                    className="mt-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save changes."}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { // Reusable field wrapper (label + content).
  return ( // Renderujemo wrapper.
    <div>
      <div className="text-xs font-semibold text-slate-700">{label}.</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

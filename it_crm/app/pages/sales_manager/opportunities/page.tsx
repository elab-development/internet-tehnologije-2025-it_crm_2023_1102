"use client"; // Kažemo Next.js-u da je ovo Client Component (izvršava se u browser-u).

import React, { useEffect, useMemo, useState } from "react"; // Uvozimo React i hook-ove za state/effect/memo.
import { useRouter } from "next/navigation"; // Uvozimo router za navigaciju (redirect).

import type { Me } from "@/src/client/types/me"; // Tip za trenutno ulogovanog korisnika.
import type { ClientCategory } from "@/src/client/types/clientCategory"; // Tip za kategoriju klijenta.
import type { ClientCompany } from "@/src/client/types/clientCompany"; // Tip za klijentsku kompaniju.

type ClientCompanyStatus = "lead" | "active" | "inactive" | "paused"; // Dozvoljeni statusi klijentske kompanije.
type StatusFilter = "all" | ClientCompanyStatus; // Filter može biti "all" ili jedan od statusa.

function useDebounce<T>(value: T, delayMs = 350) { // Hook koji odlaže promenu vrednosti (debounce).
  const [debounced, setDebounced] = useState(value); // Čuvamo debounced vrednost u state-u.
  useEffect(() => { // Effect se okida kad se value ili delayMs promene.
    const t = setTimeout(() => setDebounced(value), delayMs); // Posle delay-a ažuriramo debounced vrednost.
    return () => clearTimeout(t); // Čistimo timeout da ne ostane “viseći”.
  }, [value, delayMs]); // Zavisnosti: value i delayMs.
  return debounced; // Vraćamo debounced vrednost.
}

function buildQuery(params: Record<string, string | number | boolean | undefined | null>) { // Helper za query string.
  const sp = new URLSearchParams(); // Kreiramo URLSearchParams objekat.
  Object.entries(params).forEach(([k, v]) => { // Prolazimo kroz sve parametre (key/value).
    if (v === undefined || v === null || v === "") return; // Preskačemo prazne vrednosti.
    sp.set(k, String(v)); // Dodajemo parametar u query.
  }); // Kraj forEach.
  const qs = sp.toString(); // Pretvaramo u string (npr. "page=1&status=active").
  return qs ? `?${qs}` : ""; // Ako ima parametara, vraćamo sa "?", inače prazan string.
}

function unwrap<T>(json: any): T { // Helper da podrži API odgovore koji vraćaju ili { data: ... } ili direktno objekat.
  return (json?.data ?? json) as T; // Ako postoji json.data uzmi to, inače uzmi json.
}

function CardShell({ children }: { children: React.ReactNode }) { // Reusable wrapper za kartice (filters).
  return <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">{children}</div>; // Render kartice.
}

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [ // Opcije za status filter.
  { value: "all", label: "All." }, // Prikazuje sve statuse.
  { value: "lead", label: "Lead." }, // Samo lead.
  { value: "active", label: "Active." }, // Samo active.
  { value: "inactive", label: "Inactive." }, // Samo inactive.
  { value: "paused", label: "Paused." }, // Samo paused.
];

export default function SalesManagerClientCompaniesPage() { // Glavna stranica za sales_manager -> client companies.
  const router = useRouter(); // Router koristimo za redirekcije.
  const PAGE_SIZE = 5; // Broj redova po strani (paginacija).

  const [me, setMe] = useState<Me | null>(null); // Trenutno ulogovani korisnik (Me).
  const [authLoading, setAuthLoading] = useState(true); // Da li se auth provera još učitava.

  const [categories, setCategories] = useState<ClientCategory[]>([]); // Lista kategorija za select (create/edit).
  const [rows, setRows] = useState<ClientCompany[]>([]); // Lista kompanija za tabelu.
  const [total, setTotal] = useState(0); // Ukupan broj kompanija za paginaciju.

  const [page, setPage] = useState(1); // Trenutna stranica.

  const [q, setQ] = useState(""); // Search po imenu (input).
  const dq = useDebounce(q, 350); // Debounced search (da ne zove API na svaki keystroke).

  const [city, setCity] = useState(""); // Filter po gradu (input).
  const dCity = useDebounce(city, 350); // Debounced city filter.

  const [status, setStatus] = useState<StatusFilter>("all"); // Filter po statusu.

  const [loading, setLoading] = useState(true); // Loading stanje za listu.
  const [error, setError] = useState<string | null>(null); // Error poruka za listu.

  const totalPages = useMemo(() => { // Računamo broj stranica.
    const tp = Math.ceil(total / PAGE_SIZE); // ceil(total/pageSize).
    return tp <= 0 ? 1 : tp; // Minimum 1.
  }, [total]); // Ponovo računamo kad se total promeni.

  // Drawer.
  const [openId, setOpenId] = useState<number | null>(null); // Koji client company je otvoren u drawer-u.
  const [details, setDetails] = useState<ClientCompany | null>(null); // Detalji izabranog klijenta.
  const [detailsLoading, setDetailsLoading] = useState(false); // Loading za detalje.
  const [detailsError, setDetailsError] = useState<string | null>(null); // Error za detalje.

  // Create modal.
  const [showCreate, setShowCreate] = useState(false); // Da li je create modal otvoren.
  const [creating, setCreating] = useState(false); // Da li je u toku kreiranje.

  const [createForm, setCreateForm] = useState({ // State za create formu.
    name: "", // Naziv kompanije.
    industry: "", // Industrija.
    companySize: "", // Veličina kompanije.
    website: "", // Sajt (opcioni).
    country: "", // Država.
    city: "", // Grad.
    address: "", // Adresa.
    status: "active" as ClientCompanyStatus, // Default status pri kreiranju.
    categoryId: 0, // Kategorija (id).
    freelanceConsultantId: 0, // Freelancer consultant id (validira backend).
  });

  // Edit form in drawer.
  const [saving, setSaving] = useState(false); // Da li je u toku snimanje izmena.
  const [editForm, setEditForm] = useState<Partial<ClientCompany>>({}); // Edit forma (lokalna kopija vrednosti).

  // Guard.
  useEffect(() => { // Effect za proveru autentifikacije i uloge.
    let cancelled = false; // Flag da ne setujemo state posle unmount-a.

    (async () => { // Async IIFE.
      try { // Try fetch.
        const res = await fetch("/api/auth/me", { method: "GET" }); // Učitavamo ulogovanog korisnika.
        if (!res.ok) { // Ako nije ulogovan.
          router.push("/pages/auth/login"); // Redirect na login.
          return; // Prekidamo.
        }

        const json = await res.json(); // Parsiramo odgovor.
        const data = unwrap<Me>(json); // Uzimamo Me iz json ili json.data.

        if (!data || data.role !== "sales_manager") { // Ako nije sales_manager.
          if (data?.role) router.push(`/pages/${data.role}/home`); // Redirect na home za njegovu ulogu.
          else router.push("/pages/auth/login"); // Ako nema role, na login.
          return; // Prekidamo.
        }

        if (!cancelled) setMe(data); // Ako nije otkazano, setujemo me.
      } catch { // Ako fetch pukne.
        router.push("/pages/auth/login"); // Fallback: na login.
      } finally { // Uvek.
        if (!cancelled) setAuthLoading(false); // Gasimo authLoading.
      }
    })(); // Poziv IIFE.

    return () => { // Cleanup.
      cancelled = true; // Sprečimo setState posle unmount-a.
    };
  }, [router]); // Zavisnost: router.

  // Categories.
  useEffect(() => { // Effect za učitavanje kategorija.
    if (authLoading) return; // Ako auth traje, ne učitavamo.
    let cancelled = false; // Cleanup flag.

    (async () => { // Async IIFE.
      try { // Try fetch.
        const res = await fetch("/api/client-categories", { method: "GET" }); // Učitavamo kategorije.
        if (!res.ok) return; // Ako ne uspe, samo izađemo (nema hard error).

        const json = await res.json(); // Parsiramo JSON.
        const items = unwrap<ClientCategory[]>(json); // Uzimamo listu iz json ili json.data.

        if (!cancelled) { // Ako nije otkazano.
          const safe = Array.isArray(items) ? items : []; // Osiguramo da je niz.
          setCategories(safe); // Setujemo kategorije.

          const firstId = safe.length > 0 ? safe[0].id : 0; // Prvi id kao default.
          setCreateForm((f) => ({ ...f, categoryId: firstId })); // U create formu upisujemo default categoryId.
        }
      } catch {
        // ignore. // Ignorišemo grešku jer kategorije nisu “kritične” za prikaz liste.
      }
    })(); // Poziv IIFE.

    return () => { // Cleanup.
      cancelled = true; // Sprečimo setState posle unmount-a.
    };
  }, [authLoading]); // Kad authLoading pređe na false, učitaj kategorije.

  // Reset pagination on filters.
  useEffect(() => { // Kad filteri promene, vraćamo page na 1.
    setPage(1); // Resetujemo paginaciju.
  }, [dq, dCity, status]); // Zavisnosti: search, city i status filter.

  async function fetchList(targetPage: number) { // Helper funkcija koja učitava listu.
    const qs = buildQuery({ // Pravljenje query parametara.
      page: targetPage, // Stranica koju učitavamo.
      pageSize: PAGE_SIZE, // Broj redova po strani.
      q: dq || undefined, // Search query (samo ako nije prazan).
      city: dCity || undefined, // City filter (samo ako nije prazan).
      status: status === "all" ? undefined : status, // Status filter (samo ako nije all).
    }); // Kraj buildQuery.

    const res = await fetch(`/api/client-companies${qs}`, { method: "GET" }); // Poziv API-ja za listu.
    if (!res.ok) { // Ako API vrati grešku.
      const msg = await res.json().catch(() => null); // Pokušamo da izvučemo poruku.
      throw new Error(msg?.message || "Unable to load client companies."); // Bacamo error sa eng porukom.
    }

    const json = await res.json(); // Parsiramo odgovor.
    const data = unwrap<{ items: ClientCompany[]; total: number }>(json); // Uzimamo {items,total}.

    setRows(Array.isArray(data?.items) ? data.items : []); // Postavljamo items u rows.
    setTotal(typeof data?.total === "number" ? data.total : 0); // Postavljamo total.
  }

  // Fetch list.
  useEffect(() => { // Effect koji učitava listu kompanija.
    if (authLoading) return; // Ako auth traje, ne radimo.
    if (!me) return; // Ako nema ulogovanog user-a, ne radimo.

    let cancelled = false; // Cleanup flag.

    (async () => { // Async IIFE.
      setLoading(true); // Uključimo loading.
      setError(null); // Resetujemo grešku.

      try { // Try.
        await fetchList(page); // Učitamo listu za trenutnu stranicu.
      } catch (e: any) { // Catch.
        if (!cancelled) { // Ako nije otkazano.
          setRows([]); // Praznimo rows.
          setTotal(0); // Reset total.
          setError(e?.message || "Something went wrong."); // Postavljamo error poruku (eng).
        }
      } finally { // Uvek.
        if (!cancelled) setLoading(false); // Gasimo loading.
      }
    })(); // Poziv IIFE.

    return () => { // Cleanup.
      cancelled = true; // Sprečimo setState posle unmount-a.
    };
  }, [authLoading, me, page, dq, dCity, status]); // Re-fetch kad se bilo šta relevantno promeni.

  // Details fetch: GET /api/client-companies/[id].
  useEffect(() => { // Effect za učitavanje detalja kada se openId promeni.
    if (!openId) { // Ako nije izabran klijent.
      setDetails(null); // Resetujemo details.
      setDetailsError(null); // Resetujemo error.
      setEditForm({}); // Resetujemo edit formu.
      return; // Prekidamo.
    }

    let cancelled = false; // Cleanup flag.

    (async () => { // Async IIFE.
      setDetailsLoading(true); // Uključimo loading za detalje.
      setDetailsError(null); // Resetujemo details error.

      try { // Try.
        console.log("Fetching details for ID:", openId); // Debug log (možeš obrisati kasnije).
        const res = await fetch(`/api/client-companies/${openId}`, { method: "GET" }); // Fetch detalja.
        if (!res.ok) { // Ako nije ok.
          const msg = await res.json().catch(() => null); // Uzmemo message ako postoji.
          throw new Error(msg?.message || "Unable to load client details."); // Bacimo error.
        }

        const json = await res.json(); // Parsiramo JSON.
        const company = unwrap<ClientCompany>(json); // Unwrap u ClientCompany.

        if (!cancelled) { // Ako nije otkazano.
          setDetails(company); // Setujemo details.
          setEditForm({ // Punimo edit formu početnim vrednostima.
            name: company?.name, // Name.
            industry: company?.industry, // Industry.
            companySize: company?.companySize, // Company size.
            website: company?.website ?? "", // Website (fallback).
            country: company?.country, // Country.
            city: company?.city, // City.
            address: company?.address, // Address.
            status: company?.status, // Status.
            categoryId: company?.categoryId, // Category id.
            freelanceConsultantId: company?.freelanceConsultantId, // Freelancer id.
          }); // Kraj setEditForm.
        }
      } catch (e: any) { // Catch.
        if (!cancelled) setDetailsError(e?.message || "Error."); // Postavljamo error poruku.
      } finally { // Uvek.
        if (!cancelled) setDetailsLoading(false); // Gasimo loading.
      }
    })(); // Poziv IIFE.

    return () => { // Cleanup.
      cancelled = true; // Sprečimo setState posle unmount-a.
    };
  }, [openId]); // Zavisnost: openId.

  async function createClientCompany() { // Funkcija za kreiranje klijenta (POST).
    if (!me) return; // Ako nema me, prekidamo (ne bi trebalo da se desi).

    setCreating(true); // Uključimo creating flag.
    try { // Try.
      const res = await fetch("/api/client-companies", { // POST na endpoint.
        method: "POST", // HTTP metoda.
        headers: { "Content-Type": "application/json" }, // Šaljemo JSON.
        body: JSON.stringify({ // Payload.
          ...createForm, // Podaci iz forme.
          website: createForm.website?.trim() ? createForm.website.trim() : null, // Website trim i null ako je prazan.
          categoryId: Number(createForm.categoryId), // Category id u broj.
          salesManagerId: me.id, // Backend očekuje salesManagerId.
          freelanceConsultantId: Number(createForm.freelanceConsultantId), // Freelancer id u broj.
        }), // Kraj payload.
      }); // Kraj fetch.

      if (!res.ok) { // Ako nije uspelo.
        const msg = await res.json().catch(() => null); // Uzmemo poruku.
        throw new Error(msg?.message || "Create failed."); // Bacimo error.
      }

      setShowCreate(false); // Zatvorimo modal.
      setCreateForm((f) => ({ ...f, name: "", website: "", city: "", address: "" })); // Resetujemo deo polja.

      setPage(1); // Vraćamo na prvu stranicu.
      await fetchList(1); // Refetch liste.
    } catch (e: any) { // Catch.
      alert(e?.message || "Error."); // Alert poruka.
    } finally { // Uvek.
      setCreating(false); // Gasimo creating.
    }
  }

  // PATCH: /api/client-companies/[id].
  async function saveEdits() { // Funkcija za snimanje izmena u drawer-u (PATCH).
    if (!openId) return; // Ako nema openId, nema šta da snimamo.

    setSaving(true); // Uključimo saving flag.
    try { // Try.
      const res = await fetch(`/api/client-companies/${openId}`, { // PATCH na endpoint.
        method: "PATCH", // HTTP metoda.
        headers: { "Content-Type": "application/json" }, // Šaljemo JSON.
        body: JSON.stringify({ // Payload.
          ...editForm, // Sve iz edit forme.
          website: (editForm.website as any)?.trim ? (String(editForm.website).trim() || null) : editForm.website, // Trim website i null ako je prazan.
          categoryId: editForm.categoryId !== undefined ? Number(editForm.categoryId) : undefined, // categoryId u broj ako je setovan.
          freelanceConsultantId:
            editForm.freelanceConsultantId !== undefined ? Number(editForm.freelanceConsultantId) : undefined, // freelancerId u broj.
          status: editForm.status as ClientCompanyStatus | undefined, // Status cast na dozvoljeni tip.
        }), // Kraj payload.
      }); // Kraj fetch.

      if (!res.ok) { // Ako nije ok.
        const msg = await res.json().catch(() => null); // Izvlačimo poruku.
        throw new Error(msg?.message || "Update failed."); // Bacamo error.
      }

      const json = await res.json(); // Parsiramo JSON.
      const updated = unwrap<ClientCompany>(json); // Unwrap updated objekat.

      setDetails(updated); // Ažuriramo details state.
      await fetchList(page); // Refetch liste za trenutnu stranicu.
    } catch (e: any) { // Catch.
      alert(e?.message || "Error."); // Alert poruka.
    } finally { // Uvek.
      setSaving(false); // Gasimo saving.
    }
  }

  if (authLoading) { // Ako auth još traje.
    return ( // Prikaz skeleton-a.
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="h-10 w-56 animate-pulse rounded bg-slate-200" />
        <div className="mt-6 h-64 animate-pulse rounded-2xl bg-slate-100" />
      </main>
    );
  }

  return ( // Glavni UI.
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-cyan-50 via-fuchsia-50 to-yellow-50 p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Client companies.</h1>
            <p className="mt-1 text-sm text-slate-700">
              Team client management (search, filters, details, edit).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 backdrop-blur">
              <div className="text-sm font-semibold text-slate-900">{me?.name}.</div>
              <div className="text-xs text-slate-600">Sales manager.</div>
            </div>

            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              + New client.
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <CardShell>
          <div className="p-4">
            <div className="text-xs font-semibold text-slate-700">Search.</div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name."
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
          </div>
        </CardShell>

        <CardShell>
          <div className="p-4">
            <div className="text-xs font-semibold text-slate-700">City.</div>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Filter by city."
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
          </div>
        </CardShell>

        <CardShell>
          <div className="p-4">
            <div className="text-xs font-semibold text-slate-700">Status.</div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </CardShell>

        <CardShell>
          <div className="p-4">
            <div className="text-xs font-semibold text-slate-700">Pagination.</div>
            <div className="mt-2 flex items-center justify-between">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold transition disabled:opacity-50"
              >
                Prev.
              </button>
              <div className="text-xs text-slate-600">
                Page {page}/{totalPages}.
              </div>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold transition disabled:opacity-50"
              >
                Next.
              </button>
            </div>
          </div>
        </CardShell>
      </div>

      <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="text-sm font-semibold text-slate-900">
            Results: <span className="text-slate-600">{total}.</span>
          </div>
          <div className="text-xs text-slate-600">Click a row to open details.</div>
        </div>

        {error ? <div className="px-4 py-6 text-sm text-rose-700">{error}</div> : null}

        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[1050px]">
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
              {loading ? (
                Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-4"><div className="h-4 w-44 animate-pulse rounded bg-slate-200" /></td>
                    <td className="px-4 py-4"><div className="h-4 w-28 animate-pulse rounded bg-slate-200" /></td>
                    <td className="px-4 py-4"><div className="h-4 w-20 animate-pulse rounded bg-slate-200" /></td>
                    <td className="px-4 py-4"><div className="h-4 w-24 animate-pulse rounded bg-slate-200" /></td>
                    <td className="px-4 py-4"><div className="h-6 w-24 animate-pulse rounded-full bg-slate-200" /></td>
                    <td className="px-4 py-4"><div className="h-4 w-28 animate-pulse rounded bg-slate-200" /></td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-600" colSpan={6}>
                    No results.
                  </td>
                </tr>
              ) : (
                rows.map((c) => (
                  <tr
                    key={c.id}
                    className="cursor-pointer text-sm text-slate-900 hover:bg-slate-50"
                    onClick={() => setOpenId(c.id)}
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
      </div>

      {/* Create modal. */}
      {showCreate ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => (creating ? null : setShowCreate(false))} />

          <div className="absolute left-1/2 top-1/2 w-[95%] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <div className="text-sm font-semibold text-slate-900">New client company.</div>
                <div className="text-xs text-slate-600">POST /api/client-companies.</div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                disabled={creating}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50"
              >
                Close.
              </button>
            </div>

            <div className="grid gap-3 p-5 md:grid-cols-2">
              <Field label="Name">
                <input
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                />
              </Field>

              <Field label="Industry">
                <input
                  value={createForm.industry}
                  onChange={(e) => setCreateForm((f) => ({ ...f, industry: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                />
              </Field>

              <Field label="Company size">
                <input
                  value={createForm.companySize}
                  onChange={(e) => setCreateForm((f) => ({ ...f, companySize: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                />
              </Field>

              <Field label="Website (optional)">
                <input
                  value={createForm.website}
                  onChange={(e) => setCreateForm((f) => ({ ...f, website: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                />
              </Field>

              <Field label="Country">
                <input
                  value={createForm.country}
                  onChange={(e) => setCreateForm((f) => ({ ...f, country: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                />
              </Field>

              <Field label="City">
                <input
                  value={createForm.city}
                  onChange={(e) => setCreateForm((f) => ({ ...f, city: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                />
              </Field>

              <Field label="Address">
                <input
                  value={createForm.address}
                  onChange={(e) => setCreateForm((f) => ({ ...f, address: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                />
              </Field>

              <Field label="Status">
                <select
                  value={createForm.status}
                  onChange={(e) => setCreateForm((f) => ({ ...f, status: e.target.value as ClientCompanyStatus }))}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                >
                  <option value="lead">Lead.</option>
                  <option value="active">Active.</option>
                  <option value="inactive">Inactive.</option>
                  <option value="paused">Paused.</option>
                </select>
              </Field>

              <Field label="Category">
                <select
                  value={createForm.categoryId}
                  onChange={(e) => setCreateForm((f) => ({ ...f, categoryId: Number(e.target.value) }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}.
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Freelance consultant ID">
                <input
                  value={createForm.freelanceConsultantId ? String(createForm.freelanceConsultantId) : ""}
                  onChange={(e) => setCreateForm((f) => ({ ...f, freelanceConsultantId: Number(e.target.value || 0) }))}
                  placeholder="Enter a freelancer ID from your team."
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Backend validates the freelancer exists, is active, and belongs to your team.
                </p>
              </Field>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                disabled={creating}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                Cancel.
              </button>

              <button
                type="button"
                onClick={createClientCompany}
                disabled={creating}
                className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create."}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Details drawer + edit. */}
      {openId ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpenId(null)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <div className="text-sm font-semibold text-slate-900">Client details.</div>
                <div className="text-xs text-slate-600">GET/PATCH /api/client-companies/{openId}.</div>
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
                  <div className="text-lg font-semibold text-slate-900">{details.name}.</div>
                  <div className="text-sm text-slate-700">
                    {details.industry} · {details.companySize} · {details.city}.
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  <Field label="Name">
                    <input
                      value={String(editForm.name ?? "")}
                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                    />
                  </Field>

                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Industry">
                      <input
                        value={String(editForm.industry ?? "")}
                        onChange={(e) => setEditForm((f) => ({ ...f, industry: e.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                      />
                    </Field>

                    <Field label="Company size">
                      <input
                        value={String(editForm.companySize ?? "")}
                        onChange={(e) => setEditForm((f) => ({ ...f, companySize: e.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                      />
                    </Field>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Country">
                      <input
                        value={String(editForm.country ?? "")}
                        onChange={(e) => setEditForm((f) => ({ ...f, country: e.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                      />
                    </Field>

                    <Field label="City">
                      <input
                        value={String(editForm.city ?? "")}
                        onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                      />
                    </Field>
                  </div>

                  <Field label="Address">
                    <input
                      value={String(editForm.address ?? "")}
                      onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                    />
                  </Field>

                  <Field label="Website">
                    <input
                      value={String(editForm.website ?? "")}
                      onChange={(e) => setEditForm((f) => ({ ...f, website: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                    />
                  </Field>

                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Status">
                      <select
                        value={String(editForm.status ?? details.status ?? "active")}
                        onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as ClientCompanyStatus }))}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                      >
                        <option value="lead">Lead.</option>
                        <option value="active">Active.</option>
                        <option value="inactive">Inactive.</option>
                        <option value="paused">Paused.</option>
                      </select>
                    </Field>

                    <Field label="Category">
                      <select
                        value={Number(editForm.categoryId ?? details.categoryId)}
                        onChange={(e) => setEditForm((f) => ({ ...f, categoryId: Number(e.target.value) }))}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}.
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <Field label="Freelance consultant ID">
                    <input
                      value={String(editForm.freelanceConsultantId ?? details.freelanceConsultantId)}
                      onChange={(e) => setEditForm((f) => ({ ...f, freelanceConsultantId: Number(e.target.value || 0) }))}
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Backend validates that the freelancer belongs to your team (managerId).
                    </p>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) { // Reusable polje: label + children.
  return ( // Render wrapper-a.
    <div>
      <div className="text-xs font-semibold text-slate-700">{label}.</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

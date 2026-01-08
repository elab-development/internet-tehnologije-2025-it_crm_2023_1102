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
      try {
        const res = await fetch("/api/auth/me"); // Pozivamo API da dobijemo trenutno ulogovanog user-a.
        if (!res.ok) {
          router.push("/pages/auth/login"); // Redirect na login.
          return;
        }

        const data = (await res.json()) as Me; // Parsiramo odgovor kao Me.

        if (!data || data.role !== "freelance_consultant") {
          if (data?.role) router.push(`/pages/${data.role}/home`);
          else router.push("/pages/auth/login");
          return;
        }

        if (!cancelled) setMe(data); // Ako nije unmount-ovano, setujemo me.
      } catch {
        router.push("/pages/auth/login"); // Ako nešto pukne, šaljemo na login.
      } finally {
        if (!cancelled) setAuthLoading(false); // Gasimo auth loading.
      }
    })();

    return () => {
      cancelled = true; // Cleanup.
    };
  }, [router]);

  // Reset page on filters.
  useEffect(() => {
    setPage(1); // Reset paginacije.
  }, [dq, stage, status]);

  // Fetch list.
  useEffect(() => {
    if (authLoading) return;
    if (!me) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const qs = buildQuery({
          page,
          pageSize: PAGE_SIZE,
          q: dq || undefined,
          stage: stage === "all" ? undefined : stage,
          status: status === "all" ? undefined : status,
        });

        const res = await fetch(`/api/opportunities${qs}`, { method: "GET" });
        if (!res.ok) throw new Error("Cannot load opportunities.");

        const json = await res.json();

        const items: Opportunity[] = json?.items ?? [];
        const totalValue: number = json?.total ?? 0;

        if (!cancelled) {
          setRows(Array.isArray(items) ? items : []);
          setTotal(typeof totalValue === "number" ? totalValue : 0);
        }
      } catch (e: any) {
        if (!cancelled) {
          setRows([]);
          setTotal(0);
          setError(e?.message || "An error occurred.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, me, page, dq, stage, status]);

  // Details fetch.
  useEffect(() => {
    if (!openId) {
      setDetails(null);
      setDetailsError(null);
      return;
    }

    let cancelled = false;

    (async () => {
      setDetailsLoading(true);
      setDetailsError(null);

      try {
        const res = await fetch(`/api/opportunities/${openId}`, { method: "GET" });
        if (!res.ok) throw new Error("Cannot load opportunity details.");

        const json = await res.json();
        if (!cancelled) setDetails(json as Opportunity);
      } catch (e: any) {
        if (!cancelled) setDetailsError(e?.message || "Error.");
      } finally {
        if (!cancelled) setDetailsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [openId]);

  async function patchOpportunity(id: number, payload: Partial<Opportunity>) {
    const res = await fetch(`/api/opportunities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const msg = await res.json().catch(() => null);
      throw new Error(msg?.message || "Update failed.");
    }

    return (await res.json()) as Opportunity;
  }

  async function onChangeStage(id: number, next: string) {
    const prev = rows;
    setRows((r) => r.map((x) => (x.id === id ? { ...x, stage: next } : x)));

    try {
      await patchOpportunity(id, { stage: next });
    } catch (e: any) {
      setRows(prev);
      alert(e?.message || "Error.");
    }
  }

  async function onChangeStatus(id: number, next: string) {
    const prev = rows;
    setRows((r) => r.map((x) => (x.id === id ? { ...x, status: next } : x)));

    try {
      await patchOpportunity(id, { status: next });
    } catch (e: any) {
      setRows(prev);
      alert(e?.message || "Error.");
    }
  }

  if (authLoading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="h-10 w-56 animate-pulse rounded bg-slate-200" />
        <div className="mt-6 h-64 animate-pulse rounded-2xl bg-slate-100" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">My opportunities.</h1>
          <p className="mt-1 text-sm text-slate-600">
            Overview of opportunities assigned to a freelance consultant, with quick stage and status updates.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">{me?.name}.</div>
          <div className="text-xs text-slate-600">Freelance consultant.</div>
        </div>
      </header>

      <section className="mt-6 grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <div className="md:col-span-2">
          <label className="text-xs font-semibold text-slate-700">Search (title).</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by opportunity title."
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700">Stage.</label>
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
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
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
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

      <section className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="text-sm font-semibold text-slate-900">
            Results: <span className="text-slate-600">{total}.</span>
          </div>
          <div className="text-xs text-slate-600">
            Page {page} / {Math.max(1, totalPages)}.
          </div>
        </div>

        {error ? <div className="px-4 py-6 text-sm text-rose-700">{error}</div> : null}

        <div className="w-full overflow-x-auto">
          {/* VAŽNO: unutar <table>/<thead> ne sme postojati {" "} ili bilo kakav tekst node */}
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
                    <td className="px-4 py-4">
                      <div className="h-4 w-56 animate-pulse rounded bg-slate-200" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-9 w-36 animate-pulse rounded bg-slate-200" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-9 w-36 animate-pulse rounded bg-slate-200" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
                    </td>
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
                      className="px-4 py-4 cursor-pointer font-semibold hover:underline"
                      onClick={() => setOpenId(o.id)}
                      title="Open details."
                    >
                      {o.title}.
                    </td>

                    <td className="px-4 py-4 text-slate-700">
                      {(o.contact?.name ?? `#${o.contactId}`) + "."}
                    </td>

                    <td className="px-4 py-4 text-slate-700">
                      {(o.clientCompany?.name ?? "-") + "."}
                    </td>

                    <td className="px-4 py-4">
                      <select
                        value={o.stage}
                        onChange={(e) => onChangeStage(o.id, e.target.value)}
                        className="w-40 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
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
                        onChange={(e) => onChangeStatus(o.id, e.target.value)}
                        className="w-40 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
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

        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold transition disabled:opacity-50"
          >
            Prev.
          </button>

          <div className="text-xs text-slate-600">Showing {rows.length} of {total}.</div>

          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold transition disabled:opacity-50"
          >
            Next.
          </button>
        </div>
      </section>

      {/* Details drawer. */}
      {openId ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpenId(null)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <div className="text-sm font-semibold text-slate-900">Opportunity details.</div>
                <div className="text-xs text-slate-600">{`GET /api/opportunities/${openId}.`}</div>
              </div>
              <button
                type="button"
                onClick={() => setOpenId(null)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold"
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
                <h2 className="text-xl font-semibold text-slate-900">{details.title}.</h2>

                {/* VAŽNO: uklanjamo {" "} i spajamo tekst bez whitespace node-ova */}
                <p className="mt-1 text-sm text-slate-600">
                  {`${details.contact?.name ?? `Contact #${details.contactId}`} · ${
                    details.clientCompany?.name ?? "No client company"
                  }.`}
                </p>

                {details.description ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800">
                    {details.description}.
                  </div>
                ) : null}

                <div className="mt-4 grid gap-3 md:grid-cols-2">
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

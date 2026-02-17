"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { Me } from "@/src/client/types/me";
import type { Opportunity } from "@/src/client/types/opportunity";

type Role = "admin" | "sales_manager" | "freelance_consultant";

type FreelancerLite = {
  id: number;
  name: string;
  email?: string;
  role: Role;
  isActive: boolean;
  managerId: number;
};

type ContactLite = {
  id: number;
  name: string;
  clientCompanyId: number;
  salesManagerId: number;
  freelanceConsultantId: number;
  clientCompany?: { id: number; name: string } | null;
};

type ClientCompanyLite = {
  id: number;
  name: string;
  salesManagerId: number;
  freelanceConsultantId: number;
};

function useDebounce<T>(value: T, delayMs = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

function buildQuery(params: Record<string, string | number | boolean | undefined | null>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    sp.set(k, String(v));
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

function unwrap<T>(json: any): T {
  return (json?.data ?? json) as T;
}

function dateInputToIso(v: string): string | null {
  if (!v) return null;
  return new Date(`${v}T00:00:00.000Z`).toISOString();
}

function isoToDateInput(v: string | null | undefined): string {
  if (!v) return "";
  return String(v).slice(0, 10);
}

function CardShell({ children }: { children: React.ReactNode }) {
  return <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">{children}</div>;
}

const STAGES = ["prospecting", "discovery", "proposal", "negotiation", "won", "lost"];
const STATUSES = ["open", "closed"];

export default function SalesManagerOpportunitiesPage() {
  const router = useRouter();
  const PAGE_SIZE = 5;

  const [me, setMe] = useState<Me | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [rows, setRows] = useState<Opportunity[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [q, setQ] = useState("");
  const dq = useDebounce(q, 350);

  const [stage, setStage] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const totalPages = useMemo(() => {
    const tp = Math.ceil(total / PAGE_SIZE);
    return tp <= 0 ? 1 : tp;
  }, [total, PAGE_SIZE]);

  // Drawer.
  const [openId, setOpenId] = useState<number | null>(null);
  const [details, setDetails] = useState<Opportunity | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Opportunity>>({});

  // Create modal.
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const [teamFreelancers, setTeamFreelancers] = useState<FreelancerLite[]>([]);
  const [contacts, setContacts] = useState<ContactLite[]>([]);
  const [companies, setCompanies] = useState<ClientCompanyLite[]>([]);
  const [picklistsLoading, setPicklistsLoading] = useState(false);
  const [picklistsError, setPicklistsError] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    stage: "prospecting",
    status: "open",
    estimatedValue: 1000,
    currency: "EUR",
    probability: 0.5,
    expectedCloseDate: "" as string, // YYYY-MM-DD ili "".
    freelanceConsultantId: 0,
    contactId: 0,
    clientCompanyId: null as number | null,
  });

  const filteredContacts = useMemo(() => {
    const fcId = Number(createForm.freelanceConsultantId);
    if (!fcId) return [];
    return contacts.filter((c) => Number(c.freelanceConsultantId) === fcId);
  }, [contacts, createForm.freelanceConsultantId]);

  const filteredCompanies = useMemo(() => {
    const fcId = Number(createForm.freelanceConsultantId);
    if (!fcId) return [];
    return companies.filter((c) => Number(c.freelanceConsultantId) === fcId);
  }, [companies, createForm.freelanceConsultantId]);

  const selectedContact = useMemo(() => {
    const id = Number(createForm.contactId);
    if (!id) return null;
    return filteredContacts.find((c) => c.id === id) ?? null;
  }, [filteredContacts, createForm.contactId]);

  // Guard.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/auth/me", { method: "GET" });
        if (!res.ok) {
          router.push("/pages/auth/login");
          return;
        }

        const json = await res.json();
        const data = unwrap<Me>(json);

        if (!data || data.role !== "sales_manager") {
          if (data?.role) router.push(`/pages/${data.role}/home`);
          else router.push("/pages/auth/login");
          return;
        }

        if (!cancelled) setMe(data);
      } catch {
        router.push("/pages/auth/login");
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  // Reset pagination on filters.
  useEffect(() => {
    setPage(1);
  }, [dq, stage, status]);

  async function fetchList(targetPage: number) {
    const qs = buildQuery({
      page: targetPage,
      pageSize: PAGE_SIZE,
      q: dq || undefined,
      stage: stage === "all" ? undefined : stage,
      status: status === "all" ? undefined : status,
    });

    const res = await fetch(`/api/opportunities${qs}`, { method: "GET" });
    if (!res.ok) {
      const msg = await res.json().catch(() => null);
      throw new Error(msg?.message || "Ne mogu da učitam opportunities.");
    }

    const json = await res.json();
    const data = unwrap<{ items: Opportunity[]; total: number }>(json);

    setRows(Array.isArray(data?.items) ? data.items : []);
    setTotal(typeof data?.total === "number" ? data.total : 0);
  }

  // Fetch list.
  useEffect(() => {
    if (authLoading) return;
    if (!me) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        await fetchList(page);
      } catch (e: any) {
        if (!cancelled) {
          setRows([]);
          setTotal(0);
          setError(e?.message || "Došlo je do greške.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, me, page, dq, stage, status]);

  async function loadPicklists() {
    if (!me) return;

    setPicklistsLoading(true);
    setPicklistsError(null);

    try {
      // 1) Freelanceri iz tima.
      const fRes = await fetch("/api/users/team?page=1&pageSize=50", { method: "GET" });
      if (!fRes.ok) {
        const msg = await fRes.json().catch(() => null);
        throw new Error(msg?.message || "Ne mogu da učitam freelancere tima.");
      }

      const fJson = await fRes.json();
      const fData = unwrap<{ items: FreelancerLite[] }>(fJson);
      const team = Array.isArray(fData?.items) ? fData.items : [];

      setTeamFreelancers(team);

      const firstFcId = team.length ? team[0].id : 0;
      setCreateForm((prev) => ({
        ...prev,
        freelanceConsultantId: prev.freelanceConsultantId || firstFcId,
      }));

      // 2) Kontakti (scoped).
      const cRes = await fetch(`/api/contacts${buildQuery({ page: 1, pageSize: 200 })}`, { method: "GET" });
      if (cRes.ok) {
        const cJson = await cRes.json();
        const cData = unwrap<any>(cJson);
        const items = Array.isArray(cData)
          ? cData
          : Array.isArray(cData?.items)
            ? cData.items
            : [];
        setContacts(items as ContactLite[]);
      } else {
        setContacts([]);
      }

      // 3) Client companies (scoped).
      const ccRes = await fetch(`/api/client-companies${buildQuery({ page: 1, pageSize: 200 })}`, { method: "GET" });
      if (ccRes.ok) {
        const ccJson = await ccRes.json();
        const ccData = unwrap<any>(ccJson);
        const items = Array.isArray(ccData)
          ? ccData
          : Array.isArray(ccData?.items)
            ? ccData.items
            : [];

        const slim = (items as any[]).map((x) => ({
          id: Number(x.id),
          name: String(x.name ?? ""),
          salesManagerId: Number(x.salesManagerId),
          freelanceConsultantId: Number(x.freelanceConsultantId),
        })) as ClientCompanyLite[];

        setCompanies(slim);
      } else {
        setCompanies([]);
      }
    } catch (e: any) {
      setPicklistsError(e?.message || "Ne mogu da učitam liste (freelanceri/kontakti/kompanije).");
    } finally {
      setPicklistsLoading(false);
    }
  }

  useEffect(() => {
    if (!showCreate) return;
    if (!me) return;

    void loadPicklists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCreate, me]);

  // Details fetch.
  useEffect(() => {
    if (!openId) {
      setDetails(null);
      setDetailsError(null);
      setEditForm({});
      return;
    }

    let cancelled = false;

    (async () => {
      setDetailsLoading(true);
      setDetailsError(null);

      try {
        const res = await fetch(`/api/opportunities/${openId}`, { method: "GET" });
        if (!res.ok) {
          const msg = await res.json().catch(() => null);
          throw new Error(msg?.message || "Ne mogu da učitam detalje opportunity-ja.");
        }

        const json = await res.json();
        const opp = unwrap<Opportunity>(json);

        if (!cancelled) {
          setDetails(opp);
          setEditForm({
            title: opp?.title,
            description: opp?.description ?? "",
            stage: opp?.stage,
            status: opp?.status,
            estimatedValue: opp?.estimatedValue,
            currency: opp?.currency,
            probability: opp?.probability,
            // U formi držimo YYYY-MM-DD radi <input type="date">.
            expectedCloseDate: opp?.expectedCloseDate ? (isoToDateInput(opp.expectedCloseDate) as any) : (null as any),
            clientCompanyId: (opp?.clientCompanyId ?? null) as any,
          });
        }
      } catch (e: any) {
        if (!cancelled) setDetailsError(e?.message || "Greška.");
      } finally {
        if (!cancelled) setDetailsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [openId]);

  async function patchOpportunity(id: number, payload: any) {
    const res = await fetch(`/api/opportunities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const msg = await res.json().catch(() => null);
      throw new Error(msg?.message || "Izmena nije uspela.");
    }

    const json = await res.json();
    return unwrap<Opportunity>(json);
  }

  async function onQuickStage(id: number, next: string) {
    const prev = rows;
    setRows((r) => r.map((x) => (x.id === id ? { ...x, stage: next } : x)));

    try {
      await patchOpportunity(id, { stage: next });
    } catch (e: any) {
      setRows(prev);
      alert(e?.message || "Greška.");
    }
  }

  async function onQuickStatus(id: number, next: string) {
    const prev = rows;
    setRows((r) => r.map((x) => (x.id === id ? { ...x, status: next } : x)));

    try {
      await patchOpportunity(id, { status: next });
    } catch (e: any) {
      setRows(prev);
      alert(e?.message || "Greška.");
    }
  }

  async function saveEdits() {
    if (!openId) return;

    setSaving(true);
    try {
      const payload = {
        ...editForm,
        estimatedValue: editForm.estimatedValue !== undefined ? Number(editForm.estimatedValue) : undefined,
        probability: editForm.probability !== undefined ? Number(editForm.probability) : undefined,
        // Očekuje ISO datetime na backendu.
        expectedCloseDate:
          editForm.expectedCloseDate !== undefined ? dateInputToIso(String(editForm.expectedCloseDate || "")) : undefined,
        clientCompanyId:
          editForm.clientCompanyId === undefined
            ? undefined
            : (editForm.clientCompanyId as any) === null
              ? null
              : Number(editForm.clientCompanyId as any),
      };

      const updated = await patchOpportunity(openId, payload);
      setDetails(updated);
      await fetchList(page);
    } catch (e: any) {
      alert(e?.message || "Greška.");
    } finally {
      setSaving(false);
    }
  }

  function onCreateFreelancerChange(nextId: number) {
    setCreateForm((f) => ({
      ...f,
      freelanceConsultantId: nextId,
      contactId: 0,
      clientCompanyId: null,
    }));
  }

  function onCreateContactChange(nextContactId: number) {
    const c = filteredContacts.find((x) => x.id === nextContactId) ?? null;

    setCreateForm((f) => ({
      ...f,
      contactId: nextContactId,
      clientCompanyId: c ? Number(c.clientCompanyId) : null,
    }));
  }

  async function createOpportunity() {
    if (!me) return;

    const title = createForm.title.trim();
    if (!title) {
      alert("Naslov je obavezan.");
      return;
    }
    if (!createForm.freelanceConsultantId) {
      alert("Izaberi freelancera.");
      return;
    }
    if (!createForm.contactId) {
      alert("Izaberi kontakt.");
      return;
    }

    const ev = Number(createForm.estimatedValue);
    if (!Number.isFinite(ev) || ev < 0) {
      alert("Estimated value mora biti broj >= 0.");
      return;
    }

    const prob = Number(createForm.probability);
    if (!Number.isFinite(prob) || prob < 0 || prob > 1) {
      alert("Probability mora biti u opsegu 0..1.");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: createForm.description?.trim() ? createForm.description.trim() : null,
          stage: createForm.stage,
          status: createForm.status,
          estimatedValue: ev,
          currency: createForm.currency,
          probability: prob,
          // Očekuje ISO datetime na backendu.
          expectedCloseDate: dateInputToIso(createForm.expectedCloseDate),
          contactId: Number(createForm.contactId),
          salesManagerId: Number(me.id),
          freelanceConsultantId: Number(createForm.freelanceConsultantId),
          clientCompanyId: createForm.clientCompanyId === null ? null : Number(createForm.clientCompanyId),
        }),
      });

      if (!res.ok) {
        const msg = await res.json().catch(() => null);
        throw new Error(msg?.message || "Kreiranje nije uspelo.");
      }

      const json = await res.json();
      unwrap<Opportunity>(json);

      setShowCreate(false);
      setCreateForm((f) => ({
        ...f,
        title: "",
        description: "",
        estimatedValue: 1000,
        probability: 0.5,
        expectedCloseDate: "",
        contactId: 0,
        clientCompanyId: null,
      }));

      setPage(1);
      await fetchList(1);
    } catch (e: any) {
      alert(e?.message || "Greška.");
    } finally {
      setCreating(false);
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
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-cyan-50 via-fuchsia-50 to-yellow-50 p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Opportunities.</h1>
            <p className="mt-1 text-sm text-slate-700">Team opportunities overview with quick stage and status updates.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 backdrop-blur">
              <div className="text-sm font-semibold text-slate-900">{me?.name}.</div>
              <div className="text-xs text-slate-600">Sales menadžer.</div>
            </div>

            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              + New opportunity.
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
              placeholder="Search by title."
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
          </div>
        </CardShell>

        <CardShell>
          <div className="p-4">
            <div className="text-xs font-semibold text-slate-700">Stage.</div>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
            >
              <option value="all">All.</option>
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}.
                </option>
              ))}
            </select>
          </div>
        </CardShell>

        <CardShell>
          <div className="p-4">
            <div className="text-xs font-semibold text-slate-700">Status.</div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
            >
              <option value="all">All.</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}.
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
          <div className="text-xs text-slate-600">Click title to open details.</div>
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

                    <td className="px-4 py-4 text-slate-700">{(o.contact?.name ?? `#${o.contactId}`) + "."}</td>
                    <td className="px-4 py-4 text-slate-700">{(o.clientCompany?.name ?? "-") + "."}</td>

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

                    <td className="px-4 py-4 text-slate-700">{Math.round(Number(o.probability) * 100)}%.</td>
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
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold transition disabled:opacity-50"
          >
            Prev.
          </button>

          <div className="text-xs text-slate-600">
            Showing {rows.length} of {total}.
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

      {/* Create modal. */}
      {showCreate ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => (creating ? null : setShowCreate(false))} />

          <div className="absolute left-1/2 top-1/2 w-[95%] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <div className="text-sm font-semibold text-slate-900">New opportunity.</div>
                <div className="text-xs text-slate-600">POST /api/opportunities.</div>
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
              {picklistsError ? (
                <div className="md:col-span-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                  {picklistsError}.
                </div>
              ) : null}

              <Field label="Freelancer (team)">
                <select
                  value={String(createForm.freelanceConsultantId || "")}
                  onChange={(e) => onCreateFreelancerChange(Number(e.target.value || 0))}
                  disabled={picklistsLoading || teamFreelancers.length === 0}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 disabled:opacity-50"
                >
                  <option value="">{picklistsLoading ? "Loading..." : "Select freelancer."}</option>
                  {teamFreelancers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}.
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">Biraš freelancera iz svog tima.</p>
              </Field>

              <Field label="Contact">
                <select
                  value={String(createForm.contactId || "")}
                  onChange={(e) => onCreateContactChange(Number(e.target.value || 0))}
                  disabled={!createForm.freelanceConsultantId || picklistsLoading}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 disabled:opacity-50"
                >
                  <option value="">
                    {!createForm.freelanceConsultantId ? "Select freelancer first." : "Select contact."}
                  </option>
                  {filteredContacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.clientCompany?.name ?? `Company #${c.clientCompanyId}`}).
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">Kontakti se filtriraju po izabranom freelancer-u.</p>
              </Field>

              <Field label="Client company (optional)">
                <select
                  value={createForm.clientCompanyId === null ? "" : String(createForm.clientCompanyId)}
                  onChange={(e) =>
                    setCreateForm((f) => ({
                      ...f,
                      clientCompanyId: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                  disabled={picklistsLoading || !createForm.freelanceConsultantId}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 disabled:opacity-50"
                >
                  <option value="">None.</option>
                  {filteredCompanies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}.
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  Auto se postavi iz kontakta:{" "}
                  {selectedContact ? (selectedContact.clientCompany?.name ?? `#${selectedContact.clientCompanyId}`) + "." : "-"}.
                </p>
              </Field>

              <Field label="Title">
                <input
                  value={createForm.title}
                  onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                />
              </Field>

              <Field label="Stage">
                <select
                  value={createForm.stage}
                  onChange={(e) => setCreateForm((f) => ({ ...f, stage: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
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
                  value={createForm.status}
                  onChange={(e) => setCreateForm((f) => ({ ...f, status: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}.
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Estimated value">
                <input
                  value={String(createForm.estimatedValue)}
                  onChange={(e) => setCreateForm((f) => ({ ...f, estimatedValue: Number(e.target.value) }))}
                  type="number"
                  min={0}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                />
              </Field>

              <Field label="Currency">
                <input
                  value={createForm.currency}
                  onChange={(e) => setCreateForm((f) => ({ ...f, currency: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                />
              </Field>

              <Field label="Probability (0..1)">
                <input
                  value={String(createForm.probability)}
                  onChange={(e) => setCreateForm((f) => ({ ...f, probability: Number(e.target.value) }))}
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                />
              </Field>

              <Field label="Expected close date (optional)">
                <input
                  value={createForm.expectedCloseDate}
                  onChange={(e) => setCreateForm((f) => ({ ...f, expectedCloseDate: e.target.value }))}
                  type="date"
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                />
              </Field>

              <div className="md:col-span-2">
                <Field label="Description (optional)">
                  <textarea
                    value={createForm.description}
                    onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                    rows={4}
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                  />
                </Field>
              </div>
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
                onClick={createOpportunity}
                disabled={creating}
                className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create."}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Details drawer. */}
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
                    {(details.contact?.name ?? `Contact #${details.contactId}`) + " · " + (details.clientCompany?.name ?? "No client") + "."}
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
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
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
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
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
                      type="date"
                      value={editForm.expectedCloseDate ? String(editForm.expectedCloseDate) : ""}
                      onChange={(e) => setEditForm((f) => ({ ...f, expectedCloseDate: e.target.value || null }))}
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                    />
                  </Field>

                  <Field label="Client company (optional)">
                    <select
                      value={
                        (editForm.clientCompanyId as any) === null || editForm.clientCompanyId === undefined
                          ? ""
                          : String(editForm.clientCompanyId as any)
                      }
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          clientCompanyId: e.target.value ? Number(e.target.value) : null,
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                    >
                      <option value="">None.</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}.
                        </option>
                      ))}
                    </select>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold text-slate-700">{label}.</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

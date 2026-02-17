"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { Me } from "@/src/client/types/me";
import type { Opportunity } from "@/src/client/types/opportunity";
import type { ClientCompany } from "@/src/client/types/clientCompany";
import type { Activity, ActivityType } from "@/src/client/types/activity";

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

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeListItems<T>(json: any): T[] {
  // Standard list endpoints: { items, total, page, pageSize }.
  if (Array.isArray(json?.items)) return json.items as T[];
  // Some ok() wrappers might return { data: { items: [...] } }.
  if (Array.isArray(json?.data?.items)) return json.data.items as T[];
  // Fallback.
  if (Array.isArray(json)) return json as T[];
  if (Array.isArray(json?.data)) return json.data as T[];
  return [];
}

function normalizeActivities(json: any): Activity[] {
  // /api/activities returns ok(res) where res is Activity[] (most likely).
  if (Array.isArray(json)) return json as Activity[];
  if (Array.isArray(json?.data)) return json.data as Activity[];
  if (Array.isArray(json?.items)) return json.items as Activity[];
  if (Array.isArray(json?.data?.items)) return json.data.items as Activity[];
  return [];
}

function parseIdFromLabel(label: string): number | undefined {
  // Expected format: "... (#123)".
  const m = String(label || "").match(/#(\d+)\)\s*$/);
  if (!m?.[1]) return undefined;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : undefined;
}

const ACTIVITY_TYPES: ActivityType[] = ["note", "call", "meeting"];

function companyLabel(c: ClientCompany) {
  return `${c.name} (#${c.id})`;
}

function opportunityLabel(o: Opportunity) {
  const cc = (o as any)?.clientCompany?.name ? ` — ${(o as any).clientCompany.name}` : "";
  return `${o.title}${cc} (#${o.id})`;
}

async function fetchAllPaged<T>(url: string, pageSize = 50, maxPages = 10): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const qs = buildQuery({ page, pageSize });
    const res = await fetch(`${url}${qs}`, { method: "GET" });
    if (!res.ok) break;

    const json = await res.json();
    const items = normalizeListItems<T>(json);
    out.push(...items);

    if (items.length < pageSize) break;
  }
  return out;
}

export default function FreelancerActivitiesPage() {
  const router = useRouter();

  const [me, setMe] = useState<Me | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Entities.
  const [companies, setCompanies] = useState<ClientCompany[]>([]);
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [entitiesLoading, setEntitiesLoading] = useState(true);
  const [entitiesError, setEntitiesError] = useState<string | null>(null);

  // ClientCompany section selection (combo).
  const [ccPick, setCcPick] = useState<string>("");
  const ccId = useMemo(() => parseIdFromLabel(ccPick), [ccPick]);

  // Opportunity section selection (combo).
  const [oppPick, setOppPick] = useState<string>("");
  const oppId = useMemo(() => parseIdFromLabel(oppPick), [oppPick]);

  // Activities data.
  const [ccActivities, setCcActivities] = useState<Activity[]>([]);
  const [oppActivities, setOppActivities] = useState<Activity[]>([]);
  const [ccLoading, setCcLoading] = useState(true);
  const [oppLoading, setOppLoading] = useState(true);
  const [ccError, setCcError] = useState<string | null>(null);
  const [oppError, setOppError] = useState<string | null>(null);

  // Local search per section.
  const [ccQ, setCcQ] = useState("");
  const [oppQ, setOppQ] = useState("");
  const dCcQ = useDebounce(ccQ, 300);
  const dOppQ = useDebounce(oppQ, 300);

  // Create forms per section.
  const [ccNewType, setCcNewType] = useState<ActivityType>("note");
  const [ccNewDesc, setCcNewDesc] = useState("");
  const [ccCreating, setCcCreating] = useState(false);
  const [ccCreateError, setCcCreateError] = useState<string | null>(null);

  const [oppNewType, setOppNewType] = useState<ActivityType>("note");
  const [oppNewDesc, setOppNewDesc] = useState("");
  const [oppCreating, setOppCreating] = useState(false);
  const [oppCreateError, setOppCreateError] = useState<string | null>(null);

  // Drawer.
  const [open, setOpen] = useState<{ section: "cc" | "opp"; id: string } | null>(null);

  const ccNameById = useMemo(() => {
    const m = new Map<number, string>();
    companies.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [companies]);

  const oppNameById = useMemo(() => {
    const m = new Map<number, string>();
    opps.forEach((o) => m.set(o.id, o.title));
    return m;
  }, [opps]);

  const selectedActivity = useMemo(() => {
    if (!open) return null;
    const list = open.section === "cc" ? ccActivities : oppActivities;
    return list.find((a) => a.id === open.id) ?? null;
  }, [open, ccActivities, oppActivities]);

  // Guard.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.push("/pages/auth/login");
          return;
        }

        const data = (await res.json()) as Me;

        if (!data || data.role !== "freelance_consultant") {
          if ((data as any)?.role) router.push(`/pages/${(data as any).role}/home`);
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

  // Load entities for combo boxes.
  useEffect(() => {
    if (authLoading) return;
    if (!me) return;

    let cancelled = false;

    (async () => {
      setEntitiesLoading(true);
      setEntitiesError(null);

      try {
        const [cc, oo] = await Promise.all([
          fetchAllPaged<ClientCompany>("/api/client-companies", 50, 10),
          fetchAllPaged<Opportunity>("/api/opportunities", 50, 10),
        ]);

        if (!cancelled) {
          setCompanies(Array.isArray(cc) ? cc : []);
          setOpps(Array.isArray(oo) ? oo : []);
        }
      } catch (e: any) {
        if (!cancelled) setEntitiesError(e?.message || "Cannot load entities.");
      } finally {
        if (!cancelled) setEntitiesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, me]);

  async function loadActivitiesForClientCompanies() {
    setCcLoading(true);
    setCcError(null);

    try {
      const qs = buildQuery({
        entityType: "clientCompany",
        entityId: ccId ?? undefined,
      });

      const res = await fetch(`/api/activities${qs}`, { method: "GET" });
      if (!res.ok) throw new Error("Cannot load client company activities.");

      const json = await res.json();
      setCcActivities(normalizeActivities(json));
    } catch (e: any) {
      setCcActivities([]);
      setCcError(e?.message || "Error.");
    } finally {
      setCcLoading(false);
    }
  }

  async function loadActivitiesForOpportunities() {
    setOppLoading(true);
    setOppError(null);

    try {
      const qs = buildQuery({
        entityType: "opportunity",
        entityId: oppId ?? undefined,
      });

      const res = await fetch(`/api/activities${qs}`, { method: "GET" });
      if (!res.ok) throw new Error("Cannot load opportunity activities.");

      const json = await res.json();
      setOppActivities(normalizeActivities(json));
    } catch (e: any) {
      setOppActivities([]);
      setOppError(e?.message || "Error.");
    } finally {
      setOppLoading(false);
    }
  }

  // Load activities for each section (on selection change).
  useEffect(() => {
    if (authLoading) return;
    if (!me) return;
    loadActivitiesForClientCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, me, ccId]);

  useEffect(() => {
    if (authLoading) return;
    if (!me) return;
    loadActivitiesForOpportunities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, me, oppId]);

  async function createActivity(payload: {
    entityType: "clientCompany" | "opportunity";
    entityId: number;
    type: ActivityType;
    description: string;
  }) {
    const res = await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const msg = await res.json().catch(() => null);
      throw new Error(msg?.message || "Create failed.");
    }

    const json = await res.json();
    // ok(created) might return created directly or wrapped.
    const created = (json?.data ?? json) as Activity;
    return created;
  }

  async function onCreateForClientCompany() {
    setCcCreateError(null);

    if (!ccId) {
      setCcCreateError("Izaberi client company iz combo box-a.");
      return;
    }
    if (!ccNewDesc.trim()) {
      setCcCreateError("Opis aktivnosti je obavezan.");
      return;
    }

    setCcCreating(true);
    try {
      const created = await createActivity({
        entityType: "clientCompany",
        entityId: ccId,
        type: ccNewType,
        description: ccNewDesc.trim(),
      });

      setCcActivities((prev) => [created, ...prev]);
      setCcNewDesc("");
    } catch (e: any) {
      setCcCreateError(e?.message || "Error.");
    } finally {
      setCcCreating(false);
    }
  }

  async function onCreateForOpportunity() {
    setOppCreateError(null);

    if (!oppId) {
      setOppCreateError("Izaberi opportunity iz combo box-a.");
      return;
    }
    if (!oppNewDesc.trim()) {
      setOppCreateError("Opis aktivnosti je obavezan.");
      return;
    }

    setOppCreating(true);
    try {
      const created = await createActivity({
        entityType: "opportunity",
        entityId: oppId,
        type: oppNewType,
        description: oppNewDesc.trim(),
      });

      setOppActivities((prev) => [created, ...prev]);
      setOppNewDesc("");
    } catch (e: any) {
      setOppCreateError(e?.message || "Error.");
    } finally {
      setOppCreating(false);
    }
  }

  const ccFiltered = useMemo(() => {
    const qq = dCcQ.trim().toLowerCase();
    if (!qq) return ccActivities;
    return ccActivities.filter((a) => (a.description || "").toLowerCase().includes(qq));
  }, [ccActivities, dCcQ]);

  const oppFiltered = useMemo(() => {
    const qq = dOppQ.trim().toLowerCase();
    if (!qq) return oppActivities;
    return oppActivities.filter((a) => (a.description || "").toLowerCase().includes(qq));
  }, [oppActivities, dOppQ]);

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
          <h1 className="text-2xl font-semibold text-slate-900">My activities.</h1>
          <p className="mt-1 text-sm text-slate-600">
            Activities are grouped by entity type, with a name-based combo box for entity selection.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">{me?.name}.</div>
          <div className="text-xs text-slate-600">Freelance consultant.</div>
        </div>
      </header>

      {entitiesError ? <div className="mt-4 text-sm text-rose-700">{entitiesError}</div> : null}

      {/* SECTION 1: ClientCompany */}
      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Client company activities.</h2>
            <p className="text-sm text-slate-600">Entity type is fixed to clientCompany.</p>
          </div>

          <button
            type="button"
            onClick={() => loadActivitiesForClientCompanies()}
            disabled={ccLoading}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold transition disabled:opacity-50"
          >
            Refresh.
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-6">
          <div className="md:col-span-3">
            <label className="text-xs font-semibold text-slate-700">Client company (combo box).</label>
            <input
              value={ccPick}
              onChange={(e) => setCcPick(e.target.value)}
              list="cc-datalist"
              placeholder={entitiesLoading ? "Loading..." : "Start typing and pick a company."}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
            <datalist id="cc-datalist">
              {companies.map((c) => (
                <option key={c.id} value={companyLabel(c)} />
              ))}
            </datalist>
            <div className="mt-1 text-xs text-slate-500">
              Pick format is “Name (#id)”. Clear input to see all clientCompany activities.
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-700">Search (description).</label>
            <input
              value={ccQ}
              onChange={(e) => setCcQ(e.target.value)}
              placeholder="Search in notes."
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
          </div>

          <div className="md:col-span-1">
            <label className="text-xs font-semibold text-slate-700">Results.</label>
            <div className="mt-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {ccLoading ? "…" : ccFiltered.length}.
            </div>
          </div>
        </div>

        {/* Create */}
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-semibold text-slate-900">Log an activity for selected client company.</div>

          <div className="mt-3 grid gap-3 md:grid-cols-6">
            <div>
              <label className="text-xs font-semibold text-slate-700">Type.</label>
              <select
                value={ccNewType}
                onChange={(e) => setCcNewType(e.target.value as ActivityType)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
              >
                {ACTIVITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}.
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-4">
              <label className="text-xs font-semibold text-slate-700">Description.</label>
              <input
                value={ccNewDesc}
                onChange={(e) => setCcNewDesc(e.target.value)}
                placeholder="Write a note, call summary, or meeting outcome."
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={onCreateForClientCompany}
                disabled={ccCreating}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold transition disabled:opacity-50"
              >
                {ccCreating ? "Saving." : "Save."}
              </button>
            </div>
          </div>

          {ccCreateError ? <div className="mt-3 text-sm text-rose-700">{ccCreateError}</div> : null}
        </div>

        {/* List */}
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {ccError ? <div className="px-4 py-4 text-sm text-rose-700">{ccError}</div> : null}

          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-semibold text-slate-700">
                  <th className="px-4 py-3">Created.</th>
                  <th className="px-4 py-3">Type.</th>
                  <th className="px-4 py-3">Client company.</th>
                  <th className="px-4 py-3">Description.</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {ccLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-4">
                        <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 w-56 animate-pulse rounded bg-slate-200" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 w-96 animate-pulse rounded bg-slate-200" />
                      </td>
                    </tr>
                  ))
                ) : ccFiltered.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-sm text-slate-600" colSpan={4}>
                      No activities.
                    </td>
                  </tr>
                ) : (
                  ccFiltered.map((a) => (
                    <tr key={a.id} className="text-sm text-slate-900">
                      <td className="px-4 py-4 font-semibold">{formatDateTime(a.createdAt) + "."}</td>
                      <td className="px-4 py-4 text-slate-700">{a.type + "."}</td>
                      <td className="px-4 py-4 text-slate-700">
                        {ccId
                          ? (ccNameById.get(ccId) || `#${ccId}`) + "."
                          : (ccNameById.get(a.entityId) || `#${a.entityId}`) + "."}
                      </td>
                      <td
                        className="px-4 py-4 text-slate-700 cursor-pointer hover:underline"
                        onClick={() => setOpen({ section: "cc", id: a.id })}
                        title="Open details."
                      >
                        {(a.description || "-") + "."}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SECTION 2: Opportunity */}
      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Opportunity activities.</h2>
            <p className="text-sm text-slate-600">Entity type is fixed to opportunity.</p>
          </div>

          <button
            type="button"
            onClick={() => loadActivitiesForOpportunities()}
            disabled={oppLoading}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold transition disabled:opacity-50"
          >
            Refresh.
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-6">
          <div className="md:col-span-3">
            <label className="text-xs font-semibold text-slate-700">Opportunity (combo box).</label>
            <input
              value={oppPick}
              onChange={(e) => setOppPick(e.target.value)}
              list="opp-datalist"
              placeholder={entitiesLoading ? "Loading..." : "Start typing and pick an opportunity."}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
            <datalist id="opp-datalist">
              {opps.map((o) => (
                <option key={o.id} value={opportunityLabel(o)} />
              ))}
            </datalist>
            <div className="mt-1 text-xs text-slate-500">
              Pick format is “Title — Client (#id)”. Clear input to see all opportunity activities.
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-700">Search (description).</label>
            <input
              value={oppQ}
              onChange={(e) => setOppQ(e.target.value)}
              placeholder="Search in notes."
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
          </div>

          <div className="md:col-span-1">
            <label className="text-xs font-semibold text-slate-700">Results.</label>
            <div className="mt-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {oppLoading ? "…" : oppFiltered.length}.
            </div>
          </div>
        </div>

        {/* Create */}
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-semibold text-slate-900">Log an activity for selected opportunity.</div>

          <div className="mt-3 grid gap-3 md:grid-cols-6">
            <div>
              <label className="text-xs font-semibold text-slate-700">Type.</label>
              <select
                value={oppNewType}
                onChange={(e) => setOppNewType(e.target.value as ActivityType)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
              >
                {ACTIVITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}.
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-4">
              <label className="text-xs font-semibold text-slate-700">Description.</label>
              <input
                value={oppNewDesc}
                onChange={(e) => setOppNewDesc(e.target.value)}
                placeholder="Write a note, call summary, or meeting outcome."
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={onCreateForOpportunity}
                disabled={oppCreating}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold transition disabled:opacity-50"
              >
                {oppCreating ? "Saving." : "Save."}
              </button>
            </div>
          </div>

          {oppCreateError ? <div className="mt-3 text-sm text-rose-700">{oppCreateError}</div> : null}
        </div>

        {/* List */}
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {oppError ? <div className="px-4 py-4 text-sm text-rose-700">{oppError}</div> : null}

          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-semibold text-slate-700">
                  <th className="px-4 py-3">Created.</th>
                  <th className="px-4 py-3">Type.</th>
                  <th className="px-4 py-3">Opportunity.</th>
                  <th className="px-4 py-3">Description.</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {oppLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-4">
                        <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 w-56 animate-pulse rounded bg-slate-200" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 w-96 animate-pulse rounded bg-slate-200" />
                      </td>
                    </tr>
                  ))
                ) : oppFiltered.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-sm text-slate-600" colSpan={4}>
                      No activities.
                    </td>
                  </tr>
                ) : (
                  oppFiltered.map((a) => (
                    <tr key={a.id} className="text-sm text-slate-900">
                      <td className="px-4 py-4 font-semibold">{formatDateTime(a.createdAt) + "."}</td>
                      <td className="px-4 py-4 text-slate-700">{a.type + "."}</td>
                      <td className="px-4 py-4 text-slate-700">
                        {oppId
                          ? (oppNameById.get(oppId) || `#${oppId}`) + "."
                          : (oppNameById.get(a.entityId) || `#${a.entityId}`) + "."}
                      </td>
                      <td
                        className="px-4 py-4 text-slate-700 cursor-pointer hover:underline"
                        onClick={() => setOpen({ section: "opp", id: a.id })}
                        title="Open details."
                      >
                        {(a.description || "-") + "."}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Drawer */}
      {open ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(null)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <div className="text-sm font-semibold text-slate-900">Activity details.</div>
                <div className="text-xs text-slate-600">
                  Section: {open.section === "cc" ? "Client company." : "Opportunity."}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(null)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold"
              >
                Close.
              </button>
            </div>

            {selectedActivity ? (
              <div className="px-5 py-5">
                <h3 className="text-xl font-semibold text-slate-900">{selectedActivity.type + "."}</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {formatDateTime(selectedActivity.createdAt)} ·{" "}
                  {selectedActivity.entityType === "clientCompany"
                    ? (ccNameById.get(selectedActivity.entityId) || `ClientCompany #${selectedActivity.entityId}`)
                    : (oppNameById.get(selectedActivity.entityId) || `Opportunity #${selectedActivity.entityId}`)}
                  .
                </p>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800">
                  {(selectedActivity.description || "-") + "."}
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-semibold text-slate-700">Entity ID.</div>
                    <div className="mt-1 text-slate-900">{String(selectedActivity.entityId) + "."}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-semibold text-slate-700">ID.</div>
                    <div className="mt-1 break-all text-slate-900">{selectedActivity.id + "."}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-5 py-6 text-sm text-slate-600">Not found.</div>
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}

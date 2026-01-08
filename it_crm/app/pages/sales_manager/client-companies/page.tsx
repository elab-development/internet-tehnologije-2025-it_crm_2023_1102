"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { Me } from "@/src/client/types/me";
import type { ClientCategory } from "@/src/client/types/clientCategory";
import type { ClientCompany } from "@/src/client/types/clientCompany";

type ClientCompanyStatus = "lead" | "active" | "inactive" | "paused";
type StatusFilter = "all" | ClientCompanyStatus;

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

function CardShell({ children }: { children: React.ReactNode }) {
  return <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">{children}</div>;
}

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All." },
  { value: "lead", label: "Lead." },
  { value: "active", label: "Active." },
  { value: "inactive", label: "Inactive." },
  { value: "paused", label: "Paused." },
];

export default function SalesManagerClientCompaniesPage() {
  const router = useRouter();
  const PAGE_SIZE = 5;

  const [me, setMe] = useState<Me | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [categories, setCategories] = useState<ClientCategory[]>([]);
  const [rows, setRows] = useState<ClientCompany[]>([]);
  const [total, setTotal] = useState(0);

  const [page, setPage] = useState(1);

  const [q, setQ] = useState("");
  const dq = useDebounce(q, 350);

  const [city, setCity] = useState("");
  const dCity = useDebounce(city, 350);

  const [status, setStatus] = useState<StatusFilter>("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const totalPages = useMemo(() => {
    const tp = Math.ceil(total / PAGE_SIZE);
    return tp <= 0 ? 1 : tp;
  }, [total]);

  // Drawer.
  const [openId, setOpenId] = useState<number | null>(null);
  const [details, setDetails] = useState<ClientCompany | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  // Create modal.
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const [createForm, setCreateForm] = useState({
    name: "",
    industry: "",
    companySize: "",
    website: "",
    country: "",
    city: "",
    address: "",
    status: "active" as ClientCompanyStatus,
    categoryId: 0,
    freelanceConsultantId: 0,
  });

  // Edit form in drawer.
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<Partial<ClientCompany>>({});

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

  // Categories.
  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/client-categories", { method: "GET" });
        if (!res.ok) return;

        const json = await res.json();
        const items = unwrap<ClientCategory[]>(json);

        if (!cancelled) {
          const safe = Array.isArray(items) ? items : [];
          setCategories(safe);

          const firstId = safe.length > 0 ? safe[0].id : 0;
          setCreateForm((f) => ({ ...f, categoryId: firstId }));
        }
      } catch {
        // ignore.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading]);

  // Reset pagination on filters.
  useEffect(() => {
    setPage(1);
  }, [dq, dCity, status]);

  async function fetchList(targetPage: number) {
    const qs = buildQuery({
      page: targetPage,
      pageSize: PAGE_SIZE,
      q: dq || undefined,
      city: dCity || undefined,
      status: status === "all" ? undefined : status,
    });

    const res = await fetch(`/api/client-companies${qs}`, { method: "GET" });
    if (!res.ok) {
      const msg = await res.json().catch(() => null);
      throw new Error(msg?.message || "Ne mogu da učitam klijentske kompanije.");
    }

    const json = await res.json();
    const data = unwrap<{ items: ClientCompany[]; total: number }>(json);

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
  }, [authLoading, me, page, dq, dCity, status]);

  // Details fetch: GET /api/client-companies/[id].
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
        console.log("Fetching details for ID:", openId);
        const res = await fetch(`/api/client-companies/${openId}`, { method: "GET" });
        if (!res.ok) {
          const msg = await res.json().catch(() => null);
          throw new Error(msg?.message || "Ne mogu da učitam detalje klijenta.");
        }

        const json = await res.json();
        const company = unwrap<ClientCompany>(json);

        if (!cancelled) {
          setDetails(company);
          setEditForm({
            name: company?.name,
            industry: company?.industry,
            companySize: company?.companySize,
            website: company?.website ?? "",
            country: company?.country,
            city: company?.city,
            address: company?.address,
            status: company?.status,
            categoryId: company?.categoryId,
            freelanceConsultantId: company?.freelanceConsultantId,
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

  async function createClientCompany() {
    if (!me) return;

    setCreating(true);
    try {
      const res = await fetch("/api/client-companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createForm,
          website: createForm.website?.trim() ? createForm.website.trim() : null,
          categoryId: Number(createForm.categoryId),
          salesManagerId: me.id,
          freelanceConsultantId: Number(createForm.freelanceConsultantId),
        }),
      });

      if (!res.ok) {
        const msg = await res.json().catch(() => null);
        throw new Error(msg?.message || "Kreiranje nije uspelo.");
      }

      setShowCreate(false);
      setCreateForm((f) => ({ ...f, name: "", website: "", city: "", address: "" }));

      setPage(1);
      await fetchList(1);
    } catch (e: any) {
      alert(e?.message || "Greška.");
    } finally {
      setCreating(false);
    }
  }

  // PATCH: /api/client-companies/[id].
  async function saveEdits() {
    if (!openId) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/client-companies/${openId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          website: (editForm.website as any)?.trim ? (String(editForm.website).trim() || null) : editForm.website,
          categoryId: editForm.categoryId !== undefined ? Number(editForm.categoryId) : undefined,
          freelanceConsultantId:
            editForm.freelanceConsultantId !== undefined ? Number(editForm.freelanceConsultantId) : undefined,
          status: editForm.status as ClientCompanyStatus | undefined,
        }),
      });

      if (!res.ok) {
        const msg = await res.json().catch(() => null);
        throw new Error(msg?.message || "Izmena nije uspela.");
      }

      const json = await res.json();
      const updated = unwrap<ClientCompany>(json);

      setDetails(updated);
      await fetchList(page);
    } catch (e: any) {
      alert(e?.message || "Greška.");
    } finally {
      setSaving(false);
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
            <h1 className="text-2xl font-semibold text-slate-900">Client companies.</h1>
            <p className="mt-1 text-sm text-slate-700">Upravljanje klijentima tima (pretraga, filteri, detalji, izmena).</p>
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
          <div className="text-xs text-slate-600">Click row to open details.</div>
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
                    Nema rezultata.
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
                  <option value="lead">lead.</option>
                  <option value="active">active.</option>
                  <option value="inactive">inactive.</option>
                  <option value="paused">paused.</option>
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

              <Field label="Freelancer consultant ID">
                <input
                  value={createForm.freelanceConsultantId ? String(createForm.freelanceConsultantId) : ""}
                  onChange={(e) => setCreateForm((f) => ({ ...f, freelanceConsultantId: Number(e.target.value || 0) }))}
                  placeholder="Unesi ID freelancera iz tvog tima."
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Backend proverava da freelancer postoji, da je aktivan i da pripada tvom timu.
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
                        <option value="lead">lead.</option>
                        <option value="active">active.</option>
                        <option value="inactive">inactive.</option>
                        <option value="paused">paused.</option>
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

                  <Field label="Freelancer consultant ID">
                    <input
                      value={String(editForm.freelanceConsultantId ?? details.freelanceConsultantId)}
                      onChange={(e) => setEditForm((f) => ({ ...f, freelanceConsultantId: Number(e.target.value || 0) }))}
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Backend validira da freelancer pripada tvom timu (managerId).
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold text-slate-700">{label}.</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { Me } from "@/src/client/types/me";

type TeamMetrics = {
  totalOpportunities: number;
  opportunitiesByStage: Record<string, number>;
  wonDeals: number;
  totalEstimatedValue: number;
};

const STAGE_ORDER = ["prospecting", "discovery", "proposal", "negotiation", "won", "lost"] as const;

// Ako ti je API ruta drugačija, promeni ovde.
// U tvom route.ts GET prima query parametre: from, to.
const METRICS_API_PRIMARY = "/api/metrics/team";
const METRICS_API_FALLBACK = "/api/metrics";

let __googleChartsPromise: Promise<void> | null = null;

function loadGoogleCharts(): Promise<void> {
  if (__googleChartsPromise) return __googleChartsPromise;

  __googleChartsPromise = new Promise((resolve, reject) => {
    const w = window as any;

    // Ako je već učitano.
    if (w.google?.charts && w.google?.visualization) {
      try {
        w.google.charts.load("current", { packages: ["corechart"] });
        w.google.charts.setOnLoadCallback(() => resolve());
      } catch (e) {
        reject(e);
      }
      return;
    }

    // Ako script već postoji.
    const existing = document.querySelector('script[data-google-charts="1"]') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => {
        try {
          w.google.charts.load("current", { packages: ["corechart"] });
          w.google.charts.setOnLoadCallback(() => resolve());
        } catch (e) {
          reject(e);
        }
      });
      existing.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://www.gstatic.com/charts/loader.js";
    script.async = true;
    script.setAttribute("data-google-charts", "1");

    script.onload = () => {
      try {
        w.google.charts.load("current", { packages: ["corechart"] });
        w.google.charts.setOnLoadCallback(() => resolve());
      } catch (e) {
        reject(e);
      }
    };

    script.onerror = reject;

    document.head.appendChild(script);
  });

  return __googleChartsPromise;
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

export default function SalesManagerTeamMetricsPage() {
  const router = useRouter();

  const [me, setMe] = useState<Me | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const [metrics, setMetrics] = useState<TeamMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const barRef = useRef<HTMLDivElement | null>(null);
  const pieRef = useRef<HTMLDivElement | null>(null);

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

        if (!data || (data.role !== "sales_manager" && data.role !== "admin")) {
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

  async function fetchMetrics() {
    const qs = buildQuery({
      from: from || undefined,
      to: to || undefined,
    });

    // Probaj primary, pa fallback (da ne puca ako je ruta drugačija).
    const tryFetch = async (url: string) => {
      const res = await fetch(`${url}${qs}`, { method: "GET" });
      if (!res.ok) {
        const msg = await res.json().catch(() => null);
        throw new Error(msg?.message || "Ne mogu da učitam metrike.");
      }
      const json = await res.json();
      return unwrap<TeamMetrics>(json);
    };

    try {
      return await tryFetch(METRICS_API_PRIMARY);
    } catch {
      return await tryFetch(METRICS_API_FALLBACK);
    }
  }

  // Initial + on filter change (manual apply button below, but we also load once).
  useEffect(() => {
    if (authLoading) return;
    if (!me) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchMetrics();
        if (!cancelled) setMetrics(data);
      } catch (e: any) {
        if (!cancelled) {
          setMetrics(null);
          setError(e?.message || "Došlo je do greške.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, me]);

  const orderedStages = useMemo(() => {
    const m = metrics?.opportunitiesByStage ?? {};
    const keys = Object.keys(m);

    const known = STAGE_ORDER.filter((s) => keys.includes(s));
    const unknown = keys.filter((k) => !known.includes(k as any)).sort();

    return [...known, ...unknown].map((k) => ({
      stage: k,
      count: Number(m[k] ?? 0),
    }));
  }, [metrics]);

  function drawCharts() {
    if (!metrics) return;
    if (!barRef.current || !pieRef.current) return;

    const w = window as any;
    if (!w.google?.visualization) return;

    const rows = orderedStages.map((x) => [x.stage, x.count]);
    const barData = w.google.visualization.arrayToDataTable([
      ["Stage", "Opportunities"],
      ...rows,
    ]);

    const pieData = w.google.visualization.arrayToDataTable([
      ["Stage", "Opportunities"],
      ...rows,
    ]);

    const barOptions = {
      title: "Opportunities by stage.",
      legend: { position: "none" },
      height: 340,
      chartArea: { left: 50, top: 60, right: 20, bottom: 60 },
      hAxis: { slantedText: true, slantedTextAngle: 35 },
      vAxis: { minValue: 0 },
    };

    const pieOptions = {
      title: "Stage distribution.",
      height: 340,
      chartArea: { left: 20, top: 60, right: 20, bottom: 20 },
      legend: { position: "right" },
      pieHole: 0.35,
    };

    const barChart = new w.google.visualization.ColumnChart(barRef.current);
    barChart.draw(barData, barOptions);

    const pieChart = new w.google.visualization.PieChart(pieRef.current);
    pieChart.draw(pieData, pieOptions);
  }

  // Load Google Charts + draw when metrics changes.
  useEffect(() => {
    if (!metrics) return;

    let alive = true;

    (async () => {
      try {
        await loadGoogleCharts();
        if (!alive) return;
        drawCharts();
      } catch {
        // Ako google charts ne može da se učita, samo ostavi bez grafika.
      }
    })();

    const onResize = () => drawCharts();
    window.addEventListener("resize", onResize);

    return () => {
      alive = false;
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metrics, orderedStages]);

  async function onApply() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMetrics();
      setMetrics(data);
    } catch (e: any) {
      setMetrics(null);
      setError(e?.message || "Došlo je do greške.");
    } finally {
      setLoading(false);
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
            <h1 className="text-2xl font-semibold text-slate-900">Team metrics.</h1>
            <p className="mt-1 text-sm text-slate-700">Prikaz metrika tima preko Google Charts grafika.</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 backdrop-blur">
            <div className="text-sm font-semibold text-slate-900">{me?.name}.</div>
            <div className="text-xs text-slate-600">{me?.role === "admin" ? "Admin." : "Sales menadžer."}</div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="md:col-span-1">
            <div className="text-xs font-semibold text-slate-700">From.</div>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
          </div>

          <div className="md:col-span-1">
            <div className="text-xs font-semibold text-slate-700">To.</div>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
          </div>

          <div className="md:col-span-2 flex items-end justify-end">
            <button
              type="button"
              onClick={onApply}
              disabled={loading}
              className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition disabled:opacity-50 md:w-auto"
            >
              {loading ? "Loading..." : "Apply filter."}
            </button>
          </div>
        </div>
      </div>

      {error ? <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <CardShell>
          <div className="p-4">
            <div className="text-xs font-semibold text-slate-700">Total opportunities.</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">{metrics?.totalOpportunities ?? 0}.</div>
          </div>
        </CardShell>

        <CardShell>
          <div className="p-4">
            <div className="text-xs font-semibold text-slate-700">Won deals.</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">{metrics?.wonDeals ?? 0}.</div>
          </div>
        </CardShell>

        <CardShell>
          <div className="p-4">
            <div className="text-xs font-semibold text-slate-700">Total estimated value.</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              {Number(metrics?.totalEstimatedValue ?? 0).toLocaleString()}.
            </div>
          </div>
        </CardShell>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">Bar chart.</div>
          <div className="mt-2 text-xs text-slate-600">Opportunities po fazama.</div>
          <div className="mt-3 min-h-[340px]" ref={barRef} />
          {!metrics && !loading ? <div className="mt-3 text-sm text-slate-600">Nema podataka.</div> : null}
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">Pie chart.</div>
          <div className="mt-2 text-xs text-slate-600">Distribucija faza.</div>
          <div className="mt-3 min-h-[340px]" ref={pieRef} />
          {!metrics && !loading ? <div className="mt-3 text-sm text-slate-600">Nema podataka.</div> : null}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <div className="text-sm font-semibold text-slate-900">Breakdown.</div>
          <div className="text-xs text-slate-600">Lista opportunity-ja po fazi.</div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[520px]">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold text-slate-700">
                <th className="px-4 py-3">Stage.</th>
                <th className="px-4 py-3">Count.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-4"><div className="h-4 w-40 animate-pulse rounded bg-slate-200" /></td>
                    <td className="px-4 py-4"><div className="h-4 w-16 animate-pulse rounded bg-slate-200" /></td>
                  </tr>
                ))
              ) : !metrics ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-600" colSpan={2}>
                    Nema podataka.
                  </td>
                </tr>
              ) : orderedStages.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-600" colSpan={2}>
                    Nema rezultata.
                  </td>
                </tr>
              ) : (
                orderedStages.map((x) => (
                  <tr key={x.stage} className="text-sm text-slate-900">
                    <td className="px-4 py-4 font-semibold">{x.stage}.</td>
                    <td className="px-4 py-4 text-slate-700">{x.count}.</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

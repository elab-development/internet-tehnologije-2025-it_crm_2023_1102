// app/pages/industry-competitors/page.tsx (prilagodi putanju po potrebi)

import React, { Suspense } from "react";

export const runtime = "nodejs";
export const revalidate = 300;

type StockRow = {
  name: string;
  symbol: string;
  price: number | null;
  change: number | null;
  changePercent: string | null;
  latestTradingDay: string | null;
  error?: "RATE_LIMIT" | "NO_DATA" | "INVALID_SYMBOL";
};

type PexelsPhoto = {
  id: number;
  alt: string;
  url: string;
  photographer: string;
  photographer_url: string;
  src: {
    large: string;
    landscape: string;
  };
};

const COMPETITORS: Array<{ name: string; symbol: string }> = [
  { name: "Apple", symbol: "AAPL" },
  { name: "Microsoft", symbol: "MSFT" },
  { name: "NVIDIA", symbol: "NVDA" },
  { name: "Google", symbol: "GOOGL" },
  { name: "Amazon", symbol: "AMZN" },
];

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function nfmt(v: number | null, opts?: Intl.NumberFormatOptions) {
  if (v === null || Number.isNaN(v)) return "-";
  return new Intl.NumberFormat("en-US", opts).format(v);
}

async function fetchAlphaVantageQuote(symbol: string, apiKey: string): Promise<Omit<StockRow, "name">> {
  const url =
    `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}` +
    `&apikey=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, { next: { revalidate: 60 } });
  const json = await res.json().catch(() => ({} as any));

  if (json?.Note) {
    return { symbol, price: null, change: null, changePercent: null, latestTradingDay: null, error: "RATE_LIMIT" };
  }

  if (json?.["Error Message"]) {
    return { symbol, price: null, change: null, changePercent: null, latestTradingDay: null, error: "INVALID_SYMBOL" };
  }

  const gq = json?.["Global Quote"];
  if (!gq || typeof gq !== "object") {
    return { symbol, price: null, change: null, changePercent: null, latestTradingDay: null, error: "NO_DATA" };
  }

  const price = Number(gq?.["05. price"]);
  const change = Number(gq?.["09. change"]);
  const changePercent =
    typeof gq?.["10. change percent"] === "string" ? (gq["10. change percent"] as string) : null;
  const latestTradingDay =
    typeof gq?.["07. latest trading day"] === "string" ? (gq["07. latest trading day"] as string) : null;

  return {
    symbol,
    price: Number.isFinite(price) ? price : null,
    change: Number.isFinite(change) ? change : null,
    changePercent,
    latestTradingDay,
  };
}

async function fetchPexelsITPhotos(apiKey: string): Promise<PexelsPhoto[]> {
  const query = "technology office software developer laptop";
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=10&orientation=landscape`;

  const res = await fetch(url, {
    headers: { Authorization: apiKey },
    next: { revalidate: 86400 },
  });

  if (!res.ok) return [];

  const json = (await res.json()) as any;
  const photos = Array.isArray(json?.photos) ? (json.photos as PexelsPhoto[]) : [];
  return photos;
}

function CardShell({ children }: { children: React.ReactNode }) {
  return <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">{children}</div>;
}

function StockRowSkeleton({ name, symbol }: { name: string; symbol: string }) {
  return (
    <tr className="text-sm text-slate-900">
      <td className="px-4 py-4 font-semibold">{name}.</td>
      <td className="px-4 py-4 text-slate-700">{symbol}.</td>
      <td className="px-4 py-4"><div className="h-4 w-24 animate-pulse rounded bg-slate-200" /></td>
      <td className="px-4 py-4"><div className="h-6 w-16 animate-pulse rounded-full bg-slate-200" /></td>
      <td className="px-4 py-4"><div className="h-4 w-20 animate-pulse rounded bg-slate-200" /></td>
      <td className="px-4 py-4"><div className="h-4 w-28 animate-pulse rounded bg-slate-200" /></td>
    </tr>
  );
}

async function StockRowServer({
  index,
  name,
  symbol,
  apiKey,
}: {
  index: number;
  name: string;
  symbol: string;
  apiKey: string;
}) {
  // ~13s razmaka = bezbedno za free limit (5/min).
  await sleep(index * 15000);

  const q = await fetchAlphaVantageQuote(symbol, apiKey);
  const row: StockRow = { name, ...q };

  const isUp = (row.change ?? 0) > 0;
  const isDown = (row.change ?? 0) < 0;

  const badgeClass =
    row.error === "RATE_LIMIT"
      ? "bg-amber-50 text-amber-800"
      : row.error
        ? "bg-slate-100 text-slate-700"
        : isUp
          ? "bg-emerald-50 text-emerald-700"
          : isDown
            ? "bg-rose-50 text-rose-700"
            : "bg-slate-100 text-slate-700";

  const badgeText =
    row.error === "RATE_LIMIT"
      ? "Rate-limited."
      : row.error === "INVALID_SYMBOL"
        ? "Invalid symbol."
        : row.error === "NO_DATA"
          ? "No data."
          : row.change === null
            ? "-"
            : nfmt(row.change, { maximumFractionDigits: 2 }) + ".";

  return (
    <tr className="text-sm text-slate-900">
      <td className="px-4 py-4 font-semibold">{row.name}.</td>
      <td className="px-4 py-4 text-slate-700">{row.symbol}.</td>
      <td className="px-4 py-4 text-slate-700">${row.price === null ? "-" : `${nfmt(row.price, { maximumFractionDigits: 2 })}` }.</td>
      <td className="px-4 py-4">
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}>{badgeText}</span>
      </td>
      <td className="px-4 py-4 text-slate-700">{row.changePercent ? `${row.changePercent}.` : "-"} </td>
      <td className="px-4 py-4 text-slate-700">{row.latestTradingDay ? `${row.latestTradingDay}.` : "-"} </td>
    </tr>
  );
}

export default async function IndustryCompetitorsPage() {
  const pexelsKey = process.env.PEXELS_API_KEY ?? "";
  const alphaKey = process.env.ALPHA_VANTAGE_API_KEY ?? "";

  const photos = pexelsKey ? await fetchPexelsITPhotos(pexelsKey) : [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-cyan-50 via-fuchsia-50 to-yellow-50 p-6 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Industry competitors.</h1>
            <p className="mt-1 text-sm text-slate-700">Cene deonica najvećih IT kompanija + IT slider (Pexels).</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-xs text-slate-700 backdrop-blur">
            <div className="font-semibold text-slate-900">ENV keys.</div>
            <div className="mt-1">
              PEXELS_API_KEY: <span className={pexelsKey ? "text-emerald-700" : "text-rose-700"}>{pexelsKey ? "OK" : "MISSING"}</span>.
            </div>
            <div>
              ALPHA_VANTAGE_API_KEY:{" "}
              <span className={alphaKey ? "text-emerald-700" : "text-rose-700"}>{alphaKey ? "OK" : "MISSING"}</span>.
            </div>
          </div>
        </div>

        {(!pexelsKey || !alphaKey) ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            Nedostaju API ključevi u <code className="rounded bg-white px-1">.env</code> fajlu. Dodaj{" "}
            <code className="rounded bg-white px-1">PEXELS_API_KEY</code> i{" "}
            <code className="rounded bg-white px-1">ALPHA_VANTAGE_API_KEY</code>.
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white/70 p-4 text-sm text-slate-700">
            Deonice se učitavaju namerno sporije (oko 13s razmaka) da ne bismo udarili Alpha Vantage limit.
          </div>
        )}
      </div>

      {/* Stocks */}
      <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="text-sm font-semibold text-slate-900">Stock prices.</div>
          <div className="text-xs text-slate-600">Source: Alpha Vantage (GLOBAL_QUOTE).</div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold text-slate-700">
                <th className="px-4 py-3">Company.</th>
                <th className="px-4 py-3">Ticker.</th>
                <th className="px-4 py-3">Price.</th>
                <th className="px-4 py-3">Change.</th>
                <th className="px-4 py-3">Change %.</th>
                <th className="px-4 py-3">Latest trading day.</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {!alphaKey ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-600" colSpan={6}>
                    Nema podataka, jer <code className="rounded bg-slate-100 px-1">ALPHA_VANTAGE_API_KEY</code> nije podešen.
                  </td>
                </tr>
              ) : (
                COMPETITORS.map((c, idx) => (
                  <Suspense key={c.symbol} fallback={<StockRowSkeleton name={c.name} symbol={c.symbol} />}>
                    <StockRowServer index={idx} name={c.name} symbol={c.symbol} apiKey={alphaKey} />
                  </Suspense>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-600">
          Napomena: Ako ipak vidiš “Rate-limited.”, smanji broj kompanija ili povećaj razmak (npr. 15000ms).
        </div>
      </section>

      {/* Pexels slider */}
      <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="text-sm font-semibold text-slate-900">IT images slider.</div>
          <a
            href="https://www.pexels.com"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-slate-700 underline decoration-slate-300 underline-offset-2"
          >
            Photos provided by Pexels.
          </a>
        </div>

        {!pexelsKey ? (
          <div className="px-4 py-6 text-sm text-slate-600">
            Nema slika, jer <code className="rounded bg-slate-100 px-1">PEXELS_API_KEY</code> nije podešen.
          </div>
        ) : photos.length === 0 ? (
          <div className="px-4 py-6 text-sm text-slate-600">Nema rezultata sa Pexels API.</div>
        ) : (
          <div className="p-4">
            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
              <div className="flex w-full snap-x snap-mandatory overflow-x-auto scroll-smooth">
                {photos.map((p, i) => (
                  <div key={p.id} id={`img-${i + 1}`} className="relative h-[320px] w-full shrink-0 snap-center md:h-[380px]">
                    <img
                      src={p.src.landscape || p.src.large}
                      alt={p.alt || "IT photo"}
                      className="h-full w-full object-cover"
                      loading={i === 0 ? "eager" : "lazy"}
                    />

                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent p-4">
                      <div className="flex flex-col gap-1">
                        <div className="text-sm font-semibold text-white">{p.alt ? `${p.alt}.` : "IT photo."}</div>
                        <div className="text-xs text-white/90">
                          Photo by{" "}
                          <a className="underline" href={p.photographer_url} target="_blank" rel="noreferrer">
                            {p.photographer}
                          </a>{" "}
                          on{" "}
                          <a className="underline" href={p.url} target="_blank" rel="noreferrer">
                            Pexels
                          </a>
                          .
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/80 px-3 py-2 backdrop-blur">
                {photos.map((_, i) => (
                  <a
                    key={i}
                    href={`#img-${i + 1}`}
                    className="h-2.5 w-2.5 rounded-full border border-slate-300 bg-white hover:bg-slate-200"
                    aria-label={`Go to image ${i + 1}`}
                    title={`Image ${i + 1}.`}
                  />
                ))}
              </div>
            </div>

            <div className="mt-4 flex gap-3 overflow-x-auto">
              {photos.map((p, i) => (
                <a
                  key={`${p.id}-thumb`}
                  href={`#img-${i + 1}`}
                  className="group relative h-20 w-32 shrink-0 overflow-hidden rounded-2xl border border-slate-200"
                  title={`Open image ${i + 1}.`}
                >
                  <img
                    src={p.src.large}
                    alt={p.alt || "thumb"}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                    loading="lazy"
                  />
                </a>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Small metrics cards (optional) */}
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <CardShell>
          <div className="p-4">
            <div className="text-xs font-semibold text-slate-700">Companies tracked.</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">{COMPETITORS.length}.</div>
          </div>
        </CardShell>

        <CardShell>
          <div className="p-4">
            <div className="text-xs font-semibold text-slate-700">Photos loaded.</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">{photos.length}.</div>
          </div>
        </CardShell>

        <CardShell>
          <div className="p-4">
            <div className="text-xs font-semibold text-slate-700">Rate-limit friendly.</div>
            <div className="mt-2 text-sm text-slate-700">~13s delay per ticker.</div>
          </div>
        </CardShell>
      </div>
    </main>
  );
}

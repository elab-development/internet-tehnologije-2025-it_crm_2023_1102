"use client";

import type { InfoCardProps } from "../types/infoCardProps";

/**
 * InfoCard komponenta za prikaz statičnih kartica.
 * - Koristi se za opis uloge, ograničenja, pravila i sl.
 * - accent je Tailwind gradient string koji ide u bg-gradient-to-br.
 */
export default function InfoCard({
  title,
  items,
  accent = "from-white/10 to-white/0",
  className,
}: InfoCardProps) {
  return (
    <div
      className={[
        "relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg backdrop-blur",
        className ?? "",
      ].join(" ")}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${accent}`} />
      <div className="relative">
        <h3 className="text-base font-semibold text-white">{title}.</h3>

        <ul className="mt-3 space-y-2 text-sm text-white/70">
          {items.map((x) => (
            <li key={x} className="flex items-start gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-white/60" />
              <span>{x}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

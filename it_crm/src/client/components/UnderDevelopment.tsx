"use client";

import NextImage from "next/image";

import type { UnderDevelopmentProps } from "../types/underDevelopmentProps";

/**
 * UnderDevelopment.
 * - Reusable komponenta za stranice koje još nisu implementirane.
 * - Prikazuje sliku iz /public/Under Development.png na modernoj pozadini.
 */
export default function UnderDevelopment({
  title = "Ova stranica je u izradi.",
  subtitle = "Uskoro dodajemo funkcionalnost. Hvala na strpljenju.",
  imageSrc = "/Under Development.png",
  className,
}: UnderDevelopmentProps) {
  return (
    <section
      className={[
        "relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm",
        className ?? "",
      ].join(" ")}
    >
      {/* Background accents */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-fuchsia-200/50 blur-3xl" />
        <div className="absolute top-10 right-[-80px] h-80 w-80 rounded-full bg-cyan-200/40 blur-3xl" />
        <div className="absolute bottom-[-140px] left-1/3 h-[520px] w-[520px] rounded-full bg-yellow-200/35 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.06)_1px,transparent_0)] [background-size:22px_22px]" />
      </div>

      <div className="relative grid items-center gap-6 md:grid-cols-[1.15fr_0.85fr]">
        {/* Text */}
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-medium text-slate-700">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            Under development.
          </div>

          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            {title}
          </h2>

          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
            {subtitle}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs text-slate-700">
              UI u izradi.
            </span>
            <span className="rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs text-slate-700">
              API integracija.
            </span>
            <span className="rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs text-slate-700">
              Validacije & QA.
            </span>
          </div>
        </div>

        {/* Image */}
        <div className="flex items-center justify-center">
          <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white/70 p-3 shadow-sm">
            <NextImage
              src={imageSrc}
              alt="Under development"
              width={900}
              height={600}
              priority
              className="h-auto w-full rounded-xl object-contain"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

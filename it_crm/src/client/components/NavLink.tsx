"use client";

import Link from "next/link";

import type { NavLinkProps } from "../types/navLinkProps";

/**
 * NavLink.
 * - Prikazuje link sa modernim hover gradient efektom.
 * - Ako je active=true, prikazuje donju liniju (underline) u gradientu.
 */
export default function NavLink({ href, label, active, className }: NavLinkProps) {
  return (
    <Link
      href={href}
      className={[
        "group relative rounded-xl px-3 py-2 text-sm font-medium transition",
        active ? "text-slate-900" : "text-slate-600 hover:text-slate-900",
        className ?? "",
      ].join(" ")}
    >
      <span className="relative z-10">{label}</span>

      {/* Hover background. */}
      <span className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition group-hover:opacity-100">
        <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-fuchsia-100 via-cyan-100 to-yellow-100" />
      </span>

      {/* Active underline. */}
      {active ? (
        <span className="absolute left-3 right-3 top-[38px] h-[2px] rounded-full bg-gradient-to-r from-fuchsia-400 via-cyan-400 to-yellow-400" />
      ) : null}
    </Link>
  );
}

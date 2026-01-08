"use client";

import type { PillProps } from "../types/pillProps";

/**
 * Pill komponenta za kratke oznake (tagove) u UI-u.
 * - Koristi se u hero delu home stranica.
 * - Default stil je "glass" (border + blur + transparent).
 * 
 */
export default function Pill({ text, className }: PillProps) {
  return (
    <span
      className={[
        "rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/75",
        className ?? "",
      ].join(" ")}
    >
      {text}
    </span>
  );
}

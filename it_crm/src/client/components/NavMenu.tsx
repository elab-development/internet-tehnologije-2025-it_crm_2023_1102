"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { usePathname, useRouter } from "next/navigation";

import NavLink from "@/src/client/components/NavLink";

import type { Role } from "@/src/client/types/role";
import type { Me } from "@/src/client/types/me";
import type { NavItem } from "../types/navItem";

function roleLabel(role: Role) {
  if (role === "admin") return "Administrator.";
  if (role === "sales_manager") return "Sales menadžer.";
  return "Freelancer konsultant.";
}

function navByRole(role: Role): NavItem[] {
  switch (role) {
    case "admin":
      return [
        { label: "Home", href: "/pages/admin/home" },
        { label: "Users", href: "/pages/admin/users" },
        { label: "Clients", href: "/pages/admin/client-companies" },
        { label: "Metrics", href: "/pages/admin/metrics/team" },
      ];
    case "sales_manager":
      return [
        { label: "Home", href: "/pages/sales_manager/home" },
        { label: "Clients", href: "/pages/sales_manager/client-companies" },
        { label: "Opportunities", href: "/pages/sales_manager/opportunities" },
        { label: "Team metrics", href: "/pages/sales_manager/metrics/team" },
      ];
    case "freelance_consultant":
      return [
        { label: "Home", href: "/pages/freelance_consultant/home" },
        { label: "My clients", href: "/pages/freelance_consultant/client-companies" },
        { label: "Opportunities", href: "/pages/freelance_consultant/opportunities" },
        { label: "Activities", href: "/pages/freelance_consultant/activities" },
      ];
    default:
      return [];
  }
}

export default function NavMenu() {
  const router = useRouter();
  const pathname = usePathname();

  // Sakrij nav na auth stranicama.
  const hideOnAuth =
    pathname === "/pages/auth/login" || pathname === "/pages/auth/register";
  if (hideOnAuth) return null;

  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/auth/me", { method: "GET" });
        if (!res.ok) {
          if (!cancelled) setMe(null);
          return;
        }
        const data = (await res.json()) as Me;
        if (!cancelled) setMe(data);
      } catch {
        if (!cancelled) setMe(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const items = useMemo(() => (me ? navByRole(me.role) : []), [me]);

  const isActive = (href: string) =>
    pathname === href || (pathname?.startsWith(href + "/") ?? false);

  async function onLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/pages/auth/login");
      router.refresh();
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        {/* Left: Logo. */}
        <div className="flex items-center">
          <NextImage
            src="/IT%20CRM%20logo%20large.png"
            alt="IT CRM logo"
            width={140}
            height={140}
            priority
            className="h-12 w-auto object-contain"
          />
        </div>

        {/* Center: Links. */}
        <nav className="hidden items-center gap-1 md:flex">
          {me ? (
            items.map((it) => (
              <NavLink
                key={it.href}
                href={it.href}
                label={it.label}
                active={isActive(it.href)}
              />
            ))
          ) : (
            <>
              <NavLink href="/pages/auth/login" label="Login" active={pathname === "/pages/auth/login"} />
              <NavLink href="/pages/auth/register" label="Register" active={pathname === "/pages/auth/register"} />
            </>
          )}
        </nav>

        {/* Right: User info + Logout. */}
        <div className="flex items-center gap-3">
          <div className="hidden text-right md:block">
            {loading ? (
              <div className="space-y-1">
                <div className="h-3 w-28 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
              </div>
            ) : me ? (
              <>
                <div className="text-sm font-semibold text-slate-900">{me.name}.</div>
                <div className="text-xs text-slate-600">{roleLabel(me.role)}</div>
              </>
            ) : (
              <>
                <div className="text-sm font-semibold text-slate-900">Guest.</div>
                <div className="text-xs text-slate-600">Not signed in.</div>
              </>
            )}
          </div>

          {me ? (
            <button
              type="button"
              onClick={onLogout}
              className="relative overflow-hidden rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="absolute inset-0 opacity-0 transition hover:opacity-100">
                <span className="absolute inset-0 bg-gradient-to-r from-fuchsia-200 via-cyan-200 to-yellow-200 opacity-70" />
              </span>
              <span className="relative">Logout.</span>
            </button>
          ) : (
            <Link
              href="/pages/auth/login"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              Login.
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

"use client"; // Next.js: ova komponenta mora na klijentu jer koristi hook-ove (useState/useEffect).

import { useEffect, useState } from "react"; // React hook-ovi: useState za state, useEffect za side-effect (fetch/redirect).
import { useRouter } from "next/navigation"; // Next.js router za navigaciju i redirect.
import Image from "@/src/client/components/Image"; // Custom Image komponenta (wrapper oko next/image ili tvoj UI).
import Pill from "@/src/client/components/Pill"; // UI komponenta za male "pill" oznake/etikete.
import InfoCard from "@/src/client/components/InfoCard"; // UI komponenta za kartice sa listom stavki.

import type { Role } from "@/src/client/types/role"; // Tip za role (admin/sales_manager/freelance_consultant).
import type { Me } from "@/src/client/types/me"; // Tip za trenutno ulogovanog korisnika (me).

function routeByRole(role: Role) { // Helper: mapira rolu u odgovarajući home path.
  return `/pages/${role}/home`; // Vraćamo putanju home stranice za datu rolu.
}

export default function AdminHomePage() { // Glavna Admin home stranica.
  const router = useRouter(); // Uzimamo router da možemo da radimo push/redirect.
  const [me, setMe] = useState<Me | null>(null); // State za trenutno ulogovanog korisnika.
  const [loading, setLoading] = useState(true); // State koji govori da li se user još učitava.

  useEffect(() => { // Efekat koji se izvrši pri mount-u (i kad se router promeni).
    let cancelled = false; // Flag da spreči setState nakon unmount-a.

    (async () => { // Async IIFE da možemo da koristimo await unutar useEffect.
      try {
        const res = await fetch("/api/auth/me"); // Pozivamo endpoint koji vraća ulogovanog korisnika.
        if (!res.ok) { // Ako nema validne sesije ili nije autorizovan...
          router.push("/pages/auth/login"); // ...prebacujemo na login.
          return; // Prekidamo dalje izvršavanje.
        }

        const data = (await res.json()) as Me | null; // Parsiramo JSON u Me ili null.
        if (!data) { // Ako backend vrati null/empty...
          router.push("/pages/auth/login"); // ...prebacujemo na login.
          return; // Prekid.
        }

        if (data.role !== "admin") { // Ako korisnik nije admin...
          router.push(routeByRole(data.role)); // ...prebacujemo ga na njegov home.
          return; // Prekid.
        }

        if (!cancelled) setMe(data); // Ako komponenta nije unmount, upisujemo me u state.
      } finally {
        if (!cancelled) setLoading(false); // U svakom slučaju gasimo loading (ako nije unmount).
      }
    })();

    return () => {
      cancelled = true; // Cleanup: označimo da je komponenta unmount.
    };
  }, [router]); // Zavisnost: router (da ESLint ne prijavi, i u praksi je stabilan).

  return (
    <main className="min-h-screen"> {/* Glavni wrapper koji pokriva ceo ekran po visini. */}
      <div className="pointer-events-none fixed inset-0 -z-10"> {/* Background slojevi, ne klikabilni, iza sadržaja. */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900" /> {/* Tamni gradijent pozadina. */}
        <div className="absolute -top-20 left-10 h-72 w-72 rounded-full bg-fuchsia-500/25 blur-3xl" /> {/* Dekorativni blur krug. */}
        <div className="absolute top-24 right-10 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" /> {/* Drugi dekorativni blur krug. */}
        <div className="absolute bottom-[-140px] left-1/3 h-[520px] w-[520px] rounded-full bg-yellow-400/15 blur-3xl" /> {/* Treći dekorativni blur krug. */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.07)_1px,transparent_0)] [background-size:24px_24px] opacity-40" /> {/* Grid/tačkice overlay tekstura. */}
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10"> {/* Centralni container sa max širinom i padding-om. */}
        <header className="grid gap-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur md:grid-cols-[1.2fr_0.8fr] md:p-8">
          {/* Header kartica: grid layout (tekst levo, slika desno na većim ekranima). */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">
              {/* Badge za režim (Admin mode). */}
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> {/* Mala tačka indikator. */}
              Admin mode.
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              {/* Naslov: prikazujemo loading tekst dok čekamo me. */}
              {loading ? "Loading..." : `Welcome, ${me?.name}.`}
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
              {/* Opis uloge (engleski tekst po zahtevu). */}
              As an administrator, you have full system visibility. Your focus is access control, user management,
              master data management, and overall data governance.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {/* Pills: kratki highlight-i na engleskom. */}
              <Pill text="Full data access." /> {/* Pill 1. */}
              <Pill text="Roles and account status." /> {/* Pill 2. */}
              <Pill text="Ownership assignment." /> {/* Pill 3. */}
              <Pill text="System monitoring." /> {/* Pill 4. */}
            </div>
          </div>

          <div className="flex items-center justify-center">
            {/* Desni deo header-a: ilustracija/slika. */}
            <Image
              src="/admin.png" // Putanja do slike u public folderu.
              alt="Admin" // Alt tekst za accessibility.
              width={420} // Širina slike (render hint).
              height={320} // Visina slike (render hint).
              priority // Next.js: prioritetno učitavanje.
              wrapperClassName="w-full rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-3" // Stil wrappera.
              className="h-auto w-full rounded-xl object-contain" // Stil same slike.
            />
          </div>
        </header>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {/* Sekcija sa 3 InfoCard kartice. */}
          <InfoCard
            title="What an administrator does"
            accent="from-emerald-400/25 to-cyan-400/10"
            items={[
              "View all users, client companies, contacts, and opportunities.",
              "Create, edit, and deactivate user accounts.",
              "Manage categories and other master data.",
              "Reassign ownership with validation for active accounts.",
            ]} // Lista stavki na engleskom.
          />

          <InfoCard
            title="Rules and constraints"
            accent="from-fuchsia-400/20 to-yellow-300/10"
            items={[
              "Do not assign ownership to inactive users.",
              "Do not perform operational sales work instead of the team.",
              "Show clear error messages without internal details.",
              "Respect access rules based on roles and teams.",
            ]} // Lista stavki na engleskom.
          />

          <InfoCard
            title="Quality and security"
            accent="from-cyan-400/20 to-violet-400/10"
            items={[
              "Role-based authentication and authorization.",
              "Secure password storage (hashing).",
              "Input validation to prevent abuse.",
              "Stability and reliability in daily operations.",
            ]} // Lista stavki na engleskom.
          />
        </section>

        <footer className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          {/* Footer savet/napomena. */}
          <p className="text-sm text-white/70">
            Tip: The admin role is a “control” role. The most value comes from a stable system, clear access rules,
            and clean master data.
          </p>
        </footer>
      </div>
    </main>
  );
}

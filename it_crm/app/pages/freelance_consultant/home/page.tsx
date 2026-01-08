"use client"; // Ovim kažemo Next.js-u da se komponenta renderuje na klijentu (u browser-u).

import { useEffect, useState } from "react"; // Uvozimo React hook-ove za state i side effects.
import { useRouter } from "next/navigation"; // Uvozimo Next.js router za navigaciju (redirect).
import Image from "@/src/client/components/Image"; // Uvozimo reusable Image komponentu (verovatno wrapper oko next/image).
import Pill from "@/src/client/components/Pill"; // Uvozimo Pill komponentu za male "tag" elemente.
import InfoCard from "@/src/client/components/InfoCard"; // Uvozimo InfoCard komponentu za kartice sa listom stavki.

import type { Role } from "@/src/client/types/role"; // Uvozimo Role tip (npr. admin, sales_manager, freelance_consultant).
import type { Me } from "@/src/client/types/me"; // Uvozimo Me tip (trenutno ulogovani korisnik).

function routeByRole(role: Role) { // Helper funkcija koja vraća home rutu na osnovu role.
  return `/pages/${role}/home`; // Formiramo putanju: /pages/<role>/home.
}

export default function FreelancerHomePage() { // Glavna Home stranica za freelance consultant ulogu.
  const router = useRouter(); // Inicijalizujemo router kako bismo mogli da radimo redirect.
  const [me, setMe] = useState<Me | null>(null); // State za trenutno ulogovanog korisnika (ili null).
  const [loading, setLoading] = useState(true); // State za prikaz loading stanja dok učitavamo /me.

  useEffect(() => { // Side-effect: pri mount-u proveravamo autentifikaciju i rolu.
    let cancelled = false; // Flag da sprečimo setState ako se komponenta unmount-uje.

    (async () => { // IIFE da možemo koristiti async/await u useEffect-u.
      try {
        const res = await fetch("/api/auth/me"); // Pozivamo endpoint koji vraća info o ulogovanom korisniku.
        if (!res.ok) { // Ako odgovor nije ok, user nije ulogovan ili nema pristup.
          router.push("/pages/auth/login"); // Redirect na login stranicu.
          return; // Prekid daljeg izvršavanja.
        }

        const data = (await res.json()) as Me | null; // Parsiramo JSON u Me tip (ili null).
        if (!data) { // Ako nema podataka, tretiramo kao neulogovanog.
          router.push("/pages/auth/login"); // Redirect na login.
          return; // Prekid.
        }

        if (data.role !== "freelance_consultant") { // Ako je ulogovan, ali nije freelancer.
          router.push(routeByRole(data.role)); // Redirect na home stranicu njegove role.
          return; // Prekid.
        }

        if (!cancelled) setMe(data); // Ako nije unmount, snimamo user-a u state.
      } finally {
        if (!cancelled) setLoading(false); // Gasimo loading (bilo uspeh ili fail).
      }
    })();

    return () => {
      cancelled = true; // Cleanup: označimo da se komponenta unmount-ovala.
    };
  }, [router]); // Zavisnost: router.

  return (
    <main className="min-h-screen"> {/* Glavni wrapper: minimalna visina ekrana. */}
      <div className="pointer-events-none fixed inset-0 -z-10"> {/* Pozadinski sloj koji ne hvata klikove. */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900" /> {/* Tamni gradient background. */}
        <div className="absolute -top-24 left-1/3 h-80 w-80 rounded-full bg-fuchsia-500/22 blur-3xl" /> {/* Dekorativni "blob" (fuchsia). */}
        <div className="absolute top-20 right-[-60px] h-96 w-96 rounded-full bg-cyan-500/18 blur-3xl" /> {/* Dekorativni "blob" (cyan). */}
        <div className="absolute bottom-[-180px] left-[-80px] h-[560px] w-[560px] rounded-full bg-yellow-400/12 blur-3xl" /> {/* Dekorativni "blob" (yellow). */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.07)_1px,transparent_0)] [background-size:24px_24px] opacity-40" /> {/* "Grid" tačkasti overlay. */}
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10"> {/* Centralni container sa max širinom i padding-om. */}
        <header className="grid gap-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur md:grid-cols-[1.2fr_0.8fr] md:p-8"> {/* Header kartica sa grid rasporedom. */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80"> {/* "Badge" za režim. */}
              <span className="h-2 w-2 rounded-full bg-fuchsia-300" /> {/* Mala tačka kao indikator. */}
              Freelancer mode. {/* Tekst na engleskom (traženo). */}
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl"> {/* Glavni naslov. */}
              {loading ? "Loading..." : `Hello, ${me?.name}.`} {/* Loading i pozdrav na engleskom. */}
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70"> {/* Opis uloge. */}
              As a freelance consultant, you work in a focused scope: you can view and update only your own client
              companies, contacts, and opportunities. You log activities and keep a clear communication history.
              {/* Tekst na engleskom (traženo). */}
            </p>

            <div className="mt-5 flex flex-wrap gap-2"> {/* Sekcija sa "pill" tagovima. */}
              <Pill text="Only your data." /> {/* Tag na engleskom. */}
              <Pill text="Search & filters." /> {/* Tag na engleskom. */}
              <Pill text="Activities & history." /> {/* Tag na engleskom. */}
              <Pill text="Stages & statuses." /> {/* Tag na engleskom. */}
            </div>
          </div>

          <div className="flex items-center justify-center"> {/* Desna kolona: slika. */}
            <Image
              src="/freelance_consultant.png" // Putanja do slike u public folderu.
              alt="Freelancer" // Alt tekst za accessibility (engleski).
              width={420} // Širina slike.
              height={320} // Visina slike.
              priority // Next.js: učitaj prioritetno (iznad prevoja).
              wrapperClassName="w-full rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-3" // Stil wrappera oko slike.
              className="h-auto w-full rounded-xl object-contain" // Stil same slike.
            />
          </div>
        </header>

        <section className="mt-8 grid gap-4 md:grid-cols-3"> {/* Sekcija sa 3 InfoCard kartice. */}
          <InfoCard
            title="What a freelancer does" // Naslov na engleskom.
            accent="from-fuchsia-400/22 to-cyan-400/10" // Gradient akcenat kartice.
            items={[ // Lista stavki (engleski).
              "Review and maintain your own client companies.",
              "Create and update contacts for assigned clients.",
              "Work on opportunities assigned to you.",
              "Update stage and status according to the sales flow.",
            ]}
          />

          <InfoCard
            title="Access limitations" // Naslov na engleskom.
            accent="from-cyan-400/20 to-yellow-300/10" // Gradient akcenat kartice.
            items={[ // Lista stavki (engleski).
              "You cannot see client companies and opportunities from other teams.",
              "You cannot create contacts for clients not assigned to you.",
              "You do not manage users or reference data.",
              "You do not see global team-wide metrics.",
            ]}
          />

          <InfoCard
            title="Activities & history" // Naslov na engleskom.
            accent="from-yellow-300/18 to-violet-400/10" // Gradient akcenat kartice.
            items={[ // Lista stavki (engleski).
              "Notes, calls, and meetings for clients and opportunities.",
              "Storing the date, activity type, and a short description.",
              "Clear communication history for every relationship.",
              "Continuity and tracking of agreements.",
            ]}
          />
        </section>

        <footer className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur"> {/* Footer kartica. */}
          <p className="text-sm text-white/70"> {/* Footer tekst. */}
            Tip. Work becomes easier when contacts are kept up to date and you log a short activity after every
            interaction.
            {/* Tekst na engleskom. */}
          </p>
        </footer>
      </div>
    </main>
  );
} // Zatvaramo komponentu.

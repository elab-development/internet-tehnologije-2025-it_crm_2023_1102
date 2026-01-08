"use client"; // Ovim označavamo da je komponenta Client Component (radi u browser-u).

import { useEffect, useState } from "react"; // Uvozimo React hook-ove za state i side-effect logiku.
import { useRouter } from "next/navigation"; // Uvozimo Next.js router za navigaciju/redirect u App Router-u.
import Image from "@/src/client/components/Image"; // Uvozimo našu reusable Image komponentu (wrapper oko next/image ili custom).
import Pill from "@/src/client/components/Pill"; // Uvozimo komponentu za male “pill” tagove.
import InfoCard from "@/src/client/components/InfoCard"; // Uvozimo karticu koja prikazuje naslov + listu stavki.

import type { Role } from "@/src/client/types/role"; // Uvozimo Role tip (npr. admin, sales_manager, itd).
import type { Me } from "@/src/client/types/me"; // Uvozimo Me tip (podaci o ulogovanom korisniku).

function routeByRole(role: Role) { // Helper funkcija koja vraća home rutu na osnovu uloge.
  return `/pages/${role}/home`; // Gradimo rutu u formatu /pages/<role>/home.
}

export default function SalesManagerHomePage() { // Glavna “Home” stranica za sales_manager korisnika.
  const router = useRouter(); // Inicijalizujemo router da bismo mogli da radimo push/redirect.
  const [me, setMe] = useState<Me | null>(null); // State za ulogovanog korisnika (dok ne učitamo, null).
  const [loading, setLoading] = useState(true); // State za loading indikator tokom auth provere.

  useEffect(() => { // Effect se izvršava na mount (i kad se router promeni).
    let cancelled = false; // Flag da sprečimo setState ako se komponenta unmount-uje pre završetka.

    (async () => { // Pokrećemo async IIFE da bismo koristili await u useEffect-u.
      try { // U try bloku radimo fetch i logiku redirekcije.
        const res = await fetch("/api/auth/me"); // Pozivamo API da dobijemo trenutnog korisnika.
        if (!res.ok) { // Ako status nije 200-299, tretiramo kao da nije ulogovan.
          router.push("/pages/auth/login"); // Redirect na login stranicu.
          return; // Prekidamo dalje izvršavanje.
        }

        const data = (await res.json()) as Me | null; // Parsiramo JSON i kastujemo na Me ili null.
        if (!data) { // Ako API vrati null ili prazno, tretiramo kao da nije ulogovan.
          router.push("/pages/auth/login"); // Redirect na login.
          return; // Prekidamo dalje izvršavanje.
        }

        if (data.role !== "sales_manager") { // Ako korisnik nije sales_manager.
          router.push(routeByRole(data.role)); // Prebacujemo ga na njegovu home stranicu po ulozi.
          return; // Prekidamo dalje izvršavanje.
        }

        if (!cancelled) setMe(data); // Ako komponenta nije unmount-ovana, setujemo me state.
      } finally { // finally se izvršava i kad uspe i kad baci grešku.
        if (!cancelled) setLoading(false); // Gasimo loading (samo ako nije unmount-ovana).
      }
    })(); // Pozivamo IIFE.

    return () => { // Cleanup funkcija useEffect-a (poziva se na unmount).
      cancelled = true; // Postavljamo flag da ne setujemo state nakon unmount-a.
    };
  }, [router]); // Zavisnost: router (da izbegnemo stale reference).

  return ( // Vraćamo JSX UI za stranicu.
    <main className="min-h-screen"> {/* Glavni wrapper koji obezbeđuje minimalnu visinu ekrana. */}
      <div className="pointer-events-none fixed inset-0 -z-10"> {/* Pozadinski layer, fiksiran i ispod sadržaja. */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900" /> {/* Gradient pozadina. */}
        <div className="absolute -top-16 left-[-40px] h-80 w-80 rounded-full bg-cyan-500/25 blur-3xl" /> {/* Dekorativni “blob” (cyan). */}
        <div className="absolute top-24 right-10 h-80 w-80 rounded-full bg-fuchsia-500/18 blur-3xl" /> {/* Dekorativni “blob” (fuchsia). */}
        <div className="absolute bottom-[-160px] right-[-80px] h-[560px] w-[560px] rounded-full bg-yellow-400/12 blur-3xl" /> {/* Dekorativni “blob” (yellow). */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.07)_1px,transparent_0)] [background-size:24px_24px] opacity-40" /> {/* Diskretna “grid/dots” tekstura. */}
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10"> {/* Centralni kontejner sa max širinom i padding-om. */}
        <header className="grid gap-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur md:grid-cols-[1.2fr_0.8fr] md:p-8"> {/* Hero sekcija sa grid layout-om. */}
          <div> {/* Leva kolona (tekst). */}
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80"> {/* Badge na vrhu. */}
              <span className="h-2 w-2 rounded-full bg-cyan-300" /> {/* Mala tačka kao indikator (status). */}
              Sales manager mode. {/* Labela na engleskom (traženo). */}
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl"> {/* Glavni naslov. */}
              {loading ? "Loading..." : `Hello, ${me?.name}.`} {/* Ako je loading, prikaži Loading..., inače pozdrav + ime. */}
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70"> {/* Opis ispod naslova. */}
              As a sales manager, you lead your team and manage the sales pipeline. You create clients, contacts, and opportunities for the team, and track performance metrics.
              {/* Tekst na engleskom (traženo). */}
            </p>

            <div className="mt-5 flex flex-wrap gap-2"> {/* Kontejner za pill tagove. */}
              <Pill text="Your team and your clients." /> {/* Pill 1. */}
              <Pill text="Sales pipeline and flow." /> {/* Pill 2. */}
              <Pill text="Stage-based metrics." /> {/* Pill 3. */}
              <Pill text="Data quality control." /> {/* Pill 4. */}
            </div>
          </div>

          <div className="flex items-center justify-center"> {/* Desna kolona (slika). */}
            <Image
              src="/sales_manager.png" // Putanja do slike (public folder).
              alt="Sales manager" // Alt tekst za pristupačnost.
              width={420} // Širina rendera.
              height={320} // Visina rendera.
              priority // Kažemo da je slika prioritetna (brže učitavanje).
              wrapperClassName="w-full rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-3" // Stil wrapper-a.
              className="h-auto w-full rounded-xl object-contain" // Stil same slike (responsive).
            />
          </div>
        </header>

        <section className="mt-8 grid gap-4 md:grid-cols-3"> {/* Sekcija sa tri InfoCard komponente. */}
          <InfoCard
            title="Role focus" // Naslov kartice (eng).
            accent="from-cyan-400/25 to-emerald-400/10" // Tailwind gradient akcent.
            items={[ // Lista bullet stavki.
              "Managing team clients and their statuses.", // Stavka 1 (eng).
              "Creating and updating contacts for team clients.", // Stavka 2 (eng).
              "Driving opportunities through the sales stages.", // Stavka 3 (eng).
              "Tracking results and pipeline using metrics.", // Stavka 4 (eng).
            ]}
          />

          <InfoCard
            title="What you can see and change" // Naslov kartice (eng).
            accent="from-fuchsia-400/18 to-cyan-400/10" // Akcent gradient.
            items={[ // Lista stavki.
              "Clients you own and clients owned by your freelancers.", // Stavka 1.
              "Contacts linked to team clients.", // Stavka 2.
              "Opportunities owned by you or a team member.", // Stavka 3.
              "Aggregated metrics limited to your team.", // Stavka 4.
            ]}
          />

          <InfoCard
            title="Validation and quality" // Naslov kartice (eng).
            accent="from-yellow-300/18 to-violet-400/10" // Akcent gradient.
            items={[ // Lista stavki.
              "Opportunity title must not be empty.", // Stavka 1.
              "Estimated value and probability must be sensible.", // Stavka 2.
              "Stage and status follow the defined sales flow.", // Stavka 3.
              "Search and filters stay fast and easy to use.", // Stavka 4.
            ]}
          />
        </section>

        <footer className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur"> {/* Footer sa savetom. */}
          <p className="text-sm text-white/70"> {/* Tekst footera. */}
            Tip: You get the best results when clients are segmented, contacts are up-to-date, and opportunities are updated regularly.
            {/* Savet je na engleskom (traženo). */}
          </p>
        </footer>
      </div>
    </main>
  );
}

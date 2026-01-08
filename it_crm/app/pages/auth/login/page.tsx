"use client"; // Next.js: ova stranica mora na klijentu jer koristi hook-ove i router.

import Image from "next/image"; // Next.js Image komponenta (optimizacija slika).
import { useRouter, useSearchParams } from "next/navigation"; // Hook-ovi za navigaciju i čitanje query parametara.
import React, { useEffect, useMemo, useState } from "react"; // React i hook-ovi.

import type { Role } from "@/src/client/types/role"; // Tip za ulogu korisnika (admin/sales_manager/freelance_consultant).
import type { LoginPayload } from "@/src/client/types/loginPayload"; // Tip za payload forme (email + password).

function routeByRole(role: Role) { // Helper: na osnovu role vraća home rutu.
  return `/pages/${role}/home`; // Konvencija projekta: home stranice su /pages/<role>/home.
}

export default function LoginPage() { // Glavna Login stranica.
  const router = useRouter(); // Router za redirect i navigaciju.
  const searchParams = useSearchParams(); // Čita query parametre iz URL-a.

  const presetEmail = searchParams.get("email") ?? ""; // Ako postoji ?email=..., pre-popuni email, inače prazan string.

  const [form, setForm] = useState<LoginPayload>({ // State za formu (kontrolisani input-i).
    email: presetEmail, // Inicijalno postavimo email iz query parametra.
    password: "", // Lozinka je prazna na startu.
  });

  useEffect(() => { // Efekat pri mount-u: ako je URL došao sa email parametrom, upiši ga u state.
    // If you came from /auth/login?email=... populate the email field. // SRB: Ako dođeš sa ?email, popuni email polje.
    const email = searchParams.get("email"); // Izvučemo email iz query parametara.
    if (email) { // Ako postoji email...
      setForm((p) => ({ ...p, email })); // ...upisujemo ga u form state (ne diramo password).
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps // SRB: Namerno prazne zavisnosti da se izvrši samo jednom.
  }, []); // Prazan niz: izvrši se samo jednom (na mount).

  const [error, setError] = useState<string>(""); // State za error poruku (ako login padne).
  const [success, setSuccess] = useState<string>(""); // State za success poruku (ako login uspe).
  const [loading, setLoading] = useState<boolean>(false); // State za loading (dok traje request).

  const canSubmit = useMemo(() => { // Memo: određuje da li dugme može da se klikne.
    return form.email.trim().length > 3 && form.password.trim().length > 0 && !loading; // Validacija + blokada tokom loading-a.
  }, [form.email, form.password, loading]); // Zavisnosti: menja se kad se promeni email/password/loading.

  function onChange<K extends keyof LoginPayload>(key: K, value: LoginPayload[K]) { // Generička funkcija za update polja forme.
    setError(""); // Kad korisnik menja input, čistimo error poruku.
    setSuccess(""); // Takođe čistimo success poruku (da ne ostane prikazana).
    setForm((p) => ({ ...p, [key]: value })); // Upisujemo novo polje u form state.
  }

  async function onSubmit(e: React.FormEvent) { // Handler za submit forme.
    e.preventDefault(); // Sprečavamo default refresh stranice.
    setError(""); // Resetujemo error.
    setSuccess(""); // Resetujemo success.
    setLoading(true); // Palimo loading.

    try {
      const res = await fetch("/api/auth/login", { // Pozivamo backend login endpoint.
        method: "POST", // POST jer šaljemo kredencijale.
        headers: { "Content-Type": "application/json" }, // JSON payload.
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(), // Normalizujemo email (trim + lowercase).
          password: form.password, // Lozinku šaljemo kako je unesena.
        }),
      });

      const data = await res.json().catch(() => ({})); // Pokušamo da parsiramo JSON; ako fail, koristimo {}.

      if (!res.ok) { // Ako backend vrati grešku (401/400/500)...
        setError(data?.message || "Login failed."); // Prikaži poruku iz backenda ili fallback.
        setLoading(false); // Gasimo loading.
        return; // Prekidamo dalje.
      }

      // We expect backend to return role or user.role. // SRB: Očekujemo role ili user.role u odgovoru.
      const role: Role | undefined = data?.role ?? data?.user?.role; // Pokušaj da izvučeš rolu iz dva moguća mesta.

      if (!role) { // Ako role nedostaje...
        setError("Backend did not return the user role (role)."); // Jasna poruka za debugging.
        setLoading(false); // Gasimo loading.
        return; // Prekid.
      }

      setSuccess("You have successfully logged in."); // Postavljamo success poruku.
      setLoading(false); // Gasimo loading.

      router.push(routeByRole(role)); // Redirect na home stranicu na osnovu role.
      router.refresh(); // Refresh router cache-a (korisno ako UI zavisi od server state-a/sesije).
    } catch {
      setLoading(false); // Gasimo loading u catch grani.
      setError("Network error. Please try again."); // Poruka za mrežnu grešku.
    }
  }

  return (
    <main className="min-h-screen w-full bg-white"> {/* Glavni wrapper: bela pozadina + full height. */}
      <div className="pointer-events-none fixed inset-0 -z-10"> {/* Dekorativni background slojevi iza sadržaja. */}
        <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-slate-50" /> {/* Blagi gradijent. */}
        <div className="absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-gradient-to-r from-fuchsia-200 via-cyan-200 to-yellow-200 blur-3xl opacity-50" /> {/* Blur krug 1. */}
        <div className="absolute bottom-[-120px] right-[-120px] h-96 w-96 rounded-full bg-gradient-to-r from-violet-200 via-pink-200 to-emerald-200 blur-3xl opacity-40" /> {/* Blur krug 2. */}
      </div>

      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10">
        {/* Centriramo sadržaj horizontalno i vertikalno u okviru ekrana. */}
        <div className="grid w-full grid-cols-1 gap-8 md:grid-cols-2 md:gap-10">
          {/* Grid: jedna kolona na mobile, dve kolone na md+. */}

          <section className="flex flex-col justify-center">
            {/* Levi panel: logo + info kartica. */}
            <div className="mb-6 flex items-center gap-3">
              {/* Logo sekcija. */}
              <Image
                src="/IT%20CRM%20logo%20large.png" // Putanja do logo slike u public folderu.
                alt="IT CRM logo" // Alt tekst.
                width={272} // Širina.
                height={272} // Visina.
                priority // Prioritetno učitavanje.
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/70 p-5 shadow-sm backdrop-blur">
              {/* Info kartica sa benefitima. */}
              <p className="text-sm text-slate-700">
                Log in to access client companies, contacts, and opportunities.
              </p>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                {/* Lista benefita. */}
                <li className="flex items-start gap-2">
                  <span className="mt-1 inline-block h-2 w-2 rounded-full bg-fuchsia-400" />
                  Role-based access control.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 inline-block h-2 w-2 rounded-full bg-cyan-400" />
                  Fast search and filtering.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 inline-block h-2 w-2 rounded-full bg-yellow-400" />
                  Secure session and automatic logout.
                </li>
              </ul>
            </div>
          </section>

          <section className="flex items-center">
            {/* Desni panel: forma za login. */}
            <div className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-lg md:p-8">
              {/* Card za formu. */}
              <h2 className="text-xl font-semibold text-slate-900">Login.</h2> {/* Naslov na engleskom. */}
              <p className="mt-1 text-sm text-slate-600">Enter your email and password to sign in.</p> {/* Podnaslov. */}

              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                {/* Forma: submit ide na onSubmit handler. */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Email.</label> {/* Label. */}
                  <input
                    type="email" // HTML tip za email.
                    value={form.email} // Kontrolisani input: value iz state-a.
                    onChange={(e) => onChange("email", e.target.value)} // Update state-a na promenu.
                    placeholder="e.g. ana@mail.com" // Placeholder na engleskom.
                    autoComplete="email" // Browser autocomplete.
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Password.</label> {/* Label. */}
                  <input
                    type="password" // HTML tip za password.
                    value={form.password} // Kontrolisani input.
                    onChange={(e) => onChange("password", e.target.value)} // Update password.
                    placeholder="Enter your password" // Placeholder na engleskom.
                    autoComplete="current-password" // Browser autocomplete.
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
                  />
                </div>

                {error ? ( // Ako postoji error poruka...
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error} {/* Prikaz error teksta. */}
                  </div>
                ) : null}

                {success ? ( // Ako postoji success poruka...
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {success} {/* Prikaz success teksta. */}
                  </div>
                ) : null}

                <button
                  type="submit" // Submit dugme forme.
                  disabled={!canSubmit} // Disable ako validacija nije prošla ili je loading.
                  className="group relative w-full overflow-hidden rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="absolute inset-0 opacity-0 transition group-hover:opacity-100">
                    {/* Hover overlay pozadina. */}
                    <span className="absolute inset-0 bg-gradient-to-r from-fuchsia-500 via-cyan-500 to-yellow-400 opacity-40" />
                  </span>
                  <span className="relative">{loading ? "Signing in..." : "Sign in."}</span> {/* Tekst dugmeta. */}
                </button>

                <div className="pt-2 text-center text-sm text-slate-600">
                  {/* Link ka registraciji. */}
                  Don&apos;t have an account?{" "}
                  <button
                    type="button" // Nije submit, samo navigacija.
                    onClick={() => router.push("/pages/auth/register")} // Prebaci na register stranicu.
                    className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-500"
                  >
                    Register.
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

"use client"; // Next.js: ova stranica radi na klijentu jer koristi hook-ove (useState/useMemo) i router.

import Image from "next/image"; // Next.js Image komponenta (optimizovane slike).
import { useRouter } from "next/navigation"; // Hook za navigaciju (redirect, push, refresh).
import React, { useMemo, useState } from "react"; // React + hook-ovi koje koristimo.

import type { Role } from "@/src/client/types/role"; // Tip za ulogu korisnika.
import type { RegisterPayload } from "@/src/client/types/registerPayload"; // Tip za podatke registracije.

export default function RegisterPage() { // Glavna Register stranica.
  const router = useRouter(); // Router za preusmeravanje na login ili druge stranice.

  const [form, setForm] = useState<RegisterPayload>({ // State za formu (kontrolisani input-i).
    name: "", // Ime i prezime.
    email: "", // Email adresa.
    password: "", // Lozinka.
    role: "sales_manager", // Podrazumevana uloga.
    managerId: "", // Manager ID (potreban samo za freelancera).
  });

  const [error, setError] = useState<string>(""); // State za error poruku.
  const [success, setSuccess] = useState<string>(""); // State za success poruku.
  const [loading, setLoading] = useState<boolean>(false); // State za loading dok traje request.

  const needsManager = form.role === "freelance_consultant"; //  Freelancer mora imati managerId.

  const canSubmit = useMemo(() => { // Memo: da li dugme može da se klikne.
    const baseOk = //  Osnovna validacija za sva polja.
      form.name.trim().length >= 2 && // Ime mora imati bar 2 karaktera.
      form.email.trim().length > 3 && // Email mora biti bar minimalne dužine.
      form.password.trim().length >= 6; // Lozinka mora imati bar 6 karaktera.

    const managerOk = !needsManager || (form.managerId?.trim() && Number(form.managerId) > 0); //  Ako treba manager, mora biti broj > 0.

    return Boolean(baseOk && managerOk && !loading); //  Submit dozvoljen samo ako je sve OK i nije loading.
  }, [form, needsManager, loading]); // Zavisnosti: reevaluacija kada se promeni forma/needsManager/loading.

  function onChange<K extends keyof RegisterPayload>(key: K, value: RegisterPayload[K]) { // Generički handler za promenu bilo kog polja.
    setError(""); //  Čistimo error kad korisnik krene da menja unos.
    setSuccess(""); //  Čistimo success poruku da ne ostane prikazana.
    setForm((p) => ({ ...p, [key]: value })); //  Upisujemo novo polje u form state.
  }

  async function onSubmit(e: React.FormEvent) { // Handler za submit forme.
    e.preventDefault(); //  Sprečavamo default ponašanje (reload).
    setError(""); //  Reset error poruke.
    setSuccess(""); //  Reset success poruke.
    setLoading(true); //  Palimo loading.

    try {
      const payload: any = { //  Payload koji šaljemo backend-u (any jer managerId dodajemo uslovno).
        name: form.name.trim(), //  Trim da uklonimo suvišne razmake.
        email: form.email.trim().toLowerCase(), //  Normalizujemo email (trim + lowercase).
        password: form.password, //  Lozinku šaljemo kako je uneta.
        role: form.role, //  Uloga iz selekta.
      };

      if (needsManager) payload.managerId = Number(form.managerId); //  Samo za freelancera šaljemo managerId kao broj.

      const res = await fetch("/api/auth/register", { //  Poziv backend endpoint-a za registraciju.
        method: "POST", //  POST jer kreiramo resurs (novi user).
        headers: { "Content-Type": "application/json" }, //  Šaljemo JSON.
        body: JSON.stringify(payload), //  Pretvaramo payload u JSON string.
      });

      const data = await res.json().catch(() => ({})); //  Pokušamo parsiranje JSON-a; fallback je {}.

      if (!res.ok) { //  Ako backend vrati grešku (npr. email zauzet, invalid data)...
        setError(data?.message || "Registration failed."); //  Prikažemo poruku iz backenda ili fallback.
        setLoading(false); //  Gasimo loading.
        return; //  Prekid daljeg toka.
      }

      setSuccess("Account created. Redirecting to login..."); //  Success poruka.
      setLoading(false); //  Gasimo loading.

      const emailParam = encodeURIComponent(payload.email); //  URL-safe email za query param.
      router.push(`/pages/auth/login?email=${emailParam}`); //  Preusmerimo na login i pre-popunimo email.
      router.refresh(); //  Osvežimo router cache.
    } catch {
      setLoading(false); //  Gasimo loading u catch grani.
      setError("Network error. Please try again."); //  Poruka za mrežnu grešku.
    }
  }

  return (
    <main className="min-h-screen w-full bg-white"> {/*  Glavni wrapper, full height, bela pozadina. */}
      <div className="pointer-events-none fixed inset-0 -z-10"> {/*  Dekorativni background slojevi iza sadržaja. */}
        <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-slate-50" /> {/*  Blagi gradijent pozadine. */}
        <div className="absolute -top-28 left-[-80px] h-96 w-96 rounded-full bg-gradient-to-r from-yellow-200 via-cyan-200 to-fuchsia-200 blur-3xl opacity-45" /> {/*  Blur krug 1. */}
        <div className="absolute bottom-[-140px] right-[-140px] h-[520px] w-[520px] rounded-full bg-gradient-to-r from-emerald-200 via-violet-200 to-pink-200 blur-3xl opacity-35" /> {/*  Blur krug 2. */}
      </div>

      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10">
        {/*  Centriramo layout u okviru ekrana. */}
        <div className="grid w-full grid-cols-1 gap-8 md:grid-cols-2 md:gap-10">
          {/*  Grid: jedna kolona na mobile, dve na md+. */}

          <section className="flex flex-col justify-center">
            {/*  Levi panel: logo + objašnjenje uloga. */}
            <div className="mb-6 flex items-center gap-3">
              <Image
                src="/IT%20CRM%20logo%20large.png" //  Logo iz public foldera.
                alt="IT CRM logo" //  Alt tekst.
                width={272} //  Širina.
                height={272} //  Visina.
                priority //  Učitaj ranije (važan element).
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/70 p-5 shadow-sm backdrop-blur">
              {/*  Kartica sa objašnjenjem uloga. */}
              <p className="text-sm text-slate-700">
                Choose a user role. The role determines access permissions in the system.
              </p>
              <div className="mt-4 grid gap-2 text-sm text-slate-600">
                <div className="flex items-start gap-2">
                  <span className="mt-1 inline-block h-2 w-2 rounded-full bg-cyan-400" />
                  Sales manager: manages clients and the team.
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-1 inline-block h-2 w-2 rounded-full bg-fuchsia-400" />
                  Freelancer: only assigned clients, contacts, and opportunities.
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-1 inline-block h-2 w-2 rounded-full bg-yellow-400" />
                  Administrator: full access and management of all data.
                </div>
              </div>
            </div>
          </section>

          <section className="flex items-center">
            {/*  Desni panel: forma registracije. */}
            <div className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-lg md:p-8">
              <h2 className="text-xl font-semibold text-slate-900">Register.</h2> {/*  Naslov na engleskom. */}
              <p className="mt-1 text-sm text-slate-600">Fill in the details to create an account.</p> {/*  Podnaslov na engleskom. */}

              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                {/*  Forma koja submit-uje na onSubmit handler. */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Full name.</label> {/*  Label na engleskom. */}
                  <input
                    type="text" //  Tekstualni unos.
                    value={form.name} //  Kontrolisani input.
                    onChange={(e) => onChange("name", e.target.value)} //  Update state-a.
                    placeholder="e.g. Ana Anic" //  Placeholder na engleskom.
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Email.</label> {/*  Label. */}
                  <input
                    type="email" //  Email input.
                    value={form.email} //  Kontrolisani input.
                    onChange={(e) => onChange("email", e.target.value)} //  Update email-a.
                    placeholder="e.g. ana@mail.com" //  Placeholder.
                    autoComplete="email" //  Autocomplete.
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Password.</label> {/*  Label. */}
                  <input
                    type="password" //  Password input.
                    value={form.password} //  Kontrolisani input.
                    onChange={(e) => onChange("password", e.target.value)} //  Update password-a.
                    placeholder="Minimum 6 characters" //  Placeholder na engleskom.
                    autoComplete="new-password" //  Autocomplete za novu lozinku.
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Role.</label> {/*  Label. */}
                  <select
                    value={form.role} //  Selektovana uloga iz state-a.
                    onChange={(e) => onChange("role", e.target.value as Role)} //  Update role-a.
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
                  >
                    <option value="sales_manager">Sales manager.</option> {/*  Opcija role. */}
                    <option value="freelance_consultant">Freelancer consultant.</option> {/*  Opcija role. */}
                    <option value="admin">Administrator.</option> {/*  Opcija role. */}
                  </select>
                </div>

                {needsManager ? ( //  Prikazujemo Manager ID samo ako je izabrana freelance_consultant uloga.
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Manager ID (sales_manager).
                    </label> {/*  Label za managerId. */}
                    <input
                      type="number" //  Brojčani unos.
                      value={form.managerId} //  Kontrolisani input.
                      onChange={(e) => onChange("managerId", e.target.value)} //  Update managerId-a (čuvamo kao string u formi).
                      placeholder="e.g. 3" //  Placeholder na engleskom.
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      A freelancer must be assigned to exactly one sales manager.
                    </p> {/*  Objašnjenje pravila. */}
                  </div>
                ) : null}

                {error ? ( //  Ako postoji error poruka, prikaži je.
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </div>
                ) : null}

                {success ? ( //  Ako postoji success poruka, prikaži je.
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {success}
                  </div>
                ) : null}

                <button
                  type="submit" //  Submit dugme.
                  disabled={!canSubmit} //  Disable ako validacija nije prošla ili je loading.
                  className="group relative w-full overflow-hidden rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="absolute inset-0 opacity-0 transition group-hover:opacity-100">
                    {/*  Hover overlay efekat. */}
                    <span className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-cyan-500 to-fuchsia-500 opacity-40" />
                  </span>
                  <span className="relative">{loading ? "Creating account..." : "Register."}</span> {/*  Tekst dugmeta na engleskom. */}
                </button>

                <div className="pt-2 text-center text-sm text-slate-600">
                  {/*  Link ka login stranici. */}
                  Already have an account?{" "}
                  <button
                    type="button" //  Nije submit, samo navigacija.
                    onClick={() => router.push("/pages/auth/login")} //  Prebaci na login.
                    className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-500"
                  >
                    Sign in.
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

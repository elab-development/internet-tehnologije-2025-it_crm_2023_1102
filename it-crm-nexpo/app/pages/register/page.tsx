"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import Button from "@/components/Button";
import Input from "@/components/Input";

// Register stranica za kreiranje korisnika.
export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("password123");
  const [role, setRole] = useState("it_consultant");
  const [message, setMessage] = useState("");

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email, password, role }),
    });

    const result = await response.json();

    if (!response.ok) {
      setMessage(result.message || "Registration failed");
      return;
    }

    router.push("/pages/login");
  }

  return (
    <main className="auth-page">
      <section className="auth-brand">
        <img src="/logo-big.png" alt="NEXPO logo" />

        <h1>Start your CRM workspace.</h1>

        <p>
          Create an account and organize IT clients, requests, offers and
          interactions with a clean modern interface.
        </p>
      </section>

      <section className="auth-form-wrap">
        <form className="auth-form" onSubmit={handleRegister}>
          <img src="/logo-big.png" alt="NEXPO logo" />

          <h2>Create account</h2>

          <p>Register a new user for the NEXPO CRM system.</p>

          <Input
            label="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          <div className="form-group">
            <label className="label">Role</label>

            <select
              className="select"
              value={role}
              onChange={(event) => setRole(event.target.value)}
            >
              <option value="admin">Admin</option>
              <option value="sales_manager">Sales Manager</option>
              <option value="it_consultant">IT Consultant</option>
            </select>
          </div>

          <Button full type="submit">
            Register
          </Button>

          {message && <div className="message">{message}</div>}

          <p style={{ marginTop: 18 }}>
            Already have an account? <Link href="/pages/login">Login</Link>
          </p>
        </form>
      </section>
    </main>
  );
}
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import Button from "@/components/Button";
import Input from "@/components/Input";

// Login stranica preusmerava korisnika na osnovu uloge.
export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("jelena.popadic@nexpo.com");
  const [password, setPassword] = useState("password");
  const [message, setMessage] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();

    if (!response.ok) {
      setMessage(result.message || "Login failed");
      return;
    }

    const user = result.data.user;
    localStorage.setItem("user", JSON.stringify(user));

    if (user.role === "admin") {
      router.push("/pages/admin/analytics");
      return;
    }

    if (user.role === "sales_manager") {
      router.push("/pages/dashboard");
      return;
    }

    router.push("/pages/project-requests");
  }

  return (
    <main className="auth-page">
      <section className="auth-brand">
        <img src="/logo-big.png" alt="NEXPO logo" />

        <h1>Manage IT clients with confidence.</h1>

        <p>
          NEXPO helps IT teams track clients, project requests, offers and
          communication in one simple CRM workspace.
        </p>
      </section>

      <section className="auth-form-wrap">
        <form className="auth-form" onSubmit={handleLogin}>
          <img src="/logo-big.png" alt="NEXPO logo" />

          <h2>Welcome back</h2>

          <p>Login to continue to your role-based workspace.</p>

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

          <Button full type="submit">
            Login
          </Button>

          {message && <div className="message">{message}</div>}

          <p style={{ marginTop: 18 }}>
            Do not have an account?{" "}
            <Link href="/pages/register">Register</Link>
          </p>
        </form>
      </section>
    </main>
  );
}
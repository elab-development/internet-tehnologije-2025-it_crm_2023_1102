"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Button from "./Button";

type User = {
  name: string;
  role: "admin" | "sales_manager" | "it_consultant";
};

// Navigacija prikazuje linkove na osnovu uloge korisnika.
export default function Navigation() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST",
    });

    localStorage.removeItem("user");
    router.push("/pages/login");
  }

  function getHomeLink() {
    if (user?.role === "admin") {
      return "/pages/admin/analytics";
    }

    if (user?.role === "sales_manager") {
      return "/pages/dashboard";
    }

    if (user?.role === "it_consultant") {
      return "/pages/project-requests";
    }

    return "/pages/login";
  }

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href={getHomeLink()} className="nav-logo">
          <img src="/logo-big.png" alt="NEXPO logo" />
        </Link>

        <div className="nav-links">
          {user?.role === "admin" && (
            <>
              <Link className="nav-link" href="/pages/admin/analytics">
                Analytics
              </Link>

              <Link className="nav-link" href="/pages/admin/users">
                Users
              </Link>

              <Link className="nav-link" href="/pages/clients">
                Clients
              </Link>

              <Link className="nav-link" href="/pages/project-requests">
                Requests
              </Link>

              <Link className="nav-link" href="/pages/offers">
                Offers
              </Link>

              <Link className="nav-link" href="/pages/interactions">
                Interactions
              </Link>

              <Link className="nav-link" href="/pages/technology-insights">
                Technology Insights
              </Link>
            </>
          )}

          {user?.role === "sales_manager" && (
            <>
              <Link className="nav-link" href="/pages/dashboard">
                Dashboard
              </Link>

              <Link className="nav-link" href="/pages/clients">
                Clients
              </Link>

              <Link className="nav-link" href="/pages/project-requests">
                Requests
              </Link>

              <Link className="nav-link" href="/pages/offers">
                Offers
              </Link>

              <Link className="nav-link" href="/pages/interactions">
                Interactions
              </Link>

              <Link className="nav-link" href="/pages/technology-insights">
                Technology Insights
              </Link>
            </>
          )}

          {user?.role === "it_consultant" && (
            <>
              <Link className="nav-link" href="/pages/project-requests">
                Requests
              </Link>

              <Link className="nav-link" href="/pages/clients">
                Clients
              </Link>

              <Link className="nav-link" href="/pages/interactions">
                Interactions
              </Link>

              <Link className="nav-link" href="/pages/technology-insights">
                Technology Insights
              </Link>
            </>
          )}

          {user && <span className="badge">{user.role}</span>}

          <Button variant="secondary" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>
    </nav>
  );
}
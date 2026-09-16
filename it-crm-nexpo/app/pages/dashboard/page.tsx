"use client";

import { useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import Card from "@/components/Card";

type DashboardData = {
  clientsCount: number;
  projectRequestsCount: number;
  offersCount: number;
  interactionsCount: number;
};

// Dashboard stranica prikazuje osnovne metrike sistema.
export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  async function loadDashboard() {
    const response = await fetch("/api/dashboard");
    const result = await response.json();

    if (response.ok) {
      setData(result.data);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  return (
    <>
      <Navigation />

      <main className="page">
        <div className="container">
          <section className="hero">
            <h1>NEXPO IT CRM</h1>

            <p>
              Track clients, project requests, offers and communication in one
              simple IT CRM system.
            </p>
          </section>

          <section className="grid">
            <Card title="Clients">
              <div className="card-value">{data?.clientsCount ?? 0}</div>
              <p>Total clients in CRM.</p>
            </Card>

            <Card title="Project Requests">
              <div className="card-value">
                {data?.projectRequestsCount ?? 0}
              </div>
              <p>IT project requests from clients.</p>
            </Card>

            <Card title="Offers">
              <div className="card-value">{data?.offersCount ?? 0}</div>
              <p>Created business offers.</p>
            </Card>

            <Card title="Interactions">
              <div className="card-value">{data?.interactionsCount ?? 0}</div>
              <p>Client communication records.</p>
            </Card>
          </section>
        </div>
      </main>
    </>
  );
}
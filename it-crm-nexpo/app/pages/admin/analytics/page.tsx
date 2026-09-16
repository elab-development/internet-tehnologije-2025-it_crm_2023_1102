"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Navigation from "@/components/Navigation";
import Card from "@/components/Card";

type ChartItem = {
  name: string;
  value: number;
};

type AnalyticsData = {
  totals: {
    usersCount: number;
    clientsCount: number;
    projectRequestsCount: number;
    offersCount: number;
    interactionsCount: number;
  };
  usersByRole: ChartItem[];
  requestsByStatus: ChartItem[];
  offersByStatus: ChartItem[];
};

// Admin stranica prikazuje sistemsku analitiku kroz grafikone.
export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);

  async function loadAnalytics() {
    const response = await fetch("/api/admin/analytics");
    const result = await response.json();

    if (response.ok) {
      setData(result.data);
    }
  }

  useEffect(() => {
    loadAnalytics();
  }, []);

  return (
    <>
      <Navigation />

      <main className="page">
        <div className="container">
          <section className="hero">
            <h1>Admin Analytics</h1>
            <p>
              Monitor users, clients, project requests, offers and interactions
              across the whole IT CRM system.
            </p>
          </section>

          <section className="grid">
            <Card title="Users">
              <div className="card-value">{data?.totals.usersCount ?? 0}</div>
            </Card>

            <Card title="Clients">
              <div className="card-value">{data?.totals.clientsCount ?? 0}</div>
            </Card>

            <Card title="Requests">
              <div className="card-value">
                {data?.totals.projectRequestsCount ?? 0}
              </div>
            </Card>

            <Card title="Offers">
              <div className="card-value">{data?.totals.offersCount ?? 0}</div>
            </Card>
          </section>

          <br />

          <section className="grid chart-grid">
            <Card title="Users by Role">
              <div className="chart-box">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data?.usersByRole ?? []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#014830" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title="Requests by Status">
              <div className="chart-box">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Tooltip />
                    <Pie
                      data={data?.requestsByStatus ?? []}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={90}
                      fill="#014830"
                      label
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title="Offers by Status">
              <div className="chart-box">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data?.offersByStatus ?? []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#014830" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </section>
        </div>
      </main>
    </>
  );
}
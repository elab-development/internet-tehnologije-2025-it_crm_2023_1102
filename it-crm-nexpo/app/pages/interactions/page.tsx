"use client";

import { FormEvent, useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Card from "@/components/Card";

type Client = {
  id: number;
  company: string;
};

type Interaction = {
  id: number;
  type: string;
  summary: string;
  client: Client;
};

// Interactions stranica prikazuje i dodaje komunikaciju sa klijentima.
export default function InteractionsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [type, setType] = useState("email");
  const [summary, setSummary] = useState("");
  const [clientId, setClientId] = useState("");

  async function loadData() {
    const clientsResponse = await fetch("/api/clients");
    const interactionsResponse = await fetch("/api/interactions");

    const clientsResult = await clientsResponse.json();
    const interactionsResult = await interactionsResponse.json();

    if (clientsResponse.ok) {
      setClients(clientsResult.data);
    }

    if (interactionsResponse.ok) {
      setInteractions(interactionsResult.data);
    }
  }

  async function createInteraction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await fetch("/api/interactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type, summary, clientId }),
    });

    setType("email");
    setSummary("");
    setClientId("");
    loadData();
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <>
      <Navigation />

      <main className="page">
        <div className="container">
          <div className="page-header">
            <h1>Interactions</h1>
          </div>

          <Card title="Add interaction">
            <form className="form-grid" onSubmit={createInteraction}>
              <div className="form-group">
                <label className="label">Type</label>

                <select
                  className="select"
                  value={type}
                  onChange={(event) => setType(event.target.value)}
                >
                  <option value="email">Email</option>
                  <option value="call">Call</option>
                  <option value="meeting">Meeting</option>
                  <option value="presentation">Presentation</option>
                </select>
              </div>

              <Input
                label="Summary"
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
              />

              <div className="form-group">
                <label className="label">Client</label>

                <select
                  className="select"
                  value={clientId}
                  onChange={(event) => setClientId(event.target.value)}
                >
                  <option value="">Choose client</option>

                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.company}
                    </option>
                  ))}
                </select>
              </div>

              <Button type="submit">Create Interaction</Button>
            </form>
          </Card>

          <br />

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Type</th>
                  <th>Summary</th>
                </tr>
              </thead>

              <tbody>
                {interactions.map((interaction) => (
                  <tr key={interaction.id}>
                    <td>{interaction.client?.company}</td>
                    <td>
                      <span className="badge">{interaction.type}</span>
                    </td>
                    <td>{interaction.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
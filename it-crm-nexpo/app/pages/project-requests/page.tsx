"use client";

import { FormEvent, useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Card from "@/components/Card";

type Client = {
  id: number;
  name: string;
  company: string;
};

type ProjectRequest = {
  id: number;
  title: string;
  description: string;
  status: string;
  client: Client;
};

// Project requests stranica prikazuje i dodaje IT zahteve.
export default function ProjectRequestsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [requests, setRequests] = useState<ProjectRequest[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [clientId, setClientId] = useState("");

  async function loadData() {
    const clientsResponse = await fetch("/api/clients");
    const requestsResponse = await fetch("/api/project-requests");

    const clientsResult = await clientsResponse.json();
    const requestsResult = await requestsResponse.json();

    if (clientsResponse.ok) {
      setClients(clientsResult.data);
    }

    if (requestsResponse.ok) {
      setRequests(requestsResult.data);
    }
  }

  async function createRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await fetch("/api/project-requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, description, clientId }),
    });

    setTitle("");
    setDescription("");
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
            <h1>Project Requests</h1>
          </div>

          <Card title="Add project request">
            <form className="form-grid" onSubmit={createRequest}>
              <Input
                label="Title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />

              <Input
                label="Description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
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

              <Button type="submit">Create Request</Button>
            </form>
          </Card>

          <br />

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Client</th>
                  <th>Status</th>
                  <th>Description</th>
                </tr>
              </thead>

              <tbody>
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td>{request.title}</td>
                    <td>{request.client?.company}</td>
                    <td>
                      <span className="badge">{request.status}</span>
                    </td>
                    <td>{request.description}</td>
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
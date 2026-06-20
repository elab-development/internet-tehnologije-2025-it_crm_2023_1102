"use client";

import { FormEvent, useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Card from "@/components/Card";

type Client = {
  id: number;
  name: string;
  email: string;
  company: string;
  status: string;
};

// Clients stranica podržava create, read, update i delete.
export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    status: "lead",
  });

  async function loadClients() {
    const response = await fetch("/api/clients");
    const result = await response.json();

    if (response.ok) {
      setClients(result.data);
    }
  }

  function startEdit(client: Client) {
    setEditingId(client.id);
    setForm({
      name: client.name,
      email: client.email,
      company: client.company,
      status: client.status,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm({
      name: "",
      email: "",
      company: "",
      status: "lead",
    });
  }

  async function saveClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const url = editingId ? `/api/clients/${editingId}` : "/api/clients";
    const method = editingId ? "PUT" : "POST";

    await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    resetForm();
    loadClients();
  }

  async function deleteClient(id: number) {
    await fetch(`/api/clients/${id}`, {
      method: "DELETE",
    });

    loadClients();
  }

  useEffect(() => {
    loadClients();
  }, []);

  return (
    <>
      <Navigation />

      <main className="page">
        <div className="container">
          <div className="page-header">
            <h1>Clients</h1>
          </div>

          <Card title={editingId ? "Edit client" : "Add new client"}>
            <form className="form-grid" onSubmit={saveClient}>
              <Input
                label="Name"
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
              />

              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value })
                }
              />

              <Input
                label="Company"
                value={form.company}
                onChange={(event) =>
                  setForm({ ...form, company: event.target.value })
                }
              />

              <div className="form-group">
                <label className="label">Status</label>
                <select
                  className="select"
                  value={form.status}
                  onChange={(event) =>
                    setForm({ ...form, status: event.target.value })
                  }
                >
                  <option value="lead">Lead</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <Button type="submit">
                {editingId ? "Update Client" : "Create Client"}
              </Button>

              {editingId && (
                <Button type="button" variant="secondary" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </form>
          </Card>

          <br />

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Company</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {clients.map((client) => (
                  <tr key={client.id}>
                    <td>{client.name}</td>
                    <td>{client.email}</td>
                    <td>{client.company}</td>
                    <td>
                      <span className="badge">{client.status}</span>
                    </td>
                    <td className="actions">
                      <Button variant="secondary" onClick={() => startEdit(client)}>
                        Edit
                      </Button>

                      <Button variant="danger" onClick={() => deleteClient(client.id)}>
                        Delete
                      </Button>
                    </td>
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
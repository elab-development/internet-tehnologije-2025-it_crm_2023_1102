"use client";

import { useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import Button from "@/components/Button";

type User = {
  id: number;
  name: string;
  email: string;
  role: "admin" | "sales_manager" | "it_consultant";
  status: "active" | "inactive";
};

// Admin stranica za upravljanje korisnicima.
export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);

  async function loadUsers() {
    const response = await fetch("/api/admin/users");
    const result = await response.json();

    if (response.ok) {
      setUsers(result.data);
    }
  }

  async function updateUser(id: number, role: string, status: string) {
    await fetch(`/api/admin/users/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role, status }),
    });

    loadUsers();
  }

  async function deleteUser(id: number) {
    await fetch(`/api/admin/users/${id}`, {
      method: "DELETE",
    });

    loadUsers();
  }

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <>
      <Navigation />

      <main className="page">
        <div className="container">
          <div className="page-header">
            <h1>User Management</h1>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>

                    <td>
                      <select
                        className="select"
                        value={user.role}
                        onChange={(event) =>
                          updateUser(user.id, event.target.value, user.status)
                        }
                      >
                        <option value="admin">Admin</option>
                        <option value="sales_manager">Sales Manager</option>
                        <option value="it_consultant">IT Consultant</option>
                      </select>
                    </td>

                    <td>
                      <select
                        className="select"
                        value={user.status}
                        onChange={(event) =>
                          updateUser(user.id, user.role, event.target.value)
                        }
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </td>

                    <td>
                      <Button
                        variant="danger"
                        onClick={() => deleteUser(user.id)}
                      >
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
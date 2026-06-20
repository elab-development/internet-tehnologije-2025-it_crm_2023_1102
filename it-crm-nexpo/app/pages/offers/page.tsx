"use client";

import { FormEvent, useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Card from "@/components/Card";

type ProjectRequest = {
  id: number;
  title: string;
};

type Offer = {
  id: number;
  price: string;
  status: string;
  projectRequest: ProjectRequest;
};

// Offers stranica prikazuje i dodaje ponude.
export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [requests, setRequests] = useState<ProjectRequest[]>([]);
  const [price, setPrice] = useState("");
  const [projectRequestId, setProjectRequestId] = useState("");

  async function loadData() {
    const offersResponse = await fetch("/api/offers");
    const requestsResponse = await fetch("/api/project-requests");

    const offersResult = await offersResponse.json();
    const requestsResult = await requestsResponse.json();

    if (offersResponse.ok) {
      setOffers(offersResult.data);
    }

    if (requestsResponse.ok) {
      setRequests(requestsResult.data);
    }
  }

  async function createOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await fetch("/api/offers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ price, projectRequestId }),
    });

    setPrice("");
    setProjectRequestId("");
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
            <h1>Offers</h1>
          </div>

          <Card title="Add offer">
            <form className="form-grid" onSubmit={createOffer}>
              <Input
                label="Price"
                type="number"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
              />

              <div className="form-group">
                <label className="label">Project Request</label>

                <select
                  className="select"
                  value={projectRequestId}
                  onChange={(event) => setProjectRequestId(event.target.value)}
                >
                  <option value="">Choose request</option>

                  {requests.map((request) => (
                    <option key={request.id} value={request.id}>
                      {request.title}
                    </option>
                  ))}
                </select>
              </div>

              <Button type="submit">Create Offer</Button>
            </form>
          </Card>

          <br />

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Project Request</th>
                  <th>Price</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {offers.map((offer) => (
                  <tr key={offer.id}>
                    <td>{offer.projectRequest?.title}</td>
                    <td>{offer.price}</td>
                    <td>
                      <span className="badge">{offer.status}</span>
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
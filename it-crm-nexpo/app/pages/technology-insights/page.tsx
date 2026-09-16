"use client";

import { FormEvent, useState } from "react";
import Navigation from "@/components/Navigation";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Card from "@/components/Card";

type Repository = {
  id: number;
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  url: string;
};

type StackQuestion = {
  id: number;
  title: string;
  url: string;
  score: number;
  answers: number;
  tags: string[];
};

// Stranica prikazuje tehničke uvide preko GitHub i Stack Overflow API-ja.
export default function TechnologyInsightsPage() {
  const [keyword, setKeyword] = useState("Next.js CRM");
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [questions, setQuestions] = useState<StackQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function searchTechnology(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setRepositories([]);
    setQuestions([]);

    const githubResponse = await fetch(
      `/api/external/github?keyword=${encodeURIComponent(keyword)}`
    );

    const stackResponse = await fetch(
      `/api/external/stack-overflow?keyword=${encodeURIComponent(keyword)}`
    );

    const githubResult = await githubResponse.json();
    const stackResult = await stackResponse.json();

    if (githubResponse.ok) {
      setRepositories(githubResult.data);
    }

    if (stackResponse.ok) {
      setQuestions(stackResult.data);
    }

    if (!githubResponse.ok || !stackResponse.ok) {
      setMessage("Some external data could not be loaded.");
    }

    setLoading(false);
  }

  return (
    <>
      <Navigation />

      <main className="page">
        <div className="container">
          <section className="hero">
            <h1>Technology Insights</h1>

            <p>
              Search public GitHub repositories and Stack Overflow questions to
              better understand technologies requested by IT clients.
            </p>
          </section>

          <Card title="Search technology">
            <form className="form-grid" onSubmit={searchTechnology}>
              <Input
                label="Technology keyword"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
              />

              <Button type="submit">
                {loading ? "Searching..." : "Search Insights"}
              </Button>
            </form>

            {message && <div className="message">{message}</div>}
          </Card>

          <br />

          <section className="insights-grid">
            <Card title="Popular GitHub repositories">
              {repositories.length === 0 && (
                <p>No repositories loaded yet. Search a technology first.</p>
              )}

              <div className="insight-list">
                {repositories.map((repo) => (
                  <article className="insight-item" key={repo.id}>
                    <div>
                      <h3>{repo.name}</h3>

                      <p>{repo.description || "No description available."}</p>

                      <div className="insight-meta">
                        <span className="badge">
                          {repo.language || "Unknown"}
                        </span>

                        <span className="badge">{repo.stars} stars</span>
                      </div>
                    </div>

                    <a
                      className="external-link"
                      href={repo.url}
                      target="_blank"
                    >
                      Open
                    </a>
                  </article>
                ))}
              </div>
            </Card>

            <Card title="Top Stack Overflow questions">
              {questions.length === 0 && (
                <p>No questions loaded yet. Search a technology first.</p>
              )}

              <div className="insight-list">
                {questions.map((question) => (
                  <article className="insight-item" key={question.id}>
                    <div>
                      <h3
                        dangerouslySetInnerHTML={{
                          __html: question.title,
                        }}
                      />

                      <div className="insight-meta">
                        <span className="badge">{question.score} votes</span>

                        <span className="badge">
                          {question.answers} answers
                        </span>
                      </div>

                      <div className="tag-list">
                        {question.tags.slice(0, 4).map((tag) => (
                          <span className="tag" key={tag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <a
                      className="external-link"
                      href={question.url}
                      target="_blank"
                    >
                      Open
                    </a>
                  </article>
                ))}
              </div>
            </Card>
          </section>
        </div>
      </main>
    </>
  );
}
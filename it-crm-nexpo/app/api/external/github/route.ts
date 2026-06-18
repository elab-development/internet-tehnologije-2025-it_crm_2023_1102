import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/helpers/auth";
import { errorResponse, successResponse } from "@/lib/helpers/response";

type GitHubRepository = {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
};

// API ruta koja pretražuje popularne GitHub repozitorijume.
export async function GET(request: NextRequest) {
  const user = getAuthUser(request);

  if (!user) {
    return errorResponse("Unauthorized", 401);
  }

  const keyword = request.nextUrl.searchParams.get("keyword");

  if (!keyword) {
    return errorResponse("Keyword is required", 400);
  }

  try {
    const githubResponse = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(
        keyword
      )}&sort=stars&order=desc&per_page=5`,
      {
        headers: {
          Accept: "application/vnd.github+json",
        },
      }
    );

    if (!githubResponse.ok) {
      return errorResponse("GitHub API request failed", 500);
    }

    const githubData = await githubResponse.json();

    const repositories = githubData.items.map((repo: GitHubRepository) => ({
      id: repo.id,
      name: repo.full_name,
      description: repo.description,
      language: repo.language,
      stars: repo.stargazers_count,
      url: repo.html_url,
    }));

    return successResponse(repositories, "GitHub repositories loaded");
  } catch {
    return errorResponse("GitHub API error", 500);
  }
}
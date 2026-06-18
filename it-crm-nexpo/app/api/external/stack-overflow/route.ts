import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/helpers/auth";
import { errorResponse, successResponse } from "@/lib/helpers/response";

type StackQuestion = {
  question_id: number;
  title: string;
  link: string;
  score: number;
  answer_count: number;
  tags: string[];
};

// API ruta koja pretražuje Stack Overflow pitanja za tehnologiju.
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
    const stackResponse = await fetch(
      `https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=votes&site=stackoverflow&pagesize=5&q=${encodeURIComponent(
        keyword
      )}`
    );

    if (!stackResponse.ok) {
      return errorResponse("Stack Overflow API request failed", 500);
    }

    const stackData = await stackResponse.json();

    const questions = stackData.items.map((question: StackQuestion) => ({
      id: question.question_id,
      title: question.title,
      url: question.link,
      score: question.score,
      answers: question.answer_count,
      tags: question.tags,
    }));

    return successResponse(questions, "Stack Overflow questions loaded");
  } catch {
    return errorResponse("Stack Overflow API error", 500);
  }
}
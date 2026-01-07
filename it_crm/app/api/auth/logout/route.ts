import { handleError, ok } from "@/src/server/http/response";
import { logout } from "@/src/server/services/authService";

export async function POST() {
  try {
    const res = await logout();
    return ok(res);
  } catch (e) {
    return handleError(e);
  }
}

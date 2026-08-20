import { sessionCookie } from "../../../auth";

export async function POST(request: Request) {
  const response = Response.redirect(new URL("/login", request.url), 303);
  response.headers.set("Set-Cookie", sessionCookie("", request.url, 0));
  return response;
}

import { sessionCookie } from "../../../auth";

export async function POST(request: Request) {
  const response = new Response(null, { status: 303, headers: { Location: new URL("/login", request.url).toString() } });
  response.headers.set("Set-Cookie", sessionCookie("", request.url, 0));
  return response;
}
